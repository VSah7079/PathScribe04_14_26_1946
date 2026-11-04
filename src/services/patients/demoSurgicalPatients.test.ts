// Batch 638: the surgical demo patients are in the patient index, so a released surgical result has an organisation to queue against.
import { describe, it, expect } from 'vitest';
import { DEMO_SURGICAL_PATIENTS, demoSurgicalPatientRecord } from './demoSurgicalPatients';
import { mockPatientIndexService } from './mockPatientIndexService';
import { mockCaseService } from '@/services/cases/mockCaseService';

describe('demo surgical patients (Batch 638)', () => {
  it('every seeded case has its patient in the index, with the same organisation and MRN', async () => {
    const r: any = await (mockCaseService as any).getAll();
    const cases: any[] = r.data ?? r;
    for (const c of cases) {
      const found = await mockPatientIndexService.getById(c.patient.id);
      expect(found, `${c.id} / ${c.patient.id}`).not.toBeNull();
      expect(found!.organisationId).toBe(c.originEnterpriseId);
      expect(found!.mrn).toBe(c.patient.mrn);
    }
  });
  it('each patient has an organisation, MRN, name and a fixed birth date; unknown ids give null', () => {
    for (const p of DEMO_SURGICAL_PATIENTS) expect(p.organisationId && p.mrn && p.firstName && p.lastName && /^\d{4}-\d{2}-\d{2}$/.test(p.dateOfBirth)).toBeTruthy();
    expect(demoSurgicalPatientRecord('PAT-001', '2026-10-20T00:00:00.000Z')).toMatchObject({ id: 'PAT-001', organisationId: 'ENT-DEFAULT', establishedVia: 'created' });
    expect(demoSurgicalPatientRecord('PAT-CYT-001', 'x')).toBeNull();
  });
});
