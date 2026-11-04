// src/services/reportRelease/heldReleaseActions.test.ts
// Batch 534 (Pete: Recall "reopens, like sign-out"): what each held kind reopens, and the
// registry submissions that go with a released cytology report.
import { describe, it, expect, vi } from 'vitest';
import { reopenHeldRelease, runHeldReleaseFollowUp, heldRecallBlocked, type HeldReleaseActionDeps } from './heldReleaseActions';
import { caseStatusAfterCorrection, pendingHeldReleases, heldReleaseDue } from './heldReleaseRules';
import type { HeldRelease } from '@/types/reportRelease/HeldRelease';

const by = { userId: 'P1', userName: 'Dr P' };
function makeDeps(caseOver: Record<string, unknown> = {}, over: Partial<HeldReleaseActionDeps> = {}) {
  const store = new Map<string, any>([['C1', {
    id: 'C1', version: 0, status: 'finalized',
    specimens: [{ id: 'SP1', cytologyScreening: { finalDiagnosis: { reviewRecordId: 'rv-new' } } }, { id: 'SP2' }],
    cytologyPreliminaryReleases: [{ id: 'PR1', specimenId: 'SP1' }],
    diagnostic: { reviewerRole: 'Pathologist', preliminaryRecordedAt: 'x', other: 1 },
    ...caseOver,
  }]]);
  const records = [
    { id: 'r1', caseId: 'C1', specimenId: 'SP1', reviewRecordId: 'rv-old', signedAt: '1' },
    { id: 'r1c', caseId: 'C1', specimenId: 'SP1', reviewRecordId: 'rv-new', amendsRecordId: 'r1', signedAt: '2' },
    { id: 'r2', caseId: 'C1', specimenId: 'SP2', reviewRecordId: 'rv-2', signedAt: '3' },
  ] as any[];
  const deps: HeldReleaseActionDeps = {
    getCase: async id => (store.has(id) ? JSON.parse(JSON.stringify(store.get(id))) : undefined),
    updateCase: vi.fn(async (id: string, patch: any) => { const c = store.get(id); store.set(id, { ...c, ...patch, version: c.version + 1 }); }),
    markRecordRecalled: vi.fn(async (id: string) => ({ ok: true as const, data: records.find(r => r.id === id) })),
    getRecordsIncludingRecalled: async () => ({ ok: true, data: records }),
    getCaseRecords: async () => ({ ok: true, data: records }),
    getAllReviews: async () => ({ ok: true, data: [{ id: 'rv-old', primaryInterpretationId: 'nilm' }, { id: 'rv-new', primaryInterpretationId: 'hsil' }, { id: 'rv-2', primaryInterpretationId: 'nilm' }] as any }),
    submitRegistry: vi.fn(async () => undefined),
    submitRevisionRegistry: vi.fn(async () => undefined),
    reopenAmendment: vi.fn(async (id: string) => ({ ok: true as const, data: { type: (id.startsWith('add') ? 'addendum' : 'correction') as 'addendum' | 'correction' } })),
    now: () => new Date('2026-10-12T18:05:00.000Z'),
    ...over,
  };
  return { deps, store };
}
const held = (over: Partial<HeldRelease>): HeldRelease => ({
  id: 'h', caseId: 'C1', kind: 'cytology-sign-out', event: { caseId: 'C1', reportType: 'FINAL', releasedAt: 'x' }, followUps: [],
  heldAt: 'x', expiresAt: '2026-10-12T18:10:00.000Z', releasedBy: by, status: 'held', ...over,
});

describe('reopenHeldRelease', () => {
  it('a cytology case report: the last sign-out is marked recalled and the case goes back to its earlier status', async () => {
    const { deps, store } = makeDeps();
    await reopenHeldRelease(held({ kind: 'cytology-sign-out', subject: { recordId: 'r2', previousStatus: 'in-progress' } }), by, deps);
    expect(deps.markRecordRecalled).toHaveBeenCalledWith('r2', by, '2026-10-12T18:05:00.000Z');
    expect(store.get('C1').status).toBe('in-progress');
  });
  it('a specimen added after early finalization: only its record is recalled', async () => {
    const { deps, store } = makeDeps();
    await reopenHeldRelease(held({ kind: 'cytology-late-sign-out', subject: { recordId: 'r2' } }), by, deps);
    expect(deps.markRecordRecalled).toHaveBeenCalledWith('r2', by, expect.any(String));
    expect(store.get('C1').status).toBe('finalized');
  });
  it('an early finalization is undone', async () => {
    const { deps, store } = makeDeps({ cytologyEarlyFinalization: { reason: 'x' } });
    await reopenHeldRelease(held({ kind: 'cytology-finalize-early', subject: { previousStatus: 'in-progress' } }), by, deps);
    expect(store.get('C1').status).toBe('in-progress');
    expect(store.get('C1').cytologyEarlyFinalization).toBeUndefined();
  });
  it('a correction: recalled, and the specimen\'s final diagnosis goes back to what it corrected', async () => {
    const { deps, store } = makeDeps();
    await reopenHeldRelease(held({ kind: 'cytology-revision', subject: { recordId: 'r1c' } }), by, deps);
    expect(deps.markRecordRecalled).toHaveBeenCalledWith('r1c', by, expect.any(String));
    expect(store.get('C1').specimens[0].cytologyScreening.finalDiagnosis).toMatchObject({ reviewRecordId: 'rv-old', selectedBy: 'P1' });
  });
  it('an urgent cytology preliminary is marked recalled; a surgical preliminary\'s attestation is cleared', async () => {
    const { deps, store } = makeDeps();
    await reopenHeldRelease(held({ kind: 'cytology-preliminary', event: { caseId: 'C1', reportType: 'PRELIMINARY', releasedAt: 'x', instanceId: 'PR1' } }), by, deps);
    expect(store.get('C1').cytologyPreliminaryReleases[0].recalled).toEqual({ at: '2026-10-12T18:05:00.000Z', by });
    await reopenHeldRelease(held({ kind: 'surgical-preliminary' }), by, deps);
    expect(store.get('C1').diagnostic).toEqual({ other: 1 });
  });
});

describe('Batch 535: surgical corrections and addenda, autopsy PAD/FAD', () => {
  const instances = [{ instanceId: 'I1', status: 'finalized', lastRevisionType: 'correction' }, { instanceId: 'I2', status: 'finalized' }];
  it('a correction: back to draft, its instance unlocked again with its pending id, the case back to its status', async () => {
    const { deps, store } = makeDeps({ synopticReports: instances, lastRevisionType: 'correction' });
    await reopenHeldRelease(held({ kind: 'surgical-amendment', event: { caseId: 'C1', reportType: 'CORRECTED', releasedAt: 'x', instanceId: 'I1' },
      subject: { recordId: 'amd-1', instanceId: 'I1', previousStatus: 'in-progress' } }), by, deps);
    expect(deps.reopenAmendment).toHaveBeenCalledWith('amd-1', by);
    const c = store.get('C1');
    expect(c.status).toBe('in-progress');
    expect(c.lastRevisionType).toBeUndefined();
    expect(c.synopticReports[0]).toMatchObject({ status: 'draft', pendingAmendmentId: 'amd-1', previouslyFinalizedForAmendment: true });
    expect(c.synopticReports[0].lastRevisionType).toBeUndefined();
    expect(c.synopticReports[1]).toEqual(instances[1]);
  });
  it('a correction made during the sign-out buffer leaves the status to the sign-out\'s own recall', async () => {
    const { deps, store } = makeDeps({ status: 'in-progress', synopticReports: instances });
    await reopenHeldRelease(held({ kind: 'surgical-amendment', subject: { recordId: 'amd-1', instanceId: 'I1', previousStatus: 'pending-release' } }), by, deps);
    expect(store.get('C1').status).toBe('in-progress');
  });
  it('an addendum: back to draft with its pending addendum id; the case status is left alone; the earlier label comes back', async () => {
    const { deps, store } = makeDeps({ synopticReports: instances, lastRevisionType: 'addendum' });
    await reopenHeldRelease(held({ kind: 'surgical-amendment', subject: { recordId: 'add-1', instanceId: 'I2', previousStatus: 'finalized', previousRevisionType: 'correction' } }), by, deps);
    const c = store.get('C1');
    expect(c.status).toBe('finalized');
    expect(c.lastRevisionType).toBe('correction');
    expect(c.synopticReports[1]).toMatchObject({ status: 'draft', pendingAddendumId: 'add-1', lastRevisionType: 'correction' });
  });
  it('a record that can\'t be reopened changes nothing on the case', async () => {
    const { deps, store } = makeDeps({ synopticReports: instances }, { reopenAmendment: vi.fn(async () => ({ ok: false as const, error: 'x' })) as never });
    await reopenHeldRelease(held({ kind: 'surgical-amendment', subject: { recordId: 'amd-1', instanceId: 'I1' } }), by, deps);
    expect(deps.updateCase).not.toHaveBeenCalled();
    expect(store.get('C1').synopticReports).toEqual(instances);
  });
  it('autopsy FAD: its snapshot withdrawn and the status back; PAD: its snapshot withdrawn', async () => {
    const { deps, store } = makeDeps({ autopsy: { padSnapshot: { tier: 'PAD' }, fadSnapshot: { tier: 'FAD' }, other: 1 } });
    await reopenHeldRelease(held({ kind: 'autopsy', event: { caseId: 'C1', reportType: 'FINAL', releasedAt: 'x' }, subject: { previousStatus: 'in-progress' } }), by, deps);
    expect(store.get('C1').status).toBe('in-progress');
    expect(store.get('C1').autopsy).toEqual({ padSnapshot: { tier: 'PAD' }, fadSnapshot: undefined, other: 1 });
    await reopenHeldRelease(held({ kind: 'autopsy', event: { caseId: 'C1', reportType: 'PRELIMINARY', releasedAt: 'x' }, subject: { previousStatus: 'in-progress' } }), by, deps);
    expect(store.get('C1').autopsy.padSnapshot).toBeUndefined();
  });
  it('a PAD can\'t be recalled once the FAD is signed on it; a FAD can', async () => {
    const { deps } = makeDeps({ autopsy: { padSnapshot: {}, fadSnapshot: {} } });
    expect(await heldRecallBlocked(held({ kind: 'autopsy', event: { caseId: 'C1', reportType: 'PRELIMINARY', releasedAt: 'x' } }), deps)).toBe('superseded');
    expect(await heldRecallBlocked(held({ kind: 'autopsy', event: { caseId: 'C1', reportType: 'FINAL', releasedAt: 'x' } }), deps)).toBeNull();
    const padOnly = makeDeps({ autopsy: { padSnapshot: {} } });
    expect(await heldRecallBlocked(held({ kind: 'autopsy', event: { caseId: 'C1', reportType: 'PRELIMINARY', releasedAt: 'x' } }), padOnly.deps)).toBeNull();
  });
});

describe('runHeldReleaseFollowUp', () => {
  it('cytology registry: each listed sample, in the order given, with the review it was signed on', async () => {
    const { deps } = makeDeps();
    await runHeldReleaseFollowUp({ type: 'cytology-registry', recordIds: ['r1c', 'r2'], isGynCytology: true, categories: [] }, 'C1', deps);
    expect((deps.submitRegistry as any).mock.calls.map((c: any[]) => [c[0].record.id, c[0].review.id, c[0].kind])).toEqual([['r1c', 'rv-new', 'signOut'], ['r2', 'rv-2', 'signOut']]);
  });
  it('a correction or addendum goes to the registry as such', async () => {
    const { deps } = makeDeps();
    await runHeldReleaseFollowUp({ type: 'cytology-revision-registry', recordId: 'r1c', revision: 'correction', isGynCytology: true, categories: [] }, 'C1', deps);
    expect((deps.submitRevisionRegistry as any).mock.calls[0][0]).toMatchObject({ signOutRecordId: 'r1c', kind: 'correction', isGynCytology: true });
  });
});

describe('heldReleaseRules', () => {
  it('a correction released during a sign-out buffer leaves the case in the buffer (the Finalize-then-correct bug)', () => {
    expect(caseStatusAfterCorrection('pending-release')).toBe('pending-release');
    expect(caseStatusAfterCorrection('amended')).toBe('finalized');
    expect(caseStatusAfterCorrection(undefined)).toBe('finalized');
  });
  it('what a case shows as held (not the surgical sign-out, which has its own banner), soonest first; when it is due', () => {
    const list = [held({ id: 'b', expiresAt: '2026-10-12T18:20:00Z' }), held({ id: 'a', expiresAt: '2026-10-12T18:10:00Z' }),
      held({ id: 's', kind: 'surgical-sign-out' }), held({ id: 'x', status: 'released' }), held({ id: 'o', caseId: 'C2' })];
    expect(pendingHeldReleases(list, 'C1').map(h => h.id)).toEqual(['a', 'b']);
    expect(heldReleaseDue(held({}), new Date('2026-10-12T18:09:59Z'))).toBe(false);
    expect(heldReleaseDue(held({}), new Date('2026-10-12T18:10:00Z'))).toBe(true);
  });
});
