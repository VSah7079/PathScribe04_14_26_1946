// src/services/relatedCases/loadRelatedCandidates.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 613: loads the related released cases the signed-in user may choose from.
//
// Unlike the Patient History list (which reads every case so that it can count the ones the user
// may not open), this asks the case router WITHOUT the access bypass, so a case the user cannot
// open is never in the list and never reaches a report. The dependencies are passed in, so this
// is tested without the app's services.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { ServiceResult } from '../types';
import { resolveIntraopDiagnosisText } from '../reports/fullPatientReportRows';
import { findRelatedCandidates } from './relatedCaseRules';
import type { RelatedCaseSnapshot } from './relatedCaseTypes';

type IntraopEntries = Parameters<typeof resolveIntraopDiagnosisText>[0];

export interface LoadRelatedDeps {
  /** The cases this user may open (access rules applied). */
  getVisibleCases: () => Promise<ServiceResult<Case[]>>;
  /** Every identity confirmed to be the same person as this one, this one included. */
  getSamePersonIds: (patientId: string) => Promise<string[]>;
  getIntraopEntries: () => Promise<ServiceResult<IntraopEntries>>;
}

export async function loadRelatedCandidates(
  input: { patientId: string; currentCaseId?: string },
  deps: LoadRelatedDeps,
): Promise<RelatedCaseSnapshot[]> {
  if (!input.patientId) return [];
  const [casesRes, ids, intraopRes] = await Promise.all([
    deps.getVisibleCases(),
    deps.getSamePersonIds(input.patientId),
    deps.getIntraopEntries().catch(() => ({ ok: false }) as { ok: false }),
  ]);
  if (!casesRes.ok) return [];
  const entries: IntraopEntries = intraopRes.ok ? (intraopRes as { ok: true; data: IntraopEntries }).data : [];
  const intraopByCaseId = new Map<string, string>();
  for (const c of casesRes.data) {
    const text = resolveIntraopDiagnosisText(entries, c.id);
    if (text) intraopByCaseId.set(c.id, text);
  }
  return findRelatedCandidates({
    visibleCases: casesRes.data,
    patientIds: [input.patientId, ...ids],
    currentCaseId: input.currentCaseId,
    intraopByCaseId,
  });
}
