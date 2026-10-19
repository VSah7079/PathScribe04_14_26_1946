import { describe, expect, it, vi } from 'vitest';
import { createOutboundQueueService, type OutboundQueueServiceDeps } from './outboundQueueService';
import { createHoldStore } from './outboundHoldStore';
import type { IOutboundFeedSource } from './outboundFeedSources';
import type { OutboundFeed, OutboundFeedEntry, OutboundHold } from './outboundQueueTypes';

const entry = (o: Partial<OutboundFeedEntry>): OutboundFeedEntry => ({ id: 'x', status: 'QUEUED', queuedAt: '2026-10-01T00:00:00Z', retryCount: 0, maxRetriesExceeded: false, kind: 'k', ...o });

function setup(opts: { allowed?: string[]; entries?: Partial<Record<OutboundFeed, OutboundFeedEntry[]>>; retry?: IOutboundFeedSource['retry']; billing?: Partial<IOutboundFeedSource> } = {}) {
  let holds: OutboundHold[] = [];
  const audit = vi.fn(async () => undefined);
  const retry = vi.fn(opts.retry ?? (async () => 'ok' as const));
  const entries = opts.entries ?? {
    result: [entry({ id: 'w', caseId: 'S26-1' }), entry({ id: 'f', status: 'FAILED', retryCount: 2, caseId: 'S26-2' })],
    registry: [entry({ id: 'r', status: 'SENT', caseId: 'S26-3', signedOutAt: '2026-10-01T00:00:00Z', rejection: { errorCodes: ['E1'] } })],
  };
  const sources: IOutboundFeedSource[] = (Object.keys(entries) as OutboundFeed[]).map(feed => ({ feed, list: async () => entries[feed]!, retry, ...(feed === 'billing' ? opts.billing : {}) }));
  const allowed = new Set(opts.allowed ?? ['interface:outbound:hold', 'interface:outbound:release', 'interface:outbound:resend', 'interface:outbound:mark-not-reportable', 'interface:outbound:retract', 'interface:outbound:override-release']);
  const deps: OutboundQueueServiceDeps = {
    sources: async () => sources, holds: createHoldStore(() => holds, h => { holds = h; }),
    enforce: async c => ({ allowed: allowed.has(c) }), audit, actor: () => 'Dr Test',
    facilityOfCase: async c => (c === 'S26-3' ? 'f2' : 'f1'), now: () => '2026-10-10T00:00:00Z',
    deadline: async feed => (feed === 'registry' ? { state: 'overdue' as const, dueAt: '2026-10-06T00:00:00.000Z' } : undefined), actorId: () => 'u1',
  };
  return { svc: createOutboundQueueService(deps), audit, retry, holds: () => holds };
}

describe('list', () => {
  it('shows every feed in one shape with accession, facility, counts and deadline counts', async () => {
    const { svc } = setup();
    const r = await svc.list();
    expect(r.ok && r.data.items.map(i => [i.ref, i.state, i.accessionNumber, i.facilityId])).toEqual([
      ['registry:r', 'rejected', 'S26-3', 'f2'], ['result:f', 'failed', 'S26-2', 'f1'], ['result:w', 'waiting', 'S26-1', 'f1'],
    ]);
    expect(r.ok && r.data.counts).toMatchObject({ rejected: 1, failed: 1, waiting: 1 });
    expect(r.ok && r.data.deadlineCounts).toEqual({ dueSoon: 0, overdue: 1 });
    expect(r.ok && r.data.facilityIds).toEqual(['f1', 'f2']);
  });
  it('keeps the counts when a state is picked, and filters the rows', async () => {
    const { svc } = setup();
    const r = await svc.list({ states: ['failed'] });
    expect(r.ok && r.data.items.length).toBe(1);
    expect(r.ok && r.data.counts.waiting).toBe(1);
  });
});

describe('hold and release', () => {
  it('holds a waiting message, audits it without the note, and release undoes it', async () => {
    const { svc, audit, holds } = setup();
    const h = await svc.hold(['result:w'], 'dataCheck', 'check lab value');
    expect(h.ok && h.data).toEqual([{ ref: 'result:w', ok: true }]);
    expect(holds()[0]).toMatchObject({ ref: 'result:w', reason: 'dataCheck', note: 'check lab value', heldBy: 'Dr Test' });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ event: 'OUTBOUND_MESSAGE_HELD', caseId: 'S26-1', facilityId: 'f1', user: 'Dr Test' }));
    expect(JSON.stringify(audit.mock.calls)).not.toContain('check lab value');
    expect((await svc.list()).ok && (await svc.list() as { data: { items: { ref: string; state: string }[] } }).data.items.find(i => i.ref === 'result:w')?.state).toBe('held');
    const r = await svc.release(['result:w']);
    expect(r.ok && r.data[0].ok).toBe(true);
    expect(holds()).toEqual([]);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ event: 'OUTBOUND_MESSAGE_RELEASED' }));
  });
  it('refuses what cannot be held or released, one result each', async () => {
    const { svc } = setup();
    const r = await svc.hold(['registry:r', 'result:w', 'bogus', 'result:none'], 'other');
    expect(r.ok && r.data.map(x => x.refusal ?? 'ok')).toEqual(['notHoldable', 'ok', 'notFound', 'notFound']);
    const rel = await svc.release(['result:f']);
    expect(rel.ok && rel.data[0].refusal).toBe('notHeld');
  });
  it('an unknown reason is recorded as other, and a long note is cut', async () => {
    const { svc, holds } = setup();
    await svc.hold(['result:w'], 'nonsense' as never, 'n'.repeat(500));
    expect(holds()[0].reason).toBe('other');
    expect(holds()[0].note?.length).toBe(200);
  });
});

describe('capabilities', () => {
  it('refuses the whole selection without the capability and writes nothing', async () => {
    const { svc, audit, holds, retry } = setup({ allowed: [] });
    for (const r of [await svc.hold(['result:w'], 'other'), await svc.release(['result:w']), await svc.retry(['result:f']), await svc.markNotReportable(['registry:r'], 'other')]) {
      expect(r.ok && r.data.every(x => x.refusal === 'notPermitted')).toBe(true);
    }
    expect(audit).not.toHaveBeenCalled();
    expect(holds()).toEqual([]);
    expect(retry).not.toHaveBeenCalled();
  });
  it('each action needs its own capability', async () => {
    const { svc } = setup({ allowed: ['interface:outbound:hold'] });
    expect((await svc.hold(['result:w'], 'other')).ok).toBe(true);
    const rel = await svc.release(['result:w']);
    expect(rel.ok && rel.data[0].refusal).toBe('notPermitted');
  });
});

describe('retry', () => {
  it('retries a failed message through its own source and audits it', async () => {
    const { svc, retry, audit } = setup();
    const r = await svc.retry(['result:f']);
    expect(r.ok && r.data[0].ok).toBe(true);
    expect(retry).toHaveBeenCalledWith('f', undefined);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ event: 'OUTBOUND_MESSAGE_RETRIED', detail: expect.stringContaining('attempt 3') }));
  });
  it('refuses a waiting, held or sent message', async () => {
    const { svc, retry } = setup();
    await svc.hold(['result:f'], 'other');
    const r = await svc.retry(['result:w', 'result:f']);
    expect(r.ok && r.data.map(x => x.refusal)).toEqual(['notRetryable', 'notRetryable']);
    expect(retry).not.toHaveBeenCalled();
  });
  it('passes the source failure through', async () => {
    const { svc } = setup({ retry: async () => 'failed' });
    const r = await svc.retry(['result:f']);
    expect(r.ok && r.data[0]).toEqual({ ref: 'result:f', ok: false, refusal: 'failed' });
  });
  it('a rejected message needs a reason; with one it is resubmitted and audited with the codes count only', async () => {
    const { svc, retry, audit } = setup();
    const none = await svc.retry(['registry:r']);
    expect(none.ok && none.data[0].refusal).toBe('reasonRequired');
    const r = await svc.retry(['registry:r'], 'codingCorrected');
    expect(r.ok && r.data[0].ok).toBe(true);
    expect(retry).toHaveBeenCalledWith('r', 'codingCorrected');
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ event: 'OUTBOUND_MESSAGE_RESUBMITTED', detail: expect.stringContaining('1 error codes; reason: codingCorrected') }));
  });
});

describe('mark not reportable', () => {
  it('closes a rejected message only, with a reason, audited', async () => {
    const { svc, audit, holds } = setup();
    const r = await svc.markNotReportable(['registry:r', 'result:f'], 'duplicateSubmission', 'already filed');
    expect(r.ok && r.data.map(x => x.refusal ?? 'ok')).toEqual(['ok', 'notRejected']);
    expect(holds()[0]).toMatchObject({ ref: 'registry:r', closed: 'notReportable', reason: 'duplicateSubmission' });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ event: 'OUTBOUND_MESSAGE_NOT_REPORTABLE', caseId: 'S26-3' }));
    const list = await svc.list();
    expect(list.ok && list.data.items.find(i => i.ref === 'registry:r')?.state).toBe('notReportable');
    expect(list.ok && list.data.items.find(i => i.ref === 'registry:r')?.deadline?.flag).toBe('ok');
  });
});

describe('amended re-queue', () => {
  it('shows the amendment as its own item linked to the original', async () => {
    const { svc } = setup({ entries: { registry: [entry({ id: 'o', status: 'SENT', acknowledgedAt: 'x' }), entry({ id: 'n', amendsId: 'o', queuedAt: '2026-10-05T00:00:00Z' })] } });
    const r = await svc.list();
    const n = r.ok ? r.data.items.find(i => i.ref === 'registry:n') : undefined;
    expect(n?.amendsRef).toBe('registry:o');
    expect(n?.state).toBe('waiting');
  });
});

describe('billing release through the queue', () => {
  const billing = (o: Partial<OutboundFeedEntry> = {}) => entry({ id: 'c1', caseId: 'S26-1', kind: 'TC', billing: { billingType: 'TC' }, ...o });
  it('retracts a queued charge through the billing feed, by user id, audited without names', async () => {
    const retract = vi.fn(async () => true);
    const { svc, audit } = setup({ entries: { billing: [billing()], result: [entry({ id: 'w' })] }, billing: { retract } });
    const r = await svc.retract(['billing:c1', 'result:w'], 'caseAmended');
    expect(r.ok && r.data.map(x => x.refusal ?? 'ok')).toEqual(['ok', 'notRetractable']);
    expect(retract).toHaveBeenCalledWith('c1', 'caseAmended', 'u1');
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ event: 'OUTBOUND_CHARGE_RETRACTED', caseId: 'S26-1', detail: expect.stringContaining('reason: caseAmended') }));
    expect(JSON.stringify(audit.mock.calls)).not.toContain('u1');
  });
  it('forces an immediate release with the user id, only for billing and only if not sent', async () => {
    const release = vi.fn(async () => true);
    const { svc, audit } = setup({ entries: { billing: [billing(), billing({ id: 'c2', status: 'SENT' })], result: [entry({ id: 'w' })] }, billing: { release } });
    const r = await svc.overrideRelease(['billing:c1', 'billing:c2', 'result:w']);
    expect(r.ok && r.data.map(x => x.refusal ?? 'ok')).toEqual(['ok', 'notReleasable', 'notReleasable']);
    expect(release).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledWith('c1', { overriddenBy: 'u1' });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ event: 'OUTBOUND_CHARGE_RELEASE_OVERRIDDEN' }));
  });
  it('the billing feed keeps its own hold and release; the queue does not write an overlay for it', async () => {
    const hold = vi.fn(async () => true); const release = vi.fn(async () => true);
    const { svc, holds } = setup({ entries: { billing: [billing()] }, billing: { hold, release } });
    await svc.hold(['billing:c1'], 'billingReview', 'x');
    expect(hold).toHaveBeenCalledWith('c1', 'billingReview', 'x', 'Dr Test');
    expect(holds()).toEqual([]);
    const held = setup({ entries: { billing: [billing({ hold: { reason: 'billingReview', heldBy: 'u', heldAt: 'x' } })] }, billing: { release } });
    expect((await held.svc.release(['billing:c1'])).ok).toBe(true);
    expect(release).toHaveBeenCalledWith('c1');
  });
  it('a charge the adapter says is gone is refused, and needs the capability', async () => {
    const { svc } = setup({ entries: { billing: [billing()] }, billing: { retract: async () => false } });
    expect((await svc.retract(['billing:c1'], 'other')).ok && true).toBe(true);
    const denied = setup({ allowed: [], entries: { billing: [billing()] } });
    const r = await denied.svc.retract(['billing:c1'], 'other');
    expect(r.ok && r.data[0].refusal).toBe('notPermitted');
    const o = await denied.svc.overrideRelease(['billing:c1']);
    expect(o.ok && o.data[0].refusal).toBe('notPermitted');
  });
  it('a terminal retracted charge is listed as retracted and counted; billing counts show what waits for review', async () => {
    const { svc } = setup({ entries: { billing: [billing({ billing: { retraction: { reasonCode: 'caseAmended' } } }), billing({ id: 'c3', billing: { needsReview: 'amendmentDelta', amendmentDelta: true } })] } });
    const l = await svc.list();
    expect(l.ok && l.data.counts.retracted).toBe(1);
    expect(l.ok && l.data.billingCounts).toEqual({ needsReview: 1, amendmentDelta: 1 });
  });
});
