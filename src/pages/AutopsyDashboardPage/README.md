# pages/AutopsyDashboardPage

## Batch 610 — autopsy dashboards (#61, #89)

`AutopsyDashboardPage.tsx` at `/autopsy-dashboards`, reached from Home → Quality & Compliance (capability `screen:autopsy-dashboards:open`). Three tiers:

- **Case:** one autopsy against its PAD and FAD targets.
- **Department:** one facility, with the reports overdue now.
- **Enterprise:** every facility and jurisdiction side by side.

Every tier shows turnaround, consent, organ retention and cause of death (`AutopsyTierPanels.tsx`). The page only renders: the figures come from `services/autopsy/dashboard/` and `hooks/useAutopsyDashboard.ts`, and the turnaround verdicts from `services/autopsy/resolveAutopsyTatStatus.ts`, the same engine as the worklist chip.

Simulated cases are on by default so a demonstration site has enough volume to read a rate. They carry `SIM-A` ids, are labelled Simulated on screen, and one switch turns them off. A live case has no structured cause of death yet, so it counts as "not recorded". Case ids sit in `data-phi="accession"`.
