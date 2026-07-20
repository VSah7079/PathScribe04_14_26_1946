# components/Config/

The biggest, most central components folder — every admin/configuration
screen in PathScribe (analogous to `services/cases/` in scale). 53 files
across 11 subfolders.

**Maintenance rule:** when a subfolder's *contents* change, update that
subfolder's own `README.md`. Only touch *this* file if a subfolder's
*purpose* changes, gets added, removed, split, or merged.

## Folder index

| Folder | What it is | Status |
|---|---|---|
| [AI/](./AI/README.md) | Provider selection, model config, AI Behavior tab | ✅ Reviewed |
| [Templates/](./Templates/README.md) | Protocol review queue + lifecycle reviewer | ✅ Reviewed — 1 known bug |
| [NarrativeTemplates/](./NarrativeTemplates/README.md) | AI narrative section config (data only — tab UI deleted) | ✅ Reviewed — dead tab confirmed & removed |
| [Actions/](./Actions/README.md) | Voice/shortcut action registry editor | ✅ Reviewed |
| [Macros/](./Macros/README.md) | Text-expansion macro editor | ✅ Reviewed — 1 minor drift risk |
| [Models/](./Models/README.md) | AI model performance/version comparison | ✅ Reviewed |
| [Search/](./Search/README.md) | Configuration page's own search bar | ✅ Reviewed |
| [Staff/](./Staff/README.md) | Staff directory + role/permission dictionary | ✅ Reviewed — 1 fix applied |
| [Terminology/](./Terminology/README.md) | Terminology endpoint config + health monitor | ✅ Reviewed |
| [System/](./System/README.md) | 28 files — client/case/routing/TAT/dictionary admin | ✅ Reviewed — 1 rename, 2 minor fixes |
| [Protocols/](./Protocols/README.md) | Protocol registry + review queue + the real template builder | ✅ Reviewed — see TemplateRenderer bug below |

## Known issues (cross-folder)

- **Macros/index.tsx hardcoded fonts** — drift risk vs. `services/fonts/`
  (the real dictionary is `System/FontsSection.tsx`'s own data).
- **Hardcoded `isSuperAdmin={true}`** (System/) — `GoverningBodiesSection`
  and `TerminologyServicesSection` are never called with a real,
  role-derived value. See `ACCESS_CONTROL_PLAN.md` (repo root) — planned,
  not blocking, revisit before first real customer deployment.
- **`TypeModal.tsx` mojibake comments** (System/) — cosmetic encoding
  artifact, not urgent.

## Fixes applied this pass

- `Staff/RoleDictionary.tsx` — corrected stale header path comment
  (`Config/Users/` → `Config/Staff/`).
- **Orchestrator Mode — real bug, fixed.** Confirmed via full-repo grep
  that `NarrativeTemplatesTab` (old tab) was fully dead, but it was the
  only code in the entire app that ever wrote the orchestrator-mode
  localStorage key — so the toggle silently never worked, anywhere.
  Rebuilt as `Config/AI/orchestratorModeConfig.ts`: a real, persisted
  org-level default (toggleable from `OrchestratorConfigSection.tsx`) plus
  a per-internal-client override (`Client.internalAiOrchestratorEnabled`,
  editable in the Client Dictionary's General tab, for NHS trusts /
  multi-site arrangements where not every performing lab wants AI
  narrative auto-draft on). See `Config/AI/README.md` and
  `services/clients/README.md` for full detail. Deleted the confirmed-dead
  `NarrativeTemplatesTab`/`SectionList.tsx`/`SectionEditor.tsx`.
- **PRIORITY_FIXES.md #3 — CLOSED.** `CaseRoutingSection.tsx` renamed to
  `CasePoolAssignmentSection.tsx` (file + component + `System/index.tsx`
  import site), matching the already-completed `casePoolAssignmentService.ts`
  rename on the services/ side. Confirmed zero dangling references.
- `System/specimenTypes.ts` — removed 3 leftover editing-artifact comments,
  then **relocated to `services/specimenDictionary/specimenTypes.ts`**
  (caught by Pete: a services/ interface was importing its core type from
  inside components/ — inverted dependency, fixed across 10 consumers).
- **PRIORITY_FIXES.md #2 — CLOSED.** `TemplateRenderer.tsx` fully
  rewritten to consume real `EditorTemplate` content via `getTemplate()`
  instead of a hardcoded placeholder. Two now-fully-dead files deleted:
  `types/templateTypes.ts` (its own audit-event exports were already an
  orphaned duplicate of `types/AuditEvent.ts`) and
  `src/templates/mockDcisTemplate.ts` — `src/templates/` is now empty,
  resolving the stray-folder relocation question by elimination rather
  than a move. See `Templates/README.md` and `Protocols/README.md` for
  full detail.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
