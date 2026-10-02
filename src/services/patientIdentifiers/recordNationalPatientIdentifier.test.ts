// src/services/patientIdentifiers/recordNationalPatientIdentifier.test.ts
import { describe, it, expect, vi } from 'vitest';
import { recordNationalPatientIdentifier, withNationalIdentifier, type RecordNationalIdentifierDeps } from './recordNationalPatientIdentifier';
import type { Patient } from '@/types/case/Patient';

function deps(allowed = true, patient: Patient | null = { id: 'PAT-1', firstName: 'A', lastName: 'B', mrn: '100001' }) {
  const updates: any[] = []; const mpi: any[] = []; const audits: any[] = [];
  const d: RecordNationalIdentifierDeps = {
    enforce: vi.fn(async () => ({ allowed })),
    getCase: async () => (patient ? { id: 'C-1', patient } : null),
    updateCase: async (_id, patch) => { updates.push(patch); },
    recordInMpi: async (patientId, identifier) => { mpi.push({ patientId, identifier }); },
    logAudit: e => audits.push(e),
    now: () => '2026-09-30T12:00:00.000Z',
  };
  return { d, updates, mpi, audits };
}

describe('recordNationalPatientIdentifier (Batch 417)', () => {
  it('refuses without the capability, writing nothing', async () => {
    const { d, updates, mpi } = deps(false);
    expect((await recordNationalPatientIdentifier({ caseId: 'C-1', system: 'mrn_nhs', value: '9434765919' }, { id: 'u', name: 'U' }, d)).outcome).toBe('notPermitted');
    expect(d.enforce).toHaveBeenCalledWith('patient:national-identifier:record', { caseId: 'C-1' });
    expect(updates).toEqual([]); expect(mpi).toEqual([]);
  });

  it('verifies the check digit, writes the case patient and the MPI, audits without the value', async () => {
    const { d, updates, mpi, audits } = deps();
    const r = await recordNationalPatientIdentifier({ caseId: 'C-1', system: 'mrn_nhs', value: '943 476 5919' }, { id: 'u', name: 'Pete' }, d);
    expect(r.outcome).toBe('saved');
    expect(r.identifier).toEqual({ system: 'mrn_nhs', value: '9434765919', verificationStatus: 'verified', verifiedAt: '2026-09-30T12:00:00.000Z', source: 'manual' });
    expect(updates[0].patient.nationalIdentifiers).toEqual([r.identifier]);
    expect(updates[0].patient.mrn).toBe('100001'); // the MRN is untouched
    expect(mpi).toEqual([{ patientId: 'PAT-1', identifier: r.identifier }]);
    expect(audits[0].detail).toBe('Case C-1: mrn_nhs verified');
    expect(JSON.stringify(audits)).not.toContain('9434765919');
  });

  it('keeps a value that fails its check digit, marked failedChecksum, with the reason', async () => {
    const { d, updates } = deps();
    const r = await recordNationalPatientIdentifier({ caseId: 'C-1', system: 'mrn_nhs', value: '9434765918' }, { id: 'u', name: 'U' }, d);
    expect(r.outcome).toBe('saved');
    expect(r.identifier?.verificationStatus).toBe('failedChecksum');
    expect(r.check?.reasonKey).toBe('nationalIdentifiers.reasons.checksumMismatch');
    expect(updates[0].patient.nationalIdentifiers[0].verificationStatus).toBe('failedChecksum');
  });

  it('replaces the same system, keeps other systems, and a blank value removes', async () => {
    const existing: Patient = { id: 'PAT-1', firstName: 'A', lastName: 'B', nationalIdentifiers: [
      { system: 'id_ie_ppsn', value: '1234567FA', verificationStatus: 'verified' },
      { system: 'id_ie_ihi', value: '8000000016', verificationStatus: 'verified' },
    ] };
    const { d, updates } = deps(true, existing);
    await recordNationalPatientIdentifier({ caseId: 'C-1', system: 'id_ie_ppsn', value: '1234567T' }, { id: 'u', name: 'U' }, d);
    expect(updates[0].patient.nationalIdentifiers.map((i: any) => `${i.system}:${i.value}`)).toEqual(['id_ie_ihi:8000000016', 'id_ie_ppsn:1234567T']);
    const r = await recordNationalPatientIdentifier({ caseId: 'C-1', system: 'id_ie_ihi', value: '  ' }, { id: 'u', name: 'U' }, d);
    expect(r.outcome).toBe('removed');
    expect(updates[1].patient.nationalIdentifiers.map((i: any) => i.system)).toEqual(['id_ie_ppsn']);
  });

  it('Batch 425: after accessioning (announce) an A08 goes to the engine; a removal comes off the MPI too; at accessioning no A08', async () => {
    const { d } = deps();
    const announced: string[] = []; const removed: string[] = [];
    d.announceDemographicUpdate = async id => { announced.push(id); };
    d.removeFromMpi = async (id, system) => { removed.push(`${id}:${system}`); };
    await recordNationalPatientIdentifier({ caseId: 'C-1', system: 'mrn_nhs', value: '9434765919' }, { id: 'u', name: 'U' }, d);
    expect(announced).toEqual([]);
    await recordNationalPatientIdentifier({ caseId: 'C-1', system: 'mrn_nhs', value: '9434765919', announce: true }, { id: 'u', name: 'U' }, d);
    await recordNationalPatientIdentifier({ caseId: 'C-1', system: 'mrn_nhs', value: ' ', announce: true }, { id: 'u', name: 'U' }, d);
    expect(announced).toEqual(['PAT-1', 'PAT-1']);
    expect(removed).toEqual(['PAT-1:mrn_nhs']);
  });

  it('a missing case', async () => {
    const { d } = deps(true, null);
    expect((await recordNationalPatientIdentifier({ caseId: 'C-9', system: 'mrn_nhs', value: '1' }, { id: 'u', name: 'U' }, d)).outcome).toBe('caseNotFound');
  });

  it('withNationalIdentifier is pure', () => {
    const list = [{ system: 'a', value: '1', verificationStatus: 'verified' as const }];
    expect(withNationalIdentifier(list, 'a', null)).toEqual([]);
    expect(list).toHaveLength(1);
    expect(withNationalIdentifier(undefined, 'b', { system: 'b', value: '2', verificationStatus: 'unchecked' })).toHaveLength(1);
  });
});
