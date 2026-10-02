# services/lisIngestion/adapters

Push and poll adapters that turn an LIS's inbound message into `NormalizedLisUpdate`s (`../types.ts`) for the Assist staging queue:
- `hl7v2StatusAdapter.ts`: HL7 ORU^R01, ORM^O01 and OML^O21. It reads the status, the time, and the gross, micro and diagnosis text by LOINC.
- `webhookJsonAdapter.ts`: PathScribe's JSON webhook contract.
- `mockPollAdapter.ts`: the demo poll source.

Tested in `adapters.test.ts`.

**Batch 426.** Both push adapters also carry the LIS's placer and filler order numbers:
- the HL7 adapter reads ORC-2/ORC-3, or OBR-2/OBR-3 if those are missing;
- the webhook takes `placerOrderNumber` and `fillerOrderNumber`.

They are echoed on the structured synoptic result (`docs/architecture/SYNOPTIC_RESULT_API.md`).

---
*When this folder's contents change meaningfully, update THIS file.*
