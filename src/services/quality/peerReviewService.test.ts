// PS-144 (Batch 439): the peer review service and the status both screens read.
import { describe, it, expect, vi } from 'vitest';
import { createPeerReviewService, type PeerReviewDeps } from './peerReviewService';
import { loadPeerReviewStatus } from './peerReviewStatus';
import type { PeerReviewOverride, PeerReviewRequest } from '@/types/quality/PeerReview';

const A = { userId: 'u-a', userName: 'Dr A' };
const B = { userId: 'u-b', userName: 'Dr B' };

function setup(opts: { actor?: typeof A; allowed?: (cap: string) => boolean } = {}) {
  let requests: PeerReviewRequest[] = [];
  let overrides: PeerReviewOverride[] = [];
  let actor = opts.actor ?? A;
  let n = 0;
  const created: any[] = [];
  const audits: any[] = [];
  const enforce = vi.fn(async (cap: string) => ({ allowed: opts.allowed ? opts.allowed(cap) : true }));
  const deps: PeerReviewDeps = {
    loadRequests: () => requests, persistRequests: all => { requests = all; },
    loadOverrides: () => overrides, persistOverrides: all => { overrides = all; },
    caseMeta: async () => ({ caseType: 'Breast', subspecialtyId: 'breast', primaryDiagnosis: 'Invasive carcinoma' }),
    qaRecords: { create: async r => { created.push(r); return { ok: true, data: { ...r, id: `qa-${created.length}`, recordedAt: 'x' } }; } },
    audit: async e => { audits.push(e); },
    enforce,
    actor: () => actor,
    now: () => new Date('2026-10-02T10:00:00.000Z'),
    newId: p => `${p}-${++n}`,
  };
  return { svc: createPeerReviewService(deps), created, audits, enforce, setActor: (a: typeof A) => { actor = a; }, get requests() { return requests; } };
}

describe('createPeerReviewService', () => {
  it('request → pending, audited; the requester is the primary pathologist', async () => {
    const t = setup();
    const res = await t.svc.request({ caseId: 'c1', trigger: 'first-time-malignancy', reviewer: B, note: ' Please look at the margins ' });
    expect(res.ok && res.data).toMatchObject({ status: 'pending', primaryPathologist: A, reviewer: B, note: 'Please look at the margins' });
    expect(t.enforce).toHaveBeenCalledWith('case:peer-review:request', { caseId: 'c1' });
    expect(t.audits[0].event).toBe('PEER_REVIEW_REQUESTED');
  });

  it('the signer can\'t be their own reviewer', async () => {
    const t = setup();
    expect(await t.svc.request({ caseId: 'c1', trigger: 'requested', reviewer: A })).toEqual({ ok: false, error: 'REVIEWER_IS_SIGNER' });
  });

  it('agreement completes it and writes a concordant QA record (no CAPA)', async () => {
    const t = setup();
    const r = await t.svc.request({ caseId: 'c1', trigger: 'first-time-malignancy', reviewer: B });
    t.setActor(B);
    const read = await t.svc.recordRead(r.ok ? r.data.id : '', { agrees: true });
    expect(read.ok && read.data).toMatchObject({ status: 'completed', result: 'concordant', qaRecordId: 'qa-1' });
    expect(t.created[0]).toMatchObject({ outcome: 'concordant', recordedBy: B, reviewedPathologist: A });
    expect(t.enforce).toHaveBeenCalledWith('case:peer-review:record', { caseId: 'c1' });
  });

  it('disagreement waits for consensus; consensus reached writes a discordant record marked consensus-reached', async () => {
    const t = setup();
    const r = await t.svc.request({ caseId: 'c1', trigger: 'first-time-malignancy', reviewer: B });
    const id = r.ok ? r.data.id : '';
    t.setActor(B);
    const read = await t.svc.recordRead(id, { agrees: false, diagnosis: 'DCIS only', severity: 'high' });
    expect(read.ok && read.data.status).toBe('disagreement');
    expect(t.created).toHaveLength(0);
    t.setActor(A);
    const res = await t.svc.resolve(id, { result: 'consensus-reached', consensusDiagnosis: 'Invasive carcinoma, focal' });
    expect(res.ok && res.data).toMatchObject({ status: 'completed', result: 'consensus-reached', resolvedBy: A });
    expect(t.created[0]).toMatchObject({ outcome: 'discordant', consensus: 'consensus-reached', severity: 'high' });
    // The primary records consensus under the request capability.
    expect(t.enforce).toHaveBeenLastCalledWith('case:peer-review:request', { caseId: 'c1' });
  });

  it('unresolved writes consensus "unresolved" (the engine recommends a CAPA from it)', async () => {
    const t = setup();
    const r = await t.svc.request({ caseId: 'c1', trigger: 'requested', reviewer: B });
    const id = r.ok ? r.data.id : '';
    t.setActor(B);
    await t.svc.recordRead(id, { agrees: false, diagnosis: 'Atypia only', severity: 'medium' });
    await t.svc.resolve(id, { result: 'unresolved', note: 'Third opinion also split' });
    expect(t.created[0]).toMatchObject({ outcome: 'discordant', consensus: 'unresolved', comments: 'Third opinion also split' });
    expect(t.audits[t.audits.length - 1].event).toBe('PEER_REVIEW_RESOLVED');
  });

  it('without the capability nothing changes', async () => {
    const t = setup({ allowed: () => false });
    expect(await t.svc.request({ caseId: 'c1', trigger: 'requested', reviewer: B })).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await t.svc.override('c1', { reason: 'immediate-surgery' })).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(t.requests).toEqual([]);
  });

  it('withdraw and override are audited; the override owes the review in 24 hours', async () => {
    const t = setup();
    const r = await t.svc.request({ caseId: 'c1', trigger: 'requested', reviewer: B });
    const w = await t.svc.withdraw(r.ok ? r.data.id : '', 'Asked the wrong colleague');
    expect(w.ok && w.data.status).toBe('withdrawn');
    const o = await t.svc.override('c1', { reason: 'immediate-surgery', note: 'Surgery booked tomorrow' });
    expect(o.ok && o.data).toMatchObject({ retrospectiveDueAt: '2026-10-03T10:00:00.000Z', by: A });
    expect(t.enforce).toHaveBeenLastCalledWith('case:peer-review:override', { caseId: 'c1' });
    expect(t.audits.map(a => a.event)).toEqual(['PEER_REVIEW_REQUESTED', 'PEER_REVIEW_WITHDRAWN', 'PEER_REVIEW_OVERRIDDEN']);
  });

  it('open for a user: their reads, and consensus they are part of', async () => {
    const t = setup();
    const r = await t.svc.request({ caseId: 'c1', trigger: 'requested', reviewer: B });
    expect((await t.svc.getOpenForUser('u-b')).ok).toBe(true);
    expect((await t.svc.getOpenForUser('u-a') as any).data).toHaveLength(0);
    t.setActor(B);
    await t.svc.recordRead(r.ok ? r.data.id : '', { agrees: false, diagnosis: 'x', severity: 'low' });
    expect((await t.svc.getOpenForUser('u-a') as any).data).toHaveLength(1);
  });
});

describe('loadPeerReviewStatus', () => {
  const base = { id: 'c1', order: { facilityId: 'client-1' }, subspecialtyId: 'breast', patient: { id: 'p1' } };
  const deps = (over: Partial<Parameters<typeof loadPeerReviewStatus>[2]> = {}) => ({
    getForCase: async () => ({ requests: [], overrides: [] }),
    gateOnFor: async () => false,
    performingLabFor: async () => 'lab-1',
    priorCases: vi.fn(async () => []),
    ...over,
  });
  it('first-time malignancy, gate off (the default): needs a request but sign-out is not blocked', async () => {
    const s = await loadPeerReviewStatus({ ...base, abnormalDetectionStatus: { severity: 'Malignant' } }, [], deps());
    expect(s).toMatchObject({ state: 'needs-request', firstTime: true, gateOn: false, blocksSignOut: false });
  });
  it('gate on for the performing lab: blocks until the review is done', async () => {
    const gateOnFor = vi.fn(async (lab?: string) => lab === 'lab-1');
    const s = await loadPeerReviewStatus(base, [{ severity: 'Malignant' }], deps({ gateOnFor }));
    expect(s.blocksSignOut).toBe(true);
    expect(gateOnFor).toHaveBeenCalledWith('lab-1', 'breast');
  });
  it('a prior malignant case: not first-time, nothing required', async () => {
    const s = await loadPeerReviewStatus(base, [{ severity: 'Malignant' }], deps({
      gateOnFor: async () => true,
      priorCases: vi.fn(async () => [{ id: 'old', diagnostic: { primaryDiagnosis: 'Adenocarcinoma' } }]),
    }));
    expect(s).toMatchObject({ state: 'not-required', reason: 'prior-malignant-case', blocksSignOut: false });
  });
  it('no malignancy: prior cases are not even read', async () => {
    const d = deps();
    await loadPeerReviewStatus(base, [], d);
    expect(d.priorCases).not.toHaveBeenCalled();
  });
});
