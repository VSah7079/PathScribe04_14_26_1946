// src/services/stationScans/IStationScanEventService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 726 (Lab Workflow & Batch spec §7.1, Pete Oct 29, 2026): station-level
// tracking. Every scan of a cassette, block, slide, matrix block or decant at a
// station is one immutable event: what was scanned, the case, the carrier it
// was in (if any), where (station, its workflow stage, the processing step),
// who, when, what happened and how it came out. The events are the source for
// the Case History scan trail (§7.4), turnaround and volume reports (§9) and
// the reporting feed (§9.3).
//
// Rules the service enforces (the API server enforces the same):
//   - append only: there is no update and no delete;
//   - a station is required (§7.6): an event is never recorded against an
//     unknown station. The station's name, stage and facility are filled in by
//     the service from the station registry, never taken from the caller;
//   - the time is the service's own clock.
// Reading events names cases, so it needs `station:scan-history:view`.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult, ID } from '../types';
import type { BatchItemMaterialType, BatchProcessingNode } from '../batches/IBatchService';

/** What happened to the item at the station. */
export const STATION_SCAN_ACTIONS = ['received', 'loaded', 'unloaded', 'matched', 'missing', 'unexpected', 'printed', 'completed'] as const;
export type StationScanAction = typeof STATION_SCAN_ACTIONS[number];

/** How the scan came out. */
export const STATION_SCAN_RESULTS = ['ok', 'wrong-item', 'not-found', 'mismatch'] as const;
export type StationScanResult = typeof STATION_SCAN_RESULTS[number];

/** The kinds of thing a station scans: case material, a carrier, or something that did not resolve. */
export type StationScanMaterial = BatchItemMaterialType | 'carrier' | 'unknown';

export interface StationScanEvent {
  id: ID;
  /** When the service recorded it (ISO). */
  at: string;
  /** The item's own identifier (cassette, block or slide id), the carrier barcode for a carrier, or what was scanned when it did not resolve. */
  itemId: string;
  materialType: StationScanMaterial;
  caseAccession?: string;
  /** The carrier's master barcode (CONT- or RACK-), when the item was in one. */
  carrierId?: string;
  batchId?: ID;
  stationId: ID;
  /** Filled in by the service from the station registry. */
  stationName: string;
  stationWorkflowStage?: string;
  facilityId: string;
  /** The processing step the item was at, when known. */
  node?: BatchProcessingNode;
  userId: string;
  userName: string;
  action: StationScanAction;
  result: StationScanResult;
  /** True when the event was written for every item in a carrier because the carrier was scanned, not the item itself. */
  inferredFromCarrier?: boolean;
  /** Batch 731 (spec §10.4): the item this one came from (the block a slide was cut from), when the station knows it. */
  parentItemId?: string;
  /** A short note in English for the record (for example why a mismatch was continued). Not shown translated. */
  note?: string;
}

/** What a caller supplies. The service adds the id, the time and the station's name, stage and facility. */
export type NewStationScanEvent = Omit<StationScanEvent, 'id' | 'at' | 'stationName' | 'stationWorkflowStage' | 'facilityId'>;

export interface StationScanQuery {
  itemId?: string;
  caseAccession?: string;
  stationId?: ID;
  carrierId?: string;
  facilityId?: string;
  /** Inclusive ISO lower bound on `at`. */
  since?: string;
  /** Exclusive ISO upper bound on `at`. */
  until?: string;
  /** Most recent N after filtering (default: all). */
  limit?: number;
}

/** Refusals, as codes the screens translate (`stationScans.errors.<code>`). */
export const STATION_SCAN_ERRORS = {
  stationRequired: 'stationRequired',
  stationNotFound: 'stationNotFound',
  invalidEvent: 'invalidEvent',
  notPermitted: 'NOT_PERMITTED',
} as const;
export type StationScanErrorCode = typeof STATION_SCAN_ERRORS[keyof typeof STATION_SCAN_ERRORS];

export interface IStationScanEventService {
  /** Records one or more events, all or none. Refused with `stationRequired` when any event has no station. */
  recordMany(events: NewStationScanEvent[]): Promise<ServiceResult<StationScanEvent[]>>;
  /** Events matching the query, oldest first. Needs `station:scan-history:view`. */
  query(q: StationScanQuery): Promise<ServiceResult<StationScanEvent[]>>;
  /** Batch 729 (spec §7.5, §10.1): for the Stations wall view: items not scanned for longer than `staleMinutes`
   *  and items at each step with no carrier (stationTrailRules.ts). Counts and item ids only, the same detail the
   *  wall already shows; the wall display is authorised by its display token (DISPLAY_ACCESS_API.md), not a user. */
  activitySummary(q: StationActivityQuery): Promise<ServiceResult<StationActivity>>;
}

export interface StationActivityQuery {
  facilityId?: string;
  staleMinutes: number;
}

export interface StationActivity {
  stale: { itemId: string; caseAccession?: string; stationName: string; node?: BatchProcessingNode; lastAt: string; minutes: number }[];
  looseByNode: Partial<Record<BatchProcessingNode, number>>;
}
