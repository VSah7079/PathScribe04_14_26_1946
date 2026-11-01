// Batch 726 (spec §7.1, §7.6): the station scan event log — append only, a station is required, the station's
// name, stage and facility come from the registry, reading needs station:scan-history:view.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { filterStationScanEvents, newEventProblem } from './stationScanRules';
import type { NewStationScanEvent, StationScanEvent } from './IStationScanEventService';

const { enforce } = vi.hoisted(() => ({ enforce: vi.fn(async (_key: string) => ({ allowed: true })) }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce: (k: string) => enforce(k) } }));

beforeEach(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; }, clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    key: () => null, length: 0,
  });
  enforce.mockImplementation(async () => ({ allowed: true }));
});

const base: NewStationScanEvent = {
  itemId: 'S26-4403-A1', materialType: 'block', caseAccession: 'S26-4403', stationId: 'station-embed-1',
  userId: 'u1', userName: 'Tech A', action: 'received', result: 'ok',
};

describe('station scan event rules', () => {
  it('needs a station, an item, a user, and a known action and result', () => {
    expect(newEventProblem(base)).toBeNull();
    expect(newEventProblem({ ...base, stationId: '' })).toBe('stationRequired');
    expect(newEventProblem({ ...base, itemId: ' ' })).toBe('invalidEvent');
    expect(newEventProblem({ ...base, action: 'teleported' as never })).toBe('invalidEvent');
    expect(newEventProblem({ ...base, result: 'maybe' as never })).toBe('invalidEvent');
  });

  it('filters by item, case, station, carrier and time, oldest first, and keeps the most recent `limit`', () => {
    const ev = (id: string, at: string, extra: Partial<StationScanEvent> = {}): StationScanEvent => ({
      ...base, id, at, stationName: 'Embedding', facilityId: 'f1', ...extra,
    });
    const events = [ev('3', '2026-10-29T10:03:00Z'), ev('1', '2026-10-29T10:01:00Z'), ev('2', '2026-10-29T10:02:00Z', { itemId: 's26-4403-a2', carrierId: 'CONT-PROC-1' })];
    expect(filterStationScanEvents(events, {}).map(e => e.id)).toEqual(['1', '2', '3']);
    expect(filterStationScanEvents(events, { itemId: 'S26-4403-A2' }).map(e => e.id)).toEqual(['2']);
    expect(filterStationScanEvents(events, { carrierId: 'cont-proc-1' }).map(e => e.id)).toEqual(['2']);
    expect(filterStationScanEvents(events, { since: '2026-10-29T10:02:00Z' }).map(e => e.id)).toEqual(['2', '3']);
    expect(filterStationScanEvents(events, { until: '2026-10-29T10:02:00Z' }).map(e => e.id)).toEqual(['1']);
    expect(filterStationScanEvents(events, { limit: 2 }).map(e => e.id)).toEqual(['2', '3']);
  });
});

describe('mockStationScanEventService', () => {
  it('records with the station registry\'s name, stage and facility, and its own time', async () => {
    const { mockStationScanEventService: svc } = await import('./mockStationScanEventService');
    const res = await svc.recordMany([{ ...base }]);
    expect(res.ok).toBe(true);
    if (res.ok !== true) return;
    expect(res.data[0]).toMatchObject({ stationName: 'Histology — Embedding', stationWorkflowStage: 'Embedding', facilityId: 'c-fenwick-general', itemId: 'S26-4403-A1' });
    expect(Date.parse(res.data[0].at)).not.toBeNaN();
  });

  it('records nothing without a station or with an unknown one (§7.6), and nothing at all when one event fails', async () => {
    const { mockStationScanEventService: svc } = await import('./mockStationScanEventService');
    expect(await svc.recordMany([{ ...base, stationId: '' }])).toEqual({ ok: false, error: 'stationRequired' });
    expect(await svc.recordMany([{ ...base }, { ...base, stationId: 'no-such-station' }])).toEqual({ ok: false, error: 'stationNotFound' });
    const all = await svc.query({});
    expect(all.ok === true && all.data.length).toBe(0);
  });

  it('reading needs station:scan-history:view', async () => {
    const { mockStationScanEventService: svc } = await import('./mockStationScanEventService');
    await svc.recordMany([{ ...base }]);
    enforce.mockImplementation(async () => ({ allowed: false }));
    expect(await svc.query({})).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(enforce).toHaveBeenCalledWith('station:scan-history:view');
  });

  it('has no update or delete (append only)', async () => {
    const { mockStationScanEventService: svc } = await import('./mockStationScanEventService');
    expect(Object.keys(svc).sort()).toEqual(['activitySummary', 'query', 'recordMany']); // Batch 729: + activitySummary (a read)
  });
});
