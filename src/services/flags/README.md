**Batch 617 (part R):** the server version(s) in this folder use the one route style `/api/<area>/<service>/<method-kebab>` (GET for plain-value reads, POST otherwise); earlier paths are in `docs/architecture/HTTP_ROUTE_MAPPING.md`.

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

## Batch 616 (part E) — server version

API-server version of `Flag` (`httpFlagService.ts`, contract `FLAGS_AND_MESSAGES_API.md`), picked by `flagServiceInstance.ts` (and the others beside it) when an API address is configured; the mock stays the default in the demo. See `docs/architecture/HTTP_SERVICES_PATTERN.md`.

## Batch 624

`shippedFlagNames.ts`: the display name of a shipped flag in the user's language (`flagDisplayName`), looked up by the stored English name. The stored name is never changed; admin-made or renamed flags, and names carrying a result or gene, show as stored. Used by the worklist flag chip.

## Batch 669 (everyday-17, everyday-22)

- `flagChangeAudit.ts`: the Flag Manager's Save. `diffFlagChanges` (what differs between the case as opened and the draft), `saveFlagChanges` (stores each change, then writes its `flag_applied` / `flag_removed` audit entry; stops at the first failure and audits only what was stored). Cancelling now leaves no audit entries, because the modal no longer audits clicks in the draft.
- `applyStatFlag.ts`: "Apply STAT Flag" (Alt+S / voice) applies the active case-level flag with LIS code STAT to the open case. Needs `case:flag:apply` (what the Flag Manager needs); a case already STAT gets a short message and is left alone; audited as `flag_applied`; the page answers with a toast (`STAT_FLAG_MESSAGE_KEY`).
- Tests: `flagChangeAudit.test.ts`, `applyStatFlag.test.ts`.
