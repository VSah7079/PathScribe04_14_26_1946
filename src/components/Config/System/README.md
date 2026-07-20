# components/Config/System/

The biggest, most central components folder after Config/ itself — every
system-wide dictionary/admin screen (28 files → 27 after the rename below,
26 after `specimenTypes.ts`'s relocation — see Notes).
Wired entirely through `index.tsx`'s `SECTIONS` registry + `renderSection()`
switch; every section listed there is confirmed live (all 21 sidebar items
render a real, non-stub component — see Notes on `TATConfigSection.tsx`).

**Pattern:** Each dictionary/admin concern is one file — table + modal,
usually backed by a real `services/` interface/mock pair.

## Files

- **`index.tsx`** — Section registry + sidebar nav + URL deep-linking
  (`?tab=system&section=...`) + a `PATHSCRIBE_SYSTEM_NAVIGATE` custom-event
  listener for voice navigation. Two leftover breadcrumb comments
  (`// ← was never registered here despite existing` on `PhysiciansSection`,
  `// ← create this component` on `TATConfigSection`) are stale — both are
  now fully registered and built; harmless, just old history not yet
  cleaned from the comments.
- **`CasePoolAssignmentSection.tsx`** — **RENAMED this pass** (was
  `CaseRoutingSection.tsx`). Closes PRIORITY_FIXES.md #3: the component
  name collided with `services/cases/CaseRouter.ts` even though it
  actually corresponds to `services/cases/casePoolAssignmentService.ts`
  (already renamed in the services/ pass). File + component + the one
  import site (`index.tsx`) all updated; confirmed zero dangling
  references to the old name anywhere in `src/`.
- **`RoutingRulesSection.tsx`** — Real keyword-based specimen→pool routing
  rule editor. Built-in rules toggle-only, custom rules full CRUD,
  priority-ordered. No issues.
- **`RuleModal.tsx`** — Extracted from `RoutingRulesSection.tsx` for a real,
  specific reason stated in its own header: an OXC/rolldown build-tool
  parse issue with chevron SVG template literals in co-located component
  functions. Not a stylistic split — don't re-inline it.
- **`TATConfigSection.tsx`** (833 lines, the largest file here) — **STATUS
  UPDATE:** earlier planning notes described this as a stub pending a full
  build. It is NOT a stub — full `TATEntry` data model, the 5-dimension
  uniqueness guard, and the complete 7-level most-specific-wins resolution
  hierarchy (client+specimen+urgency down to system default) are all
  implemented, matching the original design doc exactly.
- **`ProtocolDictionarySection.tsx`** — Real, substantial (654 lines).
  Second-pass rebuild of its own editor (own header documents why: a flat
  pill grid for stain selection didn't scale to a real customer's Stain
  Dictionary). Real 2-column layout + search+multiselect. No issues.
- **`SubspecialtiesSection.tsx`** — Real, substantial (635 lines). No
  issues found in this pass.
- **`StainDictionarySection.tsx`** — Three related, tabbed dictionaries
  (Stain Type / Sectioning Protocol / Order Macro) — deliberately
  orthogonal, per `IStainService.ts`'s own design reasoning (see
  services/ review). No issues.
- **`SpecimenDictionarySection.tsx`** — Its own header is genuinely useful
  history: explicitly documents replacing TWO earlier, real-but-wrongly-wired
  screens (one edited a disconnected model nothing downstream read; one was
  its own narrower toggle-only first pass). This is the one real screen now.
- **`IdentifierFormatsSection.tsx`** — Read-only system-defined identifier
  formats per jurisdiction, admin can enable/disable + test against a real
  value. Formats themselves aren't editable by design (enhancement request
  required to add/modify) — not a missing feature, a stated boundary.
- **`FlagConfigPage.tsx`** — Real flag dictionary editor, wired to
  `flagService`. No issues.
- **`DelegationTypeSection.tsx`** — System types toggle-only, custom types
  full CRUD — consistent with the same pattern used across this folder
  (Participation Types, Delegation Types, Governing Bodies all share this
  shape). No issues.
- **`PhysiciansSection.tsx`** — Completed CSS migration (off the deprecated
  `modalStyles.ts` inline-constant pattern, per that file's own header
  marking it deprecated). No issues.
- **`DemoResetTab.tsx`** — Real two-level mock data reset (full vs.
  "my hospital's data only"), both paths gated behind confirmation. No
  issues.
- **`GoverningBodiesSection.tsx`** — Standard bodies (CAP/RCPath/ICCR/RCPA)
  toggle-only, custom bodies full CRUD with an ID-conflict guard. **See
  Notes — hardcoded `isSuperAdmin`.**
- **`LISSection.tsx`** — LIS integration config (enabled, endpoint,
  whether LIS owns case statuses, whether pathologists can initiate
  Addendum/Amendment directly). Own header is a genuinely good example of
  documenting architecture role + state model concisely. No issues.
- **`ParticipationTypesSection.tsx`** — System-level master list; roles
  then select from it. Same pattern as Client Dictionary/Subspecialties.
  No issues.
- **`FontsSection.tsx`** — Approved-fonts toggle list feeding
  `PathScribeEditor`'s toolbar via `SystemConfigContext`. Enforces at
  least one font stays enabled. No issues. **This is the real dictionary
  `Config/Macros/index.tsx` should be reading from instead of its
  hardcoded list — see `Config/Macros/README.md`.**
- **`SpecimenCategoriesSection.tsx`** — Migrated to `ps-conf-*`/`ps-ms-*`
  CSS classes (same pass as `PhysiciansSection.tsx`). Deliberately
  hardcodes the 3 current Grossing Templates rather than fetching them —
  documented as a pragmatic, revisit-later scope call, not an oversight.
- **`TypeModal.tsx`** — Rewritten from scratch specifically to avoid the
  same OXC/rolldown parse issue `RuleModal.tsx` was extracted to avoid.
  **MINOR — mojibake:** several comment lines show garbled box-drawing
  characters (`â”€â”€` instead of `─────`) and the file starts with a BOM —
  a lossy-encoding artifact from some past copy/paste. Purely cosmetic
  (comments only, doesn't affect behavior), but worth a clean re-save next
  time this file is touched.
- **`GrossingRouteOverridesSection.tsx`** — Own header is an excellent,
  specific bug-history note: documents that it verified the real matching
  logic in `mockCaseService.ts` directly rather than assuming, and
  deliberately kept `specimenType` free-text (not a Category dropdown)
  because that's what the real Pass G0 matching code actually compares
  against — a dropdown would have looked more correct and silently matched
  nothing. Good example of the "read the actual code" discipline this
  whole review is built on.
- **`ContainerTypesSection.tsx`** — Full CRUD (deactivate, not delete) over
  the Container Type Dictionary, beyond the 9 seeded APLIS-standard
  defaults. No issues.
- **`RetentionSection.tsx`** — Data retention policy editor. Its own header
  flags its own tech debt honestly: persists directly to localStorage
  pending a `SystemConfigContext` retention-fields addition. Not urgent,
  self-documented.
- **`DeficienciesSection.tsx`** — Deficiency Types + Resolution Types as
  one tabbed section rather than two sidebar entries — own header
  correctly reasons why (Resolution Type has no independent use elsewhere,
  unlike e.g. Specimen Category). No issues.
- **`VoiceSection.tsx`** — **NOT part of the System tab's own registry** —
  not in `index.tsx`'s `SECTIONS`/switch at all. Its real consumer is
  `components/Voice/VoiceSettings.tsx`. Live and correct, just worth
  knowing this one file's audience is outside this folder's own tab.
  References a real, deliberate second AI integration (Gemini-backed voice
  dictation refinement via `contexts/VoiceProvider.tsx`) — distinct from
  the main narrative-generation provider abstraction in `Config/AI/`, not
  a stale reference.
- **`useSpecimenDictionary.tsx`** — Real hook, rewritten June 2026 off
  direct localStorage calls onto the standard
  interface/mock/firestore-shaped `specimenDictionaryService`. Own header
  explicitly confirms the public API was kept unchanged so all 6 real
  consumers needed zero changes. No issues.

## Notes

- **Hardcoded `isSuperAdmin={true}`:** both `GoverningBodiesSection` and
  `TerminologyServicesSection` are only ever rendered from `index.tsx`
  with `isSuperAdmin` hardcoded to `true` — there is no real caller that
  passes `false`, and no visible connection to the actual logged-in user's
  role. Either super-admin gating for reaching this tab happens somewhere
  higher up the tree (outside this folder, not confirmed in this pass), or
  this prop isn't actually wired to a real permission check yet. Worth a
  targeted look before treating either section as genuinely
  access-controlled.
- **Fixes applied this pass:** `CaseRoutingSection.tsx` → 
  `CasePoolAssignmentSection.tsx` rename (file + component + import site);
  `specimenTypes.ts` comment cleanup; **`specimenTypes.ts` relocated to
  `services/specimenDictionary/specimenTypes.ts`** — Pete caught that a
  data-layer service (`ISpecimenDictionaryService.ts`) was importing its
  core `SpecimenEntry` type from inside `components/`, an inverted
  dependency every other dictionary in this codebase doesn't have. All 10
  real consumers updated; see `services/specimenDictionary/README.md` for
  the full writeup.
- **Not fixed, flagged only:** `TypeModal.tsx` mojibake comments (cosmetic).

---
*See [components/Config/README.md](../README.md) for how this folder fits Config/.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master components/README.md or Config/README.md if this folder's overall PURPOSE changes.*
