# components/Synoptic/

**Renamed this pass** (was `components/synoptic/` — lowercase, the only
folder in all of `components/` that broke PascalCase convention; fixed
purely for consistency, name was otherwise accurate).

## Files

- **`SynopticSidebar.tsx`** — Thin wrapper applying the synoptic page's
  sidebar border/scroll behavior to the shared `Sidebar` component. Sole
  consumer: `pages/SynopticReportPage/SynopticReportPage.tsx`. Own
  comment notes the Computational insights section was moved elsewhere
  (Results tab) — accurate, not stale. No issues.

## Notes

- This is a 25-line wrapper used by exactly one page. Worth considering
  whether it belongs in `pages/SynopticReportPage/components/` instead of
  top-level `components/` at all, given it has no reuse beyond its one
  consumer — same category of question as `Common/InlineCommentThread.tsx`
  before that one got consolidated. Not moved this pass; casing fix only.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
