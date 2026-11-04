**Batch 649:** `caseFlagsApi.ts` checks `case:flag:apply` and `case:flag:remove` when a flag is applied or removed (the Flag Manager greys the buttons without them; the save checks again).

# src/api/

One file: `caseFlagsApi.ts` — `applyFlags`/`deleteFlags`, delegating to
`mockCaseService` (which persists to `localStorage`). Header comment
notes it's meant to be replaced with real API calls once a backend
exists.

## The significant finding here — not fixed, needs a real decision

This file surfaced the most architecturally significant open question
from the whole review. Initially looked like the same "unnecessary
`any` cast" pattern cleaned up dozens of times elsewhere — removing
the casts immediately surfaced a real TypeScript error, which led to
something bigger:

**Two independent, unaware-of-each-other flag-tracking systems both
read/write the exact same `Case.caseFlags`/`Specimen.specimenFlags`
fields, using genuinely incompatible shapes.**
- This file (and its confirmed consumer,
  `pages/Synoptic/useSynopticFlags.ts`, reading the data back the same
  way) treats those fields as `FlagInstance[]` — an audit-style "who
  applied which flag, when" record (`flagDefinitionId`, `appliedAt`,
  `appliedBy`, `source`, `deletedAt`/`deletedBy`).
- The real, declared type on `Case`/`Specimen` is `CaseFlag[]`/
  `SpecimenFlag[]` instead — a flag-*definition* record (`id`,
  `label`, `color`, `lisCode`). This is the shape the Contribution
  Dashboard's Quality Flags tile and `SearchPage.tsx`'s
  computational-flags filter both actually read, expecting `.label`.

Confirmed both sides are genuinely reachable, not dead code — this
file's functions are called from `FlagManagerModal.tsx`,
`useSynopticFlags.ts`, and `SynopticReportPage`'s `HeaderBar.tsx`.
Practical effect: whichever system touches a given case's flags last
effectively corrupts the data for the other's perspective — a flag
applied through the Synoptic Report page's flag manager would show up
with an undefined `.label` wherever the Quality Flags/Search systems
expect one, and vice versa.

**Not fixed** — restored the file to its original, working state
(the `as any` casts are necessary given the current, unresolved
conflict, not laziness) and documented the full finding directly in
the file itself. This needs a real decision about which model is
authoritative, or whether the two concerns belong on separate fields
entirely — not something to resolve unilaterally. Full detail in
`PRIORITY_FIXES.md` item #37. *(Since closed: Jira PS-57, Batch 452 — `Case.caseFlags`/`Specimen.specimenFlags` are now declared `FlagInstance[]` (`types/case/Case.ts`, `types/case/Specimen.ts`), `SearchPage.tsx` resolves `flagDefinitionId` against the flag catalog, and the `as any` casts in `caseFlagsApi.ts` are gone. `PRIORITY_FIXES.md` itself was retired on Aug 19, 2026 — see `docs/ARCHIVE.md`. Checked in the Batch 496 README audit.)*

## Also fixed while here

Removed 2 debug `console.log` calls that fired on every real
flag-apply action in production — safe, uncontroversial, unrelated to
the architectural question above.

## Batch 452 — Closing the review gaps (PS-131, PS-105, PS-133/PS-323, PS-57), PS-156 correlation window, decant ↔ billing sync, Phase 1 fixes

`caseFlagsApi.ts` uses `services/flags/caseFlagView.ts` for its result. New `__tests__/caseFlagsApi.test.ts` (PS-57): apply and remove write the one `FlagInstance` shape at case or specimen level, against the real case store.

## Batch 458 — PS-71: every case save carries its version

PS-71 (Pete's optimistic-locking spec, Oct 4): a save made from an old copy of a case no longer overwrites someone else's newer save. See `services/cases/caseWrite.ts` and `docs/architecture/CASE_API.md`.

`caseFlagsApi`: each call changes one flag on the newest case, so a flag someone else added or removed in between is kept.

## Batch 491 — real `appliedBy`/`deletedBy` (disclosed since Batch 452/490; PS-359 follow-up)

`ApplyFlagPayload`/`DeleteFlagPayload` gain an optional `byUserName`. `makeInstance()`/`markDeleted()` now store it on `appliedBy`/`deletedBy` instead of the hardcoded `'current-user'` literal — the same "name, not a separate id" convention as every other append-only clinical log in this app (`MarginInkApplication.appliedByName`, `AutopsyOrganTag.recordedByName`). `'current-user'` remains the fallback for a caller with no signed-in session to pass through (e.g. a direct test call), so every existing call site and test keeps working unchanged. `pages/Synoptic/useSynopticFlags.ts` now reads the signed-in user itself (`useAuth()`) and passes `user.name` through on `onApplyFlags`/`onRemoveFlag` — the hook's own public signature and its 3 call sites (`SynopticReportPage.tsx`, `CytologyWorklistPage.tsx`, `CytologyScreeningPage.tsx`) are unchanged.

## Batch 511 (PS-478): full strict type-checking

`caseFlagsApi.ts` is type-checked again (it was one of the files `tsconfig.json` excluded) and accepts the `undefined` that `getCase` returns for a missing case, throwing the same "Case not found" error as before.
