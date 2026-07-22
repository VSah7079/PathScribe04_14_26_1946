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
| [AI/](./AI/README.md) | Provider selection, model config, AI Behavior tab | βœ… Reviewed |
| [Templates/](./Templates/README.md) | Protocol review queue + lifecycle reviewer | βœ… Reviewed β€” 1 known bug |
| [NarrativeTemplates/](./NarrativeTemplates/README.md) | AI narrative section config (data only β€” tab UI deleted) | βœ… Reviewed β€” dead tab confirmed & removed |
| [Actions/](./Actions/README.md) | Voice/shortcut action registry editor | βœ… Reviewed |
| [Macros/](./Macros/README.md) | Text-expansion macro editor | βœ… Reviewed β€” 1 minor drift risk |
| [Models/](./Models/README.md) | AI model performance/version comparison | βœ… Reviewed |
| [Search/](./Search/README.md) | Configuration page's own search bar | βœ… Reviewed |
| [Staff/](./Staff/README.md) | Staff directory + role/permission dictionary | βœ… Reviewed β€” 2 fixes applied |
| [Terminology/](./Terminology/README.md) | Terminology endpoint config + health monitor | βœ… Reviewed |
| [System/](./System/README.md) | 28 files β€” client/case/routing/TAT/dictionary admin | βœ… Reviewed β€” 1 rename, 5 fixes applied |
| [Protocols/](./Protocols/README.md) | Protocol registry + review queue + the real template builder | βœ… Reviewed β€” see TemplateRenderer bug below |

## Known issues (cross-folder)

- **Macros/index.tsx hardcoded fonts** β€” drift risk vs. `services/fonts/`
  (the real dictionary is `System/FontsSection.tsx`'s own data).
- **Hardcoded `isSuperAdmin={true}`** (System/) β€” `GoverningBodiesSection`
  and `TerminologyServicesSection` are never called with a real,
  role-derived value. See `ACCESS_CONTROL_PLAN.md` (repo root) β€” planned,
  not blocking, revisit before first real customer deployment.
- **~13 real service storage keys missing from `DemoResetTab.tsx`**
  (System/) β€” found via a full audit prompted by the participation-types
  fix below; includes `pathscribe_roles`, `pathscribe_users`, and others.
  Logged in `PRIORITY_FIXES.md` as its own item.

## Fixes applied this pass

- `Staff/RoleDictionary.tsx` β€” corrected stale header path comment
  (`Config/Users/` β†’ `Config/Staff/`).
- **Orchestrator Mode β€” real bug, fixed.** Confirmed via full-repo grep
  that `NarrativeTemplatesTab` (old tab) was fully dead, but it was the
  only code in the entire app that ever wrote the orchestrator-mode
  localStorage key β€” so the toggle silently never worked, anywhere.
  Rebuilt as `Config/AI/orchestratorModeConfig.ts`: a real, persisted
  org-level default (toggleable from `OrchestratorConfigSection.tsx`) plus
  a per-internal-client override (`Client.internalAiOrchestratorEnabled`,
  editable in the Client Dictionary's General tab, for NHS trusts /
  multi-site arrangements where not every performing lab wants AI
  narrative auto-draft on). See `Config/AI/README.md` and
  `services/clients/README.md` for full detail. Deleted the confirmed-dead
  `NarrativeTemplatesTab`/`SectionList.tsx`/`SectionEditor.tsx`.
- **PRIORITY_FIXES.md #3 β€” CLOSED.** `CaseRoutingSection.tsx` renamed to
  `CasePoolAssignmentSection.tsx` (file + component + `System/index.tsx`
  import site), matching the already-completed `casePoolAssignmentService.ts`
  rename on the services/ side. Confirmed zero dangling references.
- `System/specimenTypes.ts` β€” removed 3 leftover editing-artifact comments,
  then **relocated to `services/specimenDictionary/specimenTypes.ts`**
  (caught by Pete: a services/ interface was importing its core type from
  inside components/ β€” inverted dependency, fixed across 10 consumers).
- **PRIORITY_FIXES.md #2 β€” CLOSED.** `TemplateRenderer.tsx` fully
  rewritten to consume real `EditorTemplate` content via `getTemplate()`
  instead of a hardcoded placeholder. Two now-fully-dead files deleted:
  `types/templateTypes.ts` (its own audit-event exports were already an
  orphaned duplicate of `types/AuditEvent.ts`) and
  `src/templates/mockDcisTemplate.ts` β€” `src/templates/` is now empty,
  resolving the stray-folder relocation question by elimination rather
  than a move. See `Templates/README.md` and `Protocols/README.md` for
  full detail.
- **Participation-types consolidation β€” real, active data-source
  disconnect, found and fixed.** `System/ParticipationTypesSection.tsx`
  and `Staff/RoleDictionary.tsx`'s Case Participation tab each
  independently maintained their own local list of participation types,
  completely disconnected from `services/participationTypes/
  mockParticipationTypeService.ts` β€” the real service
  `pages/SynopticReportPage/modals/CaseTeamModal.tsx` actually uses. The
  two lists had drifted to different type membership entirely, not just
  different metadata on the same types. Found by tracing a user-reported
  drag-and-drop bug in `CaseTeamModal` all the way back through the data
  layer, not by inspection. Both admin screens now read/write through the
  real service directly; the final 8-type canonical list was defined
  directly by Pete against real CLIA/CAP/ACGME clinical role
  requirements. `TypeModal.tsx`'s mojibake (previously assessed as
  cosmetic/comments-only) turned out to include a separate, more serious
  instance actually rendering wrong in the live UI across all 9 admin
  screens sharing this modal β€” traced to root cause via raw bytes and
  fixed. Full detail in `Staff/README.md` and `System/README.md`.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
