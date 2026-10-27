**Batch 668:** the Help buttons moved from floating buttons over the screen into the top bar, beside the microphone (`Help/TopBarHelpButtons`, in `NavBar`).

**Batch 650:** `Worklist/PoolClaimModal` (Accept / Pass), `PatientHistory/PatientHistoryModal` (Close history), `Contribution/QualityTab` (TAT tiles) answer registered voice and key commands.

**Batch 649:** Flag Manager, Request Review and the pool Claim window grey their actions without the new capabilities (`Flags/`, `RequestReview/`, `Worklist/`); the Enhancement Request README is corrected (the screenshot is opt-in inside the modal).

## Batch 647
`Config/help/RouteHelpButton.tsx`: the floating Help button for screens outside Configuration, mounted once in `SignedInApp.tsx`.

## Batch 645 — Lockbox Drop-Off

`Lockbox/LockboxNavigation.tsx` (new): the "Go to Lockbox Drop-Off" command, mounted once in `SignedInApp.tsx` so `AppShell.tsx` does not grow. See `Lockbox/README.md`.

## Batch 613 (part A) — case search reporting

`Search/Report/`: `CaseReportPanel`, `ColumnPicker`, `ReportSchedulesPanel`, `SynopticValueFilters` and the `useCaseReport` hook.

## Batch 613 (part B)
`RelatedCases/` (new): the related-cases picker, shared layout, sign-out panel, Patient summary panel and amended flag. See its README.

## Batch 612 (part C)

`Common/FontSizeField.tsx` and `Common/ConvertToPointsPanel.tsx` (the size box with its printed size, and Convert to points with a list of what changes); used by Document Style and Template Assembly.

## Batch 610 (part A) — autopsy turnaround chip, frozen section warning field (#60, #88, #87)

New `Autopsy/AutopsyTatChip.tsx` (on the worklist and the report page). `Config/System/TATConfigSection.tsx`: Autopsy PAD and FAD rule types, a warning-minutes field for frozen section, and the `as any` casts removed. `Worklist/AutopsyWorklistBadges.tsx` shows the chip after the SLA badge.

# components/

**Batch 646:** `Config/help/` is the Help button that opens the matching section of the Administrator Guide (Configuration screens and Migration Jobs).

Master index for `src/components/`. One line per top-level folder,
cross-linked to that folder's own `README.md` for real detail.

**Maintenance rule:** when a folder's *contents* change, update that
folder's own `README.md`. Only touch *this* file if a folder's *purpose*
changes, or a folder is added/removed/split/merged.

## Folder index (42 folders)

| Folder | What it is |
|---|---|
| [Config/](./Config/README.md) | Every admin/configuration screen — 170 files across 14 subfolders, see its own index |
| [TemplateBuilder/](./TemplateBuilder/README.md) | Report *layout/assembly* builder — distinct from Config/Protocols/'s synoptic *data-capture* templates |
| [Editor/](./Editor/README.md) | Tiptap rich text editor + `tiptapBridge/` (AI-integration bridge) |
| [LiveUpdates/](./LiveUpdates/README.md) | The live-update connection badge for the OR boards and Intraop Queue (PS-262) |
| [Printing/](./Printing/README.md) | On-screen print feedback: the PathScribe Agent status line (PS-52) and interface-engine print results with Retry (PS-54) |
| [SpellCheck/](./SpellCheck/README.md) | The report screens' spell checking: context, editor extension, spell-checked text box, right-click menu, spelling language control (PS-342) |
| [Voice/](./Voice/README.md) | Voice dictation settings/controls |
| [FacilityDictionary/](./FacilityDictionary/README.md) | Facility Configuration table + editor modal (superseded an orphaned `ClientDictionary/` fork, deleted in the i18n sweep's batch 178 — see that folder's own README) |
| [Contribution/](./Contribution/README.md) | My Contribution dashboard — 5 tabs/tiles, all serving `ContributionDashboardPage.tsx` |
| [Common/](./Common/README.md) | Shared UI primitives: `ConfirmModal`, `LookupModal`, `InlineCommentThread`, `SuffixSelect`, `Dropdown`, `SearchableCombobox`, `PatientIdStatusDot`, `LogoutWarningModal`, `SessionExpiryWarningModal`, `DraftRecoveryModal`, `SessionSupersededNotice`, `CapabilityButton`, `ScreenGate`, `ReasonPromptModal` and others (see its README). `Common/Button/` is an empty leftover folder |
| [QualityAssurance/](./QualityAssurance/README.md) | The Quality Assurance page's tabs and review bars (Countersign Turnaround, Intraop Linkage, Reconciliation, FPPE, Drift Correction, Patient Match Review, Access Request Response, CAPA Recommendations, Cytology QA, Follow-up, Inspection Mode, Enterprise Rollup, QA Dashboard, QA Trend Reviews, the surgical QA case bar). There is no separate Retention Holds tab component |
| [BarcodeScanner/](./BarcodeScanner/README.md) | Real, camera-based barcode capture (`@zxing/browser`), replacing a previous random-MRN simulator |
| [Worklist/](./Worklist/README.md) | Case worklist table |
| [Icons/](./Icons/README.md) | Icon components |
| [Flags/](./Flags/README.md) | Flag display components |
| [EnhancementRequest/](./EnhancementRequest/README.md) | Feature request submission |
| [ValidationStudies/](./ValidationStudies/README.md) | Parallel-run validation study management |
| [TemplateRequest/](./TemplateRequest/README.md) | New-synoptic-template request form |
| [Search/](./Search/README.md) | Global case search bar (NavBar) |
| [RequestReview/](./RequestReview/README.md) | Informal review request modal (not the same as Delegate) |
| [NavBar/](./NavBar/README.md) | Top nav bar |
| [InternalNotes/](./InternalNotes/README.md) | Internal notes drawer |
| [PatientHistory/](./PatientHistory/README.md) | Patient history modal (SynopticReportPage) |
| [Audit/](./Audit/README.md) | Centralized audit logging hook |
| [AppShell/](./AppShell/README.md) | Global layout shell + the real internal user directory |
| [SpecimenPicker/](./SpecimenPicker/README.md) | Specimen Dictionary lookup modal (AccessionPage) |
| [Synoptic/](./Synoptic/README.md) | Synoptic page sidebar wrapper |
| [Autopsy/](./Autopsy/README.md) | **NEW (Sep 2026)** — Autopsy Pathology Module UI: the authorization-completion and body-release forms, both mounted on the report page (`SynopticReportPage.tsx`); autopsy intake fields live in `pages/AccessionPage/` |
| [ExternalConsult/](./ExternalConsult/README.md) | **NEW (Sep 2026)** — PS-290, the internal pathologist-facing issuance/management modal for External Consult / Second-Opinion Access — NOT real token security, see the folder's own README |
| [Billing/](./Billing/README.md) | Billing modals: post-sign-out billing change, applied-code correction, billing correction dialog, charge approval queue, case billing review |
| [CaseUnavailable/](./CaseUnavailable/README.md) | The one "no access" screen for a case (Batch 396) |
| [CytologyQc/](./CytologyQc/README.md) | The QC review bar and discrepancy form on the cytology screening page (Batch 396) |
| [Grossing/](./Grossing/README.md) | The grossing required mark and "needed before grossing can be completed" note (Batch 397) |
| GrossingHardware/ | `CameraCaptureControl.tsx`, grossing-station camera capture (no README) |
| [Intraop/](./Intraop/README.md) | The structured verbal report form for frozen results (Batch 399) |
| OrSuiteDashboard/ | `OrBoardRow.tsx`, one row of the OR Suite dashboard (no README) |
| [OrganMap/](./OrganMap/README.md) | The anatomical map companion on the report page, and the Mohs stage input (Batch 461+) |
| [PeerReview/](./PeerReview/README.md) | Peer review request and review forms (PS-144, Batch 439) |
| [Profile/](./Profile/README.md) | The signed-in person's own lists: My dictionary, My voice commands, Biometric signing (Batch 432) |
| [Signing/](./Signing/README.md) | The "confirm it's you" step before a signature (Batch 344) |
| [Support/](./Support/README.md) | Support reference chip and lookup (Batch 364) |
| [TumorBoard/](./TumorBoard/README.md) | The "Flag for MDT" modal (Batch 489) |

*Corrected in the Batch 496 README audit (Oct 9, 2026): index was "27 folders"; added the 13 folders missing from it, and corrected the Config, Common, QualityAssurance and Autopsy rows.*

## Recent (Sep 2026)

- **Search results (Sep 2026, Batch 350).** `Worklist/WorklistTable.tsx` gained `preserveOrder`, so Search shows the server's sorted, paged results as they are. Its status labels are translated, and its remaining raw inline styles were converted. `AppShell/AppShell.tsx` marks a return to Search through `utils/search/searchSession.ts`.

- **Quick UI fixes (Sep 2026, Batch 349).** `Config/Macros/MacroPanel.tsx` (PS-126): readable hint text, an administrators' **All** tab grouped by type, Enterprise offered only to administrators, and a read-only note on macros the user may not change. `Search/CaseSearchBar.tsx` (PS-101): every case status in the header search popup has a translated, readable label.

- **Network print results (Sep 2026, PS-54, Batch 347).** New `Printing/NetworkPrintJobs.tsx`, mounted in `App.tsx` above the agent status line: labels sent to *Direct via Interface Engine* printers show printed or the reason they didn't, with a manual Retry.

- **Agent print status (Sep 2026, PS-52, Batch 346).** New `Printing/AgentPrintStatus.tsx`, mounted once in `App.tsx`: while a label goes through the PathScribe Agent it says whether it is being sent, queued (and how many jobs are ahead) or printing. `Config/System/PrinterProfilesSection.tsx` gained the optional **Agent Port** field.

- **Live updates (Sep 2026, PS-262, Batch 342).** New `LiveUpdates/LiveStatusBadge.tsx`, which shows whether the OR boards and Intraop Queue are live, local-only, reconnecting or offline.

- **Dependency security (Sep 2026, PS-344, Batch 340).** The editor runs on TipTap 3.31.3, patching a high-severity ReDoS and a `__proto__` attribute issue; React Router is 6.30.6. `AppShell`'s message config links are followed only when they are PathScribe paths (`utils/safeInternalPath.ts`).

- **Spell checking in the report screens (Sep 2026, PS-342, Batch 338).**
  - **New `SpellCheck/`:** the report editor and every report text box are checked in the case's own language, with medical, facility and personal dictionaries. Right-click a squiggle for suggestions or to add the word.
  - **Language:** the case's choice, else the assigned pathologist's preference (Staff → edit → **Spelling language**), else the ordering facility's default.
  - **AI spelling check retired:** Accept in the report editor now commits the section directly.
  - `Editor/PathScribeEditor.tsx` has no inline CSS and no browser storage left.

- **Autopsy signing authority; staff credentials editor (Sep 2026, PS-327, Batch 331).**
  - **Credentials editor:** Staff → edit gains a **Jurisdictional credentials & appointments** section, for example a medical examiner appointment.
  - **Autopsy signing:** Autopsy PAD/FAD signing is now checked. Forensic cases need an active appointment for their jurisdiction.
- **Drafting locked to Template Author; built-in template roles (Sep 2026, PS-63, Batch 329).**
  - **Read-only editor:** the template editor opens read-only for anyone without Template Author (Admin inherits it).
  - **Built-in roles:** Template Author, Template Approver and Lab Director appear in Staff → Roles for every site, and keep working if renamed.
- **Template review rules enforced (Sep 2026, PS-63, Batch 328).**
  - **Approving and publishing** now need an approver role, and an approver who isn't one of the template's authors (unless the site allows self-approval).
  - **Required Reviewers:** the site sets how many approvals a template needs.
  - **SNOMED:** publishing a diagnostic template needs 80% SNOMED coverage.
  - **Settings screen:** System → Administration & Compliance → **Template Review**.
  - The reviewer page's inline styles are gone.
- **Synoptic template workflow documented (Sep 2026, PS-63, Batch 326).**
  - **Admin Guide section:** building, reviewing and publishing a synoptic template. It is in `Config/Protocols/README.md`, written from an end-to-end walkthrough in the app.
  - **Fix:** refreshing the editor after the first save of a new template or copy no longer creates a second copy.
- **LIS ingestion layer and native dropdown colours (Sep 2026, Batch 323).**
  - **PS-87:** the Assist screen is now **Assist LIS Ingestion**, with a staging queue view, **Retry failed**, and **Test an inbound message** for HL7 v2 or JSON. See `services/lisIngestion/README.md`.
  - **PS-62:** every native `<select>` shares one dark open-list style. See `Common/README.md`.
- **Assist LIS Polling (Sep 2026, PS-87, Batch 322).** A new System → Integrations screen (`Config/System/AssistLisPollingSection.tsx`). When the polled LIS reports Gross Complete or Microscopic/Diagnosis Complete, the AI prepares a synoptic draft. The draft appears in the existing report editor as unverified AI suggestions. See `services/assistPolling/README.md`.
- **AI models: global catalog, per-tenant adoption (Sep 2026, PS-58, Batch 320).** The Models tab (`Config/Models/`) and the store (`ValidationStudies/ModelStoreModal.tsx`) now work on the current organisation's adoption records over a global ForMedrixAI catalog. Adopting, defaulting or retiring a model in one organisation doesn't affect another. See `services/models/README.md`.
- **Dead messaging CSS removed (Sep 2026, PS-78, Batch 319).** 130 `ps-msg-*` rules for 70 classes no component uses were deleted from `pathscribe.css`. The live message drawer (`AppShell/AppShell.tsx`) was checked in a real browser and shows no difference. See `AppShell/README.md` and `docs/ARCHIVE.md`.
- **Duplicate policy (Sep 2026, PS-73, Batch 317).**
  - **Which screens:** Duplicate is offered only where `services/duplication/duplicatePolicy.ts` allows it. It was removed from Physicians, Container Types, Delegation Types and RVU code-map rows, and added to ten configuration screens.
  - **Protocol actions:** the synoptic protocol screens' Duplicate / Export JSON / New Version / Archive (previously dead or wrong) are real in `Config/Protocols/ProtocolCardParts.tsx`.
  - **Localized names:** copy names come from `t('common.copyOfName')` everywhere; nothing stores an English "(Copy)" any more.
  - **Bugs fixed along the way:**
    - Specimen Dictionary saves dropping fields;
    - TAT edits wiping role scope;
    - add-vs-edit keyed off entry presence (TAT, the routing-rule priority check).
  - **Inline styles removed:** SynopticEditor, RoleDictionary and the protocol list screens.
  - **Enforcement:** `services/duplication/duplicatePolicy.guard.test.ts`.
  - **Detail:** `Config/System/README.md`, `Config/Protocols/README.md`.
- **Jurisdiction-bound signing authority + standing-rules pass (Sep 2026,
  PS-327 / PS-341)** — `Config/System/TypeModal.tsx` gained the
  Facility-Level Sign-Out Authority editor: each performing lab's
  active rule, where it comes from (country default with its regulatory
  basis / platform default / facility override with admin and date), a
  "break-glass" override that starts from the inherited values, and a
  justification that goes to the audit log.
  `Config/System/ParticipationTypesSection.tsx` saves through
  `services/participationTypes/saveParticipationType.ts`, which stamps
  who/when/why and writes the audit entry.
  `pages/SynopticReportPage/modals/CaseTeamModal.tsx` (outside this
  folder) offers only the roles valid in the case's jurisdiction, with
  local titles.
  All three components render and dispatch only; the logic lives in
  `services/participationTypes/`. No raw inline styles (CSS custom
  properties only), all UI text in five languages, enforced by
  `services/participationTypes/standingRules.guard.test.ts`. Full detail
  in `Config/System/README.md` and `services/participationTypes/README.md`.
- **Encoding repair (Sep 2026)** — this README (39) and `Config/README.md` (46)
  had 85 corrupted characters between them: UTF-8 em-dashes, arrows, and ✅ that had
  been decoded as Windows code pages ("β€”" for "—", "βœ…" for "✅").
  All restored. A repo-wide scan found no other affected file.

## Loose files at `components/` root (Aug 2026)

Four real files sit directly in `components/`, not inside any
subfolder — all part of the same real, global scan-station feature
(see `hooks/README.md`'s own "Scan station & material scanning"
section for the hooks these mount):

- **`MaterialScanTrackingBridge.tsx`** — mounts
  `useGlobalMaterialScanTracking()` exactly once, at the app root
  (`App.tsx`, alongside `ScannerProvider` itself) — never tied to any
  specific page or case being open. Renders nothing; a deliberate
  "hook as a component" pattern purely so it can be mounted once via
  JSX in `App.tsx`.
- **`ScanStationPrompt.tsx`** — real fix, per direct follow-up: "the
  premise of setting a current station in an actual case is not
  correct... should be identified at login. Should be sticky too."
  Replaces the old, case-scoped `MaterialTreePanel.tsx` selector
  entirely — a station is a property of the terminal, never of
  whatever case happens to be open.
- **`StationSwitchGuardModal.tsx`** — real feature, per direct
  follow-up's exact 3-choice table for an unsaved-data station switch:
  Save & Switch / Discard & Switch / Cancel (stay at the current
  station to finish editing). See `useGlobalStationSwitch.ts`'s own
  header for the real guard logic this modal presents.
- **`DefaultActionOnScanBridge.tsx`** (PS-289) — mounts
  `useDefaultActionOnScan()` once at the app root (`App.tsx`), the same
  render-nothing pattern as `MaterialScanTrackingBridge.tsx`.

*Corrected in the Batch 496 README audit (Oct 9, 2026): was "Three real files"; `DefaultActionOnScanBridge.tsx` added.*

## Naming/structure pass (July 2026)

Prompted by a direct question: does `Common/` being this thin, in a
codebase this size, actually make sense? It didn't — the deeper look
found several folders whose *names* didn't communicate their contents,
independent of whether the code itself was correct. Renamed/consolidated:

| Old | New | Why |
|---|---|---|
| `system/` (lowercase) | `ClientDictionary/` | Collided by capitalization only with `Config/System/` (a much bigger, unrelated folder); told you nothing about Client Dictionary being what's inside |
| `UI/` | folded into `Common/` | Single-file folder named as generically as possible; `ConfirmModal.tsx` is exactly the same category of thing as `Common/LookupModal.tsx` |
| `PatientReportPage/` | folded into `Common/` | The page that name referred to was deleted as dead code earlier this session; only `InlineCommentThread.tsx` (a genuinely shared component) was left behind in a folder named after something that no longer existed |
| `AccessionPage/` | `SpecimenPicker/` | Identical name to `pages/AccessionPage/`, a completely different folder — this one is just a picker component, not the page |
| `CasePanel/` | `PatientHistory/` | Gave no signal the folder contains the patient history modal specifically — no other "case panel" concept existed to distinguish it from |
| `synoptic/` (lowercase) | `Synoptic/` | The only folder in all of `components/` breaking PascalCase convention |
| `Dashboards/` | folded into `Contribution/` | Both files (`FlagRow.tsx`, `CaseMixTile.tsx`) exclusively serve `ContributionDashboardPage.tsx` — same audience as everything already in `Contribution/`; "Dashboards" (plural, generic) didn't say which dashboard |

**Kept as-is, deliberately** — flagged as overloaded terminology rather
than renamed, since each name is individually accurate for what it
contains:

- **"Search"** means three different things depending on folder —
  `components/Search/CaseSearchBar.tsx` (global case search),
  `Config/Search/ConfigSearchBar.tsx` (Configuration page's own search),
  and `pages/SearchPage.tsx` (the dedicated SNOMED/ICD/specimen lookup
  page). Each is correctly named for what it does; the overlap is only
  confusing if you forget which folder you're in.
- **"Template"** means genuinely different things in `Config/Protocols/`
  (data-capture) vs. `TemplateBuilder/` (report layout) vs.
  `TemplateRequest/` (a request form for a new one) — already documented
  in `TemplateBuilder/README.md`'s own Notes section.
- **"Review"** means different things in `RequestReview/` (ask a
  colleague to informally look at a case) vs. `Config/Protocols/ReviewQueueSection.tsx`
  (formal protocol lifecycle review) — different domains, not a naming
  mistake.
- **"Editor"** means different things in `components/Editor/` (Tiptap
  narrative writing surface) vs. `Config/Protocols/SynopticEditor.tsx`
  (structured template *definition* builder) — a fourth confirmed
  instance of this same pattern, prompted by a direct question and
  checked rather than assumed correct. See `Config/Protocols/README.md`.

Every rename above: confirmed sole/all real consumers via full-`src/`
grep before moving, updated every import path and self-documented header
comment, verified zero dangling references afterward, and ran each moved
file through `esbuild` as a syntax/resolution sanity check (this
environment has no `tsconfig`/`node_modules` for a real `tsc` run — that
remains the first real check on your end).

## Recent additions

- **Country Signing Rules (Batch 335, PS-341):** `Config/System/CountrySigningRulesSection.tsx` is the platform-level editor for per-country signing rules. See `Config/System/README.md`.
- **Code Import (Batch 334, PS-89):** `Config/System/CodeImportSection.tsx` imports billing codes from CSV as four-eyes approval jobs. See `Config/System/README.md`.

## Known issues found across components/

- **Macros/index.tsx hardcoded fonts** (Config/) — drift risk vs.
  `services/fonts/`.
- ~~**Hardcoded `isSuperAdmin={true}`**~~ (Config/System/) — closed in
  Batch 371 (governing bodies need `platform:governing-bodies:manage`;
  Terminology gets the real `useIsSuperAdmin()`). *(Corrected in the Batch
  496 README audit.)*
- **`TemplatePreviewPanel.tsx` still on the old node-list preview shape**
  (TemplateBuilder/) — works correctly today via a real adapter, not
  urgent.

## Fixes applied across components/

See `Config/README.md`'s own fixes log for full detail on the Config/
subfolder work — summarized here for a single cross-folder view:

- `Staff/RoleDictionary.tsx`, `ClientDictionary/ClientTable.tsx` — stale
  header path comments fixed. *(`ClientDictionary/` has since been
  deleted; `FacilityDictionary/` replaced it — noted in the Batch 496
  README audit.)*
- **Orchestrator Mode** — real, previously-nonfunctional toggle rebuilt
  with org default + per-internal-client override
  (`Facility.internalAiOrchestratorEnabled`). Dead `NarrativeTemplatesTab`
  cluster deleted.
- **`CaseRoutingSection.tsx` → `CasePoolAssignmentSection.tsx`** rename,
  matching the services/ side.
- **`specimenTypes.ts` relocated** from `components/Config/System/` to
  `services/specimenDictionary/` — was an inverted dependency. Caught by
  Pete.
- **Participation-types consolidation** — `Config/System/ParticipationTypesSection.tsx`
  and `Config/Staff/RoleDictionary.tsx` each maintained a separate,
  disconnected local list of participation types, drifted to different
  type membership entirely from `services/participationTypes/mockParticipationTypeService.ts`
  (the real service `CaseTeamModal.tsx` actually uses). Found by tracing
  a user-reported drag-and-drop bug back through the data layer. Both
  screens now use the real service directly; final 8-type canonical list
  defined by Pete against real CLIA/CAP/ACGME clinical role requirements.
  `TypeModal.tsx`'s mojibake — previously assessed here as cosmetic
  comments-only — turned out to include a separate instance actually
  rendering wrong in the live UI across all 9 admin screens sharing that
  modal; traced to root cause via raw bytes and fixed. Same investigation
  also surfaced a critical Demo Reset bug: `CASE_KEYS` referenced
  `'ps_cases'`, a key `mockCaseService.ts` never actually wrote to (real
  key: `'cases'`) — Demo Reset had likely never correctly cleared primary
  case data. Full detail in `Config/README.md`, `Config/Staff/README.md`,
  `Config/System/README.md`.
- **`TemplateRenderer.tsx` fully rewritten** to consume real
  `EditorTemplate` content via `getTemplate()` instead of a hardcoded
  placeholder — 19 real seeded templates now display correctly, plus new
  SNOMED/ICD coding display. `types/templateTypes.ts` and
  `src/templates/mockDcisTemplate.ts` deleted as fully dead.
- **Orphaned third protocol-editing system deleted** — `src/protocols/`
  and `src/types/ProtocolDefinition.ts`, plus the unreachable route in
  `App.tsx`. Caught by Pete.
- **`PathScribeEditorHandle` duplicate declaration consolidated**
  (Editor/) — now a single source of truth in `PathScribeEditorRef.ts`.
- **`Editor/integration/` renamed to `Editor/tiptapBridge/`** for clarity.
- **`system/clients/desktop.ini` deleted** — Windows Explorer metadata
  file, not source code. Recommend adding `desktop.ini` to `.gitignore`.
- **`Common/Button/Button.test.tsx` deleted** — confirmed empty scaffold,
  no `Button.tsx` ever existed.
- **`PatientReportPage.tsx` deleted** — routed but genuinely unreachable;
  every real navigation goes to `/case/${id}/synoptic` instead. Confirmed
  with Pete. `mock/mockReports.ts` kept — still used by `FullReportPage.tsx`.
- `Audit/useAuditLog.ts` — removed a literally duplicated header comment.
- **Full naming/structure pass** — see the table above. 7 folders
  renamed or consolidated; every move verified via grep + esbuild.
- **`RequestReviewModal.tsx`'s reviewer list rebuilt** on the real
  `services/users/mockUserService.ts` directory (filtered to active
  Pathologists), replacing a standalone hardcoded array that had drifted
  into real ID collisions with `AppShell.tsx`'s directory. Collision-free
  by construction now, not just patched around.
- **PRIORITY_FIXES.md #8 — CLOSED. Modal-overlay shell consolidation,
  all 14 files.** What started as `components/UI/ConfirmModal.tsx` found
  with exactly 1 real consumer became a full sweep across
  `LogoutWarningModal.tsx`, `ResourcesModal.tsx`, `EnhancementRequestModal.tsx`
  (already correct, confirmed), `AuditLogPage.tsx`, `ConfigurationPage.tsx`,
  `AppShell.tsx`, `SynopticEditor.tsx`, `protocolShared.tsx`,
  `TemplateRenderer.tsx`, `PathScribeEditor.tsx`, `SynopticReportPage.tsx`,
  `AddCodeModal.tsx`, plus `Home.tsx` (found along the way, with two of
  its own duplicate modals eliminated by reuse rather than reformatted a
  third time) and `AuditLogPage.tsx`'s own third copy of the same Quick
  Links modal.
- **`LogoutWarningModal.tsx` consolidation**, prompted directly by Pete
  given the reliability stakes of `SynopticReportPage.tsx` — a second,
  separate implementation with a different prop interface and its own
  uncorrected z-index bug was found in that page's own `modals/` folder
  and merged into one shared `Common/LogoutWarningModal.tsx`. Same
  investigation found and removed a dead `overlayStyle` prop across four
  of that page's other modals, plus one redundant CSS modifier.
- **Session Security — Phase 1 of the Inactivity Timeout & Draft Recovery
  feature, complete.** A real idle-detection timer, honest warning modal,
  and forced logout, closing a genuine gap: `AuthContext.tsx` had no
  timeout mechanism at all, while the audit log had two fabricated demo
  entries falsely implying one had worked successfully in the past
  (removed immediately, ahead of any diligence review). Resolved per the
  currently-open case (org default, overridden by whichever client
  performs the work on that case) rather than a multi-institution
  "strictest among all active permissions" model, matching PathScribe's
  actual single-case-focused UI. New: `Config/System/SessionSecuritySection.tsx`,
  `services/session/` (restructured mid-session into a proper
  interface/mock/firestore-stub trio, see `services/session/README.md`),
  `hooks/useIdleTimeout.ts`, `Common/SessionExpiryWarningModal.tsx`.
  `Facility.idleTimeoutMinutesOverride` added and wired into Facility
  Configuration's edit modal.

  **Phase 2 (draft caching + recovery) also now complete** — new
  `services/drafts/`, `hooks/useDraftCache.ts`, `Common/DraftRecoveryModal.tsx`,
  wired into `SynopticReportPage.tsx`. Caches the full case (18 distinct
  dirty-able things found via a full `markDirty()` call-site audit, not
  just synoptic answers — an earlier, narrower version would have missed
  most of them), explicitly excluding patient demographics for HIPAA
  minimum-necessary reasoning and data-integrity (avoiding a stale
  restore overwriting fresh LIS/EHR data). Local-only restore, no
  auto-persist. Full detail in `Config/README.md`, `Common/README.md`,
  and `ClientDictionary/README.md` (the per-client override field; now
  `FacilityDictionary/README.md`).

## Batch 609 (part A)

- `ReportImages/`: the Attach images window for a case's report.

## Batch 353

- **TAT and delegations are now services** (`services/tatConfig/`, `services/delegations/`):
  - the TAT settings screen (`Config/System/`) saves through `tatTargetService`;
  - the Quality tab and Enterprise rollup read through the services.
- **Deployment baselines:** four component files came off them.

## Batch 356

`Config/System/InstrumentsSection.tsx` is new: the instrument list (PS-326). *(Since replaced by `EquipmentSection.tsx` in Batch 358.)*

## Batch 358

`Config/System/EquipmentSection.tsx` replaced `InstrumentsSection.tsx`: the equipment register.

## Batch 359

- `Config/System/GrossingHardwareSection.tsx` is new.
- Printer Profiles and Equipment show the device links.

## Batch 360

`Config/System/EquipmentLogModal.tsx` is new: a device's service log.

## Batch 361

`Config/System/EquipmentSection.tsx` shows a device with an open malfunction or past due in red.

## Batch 362

`NavBar/LanguageSwitcher.tsx` offers Belgian Dutch (NL-BE).


## Batch 363 (PS-72): patient data tagged for screenshot redaction

Components across `AppShell/`, `Audit/`, `Config/System/`, `FacilityDictionary/`, `PatientHistory/`, `QualityAssurance/`, `RequestReview/`, `Search/` and `Worklist/` tag the patient identifiers they show with `data-phi` for screenshot redaction. See `services/phi/`.


## Batch 364 (PS-349, PS-350): support references

**`Support/`** (new): `SupportReferenceChip` and `SupportReferenceLookup`. `EnhancementRequest/` no longer sends identifiers, and `Search/` accepts support references.

## Batch 391

`FacilityDictionary/`: Report language for performing labs. `Editor/`: Korean text drawn in Pretendard.

## Batch 396

New: `CaseUnavailable/` (the one "no access" screen for a case) and `CytologyQc/` (the QC review bar on the screening page). `QualityAssurance/` gained the surgical QA review bar for the report page. `AppShell/`: message links only for cases the reader can open; no stand-in user id for the inbox.

## Batch 397

New `Grossing/` (the required mark and the "needed before grossing can be completed" note).

## Batch 399

New `Intraop/` (the structured verbal report form). `Config/System/IntraopCriticalResultsSection.tsx`: the critical intraoperative results dictionary.

## Batch 400

`Intraop/VerbalReportForm.tsx` can be dictated; AI fills in the fields for the pathologist to check.

## Batch 406

`Config/System/DeckLayoutEditor.tsx` edits an analyser's deck layout, for Rack Loading's deck-slot checks.

## Batch 410

`Common/CapabilityButton` can say why it's disabled (`disabledTitle`).

## Batch 414

`Config/Cytology/CytologyRegistrySettingsSection.tsx`: screening registry reporting on the new registry engine.

## Batch 415

`Config/Cytology/CytologyComplianceFeaturesSection.tsx`: country-specific cytology rules.

## Batch 417

`Common/NationalIdentifierFields.tsx` (new): the national identifier inputs on the Accession page. `Search/CaseSearchBar.tsx` searches national identifier values.

## Batch 418

`Common/RegistryConsentFields.tsx` (new): the registry opt-out checkboxes on the Accession page.

## Batch 419

`Config/Cytology/CytologyRegistrySettingsSection.tsx`: the registry's test / production choice.

## Batch 421

No component changes; the Registry Exceptions page is in `pages/RegistryExceptionsPage/`.

## Batch 422

`Config/System/CancerRegistrySettingsSection.tsx` rebuilt on the registry definitions and permission-checked saves.

## Batch 423

`Config/RegistryGoLive/RegistryGoLivePanel.tsx` is the registry go-live gate. It shows pre-checks, test evidence, the approval with re-entered credentials, the permanent statement and return to test.

## Batch 424

`Config/RegistryGoLive/RegistryGoLivePanel.tsx` has been reworked for validation and production instances: agreement, synthetic test suite, validation record export and import, local changes, go-live and stop live.

## Batch 425

- `Common/`: `PatientRegistryDetailsModal` and `RegistryOptOutBadge`.
- `NavBar/`: the registry exceptions badge.
- `QualityAssurance/`: the cytology transmission audit's new columns and download.
- `Config/System/`: Template Review is capability-gated.

## Batch 426

`Config/Protocols/`: staging tags, units and the staging edition in the template editor.

## Batch 427

`FacilityDictionary/`: the performing lab's combined-PDF setting.

## Batch 428: Configuration permissions

`Config/`: every section checks its own capability in its service, and `Config/ConfigRefusalBanner.tsx` names a refused permission. Four unused Configuration files deleted. See `Config/README.md`.

## Batch 429: view-only sections, equipment log for the bench

`Config/ConfigSectionGate.tsx` shows a Configuration section view only to someone without its capability. See `Config/README.md`.

## Batch 430: personal settings per person; view-only fields

`Voice/SpeechConfigTab.tsx`: your own voice macros; `Config/ConfigSectionGate.tsx`: view-only fields don't take changes.

## Batch 431

Configuration search covers every section; per-person language and worklist sort; access badges from request records; template review work and lab-wide settings behind services.

## Batch 432

New `Profile/` (My dictionary, My voice commands) and `Common/ReasonPromptModal.tsx`; Resolve, Retire, Escalate, Supervisor bypass, Deny, transit status and risk-weight screens for actions nothing called before.

## Batch 433

- `Billing/`: `BillingCorrectionDialog.tsx` and `ChargeApprovalQueue.tsx` (Quality Assurance → Financials).
- `Profile/BiometricSigningModal.tsx`, `Config/System/BiometricPolicyCard.tsx`: biometric signing.
- `FacilityDictionary/`: the "Charges need billing approval" setting.

## Batch 434

`Billing/ChargeApprovalQueue.tsx`: names the performing lab for every case, or says it isn't known.

## Batch 436

- `Search/CaseSearchBar.tsx`: result chips show the case's flags (PS-101).
- `PatientHistory/`, `QualityAssurance/`: corrected document citations (PS-40).

## Batch 437

- `Config/`: unsaved changes are noticed across the whole page (PS-128).
- `Common/`: warnings that show over a dialog; `CapabilityButton` titles.
- `NavBar/`, `Search/`: through the unsaved-changes guard.
- Several prints are now audited (PS-282).

## Batch 438

Quality Assurance → CAPA Engine → Recommended; Configuration → System → Revision Reasons; audit times on the drift tab and support lookup read as UTC.

## Batch 439

`PeerReview/` (new): the peer review forms. External consult: opinions and their assessment. Configuration: Peer Review Before Sign-Out.

## Batch 440

`Worklist/WorklistTable.tsx` takes `interceptOpen`, for a filter that opens its cases its own way (the Worklist's Cytology Review tile). See `Worklist/README.md`.

## Batch 441

Configuration: the Role Dictionary locks pathologist types for the Cytotechnologist role, and the QA Configuration Center gains the "after release only" CAPA switch (`Config/README.md`).

## Batch 442

Quality Assurance → CAPA → Discordance Patterns, and Configuration → System → Discordance Trend Policy (PS-147).

## Batch 444

No key in the browser: the AI Provider screen's developer key field and the top bar's direct vendor check are gone. Scan Stations is translated.

## Batch 446

Case pages are opened with `useOpenCase` (`hooks/useOpenCase.ts`), which addresses them by the case's support reference (`/case/SR-7K2Q-9MXD/synoptic`), never its accession number. See `services/caseAddresses/`.

## Batch 447

Configuration → System → Feedback, and the top bar's QA button follows it.

## Batch 448

Staff → edit → Sign-in password (`Config/Staff/StaffSignInPassword.tsx`).

## Batch 449

Configuration search reaches every inner tab; the Report Templates and Validation Studies screens open the one named in the address.

## Batch 450 — test evidence for Priority 1 and 2 tickets

Config/System, EnhancementRequest and QualityAssurance: logic moved to services, and new tests (PS-38, PS-129, PS-216, PS-217, PS-349).

## Batch 451 — screen-level test evidence for Priority 2 tickets

QualityAssurance, Config (System, Staff), Common and Worklist: screen tests and logic moved to services (PS-48, PS-90, PS-121, PS-130, PS-133, PS-155, PS-204, PS-233, PS-355).

## Batch 452 — Closing the review gaps (PS-131, PS-105, PS-133/PS-323, PS-57), PS-156 correlation window, decant ↔ billing sync, Phase 1 fixes

Editor: inline critical-finding highlights (PS-323). Config: the Correlation window section (PS-156) and visible Modifier Dictionary upload errors.

## Batch 453 — The Batch 452 open items, and the native-speaker review register

`Config/`: a Biopsy-to-resection correlation settings section, built from the cytology correlation-window screen.

## Batch 454 — Follow-up not received: report, alerts and clinician email

- `QualityAssurance/`: the Follow-up not received tab.
- `Config/System/`: Follow-up tracking settings.

## Batch 455 — Demo baseline: people, pools, cases and the reset

`Config/System/DemoResetTab.tsx`: Full Reset only.

## Batch 458 — PS-71: every case save carries its version

PS-71 (Pete's optimistic-locking spec, Oct 4): a save made from an old copy of a case no longer overwrites someone else's newer save. See `services/cases/caseWrite.ts` and `docs/architecture/CASE_API.md`.

Pool claim modal: losing a claim race is shown.

## Batch 459 — PS-152 discordance report, follow-up after sign-out

- Quality Assurance → Cytology has a "Primary vs Final Diagnosis" report: each case's primary screen compared with the review chosen as its Final Diagnosis (PS-152).
- A signed-out surgical case can be marked "follow-up expected" from the report page's action bar, not only in the sign-out modal.
- Stale README notes corrected (cytology correction and addendum, autopsy authorization form).

## Batch 460

`Billing/CaseBillingReview.tsx`: the billing review panel and its prompts, for the Cytology Workspace and Microtomy.

## Batch 461

New folder `OrganMap/`: the anatomical map companion on the report page (`OrganMapPanel`, `OrganMapSvg`). The map is drawn from the synoptic answers and has no Save of its own.

## Batch 463

`OrganMap/`: the Mohs stage canvas and stage question. `Config/`: Mohs field type, template, bindings and colours preview.

## Batch 463b

`OrganMap/`: the Mohs block selector and problem flags. `Config/`: the default-histology setting and its refusal message.

## Batch 464

Organ maps: colorectal drawing; Configuration: margin rules and colorectal bindings.

## Batch 465

Organ maps: head and neck drawing, outline halos; Configuration: oral margin rules, neck bindings, `HEAD_NECK` category.

## Batch 465b

Organ maps: two-layer outline halo. Configuration: oral rule conflict warnings.

## Batch 466

Configuration: kidney margin rules and renal previews.

## Batch 466b

Configuration: derived margin questions and editor count settings.

## Batch 466c

- **`Config/Protocols/SynopticEditor`:** builds "unless" / "or also when" conditions and the checked hand-entered total.
- **`Config/System/OrganMapsSection`:** an adenoma-at-margin option for the colorectal polyp. (Replaced in Batch 466d by margins per component.)

## Batch 466d

**`Config/System/OrganMapsSection`:** margin questions are bound per component, with a review notice for bindings saved before this batch.

## Batch 467 — In-house molecular orders

`Config/`: the Synoptic Editor's molecular result binding and the Stain Dictionary's in-house labs.

## Batch 468 — Autopsy: consent-scope enforcement, forensic chain-of-custody

`Autopsy/AutopsyAuthorizationCompletionForm.tsx`: two new structured consent-scope controls (excluded organs, retention permitted) — see that folder's own README.

---
*Tracking: `PRIORITY_FIXES.md` was retired 2026-08-19 — its open items are
Jira PS-57 to PS-71, so `PRIORITY_FIXES.md #N` citations throughout these
READMEs are historical (see `docs/ARCHIVE.md`). `ACCESS_CONTROL_PLAN.md`
lives in `docs/architecture/`. Working rules for every change: repo-root
`CLAUDE.md`.*

## React Router 7 (Batch 341, PS-344)

Every file here that used `react-router-dom` now imports the same hooks and components from `react-router` 7 (`react-router-dom` was removed from the project). Nothing else changed: the app had already opted into version 7's behaviour. See `src/i18n/README.md` → Batch 341.

## Signing (Batch 344, PS-60 follow-up)

[`Signing/`](Signing/README.md): the "confirm it's you" step before a signature. It has two parts:
- `SignerConfirmationFields`: password fields for demo sessions, or a note that the identity provider will ask again for SSO sessions.
- `SignatureConfirmModal`: a small modal for the cytology sign-out and the autopsy PAD/FAD, which had no confirmation at all.

The decisions are in `services/auth/signerConfirmation.ts`.

**Batch 345:** `Config/Staff/LinkedSignInAccounts.tsx`, a person's linked single-sign-on accounts in Staff → edit, with Unlink (audited).

## Batch 355

`Contribution/qualityCalculations.ts`: a comment that pointed to the deleted informal-review banner was updated (PS-346).

## Batch 365 (PS-347)

`NavBar/LanguageSwitcher.tsx` offers Belgian French (FR-BE). The menu names both French variants.

## Batch 367 (PS-74): no inline CSS

Subfolders converted their last inline styles to `pathscribe.css` classes (see each folder's README). Standing rule 1 now holds app-wide, checked by `services/styleRules/inlineCss.guard.test.ts`.

## Batch 368

Several component folders now take their services from `@/services` instead of mock files, and came off the deployment baseline. The folders are Config/System, Contribution, FacilityDictionary, QualityAssurance, Search and TemplateBuilder; see each README.

## Batch 369 (PS-355)

- **`Common/CapabilityButton.tsx`**: an action button greyed out, with the reason, when the user lacks its capability.
- **`Config/Staff/`**: the Role Dictionary's Capabilities tab, with dependency prompts. The old Permissions tab is renamed Commands.
- **`QualityAssurance/`**: every export button is gated by that report's own capability. Five tabs are off the deployment baseline.

## Batch 370 (PS-356)

- **`Config/Staff/`:** role and staff saves are checked, and the self-escalation gap is closed. Staff get a facility assignment. The role-level switches that did nothing are removed.
- **`Config/System/DemoResetTab`:** the logic is in `services/demoReset/`, and the full reset needs a capability.
- **`QualityAssurance/`:** exports carry facility context.
- **`Common/CapabilityButton`:** takes a context and says why a button is greyed out.

## Batch 371

- **`Config/Staff/`:** the Superadmin role is read-only, and managed by ForMedrixAI.
- **`Config/System/`:** governing-bodies editing is for ForMedrixAI support only, and so are the terminology endpoint details.

## Batch 372

- **`Config/System/SupportAccessSection`:** the hospital's support access policy, approvals and support audit; support's access requests.

## Batch 374

- **`Common/ScreenGate`:** the route check for screens.
- **`NavBar`:** the quick case search shows only with Search access, and the credentials line is the user's own.

## Batch 376

- **`Config/System/FieldRequirementsSection`:** required fields by page (PS-359).

## Batch 379

- **`Config/System/FieldRequirementsSection`:** field hints; Grossing's switchable protocol rule (PS-359).

## Batch 380

- **`Config/System/FieldRequirementsSection`:** the Case report page's groups (PS-359).

## Batch 381

- **`Config/System/FieldRequirementsSection`:** the Case report page's group 2 groups (PS-359).

## Batch 382

- **`Billing/`** (new README): the post-sign-out billing reason and applied-code correction modals now take their required fields from Field Requirements; correcting a code needs `billing:applied-code:correct`. Both came off the mock-import baseline.
- **`Config/System/FieldRequirementsSection`:** two more groups on the Case report page (PS-359).

## Batch 383

- **`Autopsy/`:** the authorization completion and body release forms take their required fields from Field Requirements, show "Still required: …", and can be submitted by voice. Releasing a body needs `autopsy:body:release` (`CapabilityButton`). Both forms had no test before; they have one now.
- **`Config/System/FieldRequirementsSection`:** two more groups on the Case report page (Autopsy forms, Sign-out gates).

## Batch 384

- **`AppShell/`:** the New message drawer, reply box and Secure email window take their required fields from Field Requirements (a new Messaging page) and show "Still required: …". Secure email can be sent by voice. `AppShell.tsx` came off the mock-import baseline.
- **`Config/System/FieldRequirementsSection`:** a Messaging page with three groups.

## Batch 385

- **`AppShell/`:** recipients and the secure-email send come from `messageService`; Send, Reply and Secure email need messaging permissions, and a failed send keeps the draft.

## Batch 403

- **`Config/System/StainDictionarySection`:** reference labs linked to molecular tests.
- **`Config/System/FieldRequirementsSection`:** an Add-On Orders page (from the catalog).

## Batch 473 — Autopsy case-type key migration

No behavior change. `Autopsy/AutopsyAuthorizationCompletionForm.tsx` references `caseAuthority`'s renamed forensic-path value, `'medicolegal_forensic'` → `'statutory_judicial'`. See `services/autopsy/README.md`.

## Batch 477 — Autopsy worklist badges (PS-261 follow-up, Module 5)

**`Worklist/`:** new `AutopsyWorklistBadges.tsx`, rendered in both `WorklistTable.tsx`'s table row (Status cell) and its card layout — case authority, an active ancillary hold, PAD/FAD signed, and a TAT/SLA tooltip for the existing Autopsy branch tab's rows. See `Worklist/README.md` and `services/autopsy/README.md`.

## Batch 483 — Cytology gaps + signature viewer (PS-359 tracker follow-up)

**`QualityAssurance/`:** new "5-Year Retrospective Lookback" tile on `CytologyQaTab.tsx`, closing the CYT-QA-03 vs CYT-QA-04 report asymmetry. See `QualityAssurance/README.md`.

## Batch 484 — Inking sign-out/grossing gate engine + Organisation/Site admin UI (PS-519 follow-up)

**`Config/System/`:** new `InkingValidationModeSection.tsx` — the Organisation/Site admin UI's one real missing piece, a facility-scoped WARN_ONLY/STRICT_ENFORCE picker for `inking_validation_mode`, capability-gated (`config:inking-validation-mode:manage`). See `Config/System/README.md`.

## Batch 489 — Tumor Board / MDT Workspace Module 1 (PS-359 follow-up)

**`TumorBoard/`:** new `FlagForMdtModal.tsx` — the manual "Flag for MDT" action, reached from `SynopticReportPage.tsx`'s sign-out flow. The real fix for `'delegation.tumorBoard'` ("Submit to Tumor Board"), a voice/keyboard action declared in `constants/systemActions.ts` but never wired to any handler anywhere until now. See `services/tumorBoard/README.md`.

## Batch 495

`Autopsy/AutopsyBodyReleaseForm.tsx` shows translated release-gate reasons and errors instead of the service's English text. See [Autopsy/README.md](./Autopsy/README.md).

## Batch 499

- **`Config/System/`:** Organ maps — switching level, template, map type or tab asks before dropping unsaved edits (PS-479).
- **`FacilityDictionary/`:** `FacilityEditorModal` no longer breaks the rules of hooks (it returned early, before ten hooks).
- **`EnhancementRequest/`:** the QA feedback button no longer hides itself in production builds; Configuration → System → Feedback decides alone (every built bundle is "production", validation instances included).

## Batch 500

- **`ValidationStudies/`:** the printed validation report escapes the admin-entered values it places in HTML (PS-473).

## Batch 501

- **`Config/System/`:** Cytology QC Rules now take effect at sign-out.

## Batch 502

- **New `ErrorBoundary/`** (PS-472): app, page and panel error boundaries with a translated recovery screen. See [ErrorBoundary/README.md](./ErrorBoundary/README.md).
- **`AppShell/`:** every page is wrapped in a route boundary.

## Batch 504 (lint to zero, PS-470)

- **`QualityAssurance/`:** trend charts bucket by facility month.
- **`Contribution/`:** the productivity charts follow a time zone change.
- **`Worklist/`:** `WorklistTable` dependency lists corrected (no behaviour change).
- **`Flags/`, `InternalNotes/`, `Config/`:** dependency lists corrected or explained.

See `src/i18n/README.md` Batch 504.

## Batch 505 (PS-475)

`AppShell` loads the user and admin guide PDFs only when the About menu opens (`hooks/useGuideAssets.ts`), which took 5.5 MB out of the first page load. See `AppShell/README.md`.

## Batch 506 (PS-477)

Files here that imported a mock service directly now import it from `@/services` (see `services/deploymentReadiness/README.md`). No change in behaviour.

## Batch 511 (PS-478): full strict type-checking

See the Batch 511 notes in `AppShell/`, `Audit/`, `Config/`, `Contribution/`, `FacilityDictionary/`, `Flags/` and `QualityAssurance/`.

## Batch 512

See `Config/System/README.md` (QC override rates show "inherited").

## Batch 513 (PS-269)

See the Batch 513 notes in each folder. Every visible string under `components/` goes through `t()`, guarded by `src/i18n/uiText.guard.test.ts`.

## Batch 514 (PS-269)

- `QualityAssurance/CytologyQaTab.tsx`: numbers in the user's format; percentage points spelled per language.
- `ValidationStudies/`: the printed report is translated.
- `Config/System/PhysiciansSection.tsx`: Korean name display.

## Batch 515

- `Config/System/FppeAssignmentsSection.tsx` and `QualityAssurance/FppeTrackingTab.tsx` moved to the QA supervision service (PS-124).
- `ExternalConsult/`: issuing and revoking links needs a permission (PS-290).

## Batch 516

`Config/System/`: QA review-field editor and the restricts-printing flag setting.

## Batch 517

- **New `SecureEmail/`:** the secure message window, shared by the app shell and the critical-findings flow (PS-143).
- **FacilityDictionary:** new Printing tab (PS-337) and Secure messaging tab (PS-143).

## Batch 518

**QualityAssurance:** new `QaActivityBoardTab.tsx`, the generic activity board (PS-120).

## Batch 519

**Config/Protocols:** Synoptic Editor conditions (PS-493), node counts (PS-494) and cytology narrative settings (PS-273).

## Batch 520

**Config/System:** Delivery Rules set channels by role, with e-fax and file drop (PS-280).

## Batch 521

**AppShell:** runs the delivery background work (retries, fax transmission reports) while someone is signed in (PS-281). **Config/System:** retry waits.

## Batch 522

**ExternalConsult:** links carry the token after `#`; refusals are translated; the banner wording is corrected (PS-290).

## Batch 523

**ClinicalMismatch (new):** the clinical-pathologic mismatch window, moved from the case report page's modals so the Cytology Workspace and autopsy FAD sign-out use it too (PS-145).

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 528 (PS-359): required fields from Field Requirements

`Config/Staff/StaffTab.tsx` and `FacilityDictionary/FacilityEditorModal.tsx` take their required fields from the organisation's Field Requirements, through service checks. Both show stars and a "Still required" line.

## Batch 529 (PS-554)

`Config/System/ClinicalMismatchRulesSection.tsx`: the clinical mismatch risk rules screen.

## Batch 530 (PS-554)

`ClinicalMismatch/`: the inline alert, the one-click decision form and the summary; the window is for high-risk mismatches only.

`ClinicalHistory/CaseClinicalHistoryBar.tsx` (Batch 530): the clinical history line on the report, Cytology Workspace and grossing screens.

## Batch 531

`ClinicalMismatch/`: the earlier decision shown when the alert returns after an edit.

## Batch 533

Configuration → Cytology → Country and laboratory rules: the urgent-preliminary signature setting (`Config/Cytology/CytologyComplianceFeaturesSection.tsx`).

## Batch 534

`ReportRelease/HeldReportsBanner.tsx` (new): one line per report held for the release delay (what, when it goes, who released it), and Recall for that person. The data comes through `hooks/useHeldReports.ts`. Shown on the report page and the Cytology Workspace. `AppShell/AppShell.tsx` starts the background release (`hooks/useReleaseBackgroundWork.ts`).

## Batch 536

Config: AI Instructions and AI vendor policy sections; ClinicalMismatch: the "AI is not available for this jurisdiction" line.

## Batch 543

CSV exports neutralize formula cells (finding F8, `utils/csv.ts`); the disposal report export is audited (F9).

## Batch 544

`QualityAssurance/`: six more QA reports have the facility scope picker. `Config/Staff/`: the signature is a link.

## Batch 547

`RuntimeConfigError/` (new): the screen shown when a deployment's `config.json` is wrong (runtime configuration, `docs/architecture/RUNTIME_CONFIG.md`).

## Batch 548

`Connectivity/` (new): the connection banner. `Common/LoadingState.tsx` and `Common/PageLoader.tsx` (new): waiting states. The 42 screens that showed plain loading text use `LoadingState`: Configuration sections, QA tabs, molecular pages and others.

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- The remaining loading texts in components now go through `Common/LoadingState` (block or inline), and the guard covers the whole app.
- Facility, department and gross imaging vendor editors refuse a logo or address that isn't an https link.

## Batch 553 (PS-539 phase 2d: site agent printers in routing)

- Batch 553: `Printing/PrintDestinationFields.tsx`; site agent printers in `Config/System` and `FacilityDictionary`. *(Batch 552's `Printing/SiteAgentStatusLine.tsx` and `Config/System/SiteAgentsSection.tsx` weren't noted here in Batch 552.)*

## Batch 554 (PS-539 phase 2d: interface monitoring)

- Batch 554: `Interfaces/EngineStatusLine.tsx` (new folder).

## Batch 555 (PS-539 phase 2d: browser stand-ins for server jobs)

- Batch 555: `Config/System/SupportAccessSection.tsx`.

## Batch 557 (PS-539 phase 2d: /api/config and hosting regions)

- Batch 557: `Config/AI/HostingRegionsCard.tsx`; `RuntimeConfigError` marks problems from the server's `/api/config`.

## Batch 567 (WCAG 2.1 AA)

- Batch 567: `AppShell/` (message rows), `Worklist/WorklistTable.tsx` (digital-pathology cells): no control inside another.

## Batch 568 (WCAG 2.1 AA)

- Batch 568: `Config/Protocols/`, `EnhancementRequest/`, `TemplateBuilder/`: no control inside another; the check is now app-wide (`services/accessibility`).

## Batch 569 (WCAG 2.1 AA)

- Batch 569: `AppShell/` (focus after a keyboard delete in the inbox).

## Batch 570 (WCAG 2.1 AA)

- Batch 570: `AppShell/` (focus after delete through the shared hook); tests for `TemplateBuilder/` and `EnhancementRequest/`.

## Batch 572

- `QualityAssurance/CytologyQaTab.tsx`: the workload report's recorded and signed-off hours.

## Batch 573

- `OrganMap/OrganMapPanel.tsx`: the empty presence slot removed (presence is shown above the report's tabs).

## Batch 574

- `Config/Cytology/`: the start of the screening day. `QualityAssurance/`: correction reasons on the workload report.

## Batch 576

- `Config/Cytology/`: cap checks on the Workload cap screen.

## Batch 578

- `Config/Cytology/`: cap errors beside their field; add pickers without existing overrides.

## Batch 579

- `Common/InlineCommentThread.tsx`: dark, labelled, an Add button; logic in `services/templates/templateReviewWork.ts`.
- `Config/Templates/TemplateRenderer.tsx`: the reviewer guide; Reset at the end of the row, unavailable in Draft.

## Batch 580

- `Common/README.md`: PS-62, the styled dropdown list and `utils/selectAutoWidth.ts`.

## Batch 581

- `pathscribe.css` `.ps-conf-backdrop` (Configuration's dialogs): a dialog taller than the window starts below the nav bar and scrolls, instead of losing its top above the screen (found by the PS-363 review test).

## Batch 583

No new components. `HeaderBar.tsx` (breadcrumb names Search for a case opened from Search) and the Configuration dialogs' Discard behaviour changed; see `src/pages/SynopticReportPage/components/README.md` and `src/services/configDirty/README.md`.

## Batch 589

Error boundary `onErrorChange`; AppShell shows the nav bar on the recovery screen (PS-472).

- Batch 609 (part B): the mismatch check on amendments, corrections and addenda (lab setting for holding the release), Final Diagnosis rule on publish, template lifecycle in the Audit Log, Upload Protocol file check. See `src/services/clinical/README.md`, `src/services/templates/README.md`, `src/components/Config/Protocols/README.md`.

## Batch 610 (part B)

Performance targets and client service levels are saved and judged by `services/performanceTargets` and `services/clientSLA`; `services/jurisdictionOverview` feeds the read-only Jurisdiction Overview. The Productivity dashboard (`ContributionDashboardPage`) shows the Targets tile and client service levels, the Quality tab shows client service levels, and `WorklistPage` passes SLA breaches to the table.

- **`Auth/`** (Batch 611, #157): `MfaSignInStep.tsx`, the second step of a password sign-in (Simulated enrolment, recovery codes, code entry, demo code).
- **`Migration/`** (Batch 611, #132/#166): `LegacyImportModal.tsx`, the simulated Import legacy file window. See `Migration/README.md`.

- Batch 612 (part A): `InterfaceDictionary/` (mapping editor, test panel, scope reference) and `VendorFields/` (case sidebar panel).

Batch 614: `Coding/CodeSystemOffNote.tsx`, the short note a coding screen shows when the Code Systems setting has switched a system off.
## Batch 638

Batch 638 (Oct 20, 2026): CSMS messages wait for the eligibility check; Belgian Dutch dictation option; colleague reassignment room prorated by logged hours; surgical demo patients in the patient index. See `src/i18n/README.md` and `docs/product/GUIDE_UPDATES.md`.

## Batch 640

Batch 640 (Oct 20, 2026): self-collected HPV recall windows and wording are set per country (Australia, New Zealand) by the laboratory's administrator, from a dropdown. See `docs/architecture/HPV_RESULT_INBOUND.md` section 8.

## Batch 641

Batch 641 (Oct 20, 2026): recall documentation corrected (no sign-off needed for windows or wording; codes belong to the interface engine); PS-539 readiness status refreshed; recall card loading fix.

## Batch 642

Batch 642 (Oct 20, 2026): sign-out authentication policy. An administrator sets, in Session Security, whether signing a case out asks for a password every time (default) or once per session, with an optional second factor, an enterprise default, per-performing-facility overrides and a lock; the Sign Out button shows "(Password Required)" when a password is needed; every policy change, authentication, in-session sign-out and expiry is audited with full context. Remote sign-out limits and workstation lock need the API server (phase 2e). See `docs/architecture/SIGN_OUT_AUTHENTICATION.md`.

## Batch 651: AI answers checked in code
See `services/aiIntegration/aiSuggestionRules.ts`, `services/coding/aiCodeSuggestions.ts`, `orchestrator/narrativeProvenance.ts` and `docs/product/GUIDE_UPDATES.md` (Batch 651).

## Batch 652 (defect fixes)

See `Config/System/README.md`: External Resources accepts https only.

Batch 669: `Flags/FlagManagerModal.tsx` audits flag changes at Save only (Cancel leaves no audit entries).

## Batch 669f

`CytologyQc/CytologyQcDiscrepancyModal`: optional secondary code with an in-window confirmation; `AppShell`: message rows show unread per person.

- **Batch 669 (access-11):** `ExternalConsult/ExternalConsultAccessModal` has the audited, default-off "show full name and date of birth" opt-in for outside consult links.
