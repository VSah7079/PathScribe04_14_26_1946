// src/services/cytologyQc/resolveQcCodeDivergence.ts
// Batch 669f (cyt-6, Pete Oct 24, 2026): the Secondary Diagnostic Code of a QC discrepancy stays optional,
// but when it is given and the two codes "diverge significantly" the reviewer must confirm it explicitly.
//
// "Diverge significantly" is defined on the cytology category scale (CytologyCategoryEntry.diagnosticRank,
// 0 NILM ... 5 frank malignancy), the scale classifyCytologyAgreement already uses for Minor and Major:
//   - the two ranks are two or more steps apart (for example NILM with ASC-H, or ASC-US with HSIL), or
//   - they sit on opposite sides of the low-grade / high-grade line (rank 2 and below against rank 3 and
//     above, HIGH_GRADE_RANK_THRESHOLD), even when only one step apart (LSIL against ASC-H).
// Codes are typed text. A code is matched to an Interpretation and Result category (or the general category NILM, rank 0) by its abbreviation or
// label (case, spaces and hyphens ignored). When either code matches no category the scale cannot judge it,
// so no confirmation can be asked. Batch 669f (reviewer refinement): a SECONDARY code that matches no
// category is then never silently skipped: it is an unrecognised code, the form shows a field message and
// Submit is blocked until the person picks a recognised code or clears the field (no extra window); the
// service refuses it too (QC_SECONDARY_CODE_UNRECOGNISED), so an unrecognised string is never stored as a code.
// (If the category list itself could not be read, nothing can be judged and nothing is blocked.) An unmatched
// PRIMARY code is not blocked. The reviewer's severity (Major or Minor) is recorded either way.
import type { CytologyCategoryEntry } from '../cytology/ICytologyCategoryService';
import { HIGH_GRADE_RANK_THRESHOLD } from '../cytology/classifyCytologyAgreement';

/** Ranks this many steps apart (or more) diverge significantly. */
export const SIGNIFICANT_RANK_GAP = 2;

/** The error a service returns when a significant divergence was not confirmed. */
export const QC_DIVERGENCE_NOT_CONFIRMED = 'CYTOLOGY_QC_DIVERGENCE_NOT_CONFIRMED';

/** The error a service returns when the secondary code is typed but matches no known category. */
export const QC_SECONDARY_CODE_UNRECOGNISED = 'CYTOLOGY_QC_SECONDARY_CODE_UNRECOGNISED';

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** The Interpretation and Result category a typed code names (abbreviation or label), or undefined. */
export function findCategoryForCode(code: string, categories: CytologyCategoryEntry[]): CytologyCategoryEntry | undefined {
  const key = norm(code);
  if (!key) return undefined;
  return categories.find(c => c.active && rankOfCategory(c) !== undefined && ((c.abbreviation && norm(c.abbreviation) === key) || norm(c.label) === key));
}

/** The category's rank on the scale. The general category NILM carries no rank of its own: it is rank 0. */
export function rankOfCategory(c: CytologyCategoryEntry): number | undefined {
  if (c.section === 'interpretation_result') return c.diagnosticRank;
  return c.section === 'general_categorization' && c.abbreviation && norm(c.abbreviation) === 'nilm' ? 0 : undefined;
}

const rankOfCat = (c: CytologyCategoryEntry | undefined) => (c ? rankOfCategory(c) : undefined);

/** True when a secondary code is given but matches no category (so it cannot be compared with the primary). */
export function isUnrecognisedSecondaryCode(secondary: string, categories: CytologyCategoryEntry[]): boolean {
  if (!secondary.trim() || categories.length === 0) return false;
  return rankOfCat(findCategoryForCode(secondary, categories)) === undefined;
}

export interface QcCodeDivergence { diverges: boolean; primaryRank?: number; secondaryRank?: number }

export function resolveQcCodeDivergence(primary: string, secondary: string, categories: CytologyCategoryEntry[]): QcCodeDivergence {
  if (!secondary.trim()) return { diverges: false };
  const p = rankOfCat(findCategoryForCode(primary, categories));
  const s = rankOfCat(findCategoryForCode(secondary, categories));
  if (p === undefined || s === undefined) return { diverges: false, primaryRank: p, secondaryRank: s };
  const crosses = (p >= HIGH_GRADE_RANK_THRESHOLD) !== (s >= HIGH_GRADE_RANK_THRESHOLD);
  return { diverges: Math.abs(p - s) >= SIGNIFICANT_RANK_GAP || crosses, primaryRank: p, secondaryRank: s };
}

export type DiscrepancySubmitStep = 'blocked' | 'unrecognised' | 'confirm' | 'submit';

/** What Submit Discrepancy does next: nothing (no primary code), nothing until the unrecognised secondary code is fixed, ask for the confirmation, or record it. */
export function nextDiscrepancySubmitStep(
  input: { primary: string; secondary: string; confirmed: boolean },
  categories: CytologyCategoryEntry[],
): DiscrepancySubmitStep {
  if (!input.primary.trim()) return 'blocked';
  if (isUnrecognisedSecondaryCode(input.secondary, categories)) return 'unrecognised';
  if (!input.confirmed && resolveQcCodeDivergence(input.primary, input.secondary, categories).diverges) return 'confirm';
  return 'submit';
}
