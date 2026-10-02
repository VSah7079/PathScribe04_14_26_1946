// src/services/registryConsent/recordPatientRegistryConsent.test.ts
import { describe, it, expect, vi } from 'vitest';
import { recordPatientRegistryConsent, type RecordRegistryConsentDeps } from './recordPatientRegistryConsent';
import type { Patient } from '@/types/case/Patient';

function deps(allowed = true, patient: Patient | null = { id: 'PAT-1', firstName: 'A', lastName: 'B' }) {
  const updates: any[] = []; const mpi: any[] = []; const audits: any[] = [];
  const d: RecordRegistryConsentDeps = {
    enforce: vi.fn(async () => ({ allowed })),
    getCase: async () => (patient ? { id: 'C-1', patient } : null),
    updateCase: async (_id, patch) => { updates.push(patch); },
    setInMpi: async (patientId, consent) => { mpi.push({ patientId, consent }); },
    logAudit: e => audits.push(e),
    now: () => '2026-09-30T12:00:00.000Z',
  };
  return { d, updates, mpi, audits };
}
const u = { id: 'u1', name: 'Pete' };

describe('recordPatientRegistryConsent (Batch 418)', () => {
  it('refuses without the capability', async () => {
    const { d, updates } = deps(false);
    expect((await recordPatientRegistryConsent({ caseId: 'C-1', screeningOptOut: true, cancerRegistryOptOut: false }, u, d)).outcome).toBe('notPermitted');
    expect(d.enforce).toHaveBeenCalledWith('patient:registry-consent:record', { caseId: 'C-1' });
    expect(updates).toEqual([]);
  });
  it('writes the case patient and the MPI, and audits', async () => {
    const { d, updates, mpi, audits } = deps();
    const r = await recordPatientRegistryConsent({ caseId: 'C-1', screeningOptOut: true, cancerRegistryOptOut: false }, u, d);
    expect(r.outcome).toBe('saved');
    expect(r.consent).toEqual({ screeningOptOut: true, cancerRegistryOptOut: false, recordedAt: '2026-09-30T12:00:00.000Z', recordedBy: 'u1', source: 'manual' });
    expect(updates[0].patient.registryConsent).toEqual(r.consent);
    expect(mpi).toEqual([{ patientId: 'PAT-1', consent: r.consent }]);
    expect(audits[0]).toMatchObject({ event: 'Registry opt-out recorded', detail: 'Case C-1: screening opt-out yes, cancer registry opt-out no' });
  });
  it('clearing both flags removes the record', async () => {
    const existing: Patient = { id: 'PAT-1', firstName: 'A', lastName: 'B', registryConsent: { screeningOptOut: true, cancerRegistryOptOut: true, recordedAt: 'x' } };
    const { d, updates, mpi } = deps(true, existing);
    const r = await recordPatientRegistryConsent({ caseId: 'C-1', screeningOptOut: false, cancerRegistryOptOut: false }, u, d);
    expect(r.outcome).toBe('cleared');
    expect(updates[0].patient.registryConsent).toBeUndefined();
    expect(mpi[0].consent).toBeUndefined();
  });
  it('a missing case', async () => {
    const { d } = deps(true, null);
    expect((await recordPatientRegistryConsent({ caseId: 'C-9', screeningOptOut: true, cancerRegistryOptOut: false }, u, d)).outcome).toBe('caseNotFound');
  });
});
