**Batch 738:** orders ord-038 (Video 1's colon resection) and ord-039 (outside slides for consultation); ord-019 split into six prostate sites; crosswalk codes COLRES-T, PROS-NBX, CONSULT-OS; ord-001 to 003 dated relative to the reset.

**Batch 645:** `IncomingOrderSpecimen` has an optional `containerBarcode`. Lockbox Drop-Off matches a scanned barcode against an order's `externalOrderNumber` and this field (`services/lockbox/lockboxRules.ts`); nothing else reads it yet and no importer fills it, so today a scan matches the order number.

**Batch 617 (part R):** the server version(s) in this folder use the one route style `/api/<area>/<service>/<method-kebab>` (GET for plain-value reads, POST otherwise); earlier paths are in `docs/architecture/HTTP_ROUTE_MAPPING.md`.

# services/orderIntake/

The pending-orders queue an accessioner pulls from, and the resolution chain turning a raw external order into real Client/Department references.

**Pattern:** Standard interface/mock pattern (no firestore stub currently).

## Notes

- Multi-step design: raw IncomingOrder never written directly into Case; Facility resolution reuses Facility.assigningAuthority as the crosswalk key; Specimen resolution needs its own crosswalk since the same external code means different things at different facilities.
- **Real admin UI, closing a gap flagged directly.** `listCrosswalkEntries`/`addCrosswalkEntry` were real and already implemented, with zero UI anywhere — confirmed directly. Now has one: `components/Config/Integrations/CrosswalkSection.tsx`, in the new Integrations config tab *(since moved: `components/Config/System/CrosswalkSection.tsx`, Configuration → System, Integrations group — the Integrations tab was retired; checked in the Batch 496 README audit)*. Shows both admin-entered mappings and the real, system-learned "pending" entries `resolveOrder()` already creates on an unrecognized code, distinguished by `createdBy`. **CSV/spreadsheet import added** (same two-step preview-then-apply shape as Stain/Specimen Dictionary) — Facility and specimen type matched by *name*, not id, since a real customer's spreadsheet has no way to know PathScribe's internal ids; an unresolvable name surfaces as a visible per-row error rather than being silently skipped or guessed at. Matching an existing `[clientId, externalCode]` pair now updates rather than erroring/duplicating, which needed a new `updateCrosswalkEntry()` method — the interface previously only had `add`.
- **Order-type-mapping work, Step 1 of a multi-step build (types only, no behavior change yet):** cross-checked an external "Order Type Mapping" spec against this codebase before building anything — confirmed real overlap with what's already here (`SpecimenCodeCrosswalkEntry` already resolves to a `SpecimenEntry` that carries both category AND subspecialty, so no new "Order Type Dictionary" entity is needed) rather than building a parallel system. `SpecimenCodeCrosswalkEntry` gained two optional fields: `codingSystem` (`'HL7_LOCAL' | 'LOINC' | 'SNOMED'` — a real crosswalk entry can now be scoped to a specific coding system, not just a bare code string) and `siteId` (optional per-`Organisation`-`Site` scoping, for a multi-site organisation that wants the same client's code to route differently per site — absent means org-wide, same convention as `Facility.performingLabFacilityId`'s own undefined-means-global pattern). `IncomingOrderSpecimen` gained `externalCodingSystem` to match, populated by the interface engine (PathScribe doesn't parse raw HL7 itself — see `services/hl7/README.md`'s own architecture note). New `utils/normalizeOrderCode.ts` provides the real normalization pass multi-coding-system priority matching will need. Next real step: wire multi-code priority matching (local → LOINC → SNOMED → description fallback) into `resolveOrder()`, and raise a real `InterfaceException` (`eventType: 'unmapped_order_code'` — see `services/interfaceExceptions/README.md`) alongside the existing auto-create-and-continue fallback, not instead of it. *(Since partly done: `resolveOrder()` now matches by coding system (`findCrosswalkMatch`, with `normalizeOrderCode`) and raises an `unmapped_order_code` interface exception alongside the auto-create fallback. Site-scoped matching is still not possible, because `IncomingOrder` carries no site. Checked in the Batch 496 README audit.)*

## Batch 428: Configuration permissions

Changing the specimen code crosswalk (`addCrosswalkEntry` / `updateCrosswalkEntry`) needs `config:crosswalk:manage`. Order intake itself is unchanged.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 714: clinical indication from the order

`clinicalIndicationFromOrder.ts` is the pure rule that picks an order's clinical indication and names its source (OBR-31, ORC-16, DG1, NTE, FHIR reasonCode, reasonReference; first with text wins, nothing invented). It is the contract for the server: no inbound HL7/FHIR order parser exists in this repo (`docs/architecture/ACCESSIONING_API.md` section 1a). `IncomingOrder.clinicalIndicationSource` carries the source. `clinicalIndicationProvenance.ts` decides order / editedFromOrder / entered for the Accession screen and builds the additive `Case.order` fields.

## Batch 605

Batch 605: `IncomingOrder.siteId` (optional) and `findCrosswalkMatch(..., siteId)`: the entry for the order's site wins, then organisation-wide entries; a site-only entry never matches another site. The crosswalk admin has a Site picker.

Batch 616 (part A, PS-505): `httpOrderIntakeService.ts` and `orderIntakeInstance.ts`. Contract `docs/architecture/ACCESSIONING_API.md` sections 1 and 2.

## Batch 716: cytology demo orders

`cytologyDemoOrders.ts`: eight fictional pending orders (`ord-030` to `ord-037`: Pap with HPV co-test, ThinPrep Pap, HPV-only swab, thyroid FNA, lymph node FNA, urine, pleural fluid, breast FNA), each naming a dictionary entry exactly so Import from Order resolves it. `ORDERS_SEED_VERSION` is now `'3'`, so existing browsers merge them in. The HPV co-test request is in the clinical indication text (an order has no structured HPV field).
