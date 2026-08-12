// src/utils/sourceTextMatching.ts
// ─────────────────────────────────────────────────────────────
// Shared source-text matching — extracted from LeftReportPanel's
// inline useMemo so the exact same algorithm powers both:
//   1. The live, per-field "source not found" indicator (when a
//      pathologist clicks into a field, LeftReportPanel searches for
//      its cited source and reports back).
//   2. The proactive, finalize-time check (RightSynopticPanel's
//      sweepAndGetFinalState) — every still-unverified field's source
//      is checked against this same logic before finalize is allowed
//      to proceed, rather than silently auto-confirming values whose
//      source was never actually verified against the report text.
// Keeping this as one shared function means these two checks can
// never drift apart and disagree with each other about whether a
// given source is "found."
//
// Performance note: this is a handful of short-string .includes()
// calls against a small, fixed set of report sections (clinical
// history, gross, microscopic, ancillary) — not a network call, not a
// heavy fuzzy-match algorithm. Checking every field on a case (even a
// large one, 30+ fields) completes in a fraction of a millisecond.
// ─────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';

export interface SourceMatchResult {
  phrase: string | undefined;
  found: boolean;
}

/**
 * Given an AI-cited source string (e.g. 'Gross: "2.3 × 1.8 × 1.5 cm"'
 * or a plain phrase) and the case's current report text, determines
 * whether that source can genuinely be located verbatim anywhere in
 * the report. Tries the full quoted/candidate phrase first, then
 * progressively drops trailing words (down to a 3-word minimum) to
 * tolerate minor AI paraphrasing at the tail of a citation, without
 * being so lenient that a 1-2 word match becomes a false positive.
 */
export function matchSourceText(sourceText: string | undefined, caseData: Case | null): SourceMatchResult {
  if (!sourceText) return { phrase: undefined, found: false };
  const quoted = sourceText.match(/"([^"]+)"/);
  const candidate = quoted ? quoted[1] : sourceText;

  const words = candidate.split(/\s+/).filter(Boolean);
  const allText = [
    caseData?.order?.clinicalIndication ?? '',
    caseData?.diagnostic?.grossDescription ?? '',
    caseData?.diagnostic?.microscopicDescription ?? '',
    caseData?.diagnostic?.ancillaryStudies ?? '',
  ].join(' ').toLowerCase();

  for (let len = words.length; len >= 3; len--) {
    const phrase = words.slice(0, len).join(' ');
    if (allText.includes(phrase.toLowerCase())) return { phrase, found: true };
  }
  // Honest signal, same as the original inline logic: the AI cited a
  // source but it genuinely can't be located verbatim in the report.
  return { phrase: candidate, found: false };
}
