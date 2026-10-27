// src/services/voice/voiceCommandAudit.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 650: the audit entry written for a voice command. Voice commands changed records without a trace; a key
// press that runs a command is a deliberate act, but a misheard word is not, so the lab can now see which spoken
// commands ran, on which screen, for whom, and which were refused.
//
//   Event "Voice command executed"   a spoken command ran (detail says if it was confirmed by repeating the phrase)
//   Event "Voice command refused"    it did not run: not available on this screen, the repeat was not given, or the
//                                    repeat came too late
//
// PHI-free by construction: the entry holds the action id, the screen name, the person and the outcome. It NEVER holds
// what was said (a command like "filter physician ..." carries a name) nor a case. Detail text stays English.
// ─────────────────────────────────────────────────────────────────────────────
import type { NewAuditLog } from '../auditlog/IAuditService';

export const VOICE_COMMAND_EXECUTED_EVENT = 'Voice command executed';
export const VOICE_COMMAND_REFUSED_EVENT = 'Voice command refused';

export type VoiceCommandRefusal = 'notEligible' | 'confirmationDeclined' | 'confirmationTimedOut';

const REFUSAL_TEXT: Record<VoiceCommandRefusal, string> = {
  notEligible: 'not available on this screen',
  confirmationDeclined: 'the phrase was not repeated to confirm',
  confirmationTimedOut: 'the phrase was not repeated in time',
};

export interface VoiceCommandAuditInput {
  actionId: string;
  screen: string;
  /** Display name of the person, or their id. */
  user: string;
  refusal?: VoiceCommandRefusal;
  /** Executed after the phrase was repeated. */
  confirmedByRepeat?: boolean;
  /** Executed because the person confirmed a missed phrase with a key (the learning prompt). */
  viaMissConfirmation?: boolean;
}

export function buildVoiceCommandAuditEntry(i: VoiceCommandAuditInput): NewAuditLog {
  const where = `action ${i.actionId} on screen ${i.screen}`;
  if (i.refusal) {
    return { type: 'user', event: VOICE_COMMAND_REFUSED_EVENT, detail: `Voice command refused: ${where}; ${REFUSAL_TEXT[i.refusal]}`, user: i.user, caseId: null, confidence: null };
  }
  const how = i.confirmedByRepeat ? '; confirmed by repeating the phrase' : i.viaMissConfirmation ? '; confirmed with a key after a missed phrase' : '';
  return { type: 'user', event: VOICE_COMMAND_EXECUTED_EVENT, detail: `Voice command executed: ${where}${how}`, user: i.user, caseId: null, confidence: null };
}
