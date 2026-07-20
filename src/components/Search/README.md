# components/Search/

## Files

- **`CaseSearchBar.tsx`** (490 lines) — Global case search bar (NavBar),
  routes to `/case/${id}/synoptic` on match — confirmed as one of the real
  navigation call sites used when diagnosing the `PatientReportPage.tsx`
  deletion earlier this session. Wired to `caseRouter`, voice context,
  audit log, jurisdiction-aware identifier formats. No issues.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
