// Batch 450 (PS-151, PS-217): the GYN Cytology Secondary Screening QA record.
// Saving a QC rescreen (random or targeted high-risk) or a Secondary Reviewer
// look records it against the primary screen; nothing else does. A single
// discordance is audit trail only: the activity type has no CAPA trigger, so
// writing a discordant record recommends no CAPA.
import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
import { saveCytologyReview, type SaveCytologyReviewInput } from './saveCytologyReview';
import { EMPTY_DRAFT } from './cytologyReviewDraft';
import { makeWorkspaceDeps } from './cytologyWorkspaceTestDeps';
import type { CytologyReviewRecord, CytologyReviewRole } from '@/types/cytology/CytologyReviewRecord';
import { GYN_CYTOLOGY_SECONDARY_SCREENING_ACTIVITY_TYPE_ID, mockQaActivityTypeService } from '../quality/mockQaActivityTypeService';
import { mockQaActivityRecordService } from '../quality/mockQaActivityRecordService';
import { mockCapaRecommendationService } from '../quality/mockCapaRecommendationService';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

const categories = [
  { id: 'nilm', section: 'interpretation_result', usage: 'primary', diagnosticRank: 0, requiresPathologistReview: false, active: true },
  { id: 'lsil', section: 'interpretation_result', usage: 'primary', diagnosticRank: 2, requiresPathologistReview: false, active: true },
  { id: 'hsil', section: 'interpretation_result', usage: 'primary', diagnosticRank: 4, requiresPathologistReview: true, active: true },
] as never[];
const caseData = { id: 'C1', patient: { id: 'PT1' }, order: { facilityId: 'F1' }, specimens: [{ id: 'SP1', cytologyScreening: {} }] } as never;
const primary = {
  id: 'rv-p', caseId: 'C1', specimenId: 'SP1', role: 'primary_screen', primaryInterpretationId: 'nilm', requiresPathologistReview: false,
  recordedAt: '2026-09-29T10:00:00Z', recordedBy: { userId: 'CT1', userName: 'CT One' },
} as CytologyReviewRecord;

function input(resolvedRole: CytologyReviewRole, primaryInterpretationId: string, over: Partial<SaveCytologyReviewInput> = {}): SaveCytologyReviewInput {
  return {
    form: { kind: 'standard', draft: { ...EMPTY_DRAFT, primaryInterpretationId } },
    caseData, specimenId: 'SP1', specimen: { id: 'SP1', description: 'Pap', cytologyScreening: {} },
    user: { id: 'CT2', name: 'CT Two' }, isPathologist: false, reviewMode: 'primary_manual',
    editingReviewId: null, reviews: [primary], resolvedRole, categories, activeScreeningSeconds: 300,
    ...over,
  };
}

describe('GYN Cytology Secondary Screening QA record on save (PS-151, PS-217)', () => {
  it('a targeted high-risk QC rescreen records the activity against the primary screen, with what it added and missed', async () => {
    const { deps, qa } = makeWorkspaceDeps();
    expect((await saveCytologyReview(input('qc_targeted_high_risk', 'lsil'), deps)).outcome).toBe('saved');
    expect(qa).toEqual([expect.objectContaining({
      activityTypeId: GYN_CYTOLOGY_SECONDARY_SCREENING_ACTIVITY_TYPE_ID, caseId: 'C1', specimenId: 'SP1', caseType: 'Pap', outcome: 'discordant',
      fieldValues: expect.objectContaining({ trigger: 'qc_targeted_high_risk', addedByEvent: 'lsil', missedByEvent: 'nilm', agreementLevel: 'minor_discrepancy' }),
      recordedBy: { userId: 'CT2', userName: 'CT Two' },
    })]);
  });

  it('a Secondary Reviewer look records the activity too; agreeing with the primary screen is concordant with nothing added or missed', async () => {
    const { deps, qa } = makeWorkspaceDeps();
    await saveCytologyReview(input('secondary_reviewer', 'nilm'), deps);
    expect(qa).toEqual([expect.objectContaining({
      activityTypeId: GYN_CYTOLOGY_SECONDARY_SCREENING_ACTIVITY_TYPE_ID, outcome: 'concordant',
      fieldValues: expect.objectContaining({ trigger: 'secondary_reviewer', addedByEvent: '', missedByEvent: '', agreementLevel: 'exact' }),
    })]);
  });

  it('a primary screen, or a pathologist review, records no secondary-screening activity', async () => {
    const first = makeWorkspaceDeps();
    await saveCytologyReview(input('primary_screen', 'hsil', { reviews: [], user: { id: 'CT1', name: 'CT One' } }), first.deps);
    expect(first.qa).toEqual([]);
    const path = makeWorkspaceDeps();
    await saveCytologyReview(input('pathologist_review', 'hsil', { isPathologist: true, user: { id: 'P1', name: 'Dr P' } }), path.deps);
    expect(path.qa).toEqual([]);
  });

  it('a QC rescreen with no primary screen on file records nothing (nothing to compare with)', async () => {
    const { deps, qa } = makeWorkspaceDeps();
    await saveCytologyReview(input('qc_random_selection', 'hsil', { reviews: [] }), deps);
    expect(qa).toEqual([]);
  });
});

describe('a single secondary-screening discordance never raises or recommends a CAPA (PS-151, PS-217)', () => {
  it('the GYN Cytology Secondary Screening activity type has no capaTriggerRule', async () => {
    const res = await mockQaActivityTypeService.getAll();
    if (!res.ok) throw new Error('setup failed');
    const type = res.data.find(t => t.id === GYN_CYTOLOGY_SECONDARY_SCREENING_ACTIVITY_TYPE_ID);
    expect(type).toBeDefined();
    expect(type?.capaTriggerRule).toBeUndefined();
  });

  it('writing the discordant record a QC rescreen produces recommends no CAPA, even marked high severity', async () => {
    const { deps, qa } = makeWorkspaceDeps();
    await saveCytologyReview(input('qc_random_selection', 'hsil'), deps);
    expect(qa[0].outcome).toBe('discordant');
    const recommend = vi.spyOn(mockCapaRecommendationService, 'recommend');
    for (const severity of [undefined, 'high'] as const) {
      const created = await mockQaActivityRecordService.create({ ...qa[0], severity });
      expect(created.ok).toBe(true);
    }
    expect(recommend).not.toHaveBeenCalled();
    const recs = await mockCapaRecommendationService.getAll();
    expect(recs.ok && recs.data.filter(r => r.caseId === 'C1')).toEqual([]);
    recommend.mockRestore();
  });
});
