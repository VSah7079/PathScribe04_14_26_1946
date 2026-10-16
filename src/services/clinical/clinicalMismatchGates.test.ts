// @vitest-environment happy-dom
// Batch 530 (PS-554): Gate A (the background check), Gate B (sign-out) and the QA queues.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/aiIntegration/aiProviderService', () => ({ callAi: vi.fn() }));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));

import { callAi } from '@/services/aiIntegration/aiProviderService';
import { clinicalMismatchService, clinicalMismatchSignOutStep } from './clinicalMismatchService';
import { evaluateClinicalMismatch, DEFAULT_CLINICAL_MISMATCH_RULES } from './clinicalMismatchRules';
import { mismatchInputFingerprint, mismatchRecheck, mismatchWorseThanBefore, latestMismatchRecord } from './clinicalMismatchInputs';
import { cytologyWorkspaceMismatchInput } from '../cytology/cytologyClinicalMismatch';
import { mismatchesAwaitingSecondaryReview, reportPageMismatchInput, deferredMismatchDetails, caseSpecimenTypeIds, mismatchCheckDeferred, caseHasClinicalInformation, caseSpecimenTypeNames } from './clinicalMismatchInputs';
import { mockAuditService } from '../auditlog/mockAuditService';
import { mockQaActivityRecordService } from '../quality/mockQaActivityRecordService';
import { CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID } from '../quality/capaRecommendationRules';
import { activityTypeSources } from '../quality/qaActivityBoard';
import { withSeedFieldsAdded } from '../quality/mockQaActivityTypeService';
import { loadReviewQueueCounts } from '../quality/reviewQueueCounts';
import type { Case } from '@/types/case/Case';

const input = { clinicalIndication: 'Routine screening colonoscopy, polyp', clinicalHistory: '', microscopic: 'Invasive adenocarcinoma', diagnosis: 'Adenocarcinoma', malignantNow: true, discipline: 'surgical' as const };
const ai = (confidence: number, kind = 'unexpected-malignancy') =>
  vi.mocked(callAi).mockResolvedValue({ text: JSON.stringify({ mismatch: true, kind, explanation: 'x', confidence }), provider: 'p', model: 'm' } as never);
const meta = { caseType: 'Colon', discipline: 'surgical' as const };
const correlation = async () => {
  const r = await mockQaActivityRecordService.getAll();
  return (r.ok ? r.data : []).filter(x => x.activityTypeId === CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID);
};

describe('Gate B: what sign-out does (pure)', () => {
  const at = (confidence: number, kind: 'unexpected-malignancy' | 'other' = 'unexpected-malignancy') => {
    const suggestion = { kind, confidence, source: 'ai' as const };
    return { suggestion, outcome: evaluateClinicalMismatch(suggestion, [], DEFAULT_CLINICAL_MISMATCH_RULES) };
  };
  it('nothing or suppressed → continue; low risk → logged, not held; high risk → decide', () => {
    expect(clinicalMismatchSignOutStep(null)).toBe('continue');
    expect(clinicalMismatchSignOutStep(at(55))).toBe('continue');
    expect(clinicalMismatchSignOutStep(at(65))).toBe('log');
    expect(clinicalMismatchSignOutStep(at(95, 'other'))).toBe('log');
    expect(clinicalMismatchSignOutStep(at(70))).toBe('decide');
  });
});

describe('Gate B: atSignOut against the real rules and QA records', () => {
  beforeEach(() => { localStorage.clear(); vi.mocked(callAi).mockReset(); clinicalMismatchService.forgetAnswers(); });

  it('high risk comes back to be decided; nothing is logged', async () => {
    ai(82);
    const a = await clinicalMismatchService.atSignOut(input, { caseId: 'c-high' }, [], meta);
    expect(a?.outcome).toMatchObject({ risk: 'high', holdsSignOut: true });
    expect(await correlation()).toHaveLength(0);
  });
  it('low risk is logged to the QA dashboard and sign-out goes on; it is not asked again', async () => {
    ai(64);
    expect(await clinicalMismatchService.atSignOut(input, { caseId: 'c-low' }, [], meta)).toBeNull();
    const recs = await correlation();
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({ caseId: 'c-low', fieldValues: { resolutionStatus: 'LOGGED', risk: 'low', ruleId: 'all:unexpected-malignancy' } });
    expect(await clinicalMismatchService.assess(input, { caseId: 'c-low' })).toBeNull();
  });
  it('suppressed below the display threshold: nothing logged', async () => {
    ai(50);
    expect(await clinicalMismatchService.atSignOut(input, { caseId: 'c-none' }, [], meta)).toBeNull();
    expect(await correlation()).toHaveLength(0);
  });
  it('the same report is not sent to the AI twice (Gate A, then Gate B)', async () => {
    ai(82);
    await clinicalMismatchService.assess(input, { caseId: 'c-once' });
    await clinicalMismatchService.atSignOut(input, { caseId: 'c-once' }, [], meta);
    expect(callAi).toHaveBeenCalledTimes(1);
    await clinicalMismatchService.assess({ ...input, diagnosis: 'Adenocarcinoma, moderately differentiated' }, { caseId: 'c-once' });
    expect(callAi).toHaveBeenCalledTimes(2);
  });
  it('a decision recorded at report review (Gate A) means sign-out does not ask', async () => {
    ai(82);
    await clinicalMismatchService.record({ caseId: 'c-dec', caseType: 'Colon', kind: 'unexpected-malignancy', source: 'ai', confidence: 82, risk: 'high', resolution: 'RESOLVED', quickReason: 'clinical-context-reviewed' });
    expect(await clinicalMismatchService.atSignOut(input, { caseId: 'c-dec' }, [], meta)).toBeNull();
  });
});

describe('the secondary review queue', () => {
  beforeEach(() => { localStorage.clear(); });
  it('deferred low-risk mismatches wait until a secondary review records RESOLVED or UNRESOLVED', async () => {
    await clinicalMismatchService.record({ caseId: 'c-def', caseType: 'Skin', kind: 'other', source: 'ai', confidence: 62, risk: 'low', resolution: 'DEFERRED' });
    const queue = await clinicalMismatchService.secondaryReviewQueue();
    expect(queue).toHaveLength(1);
    const d = deferredMismatchDetails(queue[0]);
    expect(d).toMatchObject({ caseId: 'c-def', kind: 'other', confidence: 62, source: 'ai' });
    const review = await clinicalMismatchService.record({ ...d, resolution: 'UNRESOLVED', reviewOf: d.recordId });
    expect(review.ok && review.data).toMatchObject({ postSignOut: true, consensus: 'unresolved', fieldValues: { reviewOf: d.recordId } });
    expect(await clinicalMismatchService.secondaryReviewQueue()).toHaveLength(0);
  });
  it('pure: oldest first, reviewed ones gone', () => {
    const rec = (id: string, status: string, at: string, reviewOf?: string) => ({ id, activityTypeId: CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID, recordedAt: at, fieldValues: { resolutionStatus: status, ...(reviewOf ? { reviewOf } : {}) } });
    expect(mismatchesAwaitingSecondaryReview([rec('b', 'DEFERRED', '2026-10-02'), rec('a', 'DEFERRED', '2026-10-01'), rec('c', 'DEFERRED', '2026-10-03'), rec('r', 'RESOLVED', '2026-10-04', 'c'), rec('l', 'LOGGED', '2026-10-01')]).map(r => r.id))
      .toEqual(['a', 'b']);
  });
  it('the QA board shows the queue as pending on the Clinical-Pathologic Correlation tile; the Worklist tile counts it too', async () => {
    const type = { id: CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID, name: 'Clinical-Pathologic Correlation', active: true, tabScope: 'standard', fields: [] } as never;
    const records = [{ id: 'x', activityTypeId: CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID, caseId: 'c', caseType: 'S', recordedAt: '2026-10-01', outcome: 'discordant', fieldValues: { resolutionStatus: 'DEFERRED' } }] as never;
    expect(activityTypeSources([type], records)[0].pending).toBe(1);
    const counts = await loadReviewQueueCounts({ cytologyQcQueueSize: async () => 0, listCases: async () => [], mismatchQueueSize: async () => 3 }, { cytologyQc: false, surgicalQa: true });
    expect(counts.surgicalQa).toBe(3);
  });
  it('a stored Clinical-Pathologic Correlation type gains the new fields and options without losing its own', () => {
    const stored = [{ id: 't', fields: [{ id: 'mismatchKind', options: [{ id: 'other', label: 'Mine' }] }] }] as never;
    const seed = [{ id: 't', fields: [{ id: 'mismatchKind', options: [{ id: 'other', label: 'Other' }, { id: 'cause-of-death', label: 'COD' }] }, { id: 'resolutionStatus', options: [] }] }] as never;
    const [out] = withSeedFieldsAdded(stored, seed) as unknown as { fields: { id: string; options: { id: string; label: string }[] }[] }[];
    expect(out.fields.map(f => f.id)).toEqual(['mismatchKind', 'resolutionStatus']);
    expect(out.fields[0].options).toEqual([{ id: 'other', label: 'Mine' }, { id: 'cause-of-death', label: 'COD' }]);
  });
});

describe('Gate A: what the report page checks', () => {
  const base = { id: 'c1', status: 'pending-review', specimens: [{ specimenDictionaryEntryId: 'colon-bx' }, {}], order: { clinicalIndication: 'Polyp' }, diagnostic: { primaryDiagnosis: 'Adenocarcinoma' } } as unknown as Case;
  it('a surgical case with a diagnosis, not yet signed out', () => {
    expect(reportPageMismatchInput(base)?.discipline).toBe('surgical');
    expect(reportPageMismatchInput({ ...base, diagnostic: {} } as Case)).toBeNull();
    expect(reportPageMismatchInput({ ...base, status: 'finalized' } as Case)).toBeNull();
    expect(caseSpecimenTypeIds(base)).toEqual(['colon-bx']);
  });
  it('an autopsy only between the PAD and the FAD', () => {
    const autopsy = (a: object) => ({ ...base, autopsy: a }) as unknown as Case;
    expect(reportPageMismatchInput(autopsy({}))).toBeNull();
    expect(reportPageMismatchInput(autopsy({ padSnapshot: {} }))?.discipline).toBe('autopsy');
    expect(reportPageMismatchInput(autopsy({ padSnapshot: {}, fadSnapshot: {} }))).toBeNull();
  });
});

describe('no clinical information: the check is deferred, never blocks (Batch 530, Pete)', () => {
  beforeEach(() => { localStorage.clear(); vi.mocked(callAi).mockReset(); clinicalMismatchService.forgetAnswers(); });
  it('pure: no indication, history or frozen impression → deferred', () => {
    expect(mismatchCheckDeferred({ clinicalIndication: ' ', clinicalHistory: '' })).toBe(true);
    expect(mismatchCheckDeferred({ clinicalIndication: '', clinicalHistory: '', frozenImpression: 'Benign' })).toBe(false);
    expect(caseHasClinicalInformation({ order: { clinicalIndication: 'Polyp' } } as never)).toBe(true);
    expect(caseHasClinicalInformation({ order: {} } as never)).toBe(false);
    expect(caseSpecimenTypeNames({ specimens: [{ specimenDictionaryEntryId: 'e1' }, { specimenDictionaryEntryId: 'e2' }] } as never, [{ id: 'e1', type: 'Colon' }, { id: 'e2', type: 'Colon' }])).toEqual(['Colon']);
  });
  it('sign-out goes on without asking the AI, and the audit log says the check was deferred', async () => {
    const spy = vi.spyOn(mockAuditService, 'logEvent');
    const res = await clinicalMismatchService.atSignOut({ ...input, clinicalIndication: '', clinicalHistory: '' }, { caseId: 'c-nohist' }, [], meta);
    expect(res).toBeNull();
    expect(callAi).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ event: 'CLINICAL_MISMATCH_CHECK_DEFERRED', caseId: 'c-nohist', detail: 'Mismatch check deferred: no clinical history provided.' }));
    expect(await correlation()).toHaveLength(0);
    spy.mockRestore();
  });
});

describe('Batch 531 (Pete): the check runs again when the diagnosis changes', () => {
  beforeEach(() => { localStorage.clear(); vi.mocked(callAi).mockReset(); clinicalMismatchService.forgetAnswers(); });
  const decide = async (a: NonNullable<Awaited<ReturnType<typeof clinicalMismatchService.assess>>>, caseId: string, resolution: 'RESOLVED' | 'DEFERRED') =>
    clinicalMismatchService.record({ caseId, caseType: 'Colon', kind: a.suggestion.kind, source: 'ai', confidence: a.suggestion.confidence,
      risk: a.outcome.holdsSignOut ? 'high' : 'low', resolution, inputFingerprint: a.fingerprint });

  it('pure: the fingerprint ignores spacing; same text → decided; changed text or an old record without one → re-check', () => {
    const f = mismatchInputFingerprint(input);
    expect(mismatchInputFingerprint({ ...input, diagnosis: '  Adenocarcinoma ' })).toBe(f);
    expect(mismatchInputFingerprint({ ...input, diagnosis: 'Adenoma' })).not.toBe(f);
    const rec = (fv: Record<string, string>) => ({ caseId: 'c', activityTypeId: CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID, recordedAt: 'x', fieldValues: fv });
    expect(mismatchRecheck(null, f)).toBe('recheck');
    expect(mismatchRecheck(rec({ inputFingerprint: f }), f)).toBe('decided');
    expect(mismatchRecheck(rec({}), f)).toBe('recheck');
    expect(mismatchWorseThanBefore(rec({ mismatchKind: 'other', risk: 'low' }), { kind: 'other', risk: 'low' })).toBe(false);
    expect(mismatchWorseThanBefore(rec({ mismatchKind: 'other', risk: 'low' }), { kind: 'unexpected-malignancy', risk: 'low' })).toBe(true);
    expect(mismatchWorseThanBefore(rec({ mismatchKind: 'unexpected-malignancy', risk: 'low' }), { kind: 'unexpected-malignancy', risk: 'high' })).toBe(true);
    expect(mismatchWorseThanBefore(rec({ mismatchKind: 'other' }), { kind: 'unexpected-malignancy', risk: 'suppressed' })).toBe(false);
    const older = { ...rec({}), recordedAt: '2026-10-01' }; const newer = { ...rec({}), recordedAt: '2026-10-02' };
    expect(latestMismatchRecord([newer, older], 'c')).toBe(newer);
  });
  it('decided on the same text: not asked again; a minor edit with the same result: not asked again', async () => {
    ai(64);
    const a = (await clinicalMismatchService.assess(input, { caseId: 'c-r1' }))!;
    await decide(a, 'c-r1', 'RESOLVED');
    expect(await clinicalMismatchService.assess(input, { caseId: 'c-r1' })).toBeNull();
    expect(await clinicalMismatchService.assess({ ...input, microscopic: 'Invasive adenocarcinoma.' }, { caseId: 'c-r1' })).toBeNull();
  });
  it('the polyp that becomes a carcinoma: resolved as low risk, then the changed diagnosis reaches a Block rule → asked again, showing the earlier decision', async () => {
    ai(64);
    const first = (await clinicalMismatchService.assess({ ...input, diagnosis: 'Tubular adenoma with high-grade dysplasia' }, { caseId: 'c-r2' }))!;
    expect(first.outcome.holdsSignOut).toBe(false);
    await decide(first, 'c-r2', 'RESOLVED');
    ai(88);
    const again = await clinicalMismatchService.assess({ ...input, diagnosis: 'Invasive adenocarcinoma' }, { caseId: 'c-r2' });
    expect(again?.outcome.holdsSignOut).toBe(true);
    expect(again?.previous).toMatchObject({ resolution: 'RESOLVED', kind: 'unexpected-malignancy' });
    expect(await clinicalMismatchService.atSignOut({ ...input, diagnosis: 'Invasive adenocarcinoma' }, { caseId: 'c-r2' }, [], meta)).not.toBeNull();
  });
});

describe('Batch 531 (Pete): the Cytology Workspace checks like surgical and autopsy', () => {
  const base = { caseData: { id: 'c1', order: { clinicalIndication: 'Thyroid nodule, benign appearing' } } as never, specimenId: 'sp-1', categories: [{ id: 'mal', label: 'Malignant', diagnosticRank: 5 }] as never,
    gynScreening: false, finalReview: { primaryInterpretationId: 'mal' } };
  it('pathologist track, with a final diagnosis, before sign-out', () => {
    expect(cytologyWorkspaceMismatchInput({ ...base, isPathologist: true, signedOut: false })).toMatchObject({ discipline: 'cytology', malignantNow: true });
    expect(cytologyWorkspaceMismatchInput({ ...base, isPathologist: false, signedOut: false })).toBeNull();
    expect(cytologyWorkspaceMismatchInput({ ...base, isPathologist: true, signedOut: true })).toBeNull();
    expect(cytologyWorkspaceMismatchInput({ ...base, finalReview: undefined, isPathologist: true, signedOut: false })).toBeNull();
  });
});

