# services/flags/

Case/specimen flag dictionary (STAT, Malignant, Second Opinion Requested, etc.) — administrative and computational tag classes.

**Pattern:** Standard interface/mock/firestore pattern.

## Batch 428: Configuration permissions

- `mockFlagService`: `add`, `update`, `deactivate`, `reactivate` need `config:case-flags:manage`.

Before, anyone who could open Configuration could change this; now each change is checked in the service (`authorization/guardConfigWrites.ts`, audited) and a refusal changes nothing. Reads are unchanged. Seeds: Admin and Lab Director; see `docs/architecture/AUTHORIZATION_API.md`.

`resolveLisFlagDefinition.ts` (new): the flag a LIS-reported code stands for, adding it to the catalog when it's new. Moved out of the report page's header bar; it uses the catalog unchecked, since the LIS sync, not the person, adds it.

## Batch 450 — test evidence for Priority 1 and 2 tickets (PS-57)

`applyLisSyncFlags.ts`: where an LIS sync puts each flag (case or the specific specimen), moved out of `HeaderBar.tsx` and tested. A specimen flag reported twice in one sync is applied twice (case-level ones once); behaviour kept.

## Batch 452 — Closing the review gaps (PS-131, PS-105, PS-133/PS-323, PS-57), PS-156 correlation window, decant ↔ billing sync, Phase 1 fixes

`caseFlagView.ts` (PS-57): a case as the Flag Manager sees it, built from the typed `FlagInstance` fields. It replaces the `(freshCase as any).caseFlags` reads in `pages/Synoptic/useSynopticFlags.ts` and the `any` mapper in `api/caseFlagsApi.ts`.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 516 (PS-283)

- `Flag.restrictsPrinting`: a case flag that restricts printing to holders of `report:restricted-case:print`.
- New seed flag `f37` "Confidential — Restricted Printing" (CONF).
- Seed flags added since a browser's copy was saved are now appended without resetting edited flags.
