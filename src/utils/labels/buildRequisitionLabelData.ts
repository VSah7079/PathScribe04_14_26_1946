// src/utils/labels/buildRequisitionLabelData.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real feature, per direct follow-up on the label-printing architecture
// scope. Pure function — real Case in, real RequisitionLabelData out, no
// I/O — same "real data in, real data out" discipline as every other
// pure builder added this session (buildOrderCreationPayload.ts,
// applyGrossingRefinement.ts). `now` is injectable specifically so a
// real, deterministic printedAt is testable without mocking Date
// globally.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { RequisitionLabelData } from '@/types/labels/LabelData';

/**
 * Patient name for a label. A missing patient record, or a missing given or
 * family name, gives a blank (PS-478): the label used to print
 * "Patient undefined undefined". Older records that stored first_name /
 * last_name are read too, so they still print.
 */
export function labelPatientName(patient: unknown): string {
  const p = (patient ?? {}) as Record<string, unknown>;
  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      const v = p[k];
      if (typeof v === 'string' && v.trim() !== '') return v.trim();
    }
    return '';
  };
  return [pick('givenNames', 'firstName', 'first_name'), pick('familyNames', 'lastName', 'last_name')]
    .filter(Boolean)
    .join(' ');
}

export function buildRequisitionLabelData(
  caseData: Case,
  now: () => string = () => new Date().toISOString(),
): RequisitionLabelData {
  return {
    // Same fallback the scan resolver matches on (resolveMaterialFromScan.ts);
    // the label renderers call string methods on these, so never undefined.
    fullAccession: caseData.accession.fullAccession ?? caseData.id,
    patientName: labelPatientName(caseData.patient),
    // '' reads as "not recorded" in every label renderer, as undefined did.
    dateOfBirth: caseData.patient?.dateOfBirth ?? '',
    mrn: caseData.patient?.mrn ?? '',
    requestingProvider: caseData.order.requestingProvider,
    // Real, honest fallback — a case can genuinely have no real facility
    // record resolved (e.g. a downtime/placeholder accession); never
    // fabricates a facility name that wasn't actually captured.
    submittingFacility: caseData.order.facilityName ?? 'Unknown Submitting Facility',
    printedAt: now(),
  };
}
