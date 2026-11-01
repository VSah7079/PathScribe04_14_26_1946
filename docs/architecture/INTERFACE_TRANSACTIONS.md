# Interface engine transactions

The outbound messages PathScribe hands to the interface engine (ForMedrixAI's engine, shipped with PathScribe — BridgeLink, Jira PS-331), and what the engine sends back. Each needs a channel route in the engine. Batch 434 started this list; `src/services/interfaceDispatch/interfaceTransactions.guard.test.ts` fails when it, the browser's `InterfaceTransactionType` and the development receiver (`functions/main.py`) disagree.

## The envelope

Every outbound message goes through `dispatchInterfaceMessage(queueEntryId, transactionType, payload)` (`src/services/interfaceDispatch/dispatchInterfaceMessage.ts`), posted as JSON:

```json
{ "queueEntryId": "…", "transactionType": "…", "dispatchedAt": "ISO 8601", "payload": { … } }
```

The engine builds the HL7 (or the vendor's format); PathScribe never does. HTTP 2xx means accepted; anything else is shown to the user as not sent (`DISPATCH_REJECTED`, `DISPATCH_UNREACHABLE`, `DISPATCH_TIMEOUT`) and kept for retry.

With the API server (`INTERFACE_ENGINE_EDGE.md`, Batch 545, decision D6): the API, never the browser, hands the envelope over (pushed to a hosted engine, pulled by an on-site one); a 2xx means *handed over*, and the message is settled by the receiving system's HL7 ACK, with resends, dead letters and alerts.

## Outbound transactions

<!-- interface-transactions:start -->
| transactionType | What it carries | Built by | Back from the engine |
|---|---|---|---|
| `A08` | Patient demographic update | `services/patients/buildPatientAdtPayload.ts` | — |
| `A40` | Patient merge | `services/patients/buildPatientAdtPayload.ts` | — |
| `A47` | Patient identifier change | `services/patients/buildPatientAdtPayload.ts` | — |
| `ORU_R01` | Final, amended or corrected result | `services/reports/buildOruR01Payload.ts` | — |
| `LIS_SYNC` | Case data synced to the LIS, and an Assist case's synoptic result | `services/reports/dispatchAssistSynopticResult.ts` and the LIS-sync queue (`pages/OutboundInterfaceDlqSection.tsx` resends) | — |
| `ORDER_CREATED` | A new order | `services/interfaceEngine/buildOrderCreationPayload.ts` | — |
| `REGISTRY_REPORT` | Screening registry submission | `services/screeningRegistry/submitScreeningRegistryResult.ts` | Acknowledgement (`docs/architecture/REGISTRY_ACKNOWLEDGEMENT_API.md`) |
| `CANCER_REGISTRY_REPORT` | Cancer registry report | `services/cancerRegistry/dispatchCancerRegistryReportIfApplicable.ts` | Acknowledgement (same) |
| `PRINT_JOB` | A report PDF for the engine to print (`INTERFACE_ENGINE_HANDOFF` print mode) | `services/printing/attemptPrintDelivery.ts` | Today any 2xx marks the job printed. *(Corrected in Batch 546: this said "a label for a network printer", confirmed by `PrintJobStatus`; network printing on site is the site agent's, `SITE_AGENT_API.md`.)* |
| `CRITICAL_ALERT` | Post-GA critical alert channels (not yet wired) | `services/clinical/postGaAlertChannels/` | — |
| `WSI_SCAN_MANIFEST` | The slides loaded in a WSI scan batch, for the slide scanner | `services/cytology/buildWsiScanBatchManifestPayload.ts` | Per-slide scan status (below) |
| `ACCESSION_EVENT` | An order accessioned, or an accession deficiency (`order.accessioned` / `order.deficiency.created`) (Batch 518) | `pages/AccessionPage` enqueues it; sent or resent from Audit Log → Interfaces → Outbound (`services/interfaceDispatch/outboundQueueActions.ts`) | — |
| `REFERRAL_MANIFEST` | A referral batch's manifest for the reference lab (Batch 518) | `services/batches/mockBatchService.ts` enqueues it; sent or resent from the Outbound view | Results (`ReferralResultEventPayload`) |
| `MOLECULAR_ORDER` | A molecular assay order, or an instrument order (`order.molecular` / `order.instrument`) (Batch 518) | `pages/AccessionPage`, Molecular Order Queue; sent or resent from the Outbound view | — |
| `MOLECULAR_WORKLIST` | A verified molecular plate's worklist for the instrument (`MOLECULAR_WORKLIST_CREATE`, Batch 669). In the demo the simulated engine receives it; with the API server configured the same JSON goes to `POST /api/v1/events/molecular-worklist` | `services/molecular/dispatchMolecularWorklist.ts` | Run results (`MolecularRunResultsPayload`) |
| `REPORT_DELIVERY` | A signed report PDF to send by e-fax or to drop as a file (Batch 520, PS-280). The receiving server delivers it (email-to-fax gateway; folder or SFTP target) and answers only once it is delivered: 200, or 503 not set up, 502 delivery failed. Contract: `REPORT_DELIVERY_API.md` | `services/reports/publishReportReleasedEvent.ts` (a delivery rule's fax or file-drop channel), `services/delivery/deliverReport.ts`; resent from the Outbound view | — |
| `BLOCK_ORDER` | One block's stain orders as an HL7 ORM^O01 for the embedding/staining instrument (Batch 605). PathScribe builds the ORM; the engine passes it on. | `services/interfaceDispatch/dispatchHardwareOrders.ts` | - |
| `SLIDE_ORDER` | A slide order for a labelling or staining instrument (Batch 605). | `services/interfaceDispatch/dispatchHardwareOrders.ts` | - |
| `SPECIMEN_LABEL` | A specimen container label for the engine to print or pass to a labeller (Batch 605). | `services/interfaceDispatch/dispatchHardwareOrders.ts` | - |
| `MATERIAL_SCAN_EVENT` | A barcode scan of a cassette or slide at a bench station, for tracking (Batch 605). | `utils/dispatchMaterialScanEvent.ts` | - |
| `CHARGE_DFT` | A charge as an HL7 DFT^P03 for the billing system (Batch 605). | `services/interfaceDispatch/dispatchCharge.ts` | - |
| `CHARGE_JSON` | A charge as the JSON billing webhook payload (Batch 605). | `services/interfaceDispatch/dispatchCharge.ts` | - |
| `FINANCIAL_CLASS` | The financial-class payload for a downstream billing engine; a preview payload until the formats exist (Batch 605). | `services/interfaceDispatch/dispatchCharge.ts` | - |
<!-- interface-transactions:end -->

## `WSI_SCAN_MANIFEST` (Batch 434)

Sent when a tech presses **Send to scanner** on Batch Management → Slide scanning (`services/digitalPathology/wsiScanBatchWorkflow.ts`). `queueEntryId` is the batch id.

```json
{
  "messageId": "uuid",
  "eventType": "WSI_SCAN_MANIFEST",
  "eventTimestamp": "ISO 8601",
  "batchId": "wsi-batch-…",
  "batchBarcode": "WSI-20261002-0001",
  "scannerInstrumentId": "APERIO_GT450_01",
  "slides": [
    { "slidePosition": "1", "caseId": "S26-4404", "specimenId": "S26-4404-SP-1",
      "blockId": "blk-…", "stainId": "stn-…", "slideLabel": "A1 H&E" }
  ]
}
```

- `scannerInstrumentId` is the Equipment register code of a `slide_scanner`; the engine maps it to the scanner (or its image management system).
- `slidePosition` is the rack and slot (`R7-3`) when the Slide Distribution Station recorded them, otherwise the order in the batch.
- `blockId`, `stainId` and `slideLabel` are present for slides loaded from the scanning queue.
- Until the engine accepts it, the batch stays **loaded** and the screen shows why; the tech can send again or unload.

**Back from the engine — scan status, one message per slide** (`WsiScanStatusUpdateEventPayload`, `src/types/events/`), processed by `services/hl7/processInboundWsiScanStatusUpdateEvent.ts` (idempotent on `messageId`):

```json
{ "messageId": "…", "batchId": "wsi-batch-…", "slidePosition": "1",
  "scanStatus": "scanning" | "completed" | "failed", "timestamp": "ISO 8601",
  "failureReason": "…", "qcPassed": true, "acquisitionMode": "single_plane" | "z_stack" | "focus_fusion", "focalPlaneCount": 9 }
```

The API server receives it at `POST /api/v1/events/wsi-scan-status` (system client only), applies it, and publishes `WsiScanBatchChanged` on the live hub so the Slide scanning page updates (`LIVE_UPDATES_SIGNALR.md` §11). When the last slide reports, the batch becomes `completed` (or `failed`).

## Through the API server: molecular worklists and results (Batch 467b)

These don't go through `dispatchInterfaceMessage`, so they aren't in the table above. The browser posts the molecular worklist to PathScribe's own API, `POST /api/v1/events/molecular-worklist` (PS-239's backend proxy), and the API server hands it to the engine; the engine's channel drives the instrument.

**Back from the engine:** the run's results at `POST /api/v1/events/molecular-run-results` (`MolecularRunResultsPayload`).

**Order ids (Batch 467b).**
- The worklist's sample wells carry `order_id`, the in-house molecular order the well holds.
- A result that echoes it must match the order in that well, or nothing is applied.
- Referral manifests name their send-out molecular orders (`molecularOrders`).
- A reference lab's result message can carry `orderResults`, one per order.

The full contract is `MOLECULAR_ORDERS_API.md` §7–8.

## Development receiver

`functions/main.py` → `receive_interface_message` stands in for the engine's receiving side so the JSON can be checked. It accepts every type above (Batch 434: it had stopped at `ORDER_CREATED`, refusing registry, print and alert messages) and checks a `WSI_SCAN_MANIFEST` has its batch, scanner and slides. In the browser demo, the developer tool at `/dev/mock-interface-engine` can answer these messages instead, and simulate the scanner's replies.


## Batch 739: the instrument order names the processor, not a vendor

An `order.instrument` payload is `{ masterBarcode, processorCode?, processorMake?, processorModel? }`: the liquid-based cytology processor (Equipment kind `lbc_processor`) chosen when the batch is made. The fixed `instrumentVendor: 'Hologic'` is gone. With no processor chosen, only `masterBarcode` is sent and the interface engine routes by its own rules.
