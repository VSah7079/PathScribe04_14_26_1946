# types/printing/

PathScribe-owned internal event contract for real network printing — sending a print job to a real Interface Engine and receiving its callback status.

## Files

- **`PrintJob.ts`** — the print queue entry (delivery mode `NATIVE_QZ_TRAY` / `INTERFACE_ENGINE_HANDOFF` / `DIRECT_NETWORK_PRINT`, report type, paper size, tray, duplex), following `OutboundResultQueueEntry`'s queue/retry/error-code shape.
- **`PrintBatch.ts`** (PS-279) — scheduled batch aggregation of client reports into one job, grouped by client account or delivery route.
- **`NetworkPrintPayload.ts`** — the payload/callback shapes, per PS-51's own spec (Sections 5 "Network Print Payload Specification" and 7 "Callback Status Specification").
  - **Batch 347 (PS-54):** `labelData.labelType` (`CASSETTE` / `SLIDE`; absent means cassette), `labelData.slide` (`level`, `stainName`), and `attempt` (1, then 2, 3… on a retry, with the same `idempotencyKey`). The callback reaches the browser as a `PrintJobStatus` live-update event (`services/liveUpdates/liveUpdateContract.ts`; spec §10 of `docs/architecture/LIVE_UPDATES_SIGNALR.md`).

*Corrected in the Batch 496 README audit (Oct 9, 2026): added `PrintJob.ts` and `PrintBatch.ts`, missing from this list.*


## Batch 538

`PrintJob.reportDocumentId`, `pdfSha256`: the released report document the job's bytes are.

---
*See [types/README.md](../README.md) for how this folder fits the whole types/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master types/README.md if this folder's overall PURPOSE changes.*

## Batch 546

`PrintJob.errorCode` gains `NEEDS_SITE_AGENT`: a network print attempted somewhere that can't reach a printer, which is the browser (finding F3).

## Batch 552 (PS-539 phase 2d: site agent screens)

- `PrintJob.confirmation` (new, optional): `'printed'` when the printer confirmed it (IPP, IPPS), `'sent'` when it only took the data (Raw 9100, LPR).

## Batch 553 (PS-539 phase 2d: site agent printers in routing)

- `PrintJob.performingFacilityId` (Batch 553): the lab (site) whose release it is; Redirect stays on it.

## Batch 615 (part D) — vial and rack labels (PS-360)

`NetworkPrintLabelType` gains `VIAL` and `RACK`. `NetworkPrintLabelData.gs1DataMatrix` is now optional (cassette and slide only), and a new `vialRack` field carries `{ barcode, rackKind?, lines, zpl }`. For these two kinds `accessionNumber` may be empty (a rack belongs to no case). An engine built to the earlier contract still works: cassette and slide payloads are unchanged.

## Batch 732

- Batch 732: `NetworkPrintPayload.slide.slideSize` ('large_format' selects `ZPL-SLIDE-LF-V1`).
