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
`PRIORITY_FIXES.md` item #37.

## Also fixed while here

Removed 2 debug `console.log` calls that fired on every real
flag-apply action in production — safe, uncontroversial, unrelated to
the architectural question above.
