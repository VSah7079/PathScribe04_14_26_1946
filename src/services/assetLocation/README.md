# services/assetLocation/

Governed, real physical/asset location dictionary — mortuary storage (racks/trays/freezers), workstations, archive shelves. Built to address a real, confirmed concern: `MaterialLocation.location` (`types/case/Material.ts`) is deliberately free text (external LIS systems' own location vocabulary varies too much for a closed enum to ever be right for most real deployments), but that flexibility is a real typo/drift risk with zero visibility into it.

**Pattern:** follows `departments/`'s and `physicians/`'s exact governance shape — `status: 'Active' | 'Inactive' | 'Unverified'`, `autoCreated`/`autoCreatedAt`/`autoCreatedNote`, `findOrCreateByName()` — rather than inventing a new pattern. Same real reason those already work this way: an unrecognized incoming location shouldn't block a real material-location event from being applied; it should create a real, Unverified, autoCreated entry so an admin can reconcile it later.

## What's real and built

- **`IAssetLocationDictionaryService.ts` / `mockAssetLocationDictionaryService.ts`** — standard CRUD plus `findOrCreateByName()`. Case-insensitive EXACT match only, deliberately never fuzzy — mirrors `mockDepartmentService.ts`'s own identical reasoning: a real near-miss creates a new, real pending entry for a human to reconcile, never gets quietly folded into a possibly-different real physical location.
- **Wired into `services/hl7/processMaterialLocationEvent.ts`** as a parallel, fire-and-forget side effect. `MaterialLocation.location` itself is completely untouched — still free text, still tolerant of whatever an external LIS sends. This just builds a governed reference list alongside it, so drift is visible instead of invisible.
- Seeded with the exact example location strings `MaterialLocation.location`'s own doc comment already references ("Grossing Station 3", "Archive Shelf 12B"), plus one deliberately Unverified/autoCreated example, rather than fabricated seed data.
- Consumed directly by `services/autopsy/resolveMortuaryStorageOccupancy.ts` for the real mortuary-capacity/available-slots requirement (RFP-APLIS-2026-GLOBAL §IV) — matched against a specimen's own current `MaterialLocation` by case-insensitive name, never a stored ID reference (`MaterialLocation` has none).

## Real, deliberate scope not yet built

- ~~No admin/reviewer UI~~ — built: Configuration → System → Asset Location Dictionary (`components/Config/System/AssetLocationDictionarySection.tsx`) lists entries and verifies autoCreated ones.
- The "Validation by Exception" / narrativeText-redundancy-style governance UI discussed for the Managed Pathology Lexicon (`services/cytology/`) hasn't been proposed or built for this dictionary.

*Corrected in the Batch 496 README audit (Oct 9, 2026): the admin screen for this dictionary exists.*

## Batch 428: Configuration permissions

- `mockAssetLocationDictionaryService`: `add`, `update`, `verify`, `deactivate` need `config:asset-locations:manage`.

Before, anyone who could open Configuration could change this; now each change is checked in the service (`authorization/guardConfigWrites.ts`, audited) and a refusal changes nothing. Reads are unchanged. Seeds: Admin and Lab Director; see `docs/architecture/AUTHORIZATION_API.md`.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 617 (part A): server versions (PS-514)

`assetLocationDictionaryService` now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (the mock without an API server address, the server version with one). One route per interface method; the calls are listed in `docs/architecture/CONFIG_SERVICES_API.md`. The mocks are unchanged. The instance file imports the mock, so a test that loads the mock first may need to load the instance first (the mock can reach `@/services`, which reaches the instance).
