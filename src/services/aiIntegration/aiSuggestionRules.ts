// src/services/aiIntegration/aiSuggestionRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 651: the checks every AI answer goes through in code, not only in the prompt.
//
//   • One confidence scale: 0 to 100 (a whole percent). A vendor that answers on a 0 to 1 scale ("0.85") is converted at the
//     place its answer is read (normaliseAiConfidence), so nothing downstream ever sees two scales.
//   • Minimum confidence 30: an answer below it is dropped, never shown (AI_MIN_CONFIDENCE).
//   • A question with listed options may only be answered with those option ids; any other answer is rejected, never
//     "closest match" guessed.
//
// The historical-report extraction (historyExtraction/extractHistoricalSynoptic.ts) already made these checks; it now calls
// the same function, and the live-case suggestions (PathScribeAIService.suggestSynopticFields, generateAiSuggestionsForReport)
// call it too, so the two can never drift apart. Pure; no AI call, no storage.
// ─────────────────────────────────────────────────────────────────────────────

/** An answer below this confidence (percent) is dropped. */
export const AI_MIN_CONFIDENCE = 30;

/**
 * A vendor's confidence as a whole percent from 0 to 100, or undefined when it is not a usable number.
 * A value from 0 up to and including 1 is read as a fraction ("0.85" is 85%); anything else is read as a percent
 * and kept within 0 to 100. (A bare "1" is therefore 100%, not 1%: the prompts ask for 0 to 100 and no answer of
 * 1% is worth showing, as it is below the minimum.) "85" and "85%" strings are accepted.
 */
export function normaliseAiConfidence(raw: unknown): number | undefined {
  const n = typeof raw === 'string' ? Number.parseFloat(raw.replace('%', '').trim()) : raw;
  if (typeof n !== 'number' || !Number.isFinite(n)) return undefined;
  if (n < 0) return 0;
  const percent = n <= 1 && !(typeof raw === 'string' && raw.includes('%')) ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

export interface SuggestableField { id: string; label?: string; options?: ReadonlyArray<{ id: string; label: string }> }

export type AnswerRejection =
  | 'unknownField' | 'notAnObject' | 'noValue' | 'noConfidence' | 'belowMinimum' | 'notAnOption';

export type AnswerCheck =
  | { ok: true; /** The answer as one string (option ids joined by ", "). */ raw: string; /** Option ids when options are listed and more than one was given, else the string. */ value: string | string[]; confidence?: number }
  | { ok: false; reason: AnswerRejection };

/**
 * Checks one field's answer from the AI: a value, and a confidence of at least 30, and (when the field lists options)
 * every value an option id. `requireConfidence` makes an answer with no usable confidence a rejection (live cases show a
 * confidence on every suggestion); the historical extraction keeps such an answer without one.
 */
export function checkSuggestedAnswer(
  field: SuggestableField, answer: unknown, options: { requireConfidence?: boolean } = {},
): AnswerCheck {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return { ok: false, reason: 'notAnObject' };
  const a = answer as { value?: unknown; confidence?: unknown };
  const raw = Array.isArray(a.value) ? a.value.filter(v => typeof v === 'string').join(', ') : a.value;
  if (typeof raw !== 'string' || raw.trim() === '') return { ok: false, reason: 'noValue' };
  const confidence = normaliseAiConfidence(a.confidence);
  if (confidence === undefined && options.requireConfidence) return { ok: false, reason: 'noConfidence' };
  if (confidence !== undefined && confidence < AI_MIN_CONFIDENCE) return { ok: false, reason: 'belowMinimum' };
  const withConfidence = confidence !== undefined ? { confidence } : {};
  if (!field.options?.length) {
    return { ok: true, raw, value: Array.isArray(a.value) ? (a.value as unknown[]).filter((v): v is string => typeof v === 'string') : raw, ...withConfidence };
  }
  const picked = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (!picked.length || picked.some(id => !field.options!.some(o => o.id === id))) return { ok: false, reason: 'notAnOption' };
  return { ok: true, raw: picked.join(', '), value: picked.length === 1 && !Array.isArray(a.value) ? picked[0] : picked, ...withConfidence };
}

export interface CleanedSuggestion { value: string | string[]; confidence: number; source: string }
export interface RejectedSuggestion { fieldId: string; reason: AnswerRejection }

/**
 * The live-case answers that pass the checks, keyed by field id, and the ones that did not (with why, for the log).
 * An answer for a field the template does not have is rejected as well. Confidence is required.
 */
export function cleanSuggestedAnswers(
  parsed: unknown, fields: readonly SuggestableField[],
): { accepted: Record<string, CleanedSuggestion>; rejected: RejectedSuggestion[] } {
  const accepted: Record<string, CleanedSuggestion> = {};
  const rejected: RejectedSuggestion[] = [];
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { accepted, rejected };
  const answers = parsed as Record<string, unknown>;
  for (const [fieldId, answer] of Object.entries(answers)) {
    const field = fields.find(f => f.id === fieldId);
    if (!field) { rejected.push({ fieldId, reason: 'unknownField' }); continue; }
    const checked = checkSuggestedAnswer(field, answer, { requireConfidence: true });
    if (checked.ok === false) { rejected.push({ fieldId, reason: checked.reason }); continue; }
    const source = (answer as { source?: unknown }).source;
    accepted[fieldId] = { value: checked.value, confidence: checked.confidence as number, source: typeof source === 'string' ? source : '' };
  }
  return { accepted, rejected };
}
