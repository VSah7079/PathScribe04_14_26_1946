# components/Config/System/

The biggest, most central components folder after Config/ itself — every
system-wide dictionary/admin screen (29 files — was 28 → 27 after an
earlier rename → 26 after `specimenTypes.ts`'s relocation → 27 again with
`SessionSecuritySection.tsx`'s addition this pass, 28 with
`ExternalResourcesSection.tsx` — see Notes).
Wired entirely through `index.tsx`'s `SECTIONS` registry + `renderSection()`
switch; every section listed there is confirmed live (all 23 sidebar items
render a real, non-stub component — see Notes on `TATConfigSection.tsx`).

**Pattern:** Each dictionary/admin concern is one file — table + modal,
usually backed by a real `services/` interface/mock pair.

## Files

- **`index.tsx`** — Section registry + sidebar nav + URL deep-linking
  (`?tab=system&section=...`) + a `PATHSCRIBE_SYSTEM_NAVIGATE` custom-event
  listener for voice navigation.

  **RESOLVED this pass — the "two leftover breadcrumb comments" noted
  previously turned out to be five, all confirmed stale and safe to
  remove:** `// ← was never registered here despite existing` on the
  `PhysiciansSection` import, plus four separate `// ← new`/`// ← create
  this component` markers on `TATConfigSection` (its import, its type
  union entry, its `SECTIONS` entry, and its switch case) — all confirmed
  fully registered and built, nothing outstanding behind any of them.
  Pete removing manually.

  **Also this pass:** new `'session_security'` section registered
  (`SessionSecuritySection.tsx`, below) — type union entry, `SECTIONS`
  array entry, and switch case all added. One real bug hit and fixed
  along the way: the type-union edit was initially missed (only the
  `SECTIONS`/switch entries were added), which `tsc` correctly caught —
  `SystemSection` needed `'session_security'` added alongside `'tat_config'`
  for the other two additions to type-check at all.

- **`SessionSecuritySection.tsx`** — **NEW.** Org-wide default admin
  screen for the idle-session-timeout feature (Phase 1 of the Inactivity
  Timeout & Draft Recovery spec — full detail in `PRIORITY_FIXES.md`).
  Calls `services/session/mockSessionTimeoutService.ts`'s async
  `getOrgDefault()`/`setOrgDefault()`. Deliberately its own small section
  rather than folded into `RetentionSection.tsx` (a related-sounding but
  conceptually different concept — how long *data* is retained, not how
  long an *active session* stays live) — also a natural home for Phase
  2/3's related settings (draft retention days, encryption toggle) once
  those are built, rather than needing a second new section added later.
  Per-performing-lab overrides are set separately, on the Client
  Dictionary edit modal (`Client.idleTimeoutMinutesOverride`) — this
  screen only controls the org-wide fallback.
  **Corrected mid-session:** this originally called a single
  non-conforming file (`sessionTimeoutConfig.ts`) with bare sync
  functions — restructured into the proper interface/mock/firestore
  pattern once caught (see `services/session/README.md`), which is why
  this screen now loads its initial value via a real `useEffect` rather
  than a synchronous `useState` initializer.

- **`ExternalResourcesSection.tsx`** — **NEW.** Real admin management for
  the reference links shown in the Worklist's Resources panel — CAP
  protocols, WHO classification, internal lab systems. Replaces a
  hardcoded object that used to live directly in
  `pages/WorklistPage/WorklistPage.tsx`, found broken when its CAP URL
  404'd (CAP restructured their site) and there was no way for anyone to
  fix it without a code change. Named "External Resources" to match the
  existing label already used in `components/NavBar/NavBar.tsx`'s own
  eyebrow text for this feature, not a new name invented for this
  screen. Same org-default + per-client-override shape as Session
  Security above: enterprise-wide resources visible to everyone,
  lab-scoped ones layered on top for a specific performing lab. Full
  CRUD (add/edit/delete), URL validation on save. See
  `services/externalResources/README.md` for the real viewer-facing
  relevance filtering this admin screen's data feeds into — a direct
  requirement, not an afterthought: a viewer only ever sees their own
  organisation's resources, never a flat global list.

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
  "my hospital's data only"), both paths gated behind confirmation.

  **FIXED, both passes:** the participation-types real storage key plus
  its orphaned predecessor were added to `SETTINGS_KEYS`. Separately, a
  **critical** fix: `CASE_KEYS` had referenced `'ps_cases'`, a key
  `mockCaseService.ts` never actually wrote to (its real key is `'cases'`)
  — meaning Demo Reset had likely never correctly cleared primary case
  data at all. Found via a full, unrestricted `storageGet`/`storageSet`
  audit across `services/` (not limited to the `pathscribe_` prefix, which
  is exactly how both this and 8 other missing keys — including
  `pathscribe_roles`/`pathscribe_users` — had gone undetected by an
  earlier, narrower audit pass). All now correctly categorized into
  `CASE_KEYS`/`SETTINGS_KEYS`/`STATE_KEYS`.

- **`GoverningBodiesSection.tsx`** — Standard bodies (CAP/RCPath/ICCR/RCPA)
  toggle-only, custom bodies full CRUD with an ID-conflict guard. **See
  Notes — hardcoded `isSuperAdmin`.**
- **`LISSection.tsx`** — LIS integration config (enabled, endpoint,
  whether LIS owns case statuses, whether pathologists can initiate
  Addendum/Amendment directly). Own header is a genuinely good example of
  documenting architecture role + state model concisely. No issues.
- **`ParticipationTypesSection.tsx`** — System-level master list; roles
  then select from it. Same pattern as Client Dictionary/Subspecialties.

  **CORRECTION — this file's "no issues" assessment was wrong.** It
  maintained its own separate local list (`BUILT_IN_PARTICIPATION_TYPES`
  + a localStorage key with no `_v2` suffix), completely disconnected from
  `services/participationTypes/mockParticipationTypeService.ts` — the
  real service `CaseTeamModal.tsx` actually uses. The two lists had
  drifted to **different type membership entirely** (this screen showed
  Second Opinion/Preliminary Report/Observer/Cytotechnologist/Tumour
  Board; the service had Attending/Transcriptionist/Clinician/External/
  Resident), and this screen's own "● System Live Sync" footer label was
  actively misleading — nothing was synced with the real feature at all.
  Found via a direct user report tracing a drag-and-drop bug in
  `CaseTeamModal` back through the data layer, not by inspection alone.

  **FIXED:** rewritten to read/write through `mockParticipationTypeService`
  directly (async, replacing the old synchronous local calls). The final
  canonical 8-type list was defined directly by Pete, reconciling both
  prior lists against real CLIA/CAP/ACGME clinical workflow requirements —
  see the service file's own header comment for the full list and an
  international-naming reference table (UK/Canada/ANZ/EU role-name
  equivalents) captured for future localization work. `ParticipationTypeRecord`
  (the real interface) extended with two fields this screen needed but the
  interface didn't have: `canBeAssignedTemplate`, `canViewWholeCase`.
  `TypeModal.tsx` (below) and `Staff/RoleDictionary.tsx` updated to match.

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

  **CORRECTION — the earlier "purely cosmetic, comments only" assessment
  missed a real, separate bug.** The garbled box-drawing comment
  characters noted previously *were* cosmetic, as assessed. But a
  **different** instance of the same underlying problem — genuine
  double-encoding mojibake (a correct UTF-8 em-dash corrupted into a
  3-character garbled sequence at some point in this file's history) —
  existed in the actual modal title string (`'Edit — ' + type?.label`),
  rendering visibly wrong in the live UI across every admin screen that
  reuses this shared modal (confirmed affecting all 9 files using this
  pattern, not just this one). **FIXED**, traced through the raw bytes
  to confirm root cause rather than guessed at; a full-`src/` grep for
  the same corrupted byte sequence afterward came back clean — this was
  the only occurrence.

  Also updated as part of the participation-types consolidation above:
  imports `ParticipationTypeRecord` directly from
  `services/participationTypes/IParticipationTypeService.ts` instead of
  the now-removed local type re-export from `ParticipationTypesSection.tsx`;
  `Draft` type now aliased to the service's own `NewParticipationType`
  rather than redefining an equivalent (and, it turned out, slightly
  wrong — missing `requiresNote`) `Omit` locally; `isBuiltIn` prop now
  driven from the real interface's `isSystem` field (was `builtIn`,
  which doesn't exist on the real type).

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
- **Fixes applied, earliest pass:** `CaseRoutingSection.tsx` →
  `CasePoolAssignmentSection.tsx` rename (file + component + import site);
  `specimenTypes.ts` comment cleanup; **`specimenTypes.ts` relocated to
  `services/specimenDictionary/specimenTypes.ts`** — Pete caught that a
  data-layer service (`ISpecimenDictionaryService.ts`) was importing its
  core `SpecimenEntry` type from inside `components/`, an inverted
  dependency every other dictionary in this codebase doesn't have. All 10
  real consumers updated; see `services/specimenDictionary/README.md`.
- **Fixes applied, second pass (same session as the CaseTeamModal
  drag-and-drop bug fix):** the participation-types consolidation
  (`ParticipationTypesSection.tsx` + `TypeModal.tsx`, both above), plus
  the `DemoResetTab.tsx` key additions/critical `'cases'` fix. All
  resulted from tracing one user-reported drag-and-drop bug in
  `pages/SynopticReportPage/`'s `CaseTeamModal.tsx` all the way back
  through the data layer — not found by inspection.
- **Fixes applied, third pass:** `SessionSecuritySection.tsx` added
  (Phase 1 of the Inactivity Timeout & Draft Recovery feature); five
  stale breadcrumb-style comments in `index.tsx` identified as fully
  addressed and confirmed safe to remove. This pass also removed two
  fabricated "session expired after 60 min inactivity" audit log entries
  from `services/auditlog/mockAuditService.ts` — found while investigating
  whether a real timeout mechanism existed (it didn't, until this pass);
  those entries falsely implied one had fired successfully in the past.

---
*See [components/Config/README.md](../README.md) for how this folder fits Config/.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master components/README.md or Config/README.md if this folder's overall PURPOSE changes.*
