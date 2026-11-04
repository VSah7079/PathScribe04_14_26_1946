**Batch 759:** `CaseSearchBar.tsx`: a case opened from a typed (not scanned) search is flagged as a manual entry (audit trail and station log); a dictated search counts as typed.

# components/Search/

## Files

- **`CaseSearchBar.tsx`** (~560 lines) — Global case search bar (NavBar),
  opens a matched case through `useOpenCaseGuarded()` (`hooks/useOpenCase.ts`;
  since Batch 446 case pages are addressed by support reference, not
  `/case/${id}/synoptic` — corrected in the Batch 496 README audit) — confirmed as one of the real
  navigation call sites used when diagnosing the `PatientReportPage.tsx`
  deletion earlier this session. Wired to `caseRouter`, voice context,
  audit log, jurisdiction-aware identifier formats. No issues.

- **`ReassignCasePatientPanel.tsx`** — **NEW.** Real, per direct guidance
  (gap #6 — the proactive `moveCaseToPatient()` trigger, "an Outside/
  Contract Case's own referring EMR has no ADT feed to ever generate
  [ADT^A43] against, making `moveCaseToPatient()` functionally
  unreachable for those cases specifically"). Confirmed directly before
  building: `moveCaseToPatient()` was already reachable via
  `components/QualityAssurance/PatientManagementSection.tsx`'s own "Move
  a Case…" action — but that's a patient-first workflow (search for the
  source patient, see their cases, pick one). This is the genuinely
  complementary, case-first entry point: the realistic way someone
  actually discovers a misattributed case is the opposite — they're
  already looking at *that specific case* (via `SearchPage.tsx`) and
  notice the patient info looks wrong, not proactively searching a
  patient to check whether any of their cases are misattributed.

  Triggered from `SearchPage.tsx`'s own real, existing row-selection
  state (`selectedResultIndex`) — driven by real user click via
  `WorklistTable.tsx`'s own `onRowSelect`, not a new mechanism.
  Deliberately its own small, focused component rather than a change to
  `WorklistTable.tsx` itself, which is shared across multiple pages
  (`WorklistPage.tsx` at least) — adding a new per-row action there
  would have been a much broader, riskier change for something only
  relevant on this one page. Reuses `pages/AccessionPage/
  PatientLinkSearch.tsx` for the target-patient search (the same
  component now shared by `AccessionPage.tsx` and
  `PatientManagementSection.tsx`) and `mockPatientIndexService.
  moveCaseToPatient()` directly — the exact same, already-tested
  operation, no new service logic. `organisationId` for the target
  search is resolved from the real, looked-up source patient record,
  same pattern already established in `Config/System/
  OutboundMessagePreviewSection.tsx`. No new component-level test file
  — same established convention as every other thin UI-over-tested-
  service component this session.

  Real, self-inflicted mistake caught before it compiled: first wrote
  the reassignment-refresh call as `handleSearch()`, a function that
  doesn't exist on this page — the real name is `runSearch()`. Caught
  by grepping for the real function before assuming it existed, not by
  a failed build.

**Batch 349 (PS-101):** the header search popup showed raw status codes (`pending-review`) in near-invisible grey. Every case status now has a translated label (`caseSearchBar.status.*`) on a readable pill. The flag chips' inline colour styles became a `--ps-hue` custom property read by `.ps-casebar-dropdown__flag-chip`. Found and not fixed: the popup reads `case.flags`, but cases store flags as `caseFlags`, so flag chips never appear.


## Batch 613 (part A) — case search reporting

- **`Report/`**: the report view of a search.
  - `CaseReportPanel.tsx`: group-by, sortable group table (cases, share, median days to sign-out, total), a group's cases, list with chosen columns, save/load, CSV export (`search:case-report:export`).
  - `ColumnPicker.tsx`: choose and order columns, including synoptic answers (at most 24).
  - `ReportSchedulesPanel.tsx`: schedules for saved reports; last run shown labelled Simulated; changes need `search:report-schedule:manage`.
  - `SynopticValueFilters.tsx`: the Synoptic answers filter rows on the Search sidebar.
  - `useCaseReport.ts`: the report's state (latest request wins).

## Batch 363 (PS-72): patient data tagged for screenshot redaction

`CaseSearchBar.tsx`: the search box, the not-found and LIS-fetch messages, the results header and the matched-value hint are tagged (they show the typed or found accession).


## Batch 364 (PS-349, PS-350): support references

`CaseSearchBar.tsx`: typing a support reference (`SR-…`, any case, dashes optional) opens the case it names, or the Audit Log lookup for other kinds. The lookup is audited.

## Batch 367 (PS-74): no inline CSS

`ReassignCasePatientPanel.tsx`: the remaining inline styles moved into `pathscribe.css` classes. Per-instance values (sizes, positions, a colour) are passed as custom properties, and colours are derived with `color-mix()` from `--ps-hue` instead of hex strings built in JSX. The browser checks are listed in the Batch 367 changelog (`src/i18n/README.md`). The app-wide check is `services/styleRules/inlineCss.guard.test.ts`.

## Batch 368

`ReassignCasePatientPanel.tsx` takes `patientIndexService` from `@/services`, and is off the deployment baseline.

## Batch 417

The identifier search reads `patient.nationalIdentifiers[].value` as well as the MRN (and still the old `nhsNumber` / `chiNumber` / `ihiNumber` fields on records from before).

## Batch 436 (PS-101)

`CaseSearchBar.tsx` takes its result chips from `services/caseSearch/searchHitFlags.ts`, with the flag definitions from `flagService`. The Manchester demo orders (MFT26-8801/8803/8805) now name their ordering facility, so those cases resolve to a lab.

## Batch 437 (PS-128)

Opening a case from the header search goes through the unsaved-changes guard: with unsaved Configuration, Accession or report changes, the page asks first.

## Batch 446

Case pages are opened with `useOpenCase` (`hooks/useOpenCase.ts`), which addresses them by the case's support reference (`/case/SR-7K2Q-9MXD/synoptic`), never its accession number. See `services/caseAddresses/`.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*

## Batch 506 (PS-477)

Files here that imported a mock service directly now import it from `@/services` (see `services/deploymentReadiness/README.md`). No change in behaviour.

Batch 756: `CaseSearchBar` keeps a hit's match score and matched value in the hit; it used to write them onto the case object itself (the one the case service holds), and the report page then offered them back as unsaved changes ("__match Score", "__matched Value").
