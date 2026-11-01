# services/researchCases/

Batch 728 (Lab Workflow & Batch spec, Decision 4): the **research workaround**. Until unaccessioned, de-identified research items exist (a later phase, spec Decision 4b), a research specimen is accessioned as a case against a dummy research patient. The lab sets, in Configuration → System → Research Cases & Batch Purposes, how those cases are recognised and kept; this folder holds the rule every other part of the app applies.

## Files

- **`researchCaseRules.ts`** (pure, tested): the `ResearchCaseSettings` shape and its defaults (on; accession prefix `RES`; research patient MRN prefix `RSCH-`; financial class "Research - No Charge"; 365 days), `isResearchCase(case, settings)`, `withoutResearchCases`, `researchSettingsProblems` (what stops a save), `researchDisposalEligibleDate` (accessioning plus the retention days), and the prefix list helpers for the settings screen.
- **`researchCaseSettings.ts`**: where the settings are kept. A lab-wide setting in the lab settings store (`services/labSettings/labSettingsStore.ts`: browser storage in the demo, the API server in production, PS-345), read synchronously so every consumer applies the same rule without loading it. `saveResearchCaseSettings` checks `config:research-cases:manage` and the values before saving. `isResearchCaseNow` and `withoutResearchCasesNow` apply the current settings.
- **`researchCaseRules.test.ts`**.

## A research case is matched by

- its accession prefix (`accession.accessionPrefix`), or its full accession starting with one of the prefixes; or
- its patient's MRN starting with one of the research patient MRN prefixes.
Matching ignores capital letters. Switched off, nothing is a research case.

## Where the rule is applied

| Where | What happens | File |
|---|---|---|
| Clinical worklists (tiles and lists) | left out | `services/worklist/worklistTileCounts.ts` |
| Pathologist and bench contribution figures (TAT, volume, RVU, quality flags, client SLA) | left out | `pages/ContributionDashboardPage.tsx`, `pages/BenchContributionDashboardPage.tsx` (the case list is filtered where it is loaded) |
| Final, amended and cytology result messages to the EHR | not queued; an audit entry says why | `services/interfaceDispatch/resolveDispatchOrganisation.ts` |
| Preliminary result messages | not queued | `services/reports/dispatchPreliminaryCaseInstances.ts` |
| The version service's own result enqueue | not queued | `services/reports/mockReportVersionService.ts` |
| Report delivery by fax or file drop | nothing sent (`not_configured`) | `services/delivery/deliverReport.ts` |
| Charges to billing | refused at the queue (`RESEARCH_NO_CHARGE`) and at dispatch | `services/billing/mockOutboundChargeQueueService.ts`, `services/interfaceDispatch/dispatchCharge.ts` |
| Financial-class message | carries the no-charge financial class, no coverage | `services/interfaceDispatch/dispatchCharge.ts` |
| Disposal queue, disposal scan, disposal report | eligible the retention days after accessioning (holds still apply) | `services/retentionPolicy/resolveCaseDisposalDate.ts` |

## Not covered (honest scope)

- **The report screen does not yet say "research, not a clinical report".** A research case can still be signed out; nothing leaves PathScribe, but the screen looks like a clinical case. Planned.
- **There is no research worklist.** Research cases are found with Case Search.
- **The BI feed** is a server contract (`docs/architecture/BI_FEED_API.md`): the API server leaves research cases out of the clinical datasets. The browser holds no BI rows.
- **Quality figures outside the Contribution dashboards** (QA boards, registry submissions) do not yet apply the rule.
- **Unaccessioned research items** (spec Decision 4b) are a later phase.
