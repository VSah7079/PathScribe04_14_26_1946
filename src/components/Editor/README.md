# components/Editor/

The rich text editor (Tiptap-based) used throughout PathScribe for
narrative report content, plus `tiptapBridge/` (renamed from
`integration/` this pass — see Notes) — the bridge layer that lets the
Orchestrator Engine drive the editor programmatically (streaming AI
content into specific sections without corrupting user edits elsewhere).

**Pattern:** `PathScribeEditor.tsx` is the real Tiptap component;
`NarrativeEditor.tsx` is a thin props-forwarding wrapper; `tiptapBridge/`
is pure logic (no React) bridging the editor to the AI orchestrator.

## Files

- **`PathScribeEditor.tsx`** (1018 lines) — The real editor: full toolbar
  (formatting, tables, alignment, macros), macro hotkey extension,
  multi-instance shared toolbar support, user-configurable tab width.
  Exposes `PathScribeEditorHandle` via `forwardRef`. **FIXED this pass —
  see Notes.** Not read line-by-line at this size; no other issues
  surfaced at the architecture level.
- **`NarrativeEditor.tsx`** — Thin wrapper forwarding props/ref to
  `PathScribeEditor.tsx`. No issues.
- **`PathScribeEditorRef.ts`** — Defines `PathScribeEditorHandle`, the
  imperative ref interface (getEditor/insertAtPos/appendToken/setContent/
  clearContent/focus/isEditable/setEditable) that the Orchestrator Engine
  and `NarrativeEditor.tsx` use to drive the editor without going through
  React props. **This is now the single real source of truth for that
  interface — see Notes.**
- **`tiptapBridge/anchorMap.ts`** — Tracks each narrative section's
  position in the Tiptap document via `data-section-id` paragraph
  attributes, so content can be inserted/replaced at the right spot
  without corrupting unrelated user edits. No issues.
- **`tiptapBridge/aiContentMarkers.ts`** — Marks AI-generated vs.
  user-edited node ranges via node attributes (not marks/decorations,
  deliberately — survives undo/redo). No issues.
- **`tiptapBridge/insertAtAnchor.ts`** — Safe content insertion at
  section-specific positions, protects user-edited content from being
  overwritten. No issues.
- **`tiptapBridge/streamingWriter.ts`** — Bridges Orchestrator token
  streaming into the editor, one `StreamingSession` per section, supports
  cancellation mid-stream. Sole external consumer:
  `orchestrator/orchestratorEngine.ts`. No issues.

## Notes

- **FIXED this pass — real duplicate-type drift risk, not yet actually
  broken but exactly the class of bug that has bitten this codebase
  live elsewhere (see `services/cases/caseFilterUtils.ts`'s own comment
  citing prior examples).** `PathScribeEditor.tsx` used to declare its
  own separate `export interface PathScribeEditorHandle`, structurally
  identical to the one in `PathScribeEditorRef.ts` — but every external
  consumer (`NarrativeEditor.tsx`, `OrchestratorReportPanel.tsx`,
  `OrchestratorSectionEditor.tsx`) already imported the
  `PathScribeEditorRef.ts` version. Two independent declarations of the
  same shape, kept in sync only by manual discipline, with no compiler
  enforcement that they'd stay identical. Consolidated: `PathScribeEditor.tsx`
  now imports the type from `PathScribeEditorRef.ts` instead of
  re-declaring it. Zero consumer impact — confirmed via grep that nothing
  imported the now-removed declaration from `PathScribeEditor.tsx` itself.
- `PathScribeEditorRef.ts`'s "HOW TO ADD THIS" comment block reads like a
  pending implementation guide but the pattern is already fully
  implemented in `PathScribeEditor.tsx` — added a status note so it's
  clearly read as historical/reference documentation, not a to-do.
- **RENAMED this pass: `integration/` → `tiptapBridge/`.** Pete asked
  whether the folder was correctly placed, since its only external
  consumer is `orchestrator/orchestratorEngine.ts` (a top-level domain
  folder reaching into `components/`) — the same *shape* as the
  `specimenTypes.ts` inverted-dependency fix elsewhere this session.
  Checked and confirmed it's actually correctly placed, not the same
  problem: `specimenTypes.ts` was a plain, framework-agnostic data type
  with no reason to be under `components/`; these 4 files are
  fundamentally Tiptap/ProseMirror-specific (operate directly on a live
  `Editor` instance, use `Transaction`/`Decoration` internals) and can't
  be abstracted away from the editor library without a rewrite — they
  belong next to the component that owns Tiptap, regardless of who calls
  them. Same shape as `PathScribeEditorRef.ts` (not in this subfolder,
  but also consumed from outside — `OrchestratorReportPanel.tsx`,
  `OrchestratorSectionEditor.tsx`), so this is an established, intentional
  pattern here, not a one-off. The name `integration/` was genuinely
  ambiguous though — didn't signal "Tiptap-specific" to someone skimming
  folder names — so renamed to `tiptapBridge/` for clarity. All 4 internal
  files' self-documented path comments and the one external import
  (`orchestratorEngine.ts`) updated; confirmed zero dangling references
  via full-`src/` grep, plus a bundled esbuild resolution check.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
*When this folder's contents change meaningfully, update THIS file.*
