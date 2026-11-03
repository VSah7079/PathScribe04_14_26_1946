# Stain and scanner QC gate API (Batch 763)

**Source:** Pete's video feedback (Nov 2, 2026): "Missing QC gate: a Post-Stain / Pre-Distribution QC checkpoint with Option A (vendor sign-off via the interface engine) and Option B (native PathScribe QC), configurable per instrument". Scope (Pete): "Stainers and scanners". Product guide: `docs/product/STAIN_QC.md`.

**Status:** Built (Demo), browser side. The server side below is the contract for the API server (ASP.NET Core) and is **Planned**.

## 1. What the gate holds

- **A staining run** (one rack, `Batch` at `Staining`): when the stainer reports `Run Completed` (`setStainingInstrumentStatus`), or when the rack is moved on, PathScribe opens the run's QC. Its slides take the stain status `QC Pending`. The rack cannot move to `Checkout` (`advanceToNode` answers `stainQcPending`), and Slide Distribution refuses its slides (block scan: `blockHeldByQc`; slide scan: `qcPending`), until the run is decided.
- **A scanned image** (a digital slide unloaded from a scan batch): held when the scanner's mode needs it (`imageQcAtUnload`). The slide is `Scanned` with `lastScanOutcome: imageQcPending`, so its image state is `awaitingImageQc` and the Pathologist cannot open it until it is released.

## 2. Modes, per instrument

Each stainer and slide scanner in the equipment register has `Equipment.qcMode`; unset, it takes the lab's default (`StainQcSettings`: stainers `pathscribeSignOff`, scanners `autoAccept` out of the box).

| Mode | Staining run | Scanned image |
|---|---|---|
| `autoAccept` | passed at once, audited as auto-accepted | released at unload |
| `vendorSignOff` (Option A) | waits for the stainer's own sign-off message (§3); a supervisor with `stain:qc:override` can sign off instead | released when the scanner's own image check passed it, else held |
| `pathscribeSignOff` (Option B) | waits for a sign-off at the QC checkpoint on Slide Distribution | always held for a sign-off |

A run with no slides passes at once. A PathScribe sign-off is also recorded as the run's visual read (`confirmQcVisualRead`), so the sign-out QC gate (`resolveStainQcGate.ts`, PS-289) sees it.

## 3. The stainer's own sign-off (Option A)

`POST /api/v1/events/stain-qc-sign-off`, from the interface engine (the hospital's engine channel or PathScribe's; `INTERFACE_ENGINE_API.md`). Body: `StainQcSignOffEventPayload` (`src/types/events/StainQcSignOffEventPayload.ts`): `messageId`, `timestamp`, `masterBarcode` (the rack), `result` (`pass` or `fail`), `failedSlideIds` (all slides when omitted on a fail), `vendorRef`, `instrumentCode`.

Idempotent on `messageId`. The answer's `outcome`: `applied`, `already-applied`, `invalid-payload`, `batch-not-found`, `wrong-node` (the rack is no longer at Staining), `already-decided`, `not-vendor-mode` (the run is signed off in PathScribe; the result is not applied and the audit log says so). A failed slide is held for re-stain (the instrument cannot say re-cut); the technologist can ask for a re-cut on the case. Browser handler: `src/services/hl7/processInboundStainQcSignOffEvent.ts`. The stainer's `Run Completed` status message now carries `instrumentCode`, so the run knows its stainer.

## 4. Calls

Base `/api/stain-qc/stain-qc`. Reads are GET, everything else POST (`HTTP_SERVICES_PATTERN.md` §7). A refusal is a fixed code: `NOT_PERMITTED`, `NOT_FOUND`, `INVALID`, `ALREADY_DECIDED`, `NOT_VENDOR_MODE`.

| Method | Route | Capability | Body | Answer |
|---|---|---|---|---|
| `getSettings` | GET `/get-settings` | any of `stain:qc:sign-off`, `scan:image-qc:sign-off`, `config:stain-qc:manage` | | `StainQcSettings` |
| `saveSettings` | POST `/save-settings` | `config:stain-qc:manage` | `{ defaultStainerMode, defaultScannerMode }` | `StainQcSettings`; `INVALID` for an unknown mode |
| `getCheckpoint` | GET `/get-checkpoint` | `stain:qc:sign-off` (runs), `scan:image-qc:sign-off` (images) | | `QcCheckpoint`: pending runs and images, oldest first |
| `signOffRun` | POST `/sign-off-run` | `stain:qc:sign-off`; and `stain:qc:override` for a `vendorSignOff` run | `{ batchId, outcomes: SlideQcOutcome[], stainerEquipmentId? }` | `StainRunQc`; `INVALID` when a slide is missing or a failed slide has no follow-up; `ALREADY_DECIDED` |
| `decideImage` | POST `/decide-image` | `scan:image-qc:sign-off` | `{ stainId, outcome: 'pass' \| 'fail', reason? }` (a reason is required to fail) | `ImageQcItem` |

The system steps (opening a run when the stainer reports, holding images at unload, the stainer's own result) are the server's, not routes the browser calls; with an API server configured the browser does none of them (`stainQcSystem` in `stainQcServiceInstance.ts`).

A failed slide's follow-up: `restain` (stain status `QC Failed`) or `recut` (`Recut Requested`), with a reason (`STAIN_QC_FAIL_REASONS`). An image sent back is `In Scanning Queue` again with `lastScanOutcome: imageQcFailed` (reasons `IMAGE_QC_FAIL_REASONS`). Types: `src/services/stainQc/stainQcTypes.ts`; rules: `stainQcRules.ts`; contract: `IStainQcService.ts`.

## 5. Audit

Literal English, with the accession and no patient name:

| Event | When |
|---|---|
| `Stain QC Pending` | a run waits for QC (system) |
| `Stain QC Passed` / `Stain QC Failed` | a run decided: auto-accepted, by the instrument, in PathScribe, or in PathScribe instead of the stainer (override); per case, naming each failed slide, its reason and follow-up |
| `Stain QC Instrument Result Ignored` | a stainer's result for a run signed off in PathScribe |
| `Image QC Pending` | images of a scan batch held at unload (system) |
| `Image QC Passed` / `Image QC Failed` | an image released or sent back, with the reason |
| `Stain QC Settings Saved` | the defaults changed |

An instrument's own mode is saved with the equipment record (`config:equipment:manage`, audited there).

## 6. Serverless

Nothing needs a long-running process: the stainer's messages arrive on the stateless events route; opening a run happens inside the status event and `advanceToNode`; holding images happens inside `unloadScanBatch`; the checkpoint and configuration are stateless REST routes.

## 7. Not built

- The server routes and the events route above.
- Per-stain QC criteria (what to check for each stain); the reasons are a fixed list.
- Pushing a failed slide's re-stain or re-cut to the bench as a work item: the slide's status on the case (`QC Failed`, `Recut Requested`) and the Facility Operations wall show it.
