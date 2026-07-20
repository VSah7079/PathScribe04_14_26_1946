# components/

Master index for `src/components/`. One line per top-level folder,
cross-linked to that folder's own `README.md` for real detail.

**Maintenance rule:** when a folder's *contents* change, update that
folder's own `README.md`. Only touch *this* file if a folder's *purpose*
changes, or a folder is added/removed/split/merged.

## Folder index (22 folders, all reviewed)

| Folder | What it is |
|---|---|
| [Config/](./Config/README.md) | Every admin/configuration screen — 53 files across 11 subfolders, see its own index |
| [TemplateBuilder/](./TemplateBuilder/README.md) | Report *layout/assembly* builder — distinct from Config/Protocols/'s synoptic *data-capture* templates |
| [Editor/](./Editor/README.md) | Tiptap rich text editor + `tiptapBridge/` (AI-integration bridge) |
| [Voice/](./Voice/README.md) | Voice dictation settings/controls |
| [ClientDictionary/](./ClientDictionary/README.md) | Client Dictionary table + editor modal |
| [Contribution/](./Contribution/README.md) | My Contribution dashboard — 5 tabs/tiles, all serving `ContributionDashboardPage.tsx` |
| [Common/](./Common/README.md) + Button/ | Shared UI primitives: `ConfirmModal`, `LookupModal`, `InlineCommentThread`, `SuffixSelect` |
| [Worklist/](./Worklist/README.md) | Case worklist table |
| [Icons/](./Icons/README.md) | Icon components |
| [Flags/](./Flags/README.md) | Flag display components |
| [EnhancementRequest/](./EnhancementRequest/README.md) | Feature request submission |
| [ValidationStudies/](./ValidationStudies/README.md) | Parallel-run validation study management |
| [TemplateRequest/](./TemplateRequest/README.md) | New-synoptic-template request form |
| [Search/](./Search/README.md) | Global case search bar (NavBar) |
| [RequestReview/](./RequestReview/README.md) | Informal review request modal (not the same as Delegate) |
| [NavBar/](./NavBar/README.md) | Top nav bar |
| [InternalNotes/](./InternalNotes/README.md) | Internal notes drawer |
| [PatientHistory/](./PatientHistory/README.md) | Patient history modal (SynopticReportPage) |
| [Audit/](./Audit/README.md) | Centralized audit logging hook |
| [AppShell/](./AppShell/README.md) | Global layout shell + the real internal user directory |
| [SpecimenPicker/](./SpecimenPicker/README.md) | Specimen Dictionary lookup modal (AccessionPage) |
| [Synoptic/](./Synoptic/README.md) | Synoptic page sidebar wrapper |

## Naming/structure pass (July 2026)

Prompted by a direct question: does `Common/` being this thin, in a
codebase this size, actually make sense? It didn't — the deeper look
found several folders whose *names* didn't communicate their contents,
independent of whether the code itself was correct. Renamed/consolidated:

| Old | New | Why |
|---|---|---|
| `system/` (lowercase) | `ClientDictionary/` | Collided by capitalization only with `Config/System/` (a much bigger, unrelated folder); told you nothing about Client Dictionary being what's inside |
| `UI/` | folded into `Common/` | Single-file folder named as generically as possible; `ConfirmModal.tsx` is exactly the same category of thing as `Common/LookupModal.tsx` |
| `PatientReportPage/` | folded into `Common/` | The page that name referred to was deleted as dead code earlier this session; only `InlineCommentThread.tsx` (a genuinely shared component) was left behind in a folder named after something that no longer existed |
| `AccessionPage/` | `SpecimenPicker/` | Identical name to `pages/AccessionPage/`, a completely different folder — this one is just a picker component, not the page |
| `CasePanel/` | `PatientHistory/` | Gave no signal the folder contains the patient history modal specifically — no other "case panel" concept existed to distinguish it from |
| `synoptic/` (lowercase) | `Synoptic/` | The only folder in all of `components/` breaking PascalCase convention |
| `Dashboards/` | folded into `Contribution/` | Both files (`FlagRow.tsx`, `CaseMixTile.tsx`) exclusively serve `ContributionDashboardPage.tsx` — same audience as everything already in `Contribution/`; "Dashboards" (plural, generic) didn't say which dashboard |

**Kept as-is, deliberately** — flagged as overloaded terminology rather
than renamed, since each name is individually accurate for what it
contains:

- **"Search"** means three different things depending on folder —
  `components/Search/CaseSearchBar.tsx` (global case search),
  `Config/Search/ConfigSearchBar.tsx` (Configuration page's own search),
  and `pages/SearchPage.tsx` (the dedicated SNOMED/ICD/specimen lookup
  page). Each is correctly named for what it does; the overlap is only
  confusing if you forget which folder you're in.
- **"Template"** means genuinely different things in `Config/Protocols/`
  (data-capture) vs. `TemplateBuilder/` (report layout) vs.
  `TemplateRequest/` (a request form for a new one) — already documented
  in `TemplateBuilder/README.md`'s own Notes section.
- **"Review"** means different things in `RequestReview/` (ask a
  colleague to informally look at a case) vs. `Config/Protocols/ReviewQueueSection.tsx`
  (formal protocol lifecycle review) — different domains, not a naming
  mistake.

Every rename above: confirmed sole/all real consumers via full-`src/`
grep before moving, updated every import path and self-documented header
comment, verified zero dangling references afterward, and ran each moved
file through `esbuild` as a syntax/resolution sanity check (this
environment has no `tsconfig`/`node_modules` for a real `tsc` run — that
remains the first real check on your end).

## Known issues found across components/

- **Macros/index.tsx hardcoded fonts** (Config/) — drift risk vs.
  `services/fonts/`.
- **Hardcoded `isSuperAdmin={true}`** (Config/System/) — see
  `ACCESS_CONTROL_PLAN.md` at repo root. Planned, not blocking, revisit
  before first real customer deployment.
- **`TypeModal.tsx` mojibake comments** (Config/System/) — cosmetic
  encoding artifact, not urgent.
- **`TemplatePreviewPanel.tsx` still on the old node-list preview shape**
  (TemplateBuilder/) — works correctly today via a real adapter, not
  urgent.
- **Modal-overlay shell reimplemented ~14 times** instead of using
  `Common/LookupModal.tsx` or `Common/ConfirmModal.tsx` (both real,
  working, barely adopted) — see `Common/README.md`. Logged as
  PRIORITY_FIXES.md #8.

## Fixes applied across components/

See `Config/README.md`'s own fixes log for full detail on the Config/
subfolder work — summarized here for a single cross-folder view:

- `Staff/RoleDictionary.tsx`, `ClientDictionary/ClientTable.tsx` — stale
  header path comments fixed.
- **Orchestrator Mode** — real, previously-nonfunctional toggle rebuilt
  with org default + per-internal-client override
  (`Client.internalAiOrchestratorEnabled`). Dead `NarrativeTemplatesTab`
  cluster deleted.
- **`CaseRoutingSection.tsx` → `CasePoolAssignmentSection.tsx`** rename,
  matching the services/ side.
- **`specimenTypes.ts` relocated** from `components/Config/System/` to
  `services/specimenDictionary/` — was an inverted dependency. Caught by
  Pete.
- **`TemplateRenderer.tsx` fully rewritten** to consume real
  `EditorTemplate` content via `getTemplate()` instead of a hardcoded
  placeholder — 19 real seeded templates now display correctly, plus new
  SNOMED/ICD coding display. `types/templateTypes.ts` and
  `src/templates/mockDcisTemplate.ts` deleted as fully dead.
- **Orphaned third protocol-editing system deleted** — `src/protocols/`
  and `src/types/ProtocolDefinition.ts`, plus the unreachable route in
  `App.tsx`. Caught by Pete.
- **`PathScribeEditorHandle` duplicate declaration consolidated**
  (Editor/) — now a single source of truth in `PathScribeEditorRef.ts`.
- **`Editor/integration/` renamed to `Editor/tiptapBridge/`** for clarity.
- **`system/clients/desktop.ini` deleted** — Windows Explorer metadata
  file, not source code. Recommend adding `desktop.ini` to `.gitignore`.
- **`Common/Button/Button.test.tsx` deleted** — confirmed empty scaffold,
  no `Button.tsx` ever existed.
- **`PatientReportPage.tsx` deleted** — routed but genuinely unreachable;
  every real navigation goes to `/case/${id}/synoptic` instead. Confirmed
  with Pete. `mock/mockReports.ts` kept — still used by `FullReportPage.tsx`.
- `Audit/useAuditLog.ts` — removed a literally duplicated header comment.
- **`components/UI/ConfirmModal.tsx`** found with exactly 1 real consumer
  — key evidence for the modal-consolidation opportunity.
- **Full naming/structure pass** — see the table above. 7 folders
  renamed or consolidated; every move verified via grep + esbuild.
- **`RequestReviewModal.tsx`'s reviewer list rebuilt** on the real
  `services/users/mockUserService.ts` directory (filtered to active
  Pathologists), replacing a standalone hardcoded array that had drifted
  into real ID collisions with `AppShell.tsx`'s directory. Collision-free
  by construction now, not just patched around.

---
*Tracking docs (`PRIORITY_FIXES.md`, `ACCESS_CONTROL_PLAN.md`) live at the
repo root, not under `src/`.*
