# services/autopsy/dashboard

## Batch 610 (part A) — autopsy dashboards (#61, #89)

The three-tier autopsy dashboards (case, department, enterprise). PS-261 section 2.6.3 names them but its text is not in the repository, so the tiers are the ones the queue states.

- `autopsyDashboardTypes.ts`: record and summary shapes.
- `autopsyDashboardCalculations.ts`: period filter, evaluation (turnaround verdicts from `../resolveAutopsyTatStatus.ts`, consent, retention), KPIs (decided, within, percentage, open, overdue, median), groups by facility and jurisdiction, overdue list.
- `autopsyDashboardSeed.ts` and `buildAutopsyDashboardRecords.ts`: the real cases plus Simulated ones (`SIM-A` ids, "(Simulated)" facility names), so a demonstration site has enough volume. Simulated data is labelled Simulated on screen; nothing is written to the audit log.
- `autopsyDashboardView.ts`: what the page shows for the chosen tier, period, department and case.

Cause of death is a broad category. A live case has no structured cause yet (it is in the signed report text), so it counts as not recorded.
