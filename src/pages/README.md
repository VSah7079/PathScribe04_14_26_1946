**Batch 651 (audit gaps):** the report page posts case and specimen comments through `services/cases/postCaseComment.ts` (audited, no comment text); see `services/auditlog/README.md`.

**Batch 650:** screens now answer registered voice and key commands they ignored: Report bar (Sign Out Case, History, Codes, Finalise, Add Amendment), Worklist tiles, Search (Execute, Clear). See `SynopticReportPage/`, `WorklistPage/`, and `docs/product/KNOWN_GAPS.md`.

**Batch 649:** the surgical report page's sign-out paths (see `SynopticReportPage/README.md`), the Accession page's case creation, the Codes window, the cytology pool buttons and the Quality Assurance deficiency actions are gated by the 17 new capabilities (`services/authorization/README.md`).

**Batch 645:** `LockboxDropOffPage/` is Lockbox Drop-Off (`/lockbox-drop-off`, Home tile after Intraop Queue; capability `screen:lockbox-drop-off:open`): a scan-first kiosk for specimens dropped after hours (a pending order is received at once; an unknown barcode asks a few optional placeholder details; Urgent with an optional callback number) and, with `lockbox:folder:review`, the Overnight folder with Mark accessioned, Link to order and the time-to-receipt summary. Service `services/lockbox/`; contract `docs/architecture/LOCKBOX_API.md`. Home gains the tile (`Home.tsx`, colour `#86EFAC`, checked by `Home.tileColors.test.tsx`).

# pages/

**Batch 646:** `ConfigurationPage` shows a Help button (top right) that opens the open tab's or section's page in the Administrator Guide; `MigrationJobsPage` shows one under its title.

Top-level route pages.

**Batch 619 (part Q):** `OutboundQueuePage/` is the Outbound Queue screen (`/outbound-queue`, Quality & Compliance hub): every outbound message in one list with hold, release, retry, registry resubmit and billing retract. See [OutboundQueuePage/README.md](./OutboundQueuePage/README.md).

## Subfolder index

| Folder | What it is |
|---|---|
| [AccessionPage/](./AccessionPage/README.md) | Case accessioning form + order lookup/intraop-merge/deficiency modals |
| [AddOnOrderPage/](./AddOnOrderPage/README.md) | **NEW (Sep 2026)** — PS-287, fourth of the PS-284→285→286→287→288 workstation-build sequence: case-scoped, pathologist-initiated add-on orders (recuts, special stains, IHC, molecular/send-out) with routing, auto-control pairing, real-time order tracking, and a block-exhaustion exception/notification loop (`/add-on-orders`) |
| [BatchManagement/](./BatchManagement/README.md) | Cassette/slide chain-of-custody + the disposal/pending-load computed queues, disposal report, slide scanning, engraver monitor and equipment log |
| [CytologyWorklistPage/](./CytologyWorklistPage/README.md) | The Cytology Workspace: worklist (`/cytology-worklist`) and screening page (`/cytology-worklist/:caseId`), behind `screen:cytology-workspace:open` |
| [CriticalAlertReferencePage/](./CriticalAlertReferencePage/README.md) | **NEW (Sep 2026)** — PS-136 follow-up redesign: the public, unauthenticated, zero-PHI landing page (`/critical-alert/:token`) behind the SMS/secure-email "tap to view" reference link — never renders clinical content, see the folder's own README |
| [EmbeddingStationPage/](./EmbeddingStationPage/README.md) | **NEW (Sep 2026)** — PS-285, second of the PS-284→285→286→287→288 workstation-build sequence: bench-scoped, scan-driven cassette piece-count verification, discrepancy flagging, mold/orientation selection, and split-block tracking (`/workstations/embedding`), visually matching `MicrotomyWorkstationPage/`/`GrossingScreenPage/` |
| [ExternalConsultViewPage/](./ExternalConsultViewPage/README.md) | **NEW (Sep 2026)** — PS-290, the outside half of External Consult / Second-Opinion Access: a public, unauthenticated route (`/consult/:token`) an outside consultant opens directly, no PathScribe login of their own. NOT real token security — see the folder's own README |
| [FacilityOpsDashboard/](./FacilityOpsDashboard/README.md) | **NEW (Sep 2026)** — PS-288, fifth and final of the PS-284→285→286→287→288 workstation-build sequence: five high-contrast, wall-display department dashboard views (Grossing & Intake, Embedding & Microtomy, Staining & IHC, Send-Out & Reference, Diagnostic Sign-Out/Scanner) bound via a Display Profile (`/facility-ops-dashboard`), same public/unauthenticated kiosk-route posture as `OrSuiteDashboardPage.tsx` |
| [GrossingScreenPage/](./GrossingScreenPage/README.md) | **NEW (Sep 2026)** — Protocol-Driven Workflow Infrastructure story Part 3: the grossing tech's own dedicated workflow surface (`/case/:caseId/grossing`), separate from the pathologist's `SynopticReportPage/` |
| [LabelDesignerPage/](./LabelDesignerPage/README.md) | Real, drag-and-drop label layout designer, registered as a Config > System tab, not a standalone route |
| [MicrotomyWorkstationPage/](./MicrotomyWorkstationPage/README.md) | **NEW (Sep 2026)** — PS-284, first of the PS-284→285→286→287→288 workstation-build sequence: bench-scoped, scan-driven real-time/batch slide label printing, stain management, and cytology/decant prep (`/workstations/microtomy`), visually matching `GrossingScreenPage/`/`SynopticReportPage/` |
| [MockInterfaceEnginePage/](./MockInterfaceEnginePage/README.md) | Dev-only control panel for the mock PS-239 backend endpoint (`/dev/mock-interface-engine`, not linked from any real navigation); needs Configuration access since Batch 427 |
| [modals/](./modals/README.md) | Top-level page modals that don't belong to any single page's own folder |
| [MolecularBatchManagement/](./MolecularBatchManagement/README.md) | Real, read-only molecular QC-run/cytology-specimen association view (external, HL7-sourced) — now the Workcenter's own "QC & Specimen Association" tab |
| [MolecularBatchPage/](./MolecularBatchPage/README.md) | Plate builder + extraction racks + control rules for the Full Molecular Testing Execution Module |
| [MolecularWorkcenterPage/](./MolecularWorkcenterPage/README.md) | Real, single `/molecular` entry point (tabs: Order Queue / Worklist & Plate Builder / Active Runs & Batches / History & Archive / QC & Specimen Association), replacing two former, separate tiles |
| [PathologyWorkspacePage/](./PathologyWorkspacePage/README.md) | The Pathology Workspace hub (`/pathology-workspace`): tiles for Cytology, Microtomy, Embedding, Slide Distribution, Molecular, Batch Management and Margin Exception Review |
| [QualityComplianceHubPage/](./QualityComplianceHubPage/README.md) | The Quality & Compliance hub (`/quality-compliance`): Audit, Quality Assurance and Registry Exceptions |
| [RegistryExceptionsPage/](./RegistryExceptionsPage/README.md) | Registry submissions needing a person (`/registry-exceptions`) |
| [ReportPreview/](./ReportPreview/README.md) | Orchestration mode's template-driven report preview renderer, and the detachable preview window (`/report-preview/:caseId`) |
| [SlideDistributionStationPage/](./SlideDistributionStationPage/README.md) | **NEW (Sep 2026)** — PS-286, third of the PS-284→285→286→287→288 workstation-build sequence: continuous-scan checkout to pathologists or digital-scanner ingestion, with split-destination warnings and exception handling (`/workstations/slide-distribution`) |
| [Synoptic/](./Synoptic/README.md) | Shared types/hooks extracted from `SynopticReportPage.tsx`, plus Codes/Comments/Delegate/UI subfolders |
| [SynopticReportPage/](./SynopticReportPage/README.md) | **Central folder** — the core clinical workflow (`/case/:caseId/synoptic`): hooks/components/modals. Sign-out and the case team are jurisdiction-aware (Sep 2026): the performing lab's country decides who may sign out, whose work needs a countersign, and which roles are offered |
| [system/](./system/README.md) | Admin config pages rendered by `Config/System/index.tsx`'s route switch |
| [WorklistPage/](./WorklistPage/README.md) | Sortable/filterable case table + its own modals |

*Corrected in the Batch 496 README audit (Oct 9, 2026): Batch Management has no retention-hold queue; the Molecular Workcenter has an Order Queue tab; added the four folders the index left out (Cytology, Pathology Workspace, Quality & Compliance, Registry Exceptions) and the preview window route.*

This file also covers the loose files that sit directly in `pages/`
with no folder of their own — filled in incrementally as the
`src/pages/` review reaches each one, not written all at once.

## Files reviewed so far

- **`MockEMRPage.tsx`** — Mock/demo NHS EMR interface, embedded to
  simulate an external system integration during demos. Deliberately
  styled to look distinct from PathScribe's own dark theme (NHS blue,
  light background) — that's real, intentional, not a design-system
  violation; the distinctiveness lives in the CSS values, not in
  whether they're inline. **Fixed:** all ~30 inline styles moved to the
  new `.ps-mockemr-*` class family; 2 unnecessary `as any` casts removed
  (`caseRouter.getAll`'s opts param, the `res.data` array — both
  verified non-load-bearing via `tsc`). Real bug fix already in place
  from an earlier session, left untouched: the page used to hardcode a
  single recognized patient ID and silently show an unrelated patient
  for anything else — now does a real MRN lookup with an honest "No
  Patient Found" state.

- **`ConfigurationPage.tsx`** — Top-level tabbed Configuration shell.
  **Fixed:** all inline styles moved to the new `.ps-cfgpage-*` class
  family. `useIsAdmin()`/`useIsSuperAdmin()` were independently
  re-parsing `localStorage.getItem('pathscribe-user')` — the exact
  storage key `contexts/AuthContext.tsx` already owns and exposes via
  `useAuth()`. Rewrote both to consume `useAuth()`'s `user.role`
  instead, so there's one source of truth for the stored shape rather
  than two implementations that could drift. Also replaced a
  direct-DOM-mutation hover effect (`onMouseEnter`/`onMouseLeave`
  writing `e.currentTarget.style.color`) with a real CSS `:hover` rule
  on the new `.ps-cfgpage-tab-btn` class — the JS version bypassed
  React's rendering model for something CSS already does natively.
  **Real bug found and fixed since, per direct report**: switching a
  top-level tab, or a section within System, never reset
  scroll position — the next tab/section could load already scrolled
  down, hiding its own add button and column headers until manually
  scrolled up. Root cause: `.ps-cfgpage-scroll` (confirmed via its own
  `overflow-y: auto`) is the real, single, shared scroll container for
  the whole page, but the real state change that can trigger a switch
  (`Config/System/index.tsx`'s own internal `setActive`) happens
  two component levels below it — a prop couldn't reach it without a
  larger refactor. Fixed with a small, shared, tested utility
  (`utils/resetConfigScroll.ts`) called from all real trigger paths:
  this file's own `handleTabChange`, System's own sidebar clicks,
  System's own URL-deep-link `useEffect`, and System's voice-navigation
  event listener. Verified live, every path independently, with a
  forced-scrollable viewport and a confirmed non-zero scroll position
  before each switch — not assumed from one working case.

  **Real fix (PS-128 — "Config Page does not honor dirty flag checks"),
  Sep 2026.** This page's own tab-switch (`handleTabChange`), its
  `PATHSCRIBE_NEXT_TAB`/`PATHSCRIBE_PREVIOUS_TAB` voice-nav listeners,
  and `ConfigSearchBar`'s `onNavigate` all called `navigate()`
  unconditionally — a nested tab's own real, local "unsaved draft"
  state had no way to be seen, so switching tabs silently discarded it.
  Investigated broadly before touching anything: only one real,
  confirmed case actually lives inside this page's own tab tree —
  `Macros/MacroPanel.tsx`'s real `isDirty` (previously known only to
  its own Save button). `TemplateRenderer.tsx` and `SynopticEditor.tsx`
  both have their own real `isDirty`/navigate-away guards already, but
  both are separate, standalone routes (`/template-review/:templateId`,
  `/template-editor/:templateId`) never mounted inside this page's own
  tab system at all — ruled out directly via `App.tsx`'s route table,
  not assumed from file location. Fixed with a small, shared,
  opt-in bridge (`components/Config/configDirtyGuardContext.ts` — a
  React Context carrying one `setDirty(boolean)`, since only one tab is
  ever mounted at a time here) that `MacroPanel.tsx` now feeds. A new
  `tabIsDirty` state on this page gates every one of the three real
  navigation paths above through one shared `guardedNavigateToTab`,
  showing the same shared `ConfirmModal` component this app already
  standardized on (never `window.confirm()`) before actually
  discarding. Real, honestly disclosed scope limit: the other ~30
  Config admin screens (dictionaries, routing rules, etc.) each manage
  their own add/edit state inside their own modal-based CRUD flows,
  not an inline, page-persistent draft the way Macros does — this
  page-level guard genuinely doesn't apply to them the same way, so
  they were deliberately left alone rather than exhaustively retrofit
  in one pass. New tests: `pages/__tests__/ConfigurationPage.test.tsx`
  (the guard logic itself, via a mocked stand-in tab), plus
  `components/Config/__tests__/configDirtyGuardContext.test.tsx` and
  `components/Config/Macros/__tests__/MacroPanel.test.tsx` (the new
  context module, and `MacroPanel.tsx`'s own real reporting into it).

- **`LoginPage.tsx`** — Public unauthenticated route. Already in good
  shape structurally: `attemptLogin`/`handleSubmit` are named functions
  (not anonymous JSX closures), correctly uses the shared `ConfirmModal`
  for the "already signed in elsewhere" session-conflict gate (not
  `window.confirm()` — this file is
  the pattern other files should follow, not an offender), no inline
  styles, no dead code. **Fixed:** `resolveEnvironment()` had an
  unnecessary double-cast on `import.meta.env.VITE_APP_ENV`
  (`(import.meta as unknown as { env?: Record<string, string> })...`).
  **Batch 343 (PS-60), single sign-on:**
  - one working button per provider configured for the build; with none, the disabled "Soon" row stays as before;
  - the password form only when the build allows it (demo accounts); in an SSO-only build with nothing configured, "Sign-in isn't set up…";
  - after signing in, back to the page the user wanted (`from`, passed by `ProtectedRoute`);
  - a refused SSO sign-in is explained through `login.ssoError.*`, in five languages;
  - the superseded notice goes through `sessionSupersedeService`, so the page is off the browser-storage baseline.
- **`AuthCallbackPage.tsx`** (new, Batch 343, PS-60): public route `/auth/callback/:providerId`, where the identity provider returns.
  - Finishes the sign-in through `useAuth().completeSsoSignIn`.
  - Signed in: goes to the page the user wanted.
  - Already signed in elsewhere: shows the same conflict prompt as the password form.
  - Refused: back to `/login` with the reason.
  Traced why it existed and why it wasn't needed: Vite's own `ImportMetaEnv` base
  type is a permissive `any` fallback, so the cast was pure dead
  weight. The SSO buttons (Google/Microsoft) are intentionally
  disabled with `aria-disabled` and a "Soon" badge — not a bug, that's
  the resolved state of the "SSO buttons were fully non-functional"
  finding from an earlier session.

- **`FullReportPage.tsx`** — Standalone (outside `AppShell`) full-report
  view, reached from Worklist rows, Messages portal "view case", and
  pool-case links. The heaviest inline-style offender found so far in
  `pages/` — the entire layout, including a JS-object style-token
  pattern (`const S = {...}` typed with `React.CSSProperties`) that was
  really just inline styles centralized in JS rather than CSS.
  **Fixed:** all of it (~60 style instances) moved to the new
  `.ps-report-*` class family. 3 more direct-DOM-mutation hover hacks
  (`onMouseEnter`/`onMouseLeave` writing `e.currentTarget.style`)
  replaced with real CSS `:hover` rules — same pattern as
  `ConfigurationPage.tsx`'s tab buttons. `location.state` had two
  redundant casts: `useLocation()` always returns `Location<any>` since
  it isn't generically parameterized, so `(location.state as any)` was
  casting an already-`any` value to `any` again. Replaced with a real
  `FullReportLocationState` interface describing the two fields this
  page actually reads (`fromFilter`, `fromMessages`). Removing the old
  `S` object also left the `React` default import unused (caught by
  `tsc` after the edit — this file uses the new JSX transform, so
  `React` was only ever needed for `React.CSSProperties`). Also
  extracted one inline JSX display-string computation
  (`PoolClaimModal`'s `caseSummary` prop) to a named const.

- **`QualityAssurancePage.tsx`** — renamed from `DeficienciesPage.tsx`
  (the underlying specimen-deficiency domain terminology below is
  unchanged; the page itself now also covers Intraoperative Linkage,
  Discordance & Reconciliation, Countersign Turnaround, Access Request
  Response, and FPPE Tracking as additional tabs — this section
  documents the original deficiency-management work queue specifically).
  ISO 15189-driven nonconformance
  (deficiency) management work queue: Open → Pending Verification →
  Closed, plus Management Reviews and several other QA sub-tabs.
  Genuinely well-architected already: `ResolveModal`/`VerifyModal` are
  properly extracted named components, all handlers (`handleResolve`,
  `handleVerify`, `columnsFor`, etc.) are named functions, not inline
  JSX closures. **Fixed:** 2 inline styles in the trend-chart tooltip
  moved to new `.ps-defic-trend-tooltip-closed`/`-reopened` classes;
  2 unnecessary `as any` casts on `toLocaleDateString` options objects
  removed (verified via `tsc`); the recharts `Tooltip` content prop's
  `any` typing replaced with the library's own exported
  `TooltipContentProps` type. That last one surfaced a wider
  duplication (fixed, 5/5): the exact same
  `any`-typed tooltip pattern is repeated in 4 more files under
  `components/`, not touched here since those were already covered by
  an earlier review pass.

  **Restructured in a later session**, following a request to make this a genuine working
  queue rather than a browsable archive:
  - Fixed a real infinite-render-loop bug in `FlagManagerModal` (a
    sibling component this page links out to) that was almost
    certainly the true cause of a reported "Discard Changes silently
    loses saved work" report — see that component's own entry.
  - Added `?open=<id>` deep-link support — lands on the record's own
    tab, scrolls it into view, briefly highlights it. Built after
    tracing a dead end: Contribution Dashboard's own Quality Flags
    widget correctly showed a user's open deficiencies but linked to
    the case's synoptic page, which has no way to actually resolve one
    (only this page does) — see `ContributionDashboardPage.tsx`'s
    entry below.
  - The Open and Pending Verification tabs were merged into one,
    "Case-Specimen Deficiency" — both statuses shown together (still
    genuinely separate statuses, just not split across two tabs),
    grouped into Case-Level/Specimen-Level sections and sorted by
    accession number within each group, with a per-row colored status
    circle (reusing the existing `.ps-conf-status-dot` pattern already
    used elsewhere in Configuration, not a new one-off) distinguishing
    which is which. Closed remains its own separate tab, unchanged —
    still needed for the active Management Review batch-review
    workflow, not purely archival.
  - The *complete*, permanent historical record (all statuses, for
    compliance/inspection purposes) now lives separately, in System
    Logs' new "Quality Control" tab — see `AuditLogPage.tsx`'s entry
    below. This page stays focused on active work.
  - **Real, new tab, per direct guidance ("Perhaps a new section of
    Quality Assurance maybe Patient Management")**: `patient-management`
    (`components/QualityAssurance/PatientManagementSection.tsx`),
    registered under the same `'operations'` pillar as
    `patient-match-review` — full account in that folder's own README.

- **`AuditLogPage.tsx`** — *(Batch 669: the page footer with the fixed "SYSTEMS OPERATIONAL" and "HIPAA Compliant" text was removed; only the computed per-tab "Showing x of y" counts remain. `AuditLogPage.noFixedClaims.test.ts` guards it.)* System audit/error log viewer with role-based
  scoping (pathologists see only their own case activity; validation
  study events hidden from non-admins), CSV export, and date-range
  filtering. Heaviest file reviewed so far after `FullReportPage.tsx` —
  69 inline styles plus 4 direct-DOM-mutation hover hacks.
  **Fixed:** all of it moved to the new `.ps-auditlog-*` class family;
  `getTypeStyle`/`getSeverityStyle` converted from returning raw
  bg/color hex values to returning a class-name modifier + label, so
  the badge colors live in CSS, not JS; the last `as any` cast in the
  file (`errorResolved`'s select) narrowed to its real literal union
  type; a `stats` array computed inside an inline JSX IIFE
  (`{(() => {...})()}`) extracted to a named component-body value —
  same standard applied to embedded business logic found elsewhere in
  this review. Also consolidated a **third** independent copy of the
  `localStorage.getItem('pathscribe-user')` role-parsing duplication
  (a module-level `getRole()` plus a component-level `storedUser` IIFE,
  both bypassing `AuthContext`) onto `useAuth()` — same fix already
  applied to `ConfigurationPage.tsx`. **Real, small update (PS-113,
  Stage 4):** the reconciliation log tab reads from the new, generic
  `qaActivityRecordService` now, filtered to the real Frozen vs Final
  activity type, not the old `reconciliationService`.

  **Real bug found and fixed:** the page rendered `ResourcesModal` and
  tracked `isResourcesOpen` state, but had no way to ever set it to
  `true` — no button, no listener, nothing. `WorklistPage.tsx` renders
  the same modal correctly via a global `PATHSCRIBE_PAGE_OPEN_RESOURCES`
  window event; this page was just missing that listener entirely.
  Fixed.

  **Grew a third tab in a later session:**
  "Quality Control," alongside Audit Log and Error Log, matching
  every one of their conventions exactly (tab-switcher badge, stats
  cards, status/level/date-range/search filtering, the same
  compliance-oriented CSV export with a notice/filters/requester/
  record-count header). This is now the permanent, complete Quality
  Assurance record — every deficiency regardless of status, the record
  meant to hold up under a CAP or other certification inspection —
  deliberately separate from `QualityAssurancePage.tsx`'s own working
  queue, which stays active-work-only. Defaults to All Time rather
  than the Audit tab's last-7-days default, since completeness is the
  point here. Also fixed in the same pass, not scoped to just the new
  tab: all three exports on this page (Audit, Error, now Quality) had
  hardcoded `"Requested By": "Unknown"` regardless of who was actually
  logged in — a real gap given the stated purpose of these exports.
  Fixed once at the root (`requestedByLabel`, derived from the real
  `useAuth()` user), so all three benefit, not just the new one. One
  inline style slipped into the initial build of the new tab (the
  Pending Verification status badge) — caught and moved to a proper
  class.

  **Renamed and substantially expanded in a later session still:**
  "Quality Control" → "Quality
  Assurance," and grew from covering just Deficiencies to all 8 tabbed
  item groups the working queue itself has (Intraoperative Linkage,
  Discordance & Reconciliation, Countersign Turnaround, Credentialing
  Review, Post-Finalization Drift, Patient Match Review, Management
  Reviews, alongside Deficiencies). A normalized `QualityRecord` shape
  now covers all 8, each keeping its own real status vocabulary rather
  than one fake shared set — investigated each group's actual
  underlying type before writing the mapping (`IntraoperativeEntry.
  status`, `ReconciliationRecord.outcome`, `CountersignRecord.status`,
  `FppeAssignment.status`, Post-Finalization Drift's real audit-log
  event names, etc.), not guessed. Filter row is now Group → Status
  (adapts per group) → User → Date → Search. A real service gap found
  and worked around along the way: Patient Match Review's own service
  has no cross-organisation `getAll`, only an org-scoped
  `listPendingReview` — aggregated across every organisation rather
  than silently showing just one. Management Reviews included as its
  own group despite having no real open/closed lifecycle — a completed
  review is itself the compliance evidence a review happened, per
  Pete's own reasoning when this was discussed directly.

  **Grew a real, restricted "🔗 Map Patient" trigger (originally "⚡
  Break-Glass Rebind" — see below), per direct
  confirmation, building Phase B of the "Interface Exception &
  Case-Binding Module"**: a button surfaced on the Interface Log tab
  (originally alongside the "🔌
  Interfaces" pill — see below) and gated to `isAdmin` at both the trigger and the
  modal render itself (defense in depth), opening
  `components/Audit/BreakGlassRebindModal.tsx`. A real, deliberate
  fail-safe found while wiring this in: never falls back to a guessed
  `organisationId` if the real session's own is unresolvable — a
  restricted tool silently operating on the wrong tenant's patient
  pool is a real, serious risk, so an unresolvable session simply
  doesn't render the button or the modal at all, matching this app's
  established "fail-safe rather than guess" posture elsewhere, rather
  than defaulting to a specific organisation.

  **Real, complete Interface Log redesign, later the same session,
  per direct feedback ("I feel like it deserves its own section
  because there is so much going on between PathScribe and the engine
  and instruments and 3rd party").** What was a "🔌 Interfaces" pill
  within the Error Log tab became a genuine, independent fourth
  top-level tab — its own real filter pills (Pending/Resolved/
  Dismissed, each with a real, live count), its own search state, its
  own CSV export (`exportInterfaceCSV`, matching the same meta-header/
  PHI-safety convention already established for the other three
  exports on this page — was the one real gap; Audit, Error, and
  Quality already had this). The old `?tab=errors&pill=interfaces`
  deep-link still works (real backward compatibility for
  `CrosswalkSection.tsx`'s own Unmapped Stubs banner) alongside the
  new, canonical `?tab=interfaces`. The "⚡ Break-Glass Rebind" trigger
  above was renamed "🔗 Map Patient" in this same pass — see
  `components/Audit/README.md` for the fuller account of that rename.

  **Real stats-grid removed entirely**, per direct feedback ("I would
  remove the tiles all together, recover the vertical space"): the
  four big stat cards per tab were purely visual (no `onClick`),
  duplicating the real, working filter-pill row directly beneath them
  — real, live counts now live only on the pills themselves (all four
  tabs), recovering the vertical space the cards used to take.

  **Real corner-badge positioning fix, three passes, per direct
  reports the count was covering the pill's own label text.** First
  attempt used a negative-offset, absolute-positioned badge outside
  each pill's own box (`ps-nav-badge`'s real, established pattern,
  used on the top nav's own message icon) — still overlapped a short
  label like "All," since there wasn't real room before the edge, and
  risked being clipped by any ancestor with `overflow: hidden`. Fixed,
  real approach: reserved padding *inside* each button specifically
  for the badge, with a non-negative offset, so the badge's own zone
  and the label's own zone can never overlap regardless of label
  length — applied identically to both the top-level tabs and all
  three sub-pill rows.

  **Real modal-clipping fix.** The "New Billing Code"/RVU Code Map
  modals (`components/Config/System/BillingDictionarySection.tsx`,
  `RvuCodeMapSection.tsx`) use the shared `ps-ms-overlay`, whose own
  `align-items: center` pushes a modal taller than the viewport off
  the top of the screen equally with the bottom — confirmed the real
  nav bar (`.ps-nav`) is exactly 80px tall, `position: sticky`, with
  its own `backdrop-filter` (a real, separate CSS stacking context per
  spec). A new, scoped `ps-ms-overlay--top-align` modifier (real
  clearance well past that 80px) fixes this for those two modals
  specifically — the shared class itself was deliberately left alone,
  since 28 other real modals across the app depend on it unchanged.
  **Real, per direct guidance ("Any existing gaps to deal with?" — no
  DLQ/retry UI for the two new real outbound patient-ADT/result
  queues, unlike billing's own `OutboundDlqSection.tsx`):** the
  `'interfaces'` tab now has its own real sub-tab structure, mirroring
  `'financial'`'s existing `financialSubTab` pattern exactly
  (`interfacesSubTab: 'exceptions' | 'outbound_dlq'`) — the pre-existing
  Interface Exceptions content moved under its own `'exceptions'`
  sub-tab, unchanged, alongside the new `'outbound_dlq'` sub-tab
  rendering `OutboundInterfaceDlqSection.tsx`. Deliberately placed
  under this tab, not `'financial'` — Patient-ADT/Result dispatch
  failures are a genuinely different real domain from billing, and
  `'interfaces'` (inbound HL7 exception review) is architecturally the
  same "operational, day-to-day monitoring queue belongs in Audit, not
  admin configuration" category `OutboundDlqSection.tsx`'s own header
  already established, just for outbound instead of inbound.

  **Real, per direct UI-review follow-up ("Fix the root" — background
  inconsistency across pages): this page's own `.ps-auditlog-bg`/
  `.ps-auditlog-bg-grad` background-image layer, and `.ps-auditlog-page`'s
  own hardcoded `background-color: #000; color: #fff;`, both removed
  entirely.** This page now falls through to `AppShell.tsx`'s own,
  real `.ps-app-root` background (see that folder's own README for
  the fuller account of the inline-style bug this whole pass traced
  back to) — matching Configuration/Quality Assurance/Intraop Queue/
  Contribution's existing, correct behavior.

- **`OutboundInterfaceDlqSection.tsx`** — new, real, per the same
  direct guidance above. Mirrors `OutboundDlqSection.tsx`'s proven
  FAILED/QUEUED table structure closely (Retry Dispatch, Simulate
  Failure, Capture as CAPA), consolidated into one screen covering
  both new queues via a type selector — same "one cohesive outbound
  interface message domain" grouping `Config/System/
  OutboundMessagePreviewSection.tsx` already established for all four
  real transaction types together. Deliberately simpler than the
  billing DLQ in one real way: no "Fix & Retry" flow for a detectable
  data gap — neither new queue has an equivalent real error category
  to billing's `MISSING_ICD10`/`MISSING_PROVIDER_NPI`; every real
  failure here is `DISPATCH_TIMEOUT`/`DISPATCH_REJECTED`, so Retry
  Dispatch alone is the complete, correct action.
  `services/hl7/simulateInterfaceDispatchFailure.ts` is a new,
  deliberately separate function from billing's own
  `simulateDispatchFailure.ts` — that one's messages specifically name
  "RCM endpoint," which would be factually wrong for a patient-identity
  or pathology-result dispatch to the interface engine. Same for the
  new `def-outbound-interface-dispatch-failure` deficiency type
  (`services/deficiencies/mockDeficiencyTypeService.ts`) — kept
  genuinely separate from billing's own `def-outbound-dispatch-failure`
  rather than reused, since that one is explicitly RCM/billing-scoped
  in its own name and description.

  **Real, per direct follow-up (gap #7 — bringing assist-mode's
  `sendSynopticReportToLis` up to the same honest queue standard):**
  extended from two queue types to three
  (`patient_adt`/`result`/`lis_sync`). Restructured around a small,
  real `QUEUE_CONFIG` object (one entry per queue type: column labels,
  identifier/kind field accessors, the three real service methods)
  rather than growing every ternary in the file into a three-way
  chain — confirmed directly this was the right call before rewriting:
  the file already had the same `queueType === 'patient_adt' ? X : Y`
  pattern repeated across 7 real places (both table headers, both
  table bodies, `retryDispatch`, `simulateFailure`, `captureAsCapa`),
  and a third branch on all seven would have made the file
  meaningfully harder to read for a gain that only grows with every
  future queue type. Config-driven means a fourth queue type later is
  one new config entry, not seven touched call sites.

  **Real, per direct follow-up ("do we implement... actual outbound
  HTTP dispatch transport" → "Dispatch needs to be generic so all
  transactions can be checked"): Retry Dispatch and a new Dispatch Now
  action now genuinely send.** Real, worthwhile bug found before real
  dispatch could even be correct: `patient_adt`'s own `transactionType`
  was a fixed `null` — the comment said "resolved per-entry below,"
  but that resolution was never actually implemented, meaning real
  dispatch for A08/A40/A47 would have silently no-op'd forever, every
  time. Fixed by turning `transactionType` into `getTransactionType(e)`,
  the same real per-entry-function pattern `getIdentifier`/`getKind`
  already use. See `services/reports/README.md`'s own account for the
  full real dispatch-transport story, including the real receiving
  end, the real dispatch function, the LIS-sync queue's own honest
  scope boundary (its full payload can't be rebuilt here, so Dispatch
  Now/Retry Dispatch are deliberately disabled for it with a clear
  reason shown), and a real `strictNullChecks: false` TypeScript
  gotcha worth remembering for future work in this codebase.
  *Since Batch 511 (PS-478) the app type-checks in full strict mode (`"strict": true`, `strictNullChecks` included), so ordinary `if (res.ok) … else …` narrowing works; the workaround described here is no longer needed.*

  **Real, per direct follow-up ("We are logging interface errors with
  human readable error messaging?" → "continue with the error log
  refinements"): the DLQ's own displayed error, previously coarse and
  inconsistent, is now genuinely clear and complete.** A new "Engine
  unreachable" status/Simulate button joins Dispatch timeout/rejected —
  `errorCode` is real, per-entry-resolved now (`'DISPATCH_TIMEOUT' |
  'DISPATCH_UNREACHABLE' | 'DISPATCH_REJECTED'`), not hardcoded to
  `'DISPATCH_REJECTED'` at every real call site regardless of what
  actually happened, which was the real gap found while investigating
  this. See `services/reports/README.md`'s own fuller account of the
  underlying fix, which lives in `dispatchInterfaceMessage.ts` itself.

- **Real, per direct follow-up ("Continue" — the still-open "log
  reports" half of "All this must be audited and should be available
  to create log reports"): the `'audit'` tab now has a real, dedicated
  "🧬 Patient Management Only" filter**, right alongside the existing
  Type pills — independent of them (not folded into that mutually
  exclusive group), combinable with every other real filter already on
  this tab (user, date range, search), and covered automatically by
  the existing CSV export (`exportAuditCSV`'s own filter-metadata
  object gained a `'Patient Management Only'` entry, so an exported
  file honestly records whether this filter was active). Prefix-based
  (`log.event.startsWith('mpi.')`), not a hardcoded list of event
  names — a future new real `mpi.*` event type is included
  automatically, never silently missed. Covers all 8 real event types
  this app currently logs under that prefix — not just the four
  "operation" events (merged/case.moved/breakglass.rebind/match.linked)
  named in the original request, but also the ambiguous-match review
  queue's own three events and the newly-added `mpi.demographics.updated`
  below — the whole real patient-identity-management domain, not an
  arbitrarily narrowed subset.
  **Real, found-and-fixed gap surfaced while verifying this**: a
  genuinely successful `updateDemographics()` call (ADT^A08) previously
  left NO real audit trail at all — only the rejected/stale-event path
  logged anything. Fixed in `services/patients/mockPatientIndexService.ts`
  — a new `mpi.demographics.updated` event, PHI-safe by the same,
  established precedent as the stale-event log right above it: names
  only WHICH real fields changed, never the actual new values. See
  `services/patients/README.md`'s own entry for the full account and
  the new, dedicated test proving the PHI-safety (asserts the real
  changed field names appear in the audit detail, the real new values
  never do).

- **`Home.tsx`** — Landing page: navigation cards, footer, a "User
  Preferences" modal (theme picker + support links), and an About
  modal. ~40 inline styles fixed, including the per-card accent color
  — handled via CSS custom properties (`--card-accent`) set inline
  rather than raw style rules, since 8 distinct arbitrary brand colors
  isn't reducible to a small fixed set of modifier classes the way
  badge/status colors were elsewhere in this review.

  **Two real, non-cosmetic findings, both later resolved by Pete's own
  product decision, not left as documented-but-unfixed:**
  1. The entire "User Preferences" modal (theme picker, Support &
     Protocols, About PathScribe) had **no way to ever open** — traced
     to the app's move from each page owning its own `NavBar` (which
     `SynopticReportPage.tsx` still does, wiring `onProfileClick` to
     its own local modal) to the shared `AppShell` layout, which routes
     the nav avatar click to its own separate badge modal instead. This
     modal looked orphaned by that migration, not a mechanical one-line
     fix like `AuditLogPage.tsx`'s `ResourcesModal` bug was.
     **Resolved in a later session:** the whole modal, its state, and
     its wiring were deleted entirely (273 → 125 lines) — its two real,
     non-duplicate purposes (theme picker, About PathScribe's stale
     version string) were both already superseded by the working
     `AppShell` badge modal, which shows the real, live app version.
  2. Even when reachable, the theme picker only ever affects the Home
     page itself — every other page hardcodes dark-theme colors
     directly, confirmed by checking every consumer of the CSS
     variables the theme engine sets.
     **Resolved in the same later session, per Pete's explicit product
     decision:** rather than build real app-wide theming, the
     light/auto theme-switching machinery was removed entirely —
     dark-only now, a deliberate choice, not an unfinished feature.

  Also fixed in passing: `document.body.style.margin = '0'` was set
  imperatively on mount, meaning it only applied once `Home.tsx`
  happened to render — never on `LoginPage`, which loads first. Moved
  to a real `margin: 0` in `index.css`'s global `body` rule. A dead
  `(card as any).tab` ternary removed (no card object has ever had a
  `tab` field). And, found while testing the nav avatar flow:
  `AppShell.tsx`'s own badge modal had a `color-contrast` failure on
  its role text — fixed that one line, though `AppShell.tsx` as a
  whole is outside today's review.

  **Real, per direct UI-review feedback on the Homepage tiles (three
  requests, all in `pathscribe.css`, not this file):** (1) `.ps-page-bg`
  — the stock background photo's own bright highlights and distinct
  geometric shapes (keyboards, monitors) were fighting the cards on
  top of it; darkened further (`brightness(0.4)` → `0.3`) and a real
  `blur(10px)` added — `inset` extended to `-40px` (was `0`) so the
  blur doesn't sample past its own edge and leave a visible,
  unblurred fringe at the page boundary; `.ps-page`'s own `overflow:
  hidden` clips the overflow safely. Confirmed `.ps-page-bg` is
  genuinely only ever used here before touching it — no other page
  affected. (2) `.ps-home-card`'s own idle-state `background` raised
  from a nearly-invisible `rgba(255,255,255,0.02)` to a real, visible
  `rgba(13,24,41,0.55)` (built from this app's own `--ps-surface` dark
  navy, not a generic white-glass default) plus a real
  `backdrop-filter: blur(14px)` — the actual glass-frosting mechanism,
  blurring whatever page background shows through the tile rather
  than just tinting over it. `.ps-home-card--hovered` gained a real
  fill-opacity increase (`rgba(13,24,41,0.72)`) to pair with the
  existing `translateY(-8px)` lift — already-existing `transition:
  all 0.3s ease` on the base class covers the new property, no
  separate transition rule needed. (3) `.ps-home-card-desc`'s
  `opacity: 0.7` (dimming whatever color showed through, compounding
  with the tile's own transparency) replaced with a real, solid
  `color: var(--ps-text-muted)` — the existing `#94A3B8`/Slate-400
  token, the exact value the request named, reused rather than a new
  hardcoded hex. Title color (`.ps-home-card-title`) left untouched —
  the request was specifically about the dimmer, secondary
  description text.

  **Real, per direct UI-review follow-up ("Can we check the new screen
  for color blindness and other visual issues?" → "Fix them all"):
  computed, not eyeballed.** Ran a real WCAG contrast computation and
  a colorblindness simulation (protanopia/deuteranopia/tritanopia,
  Brettel/Vienot-style linear-RGB matrices) against the actual color
  values in the code before changing anything. Text contrast turned
  out already excellent (7.3-15.9:1 in both a worst-case and typical
  scenario, clearing WCAG AAA) — confirmed the earlier tile-text fix
  above already worked; no further change needed there.

  Four real, distinct issues found and fixed:
  1. **Keyboard accessibility (the most serious finding, unrelated to
     color at all)** — the cards were plain `<div onClick>`: no
     `tabIndex`, no `role`, no `onKeyDown`, no `:focus` CSS rule
     anywhere. A keyboard-only user could not reach or activate a
     single tile on the page that is the primary way to navigate the
     whole app — a real WCAG 2.1.1 failure. Fixed: `role="button"`,
     `tabIndex={0}`, and a real `onKeyDown` activating on Enter/Space;
     `onFocus`/`onBlur` reuse the existing `hoveredCard` state so a
     keyboard user gets the same visible highlight a mouse user
     already did, not a second, separate visual language.
     `.ps-home-card:focus-visible` added (real `outline`, not just a
     `box-shadow`, so it stays visible regardless of the card's own
     `border-radius`/`overflow: hidden`) — `:focus-visible`
     specifically, not bare `:focus`, so it only shows for real
     keyboard navigation, not a mouse click.
  2. **A genuine, exact color duplicate — not colorblindness-specific
     at all.** Intraop Queue and My Contribution both used `#0EA5E9`,
     confirmed identical under every simulation type (distance 0.0)
     because they were already identical to normal vision.
  3. **The full 9-color accent palette replaced, fully verified.**
     Real convergence existed under protanopia/deuteranopia (the two
     common forms of red-green colorblindness, ~8% of men) —
     Configuration/Audit/Quality Assurance compressed toward the same
     yellow-green band, and Search/Intraop Queue/Batch Management
     compressed in the blue-violet range. Iterated a real
     pairwise-distance check (9 colors × 3 simulation types = 27
     checks) until every pair cleared a genuine separation threshold
     under all three simultaneously, AND every color still holds at
     least 3:1 contrast (WCAG 1.4.11) against the dark tile background
     it renders on as a hover border/glow — a color that "solved"
     colorblindness by becoming invisible would have solved nothing.
     Greens/yellows/reds mostly drawn from the real, published Wong
     (2011, *Nature Methods*) 8-color colorblind-safe palette; the
     remaining blue/violet/magenta slots verified individually since
     Wong's own set doesn't have enough entries for all 9 tiles this
     app needs. Full account and exact values in `Home.tsx`'s own
     `cards` array comment.
  4. **Two smaller, real hardening fixes.** The hover lift/fill
     transition never checked `prefers-reduced-motion` (confirmed
     directly — the only two existing rules using that media query in
     the whole CSS file are for an unrelated ticker animation,
     nowhere near Home) — a real `@media (prefers-reduced-motion:
     reduce)` block now removes the `translateY` movement specifically
     while keeping the border/background/box-shadow state-change
     feedback, so a reduced-motion user still gets clear confirmation
     a card is active. `.ps-home-card-desc` had no overflow handling
     at all on a fixed-height card that can shrink to a 260px-wide
     grid cell — added a real 2-line clamp with ellipsis (the
     longest real description, Quality Assurance's, was the concrete
     risk case) rather than letting text silently overflow.

  **New test file, `Home.test.tsx`** — none existed before this pass,
  despite this being the primary keyboard-navigation surface for the
  whole app. 5 real tests: a card is genuinely reachable via `Tab`
  (`tabIndex`/`role` both checked), Enter and Space each independently
  trigger real navigation to the card's own route, an unrelated key
  does *not* trigger navigation, and a permanent regression guard
  reading the real `--card-accent` CSS custom property off every
  rendered card confirms no two ever share a color again — cheap
  (no need to hardcode a palette copy that could drift), and reads
  from the same data the page itself renders from.

- **`ContributionDashboardPage.tsx`** — "My Contribution" dashboard:
  Overview (KPIs, weekly chart, quality flags, teaching cases),
  Productivity, Quality, and AI Contribution tabs. The biggest file
  reviewed so far — ~90 inline styles (styled via
  `theme/pathscribeTheme.ts` tokens referenced directly in `style={{}}`
  objects; the token values were fine, applying them inline wasn't),
  all 10 `any` casts removed (verified none load-bearing), and a real
  business-logic-in-JSX IIFE (the Teaching Cases tile) extracted to a
  proper named component matching the pattern this file already used
  correctly elsewhere. **Real, current status (PS-113, Stage 4):** all
  three real reconciliation-data usages (quality flags, the Teaching
  Cases tile's `teachingRecords`, the trainee case-log export) migrated
  to the new, generic `qaActivityRecordService`, filtered to the real
  Frozen vs Final activity type — including the tile's own
  `attendingFeedback` → `reviewerFeedback` rename.

  **Real bug found and fixed:** `WarningIcon` was styled via
  `style={{ color: ... }}`, but its stroke is bound to a `color` prop,
  not CSS `color` — the style attribute silently did nothing, so the
  icon rendered its own default color instead of the intended warning
  color. Fixed by passing the real prop.

  **Two CSS duplication bugs found in `pathscribe.css`:**
  `.ps-contrib-tab-bar`/`.ps-kpi-grid` were each defined twice with
  conflicting properties silently cascade-merging (one pairing came
  with a confirmed-dead `.ps-contrib-tab-btn` class) — consolidated
  into one clean rule each, preserving the exact previous computed
  appearance. `.ps-tat-tile__*` has a much larger duplication (24
  declarations across two full parallel families) — flagged, not
  fixed, too large a tangent for this pass; worked around safely for
  this file's own needs.

  **WCAG:** fixed 3 `color-contrast` failures and 1
  `scrollable-region-focusable` gap on the Overview tab (the tab
  actually touched this session) — 0 violations after. The other three
  tabs render separate component files not reviewed this session;
  found real contrast violations there too (44 elements combined),
  flagged for when those files come up rather than fixed now.

  **`contributionDashboardCalculations.ts`** (+ `contributionDashboardCalculations.test.ts`) — real fix,
  from a direct product review: the Overview tab had seven separate
  hardcoded datasets (`mockKpis`, `mockCaseMixData`, `mockRvu30`,
  `mockClientTatData`, `mockTatTargets`, `mockTatPerf`, `mockDaily`)
  shown identically to every pathologist — including one KPI tile
  whose underlying number (128) was fake even though its label
  ("CASE_LABEL_PLACEHOLDER") was actually a working, real value. Real,
  per-pathologist calculations extracted here, replacing the hardcoded
  datasets. Reuses `resolveTatTargetHours` from
  `components/Contribution/qualityCalculations.ts` — see that file's
  own README-adjacent notes for the real TAT-target resolution logic
  this builds on.

  **Real bug found and fixed in a later session:**
  the Overview tab's own Quality Flags widget already
  correctly displayed a user's open deficiencies, case-level ones
  included — but clicking one navigated to the case's own synoptic
  report page, which has no deficiency resolve/verify UI at all (only
  `QualityAssurancePage.tsx` does). The widget's whole purpose — surface
  your own open issues so you can act on them — dead-ended on click.
  Now links to `/quality-assurance?open=<id>` instead, using deep-link
  support added to that page in the same pass (route renamed since;
  the `?open=` deep-link support itself still works unchanged — see
  `QualityAssurancePage.tsx`'s own `URLSearchParams` read). The same
  widget's other
  flag type (Frozen/Final discordances) was checked and confirmed
  already correct as-is — those genuinely do reconcile on the synoptic
  page, unlike deficiencies.

- **`IntraopQueuePage.tsx`** — Both halves of the Intraop feature: the
  mobile capture surface for starting a new frozen-section session at
  the bench, and the desktop merge queue for sessions still unlinked to
  a formal accession. One of the highest-quality files reviewed in this
  pass — already used named, well-extracted components throughout
  (`NewEntryForm`, `SkipReasonMenu`, `MilestoneActions`, `MergeModal`,
  `SpecimenCard`, `EntryCard`), no `any` casts, no direct-DOM-mutation
  hover hacks, and consistently honest inline documentation about real
  limitations (corrected Batch 652: patient match has a real camera
  barcode scan, `components/BarcodeScanner`, plus manual entry and a
  separate labeled "simulated scan" demo link; the scan uses the whole
  decoded text as the MRN). Only 3
  inline styles found and fixed (`.ps-intraop-discard-body`,
  `.ps-intraop-report-actions`, `.ps-intraop-desktop-switch-link`).
  Also resolved a contrast fix flagged
  from an earlier batch's broader regression check
  (`.ps-intraop-timeline-time`, `.ps-intraop-note-label`) — confirmed
  via testing that both classes were actually present in the rendered
  page (8 instances each), not just theoretically reachable.

  **Real feature, per direct confirmation: "Let's wire in Facility and
  Location (Room) for Intraop."** Two new, optional dropdowns on the
  session-start form (Submitting Facility, then a facility-scoped
  Location list), captured once per session alongside OR/surgeon. See
  `services/intraop/README.md` for the full detail.

  **Fixed in a later session, part of
  the systemic button-style cluster:** the Merge Mobile Intake Data
  modal's footer buttons used the older `.ps-ms-btn-cancel`/
  `.ps-ms-btn-apply` classes instead of the real Configuration button
  standard — every other button on this page, checked individually,
  was already correct.

- **`SearchPage.tsx`** (about 1,700 lines since Batch 350; see the Batch 350 section at the end, which supersedes the Load More, `.label` flag and browser-storage details below) — the largest file in the whole
  `src/pages/` review, spanning several sessions. Case search with a
  dense filter sidebar (identifier detection, demographics, status/
  priority, flags, synoptic protocols, pathologist/attending/client
  lookups, specimen/diagnosis/SNOMED/ICD code search), saved searches,
  and results integration with `WorklistTable`. ~136 inline styles —
  the most of any file reviewed — down to 7 legitimate CSS
  custom-property assignments for genuinely per-instance dynamic
  accent colors.

  **Real, new (gap #6 — the proactive `moveCaseToPatient()` trigger):**
  a "🪪 Reassign Patient" action, shown once a real result row is
  selected, opening `components/Search/ReassignCasePatientPanel.tsx` —
  full account there. Reuses this page's own already-real
  `selectedResultIndex`/`runSearch()`, no new selection mechanism.

  **All 14 `any` casts removed, two of which were hiding a real,
  repeated bug:** `SpecimenFlag`/`CaseFlag` have a `.label` field, not
  `.name`. The computational-flags search filter and the CSV export's
  "Flags" column were both comparing against a nonexistent `.name`
  field — the computational flags filter likely never worked, and the
  export column was silently empty for every case with real flags.
  Both fixed with the real `.label` field. Also removed 2 leftover
  debug `console.log` calls.

  **A third occurrence of the `ResourcesModal`-never-opens bug** —
  fixed by adding the same
  `PATHSCRIBE_PAGE_OPEN_RESOURCES` listener pattern, verified via
  testing that the modal actually opens now. `isProfileOpen` here is
  orphaned too, same as `Home.tsx` — flagged, not guess-fixed. Tracked
  as Jira PS-65.

  **Pre-existing file corruption found and fixed:** several
  user-facing strings had double-encoded UTF-8 arrows/symbols
  rendering as garbled text on screen (the search summary's DOB
  arrow, the age range's infinity symbol, a few others) — fixed with
  clean Unicode. Decorative comment-divider characters throughout the
  file have the same cosmetic corruption but are harmless (not
  user-facing) and weren't fixed, given the low value versus the risk
  of exact-byte-matching across ~30 instances.

  **Found via testing, outside this file:** a color-contrast failure
  in the shared `components/Common/LookupModal.tsx` — fixed the one
  confirmed instance, left 4 other occurrences of the same color
  untouched since only this one was actually verified failing.

## Real, confirmed fixes — RightSynopticPanel.tsx template selection (post-review)

Two real issues found via direct report, after the review below was
already marked complete — documented here rather than reopening that
review's own scope.

**Selecting certain templates returned an empty report, no fields at
all.** Traced to `templateService.ts`'s own `getTemplate()`: a
registry entry with no matching content in `editorStore` silently
resolves to `sections: []`, regardless of what the registry's own
`fields` count claims. Reproduced directly — this was exactly the
shape of the two `'TEST'`-category registry entries ("Generic Synoptic
Test Form -- Basic"/"-- Complex"), registered for browsing purposes
per `protocolShared.tsx`'s own comment ("non-clinical test
templates"), never given real content, never meant to be selectable by
a pathologist on a real case. Fixed by filtering `category === 'TEST'`
out of the pathologist-facing picker in `RightSynopticPanel.tsx` —
scoped to that one list; admin template management elsewhere is
untouched.

**The suggested template required a click just to attach it.** Real
product decision: a pathologist shouldn't have to click the one
template already most likely correct just to get started — reducing
clicks was the entire point of the suggestion feature existing at all.
`TemplatePicker` now auto-attaches the top suggestion the moment one
exists, landing the pathologist directly on a populated report. Escape
hatch is the existing, real delete-and-re-add flow already available
on any attached report — deliberately not a second, parallel
confirmation step, since that would undo the exact click-reduction
being asked for. Guarded with a ref (not just an effect dependency) so
a later re-render can't re-trigger a second auto-attach over a report
the pathologist has already started editing or deliberately replaced.

**Real, per direct UI-review follow-up ("Fix the root" — background
inconsistency across pages): this page's own `.ps-search-bg-image`/
`.ps-search-bg-gradient` background-image layer, and
`.ps-search-page-root`'s own hardcoded `background-color: #000; color:
#fff;`, both removed entirely.** This page now falls through to
`AppShell.tsx`'s own, real `.ps-app-root` background (see that
folder's own README for the fuller account of the inline-style bug
this whole pass traced back to) — matching Configuration/Quality
Assurance/Intraop Queue/Contribution's existing, correct behavior.

## Batch 613 (part A) — case search reporting

`SearchPage.tsx`: a Cases / Report toggle beside the results, the Synoptic answers filter section, and the report panel (`components/Search/Report/`). The pager, sort and the results export belong to the Cases view only.

## Batch 317 (PS-73)

`system/FacilityDictionaryPage.tsx`'s Duplicate moved to `services/duplication`; see `system/README.md`.

## Audit Log: Outbound Dispatches (Batch 318, PS-86)

`AuditLogPage.tsx` → **Interfaces** gains a fourth sub-tab, **Outbound Dispatches**: the new `OutboundDispatchTrailSection.tsx`. It is the trail of what PathScribe sent, not a failure queue; failed sends of results and patient updates stay in the Outbound Interface DLQ.

- **Scope:** phase 1 covers Category E (OrderCreated, sent at accession), per Pete's scoping on the ticket.
- **Table:** timestamp, message ID, category, message type, accession, ordering facility, and outcome (delivered / failed / outcome unknown), with status filter pills and a search box.
- **Payload drawer:** clicking a row opens the exact JSON that was sent, as an expandable tree (native `<details>`, marked `data-phi`), with **Copy Payload**.
- **No HL7 view:** PathScribe sends JSON and the interface engine builds the HL7, so the drawer says that rather than showing an HL7 message PathScribe never produced.
- **Standing rules:** no inline CSS in the Audit Log files (checked: `AuditLogPage` and its section components have none), all text in five languages. Tested in `OutboundDispatchTrailSection.test.tsx`.

## Batch 319: `__tests__/ConfigurationPage.test.tsx` timeout fix

The PS-128 guard tests imported `ConfigurationPage` dynamically inside the first test. On a loaded machine, the page's first-time transform ran into the 15 s test timeout, and the leaked render then failed six more tests. The page is now imported statically at the top of the file. The test logic is unchanged.

---

## Batch 342 (PS-262): live updates for the OR boards and Intraop Queue

- **`OrSuiteDashboardPage.tsx`:**
  - **Live updates:** the board subscribes to its OR locations through `hooks/useLiveIntraopUpdates.ts`, replacing the fixed 15-second poll. It updates within the 500 ms target through the API server's SignalR hub, with polling as the fallback. A badge in the header shows the connection state.
  - **Logic moved to services:** the Multi-Suite location choice and the flash bookkeeping (`services/intraopDashboard/resolveOrBoardLiveView.ts`); the dismissal and its audit record (`dismissFromBoardWithAudit.ts`).
  - **Standing rules:** the terminal and event-log services come from `@/services` (off the mock-import baseline). Two hard-coded separators are now translation templates, and a refused dismissal shows the translated message. The demo timer's stale refresh is fixed.
  - **Still in the page:** the verbal-report modal still writes its event-log record itself.
- **`IntraopQueuePage.tsx`:**
  - **Live updates:** follows every intraoperative change, so new sessions, diagnoses, dismissals and merges from other devices appear without a reload. It shows the same badge.
  - **Translation:** the log button's count is a translation template.
  - **Baseline:** the page is still on the mock-import and browser-storage baselines for older code.

## Batch 338 (PS-342): spell checking

Report free text is spell-checked in the case's language (case choice → assigned pathologist's preference → ordering facility's default):
- **`SynopticReportPage/`:** the whole page is inside a `SpellCheckProvider`; see its README.
- **`CytologyWorklistPage/CytologyScreeningPage.tsx`:** the page is in a provider, with the language control in the header toolbar. The screening notes, `components/CytologySynopticFormView.tsx`'s text fields and `components/CytologyRoseView.tsx`'s preliminary impression use `SpellCheckedTextarea`.
- **`IntraopQueuePage.tsx`:** the capture form's quick gross and frozen diagnosis, and each session card's quick-gross edit, are checked in the performing pathologist's language, else the session facility's. There's no case yet, so there's no per-case choice.
- **Not converted, disclosed:** `CytologyScreeningPage.tsx` still has English-only text in its loading, not-found and header states ("Loading…", "Case", "Back to Worklist"), and `SynopticReportPage.tsx`'s "Case not found" block is English-only. Neither was touched in this batch. **Converted in Batch 344** (`cytologyScreening.*`, `caseNotFound.*`).

## Batch 332 (PS-327)

- **`CytologyWorklistPage/CytologyScreeningPage.tsx`:**
  - **Signing authority:** sign-out applies per-lab and country signing authority on the pathologist track (`services/cytology/resolveCytologySignOutAuthority.ts`). The cytotechnologist track is unchanged.
  - **Feedback:** a countersign release now shows a toast.
  - **Translated:** the sign-out strings are now translated (`cytologySignOut.*`), with the signed-out time in the user's locale.
- **`SynopticReportPage/`:** the Autopsy "Ready for Body Release" banner is translated.

## Batch 331 (PS-327)

`SynopticReportPage/`: Autopsy PAD/FAD signing now enforces signing authority (and forensic appointments); its banners and toasts are translated. See [SynopticReportPage/README.md](./SynopticReportPage/README.md).

## Batch 327 (HTTPS)

`SynopticReportPage/`: the report renderer URL must be `https://` in production builds, and the page's last inline style was converted to CSS variables. See [SynopticReportPage/README.md](./SynopticReportPage/README.md).

## Review status

All loose top-level files in `src/pages/` have been reviewed — 39/39
on the inline-style checklist, plus
every loose top-level file covered in this README.

**Subfolder README coverage (verified August 2026):** every subfolder
now has its own `README.md`, checked programmatically — every real
file in every subfolder is actually named in that subfolder's own
`README.md`, not just assumed. `BatchManagement/`, `ReportPreview/`
(+ its `__tests__/`), `Synoptic/` (+ its four subfolders), and
`SynopticReportPage/` (+ its `modals/` and `components/`) were all
missing entirely before this pass — `SynopticReportPage/hooks/` (+ its
own `__tests__/`) already had real coverage and needed no work.

**Real, direct correction (September 2026)**: the above "every subfolder"
claim went stale — `MolecularBatchPage/` (5 real, routed pages for the
Full Molecular Testing Execution Module, see `services/molecular/README.md`)
and `LabelDesignerPage/` (the real, drag-and-drop label designer, see
`services/labelDesigner/README.md`) were both added without a
corresponding update here. Found directly, per a direct question ("have
we been keeping up with READMEs?"), not caught proactively. Both
subfolders now have their own real `README.md`, and are named here.

*Corrected in the Batch 496 README audit (Oct 9, 2026): "every real file is named in its subfolder's README" no longer holds. The audit added missing files to the AccessionPage, BatchManagement, ReportPreview, Synoptic/Comments, SynopticReportPage (and its components, hooks, hooks tests) READMEs. Several later loose files have no entry of their own in this file and are named only in passing in batch notes: `BenchContributionDashboardPage.tsx` (Batch 488), `CriticalAlertAuditSection.tsx`, `PrintQueueDashboardSection.tsx` (both System Logs sections, imported by `AuditLogPage.tsx`), `MigrationJobsPage.tsx` (`/migration-jobs`) and `MockWsiViewerPage.tsx` (`/wsi-viewer`).*

## React Router 7 (Batch 341, PS-344)

Every file here that used `react-router-dom` now imports the same hooks and components from `react-router` 7 (`react-router-dom` was removed from the project). Nothing else changed: the app had already opted into version 7's behaviour. See `src/i18n/README.md` → Batch 341.

## Batch 344 (PS-60 follow-up): signer confirmation

Every signature now confirms who is signing first (`components/Signing/`, `services/auth/signerConfirmation.ts`):
- **Before:** the sign-out and finalize screens asked for a password and never checked it, and cytology and autopsy signing asked for nothing.
- **`SynopticReportPage/modals/`:** the sign-out, countersign, synoptic finalize and pre-finalisation screens confirm the signer themselves; see `SynopticReportPage/modals/README.md`.
- **`SynopticReportPage.tsx`:** Sign PAD / Sign FAD open a `SignatureConfirmModal` first. The "Case not found" block is translated.
- **`CytologyWorklistPage/CytologyScreeningPage.tsx`:** Sign Out opens a `SignatureConfirmModal` first. The loading, empty, assist-mode and header text is translated.
- **`Synoptic/useSynopticFinalize.ts`:** the unchecked credential state is gone, and the file is off the browser-storage baseline.

## Batch 345 (PS-60 follow-up): the signature checked when it is saved

Sign-out, countersign, finalize (`SynopticReportPage/hooks/useSignOutWorkflow.ts`), autopsy PAD/FAD (`SynopticReportPage.tsx`) and cytology sign-out (`CytologyWorklistPage/CytologyScreeningPage.tsx`) now:
- pass the signer's confirmation to `signatureGate` (`services/auth/signatureEvidence.ts`) before writing anything;
- store a signature record once the signed state is saved.

A refused or missing confirmation stops the change with a message.

**Batch 348 (PS-67):** `SynopticReportPage/hooks/useSignOutWorkflow.ts` reads AI service results in the app's single `{ ok, data }` result shape. No visible change.

## Batch 349 (PS-100, PS-101)

- **`SearchPage.tsx` (PS-101):** a value that isn't clearly one identifier (an MRN such as `100001`) is matched against name, MRN or accession; before, it had to match all three and found nothing. An identifier search with no dates chosen searches every date, with a hint saying so; the hidden 30-day default had hidden older cases. The results summary says which applied.
- **Report page toasts (PS-100):** `Synoptic/useSynopticToast.ts` and `Synoptic/UI/SaveToast.tsx`. Every message used to show for 2.2 seconds with a green check. Warnings and failures now stay until closed (click or ×) and show a warning icon; confirmations fade after a reading time. 75 warning or failure calls in `SynopticReportPage/` pass `'warning'`, and 9 English-only warnings on the page were translated.

## Batch 350: Search repaired, results paged on the server

Pete: "the search is largely broken … results should be paged so that the heavy lifting is done on the server side."

**`SearchPage.tsx`**
- **One draft.** The filters live in one draft object (`CaseSearchDraft`). A search sends it through `utils/search/buildCaseSearchRequest.ts` to `caseSearchService` (`services/caseSearch/`).
- **Paged on the server.** The service applies access rules, matches, sorts, counts and returns one page. The page shows "26–50 of 99 cases", a pager (first, previous, next, last), a page size (25, 50 or 100, remembered through `utils/uiPreferences.ts`), and a sort: accession date newest or oldest first, recently updated, patient name, or accession number.
- **Paging keeps the search.** Paging, sort and page size re-run the search that produced the results, not unsaved edits in the sidebar.
- **Load More is gone.** It appended pages that the table then re-sorted.
- **Filters that didn't work now do:** diagnosis, requisition / order numbers, pathologist (signed or on the case, not only assigned), ICD-11 and ICD-O, synoptic protocols, and flags. See `services/caseSearch/README.md`.
- **Pickers:**
  - Synoptic protocols come from the protocol registry. The hard-coded list of 22 mostly used the wrong template ids.
  - Flags are chosen by id.
  - Sex offers what is recorded (Male, Female, Unknown); Non-binary and Other could never match.
  - Statuses: 16 of 17 are offered (Closed, Accepted and AI-Assisted added; Claiming left out).
- **Export** covers every match, not just the rows on screen, up to 5,000; the service audits it. Headings and values are translated and dates follow the user's locale. A message says when the export limit cut it short.
- **Saved searches** go through the saved-search service (per user, across workstations). They keep every filter; facility and specimen flags used to be dropped.
- **Coming back from a case** restores the same search, page and sort and fetches that page again. The page no longer keeps results (patient data) in session storage.
- **Standing rules:**
  - No browser storage and no mock-service imports, so the page is off the deployment baseline.
  - Decisions moved to `utils/search/`: request, summary, CSV, date shortcuts, suggestions, picker filtering.
  - New strings in all five languages. The date shortcuts, CSV headings, quick-link names and the English month names in the summary are translated too.
  - "Dr." is no longer added to names in English.
- **Still in the page, and disclosed:** the lookup modals' own list filtering for users, facilities, specimens and codes, as before.

**Result table.** Search passes `preserveOrder` to `components/Worklist/WorklistTable.tsx`, which then shows the server's order without the Worklist's urgent and pool sections.

**Report page.** Where a case was opened from, and the return to Search, go through `utils/search/searchSession.ts` (`SynopticReportPage.tsx`). The header's status pill is translated (`HeaderBar.tsx`, `utils/caseRevisionDisplay.ts`). The breadcrumb still says "Worklist" when the case came from Search, though it returns to Search: an existing label, not changed here.

## Batch 351: Search section 3 filters

`SearchPage.tsx` offers the new searchable case data (Pete: all 15 items):
- **Dates:** the date range has a selector, **Accession date / Sign-out date / Release date**. There is a new sort, sign-out date newest first.
- **Case type** pills after the identifier: Surgical, Gyn cytology, Non-gyn cytology, Autopsy.
- **Pathologist:** once a pathologist is chosen, a **role** selector appears (any, assigned, signed out, resident, countersigner, delegated to). Residents are now in the picker.
- **More filters**, collapsible, with a count:
  - revisions, holds, result flag, pending work (stains, IHC, molecular, add-ons) and "Past TAT target";
  - subspecialty, performing lab and location pickers;
  - intake;
  - billing type / payer and CPT codes;
  - autopsy jurisdiction, authority and report stage.
  It opens by itself when a saved search uses it.
- The id/name picker is shared by the subspecialty, lab, location and jurisdiction lists.
- Every new string is in five languages. `searchPage.sections.accessionDate` was removed, since the selector replaced it.

## Batch 353

- **Services, not demo files or storage:**
  - `ContributionDashboardPage.tsx` gets TAT targets, RVU tables and the action registry through `@/services`;
  - `WorklistPage/` and `Synoptic/Delegate/` use `delegationService`;
  - `SynopticReportPage/components/InformalReviewBanner.tsx` did too; it was deleted in Batch 355 (PS-346).
- **Deployment baselines:** the dashboard and the delegation screens came off them.

## Batch 354

`SearchPage.tsx` shows a hint under the submitting-facility and performing-lab filters once one is chosen: a Trust or other parent organisation includes the sites under it (`searchPage.includesSitesHint`, `.ps-searchpage-org-hint`). The service does the matching; see `services/caseSearch/README.md`.

## Batch 355

`SynopticReportPage/components/InformalReviewBanner.tsx` deleted (PS-346, Pete: "Delete it"). No page rendered it after informal reviews moved to their own service; they surface through the Internal Notes button and the Worklist's Informal Review tile.

## Batch 356

`MolecularBatchPage/MolecularPlateBuilderPage.tsx` picks the target instrument from the instrument list and checks the instrument's scan station at dispatch (PS-326). See its README.

## Batch 358

`MolecularBatchPage/MolecularPlateBuilderPage.tsx` offers the register's active analysers (`equipmentService`).

## Batch 361

`MolecularBatchPage/MolecularPlateBuilderPage.tsx` shows an analyser with an open malfunction or past due in red, and warns when it is chosen (not blocked).

## Batch 363 (PS-72): patient data tagged for screenshot redaction

Pages and components across the app now tag every patient identifier they show (name, date of birth, MRN, accession or case number) with `data-phi`, so support-ticket screenshots redact it. Checked by `services/phi/phiTagging.guard.test.ts`. Files in this folder: `AuditLogPage` (case links, detail text, interface-exception patient identifiers), `BillingLogsSection`, `CriticalAlertAuditSection`, `CytologyQcQueuePage`, `FullReportPage`, `IntraopQueuePage` (it also came off the mock-import baseline), `MockEMRPage`, `MockWsiViewerPage`, `OrSuiteDashboardPage` (the MRN tag was on the label, not the value), `OutboundDlqSection`, `PrintQueueDashboardSection`, `QualityAssurancePage`, `SurgicalQaWorklistPage`. `CytologyWorklistPage/`: row subtitles and "Unknown patient" were hard-coded English and are now translated; tile colours come from `--ps-hue` (they were built in JSX). `CytologyScreeningPage`: the released-for-countersign toast is redacted. `MolecularOrderQueuePage/`: the demo panel and the accession column are tagged.

## Batch 364 (PS-349, PS-350): support references

`AuditLogPage.tsx`: a "Find a support reference" box (also reached by `?supportRef=`), and a support-reference chip on each audit, error and interface-exception row.

## Batch 365 (PS-347)

`AccessionPage/`: the order lookup shows and finds dates of birth in the jurisdiction's own format (DD-MM-YYYY for the Netherlands, DD.MM.YYYY for Germany); German dates of birth were shown month first. `OrderLookupModal.tsx` is off the deployment baseline.

## Batch 367 (PS-74): no inline CSS

The last inline styles in `pages/` moved into `pathscribe.css` classes. That covers `PathologyWorkspacePage` and `QualityComplianceHubPage`, which have no README of their own: their cards' dim accent is now derived in CSS. Details are in each folder's README. The whole app is checked by `services/styleRules/inlineCss.guard.test.ts`.

## Batch 368 (PS-353): report change history

- **Report page:** a Change history view (see `SynopticReportPage/README.md`).
- **Off the deployment baseline:** `BatchManagement`, `LabelDesignerPage`, `MolecularWorkcenterPage`, `Synoptic/Comments` and parts of `SynopticReportPage`.

## Batch 369 (PS-355)

- **`QualityAssurancePage.tsx`**: its four exports are gated:
  - deficiencies (active and closed) by one capability;
  - management reviews by another;
  - billing deficiencies by a third.

  It takes the billing, reason-dictionary and case services from `@/services` and is off the deployment baseline.
- **`SynopticReportPage/`**: the change-history export is gated by `report:change-history:export` and passes `authorizationService` to `exportChangeLog`.
- **`BatchManagement/DisposalReportPage.tsx`**: its export no longer borrows the QA export helper. It isn't gated yet; it's on the PS-357 list. *(Since closed: `retention:disposal-report:export`, Batch 407 — checked in the Batch 496 README audit.)*

## Batch 370 (PS-356)

- **`QualityAssurancePage.tsx`:** its exports pass `qaScopeContext()`, all facilities.
- **`SynopticReportPage/`:** the change-history export carries the case's facility.

## Batch 372

- **`Home.tsx`:** the Surgical Post-Sign-Out QA tile has its own background, `public/surgical_qa.webp` (Pete's photo, 1400×933). It had borrowed the Cytology QC tile's image.

## Batch 374

- **Pete: Home shows only the tiles the user may open.** `Home.tsx`, `PathologyWorkspacePage.tsx` and `QualityComplianceHubPage.tsx` show only the tiles whose screen the signed-in user may open (`services/screens`). A user with none sees a short message instead. The routes check too (`App.tsx` wraps them in `ScreenGate`).

## Batch 375

- **`Home.tsx`:** eight tiles now. The Cytology QC and Surgical QA queues moved into the Worklist, Add-On Orders became a case action, and Batch Management moved into the Pathology Workspace. *(Since then: Bench Contributions (Batch 488) and Tumor Board (Batch 489) made it ten — checked in the Batch 496 README audit.)*
- **`WorklistPage/`:** the two peer-review queues are views beside the case list, chosen from header tiles next to LIS Cases and Outreach and shown per screen capability. The file no longer imports mock services directly (off the mock-import baseline); its browser-storage use remains.
- **`PathologyWorkspacePage.tsx`:** Batch Management tile.
- **`AddOnOrderPage/`:** `?case=<id>` opens that case straight away.
- **`SynopticReportPage/components/HeaderBar.tsx`:** the "Add-on order" action in the block row. The file is off both deployment baselines: its lis-sync types come from `@/services`, and the "back to messages" flag is read through `utils/uiPreferences.getSessionFlag`.
- **Surgical QA tile image:** `public/surgical_qa.webp` (Batch 372) no longer has a Home tile to sit on. The file is kept.

## Batch 376 (PS-359)

- **`AccessionPage/AccessionPage.tsx`:**
  - Which fields must be filled before Next and Submit comes from the organisation's Field Requirements (`services/fieldRequirements`), with the locked fields always required. The page lists what's still required.
  - The Patient ID and Assign to Pathologist labels drop "(optional)" when required.
  - The department-conflict message lists names in the user's language instead of joining them with an English "and".
  - The page imports all its services from `@/services`, so it came off the mock-import baseline.

## Batch 377

- **`AccessionPage/`:** a blank Patient ID that the organisation requires is generated at submit; if generation fails, submit stops with an alert.

## Batch 378

- **`GrossingScreenPage/`:** Complete grossing (button, voice "complete grossing", Alt+Shift+F9), checked against the organisation's Grossing field requirements.

## Batch 379

- **`GrossingScreenPage/`:** with the organisation's protocol rule switched off, Complete grossing confirms before completing specimens without a protocol, which are then routed for secondary review. The confirmation can also be answered by voice. The fixation fields' English-only text was converted to all five languages.

## Batch 380

- **`SynopticReportPage/`:** Field Requirements for Add/Edit specimen, amendments and addenda, and critical findings, each with a voice save command. Fixed minor amendments and addenda that couldn't be saved from a new draft, and a specimen laterality that was never saved.

## Batch 381

- **`SynopticReportPage/`, `Synoptic/`:** Field Requirements for holds, comments, Delegate, biopsy arrays, and block cancellation and restains, each with a voice save command (block forms excepted).
  - Holds and delegation now need capabilities, seeded to every role with case access.
  - Fixed the report page refusing its next save after a hold or delegation.
  - `SynopticReportPage.tsx` and `BlockStainEditorModal.tsx` came off the deployment baselines.

## Batch 381: PS-98

- **`QualityAssurancePage.tsx`:** the pillar row (`ps-qa-pillar-switch`) has 20px below it, so the tiles and tab content don't sit against it.

## Batch 382

- **`SynopticReportPage/`:** Field Requirements for the frozen-versus-final reconciliation modal and the post-sign-out billing and applied-code correction modals, each with a voice command. Correcting an applied billing code needs its own capability.

## Batch 383

- **`SynopticReportPage/`:** Field Requirements for the fixation-time and collection/receipt-date sign-out gates and the two autopsy forms it mounts, each with a voice command. Four of its success toasts (two autopsy, two gate) are translated now.

## Batch 386

- **`CytologyWorklistPage/`:** Field Requirements for the five forms on the screening page (Bethesda review, CISOE-A, 5-year retrospective review, manual histology correlation, last menstrual period), each with a voice command. The forms moved out of the 3,088-line `CytologyScreeningPage.tsx` into `components/` so they can be tested, and their text is translated. The rest of the page's text is still English (Batch 387).

- **`CytologyWorklistPage/` (Batch 387):** the rest of the screening page's text is translated, with a guard test. See its README.

## Batch 388

- **`MicrotomyWorkstationPage/`:** Field Requirements for the comment drawer and slide grid, two voice commands (add comment, add stain), those texts and the scan errors translated, and tests. See its README.

## Batch 389

- **`MicrotomyWorkstationPage/`:** the last hard-coded text (label-fit warnings, label size, list joining) translated; the page is now done apart from stored data. See its README.

## Batch 390

- **`CytologyWorklistPage/`:** a signed-out cytology case can now be corrected or given an addendum from the screening page, with a mandatory reason, its own permission and a signature confirmation. New `hooks/` folder. See its README.

## Batch 391

- **`CytologyWorklistPage/`:** reports are stamped with the performing lab's language at sign-out and printed in it. See its README.

## Batch 392

- **`SynopticReportPage/`:** the render request carries the report's language and its wording (`labels`), and the date of birth in the lab's locale.
- **`OutboundInterfaceDlqSection.tsx`:** a result retry sends the report PDF (kept from release, else the saved signed PDF), and a result without one stays held with its reason instead of the old "patient/case may no longer exist".

## Batch 395

- **`WorklistPage/`, `SearchPage.tsx`:** the result tables now fill the window down to the bottom and follow changes in the content above them (`hooks/useFillViewportHeight`).

## Batch 396

- `FullReportPage.tsx`: opens a case through `services/cases/openCaseForView.ts` and shows `CaseUnavailable` for every case it can't open (missing or restricted alike). Shows the surgical QA review bar, and Back honours a `returnTo` from the QA queue. No longer imports the action-registry mock.
- `SynopticReportPage`: its not-found screen is `CaseUnavailable`.
- `CytologyWorklistPage/CytologyScreeningPage.tsx`: the QC review bar; Back honours `returnTo`.
- `CytologyQcQueuePage.tsx`, `SurgicalQaWorklistPage.tsx`: **Open Case** on each row; actions go through shared hooks and show why they failed. Neither imports a mock any more.
- `WorklistPage`: the two review-queue tiles show their item counts; the `?accessDenied=` toast is gone.

## Batch 397

- `IntraopQueuePage.tsx`: Field Requirements (page "intraop") on the new session form, the specimen capture, Quick Gross on a specimen card, the touch prep skip note, the verbal report and the merge. Each shows "Still required: …" and marks required labels; Continue, the two specimen saves and Merge can be said. Location text comes from `services/locations/formatLocationDisplay`.
- Case report modals: see `SynopticReportPage/modals/README.md`.

## Batch 398

The case report page's Gross Complete follows the same Grossing rules as the Grossing screen (see `SynopticReportPage/README.md`).

## Batch 399

`IntraopQueuePage.tsx`: the verbal report uses `components/Intraop/VerbalReportForm` and shows who received it, their role, read-back, critical result and any "Surgeon unavailable" reason.

## Batch 401

- **`EmbeddingStationPage/`:** Field Requirements for Confirm (piece count), the comment drawer and the cassette reprint (now a reason then a Reprint button), two voice commands (confirm count, add comment), the foot pedal held to the same rules, and the remaining visible text translated. See its README.

## Batch 402

- **`SlideDistributionStationPage/`:** Field Requirements for physical checkout, scanner routing, a new exception note and the label reprint (now with a mandatory reason, Pete), two voice commands (confirm checkout, confirm scanner), and the remaining visible text translated. See its README.

## Batch 403

- **`AddOnOrderPage/`:**
  - Two permissions, and Field Requirements (the send-out lab is locked).
  - A reference lab on each send-out line: it fills in from the test, and the choices are limited to that test's approved labs.
  - A real Modify & Resubmit.
  - Two voice commands.
  - Translated text.
  - Demo orders on S26-4401-BX-001.
  
  See its README.

## Batch 404

- **`BatchManagement/`:**
  - Field Requirements for New Container and for closing a batch out. An abort now needs a reason.
  - Three permissions: override, abort, and cold-chain acknowledge.
  - A reason dialog replaces the cold-chain browser prompt.
  - "create container" by voice.
  - Translated labels.
  - Demo batches for each override.
  
  See its README.

## Batch 405

- **`MolecularBatchPage/`:** the plate builder:
  - Field Requirements. Every patient well must now name its specimen.
  - A supersede permission.
  - Create stays off until the plate is complete.
  - "create plate" by voice.
  - Translated reagent names and gating reasons.
  - Off the deployment baseline.
  
  See its README.

## Batch 406

- **`MolecularBatchPage/`:**
  - Rack Loading follows Pete's required fields: rack barcode, a sample ID for every tube, and instrument and deck slot, with a scanned deck position filling the slot and warning when it's wrong.
  - Control Rules need their own permission, ask before deleting, and name the sample rack's slots.
  - The rack list shows each rack's status.
  - The plate builder's slot is a list.
- **`MolecularBatchManagement/`** and **`MolecularOrderQueuePage/`:** logic moved to services; both are off the deployment baseline.

See `MolecularBatchPage/README.md`.

## Batch 407

- **`BatchManagement/`:**
  - The New Container form is two columns in a wider dialog, so it fits on screen.
  - Every batch refusal is translated.
  - Disposal and the disposal report export need their own permissions.
  - Patient identifiers are tagged on the disposal and pending pages.
  - Three pages are off the deployment baseline, and the unused `CreateBatchModal.tsx` is removed.
- **`MolecularBatchPage/`:** Rack Loading's placement lists are full-width, and its instructions no longer run into the tube grid (found in the browser check).

See `BatchManagement/README.md`.

## Batch 408

**`BatchManagement/`** is closed out:
- list times in the user's language;
- list filtering and the completion rule moved into services;
- tile colours in CSS;
- the STAT badge translated.

## Batch 409

**`CytologyWorklistPage/`:**
- Sign-out moved into a service and needs its own permission.
- CT sign-out block reasons are translated.
- The workspace is off the deployment baseline.

The page's other save paths are listed as still open in its README.

## Batch 410

**`CytologyWorklistPage/`:** the Cytology Workspace page renders and dispatches only (2,262 → 1,148 lines). Loading, saving reviews, the other actions and display decisions moved to `services/cytology/`, with five new permissions. Review history shows each later review's stored agreement with the initial screen. The one-specimen-per-case limit is listed as open in its README.

## Batch 411

**`CytologyWorklistPage/`:** the Cytology Workspace has a tab per cytology specimen. Each tab is reviewed and signed out on its own, and the case is final when all are, or early with a permission and a reason.

## Batch 412

**`CytologyWorklistPage/`:** reviewers leave notes on parts of each other's reviews. A "Requires revision" note stops a cytotechnologist, never a pathologist. Pathologists can "Revise and sign out" in one step, and authors can bring back an earlier version of their review.

## Batch 415

**`CytologyWorklistPage/`:** the 5-year lookback card shows only where that rule is on. A cytotechnologist's Sign Out button needs the new cytotechnologist sign-out permission.

## Batch 416

**`WorklistPage/`:** the case table fills the screen. The page had been sized to the whole window under a 105 px nav bar, and the table's measured height could stick at 400 px. Both are now CSS layout.

## Batch 417

**`AccessionPage/`:** a national identifier input per jurisdiction (NHS number, BSN, IHI…), check digit shown live, saved through its own permission-checked service after the case is created.

## Batch 418

**`AccessionPage/`:** the patient's registry opt-outs, saved through their own permission-checked service.

## Batch 419

**`CytologyWorklistPage/`:** after a correction or addendum is released, `useCytologyRevision` sends the new version to the screening registry (`submitCytologyRevisionToRegistry`); the release stands whatever the registry step does. The hook takes `isGynCytology`.

## Batch 421

**`RegistryExceptionsPage/` (new):** Quality & Compliance → Registry Exceptions, at `/registry-exceptions` behind `ScreenGate`. Filter chips by kind with counts; a row per submission (case, registry, version and type, test flag, status, what went wrong, when); Details shows every finding and the acknowledgement as received; Open case; Re-validate and resend (`CapabilityButton`). Loading runs the 72-hour escalation. **`QualityComplianceHubPage/`:** the new tile.

## README catch-up (Oct 1, 2026)

Pete asked whether the READMEs were all up to date. They weren't: `RegistryExceptionsPage/`, its `hooks/` and `QualityComplianceHubPage/` had no README, and `CytologyWorklistPage/` (and its `hooks/` and `components/`) had no Batch 419 entry. All added.

## Batch 423

`RegistryExceptionsPage/`: Capture as CAPA on each row.

## Batch 424

`RegistryExceptionsPage/` has a new **Attestation required** filter and **Resend all**.

## Batch 425

- `Home.tsx` and `QualityComplianceHubPage/`: the registry exception count on the tiles.
- `RegistryExceptionsPage/`: revisions after acceptance, patient details, the transmission audit download.
- `AccessionPage/`: prefill of national identifiers and opt-outs.
- `CytologyWorklistPage/` and `SynopticReportPage/`: the opt-out badge.

## Batch 426

- `SynopticReportPage/`: Assist workups go to the LIS on Finalize; keep-or-update prompts.
- `OutboundInterfaceDlqSection.tsx`: LIS-sync messages can now be retried; before, Retry was disabled for them.

## Batch 427

`SynopticReportPage/`: workups across several parts.

## Batch 428: Configuration permissions

- `ConfigurationPage.tsx`: shows `ConfigRefusalBanner` above the tabs.
- `system/ClientDictionaryPage.tsx` was deleted (unused; the Facility Dictionary is the live screen).
- `SynopticReportPage/components/HeaderBar.tsx`: auto-adding an unknown LIS flag code moved to `services/flags/resolveLisFlagDefinition.ts`.

## Batch 429: view-only sections, equipment log for the bench

- `ConfigurationPage.tsx`: the AI, Actions, TAT, Report Templates, Validation and Synoptic Library tabs are wrapped in `ConfigSectionGate`.
- `BatchManagement/EquipmentServiceLogPage.tsx` (new): the equipment log for the bench roles.

## Batch 430: personal settings per person; view-only fields

`AccessionPage/`: test-only change (auth mock).

## Batch 431

- AI draft sections load from the case only (report page and report preview).
- Billing Log saved searches are per person; the worklist's dead "access requested" upkeep is gone; worklist filters use session flags.
- Configuration passes a search result's section in the address.

## Batch 432

Audit Log: Resolve on open errors. Cytology QC queue: Escalate and Supervisor bypass. Batch detail: referral transit status.

## Batch 433

`QualityAssurancePage.tsx` → Financials:
- **Start correction** (needs `billing:applied-code:correct`) opens the billing correction dialog for any case, without a deficiency.
- Resolving a billing deficiency as "code corrected" or "charge reversed" continues to the dialog with that deficiency; the deficiency resolves only when the correction saves. The old inline CPT and reason fields are gone, and nothing is resolved when the correction fails.
- Raising a deficiency from the Code Review Pool asks which charge it's about, or "a charge is missing".
- New tab **Charges awaiting approval** (`components/Billing/ChargeApprovalQueue.tsx`).
- A link to a pillar (`?pillar=financials`, the breadcrumb) opens that pillar's first tab; it used to open an empty page.

`SynopticReportPage.tsx`: sign-out charges and credits wait as `PENDING_APPROVAL` when the lab requires approval.

## Batch 434

- `BatchManagement/WsiScanBatchesPage.tsx`: Slide scanning (WSI scan batches).
- `SlideDistributionStationPage/`: the scanner comes from the Equipment register.
- `CytologyQcQueuePage.tsx`: Assign to Me and the verdict buttons show only with `cytology:qc-review:record`, and Assign to Me is not offered to the person who signed the case out.
- `QualityAssurancePage.tsx`: through `components/Billing/ChargeApprovalQueue.tsx`, the approval queue names the lab for every case.

## Batch 435

- `BatchManagement/WsiScanBatchesPage.tsx`: live updates.
- `MockInterfaceEnginePage/`: the "Answer for the slide scanner" switch, and the banner and subtitle now cover every interface message.

## Batch 436

`MolecularWorkcenterPage/`: instrument names and localised dates (PS-326).

## Batch 437

- `ConfigurationPage.tsx` (PS-128) knows about unsaved changes anywhere on the page and tells the app-wide guard, so the logo, breadcrumbs, nav bar, header search and Sign Out ask first. Closing or reloading the browser tab gets the browser's own warning.
- `AuditLogPage.tsx`, `BillingLogsSection.tsx`, `SearchPage.tsx`, `ContributionDashboardPage.tsx` (PS-282, PS-357): exports are checked and audited.
- **Fixed:** the Audit Log showed every time shifted by the viewer's UTC offset (stored UTC times were read as local).

## Batch 438

- `ConfigurationPage.tsx`: asks "Discard unsaved changes?" before a dialog with edits closes from its backdrop or Escape (Keep editing / Discard changes). A dialog that doesn't close on Escape stays unsaved after Discard.
- `QualityAssurancePage.tsx`: CAPA Engine → **Recommended** (first tile, with the pending count). Confirmed CAPAs show their owner in Operations.

## Batch 439

Report page: peer review banner, the clinical-pathologic mismatch check and the peer-review gate at sign-out. Worklist: a Peer Review tile.

## Batch 440

The Cytology Workspace's QC / Rescreen tile is an unassigned, shared queue, and the workspace's text is translated. The main Worklist has a Cytology Review tile for positive GYN cases waiting for a pathologist. See `CytologyWorklistPage/README.md` and `WorklistPage/README.md`.

## Batch 441

The Cytology Worklist page now only renders (its logic is in `services/cytology/cytologyWorklist*.ts`). The Case Team modal saves through `services/cases/saveCaseTeam.ts`.

## Batch 442

`QualityAssurancePage.tsx`: the CAPA pillar gains the **Discordance Patterns** tile (PS-147), shown only to holders of `qa:pathologist-trend:view`.

## Batch 444

`SynopticReportPage.tsx`: the PDF endpoint setting is read by name (it was one of the reads that copied every `VITE_` variable into the bundle). Its remaining English is the next batch.

## Batch 445

- `SynopticReportPage/`: translated, with a guard test. Dates of birth now use the shared helper.
- `FullReportPage.tsx`: "Last updated" shows a formatted date and time in the user's language instead of the raw timestamp.

## Batch 446

Every case link opens the case by reference (`useOpenCase`), and every case page reads its case with `useRouteCaseId`:
- the report editor (`synopticLoader`);
- grossing;
- the full report;
- the cytology screening page;
- Add-On Orders (`?case=`);
- the demo EMR window (`/mock-emr?case=`; it used to be opened with `?patientId=<MRN>`).

The cytology patient-history links are buttons now.

## Batch 448

`LoginPage.tsx`: after a temporary password, a "choose your own password" step (new + confirm), then sign-in continues with the new one. "Forgot password?" now says to ask an administrator to reset it from the Staff screen.

## Batch 450 — test evidence for Priority 1 and 2 tickets

SynopticReportPage, WorklistPage and MolecularBatchPage: decisions moved into services and tested (PS-141, PS-235, PS-236, PS-305, PS-307, PS-309, PS-317, PS-318).

## Batch 451 — screen-level test evidence for Priority 2 tickets

Molecular plate builder, Label Designer, Cytology, Accession, comments and the report page: screen tests and logic moved to services; the plate grid now draws wells in their positions.

## Batch 452 — Closing the review gaps (PS-131, PS-105, PS-133/PS-323, PS-57), PS-156 correlation window, decant ↔ billing sync, Phase 1 fixes

Contribution Dashboard (PS-57): the Quality Flags tile now also lists flags applied to the pathologist's cases and specimens. Each is named from the flag catalogue by `flagDefinitionId`, and its colour follows the catalogue's severity. Its row text is translated: it used to be English built in `contributionDashboardCalculations.ts`.

## Batch 453 — The Batch 452 open items, and the native-speaker review register

- `CytologyWorklistPage/`: decant save conflicts are shown.
- `MicrotomyWorkstationPage/`: decants go through the atomic save.
- `SynopticReportPage/`: the Microscopic entry panel highlights findings.

## Batch 454 — Follow-up not received: report, alerts and clinician email

- `QualityAssurancePage.tsx`: a new Operations tab, Follow-up not received. Its tile counts the follow-ups that need attention.
- `WorklistPage/` and `CytologyWorklistPage/`: Follow-up tiles.
- `SynopticReportPage/`: "follow-up expected" at sign-out.

## Batch 456 — Sign-in lockout, password screening, demo seeds

`LoginPage.tsx` shows the lockout warning and the lock's minutes (`signInRefusalNotice`), and the change-at-sign-in form shows the new password errors.

## Batch 458 — PS-71: every case save carries its version

PS-71 (Pete's optimistic-locking spec, Oct 4): a save made from an old copy of a case no longer overwrites someone else's newer save. See `services/cases/caseWrite.ts` and `docs/architecture/CASE_API.md`.

Report page: Edit Conflict dialog. Accession, Cytology worklist and screening: conflicts shown.

## Batch 459 — PS-152 discordance report, follow-up after sign-out

- Quality Assurance → Cytology has a "Primary vs Final Diagnosis" report: each case's primary screen compared with the review chosen as its Final Diagnosis (PS-152).
- A signed-out surgical case can be marked "follow-up expected" from the report page's action bar, not only in the sign-out modal.
- Stale README notes corrected (cytology correction and addendum, autopsy authorization form).

## Batch 460

- **Cytology Workspace:** Billing drawer with full billing review.
- **Microtomy:**
  - matrix blocks;
  - saves that never overwrite someone else's change;
  - fixed slide levels and batch print order;
  - read-only charges with a full-review switch.
- **Label Designer:** drag-resize and the label edge.
- **Report page:** billing handlers moved to shared services.
- **Embedding:** clearer matrix-block message.

## Batch 461

Report page: the anatomical map companion beside the synoptic (prostate), drawn from the synoptic answers, with an optional "Insert into report" snapshot. See `SynopticReportPage/README.md`.

## Batch 463

SynopticReportPage: the Mohs stage question in the synoptic; Mohs stage maps always in the report.

## Batch 463b

SynopticReportPage: the Mohs block gate at sign-out (Assist and Orchestration).

## Batch 465b

`SynopticReportPage/`: node counts checked at draft save and sign-out; totals calculated from the levels grid.

## Batch 466

`SynopticReportPage/`: whole-number node counts.

## Batch 466b

`SynopticReportPage/`: generic margin questions follow the map; question-level count limits.

## Batch 466d

`SynopticReportPage`: a sign-out warning for invasive carcinoma with margins unreported.

## Batch 467 — In-house molecular orders

Molecular Workcenter: new Order Queue tab. Add-on orders: in-house or send-out for molecular tests. Synoptic: molecular result notices and deltas.

## Batch 467b — Molecular orders: send-out results, plate, sign-out, instrument

- **Order Queue:** choosing a reference lab, and the reference-lab statuses.
- **Plate Builder:** shows which order is in each well.

## Batch 468 — Autopsy: consent-scope enforcement, forensic chain-of-custody

- **AccessionPage:** no behavior change; the organ display-label map moved out to its own shared file.
- **SynopticReportPage:** a consent-scope warning banner, a retention-tier refusal toast, and (forensic cases) a chain-of-custody log with a "Record Custody Transfer" form.
- **Sign-out:** warns about answers that differ from their molecular result.
- **Mock Interface Engine:** the instrument's results.

## Batch 469 — Autopsy: toxicology, organ-retention disposal, consent narrowing/revocation (PS-261 follow-up)

- **SynopticReportPage:** a toxicology order/result log with order and per-order result forms (any autopsy case); an organ-retention disposal panel (HTA-governed jurisdictions only, tier set beyond "none"); a consent narrowing/revocation panel (hospital-consented cases) that seeds its draft from the case's current consent record on open. See [SynopticReportPage/README.md](./SynopticReportPage/README.md).

## Batch 471 — Autopsy: toxicology cancellation, organ-retention detail, consent reinstatement (PS-261 follow-up)

- **SynopticReportPage:** a "Cancel Order" action and reason form on each open toxicology order; a new organ-retention detail panel (recipient/location, HTA-governed jurisdictions only) between the tier select and the disposal panel; a "Reinstate Consent" action and form, shown once status isn't `'active'`. See [SynopticReportPage/README.md](./SynopticReportPage/README.md).

## Batch 472 — Autopsy: capability-greying, retention-tier reason, punctuation sweep (PS-261 follow-up)

- **SynopticReportPage:** all eight autopsy action buttons (order/result/cancel toxicology, record retention detail, record disposal, record custody transfer, narrow/revoke consent, reinstate consent) now grey out ahead of a click when the signed-in user lacks the capability, via `CapabilityButton`; a plain reason text field beside the `organRetentionTier` select; two pre-existing hard-coded-punctuation lines (custody "received by," consent status note) fixed. See [SynopticReportPage/README.md](./SynopticReportPage/README.md).

## Batch 473 — Autopsy case-type key migration (PS-261 follow-up)

No behavior change. **SynopticReportPage** and **AccessionPage** both reference `caseAuthority`'s renamed forensic-path value, `'medicolegal_forensic'` → `'statutory_judicial'`. See [services/autopsy/README.md](../services/autopsy/README.md).

## Batch 475 — Autopsy Module 3: toxicology specimen barcode & chain-of-custody link (PS-261 follow-up)

**SynopticReportPage:** the toxicology order form gets a required specimen barcode; the existing forensic-only custody log gets an optional link to a specific toxicology specimen, and each order shows its own linked custody entries. See [SynopticReportPage/README.md](./SynopticReportPage/README.md).

## Batch 474 — Two non-autopsy quick fixes (PS-359)

- **SynopticReportPage:** `useGrossingCompletion.ts`'s re-finalize correction-reason capture moves from a blocking `window.prompt()` to the app's `ReasonPromptModal`. See [SynopticReportPage/README.md](./SynopticReportPage/README.md).
- **MolecularWorkcenterPage:** the batch summary table now flags a batch whose target instrument has an open malfunction or is past due for maintenance/calibration, reusing the same rule and row styling as the Equipment register. See [MolecularWorkcenterPage/README.md](./MolecularWorkcenterPage/README.md).

## Batch 476 — Autopsy Module 4: unified case timeline (PS-261 follow-up)

**SynopticReportPage:** a new "Case Timeline" section merges every dated autopsy event on file (forensic orders, consent, custody transfers, toxicology, organ retention/disposal, ancillary hold, PAD/FAD signing, addenda) into one newest-first list, read-only, no new capability. See [SynopticReportPage/README.md](./SynopticReportPage/README.md).

## Batch 477 — Autopsy worklist badges (PS-261 follow-up, Module 5)

**WorklistPage:** the existing Autopsy branch tab's rows now show case authority, an active ancillary hold, PAD/FAD signed, and a TAT/SLA tooltip, via a new badges component in `components/Worklist/`. Pete's own scoping call — extend the existing branch tab + grouping rather than build a second screen. See [WorklistPage/README.md](./WorklistPage/README.md).

## Batch 478 — Autopsy Module 6: gross-exam gate override, per-organ tagging (PS-261 follow-up)

**SynopticReportPage:** the gate-blocked banner gains a capability-gated "Override & Sign {tier}" button — the authorization gate is now a real hard stop in `signAutopsyReport.ts`, not just a banner condition, and overriding it is audited (new `autopsy:gross-exam-gate:override`, nobody by default). A new "Organ Tags" section records per-organ gross-exam findings (new `autopsy:organ-tag:record`, seeded to the grossing roles). Both new event kinds show in the existing Case Timeline. See [SynopticReportPage/README.md](./SynopticReportPage/README.md).

## Batch 479 — fix: gate-blocked banner text translated, not literal English (PS-261 follow-up)

**SynopticReportPage:** the Batch 478 gate-blocked banner's summary line now translates the gate's own `blockedReasons` through `t()` and `formatList()` instead of showing raw English. See [SynopticReportPage/README.md](./SynopticReportPage/README.md).

## Batch 481 — Structured Inking Module 2: grossing-screen UI for margins/ink (PS-359 follow-up)

**GrossingScreenPage:** a new "Margins & Ink Applications" section per specimen — lists every recorded margin (on the specimen or a block) with its full ink history, plus inline "+ Add margin" / "+ Add ink application" forms, capability-gated (`grossing:margin-ink:record`), wired to Batch 480's `recordMarginInkApplication.ts`. See [GrossingScreenPage/README.md](./GrossingScreenPage/README.md).

## Batch 482 — Structured Inking, Module 3: severity display + ink-colour palette (PS-359 follow-up)

**GrossingScreenPage:** the severity engine's advisory display Batch 480/481 deferred, now wired in as display-only — a per-margin issue badge list and a per-specimen WARN_ONLY/STRICT_ENFORCE notice — plus the free-text ink-colour inputs on both the "add margin" and "add ink application" forms replaced with a `<select>` drawn from the new ink-colour admin palette (`services/inkColors/`). Unblocked by re-scoping `inkingSiteSettings.ts` from a non-existent `siteId` to `Case.order?.facilityId`, the one real, already-used case→facility link, per Pete's own explicit choice. Does not change what blocks Complete grossing. See [GrossingScreenPage/README.md](./GrossingScreenPage/README.md).

## Batch 483 — Cytology gaps + signature viewer (PS-359 tracker follow-up)

**SynopticReportPage:** new "recorded signatures" chip opens a new, read-only Signature History modal over `services/signatures/` — recorded since Batch 345, never surfaced before. See [SynopticReportPage/README.md](./SynopticReportPage/README.md). Also fixes a cytology multi-specimen worklist/queue bug and a per-specimen countersign data-loss bug — see `services/cytology/README.md` and `services/cases/README.md`.

## Batch 484 — Inking sign-out/grossing gate engine (PS-519 follow-up)

**GrossingScreenPage:** Gate A (Complete grossing) is now actually enforced — Severity 3 hard-blocks, Severity 2 is a dismissible advisory, and a palette that failed to load or wasn't supplied blocks fail-closed, never silently treated as clean. **SynopticReportPage:** a new Gate B (Sign-out) check, with an Administrative Override path for Admin/Lab Director on a Severity 3 issue (mandatory reason code, audited). Drops "Sign-out gate bug" from this batch's scope — no locatable bug was ever found, and Pete's clarifying answer turned out to be further spec detail for the gate engine, not a bug description; needs Pete's own description to proceed. See [GrossingScreenPage/README.md](./GrossingScreenPage/README.md) and [SynopticReportPage/README.md](./SynopticReportPage/README.md).

## Batch 488 — new BenchContributionDashboardPage (PS-359 follow-up)

**New page, `/bench-contributions`:** the four bench roles' own dedicated dashboard — real accessioning rate, batch throughput & queue aging (per processing node), stage-to-stage TAT (accessioning → Embedding → Staining; accessioning → Cytology Processing → Cytology Staining), and molecular QC pass/fail & rerun rate, each traced to a real, already-stored field (`Case.accession.accessionedAt`/`accessionedBy`, `Batch`/`BatchItem`, `MolecularBatch.controlsPassed`/`supersededReason`). All math lives in new `benchContributionCalculations.ts` (5 pure functions: `computeAccessioningRate`, `computeBatchThroughputAndAging`, `computeStageToStageTat`, `computeMolecularQcSummary`, plus their shared light `*ForBenchCalc` fixture types — same established convention as `contributionDashboardCalculations.ts`'s own `CaseForDashboardCalc`), 14 tests. The page itself reuses the existing `.ps-contrib-*` tile/KPI CSS classes from `ContributionDashboardPage.tsx` — no new CSS, no inline styles. New route gated by a new `screen:bench-contributions:open` capability (see `services/screens/README.md`, `services/authorization/README.md`), new Home tile (color `#7FB800`, image `/bench_contributions.webp` — a placeholder graphic generated for this batch, not a stock photo; swap it if a real one is supplied later, the way Tumor Board's own tile image was).

## Batch 489 — new TumorBoardWorkspacePage (Module 1 of Pete's Tumor Board / MDT Workspace spec; PS-359 follow-up)

**New page, `/tumor-board`:** the dedicated board-nomination workspace — filterable by Board Selection, Meeting Window (Today/Next 7 days/Next 30 days/All), Case Status (default `Pending Presentation`, per Pete's own spec), and Presenter, sortable by meeting date or last updated. Filter state is sticky per browser (`utils/uiPreferences.ts`, bundled as one object under one key — no precedent yet for a multi-field saved view, so this establishes the pattern). All filtering/sorting/date-window math lives in `services/tumorBoard/tumorBoardWorkspaceFilters.ts` (pure, tested); `hooks/useTumorBoardWorkspace.ts` orchestrates `tumorBoardService`/`caseService`/`userService`. The page itself only renders — no business logic (CLAUDE.md rule 2). The actual "Flag for MDT" nomination happens on the report page at sign-out, not here — see `components/TumorBoard/README.md` and `services/tumorBoard/README.md`. New Home tile, color `#9816D9` (violet) — the 10th colorblind-safe tile color, verified the same way as `#7FB800` (Batch 488); see `Home.tsx`'s own comment for the margins.
## Batch 491 — new MarginExceptionReviewPage; Tumor Board dismiss/manage split (PS-359 follow-up)

**New page, `/margin-exception-review`:** the deferred Batch 490 review queue for a `Pending` `MarginExtractionException` — every margin-distance free-text answer the extraction layer couldn't confidently parse. Lists each one with its case/patient, field, raw text, and parse-failure reason; lets a pathologist/fellow/resident/PA tag the real distance (Resolve) or close it with a reason (Dismiss), both the existing `case:margin-exception:resolve` capability (`CapabilityButton`, service enforces again). `hooks/useMarginExceptionReview.ts` orchestrates `marginExtractionService`/`caseService`; the page itself only renders. Reached from a new tile in `PathologyWorkspacePage.tsx` (see that folder's own README) rather than a standalone Home tile, since it's a narrower, lower-traffic queue than Tumor Board's own.

**`TumorBoardWorkspacePage.tsx`:** the Coordinator/Clinical capability split Pete confirmed — queue management (status other than Dismissed, presenter, board, meeting date) now needs `case:tumor-board:manage`; closing a listing as Dismissed is a separate action with a mandatory reason, needing the narrower `case:tumor-board:dismiss`, and the plain status dropdown no longer offers "Dismissed" at all. A row also shows a source badge (Manual/Rule) with the trigger reason as its tooltip, since cases can now be auto-flagged by the new rule evaluator (`services/tumorBoardRules/`) as well as the existing manual "Flag for MDT" action. See `services/tumorBoard/README.md`'s own Batch 491 entry.

## Batch 492 — Tumor Board / MDT: real flag button, missing breadcrumbs, naming consistency (PS-359 follow-up; found-while-testing bug fixes)

Pete tried the end-to-end flow and reported two real bugs plus a naming inconsistency. **`SynopticReportPage`:** the only way to open `FlagForMdtModal` was the `'delegation.tumorBoard'` voice/keyboard action — no clickable button existed anywhere, a gap Batch 491's own deactivation of `DelegateModal.tsx`'s `'TUMOR_BOARD'` type made worse by removing the last awkward menu path. `BottomActionBar.tsx` gains a real `CapabilityButton` (`case:tumor-board:flag`) next to Flags/Codes. **`TumorBoardWorkspacePage.tsx`** and **`MarginExceptionReviewPage.tsx`:** neither page ever called `useBreadcrumb().pushCrumb(...)`, unlike every sibling standalone page, so `AppShell.tsx`'s breadcrumb bar (which only renders once `crumbs.length > 1`) stayed silently hidden on both — both now register their existing, already-translated `pageTitle` as a breadcrumb on mount. **Naming:** display text now reads "Tumor Board / MDT" consistently (home tile, page title) in en/de/nl/ko; fr's "RCP" stays alone as the real regional term. See `SynopticReportPage/README.md` and `SynopticReportPage/components/README.md`'s own Batch 492 entries, and `src/i18n/README.md`'s master changelog entry.

Disclosed, not fixed: no notification is sent to a presenter when assigned (no messaging system to send one through yet — new-feature-level, not a patch); the Presenter dropdown's Pathologist/Fellow-only filter is confirmed by-design, not a bug. **Correction (Batch 493, CLAUDE.md rule 6):** the notification claim was wrong — this app already had a real messaging/notification layer (`services/messages/`, `services/communications/`); not checked carefully enough before disclosing. Now wired up: see Batch 493's own entry. The presenter filter was genuinely as-designed at the time; Pete has since asked that it also include Residents, also done in Batch 493.

## Batch 493 — Residents as presenters, meeting time + calendar invites, scheduling permission split (PS-359 follow-up)

Pete, Oct 8: *"Before Action Registry. Residents can be assigned to tumor boards, so should be available for selection. Also, from a workflow perspective, If I assign a future data for a tumor board, I'd want a message, and can we send our an appointment to their calendar?"* Followed by: *"Restrict the formal 'Tumor Board Presenter' assignment field in your system to Attending Pathologists, Fellows, and Residents"* and *"There should be a specific permission to schedule these MDT so that an admin assistant can schedule them in advance."*

**`TumorBoardWorkspacePage.tsx`:** Presenter dropdown now offers Residents alongside Pathologists and Fellows (PA stays excluded). New optional meeting-time input next to the meeting-date one (disabled until a date is set) — left blank, a listing stays a date-only meeting. When a presenter is assigned to a still-future meeting date (or the date/time/presenter is changed on one), the presenter now gets a real in-app message and, when they have an email on file, an emailed calendar invite (`.ics`) they can accept into their own calendar — no patient-identifying information in either. See `services/tumorBoard/README.md`'s own Batch 493 entry for the full design (the notification/invite logic, and why no PHI travels in them).

**Permissions:** scheduling (board, date, time, presenter) is now its own capability, `case:tumor-board:schedule`, separate from the existing `case:tumor-board:manage` (now status-only — Cancel/Presented/Deferred). This is the real fix for "an admin assistant can schedule them in advance": an admin can grant just this narrower capability to a custom, non-clinical role via Config → Staff → Role Dictionary, without also handing out the clinical queue-management authority. See `services/authorization/README.md`'s own Batch 493 entry.

No UI restructuring needed beyond the new time input — every existing handler on this page already changes exactly one field-group per save, so the new two-capability split is transparent to the page itself.

## Batch 494 — TumorBoardWorkspacePage rebuilt as a self-service dashboard (PS-359 follow-up — MDT Self-Service Assignment & Batching redesign)

Pete, Oct 8, right after Batch 493 shipped: *"I'm just not feeling this workflow. This is an adjustment,"* followed by a full written spec replacing up-front presenter assignment with self-service claiming plus a batch-lock cut-off. Full design in `services/tumorBoard/README.md`'s own Batch 494 entry; this page's own changes:

**`TumorBoardWorkspacePage.tsx`** rewritten around `services/tumorBoard/tumorBoardSessionGrouping.ts`'s `groupTumorBoardRowsBySession()` — a session header per board+meetingDate (soonest first; a trailing "Unscheduled" group for date-less rows) replaces the old flat row list, each with a locked/open badge and an unassigned-count badge. A new **Claim** button appears on any unassigned row for a presenter-eligible signed-in user (self-service, alongside — not instead of — the existing admin-assist presenter dropdown); a "Claimed by {{name}}" badge appears once a presenter is set. A new **Print** button (plain `window.print()`) for Pete's "printed hard-copy checklist" — the filter bar and every per-row action/control are hidden from print output via a new `.ps-tb-no-print` class.

**Disclosed-and-fixed UI bug found while rebuilding this page:** every scheduling control below the status dropdown (presenter, meeting date, meeting time) was gated on `case:tumor-board:manage` alone, even though Batch 493 moved exactly those fields to the narrower `case:tumor-board:schedule`. A custom "Admin Assistant" role granted only that capability — the whole point of Batch 493's split — would have hit a server-enforced success but a UI that still showed every one of those controls disabled. Now checks `case:tumor-board:schedule`; only the status dropdown still checks `case:tumor-board:manage`.

**`FlagForMdtModal.tsx`** (`components/TumorBoard/`) gains optional meeting-date/meeting-time fields so a case enters a real batch immediately when flagged — left blank, it still lands in the Unscheduled group. The presenter field itself is never collected here; that stays Null until someone claims the case from the workspace.

## Batch 495 — front-end gap fixes and PS-283 print work

- **`ReportPreview/`:** `/report-preview/:caseId` is now routed (it was a `window.open` target with no route, so the pop-out redirected to `/login`); Print is permission-checked; the renderer draws a revision banner and a footer barcode/document reference. See [ReportPreview/README.md](./ReportPreview/README.md).
- **Breadcrumbs on ten pages** that never registered one: `BenchContributionDashboardPage`, `MolecularWorkcenterPage`, `MolecularOrderQueuePage`, `MolecularBatchPage/` (plate builder, rack worklist, rack loading, control rules), `BatchManagement/EquipmentServiceLogPage`, `MigrationJobsPage`, `MockInterfaceEnginePage`. Each reuses its existing page-title key (two new keys: `molecularPlateBuilderPage.pageTitle`, `molecularRackLoadingPage.pageTitle`).
  - **Audit correction:** the gap audit also listed `WorklistPage`, `ConfigurationPage`, `AuditLogPage` and `ContributionDashboardPage`. Those were wrong: `AppShell.tsx`'s `PAGE_LABELS` map already pushes their crumbs, so they were left alone.
- **`SynopticReportPage/`:** print permission (`report:case-report:print`) on every print path, revision status in the printed header and the orchestration PDF payload. See [SynopticReportPage/README.md](./SynopticReportPage/README.md).

*Correction (Batch 496 README audit): nothing in the app opens the preview window today — `usePreviewSender()` / `openPreviewWindow()` (`hooks/usePreviewChannel.ts`) have no callers, so the route works only when its address is opened directly. Restoring a pop-out button in the editor, or retiring the page, is an open decision.*

## Batch 497 — report-preview window retired

`/report-preview/:caseId` and `ReportPreview/ReportPreviewPage.tsx` are removed (Pete: *"Retire it."*). Nothing opened the window, and Pete had already confirmed it as superseded once; the files had come back because a zip can't delete files. `ReportPreview/ReportPreviewRenderer.tsx` stays (the report page uses it). See [ReportPreview/README.md](./ReportPreview/README.md).

## Batch 498 — report PDF: revision banner, watermark, footer barcode, disclaimer

- **`SynopticReportPage/`:** both report PDF requests (the orchestration print and the sign-out snapshot) now send `revision` and `documentVersion`; the orchestration print also sends the report's language and wording, and writes the date of birth in the report's locale (it was fixed to en-GB). The renderer (`functions/main.py`) draws the revision banner, the pending-release watermark on every page, the pre-analytic disclaimer and a footer barcode with the document reference. See [SynopticReportPage/README.md](./SynopticReportPage/README.md).

## Batch 499 — front-end readiness Stage 1, first fixes

- **`QualityAssurancePage.tsx`:** the "Failed Dispatches" tile opened `/configuration?…section=outbound_charge_dlq`, a section that no longer exists (the charge dead-letter queue moved to Audit Log → Financial). It now opens Audit Log → Financial → Outbound DLQ (`services/auditlog/auditLogLinks.ts`).
- **`AuditLogPage.tsx`:** reads `?tab=financial&view=outbound_dlq|billing_logs` to open a Financial view directly.
- **`SynopticReportPage/`:** the organ-retention tier is saved through a service with its own capability. See [SynopticReportPage/README.md](./SynopticReportPage/README.md).
- **`system/FacilityDictionaryPage`** (unchanged) opens a `FacilityEditorModal` that no longer breaks the rules of hooks.

## Batch 500 — HTML sanitising (PS-473)

Every page that renders HTML from data now sanitises it first (`services/security/sanitizeHtml.ts`): `ReportPreview/ReportPreviewRenderer.tsx` (sections, paragraphs, footer barcode), `Synoptic/Comments/` (case and report comments), `BatchManagement/NewContainerModal.tsx` and `LabelDesignerPage/` (barcode SVGs). Print windows in `SynopticReportPage/` escape the accession in their title and page header.

## Batch 501

- **`CytologyQcQueuePage.tsx`:** each assignment shows what selected it ("Selected by: ROSE discrepancy, Rule: …, Random peer review") and its reviewer pool.

## Batch 502

- **`SynopticReportPage/`:** the organ map and synoptic panels each have an error boundary (PS-472). Every page is also inside the route boundary in `AppShell`.

## Batch 504

- **`SynopticReportPage/`:** sign-out could skip the fixative-time check, or build its PDF snapshot from older text, through stale callback inputs. Fixed, along with the printed age.
- **`WorklistPage/`:** voice "read flags" fixed.
- **`QualityAssurancePage.tsx`:** the deficiency trend is by facility month.
- **`ContributionDashboardPage.tsx`:** follows the facility time zone and language.
- **`AccessionPage/`, `BatchManagement/`, `MolecularBatchPage/`, `EmbeddingStationPage/`, `MicrotomyWorkstationPage/`:** dependency lists corrected or explained.

## Batch 506 (PS-477)

Files here that imported a mock service directly now import it from `@/services` (see `services/deploymentReadiness/README.md`). No change in behaviour.

## Batch 511 (PS-478): full strict type-checking

- **Bug fixed, `WorklistPage.tsx`:** a hook dependency read `user.id` where everything else reads `user?.id`, which could crash the worklist if the user was cleared (during sign-out).
- Typing only: `AuditLogPage` (case-link clicks, the drift filter), `QualityAssurancePage` (chart tooltip).

## Batch 512

See `SynopticReportPage/README.md` (specimen LIS sync state fix).

## Batch 513 (PS-269): the UI translation sweep is complete

Every visible string here now goes through `t()`, in all five languages, and `src/i18n/uiText.guard.test.ts` keeps it that way.
- **Accession:** "Print Labels" (an existing key that nothing used), the MRN label, title options, and the order picker's "Routine".
- **Grossing screen:** errors from the grossing hook are reason codes, translated on screen. A refused margin-ink save now shows a translated message instead of the service's English text.
- **Molecular plate builder:** movement history uses translated level names and a template line, and its timestamps follow the user's locale.
- **Contribution dashboards:** scroll-region labels (aria-labels) are translated.
- **Login:** the tagline's alt text is translated.
- **`OutboundDispatchTrailSection`:** the JSON viewer renders `null` through `JSON.stringify`.
- **`AuditLogPage`:** the status labels feeding the CSV export stay English.
- **`Synoptic/Codes/AddCodeModal`:** the SNOMED filter hints are translated.

## Batch 514 (PS-269)

Patient and physician names show in the screen's language (`utils/personName.ts`, `formatDisplayNameForLanguage`). In Korean: full name + 님, or 선생님 for a doctor. Pages: `SearchPage.tsx` (physician picker), `CytologyQcQueuePage.tsx`, `SurgicalQaWorklistPage.tsx`, `TumorBoardWorkspacePage.tsx`, `MarginExceptionReviewPage.tsx`, `AccessionPage/`, `CytologyWorklistPage/`, `AddOnOrderPage/`. The tumor board and margin exception pages now get name fields from their hooks and format them, so a language switch updates them.

## Batch 515

- `PrintQueueDashboardSection.tsx`: action buttons are `CapabilityButton`s for the new `print:job:*` permissions (PS-283).
- `AuditLogPage.tsx`: the FPPE log reads the QA supervision service (PS-124).
- `QualityAssurancePage.tsx`: the trend-review tile shows its count when the page opens (PS-147).

## Batch 516

`SynopticReportPage/`: PRELIMINARY watermark on prints before sign-out, restricted-case print check, and PHI-tagged material tooltips.

## Batch 517

- **SynopticReportPage:** critical findings can be sent by secure email (PS-143).
- **LoginPage:** a comment pointed to `login-brand.css`, a file that was never loaded. It now points to `pathscribe.css`, which the file was deleted in favour of (PS-294).

## Batch 518

- **`OutboundInterfaceDlqSection.tsx`** (Audit Log → Interfaces → Outbound) now covers all seven queues (PS-122).
  - Its per-queue logic and send flow moved to `services/interfaceDispatch`.
  - The buttons are `CapabilityButton`s for `interface:outbound:resend`.
  - Identifiers are tagged `data-phi`, and dates use the user's locale.
  - It has a test now (`OutboundInterfaceDlqSection.test.tsx`).
- **`QualityAssurancePage.tsx`** has a new pillar, Activities (PS-120). The existing tabs are unchanged.
- **BatchManagement:** a new Label reprint tile and page (PS-123).

## Batch 519

**CytologyWorklistPage:** the synoptic templates come from the Synoptic Library (PS-273). **SynopticReportPage:** free-text node counts check "cannot be determined", "at least N" and Breast's sum (PS-494).

## Batch 520

**`OutboundInterfaceDlqSection.tsx`:** an eighth queue, report delivery (e-fax and file drop, PS-280), with resend.

## Batch 521

**`DeliveryExceptionsPanel.tsx` (new):** the delivery exception queue, at the top of the Outbound view (PS-281).

## Batch 522

- **`ConsultLinksAuditSection.tsx` (new):** Audit Log → Consult links. Every outside consult link on every case, with Revoke (PS-290).
- **`ExternalConsultViewPage/`:** the token is read after `#`, and the page shows only the link's scope.

## Batch 523

**Cytology Workspace** and **case report page (autopsy FAD):** the clinical-pathologic mismatch check now runs before sign-out there too (PS-145).

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 526

Test files here no longer set their own time limit below the suite's 60 s (`vitest.config.ts`); on a busy Windows machine those shorter limits caused false timeouts.

## Batch 527 (PS-486): a lean first load

`LoginPage.tsx` imports from `services/signIn.ts`. `ConfigurationPage.tsx`: the Demo Reset tab, and the tab's code, are built in only in the demo build (`__DEMO_TOOLS__`).

## Batch 528 (PS-359): required clinical history

`AccessionPage`: for cytology and FNA cases, the organisation's clinical-history requirements join the Case & Patient check.

## Batch 530 (PS-554)

`SurgicalQaWorklistPage.tsx`: a "Deferred clinical mismatches" section, the secondary review queue; a pathologist records Resolved or Unresolved in place. The report page and the Cytology Workspace: see their READMEs.

## Batch 531

Cytology Workspace: the inline mismatch alert, like the report page.

## Batch 532

Cytology Workspace: Print case report; early finalization releases the consolidated case report (`CytologyWorklistPage/README.md`).

## Batch 533

Cytology Workspace: Send urgent preliminary, per specimen (`CytologyWorklistPage/README.md`). Signature history names the new signing action (`SynopticReportPage/modals/SignatureHistoryModal.tsx`).

## Batch 534

The report page and the Cytology Workspace show reports held for the release delay, with Recall (`components/ReportRelease/HeldReportsBanner.tsx`).

## Batch 535

Report page: Recall for held corrections, addenda and autopsy PAD/FAD. A correction released at re-sign-out is now sent (`SynopticReportPage/README.md`).

## Batch 536

AI calls from pages (coding, critical findings at sign-out) are checked against the jurisdiction's AI vendor policy.

## Batch 538

Report page: print and preview from the same payload as the released PDF; Version History shows the documents sent, with View as sent.

## Batch 539

`CytologyWorklistPage/`: cytology print and preview come from the report renderer. `SynopticReportPage/`: the renderer's address is shared.

## Batch 540

Report page and Cytology Workspace: a correction or addendum can't be started while the report is still in its release delay (recall it instead).

## Batch 543

`AuditLogPage.tsx`, `BillingLogsSection.tsx`: CSV cells are written with `csvQuoted` (`utils/csv.ts`), which neutralizes formula cells (finding F8). The CSV rows are still put together in these pages (pre-existing); moving that into services is left for the export service of phase 2d (`ASYNC_EXPORT_API.md` §7).

## Batch 544

`QualityAssurancePage.tsx`: Deficiencies (active and closed) and Billing deficiencies have the scope picker.
- Their lists, tile counts and exports follow it (`hooks/useQaCaseScope.ts`).
- Management reviews stay lab-wide: one review covers closed items from several facilities.

## Batch 547

`LoginPage.tsx` reads `VITE_APP_ENV` through `appEnv()` (runtime configuration).

## Batch 548

Loading text here now uses `components/Common/LoadingState.tsx`: nothing for 300 ms, a placeholder, then "still working" from 3 s.

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- `PrintQueueDashboardSection.tsx`: a job that needs the site agent shows that reason in the user's language.
- Loading text here now goes through `LoadingState` (`components/Common`): nothing for 300 ms, then the screen's own loading text, and "Still working…" from 3 s. Carried over from Batch 548; `services/connectivity/latency.guard.test.ts` now covers every loading text in the app.

## Batch 550 (PS-539 phase 2d: exports through the server)

- **`MyExportsPage.tsx` (new, `/my-exports`):** the signed-in user's exports from the API server.
  - Columns: status, rows, requested and deleted after.
  - Download for a ready export, Cancel for one being prepared.
  - In the demo it explains that exports download straight away.
- **Through the export service** (the API server builds the file from the screen's filters; the demo builds it in the browser as before):
  - `AuditLogPage.tsx` (4 logs, typed filters with the facility time zone);
  - `BillingLogsSection.tsx`;
  - `ContributionDashboardPage.tsx` (2);
  - `SearchPage.tsx` (criteria, sort, time zone);
  - `QualityAssurancePage.tsx` (the deficiencies queue sent as open, escalated or closed).

## Batch 551 (PS-539 phase 2d: the Server jobs view)

- `ServerJobsSection.tsx` (new): System Logs → **Server jobs** (`AuditLogPage.tsx`, a tab shown only with `jobs:server-job:view`; a link to it without the capability opens the Audit tab). Job kinds' health, recurring jobs (overdue judged by the server's time), and the jobs that failed for good, with Requeue (one click) or, for interface and print jobs, a button that opens Interfaces → Outbound or the Print Queue. Case ids tagged `data-phi`. In the demo it says the browser does this work itself.

## Batch 552 (PS-539 phase 2d: site agent screens)

- `PrintQueueDashboardSection.tsx`: a job the site agent could only send (Raw 9100, LPR) shows "Sent to printer" instead of "Printed" (`printJobStatusKey`), and the site agents' status line.

## Batch 553 (PS-539 phase 2d: site agent printers in routing)

- `PrintQueueDashboardSection.tsx` (Batch 553): Redirect offers the jobs' own lab's agent printers, or a printer address when they come from several labs or an older job's lab isn't recorded. A refused redirect keeps the form open and says how many weren't redirected. Dates use the user's language.

## Batch 554 (PS-539 phase 2d: interface monitoring)

- `InterfaceEnginesSection.tsx` (Batch 554, new): Audit Log → Interfaces → Engines, each engine and its channels, problems first, Open Outbound for dead letters; read only. `AuditLogPage.tsx`: the Engines sub-tab and the engines line, with the capability.

## Batch 555 (PS-539 phase 2d: browser stand-ins for server jobs)

- Batch 555: `InterfaceEnginesSection.tsx` shows counts in the user's number format; `SynopticReportPage` release countdown (see its README).

## Batch 556 (PS-539 phase 2d: report documents through the API)

- Batch 556: `SynopticReportPage/modals/VersionHistoryModal.tsx` (sent documents through the API server).

## Batch 558 (PS-539 phase 2d: report versions through the API)

- Batch 558: `SynopticReportPage/` (Version History reads versions' PDFs through the API server when there is one).

## Batch 560 (PS-539 phase 2d: push instead of polling)

- Batch 560: `FacilityOpsDashboard/`, `BatchManagement/EngraverMonitorPage.tsx` (updated by the live-update hub).

## Batch 562 (PS-539 phase 2d)

- Batch 562: `MolecularWorkcenterPage/MolecularOrderQueueTab.tsx` updated by the live-update hub.

## Batch 566 (WCAG 2.1 AA)

- Batch 566: `CytologyWorklistPage/` (a row's name is the button that opens the case), `WorklistPage/` and `BatchManagement/` (view tiles say which is on).

## Batch 567 (WCAG 2.1 AA)

- Batch 567: `Synoptic/` (add code, delegate) and `SynopticReportPage/` (billing review, sequencer, protocol changes): no control inside another.

## Batch 568 (WCAG 2.1 AA)

- Batch 568: `ContributionDashboardPage.tsx` (the teaching tile opens from its title; `TeachingCasesTile` exported for its test), `Home.tsx` (the cards' keyboard handling comes from `pressable` alone), `WorklistPage/` (view tiles' colours from the stylesheet).

## Batch 569 (WCAG 2.1 AA, 4.1.2)

- `SearchPage.tsx`, `BillingLogsSection.tsx`: a saved search / query chip was a button holding its × button. The chip is a mouse shortcut now; its name is the button that loads it (marked current when loaded; the Billing query's filter summary is its tooltip), and × is a button of its own (named "Delete saved query …": `billingLogs.deleteQueryAria`, new).
- `SynopticReportPage/components/Sidebar.tsx`: in the collapsed specimen rail, the "changes to review" dot was a button inside the specimen's button; it sits beside it now (`.ps-syn-rail-item`), as a named button, in the same place and size.

## Batch 570 (WCAG 2.1 AA, 2.4.3)

- `SearchPage.tsx`, `BillingLogsSection.tsx`: after a saved search's or query's × (keyboard) removes it, focus goes to the next one, or to "Save search / query" (or its name box when open), via `hooks/useFocusAfterRemoval.ts`. Billing's save-row Cancel (✕) has a name.

## Batch 572

- `SynopticReportPage/`: "Someone else saved this case". `CytologyWorklistPage/`: today's screening hours sign-off.

## Batch 573

- `SynopticReportPage/`: who else has the case open (`components/CasePresenceStrip.tsx`).

## Batch 574

- `CytologyWorklistPage/`: the workload counter; yesterday's screening hours.

## Batch 575

- `SynopticReportPage/`: "Show their changes" in place, without a reload.

## Batch 576

- `SynopticReportPage/`: "editing" follows the person's own edits.

## Batch 577

- `SynopticReportPage/`: "Use their version" in place; lists, preview context and synoptic answers read again after taking up a version; presence in the tab bar.

## Batch 579

- `SynopticReportPage/`: specimen billing codes and the Sequencer's specimen order saved at once (`saveSpecimensNow`); the synoptic form keeps its section after a re-read.

## Batch 583

- `SynopticReportPage`: breadcrumb and Back name Search for a case opened from Search; specimen-level billing changes after sign-out ask for a reason. `ConfigurationPage.tsx`: Discard closes the dialog.

## Batch 588

- `SynopticReportPage/`: Delete this block in the block editor. See its README.

## Batch 589

Label Designer canvas (PS-245); report page changes listed in `SynopticReportPage/README.md`.

- Batch 609 (part B): the mismatch check on amendments, corrections and addenda (lab setting for holding the release), Final Diagnosis rule on publish, template lifecycle in the Audit Log, Upload Protocol file check. See `src/services/clinical/README.md`, `src/services/templates/README.md`, `src/components/Config/Protocols/README.md`.

## Batch 612 (part C)

Report preview: a template in points is drawn at the paper's real width and side margins with text in CSS points, so the screen matches the print.

## Batch 610 (part A) — AutopsyDashboardPage; Intraop urgency toggle; OR dashboard clock

New `AutopsyDashboardPage/` at `/autopsy-dashboards` (Quality & Compliance hub tile). `IntraopQueuePage.tsx`: STAT/Routine toggle on each specimen. `OrSuiteDashboardPage.tsx`: frozen section target and warning from TAT configuration. `SynopticReportPage.tsx`: autopsy turnaround chip next to the TAT summary. `QualityComplianceHubPage.tsx`: Autopsy Dashboards tile.

## Batch 610 (part B)

Performance targets and client service levels are saved and judged by `services/performanceTargets` and `services/clientSLA`; `services/jurisdictionOverview` feeds the read-only Jurisdiction Overview. The Productivity dashboard (`ContributionDashboardPage`) shows the Targets tile and client service levels, the Quality tab shows client service levels, and `WorklistPage` passes SLA breaches to the table.

## Batch 611 (part F)

`MigrationJobsPage`: **Import legacy file** button (permission `config:migration-mappings:manage`), Simulated tag on imported jobs, and an all-records list in the job detail. Test: `MigrationJobsPage.test.tsx`.

- Batch 612 (part A): SynopticReportPage sidebar gains the read-only Vendor fields panel.

**Batch 618 (part A):** `AccessionPage/AccessionTechnicalFacilityField.tsx` (optional technical-component lab on the Accession screen, PS-336); `SynopticReportPage` sends the technical lab block on signed-out reports only.

**Batch 630 (PS-174):** `CytologyWorklistPage`: Record Positive / Negative open `ManualHpvResultModal` (required Result Source) and are permission-controlled; a waiting entry shows Approve / Reject.

**Batch 631:** `CytologyWorklistPage`: Recall needed rows show the Australia/NZ recall priority, target window and wording (`SelfCollectedRecallDetail`).

## Batch 638

Batch 638 (Oct 20, 2026): CSMS messages wait for the eligibility check; Belgian Dutch dictation option; colleague reassignment room prorated by logged hours; surgical demo patients in the patient index. See `src/i18n/README.md` and `docs/product/GUIDE_UPDATES.md`.

## Batch 639

Batch 639 (Oct 20, 2026): hotkey decisions answered. Print Current Cassette moves to Alt+Shift+O; Discard Unsaved Changes asks for confirmation. See `docs/product/HOTKEY_DECISIONS.md`.

## Batch 640

Batch 640 (Oct 20, 2026): self-collected HPV recall windows and wording are set per country (Australia, New Zealand) by the laboratory's administrator, from a dropdown. See `docs/architecture/HPV_RESULT_INBOUND.md` section 8.

## Batch 650 (650a)

Report page: the Report Draft's spoken commands now register (`SynopticReportPage/hooks/useReportDraftVoiceActions.ts`). See `SynopticReportPage/README.md`.



## Batch 651: AI answers checked in code
See `services/aiIntegration/aiSuggestionRules.ts`, `services/coding/aiCodeSuggestions.ts`, `orchestrator/narrativeProvenance.ts` and `docs/product/GUIDE_UPDATES.md` (Batch 651).

## Batch 652 — Specimen pipeline gaps

Worklist: Assignment Timeout sweep (`WorklistPage/hooks/`). Grossing screen: pool routing on Complete grossing. Report page: sign-out reconciles every frozen specimen. Accession: lockbox receipt linked to the new case.

## Batch 652 (defect fixes)

`contributionDashboardCalculations.ts`: `computePeerKpiAverages`, `selectPeerGroup`, `peerValuesByTile` give the My Contribution Overview tiles real peer averages (same role + shared facility, at least 3 peers, else "Not enough data"; hidden from people who may not see peer comparison). `ContributionDashboardPage.tsx` no longer holds fixed 109/18/76. `WorklistPage/ResourcesModal.tsx` shows http links as warnings. `Synoptic/Delegate/DelegateModal.tsx` takes several recipients for multi-recipient types.

## Batch 658 — `contributionDashboardCalculations.ts`: `peerGroupForComparison` is the one peer rule for the Overview and Productivity > Peer Comparison.

Batch 660: `benchContributionCalculations.ts` gained `dailyAccessioningBars`.

## Batch 669 — Margin Exception Review

`MarginExceptionReviewPage.tsx` now also shows the rule-check / audit notices after Resolve or Dismiss and a read-only "Resolved and dismissed" list under the pending list. Decisions live in `services/marginExtraction/reviewMarginException.ts`.

Batch 669: `EmbeddingStationPage`, `SlideDistributionStationPage` and `AddOnOrderPage` save through `services/workstationSave/` and show "Not saved" when a save fails (ws-8); Embedding also stops Confirm on a flagged discrepancy, can clear it, names the flagger and says whether the Tissue Discrepancy item was raised (ws-10, ws-11).

Batch 669: Alt+S "Apply STAT Flag" on the report page now applies STAT (toast, audited) instead of opening the Flag Manager (`Synoptic/useSynopticFlags.ts`, `SynopticReportPage/`).

## Batch 669 (ops, access, batch)
`OrSuiteDashboardPage.tsx`: Start/Stop demo is a `CapabilityButton` (`config:or-board-demo:run`), Stop demo removes the demo cases it created, a refused Start demo or failed removal and a dismissal whose event-log write failed each show a closable message on the board (`ps-orboard-error`, `role="alert"`). `OutboundQueuePage`: Dead-lettered tile removed. `BatchManagement/BatchDetailView.tsx`: rescanning a Matched item shows "Already matched". `CriticalAlertReferencePage`: viewed count and facility time zone.

## Batch 669f — Workstations (ws-2 to ws-6, ws-14, ws-19, ws-20)

`MicrotomyWorkstationPage`: decant slide comment and Reprint work, Print/Etch Next shows refusals and printer failures, Accept suggestion no longer adds duplicates, Remove and Reprint offer a quick Undo toast, Block exhausted needs `add-on:exception:flag`. `AddOnOrderPage`: Mark Block Retrieved and Flag Exception are permission-gated, exception notices with no ordering pathologist go to the Supervisor / Accessioning Desk, the primary pathologist shows as a name, a missing IHC panel stain gets a warning. `SlideDistributionStationPage`: the replacement label gets the configured layout.

## Batch 669 — molecular screens

`MolecularBatchPage/` (Control Rules view-only note and reasons; plate builder control-well panel, translated dispatch and clone messages) and `MolecularOrderQueuePage/` (translated outcome line). See their READMEs.

## Batch 669h (footer)

`Home.tsx`: the footer prints the copyright line and `SystemStatusIndicator`; the fixed "HIPAA Compliant" and "SYSTEMS OPERATIONAL" texts are gone. `noFixedComplianceClaims.guard.test.ts` keeps them out of every component.

- **Batch 669 (access-11):** `ExternalConsultViewPage` shows a masked patient (initials, birth year) unless the link was issued with the audited full-identity opt-in.
- **Batch 669 (access-11 follow-up):** `ConsultLinksAuditSection` shows, after a signed opinion, the views and hours left (3 views / 48 hours, `services/consultAccess/consultLinkLifetime.ts`) and has **Preview identity** for people who hold `case:consult-link:reveal-identity` (audited; `consultLinksAudit.css`). `ExternalConsultViewPage` shows the expiry banner (`externalConsultLifetime.css`). Dates of birth on the consult page are `DD-MMM-YYYY` (24-OCT-1980).
