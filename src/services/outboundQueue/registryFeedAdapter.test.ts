import { describe, expect, it, vi } from 'vitest';
import { CORRECTION_DAYS, createMockRegistryFeedAdapter, linkAmendments, registryEntryToFeedEntry } from './registryFeedAdapter';
import type { CancerRegistryOutboundQueueEntry } from '@/types/case/CancerRegistryOutboundQueueEntry';

const row = (o: Partial<CancerRegistryOutboundQueueEntry> = {}): CancerRegistryOutboundQueueEntry =>
  ({ id: 'r1', caseId: 'S26-1', registryId: 'seer', status: 'SENT', queuedAt: '2026-10-01T00:00:00Z', retryCount: 0, maxRetriesExceeded: false, ...o }) as CancerRegistryOutboundQueueEntry;
const ack = (outcome: string, findings: { severity: string; code?: string; message: string }[]) =>
  ({ submissionGuid: 'g', outcome, findings, format: 'statusJson', receivedAt: '2026-10-05T00:00:00Z', raw: '{}' }) as never;

describe('registryEntryToFeedEntry', () => {
  it('a rejection carries the fatal and critical error CODES only, never the registry text', () => {
    const f = registryEntryToFeedEntry(row({
      registryStatus: 'rejectedRecoverable',
      acknowledgements: [ack('rejectedRecoverable', [
        { severity: 'CRITICAL_REJECT', code: 'E22', message: 'Patient John Doe DOB 1950-01-01 invalid' },
        { severity: 'FATAL', code: 'E01', message: 'x' }, { severity: 'WARNING', code: 'W9', message: 'y' }, { severity: 'FATAL', message: 'uncoded' }])],
    }));
    expect(f.rejection?.errorCodes).toEqual(['E01', 'E22', 'UNCODED']);
    expect(f.rejection?.fatal).toBe(false);
    expect(JSON.stringify(f)).not.toContain('John');
    expect(f.rejection?.correctionDueAt).toBe(new Date(Date.parse('2026-10-05T00:00:00Z') + CORRECTION_DAYS * 86_400_000).toISOString());
    expect(f.transport).toBe('restMtls');
    expect(f.kind).toBe('seer');
  });
  it('a fatal rejection is marked, an acceptance is an acknowledgement', () => {
    expect(registryEntryToFeedEntry(row({ registryStatus: 'rejectedFatal', acknowledgements: [ack('rejectedFatal', [])] })).rejection?.fatal).toBe(true);
    const ok = registryEntryToFeedEntry(row({ registryStatus: 'acceptedWithWarnings', acknowledgements: [ack('acceptedWithWarnings', [])] }));
    expect(ok.acknowledgedAt).toBe('2026-10-05T00:00:00Z');
    expect(ok.rejection).toBeUndefined();
    expect(registryEntryToFeedEntry(row({ registryStatus: 'awaitingAck' })).acknowledgedAt).toBeUndefined();
  });
  it('failed sends keep the fixed error code only for the transport codes', () => {
    expect(registryEntryToFeedEntry(row({ status: 'FAILED', errorCode: 'DISPATCH_TIMEOUT' })).errorCode).toBe('DISPATCH_TIMEOUT');
    expect(registryEntryToFeedEntry(row({ status: 'FAILED', errorCode: 'EXCLUDED_BY_CONSENT' })).errorCode).toBeUndefined();
  });
});

describe('linkAmendments', () => {
  it('a later submission for the same case and registry amends the one before', () => {
    const out = linkAmendments([row({ id: 'b', queuedAt: '2026-10-03T00:00:00Z' }), row({ id: 'a' }), row({ id: 'c', registryId: 'other', queuedAt: '2026-10-04T00:00:00Z' })]);
    expect(out.map(o => [o.row.id, o.amendsId])).toEqual([['a', undefined], ['b', 'a'], ['c', undefined]]);
  });
});

describe('createMockRegistryFeedAdapter', () => {
  it('resubmitting puts it back to awaiting acknowledgement', async () => {
    const queue = {
      getAll: vi.fn(async () => ({ ok: true as const, data: [row()] })),
      retryDispatch: vi.fn(async () => ({ ok: true as const, data: row() })),
      setRegistryStatus: vi.fn(async () => ({ ok: true as const, data: row() })),
    };
    const a = createMockRegistryFeedAdapter(queue);
    expect((await a.list()).length).toBe(1);
    expect(await a.resubmit('r1')).toBe(true);
    expect(queue.setRegistryStatus).toHaveBeenCalledWith('r1', 'awaitingAck');
    queue.retryDispatch.mockResolvedValueOnce({ ok: false } as never);
    expect(await a.resubmit('gone')).toBe(false);
  });
});
