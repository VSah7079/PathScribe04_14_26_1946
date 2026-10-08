# Interface engine transactions

The outbound messages PathScribe hands to the interface engine (ForMedrixAI's engine, shipped with PathScribe — BridgeLink, Jira PS-331), and what the engine sends back. Each needs a channel route in the engine. Batch 434 started this list; `src/services/interfaceDispatch/interfaceTransactions.guard.test.ts` fails when it, the browser's `InterfaceTransactionType` and the development receiver (`functions/main.py`) disagree.

## The envelope

Every outbound message goes through `dispatchInterfaceMessage(queueEntryId, transactionType, payload)` (`src/services/interfaceDispatch/dispatchInterfaceMessage.ts`), posted as JSON:

```json
{ "queueEntryId": "…", "transactionType": "…", "dispatchedAt": "ISO 8601", "payload": { … } }
```

The engine builds the HL7 (or the vendor's format); PathScribe never does. HTTP 2xx means accepted; anything else is shown to the user as not sent (`DISPATCH_REJECTED`, `DISPATCH_UNREACHABLE`, `DISPATCH_TIMEOUT`) and kept for retry.

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
| `PRINT_JOB` | A label for a network printer | `services/printing/attemptPrintDelivery.ts` | `PrintJobStatus` over the live hub (`LIVE_UPDATES_SIGNALR.md` §10) |
| `CRITICAL_ALERT` | Post-GA critical alert channels (not yet wired) | `services/clinical/postGaAlertChannels/` | — |
| `WSI_SCAN_MANIFEST` | The slides loaded in a WSI scan batch, for the slide scanner | `services/cytology/buildWsiScanBatchManifestPayload.ts` | Per-slide scan status (below) |
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
