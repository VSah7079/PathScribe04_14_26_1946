# services/encounters/

**New folder**, per direct follow-up on the rest of Phase 0 (the Patient/Encounter Management Subsystem scoping conversation): the second genuinely missing piece, alongside the identifier crosswalk (`services/patients/`'s own README covers that one).

**Pattern:** Standard interface/mock pattern, matching `services/patients/` exactly — no firestore stub here either, for the same reason: the closely-related sibling this is modeled after doesn't have one yet.

## Files

- **`IEncounterService.ts`** — Real `Encounter` type + interface, per the original spec's own framing: "Ephemeral visit context," distinct from the Patient's own persistent identity. Same organisation-scoping reasoning as `MasterPatientRecord`. Real feature, per direct confirmation ("we will need to accept PV1 HL7 data... Location / Rooms... naturally associated to the Facility"): `locationId` links to `services/locations/` — see that folder's own README for the full PV1-3 resolution story. Working through the full list of ADT trigger events (per direct confirmation) added: `previousLocationId` (captured automatically by `updateLocation()` on every real transfer, so `cancelTransfer()` — A12 — can restore it reliably without trusting a cancel message's own PV1-3/PV1-6), `dischargeDisposition` (PV1-36, A03), and `hospitalService`/`admitSource`/`financialClass` (PV1-10/14/20, A08's real metadata fields).
- **`mockEncounterService.ts`** — `resolveOrCreateEncounter()` is the real entry point; never creates a silent duplicate for a repeat reference to the same real visit (same `organisationId` + `encounterNumber` pair always resolves to the one, existing encounter). Five real, narrow update methods, each matching `updateStatus()`'s own sequence-control discipline (a genuinely stale/out-of-order event, older than the encounter's current `lastEventAt`, is honestly rejected — never silently applied over newer state):
  - `updateStatus()` — status transitions (A03/A11/A13), now also carries `dischargeDisposition`
  - `updateLocation()` — real transfers (A02/A09/A10); captures `previousLocationId` automatically
  - `updateClass()` — patient class changes (A06/A07)
  - `updateMetadata()` — A08's real, previously-missing metadata effect; only the fields genuinely present in the update are changed, undefined fields are left as-is
  - `cancelTransfer()` — A12; restores `locationId` from `previousLocationId`, a genuine no-op (`applied: false`, not an error) when there's nothing to restore
- **`mockEncounterService.test.ts`** — 8 tests, including the duplicate-prevention guarantee and cross-organisation isolation. **Real gap, not yet closed:** the four new methods above (`updateLocation`/`updateClass`/`updateMetadata`/`cancelTransfer`) have zero test coverage yet — added to satisfy `IEncounterService`'s interface and get the project compiling again, but not yet exercised by a real test the way `updateStatus()` already is.

## Real consumer, wired in

`pages/AccessionPage/AccessionPage.tsx` — resolves a real encounter alongside the existing MPI patient resolution, but *only* when a real `encounterNumber` was actually captured from a resolved `IncomingOrder` (not every accession has one — a routine outpatient referral with no real visit/FIN concept genuinely doesn't). `Case.encounterId` (new, optional field on `Case`) carries the result. Real feature, per direct confirmation: `AccessionPage.tsx` also looks up the linked `Encounter` (via `getByEncounterNumber`) on order import specifically to auto-populate its own Location dropdown from `Encounter.locationId` — see `services/locations/README.md`'s own consumer section.

`pages/IntraopQueuePage.tsx` — a separate, direct consumer of `services/facilities/`/`services/locations/` (not `Encounter` itself — an intraop session predates formal accessioning, so there's no real `Encounter` to resolve against yet). See `services/intraop/README.md`.

## Real, honest status: ADT event handling

Working through the full list of ADT trigger events, per direct confirmation. `services/hl7/adtParser.ts` now parses A02/A05/A06/A07/A09/A10/A11/A12/A13 (see that folder's own README), and this folder's five update methods above exist specifically to apply what each one carries. **Not yet true**, and worth being direct about: `services/hl7/processAdtMessage.ts` doesn't call any of `updateLocation`/`updateClass`/`updateMetadata`/`cancelTransfer` yet — only `resolveOrCreateEncounter` (A01/A04) and `updateStatus` (A03) are actually wired into the real message-processing pipeline. A real A02 message today parses successfully (no longer throws) but its transfer never reaches a real `Encounter` record. This is genuinely in-progress, not a finished feature.

## Notes

- **Phase 3**: `updateStatus()` now enforces the same real, source-event-timestamp sequence control as `services/patients/`'s `updateDemographics()` — a genuinely stale status update (older `lastEventAt`) is honestly rejected, never silently applied over newer state.
- **Phase 4**: `resolveOrCreateEncounter()` (only for a genuinely new encounter) and `updateStatus()` (only when actually applied) now publish real, typed events via `services/events/mockPatientEventBus.ts` — see that folder's own README.
- `encounterClass` currently defaults to `'Outpatient'` at the one real call site — an honest placeholder, not a guess: `IncomingOrder` doesn't capture a real encounter class yet. Worth adding a real field there if/when this matters more (e.g. once inbound ADT ingestion — a later phase — actually carries one).
- `IncomingOrder.encounterNumber` (`services/orderIntake/`) was the bare, unstructured string this whole entity exists to give a real home to — a plain `encounterNumber?: string`, no real doc comment, on the type this folder's own header comment already referenced when scoping this work.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file.*
