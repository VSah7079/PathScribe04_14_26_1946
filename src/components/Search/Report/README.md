# components/Search/Report/

**Batch 613: the Search page's report view and answer filters.**

- **`CaseReportPanel.tsx`** (+ test): Group by, a sortable table (group, cases, share, median days to sign-out, total) with each group's cases on click, or a list of cases with chosen columns; save/load; CSV export through `runExport('search.case-report')`; the schedules panel. Case cells carry `data-phi`. Loading text through `LoadingState`.
- **`ColumnPicker.tsx`**: standard columns and synoptic answers (a protocol, then its questions), reorder, at most 24.
- **`ReportSchedulesPanel.tsx`**: list with next and last run (Simulated label), run now, pause, delete, and the new-schedule form (recipients as users). Schedules that came due run when the panel opens, for someone who may manage them.
- **`SynopticValueFilters.tsx`**: filter rows (protocol, question, condition, value). The conditions offered depend on the kind of question; a choice shows the protocol's own options.
- **`useCaseReport.ts`**: state and requests; a slower earlier request never overwrites a newer result.

**Recipient access choice.** `ReportSchedulesPanel` shows, inline under the recipients, any recipient who cannot see every case, with *narrow* (pre-selected) or *skip*, and summarises the last run's outcome per recipient. Tested in `ReportSchedulesPanel.test.tsx`.
