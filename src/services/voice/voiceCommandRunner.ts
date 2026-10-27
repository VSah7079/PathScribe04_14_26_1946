// src/services/voice/voiceCommandRunner.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 650: what happens to a spoken command once the speech engine has heard it, moved out of VoiceProvider so it
// can be tested. Three rules the provider used to skip:
//
//  1. ONE ELIGIBILITY CHECK. Voice matches against the same eligible set the hotkey listener uses
//     (actionRegistry/commandEligibility.ts, through getEligibleActions): app context, always-on categories,
//     the station's functional area and the station's action group. A phrase that exists but is not available here is
//     REFUSED (and audited) rather than treated as a miss that the person is asked to teach the system.
//  2. CONFIRM BY REPEATING. A command marked `confirmByRepeat` (actionRegistry/repeatConfirmationCommands.ts) does not
//     run on the first hearing. The person is asked to say it again; the same command within the window runs it;
//     any other speech, or silence, cancels it. Eligibility is checked again when it runs.
//  3. AUDIT. Each executed or refused command writes an entry (voiceCommandAudit.ts) with no speech and no case in it.
//     A failing audit write never stops the command.
// ─────────────────────────────────────────────────────────────────────────────
import type { SystemAction } from '../actionRegistry/IActionRegistryService';
import { exactTriggers, type TriggerPoolOptions } from '../actionRegistry/voiceTriggerPool';
import { normaliseDictation } from './dictationCorrections';
import type { VoiceProfileLanguage } from '../../constants/voiceProfiles';
import type { NewAuditLog } from '../auditlog/IAuditService';
import { buildVoiceCommandAuditEntry, type VoiceCommandRefusal } from './voiceCommandAudit';

/** How long the person has to repeat a phrase to confirm it. */
export const REPEAT_CONFIRMATION_WINDOW_MS = 8000;

export interface VoiceCommandRegistryPort {
  findActionByTrigger(transcript: string, language?: VoiceProfileLanguage, options?: TriggerPoolOptions): SystemAction | undefined;
  getEligibleActions(): SystemAction[];
  getCurrentContext(): string;
  executeAction(action: SystemAction, transcript?: string): void;
}

export interface VoiceCommandRunnerDeps {
  registry: VoiceCommandRegistryPort;
  audit: { logEvent(entry: NewAuditLog): Promise<unknown> };
  /** The signed-in person's display name or id. */
  getUserName: () => string;
  now?: () => number;
  confirmWindowMs?: number;
}

export type VoiceCommandOutcome =
  | { kind: 'executed'; action: SystemAction; confirmed: boolean }
  | { kind: 'confirmationNeeded'; action: SystemAction; expiresAt: number }
  | { kind: 'refused'; action: SystemAction; reason: VoiceCommandRefusal }
  | { kind: 'miss' };

export interface VoiceCommandRunner {
  /** A final spoken command. A refusal of an earlier, pending confirmation is audited here, then this one is handled. */
  handle(transcript: string, language: VoiceProfileLanguage, options?: TriggerPoolOptions): VoiceCommandOutcome;
  /** Cancels a pending confirmation whose window has passed (the provider calls this from a timer). */
  expirePending(): VoiceCommandOutcome | null;
  pending(): { action: SystemAction; expiresAt: number } | null;
  /** Batch 664 (Cancel): drops a command waiting to be said again, audited as declined. False when none was waiting. */
  cancelPending(): boolean;
  /** The person confirmed a missed phrase with a key and the registry ran the command. */
  auditMissConfirmed(action: SystemAction): void;
}

export function createVoiceCommandRunner(deps: VoiceCommandRunnerDeps): VoiceCommandRunner {
  const now = deps.now ?? (() => Date.now());
  const windowMs = deps.confirmWindowMs ?? REPEAT_CONFIRMATION_WINDOW_MS;
  const { registry } = deps;
  let pending: { action: SystemAction; expiresAt: number } | null = null;

  const write = (entry: NewAuditLog) => { void Promise.resolve(deps.audit.logEvent(entry)).catch(() => undefined); };
  const refuse = (action: SystemAction, reason: VoiceCommandRefusal): VoiceCommandOutcome => {
    write(buildVoiceCommandAuditEntry({ actionId: action.id, screen: registry.getCurrentContext(), user: deps.getUserName(), refusal: reason }));
    return { kind: 'refused', action, reason };
  };
  const isEligible = (action: SystemAction) => registry.getEligibleActions().some(a => a.id === action.id);
  const run = (action: SystemAction, transcript: string, confirmed: boolean): VoiceCommandOutcome => {
    if (!isEligible(action)) return refuse(action, 'notEligible');
    registry.executeAction(action, transcript);
    write(buildVoiceCommandAuditEntry({ actionId: action.id, screen: registry.getCurrentContext(), user: deps.getUserName(), confirmedByRepeat: confirmed }));
    return { kind: 'executed', action, confirmed };
  };

  return {
    handle(transcript, language, options) {
      if (pending) {
        const waiting = pending;
        pending = null;
        if (now() > waiting.expiresAt) {
          refuse(waiting.action, 'confirmationTimedOut');
        } else {
          const again = registry.findActionByTrigger(transcript, language, options);
          if (again?.id === waiting.action.id) return run(waiting.action, transcript, true);
          refuse(waiting.action, 'confirmationDeclined');
        }
      }

      const action = registry.findActionByTrigger(transcript, language, options);
      if (!action) {
        // A phrase that is a command, just not one for this screen: refuse it, do not ask the person to teach it.
        const elsewhere = registry.findActionByTrigger(transcript, language, { ...options, ignoreEligibility: true, exactOnly: true });
        // Only when the whole utterance IS one of its phrases: a phrase merely heard inside other speech stays a miss.
        const said = normaliseDictation(transcript);
        return elsewhere && exactTriggers(elsewhere, language).some(p => normaliseDictation(p) === said)
          ? refuse(elsewhere, 'notEligible') : { kind: 'miss' };
      }
      if (!isEligible(action)) return refuse(action, 'notEligible');
      if (action.confirmByRepeat) {
        pending = { action, expiresAt: now() + windowMs };
        return { kind: 'confirmationNeeded', action, expiresAt: pending.expiresAt };
      }
      return run(action, transcript, false);
    },

    expirePending() {
      if (!pending || now() <= pending.expiresAt) return null;
      const waiting = pending;
      pending = null;
      return refuse(waiting.action, 'confirmationTimedOut');
    },

    pending: () => pending,

    cancelPending() {
      if (!pending) return false;
      const waiting = pending;
      pending = null;
      refuse(waiting.action, 'confirmationDeclined');
      return true;
    },

    auditMissConfirmed(action) {
      write(buildVoiceCommandAuditEntry({ actionId: action.id, screen: registry.getCurrentContext(), user: deps.getUserName(), viaMissConfirmation: true }));
    },
  };
}
