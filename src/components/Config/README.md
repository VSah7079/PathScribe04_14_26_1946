**Batch 755a:** Synoptic Library: demonstration checklists show the "Demo wording" tag and offer no Duplicate or New Version; Build / Customise leaves them out (see `Protocols/`).

**Batch 754:** `Protocols/`: the Demonstration checklists card (ForMedrixAI support), and the demonstration checklists left out of customer builds.

**Batch 747:** `System/DemoDisplayTokensCard.tsx`: the Demo display tokens card on the Demo Reset tab.

**Batch 737:** `System/StainingRacksPanel.tsx` (Equipment: staining racks that take large-format slides).

**Batch 724:** the English text now says Microtome, not Microtomy (wording only; routes, keys and stored values unchanged). See `src/i18n/README.md`.

## Batch 604

`System/SimulatedMailOutboxSection`: every e-mail the demo would have sent, labelled Simulated (`simulated_mail`, under Integrations; opened with `config:vendor-integrations:manage`). `System/SupportAccessSection` gains Export PDF and the Simulated "Ticket closed" button.

## Batch 603

`System/DisplayTokenModal`: issue, re-issue and revoke the Display Token for a Display Profile or an OR Suite terminal; the token is shown once. Display Profile "Device Token" is now an asset note only.

# components/Config/

**Batch 646:** `help/` is the Help button (`AdminGuideHelpButton`) and the hook the System, Cytology, Staff, Report Templates and Validation Studies tabs use to say which section is open. It opens that screen's section of the Administrator Guide in a new tab.

The biggest, most central components folder — every admin/configuration
screen in PathScribe (analogous to `services/cases/` in scale). 170 files
(not counting READMEs) across 14 subfolders plus `__tests__/`.

*Corrected in the Batch 496 README audit (Oct 9, 2026): was "54 files across 11 subfolders".*

**Maintenance rule:** when a subfolder's *contents* change, update that
subfolder's own `README.md`. Only touch *this* file if a subfolder's
*purpose* changes, gets added, removed, split, or merged.

## Loose files directly in this folder

- **`configDirtyGuardContext.ts`** — **New (PS-128, Sep 2026).** A small,
  opt-in React Context bridging a Config tab's own real local "unsaved
  draft" state up to `pages/ConfigurationPage.tsx`'s own tab-switch/
  voice-nav/search navigation, which previously had no way to see it and
  would silently discard it. One `setDirty(boolean)` — deliberately not a
  per-tab-id registry, since `ConfigurationPage.tsx` only ever mounts one
  tab at a time. First real consumer: `Macros/MacroPanel.tsx`. See
  `pages/README.md`'s own `ConfigurationPage.tsx` entry for the full
  account, including which other real `isDirty` producers in this folder
  (`Templates/TemplateRenderer.tsx`, `Protocols/SynopticEditor.tsx`) were
  investigated and ruled out as not applicable — both are separate,
  standalone routes, never mounted inside `ConfigurationPage.tsx`'s own
  tab system.

## Folder index

| Folder | What it is | Status |
|---|---|---|
| [AI/](./AI/README.md) | Provider selection, model config, AI Behavior tab | ✅ Reviewed |
| [Templates/](./Templates/README.md) | The protocol lifecycle reviewer (`TemplateRenderer.tsx`); the review queue list is in Protocols/ | ✅ Reviewed — known bug since fixed |
| [NarrativeTemplates/](./NarrativeTemplates/README.md) | AI narrative section config (data only — tab UI deleted) | ✅ Reviewed — dead tab confirmed & removed |
| [Actions/](./Actions/README.md) | Voice/shortcut action registry editor | ✅ Reviewed |
| [Macros/](./Macros/README.md) | Text-expansion macro editor | ✅ Reviewed — 1 minor drift risk |
| [Models/](./Models/README.md) | This organisation's adopted AI models (global catalog + per-tenant adoption, PS-58) | ✅ Reviewed |
| [Search/](./Search/README.md) | Configuration page's own search bar | ✅ Reviewed |
| [Staff/](./Staff/README.md) | Staff directory + role/permission dictionary | ✅ Reviewed — 2 fixes applied |
| [Terminology/](./Terminology/README.md) | Terminology endpoint config + health monitor | ✅ Reviewed |
| [System/](./System/README.md) | ~100 source files — the System tab's 77 sections in six groups, plus the TAT and Demo tabs | ✅ Reviewed — 1 rename, 6 fixes applied |
| [Protocols/](./Protocols/README.md) | Protocol registry + review queue + the real template builder | ✅ Reviewed — see TemplateRenderer bug below |
| [Cytology/](./Cytology/README.md) | Configuration → Cytology tab (12 sections, `cytologySections.ts`) | — |
| [RegistryGoLive/](./RegistryGoLive/README.md) | Registry test-to-live connection panel, used by the screening and cancer registry screens | — |
| [Integrations/](./Integrations/README.md) | README only — the old Integrations tab, now System's Integrations group | — |

*Corrected in the Batch 496 README audit (Oct 9, 2026): added the Cytology, RegistryGoLive and Integrations folders; System was "30 files"; Templates/ no longer holds the queue list.*

## Known issues (cross-folder)

- **Macros/index.tsx hardcoded fonts** (Config/) — drift risk vs.
  `services/fonts/` (the real dictionary is `System/FontsSection.tsx`'s
  own data).
- ~~**Hardcoded `isSuperAdmin={true}`**~~ (System/) — closed in Batch 371:
  `GoverningBodiesSection` edits need `platform:governing-bodies:manage`,
  and `TerminologyServicesSection` gets the real `useIsSuperAdmin()` value.
  *(Corrected in the Batch 496 README audit.)*
- **~9 real service storage keys missing from `DemoResetTab.tsx`**
  (System/) — down from ~13 after this session's `CASE_KEYS` fix; the
  remaining gap was logged in `PRIORITY_FIXES.md` as its own item (that
  file was retired 2026-08-19; its open items moved to Jira PS-57 to PS-71
  — see `docs/ARCHIVE.md`).

## Jurisdiction-bound signing authority (Sep 2026, PS-327 / PS-341)

`System/TypeModal.tsx` and `System/ParticipationTypesSection.tsx` are
now the admin surface for who may sign out, and whose work needs a
countersign, per facility and per country. Each performing lab shows
the active rule and its source: the country default with its regulatory
basis, the platform default, or a facility override with who and when.
Admins get an explicit "Override default for this facility" control and
a revert. Every override change is stamped who/when/why and written to
the audit log.

Both screens render and dispatch only; the logic is in
`services/participationTypes/` (`facilityAuthorityEditor.ts`,
`saveParticipationType.ts`). Their inline styles now pass only CSS
custom properties, and their UI text, including jurisdiction names
(`jurisdictionNames.*`), is in all five locales. A guard test enforces
all of this: `services/participationTypes/standingRules.guard.test.ts`.
Detail: `System/README.md`.

This README's own text was also repaired: 46 corrupted characters
(em-dashes, arrows, and ✅ marks decoded as Windows code pages) were restored.

## Fixes applied this pass

- `Staff/RoleDictionary.tsx` — corrected stale header path comment
  (`Config/Users/` → `Config/Staff/`).
- **Orchestrator Mode — real bug, fixed.** Confirmed via full-repo grep
  that `NarrativeTemplatesTab` (old tab) was fully dead, but it was the
  only code in the entire app that ever wrote the orchestrator-mode
  localStorage key — so the toggle silently never worked, anywhere.
  Rebuilt as `Config/AI/orchestratorModeConfig.ts`: a real, persisted
  org-level default (toggleable from `OrchestratorConfigSection.tsx`) plus
  a per-facility override (`Facility.internalAiOrchestratorEnabled`,
  editable in Facility Configuration's AI & Performance tab, for NHS trusts /
  multi-site arrangements where not every performing lab wants AI
  narrative auto-draft on). See `Config/AI/README.md` and
  `services/facilities/README.md` for full detail. Deleted the confirmed-dead
  `NarrativeTemplatesTab`/`SectionList.tsx`/`SectionEditor.tsx`.
- **PRIORITY_FIXES.md #3 — CLOSED.** `CaseRoutingSection.tsx` renamed to
  `CasePoolAssignmentSection.tsx` (file + component + `System/index.tsx`
  import site), matching the already-completed `casePoolAssignmentService.ts`
  rename on the services/ side. Confirmed zero dangling references.
- `System/specimenTypes.ts` — removed 3 leftover editing-artifact comments,
  then **relocated to `services/specimenDictionary/specimenTypes.ts`**
  (caught by Pete: a services/ interface was importing its core type from
  inside components/ — inverted dependency, fixed across 10 consumers).
- **PRIORITY_FIXES.md #2 — CLOSED.** `TemplateRenderer.tsx` fully
  rewritten to consume real `EditorTemplate` content via `getTemplate()`
  instead of a hardcoded placeholder. Two now-fully-dead files deleted:
  `types/templateTypes.ts` (its own audit-event exports were already an
  orphaned duplicate of `types/AuditEvent.ts`) and
  `src/templates/mockDcisTemplate.ts` — `src/templates/` is now empty,
  resolving the stray-folder relocation question by elimination rather
  than a move. See `Templates/README.md` and `Protocols/README.md` for
  full detail.
- **Participation-types consolidation — real, active data-source
  disconnect, found and fixed.** `System/ParticipationTypesSection.tsx`
  and `Staff/RoleDictionary.tsx`'s Case Participation tab each
  independently maintained their own local list of participation types,
  completely disconnected from `services/participationTypes/
  mockParticipationTypeService.ts` — the real service
  `pages/SynopticReportPage/modals/CaseTeamModal.tsx` actually uses. The
  two lists had drifted to different type membership entirely, not just
  different metadata on the same types. Found by tracing a user-reported
  drag-and-drop bug in `CaseTeamModal` all the way back through the data
  layer, not by inspection. Both admin screens now read/write through the
  real service directly; the final 8-type canonical list was defined
  directly by Pete against real CLIA/CAP/ACGME clinical role
  requirements. `TypeModal.tsx`'s mojibake (previously assessed as
  cosmetic) turned out to include a separate instance actually rendering
  wrong in the live UI across all 9 admin screens sharing this modal —
  traced to root cause via raw bytes and fixed. Full detail in
  `Staff/README.md` and `System/README.md`.
- **Demo Reset critical fix.** Same investigation surfaced that
  `DemoResetTab.tsx`'s `CASE_KEYS` referenced `'ps_cases'` — a key
  `mockCaseService.ts` never actually wrote to (its real key is
  `'cases'`) — meaning Demo Reset had likely never correctly cleared
  primary case data at all. Found via a full, unrestricted
  `storageGet`/`storageSet` audit across `services/`, not limited to the
  `pathscribe_` prefix (the exact reason this and 8 other keys had gone
  undetected by an earlier, narrower pass).
- **Session Security — Phase 1 of the Inactivity Timeout & Draft Recovery
  feature, complete (full spec in `PRIORITY_FIXES.md`, since retired —
  see `docs/ARCHIVE.md`).** A real
  idle-detection timer, honest warning modal, and forced logout, replacing
  what turned out to be nothing at all — `AuthContext.tsx` had zero
  timeout logic anywhere, while `services/auditlog/mockAuditService.ts`
  had two fabricated demo entries claiming a "session expired after 60
  min inactivity" event had fired successfully in the past. Those
  entries were removed immediately, ahead of any technical or IP
  diligence review, independent of when the real feature shipped.
  Resolution is deliberately per-currently-open-case (an org-wide
  default, overridden by whichever client performs the work on the case
  on screen) rather than a multi-institution "strictest among all active
  permissions" model — matches PathScribe's actual single-case-focused
  UI, and avoids inventing a user-to-client permissions concept that
  doesn't exist anywhere in the data model. New:
  `System/SessionSecuritySection.tsx` (org-default admin screen),
  `services/session/` (resolution logic — restructured mid-session into
  a proper interface/mock/firestore-stub trio after an earlier single-file
  version was caught not matching this codebase's established convention;
  see `services/session/README.md`), `hooks/useIdleTimeout.ts`,
  `Common/SessionExpiryWarningModal.tsx`.
  `Facility.idleTimeoutMinutesOverride` added to `IFacilityService.ts` and
  wired into Facility Configuration's edit modal (AI & Performance tab).
  Modal copy deliberately
  reworded from the original spec to avoid claiming draft auto-save
  exists (at the time, that was Phase 2, not yet built) — same
  false-claim risk just removed from the audit log.

  **Phase 2 now also complete.** Real draft caching + recovery, wired
  into `SynopticReportPage.tsx` via new `services/drafts/` (matching
  the `I`/`mock`/`firestore`-stub convention exactly — an earlier draft
  was a single non-conforming file, caught and corrected before anything
  depended on it) and `hooks/useDraftCache.ts`. Caches the full case,
  not just synoptic answers — a full audit of this page's own
  `markDirty()` call sites found 18 distinct dirty-able things (Priority,
  Flags, Case comments, Specimens, Codes, etc.), meaning an earlier,
  narrower version would have silently missed most real editable
  content. Explicitly excludes the `patient` object (name/DOB/MRN) —
  HIPAA minimum-necessary reasoning plus a real data-integrity concern
  (patient demographics are read-only LIS/EHR master data; restoring a
  stale cached copy over freshly-fetched current data would be a
  correctness bug, not just a privacy one). Restore is local-only, no
  auto-persist — marks the case dirty via the existing mechanism so the
  pathologist's normal Save Draft review serves as the actual
  verification step. Full detail in `Common/README.md` and
  `ClientDictionary/README.md` (the per-client override field; that
  folder is now `components/FacilityDictionary/` — noted in the Batch 496
  README audit).

## Duplicate policy (Batch 317, PS-73)

Across Config/, Duplicate is offered only where `services/duplication/duplicatePolicy.ts` allows it (complex configuration, templates, multi-site variants). It is never offered for real people or flat lookups. A guard test enforces the policy against every component. Copy names are localized. Details: `System/README.md`, `Protocols/README.md`, `Staff/README.md`, and `services/duplication/README.md`.

## AI models: global catalog, per-tenant adoption (Batch 320, PS-58)

`Models/` lists the current organisation's adopted models. What an organisation decides about a model (status, its default, case counts) is its own adoption record, never the shared ForMedrixAI catalog entry. See [`services/models/`](../../services/models/README.md).

## Assist LIS Ingestion (Batches 322–323, PS-87)

System → Integrations → **Assist LIS Ingestion** configures how the external LIS's updates reach PathScribe in Assist mode: polling, HL7 v2 messages or JSON webhooks, all through one staging queue. It also sets which LIS statuses mean Gross Complete or Microscopic/Diagnosis Complete. See [`services/lisIngestion/`](../../services/lisIngestion/README.md) and [`services/assistPolling/`](../../services/assistPolling/README.md).

## Native dropdowns (Batch 323, PS-62)

Native `<select>` elements stay native; their open lists share one dark style app-wide. See `components/Common/README.md`.

## Printer profiles: PathScribe Agent port (Batch 346, PS-52)

System → Workstation & Hardware → **Printer Profiles** has an optional **Agent Port** for PathScribe Agent printers. Leave it empty unless IT moved the agent off 9100–9102; PathScribe tries it first. See `System/README.md`.

## Spelling language preference (Batch 338, PS-342)

Staff → edit records each pathologist's **Spelling language**; cases assigned to them are spell-checked in it unless the case sets its own. See `Staff/README.md`.

## Country Signing Rules (Batch 335, PS-341)

System → Clinical Lookups → **Country Signing Rules** is the platform-level editor for each participation type's per-country rules: local title, signing-authority flags, regulatory basis, and whether a country-scoped role is offered there. Only a platform administrator can edit. Every change needs a reason and is audited. See `System/README.md`.

## Code Import (Batch 334, PS-89)

System → Financial & Revenue Lookups → **Code Import (Bulk)** uploads a CSV of billing codes as one job for four-eyes approval, and lists every job with rollback. Pending Billing Rule Approvals decides a job as a whole. See `System/README.md`.

## Staff credentials editor (Batch 331, PS-327)

`Staff/StaffTab.tsx`'s edit form records jurisdiction-scoped credentials and appointments, and audits each change. Forensic autopsy sign-out requires such an appointment. See `Staff/README.md`.

## Template review rules enforced (Batch 328, PS-63)

Approve and Publish on the reviewer page (`Templates/TemplateRenderer.tsx`) are now checked by the service:
- approver roles;
- no self-approval unless the site allows it;
- the site's required number of reviewers;
- at least 80% SNOMED coverage for diagnostic templates.

The two settings are in `System/TemplateGovernanceSection.tsx`. The Admin Guide is in `Protocols/README.md` → "Who may approve and publish".

**Batch 329:** the template editor (`Protocols/SynopticEditor.tsx`) opens read-only for users without the Template Author role (Admin inherits it). Template Author, Template Approver and Lab Director are now built-in roles in Staff → Roles.

## Admin guide: synoptic templates (Batch 326, PS-63)

[`Protocols/README.md` → "Admin guide: building and publishing a synoptic template"](./Protocols/README.md#admin-guide-building-and-publishing-a-synoptic-template) is customer-facing Admin Guide material for the whole template lifecycle, written from an end-to-end walkthrough in the app. The same batch fixed a refresh-creates-a-second-copy bug in the editor.

## Batch 353

`System/TATConfigSection.tsx` now reads and saves TAT targets through `tatTargetService`, not browser storage. See [System/README.md](System/README.md).

## Batch 356

**New System section:** Instruments, under Workstation & Hardware (PS-326). Molecular batches pick their target instrument from it. See [System/README.md](System/README.md).

## Batch 358

System → Instruments became **System → Equipment**, one register for every device (hybrid: workflow settings stay on their own screens). See [System/README.md](System/README.md).

## Batch 359

**New System section: Grossing Hardware.** Its service existed, but it had no screen. Printer Profiles and Grossing Hardware now name their physical device from the equipment register, and the register shows which settings point at each device.

## Batch 360

The Equipment register gained maintenance and calibration schedules, a service status column, and a per-device service log (append-only, audited).

## Batch 361

The Equipment register shows a device with an open malfunction or past due in red.


## Batch 363 (PS-72): patient data tagged for screenshot redaction

`System/`: three sections tag patient identifiers for screenshot redaction; `CasePoolAssignmentSection` came off the mock-import baseline.


## Batch 364 (PS-349, PS-350): support references

`System/DemoResetTab.tsx` clears the new support references.

## Batch 367 (PS-74): no inline CSS

Subfolders converted their last inline styles to `pathscribe.css` classes (see each folder's README). Standing rule 1 now holds app-wide, checked by `services/styleRules/inlineCss.guard.test.ts`.

## Batch 388

System → Field Requirements: a Microtome workstation page (PS-359).

## Batch 397

Field Requirements lists the Intraop page (see `System/README.md`).

## Batch 399

System gains Intraoperative critical results (see `System/README.md`).

## Batch 406

`System/`: analysers get a deck layout in the equipment editor (`DeckLayoutEditor.tsx`).

## Batch 414

`Cytology/CytologyRegistrySettingsSection.tsx`: screening registry reporting, rebuilt on the registry engine (`services/screeningRegistry/`).
- It lists all twelve programmes for the enterprise and facility registries.
- For a chosen registry it shows:
  - its jurisdictions, national identifier, coding and wire format;
  - whether it's built from the programme's specification or configured by the lab;
  - the two hold settings;
  - a code-mapping table (category, field, registry code, registry text) with "N of M mapped" and whether results will be sent or held.
- Saves need `config:screening-registry:manage` (greyed without it) and are audited.
- It now saves to the stores sign-out reads; before, it saved where nothing read.
- It's off the deployment baseline.

## Batch 415

`Cytology/CytologyComplianceFeaturesSection.tsx` (new, Configuration → Cytology → Country-specific rules):
- Sets the CLIA workload cap and CAP 5-year lookback to Automatic, On or Off, for the enterprise and per facility.
- Saves need `config:cytology-compliance:manage` and are audited.

## Batch 419

Cytology → Registry Reporting: each registry's configuration has "Send results to": the programme's test system (default) or its live register. The hold-for-identifier checkbox now says "unless the patient has a verified <identifier>" (it has checked the national identifier since Batch 417; the wording still said MRN).

## Batch 422

System → Cancer Registry Reporting: thirteen registries, test/live, the opt-out rule, permission-checked saves.

## Batch 423

`RegistryGoLive/`: the registry test-to-live gate, used by the screening and cancer registry settings screens.

## Batch 424

`RegistryGoLive/` is now the registry connection panel. It covers the validation and production instances, the synthetic test suite, the validation record and the local overlay.

## Batch 425

System → Template Review now needs `config:template-governance:manage` to change its settings.

## Batch 426

The template editor (`Protocols/`) tags fields for staging and blocks, gives numeric fields a unit, and records the staging edition.

## Batch 428: Configuration permissions

Every Configuration section now checks its own capability in its service (84 of them, one per section, Pete's choice; `docs/architecture/AUTHORIZATION_API.md`). Before, anyone who could open Configuration could change any section.
- `ConfigRefusalBanner.tsx` (new): when a change is refused, names the missing permission and where an administrator grants it. Shown on the Configuration page, Template Assembly and the Part Builder.
- **Deleted** (unused copies): `Integrations/CrosswalkSection.tsx` and its `.DELETED.txt` note, `Templates/AdminTemplateList.tsx`, `System/SpecimenCategoriesSection.tsx`, `System/PatientMatchReviewSection.tsx`. Listed in the zip's `DELETED_FILES.txt`.
- Screens don't grey out controls the person can't use yet; a refused change shows the banner and saves nothing.

## Batch 429: view-only sections, equipment log for the bench

- `ConfigSectionGate.tsx` (new): shows a section view only to someone without its capability. A note names the permission; action buttons and checkboxes are greyed and do nothing; tabs, sub-tabs, search, filters and closing a dialog still work (buttons whose class contains tab, close or search, or marked `data-config-nav`). The rules are in `services/screens/configSectionAccess.ts`. Wrapped around each System and Cytology section, the AI, Actions, TAT, Report Templates, Validation and Synoptic Library tabs, the deployment voice switch and the FPPE and competency panels.
- Sections that grey their own controls (Staff roles, Support access, Field requirements, registries, governing bodies, intraop critical results, Template review settings, Demo Reset) and the personal ones (Macros) aren't wrapped.
- Some selects save as soon as they change; in a view-only section they stay usable, and the service refuses the change (the refusal banner shows).

## Batch 430: personal settings per person; view-only fields

`ConfigSectionGate.tsx` also stops changes to fields other than search and filters in a view-only section (Batch 429's gap: a dropdown that saves as soon as it changes). 77 search and filter fields are marked `data-config-nav` so they keep working; other fields are dimmed.

## Batch 431

The Configuration search covers every tab and section (see `Search/README.md`); System and Cytology section lists are data files; Document Style has the lab's page size and margins.

## Batch 433

System → Session security has the biometric e-signature policy (`System/BiometricPolicyCard.tsx`).

## Batch 437 (PS-128): unsaved changes anywhere in Configuration

- `configDirtyGuardContext.ts`:
  - `useReportConfigDirty(dirty)`: inline forms report their exact state. 18 sections now do, besides Macros and Assist LIS polling.
  - `useConfigNavigationGuard()`: the System and Cytology section lists, the System group tabs, the Protocols list and the Staff sub-tabs ask before leaving unsaved changes.
- Editor dialogs report nothing themselves: the page notices edits in any open dialog (`hooks/useConfigEditTracking.ts`).
- Filters and search boxes are marked `data-dirty-ignore` (70 of them), so using one isn't an unsaved change.
- See `services/configDirty/README.md`.

## Batch 438

System → Revision Reasons (PS-146). Dialogs with edits ask before closing from their backdrop or Escape; the first keystroke in a dialog is no longer lost (a Batch 437 fault).

## Batch 439

System → Peer Review Before Sign-Out (PS-144).

## Batch 441

Role Dictionary: the Cytotechnologist role can't list a pathologist participation type. QA Configuration Center: the "after release only" CAPA switch. See `Staff/README.md` and `System/README.md`.

## Batch 442

System → Discordance Trend Policy (PS-147): each site sets when a discordance pattern is flagged.

## Batch 444

AI → AI Provider: the developer key field is gone (keys live only on the server). System → Scan Stations: translated.

## Batch 447

System → Feedback: the QA feedback button and recipients (replacing the `VITE_QA_*` build settings).

## Batch 450 — test evidence for Priority 1 and 2 tickets

`System/`: TAT and abnormal-trigger-rule actions moved to services (PS-38, PS-129).

## Batch 451 — screen-level test evidence for Priority 2 tickets

System and Staff sections: tests and logic moved to services (PS-48, PS-90, PS-155, PS-233, PS-355).

## Batch 452 — Closing the review gaps (PS-131, PS-105, PS-133/PS-323, PS-57), PS-156 correlation window, decant ↔ billing sync, Phase 1 fixes

Cytology: the Correlation window section (PS-156). System: Modifier Dictionary upload errors are shown.

## Batch 453 — The Batch 452 open items, and the native-speaker review register

- `System/`: new Biopsy-to-resection correlation section.
- `Cytology/`: the correlation-window screen is now a shared component.

## Batch 454 — Follow-up not received: report, alerts and clinician email

`System/`: new Follow-up tracking section.

## Batch 455 — Demo baseline: people, pools, cases and the reset

`System/DemoResetTab.tsx`: Full Reset only.

## Batch 461

System → **Organ maps**: colours and patterns of the anatomical maps by enterprise, jurisdiction and facility, and the binding of a lab's own synoptic questions (see `System/README.md`).

## Batch 463

Protocols: the Mohs stage map field type and PathScribe's Mohs template. System → Organ maps: Mohs bindings and preview.

## Batch 463b

Protocols: the Mohs question's "Default histology from" setting; review and publish refuse a broken source (Templates list too).

## Batch 464

System → Organ maps: the colorectal involved-margin rules and bindings. Protocols: registry field counts corrected.

## Batch 465

Organ maps: oral cavity margin rules and the neck dissection binding editor (`System/`); `HEAD_NECK` template category (`Protocols/`).

## Batch 466

Kidney margin rules; renal previews; Kidney Resection field count.

## Batch 466b

Map bindings: generic margin questions derived from the map. Synoptic Editor: count settings.

## Batch 466c

- Protocols → Synoptic Editor: "unless" and "or also when" visibility conditions, and the checked hand-entered total.
- System → Organ maps → Map bindings: an adenoma-at-margin option for the colorectal polyp. (Replaced in Batch 466d by margins per component.)

## Batch 466d

System → Organ maps → Map bindings binds margin questions per component (invasive carcinoma, precursor). Bindings saved earlier for polyp, breast or oral maps are held for review.

## Batch 467 — In-house molecular orders

Synoptic Editor: molecular result binding on choice questions. Stain Dictionary: in-house labs per molecular test.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
- **Batch 345:** `Staff/LinkedSignInAccounts.tsx`, a person's linked single-sign-on accounts in Staff → edit, with Unlink (audited). See `Staff/README.md`.

## Macros: administrators and Enterprise macros (Batch 349, PS-126)

`Macros/MacroPanel.tsx`: administrators open on an **All** tab that lists every macro grouped by type (Enterprise, then facilities, then each user's personal macros). Only administrators are offered **Enterprise (every facility)**; for anyone else an Enterprise macro, or another user's personal one, opens read only. The sidebar hint was nearly invisible (about 2.3:1 contrast) and is now readable. See `Macros/README.md`.

## Batch 369 (PS-355)

The Role Dictionary (`Staff/`) has a Capabilities tab, the enforced part of a role:
- capabilities are grouped;
- dependencies are prompted for;
- every change is audited.

The 189 entries formerly labelled Permissions are voice and keyboard commands and are now labelled Commands. See `Staff/README.md`.

## Batch 370 (PS-356)

Saving roles and staff, and the full demo reset, need capabilities. Before this, any signed-in user could change roles and staff role assignments. See `Staff/README.md` and `System/README.md`.

## Batch 371

Hospital administrators have no control over Superadmin, which is ForMedrixAI's. The platform-wide governing-bodies setting is ForMedrixAI's too. See `Staff/README.md` and `System/README.md`.

## Batch 372

System → Support Access: each hospital decides whether ForMedrixAI support may reach its data, approves each visit, and reviews and exports what support did. See `System/README.md`.

## Batch 376

System → Field Requirements: each organisation chooses which fields a page requires (PS-359). See `System/README.md`.

## Batch 379

System → Field Requirements: Grossing's "Grossing protocol attached" rule, the organisation's switch for requiring a protocol before grossing completes (PS-359). See `System/README.md`.

## Batch 380

System → Field Requirements: the Case report page (Add/Edit specimen, amendments and addenda, critical findings), PS-359. See `System/README.md`.

## Batch 381

System → Field Requirements: the Case report page's group 2 (holds, comments, delegation, biopsy arrays, block cancellation and restains), PS-359.

## Batch 382

System → Field Requirements: the Case report page's group 3, part 1 (frozen-final reconciliation, billing changes after sign-out), PS-359.

## Batch 383

System → Field Requirements: the Case report page's group 3 is finished with two groups, Autopsy forms and Sign-out gates (PS-359).

## Batch 384

System → Field Requirements: a Messaging page for the message drawer, reply box and Secure email window (PS-359).

## Batch 386

System → Field Requirements: a Cytology screening page (PS-359).

## Batch 390

System → Field Requirements: the Cytology page gains a Correction / addendum group (PS-340).

## Batch 403

- System → Field Requirements: an Add-On Orders page.
- Stain Dictionary: a molecular test lists its approved reference labs and its default lab.

## Batch 506 (PS-477)

Files here that imported a mock service directly now import it from `@/services` (see `services/deploymentReadiness/README.md`). No change in behaviour.

## Batch 511 (PS-478): full strict type-checking

See `System/README.md` and `Templates/README.md`.

## Batch 512

See `System/README.md`.

## Batch 513 (PS-269)

See `AI/`, `Macros/`, `Staff/` and `System/`.

## Batch 514 (PS-269)

`System/PhysiciansSection.tsx`: Korean name display and shared title keys (see `System/README.md`).

## Batch 515 (PS-124)

`System/FppeAssignmentsSection.tsx` moved to the QA supervision service.

## Batch 516

`System/`: QA review-field editor (PS-125); Case Flags "Restricts printing" (PS-283).

## Batch 519

`Protocols/`: the Synoptic Editor edits multi-answer and "unless" conditions (PS-493), free-text node counts (PS-494) and cytology narrative settings (PS-273).

## Batch 520

`System/DeliveryRulesSection.tsx`: delivery channels by role, with e-fax and file drop (PS-280).

## Batch 521

`System/DeliveryRulesSection.tsx`: automatic retry waits (PS-281).

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 528 (PS-359): Staff editor requirements

`Staff/StaffTab.tsx`: the editor's required fields come from Field Requirements (page Staff). `System/FieldRequirementsSection.tsx` lists the three new pages (Staff, Facility editor, Clinical history) with no change of its own.

## Batch 529 (PS-554)

`System/ClinicalMismatchRulesSection.tsx`: Configuration → System → Clinical Mismatch Rules.

## Batch 533

`Cytology/CytologyComplianceFeaturesSection.tsx`: the section is now "Country and laboratory rules", with a third setting, the signature for urgent cytology preliminary reports (Automatic: required everywhere; `cytologyComplianceSettingKey` words it).

## Batch 536

New: System → AI Instructions (`System/AiInstructionsSection.tsx`, PS-554) and AI Behavior → AI vendor policy (`AI/AiVendorPolicySection.tsx`, PS-558); separation of duties on role and staff saves.

## Batch 543

`Actions/ActionsTab.tsx`: the Action Registry export quotes every text cell with `csvQuoted` and neutralizes formula cells (finding F8). A label with a quote no longer breaks its row.

## Batch 544

`Staff/StaffTab.tsx`: the signature is an https link, not an uploaded image.

## Batch 547

Deployment settings here are read through `appEnv()` (`services/runtimeConfig/`): the deployment's `config.json` at start-up, else the build's `VITE_*` value (`docs/architecture/RUNTIME_CONFIG.md`).

## Batch 548

Loading text here now uses `components/Common/LoadingState.tsx`: nothing for 300 ms, a placeholder, then "still working" from 3 s.

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- `System/`: department logo and gross imaging vendor address must be https links; loading text through `LoadingState`.
- Loading text here now goes through `LoadingState` (`components/Common`): nothing for 300 ms, then the screen's own loading text, and "Still working…" from 3 s. Carried over from Batch 548; `services/connectivity/latency.guard.test.ts` now covers every loading text in the app.

## Batch 553 (PS-539 phase 2d: site agent printers in routing)

- Batch 553: System → Print routing rules and Site agents (see `System/README.md`). *(Batch 552's Site agents section is also noted there; this folder's note was missed in Batch 552.)*

## Batch 555 (PS-539 phase 2d: browser stand-ins for server jobs)

- Batch 555: `System/SupportAccessSection.tsx` (an approval past its time reads Expired).

## Batch 557 (PS-539 phase 2d: /api/config and hosting regions)

- Batch 557: `AI/HostingRegionsCard.tsx` (where the deployment keeps its data).

## Batch 568 (WCAG 2.1 AA)

- `Protocols/`: the terminology alerts' header and the upload drop zone hold no control inside another.

## Batch 574

- `Cytology/CytologyWorkloadCapSettingsSection.tsx`: "Screening day starts at" (from now on; audited through `services/cytology/saveScreeningDayStart.ts`).

## Batch 595

`System/CodeSystemsSection.tsx`: the Code Systems setting (code systems per jurisdiction, with start dates). See `System/README.md`.

- Batch 612 (part A): System gains Interface Dictionary (ForMedrixAI support only).

## Batch 652 (defect fixes)

`System/ExternalResourcesSection` now accepts https links only.

- Batch 682: AI settings follow the regulatory profile (mismatch rules note; unused confidence checkbox removed).

## Batch 727

System → Display Profiles: time limit X and the Stations view.

## Batch 728

System gains the Research Cases & Batch Purposes section.

## Batch 729

Display Profiles: the not-scanned time.

## Batch 730

Equipment: temperature range; Equipment Log: temperature checks.
