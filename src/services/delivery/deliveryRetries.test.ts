// src/services/delivery/deliveryRetries.test.ts
// Batch 521 (PS-281): automatic retries with backoff (§3.2.1), dead-letter and fallback (§3.2.2),
// and fax transmission confirmation (§3.2.3).
import { describe, expect, it, vi } from 'vitest';
import {
  applyReportDeliveryStatus, deliveryExceptionRecipients, deliveryExceptions, releaseKeyOf, runDeliveryRetrySweep, scheduleDeliveryRetry,
  type DeliveryRetryDeps,
} from './deliveryRetries';
import { DEFAULT_RETRY_DELAYS_MINUTES, nextAttemptAt, parseRetryDelays, retryDue, retrySettingsProblem } from './deliveryRetryPolicy';
import type { DeliveryRetryRecord } from '@/types/delivery/DeliveryRetryRecord';
import type { IDeliveryRetryService } from './IDeliveryRetryService';

const T0 = new Date('2026-10-10T20:00:00Z');
const minutes = (n: number) => new Date(T0.getTime() + n * 60_000);

function memoryRecords(): IDeliveryRetryService & { all: DeliveryRetryRecord[] } {
  const all: DeliveryRetryRecord[] = [];
  return {
    all,
    getAll: async () => ({ ok: true, data: all.map(r => ({ ...r })) }),
    create: async r => { const n = { ...r, id: `r${all.length + 1}`, createdAt: 'x', updatedAt: 'x' }; all.push(n); return { ok: true, data: { ...n } }; },
    update: async (id, patch) => { const i = all.findIndex(r => r.id === id); all[i] = { ...all[i], ...patch }; return { ok: true, data: { ...all[i] } }; },
  };
}

function setup(opts: { delays?: number[]; retryOk?: boolean[]; delivered?: boolean } = {}) {
  const records = memoryRecords();
  let clock = T0;
  const outcomes = [...(opts.retryOk ?? [])];
  const deps: DeliveryRetryDeps = {
    records,
    retryDelays: async () => opts.delays ?? [...DEFAULT_RETRY_DELAYS_MINUTES],
    now: () => clock,
    retry: vi.fn(async () => (outcomes.shift() ? { ok: true } : { ok: false, error: 'printer offline' })),
    alreadyDelivered: vi.fn(async () => !!opts.delivered),
    markExhausted: vi.fn(async () => {}),
    notify: vi.fn(async () => {}),
    sendFallback: vi.fn(async () => {}),
  };
  return { deps, records, at: (d: Date) => { clock = d; } };
}

const release = { caseId: 'c1', reportType: 'FINAL' as const, releasedAt: '2026-10-10T19:59:00Z', source: 'SURGPATH' as const, fileDropTargetId: 'client-a' };
const firstFailure = { kind: 'print' as const, entryId: 'pj-1', channel: 'PRINT' as const, role: 'primary' as const, release, fallbackChannels: ['FILE_DROP' as const], error: 'printer offline' };

describe('retry policy (§3.2.1)', () => {
  it('Pete\'s default is 3 retries at 1, 5 and 15 minutes; after the last there is none', () => {
    expect(DEFAULT_RETRY_DELAYS_MINUTES).toEqual([1, 5, 15]);
    expect([1, 2, 3].map(n => nextAttemptAt(n, DEFAULT_RETRY_DELAYS_MINUTES, T0))).toEqual([minutes(1), minutes(5), minutes(15)].map(d => d.toISOString()));
    expect(nextAttemptAt(4, DEFAULT_RETRY_DELAYS_MINUTES, T0)).toBeNull();
    expect([retryDue(minutes(1).toISOString(), T0), retryDue(minutes(1).toISOString(), minutes(1)), retryDue(undefined, T0)]).toEqual([false, true, false]);
  });
  it('the lab\'s delays: whole minutes, 1 to 1,440, at most 10; none is allowed', () => {
    expect(parseRetryDelays('1, 5 15;30')).toEqual([1, 5, 15, 30]);
    expect([retrySettingsProblem([]), retrySettingsProblem([1, 5]), retrySettingsProblem(Array(11).fill(1)), retrySettingsProblem([1.5]), retrySettingsProblem(parseRetryDelays('1, x')), retrySettingsProblem([0]), retrySettingsProblem([1441])])
      .toEqual([null, null, 'tooMany', 'notWholeMinutes', 'notWholeMinutes', 'outOfRange', 'outOfRange']);
  });
});

describe('retries, then dead-letter (§3.2.1–3.2.2)', () => {
  it('a first failure is scheduled for the first retry', async () => {
    const { deps, records } = setup();
    const r = await scheduleDeliveryRetry(firstFailure, deps);
    expect(r).toMatchObject({ status: 'scheduled', failures: 1, nextAttemptAt: minutes(1).toISOString(), releaseKey: releaseKeyOf(release), fallbackChannels: ['FILE_DROP'] });
    expect(records.all).toHaveLength(1);
  });

  it('nothing is retried before it is due; each failed retry waits for the next delay; after the last the delivery is dead-lettered', async () => {
    const { deps, records, at } = setup();
    await scheduleDeliveryRetry(firstFailure, deps);
    expect(await runDeliveryRetrySweep(deps)).toEqual({ attempted: 0, delivered: 0, deadLettered: 0 });
    at(minutes(1));
    await runDeliveryRetrySweep(deps);
    expect(records.all[0]).toMatchObject({ failures: 2, nextAttemptAt: minutes(6).toISOString(), status: 'scheduled' });
    at(minutes(6));
    await runDeliveryRetrySweep(deps);
    expect(records.all[0]).toMatchObject({ failures: 3, nextAttemptAt: minutes(21).toISOString() });
    at(minutes(21));
    expect(await runDeliveryRetrySweep(deps)).toEqual({ attempted: 1, delivered: 0, deadLettered: 1 });
    expect(records.all[0]).toMatchObject({ failures: 4, status: 'dead_lettered', deadLetteredAt: minutes(21).toISOString(), fallbackSentAt: minutes(21).toISOString() });
    expect(deps.retry).toHaveBeenCalledTimes(3);
    expect(deps.markExhausted).toHaveBeenCalledWith('print', 'pj-1', 'printer offline');
    expect(deps.sendFallback).toHaveBeenCalledWith(release, ['FILE_DROP']);
    expect(deps.notify).toHaveBeenCalledWith(expect.objectContaining({ status: 'dead_lettered', failures: 4 }));
    expect(deliveryExceptions(records.all).map(r => r.id)).toEqual(['r1']);
  });

  it('a retry that goes through is delivered; nothing more happens', async () => {
    const { deps, records, at } = setup({ retryOk: [true] });
    await scheduleDeliveryRetry(firstFailure, deps);
    at(minutes(1));
    expect(await runDeliveryRetrySweep(deps)).toEqual({ attempted: 1, delivered: 1, deadLettered: 0 });
    expect(records.all[0]).toMatchObject({ status: 'delivered', deliveredAt: minutes(1).toISOString() });
    expect(deps.sendFallback).not.toHaveBeenCalled();
    expect(deps.notify).not.toHaveBeenCalled();
  });

  it('one resent by hand meanwhile is seen as delivered, not retried', async () => {
    const { deps, records, at } = setup({ delivered: true });
    await scheduleDeliveryRetry(firstFailure, deps);
    at(minutes(1));
    await runDeliveryRetrySweep(deps);
    expect(deps.retry).not.toHaveBeenCalled();
    expect(records.all[0].status).toBe('delivered');
  });

  it('no retries set: straight to the exception queue, with the fallback', async () => {
    const { deps, records } = setup({ delays: [] });
    const r = await scheduleDeliveryRetry(firstFailure, deps);
    expect(r?.status).toBe('dead_lettered');
    expect(deps.sendFallback).toHaveBeenCalledTimes(1);
    expect(records.all[0].nextAttemptAt).toBeUndefined();
  });

  it('Batch 546 (F3): a failure that retrying cannot help goes straight to the exception queue, with the fallback and the alert', async () => {
    const { deps, records } = setup({});
    const r = await scheduleDeliveryRetry({ ...firstFailure, retriable: false }, deps);
    expect(r?.status).toBe('dead_lettered');
    expect(deps.sendFallback).toHaveBeenCalledTimes(1);
    expect(deps.notify).toHaveBeenCalledTimes(1);
    expect(records.all[0].nextAttemptAt).toBeUndefined();
  });

  it('a release falls back once, even when two primary channels are dead-lettered; a secondary never falls back', async () => {
    const { deps } = setup({ delays: [] });
    await scheduleDeliveryRetry(firstFailure, deps);
    await scheduleDeliveryRetry({ ...firstFailure, kind: 'report_delivery', entryId: 'rd-1', channel: 'FAX' }, deps);
    expect(deps.sendFallback).toHaveBeenCalledTimes(1);
    const other = setup({ delays: [] });
    await scheduleDeliveryRetry({ ...firstFailure, role: 'secondary' }, other.deps);
    expect(other.deps.sendFallback).not.toHaveBeenCalled();
    expect(other.deps.notify).toHaveBeenCalledTimes(1);
  });

  it('a dead-lettered delivery resent by hand leaves the exception queue at the next sweep', async () => {
    const { deps, records } = setup({ delays: [] });
    await scheduleDeliveryRetry(firstFailure, deps);
    expect(deliveryExceptions(records.all)).toHaveLength(1);
    vi.mocked(deps.alreadyDelivered).mockResolvedValue(true);
    await runDeliveryRetrySweep(deps);
    expect(deliveryExceptions(records.all)).toEqual([]);
  });

  it('two overlapping sweeps run once', async () => {
    const { deps, at } = setup();
    await scheduleDeliveryRetry(firstFailure, deps);
    at(minutes(1));
    await Promise.all([runDeliveryRetrySweep(deps), runDeliveryRetrySweep(deps)]);
    expect(deps.retry).toHaveBeenCalledTimes(1);
  });
});

describe('fax transmission reports (§3.2.3)', () => {
  const ctx = { release, channel: 'FAX' as const, role: 'primary' as const, fallbackChannels: ['PRINT' as const] };
  const extra = (found = true) => ({ releaseOf: vi.fn(async () => (found ? ctx : null)), markTransmissionFailed: vi.fn(async () => {}) });

  it('TRANSMITTED confirms a fax that went first time', async () => {
    const { deps, records } = setup();
    const x = extra();
    expect(await applyReportDeliveryStatus({ queueEntryId: 'rd-1', status: 'TRANSMITTED', occurredAt: '2026-10-10T20:03:00Z' }, { ...deps, ...x })).toBe('confirmed');
    expect(records.all[0]).toMatchObject({ entryId: 'rd-1', status: 'delivered', transmission: { status: 'TRANSMITTED', at: '2026-10-10T20:03:00Z' } });
  });

  it('TRANSMISSION_FAILED is a failure: the entry is failed with the provider\'s reason and retried on schedule', async () => {
    const { deps, records } = setup();
    const x = extra();
    expect(await applyReportDeliveryStatus({ queueEntryId: 'rd-1', status: 'TRANSMISSION_FAILED', detail: 'Busy', occurredAt: '2026-10-10T20:03:00Z' }, { ...deps, ...x })).toBe('failed');
    expect(x.markTransmissionFailed).toHaveBeenCalledWith('rd-1', 'Fax transmission failed: Busy');
    expect(records.all[0]).toMatchObject({ kind: 'report_delivery', entryId: 'rd-1', status: 'scheduled', failures: 1, fallbackChannels: ['PRINT'], transmission: { status: 'TRANSMISSION_FAILED', detail: 'Busy' } });
  });

  it('a failed transmission on a fax already being retried counts as one more failure', async () => {
    const { deps, records } = setup({ delays: [1] });
    await scheduleDeliveryRetry({ ...firstFailure, kind: 'report_delivery', entryId: 'rd-1', channel: 'FAX' }, deps);
    await applyReportDeliveryStatus({ queueEntryId: 'rd-1', status: 'TRANSMISSION_FAILED', occurredAt: 'x' }, { ...deps, ...extra() });
    expect(records.all[0]).toMatchObject({ failures: 2, status: 'dead_lettered' });
  });

  it('a report for a fax this lab didn\'t send is ignored', async () => {
    const { deps, records } = setup();
    expect(await applyReportDeliveryStatus({ queueEntryId: 'nope', status: 'TRANSMITTED', occurredAt: 'x' }, { ...deps, ...extra(false) })).toBe('unknown');
    expect(records.all).toEqual([]);
  });
});

describe('who is told', () => {
  it('active Admin and Lab Director staff, once each (Pete\'s default)', () => {
    const users = [
      { id: 'a', roles: ['Admin'] }, { id: 'b', roles: ['Lab Director', 'Admin'] }, { id: 'c', roles: ['Pathologist'] },
      { id: 'd', roles: ['Lab Director'], status: 'Inactive' },
    ];
    expect(deliveryExceptionRecipients(users).map(u => u.id)).toEqual(['a', 'b']);
  });
});
