// src/services/relatedCases/patientSummary.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 613 (Pete, Oct 18, 2026: "go with patient summary print"): a printed summary of a
// patient's released cases, from the patient history view.
//
//   • It is a SUMMARY, not a signed report. Every page says so, and lists the accession of each
//     case it was compiled from.
//   • Released cases only; the user chooses which; date order; only cases the user may already
//     see (relatedCases/loadRelatedCandidates.ts).
//   • Printing needs `patient:summary:print` and is audited: who, which patient (by id), how many
//     cases. No diagnosis text or accession goes in the audit detail.
//   • The layout is the same one the sign-out attachment uses (components/RelatedCases/
//     RelatedCaseList), so the two always read alike.
// ─────────────────────────────────────────────────────────────────────────────

import { auditService } from '../auditlog/auditServiceInstance';
import type { RelatedCaseSnapshot } from './relatedCaseTypes';

export type PrintSummaryFailure = 'notPermitted' | 'nothingChosen';
export type PrintSummaryResult = { ok: true } | { ok: false; reason: PrintSummaryFailure };

export interface PatientSummaryDeps {
  enforce: (context: { caseId: string | null; facilityId: string | null }) => Promise<{ allowed: boolean }>;
  audit: (entry: { event: string; detail: string; user: string; caseId: string }) => void;
}

const defaultDeps: PatientSummaryDeps = {
  enforce: async context => {
    const { authorizationService } = await import('../authorization/defaultAuthorizationService');
    return authorizationService.enforce('patient:summary:print', context);
  },
  audit: entry => {
    auditService.logEvent({ type: 'system', event: entry.event, detail: entry.detail, user: entry.user, caseId: entry.caseId, confidence: null }).catch(() => {});
  },
};

/** The cases a summary prints, in date order, nothing else. */
export function summaryCases(chosen: readonly RelatedCaseSnapshot[]): RelatedCaseSnapshot[] {
  return [...chosen].sort((a, b) => a.releasedAt.localeCompare(b.releasedAt));
}

/** Checks the permission and writes the audit entry; the caller then opens the print dialog. */
export async function authorisePatientSummaryPrint(
  input: { patientId: string; currentCaseId?: string | null; facilityId?: string | null; chosen: readonly RelatedCaseSnapshot[]; user: string },
  deps: PatientSummaryDeps = defaultDeps,
): Promise<PrintSummaryResult> {
  if (input.chosen.length === 0) return { ok: false, reason: 'nothingChosen' };
  if (!(await deps.enforce({ caseId: input.currentCaseId ?? null, facilityId: input.facilityId ?? null })).allowed) return { ok: false, reason: 'notPermitted' };
  deps.audit({
    event: 'PATIENT_SUMMARY_PRINTED',
    detail: `Patient summary printed for patient ${input.patientId}: ${input.chosen.length} released case(s)`,
    user: input.user,
    caseId: input.currentCaseId ?? '',
  });
  return { ok: true };
}
