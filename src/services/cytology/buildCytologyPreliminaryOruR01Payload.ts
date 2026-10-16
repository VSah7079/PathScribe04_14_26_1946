// src/services/cytology/buildCytologyPreliminaryOruR01Payload.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 533 (Pete, Oct 12, 2026): the result message for an urgent cytology
// preliminary report: one specimen, result state PRELIMINARY (HL7 OBR-25 "P"),
// with its own PDF. JSON for the interface engine, like the case message
// (buildCytologyCaseOruR01Payload.ts), whose specimen shape it reuses. The
// case report's FINAL message supersedes it. Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologyPreliminaryRelease } from '@/types/cytology/CytologyPreliminaryRelease';
import type { CytologyCaseOruSpecimenResult } from './buildCytologyCaseOruR01Payload';

export interface CytologyPreliminaryOruR01Payload {
  messageId: string;
  eventType: 'ORU_R01';
  scope: 'preliminary';
  resultState: 'PRELIMINARY';
  priority: 'Urgent';
  eventTimestamp: string;
  caseId: string;
  accessionNumber: string;
  patient: { mrn?: string; name: string; dateOfBirth?: string };
  specimen: CytologyCaseOruSpecimenResult;
  /** The quick-pick reason code, and the pathologist's note if any. */
  reason: string;
  note?: string;
  releasedBy: string;
  reportPdfBase64: string;
}

export function buildCytologyPreliminaryOruR01Payload(
  caseId: string,
  specimenLabel: string,
  release: CytologyPreliminaryRelease,
  reportPdfBase64: string,
  messageId: string,
): CytologyPreliminaryOruR01Payload {
  const c = release.reportContent;
  return {
    messageId, eventType: 'ORU_R01', scope: 'preliminary', resultState: 'PRELIMINARY', priority: 'Urgent',
    eventTimestamp: release.releasedAt, caseId, accessionNumber: c.accessionNumber,
    patient: { mrn: c.patientMrn, name: c.patientName, dateOfBirth: c.patientDateOfBirth },
    specimen: {
      specimenId: release.specimenId, label: specimenLabel, status: 'reported', signedAt: release.releasedAt,
      narrative: {
        specimenAdequacy: c.specimenAdequacy.join('; '),
        generalCategorization: c.generalCategorization,
        primaryInterpretation: c.primaryInterpretation,
        additionalInterpretations: c.additionalInterpretations.length ? c.additionalInterpretations.join('; ') : undefined,
        recommendations: c.recommendations.length ? c.recommendations.join('; ') : undefined,
      },
      ...(c.cisoeAScore ? { geographyExtension: { type: 'cisoe_a' as const, score: c.cisoeAScore } } : {}),
    },
    reason: release.reason,
    ...(release.note ? { note: release.note } : {}),
    releasedBy: release.releasedBy.userName,
    reportPdfBase64,
  };
}
