# components/Config/Protocols/

The Synoptic Library — protocol/template lifecycle management (registry,
review queue, active library) and the full template builder. Tightly
coupled to `Config/Templates/` (the read-only reviewer) — see the Notes
section below for a real, now fully-diagnosed bug that spans both folders.

**Pattern:** `index.tsx` routes 3 list-view sections; `protocolShared.tsx`
is the shared metadata registry; `SynopticEditor.tsx` is the real content
builder.

## Files

- **`index.tsx`** — Sidebar orchestrator for 3 sections (Active/Review
  Queue/All), URL-aware so navigating back from `TemplateRenderer.tsx` or
  `SynopticEditor.tsx` lands on the right section. No issues.
- **`protocolShared.tsx`** (597 lines) — `PROTOCOL_REGISTRY`: the shared
  metadata/lifecycle registry (status, owner, review notes, `fields` as a
  **count**, not content) consumed across this folder and `Config/Templates/`.
  `protocolGroup()`/`isDiagnosticProtocol()` are well-reasoned derivation
  helpers with sensible defaults. `PROTOCOL_REGISTRY` correctly excludes
  the 19 real synoptic templates seeded directly into `editorStore` (see
  its own comment) and confirms the CAP/RCPath content-licensing cleanup
  removed registry entries entirely, not just disabled them. No issues —
  this file does exactly what it says.
- **`SynopticEditor.tsx`** (816 lines, the real template builder) — Add/
  reorder/delete sections and fields, 6 field types (dropdown/radio/
  checkboxes/numeric/text/longtext), per-field AND per-option SNOMED+ICD
  coding, preview modal. This is where `EditorTemplate`/`EditorSection`/
  `EditorField` — the actual rich content model — are defined. **See
  Notes — this is the other half of the TemplateRenderer bug.**
- **`ReviewQueueSection.tsx`** — Pre-publish lifecycle list
  (draft/in_review/needs_changes/approved). Routes to `TemplateRenderer.tsx`
  ("Open Reviewer") or `SynopticEditor.tsx` ("Open Editor"). No issues.
- **`AllProtocolsSection.tsx`** — Full library, filterable by status. No
  issues.
- **`ActiveProtocolsSection.tsx`** — Published protocols in the reporting
  workflow. "View Protocol" → `TemplateRenderer.tsx` (read-only), "New
  Version" → `SynopticEditor.tsx` (draft fork). No issues.
- **`TerminologyAlertBanner.tsx`** — SNOMED/ICD deprecation alerts inline
  in `SynopticEditor.tsx`, plus a compact `TerminologyAlertBadge` used in
  protocol cards elsewhere in this folder. No issues.

## Notes — TemplateRenderer bug, fully diagnosed and FIXED (July 2026)

Picking up from `Config/Templates/README.md`'s earlier, partial diagnosis:
it's not just "missing content" — **there are two structurally
incompatible schemas for template content in this codebase**, and
`TemplateRenderer.tsx` and `SynopticEditor.tsx` each use a different one:

| | `types/templateTypes.ts` (what `TemplateRenderer.tsx` renders) | `SynopticEditor.tsx` (what admins actually author) |
|---|---|---|
| Section content | `TemplateSection.questions: Question[]` | `EditorSection.fields: EditorField[]` |
| Item label | `Question.text` | `EditorField.label` |
| Item type | 2 values: `"choice" \| "text"` | 6 values: `dropdown/radio/checkboxes/numeric/text/longtext` |
| Options | `TemplateOption { id, label }` | `FieldOption { id, label, snomed, icd }` — coding lives per-option |
| Field-level coding | none | `snomed`/`icd` directly on `EditorField` |

`services/templates/templateService.ts` — the real backend both pages are
supposed to share — is correctly typed (`TemplateDetail.template:
EditorTemplate`) and its `getTemplate(id)` genuinely does return real,
admin-authored content from `editorStore` when it exists. **But its own
header comment claims `TemplateRenderer.tsx` is a consumer, and that's
stale — confirmed by direct grep: `TemplateRenderer.tsx` never calls
`getTemplate()` anywhere.** It only imports `transitionTemplate` from this
service. That's almost certainly *why* it was left hardcoded to
`mockDcisTemplate` in the first place — wiring `getTemplate()` in naively
would hand the renderer an `EditorTemplate`, and its rendering code is
built entirely around `Question`/`ChoiceQuestion`/`.text` — a real
TypeScript type mismatch, not a small prop-threading fix.

**Net effect for Pete:** any protocol actually authored or edited via
`SynopticEditor.tsx` — the real admin workflow — currently cannot be
correctly displayed via "View Protocol"/"Open Reviewer" at all. Every
protocol, regardless of `templateId`, still shows the same DCIS
placeholder content in `TemplateRenderer.tsx`.

**Resolved — option 1 chosen (rewrite the renderer to consume `EditorTemplate`
directly).** Full implementation detail in `../Templates/README.md`. Kept
the diagnosis above as-written since it's still the accurate before-state
and the reasoning for why option 1 was viable (real content already
existed in `editorStore` for 19 templates).

---
*See [components/Config/README.md](../README.md) for how this folder fits Config/.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master components/README.md or Config/README.md if this folder's overall PURPOSE changes.*
