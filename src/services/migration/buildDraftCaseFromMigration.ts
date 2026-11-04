// src/services/migration/buildDraftCaseFromMigration.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 611 (#132, #166): builds the minimal draft Case a succeeded legacy
// record becomes. It is a draft: patient, accession reference, one specimen
// with the legacy description, and the legacy text kept as the case's own
// description fields. Nothing the legacy record did not carry is invented
// (no template, no blocks, no report).
//
// The case is marked as a Simulated bulk import (`importSource`) and keeps the
// legacy accession number as `accession.externalAccession`, so it can be traced
// back and so a second import of the same file does not create it twice.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { MigrationCaseDraft } from '@/types/migration/MigrationCaseDraft';

export const MIGRATION_CASE_ID_PREFIX = 'MIG-';

export interface DraftCaseContext {
  caseId: string;
  patientId: string;
  jobId: string;
  sourceSystemName: string;
  organisationId: string;
  /** Hospital / enterprise the demo uses when the record names none. */
  originHospitalId: string;
  originEnterpriseId: string;
  now: Date;
}

const sexOf = (s?: string): 'M' | 'F' | 'U' => {
  const v = (s ?? '').trim().toUpperCase();
  if (v.startsWith('M')) return 'M';
  if (v.startsWith('F')) return 'F';
  return 'U';
};

const isoOrUndefined = (s?: string): string | undefined => {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

export function buildDraftCaseFromMigration(draft: MigrationCaseDraft, ctx: DraftCaseContext): Case {
  const nowIso = ctx.now.toISOString();
  const accession = draft.legacyAccessionNumber ?? '';
  return {
    id: ctx.caseId,
    status: 'draft',
    originHospitalId: ctx.originHospitalId,
    originEnterpriseId: ctx.originEnterpriseId,
    createdAt: nowIso,
    updatedAt: nowIso,
    accession: {
      accessionNumber: accession,
      fullAccession: accession,
      accessionedAt: isoOrUndefined(draft.accessionDate),
      accessionedBy: 'Simulated bulk import',
      externalAccession: accession,
    },
    patient: {
      id: ctx.patientId,
      mrn: draft.patientMrn,
      firstName: draft.patientFirstName ?? '',
      lastName: draft.patientLastName ?? '',
      givenNames: draft.patientFirstName,
      familyNames: draft.patientLastName,
      dateOfBirth: draft.patientDateOfBirth,
      sex: sexOf(draft.patientSex),
    },
    order: {
      priority: 'Routine',
      requestingProvider: draft.orderingPhysicianName,
      facilityName: draft.facilityName,
    },
    specimens: [{
      id: `${ctx.caseId}-S1`,
      label: 'A',
      description: draft.specimenDescription ?? '',
    }],
    diagnostic: (draft.grossDescriptionText || draft.microscopicDescriptionText || draft.finalDiagnosisText)
      ? {
          grossDescription: draft.grossDescriptionText,
          microscopicDescription: draft.microscopicDescriptionText,
          primaryDiagnosis: draft.finalDiagnosisText,
        }
      : undefined,
    coding: {
      snomed: draft.snomedCodes,
      icdO: draft.icdOCodes,
    },
    importSource: {
      kind: 'simulated_bulk_import',
      jobId: ctx.jobId,
      sourceSystemName: ctx.sourceSystemName,
      importedAt: nowIso,
    },
    caseFlags: [],
  };
}
