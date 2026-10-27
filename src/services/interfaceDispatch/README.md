# services/interfaceDispatch

`dispatchInterfaceMessage(queueEntryId, transactionType, payload)`: wraps a payload in the envelope the interface engine receives (ForMedrixAI's engine, shipped with PathScribe; a site's own engine only when the site insists, with ForMedrixAI's adapter code deployed into it. Batch 424 corrected earlier wording that called it the hospital's engine) and POSTs it to `VITE_INTERFACE_RECEIVER_ENDPOINT`. Every outbound queue (ADT, results, LIS sync, orders, registries, print, critical alerts) sends through it; it never builds a payload itself.

## Batch 420

`InterfaceTransactionType` gains `CANCER_REGISTRY_REPORT`. Cancer registry reports are now dispatched through here (before Batch 420 they were queued and never sent).

## Batch 424

`registryPayloadBoundary.ts` is the last check before a registry payload leaves, run inside `dispatchInterfaceMessage`:
- **On a validation instance:** only test-environment payloads carrying the synthetic marker, for a synthetic (`SYN-`) patient.
- **On production:** only production payloads with neither.

Anything else is refused as `DISPATCH_REJECTED`, with the reason stored on the queue entry. The engine adapter should repeat this check.

**Correction:** the first line of this README now names the engine correctly. It is ForMedrixAI's, shipped with PathScribe; a site's own engine is used only when the site insists.

## Batch 434

`InterfaceTransactionType` gains `WSI_SCAN_MANIFEST`: a WSI scan batch's manifest (`services/digitalPathology/wsiScanBatchWorkflow.ts`). The engine adapter needs a route for it (PS-331).

## Batch 435

- `interfaceTransactions.guard.test.ts`: `InterfaceTransactionType`, `docs/architecture/INTERFACE_TRANSACTIONS.md` (the engine's routing list, PS-331) and `functions/main.py` must list the same types.
- The development receiver had stopped at `ORDER_CREATED`; it now accepts all of them.

## Batch 444

Environment settings here are read by full name (`import.meta.env.VITE_X`). The previous whole-object forms made Vite copy every `VITE_` variable into the bundle (`services/security/envExposure.guard.test.ts`).

---
*When this folder's contents change meaningfully, update THIS file.*

## Batch 518: every outbound queue can be resent (PS-122)

- **`outboundQueueAdapters.ts`** (+ test): one adapter for each of the seven outbound queues. Each adapter reads its queue, marks entries, describes them and builds the message to send.
  - The seven queues: patient ADT, results, Assist LIS sync, accession events, cytology results, referral manifests and molecular orders.
  - Four of these had no screen before: accession events, cytology results, referral manifests and molecular orders.
  - A cytology result is rebuilt from its sign-out record. Accession events, referral manifests and molecular orders send the message stored on the entry.
- **`outboundQueueActions.ts`** (+ test): Dispatch now, Resend, Simulate failure and Capture as CAPA.
  - Sending, resending and simulating check `interface:outbound:resend`, with the case.
  - An entry is marked SENT only when the send succeeds. A message that can't be built, or is held back, is marked FAILED with the reason and never posted.
  - This logic moved here from the screen.
- **`outboundQueueDeps.ts`**: the real dependencies the actions use.
- **New transaction types:** `ACCESSION_EVENT`, `REFERRAL_MANIFEST` and `MOLECULAR_ORDER`.
  - They are listed in `docs/architecture/INTERFACE_TRANSACTIONS.md` and accepted by the development receiver (`functions/main.py`). `interfaceTransactions.guard.test.ts` keeps all three in step.
  - **Correction:** my first Batch 518 comment said the receiver lives in a separate repository. It is `functions/` in this one, and the comment is fixed.

## Batch 520 (PS-280)

- New transaction type `REPORT_DELIVERY` (e-fax and file drop, `services/delivery/deliverReport.ts`). It is listed in `INTERFACE_TRANSACTIONS.md` and accepted by `functions/main.py`.
- The Outbound view has an eighth queue, report delivery (`outboundQueueAdapters.ts`). A resend reads the case's signed PDF again and, for a fax with no number yet, looks for the recipient again.

## Batch 532

`outboundQueueAdapters.ts`: a cytology queue entry with `scope: 'case'` is retried by rebuilding the consolidated case message (`cytology/cytologyCaseReportMessage.ts`); it is held, with the reason, when the PDF can't be built.

## Batch 533

`outboundQueueAdapters.ts`: a cytology entry with `scope: 'preliminary'` is retried by rebuilding the preliminary from the release kept on the case.

## Batch 538

`outboundQueueAdapters.ts`: a result-message retry (surgical and cytology, preliminary included) sends the entry's `reportDocumentId`, the release's stored document, when it has one.

## Batch 539

`outboundQueueAdapters.ts`: the retry of a cytology message queued one specimen at a time gets its PDF from the report renderer (`generateCytologyReportPdfSnapshot`) and stays held when it can't be made; it no longer loads a print font or draws the PDF in the browser.

## Batch 547

Deployment settings here are read through `appEnv()` (`services/runtimeConfig/`): the deployment's `config.json` at start-up, else the build's `VITE_*` value (`docs/architecture/RUNTIME_CONFIG.md`).

## Batch 556 (PS-539 phase 2d: report documents through the API)

- Batch 556: cytology result retries read their stored document through `reportDocuments/reportDocumentInstance.ts`.

## Batch 559 (PS-539 phase 2d)

- `outboundQueueAdapters.ts`: a result held for any reason but "not found" stays held on retry (now also `version_unknown`), and a retry records the hash of the PDF it sent.

## Batch 561 (PS-539 phase 2d)

- Test: `outboundResultRetry.test.ts` (a retried result held while its workup version isn't known; the retry's PDF hash recorded).

## Batch 605

`dispatchInterfaceMessage` sends to the simulated engine when `isEngineSimulated()`. New types: BLOCK_ORDER, SLIDE_ORDER, SPECIMEN_LABEL, MATERIAL_SCAN_EVENT, CHARGE_DFT, CHARGE_JSON, FINANCIAL_CLASS (mirrored in `functions/main.py` and `docs/architecture/INTERFACE_TRANSACTIONS.md`). `dispatchHardwareOrders.ts` builds and sends block, slide and specimen label orders; `dispatchCharge.ts` sends queued charges at sign-out (`dispatchQueuedChargesForCase`), from the DFT preview, and the financial-class payload.

**Batch 619 (PS-800):** `outboundQueueActions.ts` gained `isHeld` (a dependency) and the outcome `onHold`: Dispatch Now and Retry refuse a message held on the Outbound Queue screen (`services/outboundQueue/`).

## Batch 634

`resolveDispatchOrganisation.ts` (+ test): the one patient-index lookup the cytology and surgical dispatchers share. It uses `patientIndexService` (the demo's or the API server's) and, when there is no organisation to queue against, writes a `CYTOLOGY_DISPATCH_SKIPPED` or `SURGICAL_DISPATCH_SKIPPED` audit entry (case and reason) instead of skipping silently. No organisation id is invented.

## Batch 669 (mol-7)

New transaction type `MOLECULAR_WORKLIST`: a verified molecular plate's worklist (`MOLECULAR_WORKLIST_CREATE`). `services/molecular/dispatchMolecularWorklist.ts` sends it through `dispatchInterfaceMessage`, so in the demo the simulated engine receiver answers and keeps it. Added to `InterfaceTransactionType`, `docs/architecture/INTERFACE_TRANSACTIONS.md` and `functions/main.py`.
