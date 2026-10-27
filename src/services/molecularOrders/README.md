**Batch 617 (part R):** the server version(s) in this folder use the one route style `/api/<area>/<service>/<method-kebab>` (GET for plain-value reads, POST otherwise); earlier paths are in `docs/architecture/HTTP_ROUTE_MAPPING.md`.

# services/molecularOrders/

**NEW (Sep 2026)** — Protocol-Driven Workflow Infrastructure story, Part 2b. Real outbound queue for two genuinely distinct events: `'order.molecular'` (a real assay order — HPV co-test, HPV reflex genotyping) and `'order.instrument'` (a processing order to the ThinPrep processor at cytology batch creation). Deliberately separate from `services/accessioning/`'s own accession outbound queue — a different real concern (ordering an assay / notifying an instrument) — but follows its exact same established shape.

**Pattern:** Standard interface/mock pattern (`IMolecularOrderOutboundQueueService.ts` / `mockMolecularOrderOutboundQueueService.ts`), same real queue/retry/audit discipline as every other outbound queue in this app (`storageGet`/`storageSet`, `QUEUED`/`SENT`/`FAILED`, `DISPATCH_TIMEOUT`/`DISPATCH_UNREACHABLE`/`DISPATCH_REJECTED`).

## Files

- **`IMolecularOrderOutboundQueueService.ts`** / **`mockMolecularOrderOutboundQueueService.ts`** — the queue itself.

## The three real triggers that enqueue onto this queue

1. **Accession trigger** (`pages/AccessionPage/AccessionPage.tsx`, right after `caseRouter.createCase`) — reads `PathwayTask.sendOutboundOrder` for each specimen's own assigned protocol (`utils/resolveOutboundMolecularAssaysForProtocol.ts`, pure/tested) and enqueues an `'order.molecular'` entry (`orderReason: 'protocol_configured'`) per flagged assay. This is how the HPV co-test fires automatically for a ThinPrep specimen whose protocol has `st-hpv-reflex` (or the standalone `st-hpv-highrisk-screen`) configured with `sendOutboundOrder: true` on its `PathwayTask` — no separate HPV configuration service needed.
2. **Reflex trigger** (`services/hl7/processInboundHpvResultEvent.ts`) — when an inbound result is genuinely Positive and `HpvResultEventPayload.assayStainTypeId` was the standalone `st-hpv-highrisk-screen` (not the bundled `st-hpv-reflex`, which already implies its own reflex), enqueues an `'order.molecular'` entry for `st-hpv-genotyping` (`orderReason: 'hpv_reflex_genotyping'`, `reflexFromMessageId` tracing back to the original result's `messageId`). Closes the documented gap in `st-hpv-reflex`'s own Stain Dictionary description.
3. **Instrument trigger** (`services/batches/mockBatchService.ts`, `create()`) — at the moment a `'Cytology Processing'` batch is created, enqueues an `'order.instrument'` entry (`InstrumentOrderPayload`, keyed on `Batch.masterBarcode`) for the Hologic processor.

## Notes

- **`pages/MolecularOrderQueuePage/`** — **New (Sep 2026)**, per direct request: "we need to simulate or at least be able to demo our orders and inbound results for HPV testing." Confirmed directly first: none of this app's real outbound queues (accession, referral, cytology registry, this one) had any viewer UI at all before this. Scoped to what was actually asked for, not a generic queue-management system for every queue type. Routed at `/molecular-order-queue`, with a Home page tile. The demo panel operates against a real, already-existing seed case (`S26-5003-CYT-001`, Specimen A — already seeded with `cytologyScreening.hpvResult: 'Pending'`), never a synthetic case built from scratch: "Queue HPV co-test order" enqueues a real `order.molecular` entry via this folder's own `enqueue()`; "Simulate inbound HPV result" calls the real `processInboundHpvResultEvent()` directly — the same function a real interface engine's inbound HL7 ORU would call, never a separate demo-only code path. A Positive result against the standalone `st-hpv-highrisk-screen` assay visibly fires the real reflex genotyping order into the same table.

- `MolecularOrderPayload` vs `InstrumentOrderPayload` are a real discriminated union on `eventType` — `caseId` is undefined for an `'order.instrument'` entry, since a processor run is a real, physical batch of vials, not a single case (same real reasoning as `services/batches/`'s own `BatchItem` design).
- All three triggers are fire-and-forget (`.catch(console.error)`) — a real queueing failure here must never block accessioning, result ingestion, or batch creation from succeeding.

## Batch 406

`orderQueueView.ts` holds the Molecular Order Queue page's ordering (newest first) and payload check, moved out of the page. The page takes the queue service from `@/services`.

## Batch 457 — Metro General cancer registry, Molecular Order Queue seed

Pete: "Molecular Order Queue is still empty. Please add some seed data." `molecularOrderDemoSeed.ts` is the queue's starting content (made on first read and stored, so it returns after a Full Reset):
- S26-5001, S26-5002, S26-4650, S26-4651: high-risk HPV screen, sent.
- S26-5002: the reflex genotyping order its positive result triggered (`hpv_reflex_genotyping`), sent.
- S26-4652: failed, `DISPATCH_UNREACHABLE` twice (Panther 2 middleware), which is why its rack (`molecular/molecularDemoSeed.ts`) is still waiting.

S26-5003 is left for the page's own demo panel. The page is read-only: it lists the queue but has no Retry button.

## Batch 467 — In-house molecular orders (Pete's engine spec v1.1.0)

The in-house molecular order queue and plate binding engine. Contract: `docs/architecture/MOLECULAR_ORDERS_API.md`.

- `molecularOrderTypes.ts`: order statuses (ORDERED, QUEUED, PLATE_ASSIGNED, IN_RUN, RESULTED, CANCELLED), routing (IN_HOUSE, SEND_OUT), the order, the actions, refusal codes and the queue view.
- `molecularRouting.ts`: which routings an order may take for a test at a performing lab (in-house only where the test's `inHouseFacilityIds` lists the lab).
- `molecularPlateOrchestrator.ts`: binding orders to a draft plate's free wells, in row order, never on a control position the assay's control rule fixes; all or nothing; unbinding.
- `molecularOrderEngine.ts`: every state change and all audit events. Ingest from add-on orders, the queue view, actions (assign, remove, cancel, re-route), dispatch to IN_RUN, results to RESULTED, and filling the bound synoptic question. A signed-out case is never changed; an addendum draft is opened instead.
  - Capabilities: `molecular:order:assign-plate` (assign/remove) and `molecular:order:cancel` (cancel/re-route).
  - Re-validation: a queued in-house order whose lab no longer runs the test asks to be re-routed and can't go on a plate.
- `molecularOrderEngineLive.ts`: the engine on today's mock services, and `simulateMolecularRunResults` (demo only).
- `mockMolecularOrderStore.ts`: stored orders (`molecular_orders_v1`), seeds MO-2026-0467-01 (S26-4493 EGFR PCR, in-house, queued) and MO-2026-0403-01 (S26-4401 HER2 FISH, send-out to Summit).
- Tests: `molecularOrderEngine.test.ts`, `molecularPlateAndRouting.test.ts`.

The older outbound order queue (`IMolecularOrderOutboundQueueService`, HPV) is unchanged.

## Batch 467b — Molecular orders: send-out results, plate, sign-out, instrument

- **Send-out orders.** `onReferralDispatched` takes the send-out orders a referral batch carries to `IN_RUN` ("At the reference lab"). `onSendOutResults` applies a reference lab's coded results: by order id, or by accession and test when exactly one order fits, with an identity check. A report with no coded result gives the outcome `reportOnly`.
- **Choosing a lab.** `SET_SEND_OUT_LAB` chooses a queued send-out order's lab, from the test's approved labs or any active reference lab. It has its own capability, `molecular:order:set-lab`, and audit event `MOLECULAR_ORDER_LAB_SET`. This closes "no default lab".
- **Sending.** A referral batch carries an order only when the order's chosen lab is the batch's destination, the batch's requested test names its test, and its accession and specimen are in the batch.
- **Status-guarded writes.** `update` re-reads each order at save time and saves only if its status is still the expected one.
- **One result path.** In-house and send-out results share it (`applyResult`). An instrument's echoed `order_id` must match the order.
- **New `molecularSignOutCheck.ts`.** Answers still differing from their molecular result are a sign-out warning.
- **Live engine.** `simulateSendOutResult` (demo) goes through the real referral result processing.
- **Seed.** MO-2026-0467-02: MFT26-8801 MSI by PCR, send-out, no lab chosen.
- **Tests.** New: `molecularSignOutCheck.test.ts`. Send-out, lab choice and re-route cases added to `molecularOrderEngine.test.ts`.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 562

- `molecularQueueSelection.ts` (new): `keepSelectedInView`. Test: `molecularQueueSelection.test.ts`.

## Batch 616 (part C): server versions (PS-498 to PS-504)

Each service here (the molecular order outbound queue) now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are listed in `docs/architecture/MOLECULAR_API.md`. The mocks are unchanged.

## Batch 669 — mol-3, mol-9

- **mol-3.** `hasReflexOrder` / `simulatedResultMessage` in `orderQueueView.ts`. A positive standalone HPV screen adds one reflex genotyping order per specimen (a new message id no longer adds another); the inbound result reports `reflex: 'queued' | 'already-queued'`. The demo page shows processor codes through `molecularOrderQueue.outcome.*`.
- **mol-9.** The engine has `onPlateSuperseded(originalBatchUuid, clone)`: orders still PLATE_ASSIGNED on the superseded plate whose well the clone holds are pointed at the clone (same well; audit `PLATE_ASSIGNED`). `REMOVE_FROM_PLATE` on an order whose plate is already superseded no longer fails with `plateNotDraft`: the closed plate is left alone and the order goes back to Queued.
