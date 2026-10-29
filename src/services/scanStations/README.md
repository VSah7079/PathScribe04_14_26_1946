**Batch 617 (part R):** the server version(s) in this folder use the one route style `/api/<area>/<service>/<method-kebab>` (GET for plain-value reads, POST otherwise); earlier paths are in `docs/architecture/HTTP_ROUTE_MAPPING.md`.

# services/scanStations/

Registry of physical scan/work stations — where a tech actually scans a specimen at the bench — facility-scoped, with an Active/Inactive/Unverified lifecycle and a real workflow-stage mapping. A genuinely different real entity from `services/locations/` (which tracks where a *patient* is physically placed, ward/room/bed, HL7 PV1) and from `services/hardwareContainers/` (a reusable rack that moves between stations, not a fixed station itself).

**Pattern:** Standard interface/mock pattern (no firestore stub currently), same established shape as `services/locations/`.

## Files

- **`IScanStationService.ts`** — the contract: `ScanStation` (barcode code for `STATION:`-prefix switching, `workflowStage`, `facilityId`, lifecycle status).
- **`mockScanStationService.ts`** — the real, active implementation.
- **`validateScanStationDraft.ts`** (+ `.test.ts`) — real, pure validation for the admin add/edit form. **Real fix (Workstation & Hardware redesign):** `facilityId` had no validation at all before — the free-text UI field it used to pair with defaulted to a fake, always-non-empty `'lab-main'` string, so a required-field check would never have fired anyway. Now a real, live rule, since the field is a real dropdown with no default selection.

## Notes

- **Real fix (Workstation & Hardware redesign), per direct guidance:** `ScanStation.facilityId` was always correctly typed as a real Facility reference, but the admin UI (`ScanStationsSection.tsx`) rendered it as free text with a fabricated `'lab-main'` default that matched no real Facility record. Now a real dropdown sourced from `getActivePerformingLabs()`, same convention as every other lab-scoped dictionary in this app; the 8 seeded stations were corrected to point at a real, existing performing-lab Facility (`c-fenwick-general`) instead. The section also now accepts an optional `selectedFacilityId` prop, filtering its own list when the new Workstation & Hardware group-level Facility Selector (`components/Config/System/index.tsx`) has one selected.
- The current effective scan station drives real, downstream behavior throughout the app (material scan tracking, print routing, cassette color resolution context) — see `hooks/useEffectiveScanStation.ts` and `hooks/useCurrentScanStation.ts` for how a station gets resolved and threaded through.
- **Real, new consumer (PS-287, Sep 2026):** `getAll()`, filtered by `workflowStage` and `facilityId`, is now how `utils/addOnOrderOperations.ts`'s own `resolveRoutingStations()` shows a pathologist's add-on order which real stations it would actually reach — per that ticket's own direct Jira comment, scoped to the case's own performing lab (via `services/cases/casePoolAssignmentService.ts`'s `resolveCasePerformingLab()`), never an enterprise-wide list. Display-only — this doesn't dispatch cutting itself, that stays PS-284's own bench. Read-only; nothing in this folder's own files changed.
- **Real, new consumer (PS-288, Sep 2026):** `ScanStation.facilityId` is now also the real fallback signal `services/facilityOpsDashboard/resolveBatchFacilityId.ts` uses to scope a `Batch` to a facility when none of its own items resolve one via `Case.originHospitalId` (e.g. a batch just opened, nothing scanned into it yet). Read-only; nothing in this folder's own files changed.

## Batch 356

- **New seed station:** "Molecular — Amplification Bay" (`station-molecular-1`, `MOLECULAR-01`, Fenwick General). The seeded Panther instruments sit there (`services/instruments/`).
- **Existing browsers:** stations have no seed version, so a browser that already stored stations won't show it until Demo Reset. *Fixed in Batch 357: see below.*
- **Export:** `@/services` now exports `scanStationService`.

## Batch 357

`load()` appends any seed station whose id isn't stored (`services/mockSeedMerge.ts`) and writes the list back. A browser that stored stations before a seed station was added now gets it without Demo Reset; stored stations and their edits are untouched. Safe because stations can't be deleted, only deactivated. Test: `mockScanStationSeedMerge.test.ts`.

## Batch 358

The seeded Panthers now live in the equipment register (`services/equipment/`), still at `station-molecular-1`.

## Batch 428: Configuration permissions

- `mockScanStationService`: `create`, `update`, `deactivate`, `reactivate` need `config:scan-stations:manage`.

Before, anyone who could open Configuration could change this; now each change is checked in the service (`authorization/guardConfigWrites.ts`, audited) and a refusal changes nothing. Reads are unchanged. Seeds: Admin and Lab Director; see `docs/architecture/AUTHORIZATION_API.md`.

## Batch 444

- `scanStationList.ts` (new, tested):
  - `filterScanStations` (search, status, facility);
  - `activeScanStations`;
  - `workflowStageKey` (the locale key for a suggested stage; an admin's own wording is shown as typed).
- `validateScanStationDraft.ts` returns codes (`nameRequired`, `barcodeRequired`, `facilityRequired`, `printerProfileRequired`) that the screen translates, instead of English text.
- These helpers are exported from `@/services`.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

Batch 616 (part D, PS-506): server version of ScanStationService (`http<Name>Service.ts`, instance file `<name>ServiceInstance.ts`; mock in the demo, API server when an address is configured). Calls: `docs/architecture/GROSSING_ROUTING_API.md`.

## Batch 713: stations offered only to the people who may use them

- **`stationsForUser.ts`** (+ `.test.ts`): `stationsForUser(stations, facilityIds)` is the rule: Active stations whose `facilityId` is in the user's `StaffUser.facilityIds`; an empty or absent list (no restriction, which is how a Superadmin support session resolves) gets every Active station. `canUseStation` and `unavailableStationIds` are the same rule for one station or a list of ids. "No station" is not a station and is always offered by the screens.
- **`stationAvailability.ts`**: in-memory list of the station ids (stored on this computer, or the user's default) that this user may not use. `useCurrentScanStation` and `utils/effectiveScanStation` treat them as "no station", so nothing is scanned against them; the stored value is kept for the next person.
- **Used by:** `hooks/useSelectableScanStations.ts` (sign-in prompt, header station list) and `hooks/useGlobalStationSwitch.ts` (a `STATION:` barcode for another facility is refused). The OR terminal picker binds a Location, not a scan station, so it is unaffected. No Configuration screen picks "my station" today; `EquipmentSection` and `GrossingHardwareSection` list all stations because they are admin screens.
- **Not built:** server-side enforcement. The API server must apply the same rule when it records a scan against a station.
