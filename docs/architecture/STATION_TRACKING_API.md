# Station tracking: the station scan event log (Batch 726)

**Spec:** PathScribe Laboratory Workflow & Batch Management Specification, section 7 (station-level tracking), Decisions 5, 8 and 9, and section 10.1–10.3 (Pete Nimmo, Oct 29, 2026).

**Status:** the browser side is built and runs against a demo service (`src/services/stationScans/`). The API server side is **Planned**; this is its contract. Where this document and `src/services/stationScans/stationScanRules.ts` or `IStationScanEventService.ts` differ, the code wins and this document is corrected.

## 1. What an event is

One immutable record per scan of an item at a station. The item is the primary unit of tracking; a carrier is optional (Decision 8). Fields (`StationScanEvent`):

| Field | Meaning |
|---|---|
| `id`, `at` | Set by the server (its own clock). |
| `itemId` | The item's own id (cassette/block id such as `S26-4403-A1`, slide id such as `S26-4403-A1-L2`), the carrier barcode for a carrier, or what was scanned when it did not resolve. |
| `materialType` | `block`, `slide`, `matrix_block`, `matrix_slide`, `specimen`, `decant`, `decant_slide`, `carrier` or `unknown`. |
| `caseAccession` | The case, when the item resolved. |
| `carrierId`, `batchId` | The carrier (CONT-/RACK-) and its batch, when the item was in one. Optional. |
| `stationId` | Required. A scan with no station is never recorded (spec 7.6). |
| `stationName`, `stationWorkflowStage`, `facilityId` | Filled in by the server from the station registry, never taken from the caller. |
| `node` | The processing step the item was at. |
| `userId`, `userName` | Who scanned (from the signed-in session on the server). |
| `action` | `received`, `loaded`, `unloaded`, `matched`, `missing`, `unexpected`, `printed`, `sectioned` (Batch 757: the slide label scanned back at the Microtome, with `parentItemId`), `completed`, `typed` (Batch 759: the id was typed or searched by hand, not scanned: the Manual Entry flag; written with the audit entry "Manual Entry", and only when the entry named an item; reports should not count it as a scan check). |
| `result` | `ok`, `wrong-item`, `not-found`, `mismatch`. |
| `inferredFromCarrier` | True when the event was written for every item in a carrier because the carrier was scanned (a hand-off to the next step, a carrier opened at a station). These events are **not** item-level verification: reports must not count them as per-item checks, wrong-item checks or time at the bench (spec 10.3). |
| `note` | Short English note for the record (for example why a mismatch was continued; Batch 758: `missing` with "Label not scanned before the next block" when the Microtome tech continues past the block lockout). |

There is no update and no delete.

## 2. Endpoints

Base `/api/station-scans/station-scan-event` (`httpStationScanEventService.ts`). All are POST: the query names cases, and nothing that names a patient goes in a URL.

| Method | Call | Body | Answer |
|---|---|---|---|
| `recordMany` | `POST …/record-many` | `{ events: NewStationScanEvent[] }` | result: the recorded events. All or none. `stationRequired` when any event has no station, `stationNotFound` for an unknown one, `invalidEvent` for a bad action, result or item. |
| `query` | `POST …/query` | `StationScanQuery`: `itemId`, `caseAccession`, `stationId`, `carrierId`, `facilityId`, `since` (inclusive), `until` (exclusive), `limit` (most recent N) | result: events oldest first. Needs `station:scan-history:view` (403 `NOT_PERMITTED`). The server also limits the answer to the caller's facilities. |
| `activitySummary` (Batch 729) | `POST …/activity-summary` | `StationActivityQuery`: `facilityId`, `staleMinutes` | result `StationActivity`: `stale` (items whose last own scan is older than `staleMinutes` and whose work has not ended: a block completed at the Microtome, a slide completed at Slide Distribution, Checkout or External Referral; longest first; item id, accession, station name, step, last time, minutes) and `looseByNode` (items whose last own scan put them at a step with no carrier and not yet completed there). Carrier-wide events (`inferredFromCarrier`) do not count as an item's own scan. For the Stations wall view: authorised by the wall display's token (`DISPLAY_ACCESS_API.md`), not a user permission. Rules: `stationTrailRules.ts`. |

## 3. Events the server writes itself

When the batch calls carry a `stationId` (`CASE_WORKFLOWS_API.md`, IBatchService), the server writes the events in the same transaction as the batch change:

| Batch call | Events |
|---|---|
| `addItemByScan` | `loaded` for the item. |
| `scanItemOut` | `matched` (result `ok`) or `unexpected` (result `wrong-item`, or `not-found` when the scan did not resolve). |
| `overrideAndComplete` | `missing` for each item still missing. |
| `advanceToNode` (and the Decal `transferToProcessing`) | `loaded` for every item, `inferredFromCarrier: true`, at the new step. |
| `recordCarrierScan` | `received` for every item, `inferredFromCarrier: true`, result `ok` or `mismatch`. |

The workstations record `received` item scans directly with `recordMany` (the Embedding, Microtome and Slide Distribution screens, `hooks/useStationCarrier.ts`).

Batch 729: the benches also record, through `recordStationScan.ts` (nothing without a station):

| Bench step | Event |
|---|---|
| Embedding: Confirm | `completed` for the block or matrix block, node Embedding. |
| Microtome: a slide label printed | `printed` for the slide; when it was the block's last unprinted slide, `completed` for the block, node Microtomy / Sectioning. |
| Slide Distribution: a slide sent to a pathologist or loaded on a scanner | `completed` for the slide. |
| Grossing: a scanned item from another case (spec 7.3) | `received` with result `wrong-item` and a note saying which case was open and whether the person continued or set it aside; "Continue anyway" is also in the audit log. |

## 4. Not built yet (stated plainly)

- Done in Batch 729: `printed` and `completed` events (above); the scan trail at the Grossing, Embedding, Microtome and Slide Distribution screens (`components/Workstation/ScanTrailPanel.tsx`, spec 7.4); `activitySummary` for the Stations view (spec 7.5, 10.1).
- A separate Case History screen outside the stations (the trail is on the bench screens only).
- Reports and the reporting feed built from these events (spec 9, 9.3): Batch 730.
- Lineage (`parentItemId`) and item end states (spec 10.4, 10.5): Batch 731.
- The demo keeps the most recent 20,000 events in the browser; the server keeps every event.

## Batch 758: the Microtome bench (Planned on the server)

Slides confirmed at a Microtome station before a staining rack is scanned wait on that station's bench (Scan-Last). Today the browser keeps the bench per station (`services/batches/benchSlideBuffer.ts`, through `dataStorage`). The server will hold it per station:

| Call | Body | Answer |
|---|---|---|
| `POST /api/station-scans/bench/list` | `{ stationId }` | result: the slides on the bench (`slideId`, `caseAccession`, `confirmedAt`, `userId`), oldest first. |
| `POST /api/station-scans/bench/add` | `{ stationId, slideId }` | result: the bench. A slide is on one bench at most; adding it again changes nothing. |
| `POST /api/station-scans/bench/assign` | `{ stationId, batchId }` | result: the slides placed in the rack, and the ones refused (with the `addItemByScan` outcome). Only this station's bench is swept (Pete: technician A's rack scan never takes technician B's slides). The rack is sealed when at least one slide went in. |

No patient identifier goes in a URL. The station comes from the computer's station setting; the server checks it against the caller's facilities.

