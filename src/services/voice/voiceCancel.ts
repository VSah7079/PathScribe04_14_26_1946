// src/services/voice/voiceCancel.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 664 (Pete): what "Cancel" (Ctrl+Alt+J, or "cancel dictation" while dictating) does. Pure; VoiceProvider acts on it.
//   1. Dictating, and passages dictated this session are still in the field: the first Cancel only asks ("say cancel again");
//      a second one within the window removes them (passages the person edited are kept) and ends dictation.
//   2. Dictating, nothing to remove: dictation ends.
//   3. A command waiting to be said twice (a delete, a recall): it is dropped.
//   4. Otherwise nothing happens. Cancel does not close windows or undo anything already committed (a section accepted, a report
//      signed): those have their own buttons.
// ─────────────────────────────────────────────────────────────────────────────
export const CANCEL_CONFIRM_WINDOW_MS = 8000;

export interface CancelState {
  dictating: boolean;
  /** Dictated passages of this session still in the field. */
  uncommitted: number;
  /** A command is waiting to be said again. */
  commandPending: boolean;
  /** When the first Cancel asked for confirmation, if it did. */
  askedAt: number | null;
  now: number;
  windowMs?: number;
}

export type CancelDecision = 'askConfirm' | 'discardDictation' | 'stopDictation' | 'dropPendingCommand' | 'nothing';

export function decideCancel(s: CancelState): CancelDecision {
  if (s.dictating) {
    if (s.uncommitted <= 0) return 'stopDictation';
    const asked = s.askedAt !== null && s.now - s.askedAt <= (s.windowMs ?? CANCEL_CONFIRM_WINDOW_MS);
    return asked ? 'discardDictation' : 'askConfirm';
  }
  return s.commandPending ? 'dropPendingCommand' : 'nothing';
}
