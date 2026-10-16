# components/ErrorBoundary/

Batch 502 (PS-472): a render error never blanks the app.

- **`ErrorBoundary.tsx`** — one class component, three placements:
  - `scope="app"`, `name="app"` — around `<App />` in `main.tsx`.
  - `scope="route"`, `name="route"` — `RouteErrorBoundary`, around the page `<Outlet />` in `AppShell`, so **every** page inside the app shell (Worklist, Accession, the report page, Search, Configuration and the rest) has its own boundary and the nav bar and drawers survive. It clears when the address changes.
  - `scope="panel"` — around the organ map (`panel:organ-map`) and the synoptic panel (`panel:synoptic`) on the report page, so a map crash doesn't take down the report.
- **Recovery screen** (translated, all five locales): "Try again" and "Back to worklist" (a full page load to `/worklist`). A panel shows a smaller notice with "Try again" only.
- **Unsaved work.** A boundary can't keep a crashed screen's in-memory state, so the screen never says nothing was lost. It says saved work is safe and that unsaved changes on the screen may have been lost. If the app-wide unsaved-changes flag (`DirtyStateContext`) was set at the moment of the crash, it says so firmly. The report page's own draft cache may offer a draft back when the page reopens.
- **Reporting.** The crash goes to `services/errorReporting` (scrubbed of patient data; console and the in-app Error Log), and the screen shows the report's reference (`ERR-XXXX-XXXX`) so support can find it. No patient identifier appears on the screen or in the report.
- **QA crash tests.** On a development build or a validation instance, `?ps-crash-test=<name>` makes that boundary's content throw: `app`, `route`, `panel:organ-map`, `panel:synoptic`.

Tests: `ErrorBoundary.test.tsx` — the recovery screen, the unsaved-changes wording, Try again, reset on a new address, panel isolation, and the default reporter.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
