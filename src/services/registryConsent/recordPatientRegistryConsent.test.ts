// src/services/registryConsent/recordPatientRegistryConsent.test.ts
import { describe, it, expect, vi } from 'vitest';
import { recordPatientRegistryConsent, type RecordRegistryConsentDeps } from './recordPatientRegistryConsent';
import type { Patient } from '@/types/case/Patient';
import { ConcurrencyConflictError } from '../cases/ConcurrencyConflictError';

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

describe('recordPatientRegistryConsent — PS-71 (Batch 458) versioned save', () => {
  it('on a conflict, sets the opt-outs on the newer patient so a detail saved meanwhile survives', async () => {
    const stale = { id: 'C-1', version: 4, patient: { id: 'PAT-1', firstName: 'A', lastName: 'B' } as Patient };
    const newer = { id: 'C-1', version: 5, patient: { ...stale.patient, lastName: 'Changed' } as Patient };
    const reads = [stale, stale, newer];
    const saves: Array<[any, number]> = []; const mpi: any[] = [];
    const d: RecordRegistryConsentDeps = {
      enforce: async () => ({ allowed: true }),
      getCase: async () => reads.shift() ?? newer,
      updateCase: async (_id, patch, v) => { saves.push([patch, v]); if (v === 4) throw new ConcurrencyConflictError('C-1', 4, 5); },
      setInMpi: async (patientId, consent) => { mpi.push({ patientId, consent }); },
      logAudit: () => undefined,
      now: () => '2026-10-04T00:00:00.000Z',
    };
    const r = await recordPatientRegistryConsent({ caseId: 'C-1', screeningOptOut: true, cancerRegistryOptOut: false }, u, d);
    expect(r.outcome).toBe('saved');
    expect(saves.map(([, v]) => v)).toEqual([4, 5]);
    expect(saves[1][0].patient).toMatchObject({ lastName: 'Changed', registryConsent: { screeningOptOut: true } });
    expect(mpi).toHaveLength(1);
  });

  it('when every try conflicts: outcome conflict, nothing mirrored to the MPI', async () => {
    const mpi: any[] = [];
    const d: RecordRegistryConsentDeps = {
      enforce: async () => ({ allowed: true }),
      getCase: async () => ({ id: 'C-1', version: 1, patient: { id: 'PAT-1', firstName: 'A', lastName: 'B' } as Patient }),
      updateCase: async () => { throw new ConcurrencyConflictError('C-1', 1, 2); },
      setInMpi: async (patientId, consent) => { mpi.push({ patientId, consent }); },
      logAudit: () => undefined,
      now: () => '2026-10-04T00:00:00.000Z',
    };
    expect((await recordPatientRegistryConsent({ caseId: 'C-1', screeningOptOut: true, cancerRegistryOptOut: false }, u, d)).outcome).toBe('conflict');
    expect(mpi).toEqual([]);
  });
});
