// src/services/stationScans/mockStationScanEventService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 726 (spec §7.1): the demo's station scan event log, kept in this
// browser's mock storage. Append only. The station's name, workflow stage and
// facility come from the station registry, never from the caller; an event
// without a known station is refused (§7.6). The API server keeps the same log
// in the database (docs/architecture/STATION_TRACKING_API.md).
//
// Demo limit, stated plainly: the browser copy keeps the most recent
// DEMO_EVENT_CAP events so a long demo session cannot fill browser storage.
// The server keeps every event.
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResult } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import { mockScanStationService } from '../scanStations/mockScanStationService';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import {
  STATION_SCAN_ERRORS as E,
  type IStationScanEventService, type NewStationScanEvent, type StationScanEvent, type StationScanQuery, type StationActivity,
} from './IStationScanEventService';
import { eventsProblem, filterStationScanEvents } from './stationScanRules';
import { staleItems, looseItemsByNode } from './stationTrailRules';

const STORAGE_KEY = 'stationScanEvents';
export const DEMO_EVENT_CAP = 20_000;

let counter = 0;
const genId = () => { counter += 1; return `sse-${Date.now().toString(36)}-${counter}`; };

const load = (): StationScanEvent[] => storageGet<StationScanEvent[]>(STORAGE_KEY, []);
const save = (events: StationScanEvent[]) => storageSet(STORAGE_KEY, events.length > DEMO_EVENT_CAP ? events.slice(events.length - DEMO_EVENT_CAP) : events);

export const mockStationScanEventService: IStationScanEventService = {
  async recordMany(events: NewStationScanEvent[]): Promise<ServiceResult<StationScanEvent[]>> {
    const problem = eventsProblem(events);
    if (problem) return { ok: false, error: problem };
    const stationIds = [...new Set(events.map(e => e.stationId))];
    const stations = new Map<string, { name: string; workflowStage?: string; facilityId: string }>();
    for (const id of stationIds) {
      const res = await mockScanStationService.getById(id);
      if (res.ok !== true) return { ok: false, error: E.stationNotFound };
      stations.set(id, { name: res.data.name, workflowStage: res.data.workflowStage, facilityId: res.data.facilityId });
    }
    const at = new Date().toISOString();
    const recorded: StationScanEvent[] = events.map(e => {
      const st = stations.get(e.stationId)!;
      return { ...e, id: genId(), at, stationName: st.name, stationWorkflowStage: st.workflowStage, facilityId: st.facilityId };
    });
    save([...load(), ...recorded]);
    return { ok: true, data: recorded };
  },

  async query(q: StationScanQuery): Promise<ServiceResult<StationScanEvent[]>> {
    if (!(await authorizationService.enforce('station:scan-history:view')).allowed) return { ok: false, error: E.notPermitted };
    return { ok: true, data: filterStationScanEvents(load(), q) };
  },

  async activitySummary(q): Promise<ServiceResult<StationActivity>> {
    const events = load();
    return { ok: true, data: { stale: staleItems(events, { limitMinutes: q.staleMinutes, facilityId: q.facilityId }), looseByNode: Object.fromEntries(looseItemsByNode(events, { facilityId: q.facilityId })) } };
  },
};
