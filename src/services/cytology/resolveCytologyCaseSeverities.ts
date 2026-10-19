// src/services/cytology/resolveCytologyCaseSeverities.ts
// Batch 608 (#54): the advisory abnormal severity for each case, from its
// latest cytology review. Pure; wraps resolveCytologyAbnormalSeverity so a
// list (the QC queue) can show a badge. Advisory only: it never blocks sign-out.

import type { CytologyReviewRecord } from '@/types/cytology/CytologyReviewRecord';
import { allCytologyInterpretationIds } from '@/types/cytology/CytologyReviewRecord';
import type { CytologyCategoryEntry } from './ICytologyCategoryService';
import type { AbnormalSeverity } from '@/services/abnormalDetection/IAbnormalTriggerRuleService';
import { resolveCytologyAbnormalSeverity } from './resolveCytologyAbnormalSeverity';

export function resolveCytologyCaseSeverities(
  reviews: Pick<CytologyReviewRecord, 'caseId' | 'primaryInterpretationId' | 'additionalInterpretations' | 'recordedAt'>[],
  categories: CytologyCategoryEntry[],
): Record<string, AbnormalSeverity> {
  const latest = new Map<string, (typeof reviews)[number]>();
  for (const r of reviews) {
    const prev = latest.get(r.caseId);
    if (!prev || String(r.recordedAt) > String(prev.recordedAt)) latest.set(r.caseId, r);
  }
  const out: Record<string, AbnormalSeverity> = {};
  latest.forEach((r, caseId) => {
    const s = resolveCytologyAbnormalSeverity(allCytologyInterpretationIds(r), categories);
    if (s) out[caseId] = s;
  });
  return out;
}
