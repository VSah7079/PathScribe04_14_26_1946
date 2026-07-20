# components/Contribution/

The "My Contribution" dashboard tabs — AI acceptance/override metrics,
productivity (case/RVU tracking), and quality (discordance/amendment/TAT
metrics).

**Pattern:** Each tab is a large, self-contained component with its own
charts (recharts) and date-range filtering.

## Files

- **`AIContributionTab.tsx`** (505 lines) — AI acceptance/override
  breakdown by workflow (synoptic/narrative). Own comment documents a real
  near-miss worth knowing about generally: it was migrated off a dead
  service after confirming zero real callers — except a case-sensitive
  grep had missed this file itself as the one real caller, caught before
  the migration broke it. Correctly imports `SpecimenEntry` from its new
  home (`services/specimenDictionary/specimenTypes.ts`, relocated earlier
  this session) — confirms that fix propagated cleanly. No issues.
- **`ProductivityTab.tsx`** (369 lines) — Case/RVU tracking chart.
  **NOT reviewed in depth** — uses an inline "Mock Data" block rather than
  a service; worth a closer look at whether that's deliberate (a
  self-contained demo chart) or should be wired to something real, next
  time this folder is touched.
- **`QualityTab.tsx`** (798 lines, the largest here) — Discordance/
  amendment/TAT metrics, wired to `mockActionRegistryService` for voice
  context. Not read line-by-line at this size; no issues surfaced at the
  architecture level.
- **`FlagRow.tsx`** — **MOVED HERE this pass** (was
  `components/Dashboards/FlagRow.tsx` — a folder that existed only for
  this file and `CaseMixTile.tsx`, both exclusively serving
  `ContributionDashboardPage.tsx`; "Dashboards," plural and generic, gave
  no signal which dashboard, when `Contribution/` already existed and
  already meant exactly that). Single quality-flag row for the Quality
  Flags panel. No issues.
- **`CaseMixTile.tsx`** — **MOVED HERE this pass**, same reasoning as
  `FlagRow.tsx` above. Case-mix breakdown tile (breast/GI/GU/derm/other).
  No issues.

## Notes

- `ProductivityTab.tsx`'s mock data block is the one open question in this
  folder — flagged above, not investigated further this pass.
- `FlagRow.tsx`/`CaseMixTile.tsx` were previously in their own
  `components/Dashboards/` folder — folded in here since both exclusively
  serve `ContributionDashboardPage.tsx`, same as everything else in this
  folder. `pages/WorklistPage/AmendedAddendaTriageTile.tsx` was checked as
  a possible fourth "Tile" candidate for consolidation and correctly
  ruled out — it's genuinely worklist-specific, not a contribution
  dashboard widget.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
*When this folder's contents change meaningfully, update THIS file.*
