# services/batches/

Container/batch chain-of-custody for cassettes and slides moving through downstream histology processing nodes (Decal/Special Processing, Processing, Embedding, Microtomy/Sectioning, Staining, Checkout) — real scan-based tracking, reconciliation, and QA discrepancy logging via container barcodes (`CONT-`/`RACK-` prefixes).

**Pattern:** Standard interface/mock pattern (`IBatchService.ts` / `mockBatchService.ts`), plus two real, computed-not-stored pieces layered on top.

## Files

- **`IBatchService.ts`** — the contract: `Batch`, `BatchItem`, `BatchProcessingNode`, all real node names, and the disposable-container-vs-semi-permanent-rack identifier modes.
- **`mockBatchService.ts`** — the real, active implementation. `addItemByScan()` is the only way a `Batch.items[]` array ever grows — there is no pre-population of "expected" items before a real scan happens.
- **`DecalBatch.ts`** — decalcification-specific batch fields (acid type, target duration, alert timer) layered onto the base `Batch` shape for the Decal/Special Processing node.
- **Cytology nodes — `'Cytology Processing'`, `'Cytology Staining'`, `'Cytology Imaging'`** (`IBatchService.ts`) — per the Protocol-Driven Workflow Infrastructure story's Part 2a. Cytology's own real equipment chain (ThinPrep processor -> stainer rack -> imager), same real manifest/reconciliation shape as every other node, plus node-specific fields: `Batch.cytologyInstrumentStatus` (ThinPrep run status, updated inbound via `services/hl7/processInboundCytologyInstrumentStatusEvent.ts`), `Batch.cytologyStainTypeId` (stain protocol selected from the Stain Dictionary at batch creation), `BatchItem.fovCount` (imager-reported field-of-view count per slide, captured at scan-in). Two real completion side effects, gated by node, alongside `dispatchReferralIfApplicable()`: `transitionSlidesToReadyForScreeningIfApplicable()` (Cytology Staining — reuses the existing `'Ready for Review'` StainOrderStatus rather than a near-duplicate string) and `triggerAiScreeningOrderIfApplicable()` (Cytology Imaging — the real first caller of `mockAiScreeningResultService.order()`, closing the Story 10 gap; resolves the AI vendor via `getByModality('cervical_cytology')` rather than a hardcoded vendor ID).
- **`referralDestinationFacilityId`/`referralTestRequested`** (on `Batch` itself, `IBatchService.ts`) — real, per direct follow-up on the RFP-APLIS-2026-GLOBAL Inter-Laboratory Specimen Referral gap ("review the Batch operations as this is the logical place to host this functionality"). A `BatchProcessingNode`, `'External Referral'`, reuses this same real scan/manifest/reconciliation architecture for an outgoing referral to an external reference lab — genuinely the same real shape as every internal processing node, just with a real `Facility` (carrying the new `reference_lab` role, `services/facilities/`) as the destination instead of an internal station. `dispatchReferralIfApplicable()`, called from both real completion paths (`completeReconciliation`, `overrideAndComplete`), automatically enqueues the real outbound manifest and creates a tracking record the moment a referral batch genuinely completes — see `services/referral/README.md` for the rest of that real, separate module.
- **`coldChainExcursion`** (on `Batch`, `IBatchService.ts`) — real, per direct follow-up on the RFP-APLIS-2026-GLOBAL Reference Laboratory Sensor & Cold-Chain Integration gap. Gates `completeReconciliation()` the same real, hard-stop-with-supervisor-override way missing/unexpected items already do — set by `processInboundTelemetryReadingEvent.ts` (`services/coldChain/`) the moment a genuine temperature excursion is detected on a smart `HardwareContainer` currently checked out to this batch; cleared only by a real, explicit `acknowledgeColdChainExcursion()` call, never silently or merely because a later reading came back normal. See `services/coldChain/README.md` for the full account.
- **`computePendingBatchQueue.ts`** (+ `.test.ts`) — real, computed queue: every block/slide that physically exists (`Grossed`/`Embedded`/`Exhausted` status) but whose own `displayId` doesn't appear in any active batch's manifest yet. Deliberately unscoped by facility — a freshly printed cassette has no `locationHistory` yet, so there's no real location signal to scope by. Surfaced at `/batch-management/pending-load`.

## Notes

- Retention/disposal does **not** run through this batch/container model at all — see `services/retentionPolicy/README.md`. Disposal is a genuinely different workflow (a computed, scan-to-act queue, not a manually-created batch).
- `computePendingBatchQueue.ts` follows the same "derive fresh every time, never a separately stored, driftable copy" discipline as `computeDisposalQueue.ts` in `retentionPolicy/`. (There is no separate active-retention-holds queue file; holds are shown per case and enforced by the disposal queue.)
- **Real, new consumer (PS-288, Sep 2026):** `services/facilityOpsDashboard/` reads active batches across `Processing`/`Decal / Special Processing`/`Checkout`/`Embedding`/`Microtomy / Sectioning`/`Staining`/`Cytology Staining`/`External Referral` for its five real department dashboard views — real `Batch.priority`/`coldChainExcursion` drive that Epic's own high-contrast alerting, and `DecalBatch.ts`'s own `getDecalTimerState` math was generalized (not duplicated) into `computeSlaCountdown.ts` for reuse across every view. Confirmed directly before building: `Batch` has no direct `facilityId` — `services/facilityOpsDashboard/resolveBatchFacilityId.ts` joins through `BatchItem.caseAccession` → `Case.originHospitalId`, falling back to `Batch.stationId` → `ScanStation.facilityId`. Read-only; nothing in this folder's own files changed.

*Corrected in the Batch 496 README audit (Oct 9, 2026): removed `computeActiveRetentionHoldsQueue.ts`, which does not exist.*

## Batch 404

- `mockBatchService.ts`:
  - `abort` needs a reason (Pete) and `batch:run:abort`.
  - `overrideAndComplete` needs `batch:reconciliation:override`.
  - `acknowledgeColdChainExcursion` needs `batch:cold-chain-excursion:acknowledge`.
  - A refusal returns `BATCH_NOT_PERMITTED` or `BATCH_REASON_REQUIRED` (constants in `IBatchService.ts`), and the screen shows its own text for them.
  - Test: `batchCustodyActions.test.ts`.
- `batchDemoSeeds.ts` (+ test): three demo batches, one per override. They are added to stored batches when missing.
- `batchFormHelpers.ts` (+ test):
  - `deriveNodeFromStation`, moved from the New Container dialog.
  - Locale-key maps for container types and decal solutions.

## Batch 407

- `mockBatchService.ts`: every refusal is a code from `BATCH_ERRORS` (`IBatchService.ts`, with `isBatchErrorCode`) instead of an English sentence. Scan-in refusals carry the item's `displayId` or what was `scanned`, and `reason` stays in English for logs.
- `computePendingBatchQueue.ts` gains `filterPendingBatchQueue` and `groupPendingByCase`, which moved out of the Pending Batch Load page.

## Batch 408

`batchListView.ts` (new, pure) holds:
- `openBatches`, `closedBatches` and `openCountByNode`, for the Batch Management list;
- `reconciliationGate`: missing items, unexpected scans and an unacknowledged cold-chain excursion, in the order the service checks them. `mockBatchService.completeReconciliation` uses it too, so the Complete button and the service can't disagree.

## Batch 458 — PS-71: every case save carries its version

PS-71 (Pete's optimistic-locking spec, Oct 4): a save made from an old copy of a case no longer overwrites someone else's newer save. See `services/cases/caseWrite.ts` and `docs/architecture/CASE_API.md`.

Moving slides to Ready for Screening is versioned per case; a lasting conflict reaches the existing failure path with no success audit.

## Batch 460

`computePendingBatchQueue.ts` names each slide by its printed level (`material/slideLevels.ts`), so a reordered slide's queue entry matches its barcode.

## Batch 467b — Molecular orders: send-out results, plate, sign-out, instrument

When a referral batch is dispatched, its send-out molecular orders are marked sent, and the manifest names them (`molecularOrders`). This happens asynchronously and never blocks the referral.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 511 (PS-478): full strict type-checking

Auto-appended control slides use the case id when a case has no full accession. Control cases always have one, so nothing changes today.

## Batch 526

Test files here no longer set their own time limit below the suite's 60 s (`vitest.config.ts`); on a busy Windows machine those shorter limits caused false timeouts.

## Batch 617 (part A): server versions (PS-514)

`batchService` now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (the mock without an API server address, the server version with one). One route per interface method; the calls are listed in `docs/architecture/CASE_WORKFLOWS_API.md`. The mocks are unchanged. The instance file imports the mock, so a test that loads the mock first may need to load the instance first (the mock can reach `@/services`, which reaches the instance).

## Batch 669 (finding batch-1)
`batchListView.ts` gained `reconciliationScanOutcome(before, after)`: a reconciliation scan is Matched (an item newly became Matched), Already matched (nothing changed) or Unexpected (the Unexpected list grew). A rescan of a Matched item no longer flashes the red Unexpected warning (`BatchDetailView.tsx`; message `batchDetail.alreadyMatchedFlash`). Tests in `batchListView.test.ts`.
