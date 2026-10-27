import { describe, expect, it, vi } from 'vitest';
import { createScreeningRegistryFeedAdapter, combineRegistryFeedAdapters, SCREENING_ID_PREFIX } from './screeningRegistryFeed';
import type { IRegistryFeedAdapter } from '../outboundQueue/registryFeedAdapter';

// Batch 620 part S (PS-800): the batch programmes' submissions as part of the registry feed on the Outbound Queue screen.
const row = (id: string, over: Record<string, unknown> = {}) => ({
  id, caseId: `c-${id}`, signOutRecordId: `s-${id}`, registryId: 'germany_okfe', status: 'QUEUED', queuedAt: '2026-10-18T10:00:00.000Z', retryCount: 0, maxRetriesExceeded: false,
  submission: { submissionGuid: `g-${id}`, submissionVersion: 1, masterTransactionId: 'm', messageType: 'NEW', environment: 'test', isDuplicateRetry: false, specimenId: 's' }, ...over,
});
const queue = (rows: unknown[], retry = vi.fn().mockResolvedValue({ ok: true, data: {} })) =>
  ({ getAll: vi.fn().mockResolvedValue({ ok: true, data: rows }), retryDispatch: retry }) as never;
const ids = (...x: string[]) => async () => new Set(x);

describe('createScreeningRegistryFeedAdapter', () => {
  it('lists only programmes that have a batch profile, with a prefixed id, a screening kind and the sftp transport', async () => {
    const a = createScreeningRegistryFeedAdapter(queue([row('e1'), row('e2', { registryId: 'france_crcdc' })]), ids('germany_okfe'));
    const list = await a.list();
    expect(list.map(e => [e.id, e.kind, e.transport])).toEqual([[`${SCREENING_ID_PREFIX}e1`, 'screening:germany_okfe', 'sftp']]);
  });
  it('leaves out the entry that records an opt-out', async () => {
    const a = createScreeningRegistryFeedAdapter(queue([row('e1', { errorCode: 'EXCLUDED_BY_CONSENT' }), row('e2')]), ids('germany_okfe'));
    expect((await a.list()).map(e => e.id)).toEqual([`${SCREENING_ID_PREFIX}e2`]);
  });
  it('lists nothing when the queue cannot be read', async () => {
    const a = createScreeningRegistryFeedAdapter({ getAll: async () => ({ ok: false, error: 'X' }), retryDispatch: vi.fn() } as never, ids('germany_okfe'));
    expect(await a.list()).toEqual([]);
  });
  it('resubmit puts the entry back in the queue for the next file, and ignores an id that is not its own', async () => {
    const retry = vi.fn().mockResolvedValue({ ok: true, data: {} });
    const a = createScreeningRegistryFeedAdapter(queue([], retry), ids());
    expect(await a.resubmit(`${SCREENING_ID_PREFIX}e1`, 'other')).toBe(true);
    expect(retry).toHaveBeenCalledWith('e1');
    expect(await a.resubmit('cancer-1', 'other')).toBe(false);
    expect(retry).toHaveBeenCalledTimes(1);
  });
  it('resubmit is false when the queue refuses', async () => {
    const a = createScreeningRegistryFeedAdapter(queue([], vi.fn().mockResolvedValue({ ok: false, error: 'X' })), ids());
    expect(await a.resubmit(`${SCREENING_ID_PREFIX}e1`, 'other')).toBe(false);
  });
});

describe('combineRegistryFeedAdapters', () => {
  const stub = (tag: string): IRegistryFeedAdapter => ({ list: async () => [{ id: tag } as never], resubmit: vi.fn().mockResolvedValue(true) });
  it('lists both and sends a retry to the adapter that owns the id', async () => {
    const [c, s] = [stub('c'), stub('s')];
    const both = combineRegistryFeedAdapters(c, s);
    expect((await both.list()).map(e => e.id)).toEqual(['c', 's']);
    await both.resubmit(`${SCREENING_ID_PREFIX}1`, 'other');
    await both.resubmit('cancer-1', 'other');
    expect(s.resubmit).toHaveBeenCalledTimes(1);
    expect(c.resubmit).toHaveBeenCalledTimes(1);
  });
});
