// src/services/stationScans/recordStationScan.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 729 (Lab Workflow & Batch spec §7.1, §7.6): the one call the benches
// use to put a "printed" or "completed" step on the station scan log. Without a
// station nothing is recorded (§7.6: never against an unknown station); the
// station's name, stage and facility are filled in by the service. Fire and
// forget: a failed record never stops the bench work it describes.
// ─────────────────────────────────────────────────────────────────────────────
import { stationScanEventService } from './stationScanEventServiceInstance';
import type { NewStationScanEvent } from './IStationScanEventService';

export type StationScanInput = Omit<NewStationScanEvent, 'stationId'> & { stationId: string | null | undefined };

/** Records one event when there is a station; returns whether it was sent. */
export function recordStationScan(e: StationScanInput): boolean {
  if (!e.stationId || !e.itemId?.trim() || !e.userId) return false;
  void stationScanEventService.recordMany([{ ...e, stationId: e.stationId }]).catch(() => undefined);
  return true;
}
