// src/services/stationScans/stationScanRules.ts
// Batch 726 (spec §7.1, §7.6): the pure rules behind station scan events, shared by the demo service and the
// reports. Pure.
import {
  STATION_SCAN_ACTIONS, STATION_SCAN_RESULTS, STATION_SCAN_ERRORS,
  type NewStationScanEvent, type StationScanEvent, type StationScanErrorCode, type StationScanQuery,
} from './IStationScanEventService';

/** Why an event can't be recorded, or null when it can. A station is always required (§7.6). */
export function newEventProblem(e: NewStationScanEvent): StationScanErrorCode | null {
  if (!e.stationId || !e.stationId.trim()) return STATION_SCAN_ERRORS.stationRequired;
  if (!e.itemId || !e.itemId.trim()) return STATION_SCAN_ERRORS.invalidEvent;
  if (!e.userId) return STATION_SCAN_ERRORS.invalidEvent;
  if (!(STATION_SCAN_ACTIONS as readonly string[]).includes(e.action)) return STATION_SCAN_ERRORS.invalidEvent;
  if (!(STATION_SCAN_RESULTS as readonly string[]).includes(e.result)) return STATION_SCAN_ERRORS.invalidEvent;
  return null;
}

/** The first problem across a set of events (all or none are recorded). */
export function eventsProblem(events: NewStationScanEvent[]): StationScanErrorCode | null {
  if (events.length === 0) return STATION_SCAN_ERRORS.invalidEvent;
  for (const e of events) {
    const p = newEventProblem(e);
    if (p) return p;
  }
  return null;
}

const norm = (s: string | undefined) => (s ?? '').trim().toUpperCase();

/** Events matching a query, oldest first, then the most recent `limit`. */
export function filterStationScanEvents(events: readonly StationScanEvent[], q: StationScanQuery): StationScanEvent[] {
  const out = events.filter(e =>
    (!q.itemId || norm(e.itemId) === norm(q.itemId))
    && (!q.caseAccession || norm(e.caseAccession) === norm(q.caseAccession))
    && (!q.stationId || e.stationId === q.stationId)
    && (!q.carrierId || norm(e.carrierId) === norm(q.carrierId))
    && (!q.facilityId || e.facilityId === q.facilityId)
    && (!q.since || e.at >= q.since)
    && (!q.until || e.at < q.until),
  ).sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  return q.limit && q.limit > 0 && out.length > q.limit ? out.slice(out.length - q.limit) : out;
}
