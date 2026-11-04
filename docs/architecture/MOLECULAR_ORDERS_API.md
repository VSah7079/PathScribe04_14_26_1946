# In-house molecular orders: API contract (Batch 467)

Pete's spec "In-House Molecular Order Queue & Plate Binding Engine" (v1.1.0, engine-driven). This file is the contract for the PathScribe API server (ASP.NET Core, SQL Server, SignalR). Today the same engine runs in the browser against the mock services: `src/services/molecularOrders/molecularOrderEngine.ts`, wired in `molecularOrderEngineLive.ts`.

**The first rule:** the engine decides; the screens don't. The Order Queue renders `GET /queue` and sends actions. It never works out a status, a well, or which actions an order offers.

## 1. Order status and routing

**`OrderStatus`:**
- `ORDERED`: reserved for an order that has been received but not yet checked. The browser engine checks on ingest, so an order goes straight to `QUEUED`.
- `QUEUED`
- `PLATE_ASSIGNED`
- `IN_RUN`
- `RESULTED`
- `CANCELLED`

**`ExecutionRouting`:**
- `IN_HOUSE`
- `SEND_OUT`

**State machine.** Anything not listed here is refused with `wrongStatus`.

| From | Event | To |
|---|---|---|
| (new) | ingest | `QUEUED` |
| `QUEUED` (in-house) | `ASSIGN_TO_PLATE` | `PLATE_ASSIGNED` |
| `PLATE_ASSIGNED` | `REMOVE_FROM_PLATE` | `QUEUED` |
| `QUEUED` (in-house, test no longer run in-house) | `REROUTE_TO_SEND_OUT` | `QUEUED` (send-out) |
| `QUEUED` / `PLATE_ASSIGNED` | `CANCEL` | `CANCELLED` |
| `PLATE_ASSIGNED` | worklist dispatched | `IN_RUN` |
| `IN_RUN` / `PLATE_ASSIGNED` | run results received | `RESULTED` |
| `QUEUED` (send-out) | `SET_SEND_OUT_LAB` | `QUEUED` (send-out, lab chosen) |
| `QUEUED` (send-out) | its referral batch is sent (Batch 467b) | `IN_RUN` (shown as "At the reference lab") |
| `IN_RUN` (send-out) | the reference lab's result | `RESULTED` |

### Routing (per test and facility)

- A molecular test (a `StainType` with category `Molecular`) lists the performing labs that run it in-house, in `inHouseFacilityIds`. These are set in the Stain Dictionary under "Run in-house at".
- When an order is for a performing lab on that list, the order is offered both routings, and in-house is selected first. Otherwise only send-out is offered (`molecularRoutingChoices`).
- The engine checks the requested routing again on ingest. A routing that isn't allowed is refused (`routingNotAvailable`).
- **Re-validation (Pete).** Every queue read and every assignment checks the matrix as it is now, not as it was when the order was placed.
  - If a lab stops running a test in-house, or the test is retired, its in-house orders that aren't running yet are flagged `needsReroute`.
  - A queued order (`"reroute"`) offers only `REROUTE_TO_SEND_OUT` and `CANCEL`, and can't be put on a plate. Plate assembly carries on for the other orders.
  - An order already on a plate (`"removeFirst"`) offers `REMOVE_FROM_PLATE` and `CANCEL`.
  - Re-routing uses the test's default reference lab, or its only approved one. If it has neither, the reference lab is left to be chosen.
  - Re-routing also moves the add-on slide order to the send-out queue, with that lab.
  - When an order is placed, the add-on order checks an in-house line against the matrix first and refuses it (`inHouseNotAvailable`), saving nothing.

## 2. Endpoints

### `POST /api/v1/molecular/orders/ingest`

Called when an add-on order is placed. There is one request per molecular slide order created; control slides are not included. The capability is `add-on:order:place`, and it is checked where the add-on order is placed.

```json
[{ "caseId": "S26-4493", "accession": "S26-4493", "specimenId": "S26-4493-SP-1", "specimenLabel": "A",
   "blockId": "blk-4493-a1", "blockLabel": "1", "assayTarget": "st-egfr-pcr", "routing": "IN_HOUSE",
   "sendOutLabId": null, "sendOutLabName": null, "performingLabFacilityId": "c-ent-dvmc",
   "stainOrderId": "addon-4493-egfr", "orderedBy": "PATH-001", "orderedByName": "Pete Nimmo" }]
```

The response has the `created` orders, and the `refused` requests with a code: `testNotFound` or `routingNotAvailable`. The slide orders are already saved by then, so the add-on order still succeeds; it tells the user how many molecular orders didn't reach the queue (`molecularNotQueued`). It never reports a failure, because that would invite a resubmit and duplicate slides.

### `GET /api/v1/molecular/queue`

Returns the queue view: `rows` (newest first) and `plates`.

**Each row (`queueItemSchema` plus display fields):**
- `orderId`, `caseId`, `accession`, `specimenBlock`
- `assayTarget`, `assayName`
- `routing`, `sendOutLabName`
- `status`
- `orderedByName`, `orderedAt`
- `plateBarcode`, `wellPosition`, `plateBatchId`
- `interpretation`, `hydration`
- `needsReroute`: `"reroute"` or `"removeFirst"`
- `statusLabel`: the status, or `SENT_OUT` for a send-out order at its reference lab
- queued send-out orders: `labChoices`, `sendOutLabId`, and `needsLab` when none is chosen
- `referralBatchId`: the referral batch that took a send-out order to its lab
- `actions`: the actions this row offers now.

**Plates:** the draft plates that a queued, routable in-house assay can go on. Each has `batchId`, `plateBarcode`, `instrument`, `assayTarget` and `freeWells`. A plate with no free wells is left out.

### `POST /api/v1/molecular/orders/action`

```json
{ "type": "ASSIGN_TO_PLATE", "orderIds": ["MO-2026-0467-01"], "batchId": "mb-demo-467-egfr" }
{ "type": "REMOVE_FROM_PLATE", "orderId": "…" }
{ "type": "CANCEL", "orderId": "…" }
{ "type": "REROUTE_TO_SEND_OUT", "orderId": "…" }
{ "type": "SET_SEND_OUT_LAB", "orderId": "…", "labId": "ref-summit" }
```

`SET_SEND_OUT_LAB` (Batch 467b, capability `molecular:order:set-lab`, audited `MOLECULAR_ORDER_LAB_SET`) chooses or changes a queued send-out order's reference lab. The lab must be one of the test's approved labs, or any active reference lab when the test has none (`labNotAllowed` otherwise). The add-on slide order takes the same lab. This is how a re-routed order, or a test with no default lab (MSI by PCR), gets its lab.

| Action | Capability |
|---|---|
| `ASSIGN_TO_PLATE`, `REMOVE_FROM_PLATE` | `molecular:order:assign-plate` |
| `CANCEL`, `REROUTE_TO_SEND_OUT` | `molecular:order:cancel` (high risk) |
| `SET_SEND_OUT_LAB` | `molecular:order:set-lab` (Batch 467b) |

The response is `{ ok: true, view }` (the new queue view) or `{ ok: false, refused }`.

**Refusal codes:**
- `notPermitted`
- `orderNotFound`
- `wrongStatus`
- `sendOut`
- `plateNotFound`
- `plateNotDraft`
- `assayMismatch`
- `plateFull`
- `routingNotAvailable`
- `testNotFound`
- `labNotAllowed`

**Cancelling** also cancels the add-on slide order the order came from (`stainOrderId`), and frees its well.

## 3. Plate binding (`wellBindingContract`)

```json
{ "wellPosition": "A03", "wellType": "SAMPLE", "orderId": "MO-2026-0467-01", "controlId": null }
{ "wellPosition": "A01", "wellType": "CONTROL", "orderId": null, "controlId": "NTC" }
```

This is implemented by `molecularPlateOrchestrator.ts`:
- **Which plates take orders.** Only a draft plate whose worklist hasn't been dispatched, and only for the plate's own assay.
- **Which wells are free.** Wells are taken in row order. A well is free when it holds no sample or control and isn't a fixed control position.
- **Control positions come from the assay's control rule payload.** `requiredControls` with `positionMode: "fixed"` reserve their wells, even before the control is loaded.
- **All or nothing.** Several orders are bound together, or none is (`plateFull`). A repeated order id counts once.
- **Partial plates.** A plate doesn't have to be full. When its worklist is dispatched, every order on it goes to `IN_RUN`.

## 4. Result hydration (`ENGINE_PUSH_TO_SYNOPTIC`)

A synoptic choice question names the tests that answer it, and which of its answers each call means. This is the field property `molecularResult`, set in the Synoptic Editor or in the template file:

```json
"molecularResult": { "assayCodes": ["st-egfr-pcr"], "values": { "POSITIVE": "egfr_detected", "NEGATIVE": "egfr_not_detected" } }
```

When a run's results arrive, each order on the plate is matched to the well that holds its `orderId`.
- **Identity check.** The result for that well must not name another accession or specimen. A mismatch, or a well that no longer holds the order, is never applied. The order stays `IN_RUN` with outcome `resultMismatch`, audited as `MOLECULAR_RESULT_MISMATCH`.
- **Otherwise** the order becomes `RESULTED`.
- **One order at a time.** Each order is saved as it is done. If one fails, it is left running, and the run isn't marked processed, so redelivering it finishes the job. Orders already resulted are skipped.

**A result is reportable** only when all of these hold:
- the controls passed;
- the call is `POSITIVE` or `NEGATIVE`;
- there is no flag (`LOW_SIGNAL`, `INHIBITED` and `REPEAT_REQUIRED` are not reportable).

**What a reportable result does.** The engine looks in the specimen's synoptics first, then the case's other synoptics, for the first bound question. The decision is made inside the case write, against the synoptic as it is at that moment. An answer typed while the run was processing is kept, and a report signed meanwhile isn't touched.

| The case and question | Outcome | What happens |
|---|---|---|
| Draft, question empty | `hydrated` | The question takes the answer. The source is recorded in `resultSources[fieldId]` (order, test, call, time). |
| Draft, same answer already | `hydrated` | The answer stays; the source is recorded. |
| Draft, different answer | `suggested` | The answer is kept and the result is recorded in `resultSources`. The synoptic shows the engine-delta tag ("Result differs") with the result's answer and **Use result**, so the pathologist accepts it or keeps their own. Nothing is overwritten. |
| Signed out (`finalizing`, `pending-countersign`, `pending-release`, `finalized`, `closed`) or the synoptic isn't a draft | `addendumQueued` | The report is never changed. An addendum draft is opened for the case's assigned pathologist, and audited as `MOLECULAR_RESULT_ADDENDUM_QUEUED`. |
| The same, but no draft could be opened (no assigned pathologist, or it failed) | `addendumNotOpened` | The report is unchanged. The queue says an addendum must be added by hand. |
| No bound question | `notBound` | Nothing in the report changes. |
| Not reportable, or the call has no mapped answer | `notReportable` | Nothing in the report changes. |
| A reference lab's report with no coded result | `reportOnly` | Nothing in the report changes; the answer is entered from the report. |

## 5. Audit events

All of these are emitted by the engine, never by a screen. Each one's `caseId` is the accession.

| Event | When |
|---|---|
| `MOLECULAR_ORDER_CREATED` | ingest |
| `MOLECULAR_ORDER_QUEUED` | ingest; taken off a plate; re-routed |
| `PLATE_ASSIGNED` | bound to a well |
| `WORKLIST_DISPATCHED` | the plate's worklist went to the instrument (system) |
| `RUN_RESULTS_RECEIVED` | the run's result for the order arrived (system) |
| `REPORT_FIELD_HYDRATED` | a synoptic question was answered or given the result as a delta (system) |
| `MOLECULAR_ORDER_CANCELLED` | cancelled (in addition to the spec's six) |
| `MOLECULAR_RESULT_ADDENDUM_QUEUED` | a result arrived after sign-out (in addition to the spec's six) |
| `MOLECULAR_ORDER_LAB_SET` | a send-out order's reference lab chosen or changed (Batch 467b) |
| `MOLECULAR_RESULT_MISMATCH` | a well's result names another specimen, or the well no longer holds the order; not applied (in addition to the spec's six) |

## 6. Server tables (SQL Server)

**`MolecularOrder`:**
- `OrderId` (PK), `CaseId`, `SpecimenId`, `BlockId`, `AssayTarget`
- `Routing`, `SendOutLabId`, `PerformingLabFacilityId`, `StainOrderId`
- `OrderedBy`, `OrderedAt`, `Status`
- `BatchId`, `WellPosition`
- `Interpretation`, `Flag`, `ControlsPassed`, `ResultReceivedAt`
- `HydrationOutcome`, `HydrationInstanceId`, `HydrationFieldId`, `AddendumId`
- `ReferralBatchId`, `ReferralLabId`, `SentAt` (send-out, Batch 467b)
- `CancelledAt`, `CancelledBy`
- `RowVersion`

`MolecularWell` gains `OrderId`.

Saves change single orders under their `RowVersion`, never a whole list. The browser engine re-reads each order at save time and saves only if it is still in the status the change expects (Batch 467b), so a change decided on an older copy never overwrites a dispatch, a send or a result that happened meanwhile.

`SynopticResultSource`: (`InstanceId`, `FieldId`) → `OrderId`, `AssayName`, `Call`, `At`.

**SignalR:** `molecularQueueChanged` goes to the Molecular Workcenter group. *Batch 562: sent as `DataChanged` with topic `molecularQueue` (`LIVE_UPDATES_SIGNALR.md` §14) to users who can open the Molecular Workcenter; the Order Queue re-reads when it arrives.* `caseChanged` goes to the case group when a question is answered.

## 7. Send-out orders (Batch 467b)

A send-out order follows its specimen's referral batch (`services/batches`, processing node "External Referral").

**Sent.** When the referral batch completes reconciliation, its tracking record is created first. The engine's `onReferralDispatched` then takes the send-out orders the batch carries to `IN_RUN`, and the manifest is enqueued. An order is carried only when all of these hold; anything less leaves it queued:
- the accession matches an item in the batch, and so does the specimen label when the item has one;
- the order's lab was chosen and is the batch's destination (an order with no lab yet is never swept up);
- the batch names the order's test: its requested test, a free-text field, is the test's catalog name or id (case and spaces ignored).

The manifest (`ReferralManifestEventPayload.molecularOrders`) names each order (`orderId`, `caseAccession`, `assayCode`), so the reference lab can echo the order id with its result.

**Results.** `ReferralResultEventPayload.orderResults` carries coded results, one per order:

```json
{ "messageId": "…", "batchId": "batch-…", "resultType": "discrete", "discreteResult": "MSI by PCR: MSI-H",
  "orderResults": [{ "orderId": "MO-2026-0467-02", "caseAccession": "MFT26-8801-CR-RES", "assayCode": "st-msi-pcr",
                     "interpretation": "POSITIVE", "flag": "NONE" }] }
```

`processInboundReferralResultEvent` records the result on the referral tracking record, then hands it to the engine (`onSendOutResults`).
- **Matching.** A result goes to its order by order id. Without an order id, the accession and test pick the order, but only when exactly one order fits; an ambiguous result stays on the referral record only.
- **Identity check.**
  - A result naming an order sent in another batch is not applied; the order is untouched and `MOLECULAR_RESULT_MISMATCH` is audited.
  - A result for an order in this batch that names another accession or test is not applied; the order shows `resultMismatch`, and it is audited.
- **Redelivery.** A redelivered result changes nothing.
- **Applying.** A matched result goes through the same result path as an in-house run (section 4). The reference lab's own QC stands in for controls.
- **No coded results.** A final report with none (a PDF) marks the batch's orders still waiting `RESULTED` with outcome `reportOnly`. A later coded result replaces it. An interim text message (say, "specimen received") changes nothing.
- **Retry.** If one order fails, the message isn't marked processed, so redelivery finishes it.

## 8. Instrument and interface engine (Batch 467b)

PathScribe never talks to an instrument directly.

**Worklist out.** The Plate Builder posts the worklist to PathScribe's own API, `POST /api/v1/events/molecular-worklist` (PS-239's backend proxy), and the API server passes it to the interface engine (BridgeLink, PS-331), which drives the instrument.
- Each sample well carries `order_id`, the order it holds (spec `wellBindingContract`).

**Results back.** The engine posts the run's results to `POST /api/v1/events/molecular-run-results` (system client only, `MolecularRunResultsPayload`).
- The server applies them with the same processing as the browser (`processInboundMolecularRunResults` → the order engine) and publishes `molecularQueueChanged`.
- A result's `order_id`, when the instrument echoes it, must match the order in that well, as well as the accession and specimen.

**Development.** With the Mock Interface Engine on (`/dev/mock-interface-engine`, development builds only), the worklist post is accepted. If an instrument call is chosen there (Positive or Negative; the default is no results, so nothing fills a report unasked), the mock plays the instrument: after a short run it reports that call for every patient sample, echoing each order id, through the real results processing (`services/mockInterfaceEngine/simulateMolecularInstrument.ts`).

**Demo builds.** These have no API server, so the Order Queue's demo buttons stand in for the instrument and the reference lab, through the same inbound processing.

**Still to build (server and engine, not front end):**
- the two API endpoints;
- the BridgeLink channel for each instrument's worklist and results;
- the referral manifest and result channels for each reference lab.

## 9. Not done in Batch 467 (closed in 467b)

Each item is now closed except the server and engine work in section 8:
- **Send-out results** reach their orders (section 7).
- **Plate builder.** It shows the order in each well: a corner mark, the tooltip, and a saved plate's well facts.
- **Sign-out.** An answer still differing from its molecular result asks first at sign-out (a warning; `services/molecularOrders/molecularSignOutCheck.ts`).
- **Real dispatch and results.** The front end is done; the server endpoints and BridgeLink channels remain (section 8).
- **Choosing a lab.** A send-out order with no lab gets one chosen in the Order Queue (`SET_SEND_OUT_LAB`).
- **Colorectal biomarker questions.** The Colorectal Further Investigations template's KRAS, NRAS, BRAF V600E and MSI questions are bound to their tests. Breast HER2 ISH status is bound to HER2 FISH.
