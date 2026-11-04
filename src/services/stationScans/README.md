**Batch 759:** `STATION_SCAN_ACTIONS` gains `typed` (an id typed or searched by hand instead of scanned: the Manual Entry flag, written by `services/scanEntry/manualEntryLog.ts`).

# services/stationScans/

Batch 726 (Lab Workflow & Batch spec, section 7; Decisions 5, 8, 9): station-level tracking. Every scan of a cassette, block, slide, matrix block or decant at a station is one immutable event. The item is the primary unit; a carrier is optional.

| File | What it is |
|---|---|
| `IStationScanEventService.ts` | The event shape, the actions (`received` … `completed`), the results (`ok`, `wrong-item`, `not-found`, `mismatch`), the query, the interface (`recordMany`, `query`). |
| `stationScanRules.ts` | Pure: what makes an event recordable (a station is always required, spec 7.6) and the query filter. |
| `mockStationScanEventService.ts` | The demo log in mock storage (`stationScanEvents`, cleared by Full Reset). Fills the station's name, stage and facility from the station registry. Keeps the most recent 20,000 events. `query` needs `station:scan-history:view`. |
| `httpStationScanEventService.ts` | The API server's version (both calls POST). |
| `stationScanEventServiceInstance.ts` | Mock in the demo, server version with an API address. Exported from `@/services` as `stationScanEventService`. |
| `*.test.ts` | Rules, the demo service, the HTTP routes. |

Who writes events: the batch service (load, unload, missing, carrier moves and carrier scans, each with the caller's station) and the workstations through `hooks/useStationCarrier.ts` (item scans). Events written for every item because a carrier was scanned carry `inferredFromCarrier: true` and are not item-level verification (spec 10.3).

Server contract: `docs/architecture/STATION_TRACKING_API.md`.

## Batch 729

- `stationTrailRules.ts` (new, pure, tested): `scanTrail` (newest first), `lastOwnScanByItem` (carrier-inferred events left out), `isFinishedScan`, `staleItems` (spec 7.5), `looseItemsByNode` (spec 10.1).
- `wrongCaseScan.ts` (new, pure, tested): the Grossing wrong-case flag (spec 7.3), its station event and its audit text.
- `recordStationScan.ts` (new): the benches' one call for `printed` / `completed` events; nothing without a station.
- `activitySummary` (interface, demo and HTTP): stale and loose items for the Stations wall view, authorised by the display token rather than a user permission. `stationScanEvents.test.ts` now expects three methods (still no update or delete).

## Batch 730

- Read by the lab workflow reports (`labWorkflowReports/`) and the BI feed's `station_events` (server).

## Batch 731

- `StationScanEvent.parentItemId` (optional, spec §10.4): the Microtome's "printed" and Slide Distribution's "completed" events name the block the slide came from.

Batch 757: new action `sectioned`, the slide label scanned back at the Microtome, with `parentItemId` (the block).
