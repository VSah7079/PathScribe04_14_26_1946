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

export function buildRequisitionLabelData(
  caseData: Case,
  now: () => string = () => new Date().toISOString(),
): RequisitionLabelData {
  return {
    // Same fallback the scan resolver matches on (resolveMaterialFromScan.ts);
    // the label renderers call string methods on these, so never undefined.
    fullAccession: caseData.accession.fullAccession ?? caseData.id,
    patientName: `${caseData.patient.givenNames} ${caseData.patient.familyNames}`.trim(),
    // '' reads as "not recorded" in every label renderer, as undefined did.
    dateOfBirth: caseData.patient.dateOfBirth ?? '',
    mrn: caseData.patient.mrn ?? '',
    requestingProvider: caseData.order.requestingProvider,
    // Real, honest fallback — a case can genuinely have no real facility
    // record resolved (e.g. a downtime/placeholder accession); never
    // fabricates a facility name that wasn't actually captured.
    submittingFacility: caseData.order.facilityName ?? 'Unknown Submitting Facility',
    printedAt: now(),
  };
}
