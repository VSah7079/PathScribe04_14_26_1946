# services/qualityAssurance/

Service-layer logic for the Quality Assurance module that must not
live in `components/` (a real layering rule — a service in `services/`
must never depend on a type defined in `components/`).

## Files

- **`qaScope.ts`** — `QaScope` (enterprise / organisation / client)
  and `caseMatchesScope()`. Describes the *referring* dimension —
  which client or organisation a case came from. Powers the existing
  `QaScopeSwitcher` used across several QA tabs (Intraop Linkage,
  Reconciliation, etc.).

- **`resolveJurisdictionRollup.ts`** — real, per the
  RFP-APLIS-2026-GLOBAL Enterprise Business Intelligence Rollup
  Dashboard gap. A genuinely different dimension from `qaScope.ts`
  above: not the referring source, but the real *performing-lab*
  jurisdiction a case was actually processed in — the dimension the
  RFP's own data-residency requirement depends on ("respecting local
  data-residency rules at the performing-lab tier while rolling up
  anonymized/aggregated metrics enterprise-wide").

  Confirmed directly before building this: the app already had every
  real building block needed, just not yet connected —
  `Facility.jurisdiction`, a real `isEnterprise`/`parentId` enterprise
  hierarchy (seeded across US/GB_EW/GB_SCT),
  `services/auth/resolveTenantFacility.ts` (resolves a case's own
  `originHospitalId` to its real, jurisdiction-bearing Enterprise
  Facility), and `pages/contributionDashboardCalculations.ts`'s own
  real `computeOrgWideTatPerformance` / `realWorkRvuForCase` /
  `wasAiAssisted` (all now exported for reuse here — previously
  private to that file).

  `resolveJurisdictionRollup()` groups cases by their own performing-
  lab jurisdiction FIRST, computes each jurisdiction's own aggregate
  operational/financial/diagnostic/TAT numbers using those same,
  already-tested functions, and only ever combines the resulting
  AGGREGATE rows into the enterprise-wide view (case-volume-weighted
  averages for rate metrics, plain sums for volume metrics) — raw,
  case-level data is never itself combined or exposed across a
  jurisdiction boundary. A case that can't be resolved to any known
  Enterprise Facility is honestly counted as `unresolvedCaseCount`,
  never silently dropped or misassigned to a default jurisdiction.

  Real UI consumer: `components/QualityAssurance/EnterpriseRollupTab.tsx`
  — a new, fifth QA pillar ("Enterprise Rollup"), since this
  genuinely cross-cutting view (operational + financial + diagnostic
  + TAT) didn't belong to any single existing pillar (Operations,
  Financials, CAPA, Cytology). Reuses this module's own established
  cross-tenant audit-logging and PHI-safe export conventions exactly.

  **Real, honest scope boundary**: this is the dashboard UI and the
  real, tested LOCAL AGGREGATION logic, built against this app's own
  existing, single-instance case/facility data as a stand-in for true
  multi-facility federation. Genuine, physically-separate per-facility
  data hosting across jurisdictions — where each performing lab's own
  raw data never leaves its own real, separate infrastructure at all
  — is real, separate backend work this app doesn't have, per the
  RFP's own "Backend need" note for this gap.

## qaExport.ts (Batch 369, PS-355)

`exportQaReport(capability, rows, filename, { authorization, deliver? })` is the one path for Quality Assurance CSV exports:
- it checks the report's own capability through `authorization.enforce` (audited, allowed or refused);
- it produces the file only when allowed.

Each of the 14 QA reports has its own `qa:<report>:export` capability. The tabs reach this through `components/QualityAssurance/qaReportUtils.exportQaReportRows(capability, rows, filename)`.

## Batch 370 (PS-356): facility scope

`exportQaReport` now requires a context. `qaScopeContext(scope)` maps the tab's scope to it:
- a client scope is that one facility;
- an organisation or enterprise scope, or no scope switcher, is all facilities.

Someone whose staff assignment is limited to some facilities can therefore export only a client scope within their facilities. Organisation scopes are refused rather than resolved to their facilities; that is the safe reading.

**Found, not fixed:** `caseMatchesScope`'s client branch matches `order.clientId`, which no seeded case has. Cases carry `order.facilityId`, so a client scope currently matches no cases.

## Batch 436 (PS-356)

**Fixed:** `qaScope.ts` matched a QA scope's client against `order.clientId`, a field no case has, so limiting a scope to a client showed no cases. It now matches the ordering facility (`order.facilityId`), falling back to `clientId`. Test: `qaScope.test.ts`.

## Batch 450 — test evidence for Priority 1 and 2 tickets (PS-282)

`exportQaReport` now records each export in the audit log as `DOCUMENT_EXPORTED` (document `qa-<report>`, filename, rows, facility), like every other export. Before, only the permission check was audited. Tested in `qaExport.test.ts`.

## Batch 544: single-facility QA exports (PS-539)

`qaScopeRows.ts` (new, pure) decides which rows of a QA report belong to the scope picked (Pete, Oct 13, 2026: one facility, not only "all facilities"):
- `inQaScope` / `scopeQaRows`: a row is placed by its own facility, else by its case's ordering facility (organisation: by the case only). A row whose facility can't be told is shown only enterprise-wide.
- `qaRowFacilityIds`: the facilities offered in the picker.
- `qaScopeFacilityOptions`: those facilities, always including the one in force.
- `defaultQaScope`: someone assigned to one facility opens on it.
- `qaExportFilename`.
- `scopeLabel` (moved from `components/QualityAssurance/qaReportUtils.ts`, re-exported there).

Used through `hooks/useQaCaseScope.ts`. The export's capability context is still `qaScopeContext(scope)` (`qaExport.ts`).

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- `qaExport.ts`: an organisation scope is still checked as "all facilities" (PS-610, open since Batch 544).
  - Checking it against the organisation's facilities was built, and then taken out after the independent review.
  - The reason: an organisation scope's rows are chosen by the case's origin hospital (the legacy map in `organisationService.ts`), but the facility tree places some of those cases' ordering facilities outside the organisation. A check against the tree could therefore pass an export holding rows from facilities the person isn't assigned to.
  - It waits for the Organisation-to-Facility migration, which gives one definition of an organisation's facilities.

## Batch 550 (PS-539 phase 2d: exports through the server)

- `runQaExport.ts` (new): a QA export through the app's export service, with its kind (from the capability), title, the tab's filters and the facility it is checked for. `components/QualityAssurance/qaReportUtils.ts` (`exportQaReportRows`, now with a `parameters` argument) uses it. Test: `runQaExport.test.ts`.
