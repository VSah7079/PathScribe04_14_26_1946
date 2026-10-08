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
