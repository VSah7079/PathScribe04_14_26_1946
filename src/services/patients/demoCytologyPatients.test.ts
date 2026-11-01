import { describe, it, expect } from 'vitest';
import { DEMO_CYTOLOGY_PATIENTS, demoCytologyPatientRecord } from './demoCytologyPatients';
import { mockPatientIndexService } from './mockPatientIndexService';

describe('demo cytology patients (Batch 634)', () => {
  it('covers PAT-CYT-001 to 031 (024 to 031: Batch 744 fluids), each with an organisation, MRN and name', () => {
    expect(DEMO_CYTOLOGY_PATIENTS).toHaveLength(42);
    expect(DEMO_CYTOLOGY_PATIENTS.map(p => p.id)).toEqual(Array.from({ length: 42 }, (_, i) => `PAT-CYT-${String(i + 1).padStart(3, '0')}`));
    for (const p of DEMO_CYTOLOGY_PATIENTS) expect(p.organisationId && p.mrn && p.firstName && p.lastName).toBeTruthy();
  });
  it('builds a record with a fixed birth date; unknown ids give null', () => {
    expect(demoCytologyPatientRecord('PAT-CYT-001', '2026-10-19T00:00:00.000Z')).toMatchObject({ id: 'PAT-CYT-001', organisationId: 'ENT-DEFAULT', dateOfBirth: '1992-04-02T00:00:00.000Z', establishedVia: 'created' });
    expect(demoCytologyPatientRecord('PAT-001', 'x')).toBeNull();
  });
  it('the index finds a demo patient (and keeps it), and still returns null for an unknown id', async () => {
    const first = await mockPatientIndexService.getById('PAT-CYT-019');
    expect(first).toMatchObject({ organisationId: 'c-au-sydney-cyto', lastName: 'Thompson' });
    expect(await mockPatientIndexService.getById('PAT-CYT-019')).toMatchObject({ createdAt: first!.createdAt });
    expect(await mockPatientIndexService.getById('PAT-NOPE')).toBeNull();
  });
});
