// src/services/reasons/revisionReasonRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-146 (Batch 438, Pete Oct 2): each amendment and correction reason has a
// "clinically significant" switch, so each lab decides which revisions mean
// the original report may have affected clinical management. A released
// amendment or correction with such a reason recommends a CAPA (never opens
// one: capaRecommendationService). Addenda never do: they add information,
// they don't revise it.
//
// Starting values (a lab changes them in Configuration → System → Revision
// Reasons): the four diagnostic revisions — diagnosis, margin, stage, tissue
// reclassification — are clinically significant; the clerical corrections
// are not. A reason saved before Batch 438 has no value of its own and uses
// these. Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReasonDictionaryEntry } from '@/types/reasons/ReasonDictionaryEntry';
import type { AmendmentRecord } from '@/types/reports/AmendmentRecord';
import type { CapaRecommendationInput } from '@/types/quality/CapaRecommendation';

export const DEFAULT_CLINICALLY_SIGNIFICANT: ReadonlySet<string> = new Set(['AMEND_DIAG', 'AMEND_MARGIN', 'AMEND_STAGE', 'AMEND_TISSUE']);

/** The reason categories that carry the switch. */
export const REVISION_REASON_CATEGORIES = ['AMENDMENT', 'CORRECTION'] as const;

export function isClinicallySignificant(entry: Pick<ReasonDictionaryEntry, 'id' | 'clinicallySignificant'>): boolean {
  return entry.clinicallySignificant ?? DEFAULT_CLINICALLY_SIGNIFICANT.has(entry.id);
}

/** The CAPA recommendation a released revision makes, if any. */
export function revisionRecommendation(
  record: Pick<AmendmentRecord, 'id' | 'caseId' | 'type' | 'specimenId'>,
  reason: Pick<ReasonDictionaryEntry, 'id' | 'name' | 'clinicallySignificant'> | undefined,
  createdBy: string,
): CapaRecommendationInput | null {
  if (record.type === 'addendum' || !reason || !isClinicallySignificant(reason)) return null;
  return {
    caseId: record.caseId,
    specimenId: null,
    source: 'clinical-correction',
    deficiencyTypeId: 'def-clinically-significant-revision',
    sourceRecordId: record.id,
    summary: `Released ${record.type} for reason "${reason.name}" (${reason.id}), marked clinically significant.`,
    createdBy,
  };
}
