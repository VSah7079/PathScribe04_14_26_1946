// src/services/migration/buildDraftCaseFromMigration.test.ts — Batch 611 (#132, #166)
import { describe, it, expect } from 'vitest';
import { buildDraftCaseFromMigration } from './buildDraftCaseFromMigration';

const ctx = {
  caseId: 'MIG-1-1', patientId: 'pt-1', jobId: 'migjob-1', sourceSystemName: 'LegacyLIS', organisationId: 'org-1',
  originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-DEFAULT', now: new Date('2026-10-18T12:00:00Z'),
};

describe('buildDraftCaseFromMigration', () => {
  it('builds a draft case marked as a Simulated bulk import, keeping the legacy accession', () => {
    const c = buildDraftCaseFromMigration({
      patientFirstName: 'Anna', patientLastName: 'Lee', patientDateOfBirth: '1980-01-02', patientMrn: 'M1', patientSex: 'female',
      legacyAccessionNumber: 'S-100', accessionDate: '2019-03-04', specimenDescription: 'Colon biopsy',
      finalDiagnosisText: 'Adenoma', snomedCodes: ['M-8140'],
    }, ctx);
    expect(c.status).toBe('draft');
    expect(c.id).toBe('MIG-1-1');
    expect(c.importSource).toEqual({ kind: 'simulated_bulk_import', jobId: 'migjob-1', sourceSystemName: 'LegacyLIS', importedAt: '2026-10-18T12:00:00.000Z' });
    expect(c.accession.externalAccession).toBe('S-100');
    expect(c.accession.accessionedBy).toBe('Simulated bulk import');
    expect(c.patient).toMatchObject({ id: 'pt-1', firstName: 'Anna', lastName: 'Lee', sex: 'F', dateOfBirth: '1980-01-02' });
    expect(c.specimens).toHaveLength(1);
    expect(c.specimens[0].description).toBe('Colon biopsy');
    expect(c.coding?.snomed).toEqual(['M-8140']);
    expect(c.diagnostic?.primaryDiagnosis).toBe('Adenoma');
  });
  it('invents nothing the record did not carry', () => {
    const c = buildDraftCaseFromMigration({ patientFirstName: 'A', patientLastName: 'B', legacyAccessionNumber: 'X' }, ctx);
    expect(c.patient.sex).toBe('U');
    expect(c.accession.accessionedAt).toBeUndefined();
    expect(c.specimens[0].description).toBe('');
    expect(c.diagnostic).toBeUndefined();
  });
  it('ignores a legacy date it cannot read', () => {
    const c = buildDraftCaseFromMigration({ legacyAccessionNumber: 'X', accessionDate: 'not a date' }, ctx);
    expect(c.accession.accessionedAt).toBeUndefined();
  });
});
