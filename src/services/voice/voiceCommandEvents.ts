// src/services/voice/voiceCommandEvents.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 463: spoken commands that belong to what is on screen (the Mohs stage
// question: "Stage 1, positive at 12 o'clock"). VoiceProvider offers each
// final command to the screen first; a mounted input that recognises it marks
// it handled (synchronously) and the action registry is not consulted.
// ─────────────────────────────────────────────────────────────────────────────

export const MOHS_VOICE_EVENT = 'pathscribe:voice-command';

/** What the screen did with a command it took: applied it, or recognised it
 *  but its stage hasn't been added, or nothing to change. */
export type ScreenVoiceOutcome = 'applied' | 'noStage' | 'noChange';

export interface MohsVoiceEventDetail {
  text: string;
  /** The voice profile's language ('en', 'fr', 'de', 'nl', 'ko'). */
  language: string;
  handled?: boolean;
  outcome?: ScreenVoiceOutcome;
}

/** Offers a spoken command to the screen; what it did, or null when nothing on screen took it. */
export function offerVoiceCommandToScreen(text: string, language: string, target: EventTarget | undefined = typeof window === 'undefined' ? undefined : window): ScreenVoiceOutcome | null {
  if (!target) return null;
  const detail: MohsVoiceEventDetail = { text, language };
  target.dispatchEvent(new CustomEvent(MOHS_VOICE_EVENT, { detail }));
  return detail.handled ? detail.outcome ?? 'applied' : null;
}

/** The voice status message key for what the screen did (voiceProvider.status.*). */
export const screenVoiceStatusKey = (outcome: ScreenVoiceOutcome) =>
  outcome === 'applied' ? 'voiceProvider.status.screenCommandApplied'
    : outcome === 'noStage' ? 'voiceProvider.status.screenCommandNoStage' : 'voiceProvider.status.screenCommandNoChange';
