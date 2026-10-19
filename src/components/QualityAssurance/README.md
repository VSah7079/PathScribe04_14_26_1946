# components/QualityAssurance/

QA/compliance aggregate reporting tabs, hosted inside `pages/QualityAssurancePage.tsx`
(renamed from `DeficienciesPage.tsx` — see that page's own README entry)
alongside its own deficiency-tracking tabs. Eight real, distinct reports at first (more since: the folder now holds about 20 tab, review and helper components) —
each measures a genuinely different thing, deliberately not merged into
one generic "QA dashboard" (see each file's own header for why it's
separate from its siblings). **This folder never had a README before
this session** — created now rather than left undocumented, following
this codebase's own stated convention of a README per real folder.

**Pattern:** Not the interface/mock/firestore triplet — these are report
views, not data services. Each tab fetches from the real service(s) it
reports on (`countersignService`, `intraoperativeService`,
`reconciliationService`, `fppeAssignmentService`, `auditService`,
`accessRequestService`) plus `caseRouter.getAll()` for case-level
context, and renders real charts/tables client-side.

## Files

- **`CountersignTurnaroundTab.tsx`** — Department-wide countersign
  turnaround (`countersignedAt - releasedAt`), real changed-field-count
  delta, real feedback text. Answers "how long does a resident's released
  case actually sit before an attending reviews it" — genuinely different
  from the Intraoperative Linkage tab's TAT and the Reconciliation tab's
  concordance rate.
- **`IntraopLinkageTab.tsx`** — Frozen-to-permanent merge tracking —
  pending vs. merged intraoperative entries, real merge-log correlation
  via the audit trail (`Intraop Entry Merged` events).
- **`ReconciliationTab.tsx`** — Frozen/permanent diagnostic concordance
  rate — discordance tracking distinct from the above two. **Real,
  current status (PS-113, Stage 4):** migrated to read from the new,
  generic `qaActivityRecordService` (filtered to the real Frozen vs
  Final activity type), not the old `reconciliationService` — every
  field access updated (`fieldValues.frozenCategory`/`finalCategory`,
  `isTeachingOnboardingCase`, `reviewerFeedback`), including the real
  export function and both render tables.
- **`FppeTrackingTab.tsx`** — Department-wide FPPE/Credentialing Review
  oversight (Joint Commission new-hire credentialing verification, not
  ACGME trainee milestones — a genuinely different regulatory context
  from Countersign Turnaround). The one tab in this folder that does NOT
  fetch case data at all (only `fppeAssignmentService`/
  `subspecialtyService`) — not affected by the tenant-isolation fix
  below, since there's no case-level data in it to scope.
- **`DriftCorrectionTab.tsx`** — **NEW.** Post-finalization drift
  detection/correction — a finalized grossing report whose answers were
  edited after sign-out, and the automatic background correction that
  reverts it to draft. Reads from the same real audit log the case
  services already write into (`auditService.getAuditLogs({ search:
  'Drift' })`), filtered to the exact drift event names — no new backend,
  purely a read view over telemetry added in
  `pages/SynopticReportPage/SynopticReportPage.tsx`'s drift-correction
  effect. Surfaces genuinely unresolved cases (a deferred/failed
  correction never followed by a later successful one for the same case)
  as an explicit, actionable list — not just a historical event log.
- **`PatientMatchReviewSection.tsx`** — **NEW.** The real review queue
  for `services/patients/`'s MPI — every patient match the deterministic
  matcher couldn't confidently resolve either way (MRN matched but DOB
  didn't, or name+DOB matched under a different MRN), each shown
  alongside the actual candidate record(s) it might be the same person
  as. Two real actions, not placeholders: confirm as a genuinely new
  patient, or merge into an existing record — which actually repoints
  every case built under the provisional identity, not just relabels the
  review record. **First built in `Config/System/`, then moved here
  after a direct question about whether it belonged in Configuration at
  all** — it isn't a "configure once" settings screen; it's a recurring
  compliance work queue, the same shape as every other tab in this
  folder, not the shape of TAT Configuration or Session Security.
- ~~**`RetentionHoldsTab.tsx`**~~ — *not present: no such file or tab
  exists anywhere in the repo (checked in the Batch 496 README audit).
  Retention holds are shown and released per case (`RetentionHoldModal`,
  `CaseHoldModal` on the report page) and enforced by the disposal
  queue; see `services/retentionPolicy/README.md`.* The text below
  describes the tab as once planned: "I
  think we will need Management review of Cases On Hold." Before this,
  a real hold only became visible by opening that one specific case's
  own Synoptic Report page — no aggregate view existed for a lab
  director/manager to see every case currently on hold across the
  whole lab, how long each has been sitting, or to confirm a hold is
  still valid. Same real "read view over what already exists" posture
  as `DriftCorrectionTab.tsx` — no new storage; retention holds already
  live directly on `Case` (`types/case/RetentionHold.ts`), this just
  surfaces them in aggregate. "Reviewing" a hold here (`reviewedAt`/
  `reviewedByUserId`/`reviewedByUserName` on `RetentionHold` itself) is
  deliberately separate from releasing one — release stays exactly
  where it already lives (`RetentionHoldModal`, on the case itself);
  this tab links straight there via "Open Case" rather than duplicating
  that action.
- **`PatientManagementSection.tsx`** — **NEW.** Real, per direct
  guidance ("Since we have this PathScribe patient concept we need a
  mechanism to perform Merge, encounter record move or link. Those
  aren't accession activities. Perhaps a new section of Quality
  Assurance maybe Patient Management"). The second half of that
  request — the first half (fixing `mergeIntoExistingPatient()`/
  `moveCaseToPatient()` to also correctly repoint a patient's real
  Encounter records, not just Cases) is already real and done, see
  `services/patients/README.md`. Real, proactive search (reuses
  `mockPatientIndexService.searchPatients()` directly, same real
  cross-tenant scoping `PatientMatchReviewSection.tsx` already uses —
  a standard user searches only their own organisation, a
  cross-tenant-permitted admin searches every real, active one) lets a
  real user find any patient and act on them immediately — Merge,
  Link (either `relationshipType`), or Move a specific case — rather
  than depending on one of this app's three other, real but scattered
  entry points (`PatientMatchReviewSection.tsx`'s own review queue,
  system-flagged only; the inbound A24/A40 HL7 path, also
  system-triggered only; `AccessionPage.tsx`'s own "Check for Existing
  Patient" search, accessioning-time only, `same_person` only). This
  screen doesn't replace any of those three — it's the one, real,
  on-demand place for any real patient at any time. Reuses
  `pages/AccessionPage/PatientLinkSearch.tsx` for every real
  "search for a second/target patient" step across all three actions
  — never a fourth, separate implementation of the same real search.
  Every action gets a real, explicit `ConfirmModal` before executing,
  with action-specific language (Merge is flagged irreversible; Link
  and Move both explicitly state neither identity gets merged or
  retired). No new component-level test file — same established
  convention as `Config/System/DftExportPreviewSection.tsx`/
  `OutboundMessagePreviewSection.tsx`: a thin UI wrapper over
  already-tested service functions (every real action here is already
  covered by `services/patients/mockPatientIndexService.test.ts`'s own
  extensive suite) doesn't need a second, duplicate layer of coverage.
  **Real, known limitation, not silently glossed over**: the
  second/target patient search (via `PatientLinkSearch.tsx`) is scoped
  to the primary patient's own single organisation — that shared
  component takes one `organisationId`, not a list. A genuine
  cross-organisation merge/link (the same real person seen at two
  different facilities within the same lab enterprise) isn't
  reachable from this screen yet; extending `PatientLinkSearch.tsx`
  itself to support multiple organisations would affect its other real
  caller (`AccessionPage.tsx`) too, so it's flagged as real, separate,
  next-step work rather than changed here.
  **Real, per direct follow-up ("Molecular testing across siblings")**:
  the `family_relation` option's own label is now genuinely general —
  "e.g. newborn/mother, or siblings for cascade molecular testing" —
  not narrowly worded around only the one scenario that originally
  motivated the `relationshipType` split. See
  `components/PatientHistory/README.md`'s own entry for the matching
  real fix on the display side — "Related Patients" is now navigable,
  not just plain text, exactly the kind of real, useful capability the
  siblings scenario needs (quickly reaching a sibling's own prior
  molecular finding, not just seeing their name).
- **`AccessRequestResponseTab.tsx`** — real feature, per direct
  follow-up: "Do we Track the request to gain access? ... How long did
  the Admins take?" The department-wide equivalent of what "My
  Contribution" shows one admin at a time. Real turnaround time
  (`resolvedAt - requestedAt`) across all three real request types
  (Pediatric, Pool, Orchestration).
- **`QaScopeSwitcher.tsx`** — Shared scope-filter dropdown used by most
  tabs above (FppeTrackingTab has no case data to scope;
  PatientMatchReviewSection uses its own organisation picker instead,
  since MPI review is scoped by which org's patient index to look at,
  not by case-level client/org like the others). **Real fix this
  session, in two parts:**
  1. Extended `QaScope` with a genuine third `'organisation'` level,
     alongside the existing `'enterprise'` (no filter) and `'client'`
     (referring-provider) levels — these are real, different dimensions:
     a referring client and the lab organisation actually processing
     their case are not the same thing. Added specifically for the Drift
     Correction tab's admin-alert scoping, but benefits all four tabs
     that use this switcher, not just the new one.
  2. The dropdown used to list every organisation/client regardless of
     whether the viewer had any actual data behind them — an
     information-disclosure UX defect (not a data leak — selecting an
     unauthorized option just yielded an empty list — but confusing).
     Now takes an optional `visibleClientIds` prop; each tab derives it
     from its OWN already-scoped case fetch (the real, derivable answer
     to "which clients are relevant to this viewer," since `Client`
     carries no organisation field to filter on directly) and a
     cross-tenant-permitted viewer still sees the full, untruncated list.
- **Also here** (see the batch entries below): `CapaRecommendationsTab.tsx`,
  `CytologyQaTab.tsx` (+ `CytologyHistologyCorrelationPrintView.tsx`),
  `EnterpriseRollupTab.tsx`, `FollowUpTab.tsx`, `InspectionModeTab.tsx`,
  `QaDashboardTab.tsx` (cross-specialty QA dashboard, PS-108),
  `QaReviewCaptureForm.tsx` (the generic QA review form, PS-118),
  `QaTrendReviewsTab.tsx`, `SurgicalQaCaseBar.tsx`,
  `SurgicalQaReviewModal.tsx`, `QaReviewMessage.tsx`.

  *Corrected in the Batch 496 README audit (Oct 9, 2026): `RetentionHoldsTab.tsx` does not exist; the newer files are listed.*
- **`qaReportUtils.ts`** — Shared `QaScope` type, `caseMatchesScope()`,
  and `exportQaReportRows()` (the real CSV export every tab uses, via
  `utils/csv.ts` — PS-48 moved this off the `xlsx` package).
  `caseMatchesScope()` is where the organisation-level check above
  actually lives — resolves `Case.originHospitalId` through
  `getOrganisationByHospitalId()` (`services/organisation/`), the same
  real chain `services/auth/caseAccessControl.ts` uses as the tenant
  boundary everywhere else in this app, not a separate, second
  definition of "which org owns this case."

## Notes

- **Real tenant-isolation fix, this session — found via a design review,
  not assumed correct beforehand.** All four case-fetching tabs
  (everything above except FppeTrackingTab) were calling
  `bypassAccessControl: true` unconditionally on their `caseRouter.getAll()`
  fetch — real, unscoped multi-tenant PHI reaching the browser before any
  client-side filter ran (CWE-602, not hypothetical: DevTools on any
  standard user's session would show every organisation's case data).
  Fixed: the bypass is now gated behind a real, granular permission
  (`StaffUser.canAccessCrossTenantQa`, or `role: 'superadmin'`) via
  `services/auth/caseAccessControl.ts`'s new `canViewCrossTenantQaData()`
  check. A standard user's fetch is now properly scoped to their own
  organisation by default — the same mechanism already enforced on every
  other case-read path in the app, not a new, separate one invented for
  this folder. Cross-tenant access, when granted, is logged as its own
  distinct auditable event (`qa.cross_tenant_access_executed`) in every
  tab that fetches cases.
- **This is still a client-side-only control, same caveat
  `caseAccessControl.ts` itself documents.** It models the correct SHAPE
  of the access decision; it is not itself a security boundary against a
  modified client. Real server-side query enforcement is tracked as its
  own backend requirement — the API server applies it on every query
  (`docs/architecture/CASE_PRIVACY_MODEL.md`, PS-345; the backend-requirements
  document once cited here was never written, PS-40).
- **Two ID systems, genuinely different, both real:** `order.clientId`
  (the referring provider who sent a case to the lab) and
  `Case.originHospitalId` → `Organisation.id` (the lab organisation
  actually processing it) are not interchangeable, and `QaScopeSwitcher.tsx`
  now correctly offers both as separate scope levels rather than
  collapsing them into one. See `services/organisation/README.md` for
  the fuller history of how these two concepts ended up disconnected in
  the first place.

## Batch 353

**`EnterpriseRollupTab.tsx`:**
- It gets TAT targets from `tatTargetService`, and facilities, RVU tables and the audit log through `@/services`. It is off both deployment baselines.
- Jurisdiction names on screen now use `jurisdictionNames.*`. The CSV keeps English, per its export convention.


## Batch 363 (PS-72): patient data tagged for screenshot redaction

Case numbers and MRNs in these tables and pickers are tagged: `AccessRequestResponseTab`, `CytologyHistologyCorrelationPrintView`, `CytologyQaTab` (patient MRN columns), `DriftCorrectionTab`, `InspectionModeTab`, `PatientManagementSection` (the move-case picker).

## Batch 367 (PS-74): no inline CSS

`CytologyQaTab.tsx`: the remaining inline styles moved into `pathscribe.css` classes. Per-instance values (sizes, positions, a colour) are passed as custom properties, and colours are derived with `color-mix()` from `--ps-hue` instead of hex strings built in JSX. The browser checks are listed in the Batch 367 changelog (`src/i18n/README.md`). The app-wide check is `services/styleRules/inlineCss.guard.test.ts`.

## Batch 368

`CytologyQaTab.tsx` takes `cytologyQaReportService` from `@/services`, and is off the deployment baseline.

## Export capabilities (Batch 369, PS-355)

- **One capability per report, 14 in all.** `exportQaReportRows(capability, rows, filename)` now takes the report's capability and goes through `services/qualityAssurance/qaExport.ts`, which checks it (audited) before any file is produced.

  | Report | Where | Capability |
  |---|---|---|
  | Deficiencies (active and closed) | `QualityAssurancePage.tsx` | `qa:deficiencies:export` |
  | Management reviews | `QualityAssurancePage.tsx` | `qa:management-reviews:export` |
  | Billing deficiencies | `QualityAssurancePage.tsx` | `qa:billing-deficiencies:export` |
  | Frozen section linkage | `IntraopLinkageTab` | `qa:intraop-linkage:export` |
  | Discordance and reconciliation | `ReconciliationTab` | `qa:reconciliation:export` |
  | Countersign turnaround | `CountersignTurnaroundTab` | `qa:countersign-turnaround:export` |
  | Credentialing review (FPPE) | `FppeTrackingTab` | `qa:fppe-tracking:export` |
  | Post-final drift | `DriftCorrectionTab` | `qa:drift-correction:export` |
  | Patient match review | `PatientMatchReviewSection` | `qa:patient-match-review:export` |
  | Access requests | `AccessRequestResponseTab` | `qa:access-request-response:export` |
  | Cytology–histology correlation (CSV and print) | `CytologyQaTab` | `qa:cytology-histology-correlation:export` |
  | QA dashboard | `QaDashboardTab` | `qa:activity-dashboard:export` |
  | Inspection evidence binder | `InspectionModeTab` | `qa:inspection-evidence:export` (requires the dashboard's) |
  | Enterprise rollup | `EnterpriseRollupTab` | `qa:enterprise-rollup:export` |

- **Buttons:** every export button is a `CapabilityButton`, greyed out with the reason for anyone without the capability. The cytology–histology **Print** button checks the capability through `authorizationService.enforce` before opening the print view.
- **Deployment baseline:** `InspectionModeTab`, `IntraopLinkageTab`, `PatientMatchReviewSection`, `QaDashboardTab` and `ReconciliationTab` take their services from `@/services` and are off the baseline.
- **Found, not fixed:** this file's `qaReportUtils.ts` header says QA exports never include patient name, MRN or DOB. The cytology–histology correlation export includes a `Patient MRN` column. Now it at least needs its own capability and is audited, but either the column or the stated convention should change. That's Pete's call.

## Batch 370 (PS-356): facility scope on exports

`exportQaReportRows` now requires a context:
- tabs with a scope switcher pass `qaScopeContext(scope)`;
- the others pass `qaScopeContext()` (all facilities).

The same context goes on each export `CapabilityButton`. Someone limited to some facilities sees enterprise-wide exports greyed out, with "your facility assignment doesn't cover it", and can export a client scope within their facilities. `CytologyQaTab`'s histology table receives the context as a prop.

## Batch 396

- `SurgicalQaCaseBar.tsx`: on a case's report page, the surgical post-sign-out QA items waiting on it, with Record Review and Not Relevant. Returns to the queue when the last one is done.
- `SurgicalQaReviewModal.tsx`: the review form in a modal, shared with the queue.
- `QaReviewMessage.tsx`: why a review action didn't go through.

## Batch 425

The cytology QA tab's registry transmission audit adds three columns: Sent, Registry status and Response code. It also gets a **Download** button (`qa:registry-transmission-audit:export`), with no MRN in the file.

## Batch 432

Access Request Response: pending requests have a Deny button (reason required; the requester gets a message). Denying needs the permission that gives that access: pool `config:staff:edit`; pediatric and Orchestration `config:staff-access:assign`.

## Batch 436 (PS-40)

The citation of `backend-requirements-concurrency-security.md` (never written) now points at `docs/architecture/CASE_PRIVACY_MODEL.md`. The same correction is in `services/auth/` and `services/organisation/` READMEs.

## Batch 437

Printing the cytology–histology correlation view is audited (PS-282).

## Batch 438

- `CapaRecommendationsTab.tsx`: the QA lead's queue. Confirm needs an owner (and takes an optional note); Dismiss needs a reason. Both are `CapabilityButton`s on `qa:capa-recommendation:decide`. "Open the CAPA" goes to it in Operations.
- `DriftCorrectionTab.tsx`: audit times read as UTC (they were stored without a zone and shown shifted by the viewer's offset); the CSV column says `Timestamp (UTC)`.

## Batch 442 (PS-147)

`QaTrendReviewsTab.tsx` is Quality Assurance → CAPA → **Discordance Patterns**, the Lab Director's list:
- Opening it runs the evaluation.
- Each pattern can have a review started, then be concluded with a CAPA (a note is required) or dismissed (a reason is required).
- "Show every pathologist and specimen type" lists each group's numbers against its policy.
- The tile shows only to holders of `qa:pathologist-trend:view`; the service checks too.

## Batch 446

Case pages are opened with `useOpenCase` (`hooks/useOpenCase.ts`), which addresses them by the case's support reference (`/case/SR-7K2Q-9MXD/synoptic`), never its accession number. See `services/caseAddresses/`.

## Batch 450 — test evidence for Priority 1 and 2 tickets (PS-216, PS-217)

`CytologyQaTab.test.tsx`: the Post-Sign-Out Peer Review and Secondary Screening Audit tiles fetch and show their reports for the chosen scope.

## Batch 451 — screen-level test evidence for Priority 2 tickets

`CytologyQaTab.test.tsx` extended: every report tile, the new tables' figures, the aggregate card and the registry selector (PS-204). `InspectionModeTab`: the binder's CSV rows moved to `services/quality/resolveQaEvidenceBinder.ts` (`qaEvidenceBinderCsvRows`); one-click export (refused without `qa:inspection-evidence:export`) and drill-down tested (PS-121). Jurisdiction badges now use `t('jurisdictionNames.*')`.

## Batch 454 — Follow-up not received: report, alerts and clinician email

New `FollowUpTab.tsx`: Operations → Follow-up not received. It covers the filters, the summary tiles, the outcome dialog, the clinician email dialog (reviewed and edited before Send) and the CSV download. Accessions and the email fields are tagged `data-phi`. Test: `FollowUpTab.test.tsx`.

## Batch 459

`CytologyQaTab.tsx`: new "Primary vs Final Diagnosis" tile (🎯, report key `final-dx`). It loads `getPrimaryVsFinalDiagnosisReport` for the selected scope and shows it as an agreement report card (PS-152). `CytologyQaTab.test.tsx` covers the tile.

## Batch 483 — fix: the CYT-QA-03 vs CYT-QA-04 report asymmetry (PS-359 tracker follow-up)

CYT-QA-03 (5-Year Retrospective Lookback) had its trigger/outcome data for a while but, unlike CYT-QA-04 (Cyto-Histologic Correlation) right next to it, never got an aggregate report. New "5-Year Retrospective Lookback" tile (📆, report key `five-year-lookback`): loads `getFiveYearRetrospectiveLookbackReport` for the selected scope, shows a summary card (total flagged, pending, completion %, corrective-action rate) plus a row-per-specimen table. View-only, no export — the majority convention for this tab's tiles (only Histology Correlation and Registry Transmission Audit have export buttons). `CytologyQaTab.test.tsx`'s generic per-tile test covers it.

## Batch 504

The trend charts in `ReconciliationTab`, `CountersignTurnaroundTab`, `IntraopLinkageTab`, `AccessRequestResponseTab` and `QaDashboardTab` bucket by the facility's calendar month (`services/quality/facilityMonthlyTrend.ts`), not the viewing device's.

## Batch 610 (#78)

`AiDiscordanceTab.tsx`: AI versus pathologist discordance, stalled AI results and concordance by algorithm, with export under `qa:ai-discordance:export`.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
*When this folder's contents change meaningfully, update THIS file.*

## Batch 506 (PS-477)

Files here that imported a mock service directly now import it from `@/services` (see `services/deploymentReadiness/README.md`). No change in behaviour.

## Batch 511 (PS-478): full strict type-checking

Chart tooltips use recharts' own types. `AccessRequestResponseTab` makes a row clickable only when it names a case, through a small `openCaseHandler` helper. No visible change.

## Batch 513 (PS-269): the UI translation sweep is complete

Every visible string here now goes through `t()`, in all five languages, and `src/i18n/uiText.guard.test.ts` keeps it that way. `CytologyQaTab`: "pp" (percentage points) is translated. Bethesda and HPV category abbreviations, registry names and the report code stay as international terms.

## Batch 514 (PS-269)

`CytologyQaTab.tsx`: percentages and decimals use the user's number format (`utils/formatPercent.ts`). The HPV positivity "variance vs. mean" column spells the unit per language: "+2.3 pp", "+1,5 point de pourcentage", "+2,3 Prozentpunkte", "+2,3 procentpunten", "+2.3퍼센트포인트".

## Batch 515 (PS-124)

`FppeTrackingTab.tsx` reads `qaSupervisionAssignmentService` (FPPE activity) instead of the retired `fppeAssignmentService` (named in the notes above); progress, overdue and CSV rows come from `services/quality/fppeAssignmentForm.ts`. Dates use the user's format.

## Batch 518: Activities board (PS-120)

`QaActivityBoardTab.tsx` (+ test) is the Quality Assurance → Activities pillar.
- **Tiles:** one per QA activity (every active Standard and Custom activity type, then Countersign). Each shows pending, completed in the last 30 days, within-TAT percentage and discrepancy rate, or "—" where the activity can't measure it.
- **Table:** for the chosen activity, with columns from its own review fields.
- **Data:** the figures come from `services/quality/qaActivityBoard.ts`.

The specialised tabs under Operations (Discordance, Countersign turnaround, Credentialing review) are unchanged for now; whether to remove them is a decision for Pete, recorded on PS-526.

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 544: one facility or all (PS-539)

`QaScopeSwitcher` is added to these reports, through `hooks/useQaCaseScope.ts`:
- `FollowUpTab`;
- `FppeTrackingTab` (with `facilitiesOnly`: assignments have a facility but no case);
- `InspectionModeTab`;
- `QaDashboardTab`.

Their list, counts and export follow the scope; the export is checked for the one facility (`qaScopeContext`) and named for it. `QaScopeSwitcher` always offers the facility in force (`qaScopeFacilityOptions`). `qaReportUtils.scopeLabel` is now re-exported from `services/qualityAssurance/qaScopeRows.ts`. Still "all": `EnterpriseRollupTab` (it compares facilities), `PatientMatchReviewSection` (chosen by organisation).

## Batch 548

Loading text here now uses `components/Common/LoadingState.tsx`: nothing for 300 ms, a placeholder, then "still working" from 3 s.

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- Loading text here now goes through `LoadingState` (`components/Common`): nothing for 300 ms, then the screen's own loading text, and "Still working…" from 3 s. Carried over from Batch 548; `services/connectivity/latency.guard.test.ts` now covers every loading text in the app.

## Batch 550 (PS-539 phase 2d: exports through the server)

- Every QA export passes its tab's filters (`{ scope, ... }`) to `exportQaReportRows`, which goes through the export service (`services/qualityAssurance/runQaExport.ts`): built by the API server when there is one, in the browser in the demo.

## Batch 565 (WCAG 2.1 AA)

- Contrast of colours set in code raised from the old greys; filter tiles say which is selected (`aria-pressed`) where this folder has them.

## Batch 572

- `CytologyQaTab.tsx`: the workload report (CYT-QA-05) by the lab's day, with a "Recorded hours" column, whether the hours are signed off (or the sign-off is out of date), and a flag for corrections to check.

## Batch 574

- `CytologyQaTab.tsx`: the workload report shows a correction's reason and note (the note tagged `data-phi`), dates in the user's format.

## Batch 608

- `ProficiencyPanelCard.tsx`: the PT panel builder and the Simulated graded result, on the APAC proficiency report.
- `CytologyQaTab.tsx`: Assay (MOL-QA-01), colposcopy referrals and non-response (UK-QA-01), registry IDs, ThinPrep, SurePath and interval adherence (EU-QA-01).

Batch 613: `AccessRequestResponseTab.tsx` handles requests of type `patient_cases` (Approve / Decline through `services/patientCaseAccess`) and lists the active grants the signed-in person may revoke.

Batch 614: the cytology-histology correlation printout no longer carries the patient MRN (accession numbers only), the same rule as the download; the on-screen table keeps it, tagged `data-phi`.