// src/services/interfaceDispatch/outboundQueueActions.test.ts
// Batch 518 (PS-122): resending outbound interface messages, for every queue,
// with interface:outbound:resend checked in the service.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  dispatchOutboundEntry, resendOutboundEntry, simulateOutboundFailure, captureOutboundFailureAsCapa, outboundRows,
  type OutboundActionDeps,
} from './outboundQueueActions';
import type { OutboundQueueAdapter, OutboundQueueEntry } from './outboundQueueAdapters';

const entry = (over: Partial<OutboundQueueEntry> = {}): OutboundQueueEntry =>
  ({ id: 'q1', status: 'FAILED', queuedAt: '2026-10-10T10:00:00Z', retryCount: 1, maxRetriesExceeded: false, errorCode: 'DISPATCH_TIMEOUT', errorMessage: 'slow', ...over });

function setup(opts: { allowed?: boolean; payload?: object | null; dispatchOk?: boolean; entries?: OutboundQueueEntry[] } = {}) {
  const calls: string[] = [];
  const adapter: OutboundQueueAdapter = {
    getAll: vi.fn(async () => ({ ok: true as const, data: opts.entries ?? [entry()] })),
    retryDispatch: vi.fn(async id => { calls.push(`retry:${id}`); return { ok: true as const, data: {} }; }),
    markFailed: vi.fn(async (id, f) => { calls.push(`failed:${id}:${f.errorCode}`); return { ok: true as const, data: {} }; }),
    markSent: vi.fn(async id => { calls.push(`sent:${id}`); return { ok: true as const, data: {} }; }),
    transactionType: () => 'ACCESSION_EVENT',
    identifier: e => `ACC-${e.id}`,
    kind: () => 'order.accessioned',
    subjectId: () => 'case-1',
    capaLabel: () => 'Outbound accession event dispatch failure',
    buildPayload: vi.fn(async () => (opts.payload === undefined ? { a: 1 } : opts.payload)),
  };
  const deps: OutboundActionDeps = {
    adapter: vi.fn(async () => adapter),
    dispatch: vi.fn(async () => (opts.dispatchOk === false ? { ok: false, errorCode: 'DISPATCH_REJECTED' as const, error: 'bad' } : { ok: true })),
    enforce: vi.fn(async () => ({ allowed: opts.allowed ?? true })),
    raiseDeficiency: vi.fn(async () => undefined),
  };
  return { adapter, deps, calls };
}

describe('outbound interface resend (Batch 518, PS-122)', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => { s = setup(); });

  it('resend checks interface:outbound:resend with the case, records the retry, sends, and marks it sent', async () => {
    expect(await resendOutboundEntry('accession', 'q1', s.deps)).toBe('sent');
    expect(s.deps.enforce).toHaveBeenCalledWith('interface:outbound:resend', { caseId: 'case-1' });
    expect(s.calls).toEqual(['retry:q1', 'sent:q1']);
    expect(s.deps.dispatch).toHaveBeenCalledWith('q1', 'ACCESSION_EVENT', { a: 1 });
  });

  it('a refusal changes nothing and sends nothing', async () => {
    s = setup({ allowed: false });
    expect(await resendOutboundEntry('referral', 'q1', s.deps)).toBe('notPermitted');
    expect(await dispatchOutboundEntry('referral', 'q1', s.deps)).toBe('notPermitted');
    expect(await simulateOutboundFailure('referral', 'q1', 'timeout', s.deps)).toBe('notPermitted');
    expect(s.calls).toEqual([]);
    expect(s.deps.dispatch).not.toHaveBeenCalled();
  });

  it('a refused send is marked failed with the receiver\'s reason', async () => {
    s = setup({ dispatchOk: false });
    expect(await dispatchOutboundEntry('molecular_order', 'q1', s.deps)).toBe('failed');
    expect(s.calls).toEqual(['failed:q1:DISPATCH_REJECTED']);
  });

  it('a message that can\'t be built, or is held, is failed with that reason and never posted', async () => {
    s = setup({ payload: null });
    expect(await dispatchOutboundEntry('cytology_result', 'q1', s.deps)).toBe('notBuildable');
    s = setup({ payload: { held: 'no PDF yet' } });
    expect(await dispatchOutboundEntry('result', 'q1', s.deps)).toBe('held');
    expect(s.adapter.markFailed).toHaveBeenCalledWith('q1', { errorCode: 'DISPATCH_REJECTED', errorMessage: 'no PDF yet', maxRetriesExceeded: false });
    expect(s.deps.dispatch).not.toHaveBeenCalled();
  });

  it('simulating a failure marks it failed and never sends', async () => {
    expect(await simulateOutboundFailure('patient_adt', 'q1', 'unreachable', s.deps)).toBe('marked');
    expect(s.calls).toEqual(['failed:q1:DISPATCH_UNREACHABLE']);
    expect(s.deps.dispatch).not.toHaveBeenCalled();
  });

  it('an unknown entry is reported, not invented', async () => {
    expect(await resendOutboundEntry('lis_sync', 'nope', s.deps)).toBe('notFound');
    expect(await captureOutboundFailureAsCapa('lis_sync', 'nope', 'u1', s.deps)).toBe(false);
  });

  it('a CAPA is raised against the subject with the stored comment', async () => {
    expect(await captureOutboundFailureAsCapa('accession', 'q1', 'u1', s.deps)).toBe(true);
    expect(s.deps.raiseDeficiency).toHaveBeenCalledWith({ caseId: 'case-1', deficiencyTypeId: 'def-outbound-interface-dispatch-failure', comment: 'Outbound accession event dispatch failure', raisedBy: 'u1' });
  });

  it('rows split failed and waiting, newest first, and leave sent ones out', async () => {
    s = setup({ entries: [
      entry({ id: 'a', status: 'QUEUED', queuedAt: '2026-10-10T09:00:00Z' }),
      entry({ id: 'b', status: 'FAILED', queuedAt: '2026-10-10T08:00:00Z' }),
      entry({ id: 'c', status: 'FAILED', queuedAt: '2026-10-10T11:00:00Z' }),
      entry({ id: 'd', status: 'SENT' }),
    ] });
    const rows = await outboundRows('accession', s.deps);
    expect(rows.failed.map(r => r.id)).toEqual(['c', 'b']);
    expect(rows.queued.map(r => [r.id, r.identifier, r.kind])).toEqual([['a', 'ACC-a', 'order.accessioned']]);
  });
});
