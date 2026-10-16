// src/services/cytology/buildCytologyCaseOruR01Payload.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 532 (Pete, Oct 12, 2026: "Change publication target to the case …
// downstream EMR interfaces receive a single comprehensive message per
// accession"). One ORU^R01 result per cytology accession, JSON for the
// interface engine (which formats the HL7 or FHIR on the wire, as for the
// single-specimen payload it replaces):
//
//   - one result per specimen, in case order, with its signed record id and
//     the same narrative fields the single-specimen payload carried, or
//     status "not-reported" with the reason (early finalization);
//   - the consolidated case report PDF (generateCytologyCaseReportPdf), built
//     by the caller and passed in;
//   - for a correction or addendum, the whole case report again, with the
//     specimen that changed and, for a correction, what it read before
//     (Pete: "reissue the whole case report").
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologyCaseReport } from '@/types/cytology/CytologyCaseReport';
import type { CytologyOruR01GeographyExtension } from './buildCytologyOruR01Payload';

export interface CytologyCaseOruSpecimenResult {
  specimenId: string;
  label: string;
  status: 'reported' | 'not-reported';
  signOutRecordId?: string;
  signedAt?: string;
  notReportedReason?: string;
  narrative?: {
    specimenAdequacy: string;
    generalCategorization?: string;
    primaryInterpretation: string;
    additionalInterpretations?: string;
    recommendations?: string;
    addendumText?: string;
  };
  geographyExtension?: CytologyOruR01GeographyExtension;
}

export interface CytologyCaseOruR01Payload {
  messageId: string;
  eventType: 'ORU_R01';
  /** Batch 532: one message for the whole accession. */
  scope: 'case';
  resultState: 'FINAL' | 'CORRECTED' | 'ADDENDUM';
  eventTimestamp: string;
  caseId: string;
  accessionNumber: string;
  patient: { mrn?: string; name: string; dateOfBirth?: string };
  specimens: CytologyCaseOruSpecimenResult[];
  /** For a correction or addendum: the specimen whose result changed, and its new record. */
  changed?: { specimenId: string; signOutRecordId: string; previouslyReportedAs?: string };
  reportPdfBase64: string;
}

export function buildCytologyCaseOruR01Payload(
  report: CytologyCaseReport,
  resultState: 'FINAL' | 'CORRECTED' | 'ADDENDUM',
  reportPdfBase64: string,
  options: { messageId: string; changedRecordId?: string; previouslyReportedAs?: string } ,
): CytologyCaseOruR01Payload {
  const reported = report.specimens.filter(s => s.record);
  const first = reported[0]?.record?.reportContent;
  const changedSpecimen = options.changedRecordId ? report.specimens.find(s => s.record?.id === options.changedRecordId) : undefined;
  const newest = reported.map(s => s.record!.signedAt).sort().pop() ?? '';
  return {
    messageId: options.messageId,
    eventType: 'ORU_R01',
    scope: 'case',
    resultState,
    eventTimestamp: changedSpecimen?.record?.signedAt ?? newest,
    caseId: report.caseId,
    accessionNumber: report.accessionNumber,
    patient: { mrn: first?.patientMrn, name: first?.patientName ?? '', dateOfBirth: first?.patientDateOfBirth },
    specimens: report.specimens.map(s => {
      if (!s.record) return { specimenId: s.specimenId, label: s.label, status: 'not-reported' as const, ...(s.notReportedReason ? { notReportedReason: s.notReportedReason } : {}) };
      const c = s.record.reportContent;
      return {
        specimenId: s.specimenId, label: s.label, status: 'reported' as const, signOutRecordId: s.record.id, signedAt: s.record.signedAt,
        narrative: {
          specimenAdequacy: c.specimenAdequacy.join('; '),
          generalCategorization: c.generalCategorization,
          primaryInterpretation: c.primaryInterpretation,
          additionalInterpretations: c.additionalInterpretations.length ? c.additionalInterpretations.join('; ') : undefined,
          recommendations: c.recommendations.length ? c.recommendations.join('; ') : undefined,
          addendumText: c.addendumText || undefined,
        },
        ...(c.cisoeAScore ? { geographyExtension: { type: 'cisoe_a' as const, score: c.cisoeAScore } } : {}),
      };
    }),
    ...(changedSpecimen?.record ? {
      changed: {
        specimenId: changedSpecimen.specimenId, signOutRecordId: changedSpecimen.record.id,
        ...(resultState === 'CORRECTED' && options.previouslyReportedAs ? { previouslyReportedAs: options.previouslyReportedAs } : {}),
      },
    } : {}),
    reportPdfBase64,
  };
}
