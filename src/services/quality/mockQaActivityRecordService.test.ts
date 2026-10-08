import { describe, it, expect, beforeEach, vi } from 'vitest';
// Batch 428: these tests are about the service, not who may use it, so Configuration
// changes are allowed here (the check itself: authorization/guardConfigWrites.test.ts).
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
import { mockQaActivityRecordService } from './mockQaActivityRecordService';
import { mockQaActivityTypeService } from './mockQaActivityTypeService';
import { mockSpecimenDeficiencyService } from '../deficiencies/mockSpecimenDeficiencyService';
import { mockCapaRecommendationService } from './mockCapaRecommendationService';

// Real, minimal localStorage mock - same established pattern every
// other storage-backed service test in this app uses.
beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

describe('mockQaActivityRecordService', () => {

  // Real, per direct guidance's own Stage 3 decision: the seed data is
  // now the full, faithful migration of mockReconciliationService.ts's
  // own real 175-record seed (7 discordant + 130 concordant + 38
  // teaching-case), plus the one real Cytology-Histology illustrative
  // record kept from Stage 2 - 176 total. Verified against the exact,
  // real counts confirmed directly in mockReconciliationService.ts's
  // own source, not assumed.
  it('seeds the real, full migration (176 records: 175 from Reconciliation + 1 Cytology-Histology)', async () => {
    const res = await mockQaActivityRecordService.getAll();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.length).toBe(176);
  });

  it('migrated 10 real discordant, 165 real concordant records under Frozen vs Final (175 total, matching the real Reconciliation seed exactly)', async () => {
    const res = await mockQaActivityRecordService.getAll();
    if (!res.ok) return;
    const frozenFinal = res.data.filter(r => r.activityTypeId === 'qa-activity-frozen-final');
    // 7 original discordant seed + 3 real teaching-case discordant
    // entries (1 in the breast branch, i === 21 → teach-breast-22; 2
    // in the GI branch, i === 13/14 → teach-gi-14/teach-gi-15).
    expect(frozenFinal.filter(r => r.outcome === 'discordant').length).toBe(10);
    // 130 original concordant seed + 35 real teaching-case concordant
    // entries (21 of 22 breast + 14 of 16 GI).
    expect(frozenFinal.filter(r => r.outcome === 'concordant').length).toBe(165);
    expect(frozenFinal.filter(r => r.isTeachingOnboardingCase === true).length).toBe(38);
    expect(frozenFinal.length).toBe(175);
  });

  it('a real, known discordant record (disc-001) preserves its exact id and discrepancy detail through the migration', async () => {
    const res = await mockQaActivityRecordService.getAll();
    if (!res.ok) return;
    const disc001 = res.data.find(r => r.id === 'disc-001');
    expect(disc001).toBeDefined();
    expect(disc001?.delta).toBe('upgrade');
    expect(disc001?.severity).toBe('high');
    expect(disc001?.rootCause).toBe('sampling_error');
    // Real, honest fact about the actual seed data, confirmed directly:
    // the original disc-001..disc-007 entries predate the modal's own
    // mandatory-comment requirement and never had a comments field at
    // all - the migration faithfully preserves that real absence,
    // rather than fabricating one.
    expect(disc001?.comments).toBeUndefined();
  });

  it('a real teaching-case discordant record DOES carry a real comments narrative, faithfully preserved', async () => {
    const res = await mockQaActivityRecordService.getAll();
    if (!res.ok) return;
    // Real, known id from the actual teaching seed's own GI branch
    // (i === 13, the first of the two real invasive-adenocarcinoma
    // discordant entries).
    const teachGi14 = res.data.find(r => r.id === 'teach-gi-14');
    expect(teachGi14).toBeDefined();
    expect(teachGi14?.outcome).toBe('discordant');
    expect(teachGi14?.comments).toContain('Invasive component identified only on permanent deeper levels');
    expect(teachGi14?.isTeachingOnboardingCase).toBe(true);
    expect(teachGi14?.reviewerFeedback).toContain('classic teaching point');
    expect(teachGi14?.draftedBy?.userName).toBe('Oliver Pemberton');
  });

  it('the activity-specific comparison data lives in fieldValues, not as fixed properties', async () => {
    const res = await mockQaActivityRecordService.getAll();
    if (!res.ok) return;
    const record = res.data.find(r => r.id === 'disc-001');
    expect(record?.fieldValues.frozenCategory).toBe('atypical_suspicious');
    expect(record?.fieldValues.finalDx).toBe('DCIS, low grade');
    expect((record as any).frozenCategory).toBeUndefined();
    expect((record as any).finalDx).toBeUndefined();
  });

  it('proves genuine cross-activity-type use — a real record exists under the second, Cytology-Histology type', async () => {
    const res = await mockQaActivityRecordService.getAll();
    if (!res.ok) return;
    const cytoHisto = res.data.find(r => r.activityTypeId === 'qa-activity-cyto-histo');
    expect(cytoHisto).toBeDefined();
    expect(cytoHisto?.fieldValues.cytologyDx).toBeDefined();
  });

  it('create() generates a real id and recordedAt, prepending to the list', async () => {
    const before = await mockQaActivityRecordService.getAll();
    if (!before.ok) return;

    const res = await mockQaActivityRecordService.create({
      activityTypeId: 'qa-activity-frozen-final', caseId: 'CASE-NEW', caseType: 'Skin Shave',
      fieldValues: { frozenCategory: 'benign', finalCategory: 'benign', frozenDx: 'Nevus', finalDx: 'Nevus' },
      outcome: 'concordant', recordedBy: { userId: 'user-1', userName: 'Dr. Test' },
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.id).toBeTruthy();
    expect(res.data.recordedAt).toBeTruthy();

    const after = await mockQaActivityRecordService.getAll();
    if (!after.ok) return;
    expect(after.data.length).toBe(before.data.length + 1);
    expect(after.data[0].id).toBe(res.data.id);
  });

  // Batch 438 (PS-144–148, Pete Oct 2): the PS-134 capaTriggerRule
  // consumption RECOMMENDS a CAPA now; it never opens one. These replace the
  // auto-raise tests and are the regression Pete asked for: a qualifying
  // record leaves the deficiency list untouched and puts one pending
  // recommendation in the QA lead's queue.
  describe('capaTriggerRule recommends a CAPA, never opens one (Batch 438)', () => {
    let testActivityTypeId: string;
    beforeEach(async () => {
      const res = await mockQaActivityTypeService.add({
        name: 'Test-Only CAPA Trigger Fixture',
        tabScope: 'custom',
        fields: [{ id: 'note', label: 'Note', type: 'text', required: false, options: [] }],
        teachingOnboardingEnabled: false,
        active: true,
        createdBy: 'test-fixture',
        capaTriggerRule: { triggerSeverities: ['high'], deficiencyTypeId: 'def-confirmed-high-risk-finding' },
      });
      if (!res.ok) throw new Error('Test fixture setup failed');
      testActivityTypeId = res.data.id;
    });

    const create = (over: Record<string, unknown> = {}) => mockQaActivityRecordService.create({
      activityTypeId: testActivityTypeId, caseId: 'CASE-CAPA-TEST', caseType: 'Breast Core Bx',
      fieldValues: { note: 'x' }, outcome: 'discordant', severity: 'high',
      recordedBy: { userId: 'PATH-001', userName: 'Dr. Test' }, ...over,
    } as Parameters<typeof mockQaActivityRecordService.create>[0]);
    const recsFor = async (caseId: string) => {
      const r = await mockCapaRecommendationService.getAll();
      return r.ok ? r.data.filter(x => x.caseId === caseId) : [];
    };

    it('a discordant, high-severity record recommends a CAPA and opens no deficiency', async () => {
      const raise = vi.spyOn(mockSpecimenDeficiencyService, 'raise');
      const before = await mockSpecimenDeficiencyService.getAll();
      await create();
      const after = await mockSpecimenDeficiencyService.getAll();
      expect(raise).not.toHaveBeenCalled();
      expect(after.ok && before.ok && after.data.length).toBe(before.ok ? before.data.length : -1);
      const recs = await recsFor('CASE-CAPA-TEST');
      expect(recs).toHaveLength(1);
      expect(recs[0]).toMatchObject({ status: 'pending', source: 'qa-discordance', deficiencyTypeId: 'def-confirmed-high-risk-finding', createdBy: 'PATH-001' });
      raise.mockRestore();
    });

    it('PS-119: the review\'s root cause rides on the recommendation (and so onto the CAPA when confirmed)', async () => {
      await create({ caseId: 'CASE-CAPA-RC', rootCause: 'sampling_error' });
      const [rec] = await recsFor('CASE-CAPA-RC');
      expect(rec.rootCause).toBeTruthy();
    });

    it('the same problem again is linked to the pending recommendation, not a second one', async () => {
      await create({ caseId: 'CASE-CAPA-DUP' });
      await create({ caseId: 'CASE-CAPA-DUP' });
      const recs = await recsFor('CASE-CAPA-DUP');
      expect(recs).toHaveLength(1);
      expect(recs[0].linkedEvents).toHaveLength(1);
    });

    it('a different specimen is a different problem', async () => {
      await create({ caseId: 'CASE-CAPA-SP', specimenId: 'SP-1' });
      await create({ caseId: 'CASE-CAPA-SP', specimenId: 'SP-2' });
      expect(await recsFor('CASE-CAPA-SP')).toHaveLength(2);
    });

    it('concordant, a non-matching severity, or a disagreement resolved by consensus: nothing', async () => {
      await create({ caseId: 'CASE-CAPA-NONE', outcome: 'concordant', severity: undefined });
      await create({ caseId: 'CASE-CAPA-NONE', severity: 'low' });
      await create({ caseId: 'CASE-CAPA-NONE', consensus: 'consensus-reached' });
      expect(await recsFor('CASE-CAPA-NONE')).toHaveLength(0);
    });

    it('a disagreement with no consensus always recommends (PS-144)', async () => {
      await create({ caseId: 'CASE-CAPA-UNRES', severity: 'low', consensus: 'unresolved' });
      const [rec] = await recsFor('CASE-CAPA-UNRES');
      expect(rec.source).toBe('unresolved-disagreement');
    });

    it('an activity type with no capaTriggerRule never recommends', async () => {
      await mockQaActivityRecordService.create({
        activityTypeId: 'qa-activity-frozen-final',
        caseId: 'CASE-CAPA-NORULE', caseType: 'Skin Shave',
        fieldValues: { frozenCategory: 'malignant', finalCategory: 'benign', frozenDx: 'x', finalDx: 'y' },
        outcome: 'discordant', severity: 'high',
        recordedBy: { userId: 'PATH-001', userName: 'Dr. Test' },
      });
      expect(await recsFor('CASE-CAPA-NORULE')).toHaveLength(0);
    });

    it('the surgical post-sign-out peer review is PS-148\'s moment', async () => {
      await mockQaActivityRecordService.create({
        activityTypeId: 'qa-activity-surgical-peer-review',
        caseId: 'CASE-CAPA-POST', caseType: 'Colon', fieldValues: {},
        outcome: 'discordant', severity: 'high',
        recordedBy: { userId: 'PATH-002', userName: 'Dr. Second' },
      });
      const [rec] = await recsFor('CASE-CAPA-POST');
      expect(rec).toMatchObject({ source: 'post-signout-discordance', deficiencyTypeId: 'def-peer-review-discordance' });
    });
  });
});
