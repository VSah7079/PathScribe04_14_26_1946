// Batch 410 (PS-359): saving a cytology review, moved out of the Cytology
// Workspace page, with its new permission checked first.
import { describe, it, expect, vi } from 'vitest';
import { saveCytologyReview, type SaveCytologyReviewInput } from './saveCytologyReview';
import { EMPTY_DRAFT } from './cytologyReviewDraft';
import { EMPTY_CISOEA_DRAFT } from './cisoeADraft';
import { makeWorkspaceDeps } from './cytologyWorkspaceTestDeps';
import type { CytologyReviewRecord } from '@/types/cytology/CytologyReviewRecord';

const categories = [
  { id: 'nilm', section: 'interpretation_result', usage: 'primary', diagnosticRank: 0, requiresPathologistReview: false, active: true },
  { id: 'hsil', section: 'interpretation_result', usage: 'primary', diagnosticRank: 4, requiresPathologistReview: true, active: true },
] as never[];
const caseData = { id: 'C1', patient: { id: 'PT1' }, order: { facilityId: 'F1' }, specimens: [{ id: 'SP1', cytologyScreening: {} }] } as never;
const primary = { id: 'rv-p', caseId: 'C1', specimenId: 'SP1', role: 'primary_screen', primaryInterpretationId: 'nilm', requiresPathologistReview: false, recordedAt: '2026-09-29T10:00:00Z', recordedBy: { userId: 'CT1', userName: 'CT One' } } as CytologyReviewRecord;

function input(over: Partial<SaveCytologyReviewInput> = {}): SaveCytologyReviewInput {
  return {
    form: { kind: 'standard', draft: { ...EMPTY_DRAFT, primaryInterpretationId: 'nilm' } },
    caseData, specimenId: 'SP1', specimen: { id: 'SP1', description: 'Pap', cytologyScreening: {} },
    user: { id: 'CT1', name: 'CT One' }, isPathologist: false, reviewMode: 'primary_manual',
    editingReviewId: null, reviews: [], resolvedRole: 'primary_screen', categories, activeScreeningSeconds: 600,
    ...over,
  };
}
const overCap = { getWorkloadCaps: async () => ({ enterprise: { dailySlideCap: 100 }, facility: null, staff: null }) };

describe('saveCytologyReview', () => {
  it('needs cytology:review:record for the case, before anything is saved', async () => {
    const { deps } = makeWorkspaceDeps({ enforce: vi.fn(async () => ({ allowed: false })) });
    expect(await saveCytologyReview(input(), deps)).toEqual({ outcome: 'notPermitted' });
    expect(deps.enforce).toHaveBeenCalledWith('cytology:review:record', { caseId: 'C1' });
    expect(deps.createReview).not.toHaveBeenCalled();
  });

  it('a review with no primary interpretation isn\'t saved', async () => {
    const { deps } = makeWorkspaceDeps();
    expect((await saveCytologyReview(input({ form: { kind: 'standard', draft: EMPTY_DRAFT } }), deps)).outcome).toBe('incomplete');
    expect(deps.createReview).not.toHaveBeenCalled();
  });

  it('creates the initial review in the resolved role, works out pathologist review, and records the workload', async () => {
    const { deps, ledger } = makeWorkspaceDeps();
    const result = await saveCytologyReview(input({ form: { kind: 'standard', draft: { ...EMPTY_DRAFT, primaryInterpretationId: 'hsil' } } }), deps);
    expect(result).toMatchObject({ outcome: 'saved', created: true, reviewId: 'rv-new' });
    expect(deps.createReview).toHaveBeenCalledWith(expect.objectContaining({
      specimenId: 'SP1', caseId: 'C1', role: 'primary_screen', primaryInterpretationId: 'hsil', requiresPathologistReview: true, reviewMode: 'primary_manual',
    }));
    expect(ledger).toEqual([expect.objectContaining({ reviewRecordId: 'rv-new', scuWeight: 1, activeDurationSeconds: 600 })]);
  });

  it('a new negative initial review can be picked for random QC', async () => {
    const { deps, updates } = makeWorkspaceDeps({
      random: () => 0,
      getQcSettings: async () => ({ enterprise: { negativeRandomSelectionRatePercent: 10, nonNegativeRandomSelectionRatePercent: 0 }, facility: null, staff: null }),
    });
    expect((await saveCytologyReview(input(), deps)).qcFlagApplied).toBe('random_selection');
    expect(updates[0].patch.specimens[0].cytologyScreening.qcFlag).toMatchObject({ reason: 'random_selection', flaggedBy: 'system' });
  });

  it('a high-risk patient goes to targeted QC instead, and random selection isn\'t rolled', async () => {
    const random = vi.fn(() => 0);
    const { deps, updates } = makeWorkspaceDeps({ random, getQcSettings: async () => ({ enterprise: { negativeRandomSelectionRatePercent: 100 }, facility: null, staff: null }) });
    const specimen = { id: 'SP1', cytologyScreening: { hpvResult: 'Positive', hpvGenotypeDetail: { hpv16: true, hpv18Or45: false, otherHighRisk: false } } };
    expect((await saveCytologyReview(input({ specimen }), deps)).qcFlagApplied).toBe('targeted_high_risk');
    expect(updates).toHaveLength(1);
    expect(random).not.toHaveBeenCalled();
  });

  it('editing your own review updates it and never re-rolls QC', async () => {
    const random = vi.fn(() => 0);
    const { deps } = makeWorkspaceDeps({ random });
    const result = await saveCytologyReview(input({ editingReviewId: 'rv-p', reviews: [primary] }), deps);
    expect(result).toMatchObject({ outcome: 'saved', created: false, reviewId: 'rv-p' });
    expect(deps.updateReview).toHaveBeenCalledWith('rv-p', 'CT1', expect.objectContaining({ primaryInterpretationId: 'nilm' }));
    expect(deps.createReview).not.toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled();
  });

  it('Batch 574: an edit doesn\'t count the slide again (the time still counts); an escalation adds only its extra weight', async () => {
    const { deps, ledger } = makeWorkspaceDeps();
    await saveCytologyReview(input({ editingReviewId: 'rv-p', reviews: [{ ...primary, reviewMode: 'primary_manual' } as CytologyReviewRecord] }), deps);
    expect(ledger[ledger.length - 1]).toMatchObject({ reviewRecordId: 'rv-p', scuWeight: 0, activeDurationSeconds: 600 });
    await saveCytologyReview(input({ editingReviewId: 'rv-p', reviews: [{ ...primary, reviewMode: 'fov_assisted' } as CytologyReviewRecord], reviewMode: 'fov_manual_rescreen' }), deps);
    expect(ledger[ledger.length - 1]).toMatchObject({ scuWeight: 1 });
  });

  it('Batch 574: over the cap, an edit that adds nothing isn\'t refused', async () => {
    const { deps } = makeWorkspaceDeps({ ...overCap });
    const result = await saveCytologyReview(input({ activeScreeningSeconds: 36, editingReviewId: 'rv-p', reviews: [{ ...primary, reviewMode: 'primary_manual' } as CytologyReviewRecord] }), deps);
    expect(result.outcome).toBe('saved');
  });

  it('over the workload cap, a new review is refused and the reviewer\'s pending cases (this one too) go back to the pool', async () => {
    const pending = [{ id: 'C1', status: 'in-progress', order: { assignedTo: 'CT1' } }, { id: 'C2', status: 'in-progress', order: { assignedTo: 'CT1' } }] as never[];
    const { deps } = makeWorkspaceDeps({ ...overCap, listCasesForUser: async () => pending });
    const result = await saveCytologyReview(input({ activeScreeningSeconds: 36 }), deps);
    expect(result).toMatchObject({ outcome: 'workloadBlocked', workloadNotice: 'blocked', capacity: expect.objectContaining({ status: 'exceeded' }) });
    expect(deps.createReview).not.toHaveBeenCalled();
    expect(deps.returnToCytologyPool).toHaveBeenCalledTimes(2);
  });

  it('over the cap, escalating a saved review (FOV-assisted to full manual rescreen) is let through; the other cases still go back', async () => {
    const pending = [{ id: 'C1', status: 'in-progress', order: { assignedTo: 'CT1' } }, { id: 'C2', status: 'in-progress', order: { assignedTo: 'CT1' } }] as never[];
    const { deps } = makeWorkspaceDeps({ ...overCap, listCasesForUser: async () => pending });
    const saved = { ...primary, reviewMode: 'fov_assisted' } as CytologyReviewRecord;
    const result = await saveCytologyReview(input({ activeScreeningSeconds: 36, editingReviewId: 'rv-p', reviews: [saved], reviewMode: 'fov_manual_rescreen' }), deps);
    expect(result).toMatchObject({ outcome: 'saved', workloadNotice: 'escalation' });
    expect(deps.returnToCytologyPool).toHaveBeenCalledTimes(1);
    expect(deps.returnToCytologyPool).toHaveBeenCalledWith(expect.objectContaining({ id: 'C2' }));
  });

  it('Batch 440: a QC rescreen by the cytotech who did the primary screen is refused and saves nothing', async () => {
    for (const role of ['qc_random_selection', 'qc_targeted_high_risk'] as const) {
      const { deps, qa } = makeWorkspaceDeps();
      expect(await saveCytologyReview(input({ resolvedRole: role, reviews: [primary] }), deps)).toEqual({ outcome: 'qcByPrimaryScreener' });
      expect(deps.createReview).not.toHaveBeenCalled();
      expect(qa).toEqual([]);
    }
  });

  it('a QC rescreen records the secondary-screening QA activity against the initial review', async () => {
    const { deps, qa } = makeWorkspaceDeps();
    await saveCytologyReview(input({
      resolvedRole: 'qc_random_selection', reviews: [primary], user: { id: 'CT2', name: 'CT Two' },
      form: { kind: 'standard', draft: { ...EMPTY_DRAFT, primaryInterpretationId: 'hsil' } },
    }), deps);
    expect(qa).toEqual([expect.objectContaining({
      caseId: 'C1', specimenId: 'SP1', outcome: 'discordant', caseType: 'Pap',
      fieldValues: expect.objectContaining({ trigger: 'qc_random_selection', addedByEvent: 'hsil', missedByEvent: 'nilm' }),
    })]);
  });

  it('an incomplete CISOE-A score returns its errors and saves nothing', async () => {
    const { deps } = makeWorkspaceDeps();
    const result = await saveCytologyReview(input({ form: { kind: 'cisoeA', draft: EMPTY_CISOEA_DRAFT, bethesdaForMapping: [] } }), deps);
    expect(result.outcome).toBe('invalid');
    expect(result.validation?.errors.length).toBeGreaterThan(0);
    expect(deps.createReview).not.toHaveBeenCalled();
  });

  it('a later review stores its agreement with the initial screen; an edit keeps the earlier assessment', async () => {
    const { deps } = makeWorkspaceDeps();
    const created = await saveCytologyReview(input({
      user: { id: 'P1', name: 'Dr P' }, isPathologist: true, resolvedRole: 'pathologist_review', reviews: [primary],
      form: { kind: 'standard', draft: { ...EMPTY_DRAFT, primaryInterpretationId: 'hsil' } },
    }), deps);
    expect(created.agreement).toMatchObject({ level: 'major_discrepancy', majorSubtype: 'false_negative', comparedWithReviewId: 'rv-p', assessedBy: { userId: 'P1' } });
    expect(deps.createReview).toHaveBeenCalledWith(expect.objectContaining({ agreementWithInitial: created.agreement }));

    const saved = { ...primary, id: 'rv-path', role: 'pathologist_review', primaryInterpretationId: 'hsil', recordedBy: { userId: 'P1', userName: 'Dr P' }, agreementWithInitial: created.agreement } as CytologyReviewRecord;
    await saveCytologyReview(input({
      user: { id: 'P1', name: 'Dr P' }, isPathologist: true, resolvedRole: 'pathologist_review', reviews: [primary, saved], editingReviewId: 'rv-path',
    }), deps);
    expect(deps.updateReview).toHaveBeenCalledWith('rv-path', 'P1', expect.objectContaining({
      agreementWithInitial: expect.objectContaining({ level: 'exact' }), priorAgreements: [created.agreement],
    }));
  });

  it('the initial screen itself stores no agreement', async () => {
    const { deps } = makeWorkspaceDeps();
    expect((await saveCytologyReview(input(), deps)).agreement).toBeUndefined();
    expect((deps.createReview as any).mock.calls[0][0].agreementWithInitial).toBeUndefined();
  });

  it('the secondary-screening QA record carries the graded level', async () => {
    const { deps, qa } = makeWorkspaceDeps();
    await saveCytologyReview(input({ resolvedRole: 'qc_random_selection', reviews: [primary], user: { id: 'CT2', name: 'CT Two' }, form: { kind: 'standard', draft: { ...EMPTY_DRAFT, primaryInterpretationId: 'hsil' } } }), deps);
    expect(qa[0].fieldValues).toMatchObject({ agreementLevel: 'major_discrepancy', majorSubtype: 'false_negative' });
  });

  it('Batch 412: an edit keeps the review as it stood', async () => {
    const { deps } = makeWorkspaceDeps();
    const saved = { ...primary, notes: 'first', updatedAt: '2026-09-29T12:00:00Z' } as CytologyReviewRecord;
    await saveCytologyReview(input({ editingReviewId: 'rv-p', reviews: [saved] }), deps);
    expect(deps.updateReview).toHaveBeenCalledWith('rv-p', 'CT1', expect.objectContaining({
      priorVersions: [expect.objectContaining({ savedAt: '2026-09-29T12:00:00Z', primaryInterpretationId: 'nilm', notes: 'first' })],
    }));
  });

  it('Batch 412: the author\'s save closes acknowledged notes, in the same write as nothing else', async () => {
    const { deps, updates } = makeWorkspaceDeps();
    const specimen = { id: 'SP1', cytologyScreening: { reviewNotes: [{ id: 'rn-1', reviewId: 'rv-p', reviewAuthorId: 'CT1', requiresRevision: true, status: 'acknowledged' }] } };
    // PS-71 (Batch 458): the notes are worked out from the specimen as saved, so the case holds it.
    await saveCytologyReview(input({ editingReviewId: 'rv-p', reviews: [primary], specimen, caseData: { ...(caseData as any), specimens: [specimen] } as never }), deps);
    expect(updates).toHaveLength(1);
    expect(updates[0].patch.specimens[0].cytologyScreening.reviewNotes[0].status).toBe('revised');
  });

  it('Batch 415: with the CLIA workload cap off, nothing is blocked or reassigned (workload is still recorded)', async () => {
    const pending = [{ id: 'C2', status: 'in-progress', order: { assignedTo: 'CT1' } }] as never[];
    const { deps, ledger } = makeWorkspaceDeps({ ...overCap, listCasesForUser: async () => pending, getComplianceSettings: async () => ({ enterprise: { workloadCap: 'off' }, facility: null }) });
    const result = await saveCytologyReview(input({ activeScreeningSeconds: 36 }), deps);
    expect(result).toMatchObject({ outcome: 'saved', capacity: null });
    expect(deps.returnToCytologyPool).not.toHaveBeenCalled();
    expect(ledger).toHaveLength(1);
  });
});


// Batch 450 (PS-188): the workload check at save time uses all three cap tiers
// (Enterprise, the case's performing facility, the reviewer).
describe('saveCytologyReview — workload cap tiers at save time', () => {
  // Batch 576: caps are 1–100 (CLIA), so the tiers are shown with a lower Enterprise default where needed.
  // 360 s of screening = 0.1 h: a cap of 100 allows 1.25 SCU (a 1-SCU review fits), 40 allows 0.5 (blocked).
  const caps = (facility: number | null, staff: number | null, enterprise = 100) => vi.fn(async () => ({
    enterprise: { dailySlideCap: enterprise },
    facility: facility === null ? null : { id: 'fc', facilityId: 'F1', overrides: { dailySlideCap: facility }, createdAt: '', updatedAt: '' },
    staff: staff === null ? null : { id: 'sc', staffUserId: 'CT1', overrides: { dailySlideCap: staff }, createdAt: '', updatedAt: '' },
  }));

  it('asks for the caps of the case\'s performing facility and the reviewer', async () => {
    const getWorkloadCaps = caps(null, null);
    const { deps } = makeWorkspaceDeps({ getWorkloadCaps });
    await saveCytologyReview(input({ activeScreeningSeconds: 36 }), deps);
    expect(getWorkloadCaps).toHaveBeenCalledWith('F1', 'CT1');
  });

  it('a facility cap above the Enterprise default lets through a review the Enterprise cap alone would block', async () => {
    const { deps, ledger } = makeWorkspaceDeps({ getWorkloadCaps: caps(100, null, 40) });
    const result = await saveCytologyReview(input({ activeScreeningSeconds: 360 }), deps);
    expect(result).toMatchObject({ outcome: 'saved', capacity: expect.objectContaining({ maxAllowedScu: 1.25, status: 'ok' }) });
    expect(deps.returnToCytologyPool).not.toHaveBeenCalled();
    expect(ledger).toHaveLength(1);
  });

  it('a facility cap below the Enterprise default blocks a review the Enterprise cap would allow', async () => {
    // 360 s = 0.1 h: Enterprise 100 allows 1.25 SCU; facility 50 allows 0.625.
    const { deps } = makeWorkspaceDeps({ getWorkloadCaps: caps(50, null) });
    const result = await saveCytologyReview(input({ activeScreeningSeconds: 360 }), deps);
    expect(result).toMatchObject({ outcome: 'workloadBlocked', capacity: expect.objectContaining({ maxAllowedScu: 0.625, status: 'exceeded' }) });
    expect(deps.createReview).not.toHaveBeenCalled();
  });

  it('the reviewer\'s own cap beats the facility cap', async () => {
    const { deps } = makeWorkspaceDeps({ getWorkloadCaps: caps(100, 50, 40) });
    const result = await saveCytologyReview(input({ activeScreeningSeconds: 360 }), deps);
    expect(result).toMatchObject({ outcome: 'workloadBlocked', capacity: expect.objectContaining({ maxAllowedScu: 0.625 }) });
    expect(deps.createReview).not.toHaveBeenCalled();
  });
});
