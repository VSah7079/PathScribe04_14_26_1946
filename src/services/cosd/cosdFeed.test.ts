// Batch 620 (part C, PS-800): the UK correction loop on the registry feed: working-day due date, destination transport, other registries untouched, retry and amendment links pass through.
import { describe, it, expect, vi } from 'vitest';
import type { IRegistryFeedAdapter } from '../outboundQueue/registryFeedAdapter';
import type { OutboundFeedEntry } from '../outboundQueue/outboundQueueTypes';
import { withCosdCorrection, COSD_REGISTRY_ID } from './cosdFeed';
import type { CosdDestination } from './cosdDestination';

const entry = (id: string, kind: string, over: Partial<OutboundFeedEntry> = {}): OutboundFeedEntry => ({
  id, status: 'SENT', queuedAt: '2026-10-14T09:00:00Z', retryCount: 0, maxRetriesExceeded: false, kind, caseId: `case-${id}`, ...over,
});
const rejected = (id: string, kind = COSD_REGISTRY_ID): OutboundFeedEntry => entry(id, kind, {
  rejection: { errorCodes: ['E1'], rejectedAt: '2026-10-16T09:00:00.000Z', correctionDueAt: '2026-10-30T09:00:00.000Z' },
});
const dest = (facilityId: string | null, over: Partial<CosdDestination> = {}): CosdDestination => ({
  id: `d-${facilityId}`, facilityId, transport: 'restMtls', correctionWorkingDays: 5, nonWorkingDates: [], updatedAt: '', ...over,
});
const inner = (entries: OutboundFeedEntry[]): IRegistryFeedAdapter => ({ list: async () => entries, resubmit: vi.fn(async () => true) });
const deps = (stored: CosdDestination[], facilityOf: (id: string) => Promise<string | undefined> = async (id: string) => (id === 'case-b' ? 'fac-b' : 'fac-a')) => ({ destinations: async () => stored, facilityOfCase: facilityOf });

describe('withCosdCorrection', () => {
  it('counts the correction window in working days from the rejection (5 by default)', async () => {
    const out = await withCosdCorrection(inner([rejected('a')]), deps([])).list();
    expect(out[0].rejection?.correctionDueAt).toBe('2026-10-23T09:00:00.000Z');
    expect(out[0].transport).toBe('restMtls');
  });
  it('uses the performing facility\'s own destination, then the enterprise one', async () => {
    const stored = [dest(null, { correctionWorkingDays: 7, transport: 'sftp' }), dest('fac-b', { correctionWorkingDays: 3, nonWorkingDates: ['2026-10-19'] })];
    const out = await withCosdCorrection(inner([rejected('a'), rejected('b')]), deps(stored)).list();
    expect(out.find(e => e.id === 'a')).toMatchObject({ transport: 'sftp', rejection: { correctionDueAt: '2026-10-27T09:00:00.000Z' } });
    expect(out.find(e => e.id === 'b')).toMatchObject({ rejection: { correctionDueAt: '2026-10-22T09:00:00.000Z' } });
  });
  it('leaves every other registry exactly as it was', async () => {
    const other = rejected('x', 'naaccr_us');
    const out = await withCosdCorrection(inner([other]), deps([dest(null, { correctionWorkingDays: 1 })])).list();
    expect(out).toEqual([other]);
  });
  it('a UK submission that was not rejected only gets the transport', async () => {
    const out = await withCosdCorrection(inner([entry('ok', COSD_REGISTRY_ID)]), deps([dest(null, { transport: 'portalUpload' })])).list();
    expect(out[0].transport).toBe('portalUpload');
    expect(out[0].rejection).toBeUndefined();
  });
  it('keeps an amended report\'s link to the submission it amends', async () => {
    const out = await withCosdCorrection(inner([entry('n', COSD_REGISTRY_ID, { amendsId: 'first' })]), deps([])).list();
    expect(out[0].amendsId).toBe('first');
  });
  it('resubmitting a correction is the queue\'s own retry, with its reason', async () => {
    const base = inner([]);
    const wrapped = withCosdCorrection(base, deps([]));
    await wrapped.resubmit('a', 'dataCorrected');
    expect(base.resubmit).toHaveBeenCalledWith('a', 'dataCorrected');
  });
  it('without a case the enterprise destination applies', async () => {
    const facilityOf = vi.fn(async (): Promise<string | undefined> => undefined);
    const e = { ...rejected('a'), caseId: undefined };
    const out = await withCosdCorrection(inner([e]), deps([dest(null, { correctionWorkingDays: 2 })], facilityOf)).list();
    expect(facilityOf).not.toHaveBeenCalled();
    expect(out[0].rejection?.correctionDueAt).toBe('2026-10-20T09:00:00.000Z');
  });
});
