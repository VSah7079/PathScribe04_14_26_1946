// src/services/voice/dictationSegmentFlow.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 650: what happens to one dictated segment between "the words were heard" and "the text is in the field".
// Moved out of VoiceProvider (which could not be tested) and fixed.
//
// The bug: with AI refinement on, the provider first sent the local text as a provisional ("interim") insert and,
// up to 2 s later, the refined text as the final one. Report editors inserted BOTH at the cursor, so the section
// held the local text and then the refined text again. The contract now is:
//   • the interim call is provisional and is REPLACED by the final call (the sink's job: see dictationEditorWriter.ts;
//     a plain text field simply ignores interim calls);
//   • exactly one FINAL call is made per segment, whatever happens: the AI answers in time (refined text), the AI
//     is too slow (REFINEMENT_BUDGET_MS, local text; a late answer is dropped), or the AI fails (local text).
// ─────────────────────────────────────────────────────────────────────────────

/** How long the AI has to refine a segment before the local text stands (the old STRUCTURED_CONTENT_TIMEOUT_MS). */
export const REFINEMENT_BUDGET_MS = 2000;

export interface DictationSegmentMeta {
  /** The words as heard, before punctuation and learning: the key a correction is stored under. */
  raw: string;
}

/** Where a segment goes (a DictationTarget's onText). */
export type DictationSegmentSink = (text: string, isInterim?: boolean, meta?: DictationSegmentMeta) => void;

export type DictationSegmentOutcome = 'local' | 'ai' | 'aiUnchanged' | 'timeout' | 'error';

export interface DictationSegmentInput {
  raw: string;
  /** After punctuation, the person's learned corrections and voice macros. */
  localText: string;
  /** Asks the AI to refine; absent when refinement is off. Resolves null when it has nothing better. */
  refine?: () => Promise<string | null>;
  sink: DictationSegmentSink;
  budgetMs?: number;
  /** Called with true when waiting for the AI starts and false when it ends (the "Refining…" indicator). */
  onRefining?: (refining: boolean) => void;
}

export async function insertDictationSegment(input: DictationSegmentInput): Promise<{ text: string; outcome: DictationSegmentOutcome }> {
  const { raw, localText, refine, sink } = input;
  const meta: DictationSegmentMeta = { raw };
  if (!refine) {
    sink(localText, false, meta);
    return { text: localText, outcome: 'local' };
  }

  sink(localText, true, meta);
  input.onRefining?.(true);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = Symbol('timeout');
  const budget = new Promise<typeof timedOut>(resolve => { timer = setTimeout(() => resolve(timedOut), input.budgetMs ?? REFINEMENT_BUDGET_MS); });
  let result: string | null | typeof timedOut;
  let failed = false;
  try {
    result = await Promise.race([refine(), budget]);
  } catch {
    result = null; failed = true;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    input.onRefining?.(false);
  }

  let text = localText;
  let outcome: DictationSegmentOutcome = failed ? 'error' : 'local';
  if (result === timedOut) outcome = 'timeout';
  else if (typeof result === 'string' && result.trim()) {
    if (result !== localText) { text = result; outcome = 'ai'; } else outcome = 'aiUnchanged';
  }
  sink(text, false, meta);
  return { text, outcome };
}
