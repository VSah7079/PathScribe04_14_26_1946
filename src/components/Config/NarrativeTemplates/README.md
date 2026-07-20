# components/Config/NarrativeTemplates/

Static config for AI narrative report sections (which sections exist,
their AI generation instructions, field cardinality). **Data only** — the
tab UI that used to live here was confirmed dead and deleted (see below).

**Pattern:** Single config file, no live UI of its own — consumed by
`Config/AI/OrchestratorConfigSection.tsx` (the real, current tab) and
`orchestrator/orchestratorEngine.ts`.

## Files

- **`narrativeTemplateConfig.ts`** — 6 report sections (admin_header,
  gross_description, etc.), each with a per-section AI instruction string
  and field cardinality metadata. Still real, still live — no issues.

## Deleted this pass (July 2026) — confirmed dead via full-repo grep

- **`index.tsx`** (`NarrativeTemplatesTab`) — zero importers anywhere in
  `src/`. Its own header comment even predicted this: `Config/AI/OrchestratorConfigSection.tsx`
  states it "replaces the old 'Narrative Templates' top-level config tab."
- **`SectionList.tsx` / `SectionEditor.tsx`** — sole consumer was the dead
  tab above.

**Important nuance that almost got missed:** `index.tsx` wasn't *purely*
dead — it also exported `getOrchestratorMode()`/`ORCHESTRATOR_MODE_KEY`,
which 3 real pages imported. But the ONLY code that ever wrote that
localStorage key was `handleOrchestratorToggle()` inside the dead tab
component itself — so despite looking wired up, there was no live way for
anyone to actually toggle Orchestrator Mode. That logic has been rebuilt
properly, with a real toggle and a per-internal-client override, in
[`Config/AI/orchestratorModeConfig.ts`](../AI/orchestratorModeConfig.ts) —
see that file and [`Config/AI/README.md`](../AI/README.md) for the full
story. All 3 consuming pages (`HeaderBar.tsx`, `RightSynopticPanel.tsx`,
`ContributionDashboardPage.tsx`) were updated to import from there instead.

## Notes

- If this folder ever grows a real live UI again, reconsider whether it
  still deserves its own top-level Config tab or belongs folded into
  `Config/AI/` alongside `OrchestratorConfigSection.tsx`, which now owns
  the only real orchestrator-mode UI.

---
*See [components/Config/README.md](../README.md) for how this folder fits Config/.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master components/README.md or Config/README.md if this folder's overall PURPOSE changes.*
