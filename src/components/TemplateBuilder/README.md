# components/TemplateBuilder/

The **Report Template Builder** — report *layout/assembly* (headers,
footers, body parts, page structure), a completely different system from
`components/Config/Protocols/`'s synoptic *data-capture* templates
(sections/fields a pathologist fills in). Both legitimately use the word
"template," which is a real naming-collision risk worth knowing about even
though the two systems don't actually conflict — see Notes.

**Pattern:** Two-layer architecture — `ReportPart` (atomic header/footer/
body building blocks, `services/reportParts/`) + `ReportTemplate`
(assembly manifest of ordered `AssemblySlot`s referencing parts,
`services/reportTemplates/`). `TemplateNode`-based canvas/inspector/
palette are shared, reused identically whether editing a Part or (via a
documented adapter) previewing an assembled Template.

## Files

- **`ReportTemplatesSection.tsx`** — Thin wrapper, pill sub-tab toggle
  (Templates / Parts / Routing). No issues.
- **`TemplateListTab.tsx`** — Report template list, wired to
  `mockReportTemplateService`. No issues.
- **`PartLibraryTab.tsx`** — Browse/create/edit/duplicate Report Parts.
  Correctly protects 14 built-in standard parts (`PROTECTED` set) from
  deletion. No issues. **Real addition ("Parts Library... should also
  be tied to a Performing Lab facility"), per direct guidance:** a real
  Performing Lab filter (All/Global/named lab) and a lab badge on every
  card, same Global/scoped convention as everywhere else in this app.
- **`PartBuilderPage.tsx`** — Full-screen single-Part editor. Own header
  correctly documents that `TemplateCanvas`/`TemplateInspector`/
  `TemplatePalette` are shared, unmodified, across Part-editing and
  Template-editing — they only care about `TemplateNode[]`. No issues.
  **Real addition:** a Performing Lab selector in the metadata panel,
  editing the new `ReportPart.performingLabFacilityId` field.
- **`TemplateCanvas.tsx`** (~745 lines) — The drag/drop node canvas, all 18
  node types. No issues found; not read line-by-line given its size and
  that nothing surfaced at the architecture level — worth a dedicated pass
  if it's touched for a feature change.
- **`TemplateInspector.tsx`** (~900 lines) — Right-panel property editor
  for all 18 node types. Same note as `TemplateCanvas.tsx` — no issues
  found, not exhaustively read.
- **`TemplatePalette.tsx`** — Drag source for new nodes. Own header
  documents real, tested WCAG AA contrast ratios for every color used —
  good practice, no issues.
- **`TemplateAssemblyPage.tsx`** (~950 lines) — The real Template editor:
  ordered `AssemblySlot`s, drag-to-reorder, page-zone validation
  (`validateAssembly`). **See Notes — the OldTemplate adapter, verified
  correct, not a bug.** **Real fix ("Parts Library... should also be
  tied to a Performing Lab facility"), per direct guidance:** confirmed
  directly that `ReportPart.performingLabFacilityId` (new field, added
  the same session) had zero effect here before this — the two real
  part-selection UIs on this page (`PartPicker` modal and the always-
  visible `PartsPanel` sidebar) are entirely separate from
  `PartLibraryTab.tsx`'s own filtering and previously ignored the field
  completely, meaning the tag existed but never actually constrained
  which parts an admin could assemble into a real template. A single
  `labFilter` state, lifted to the page's own top level (not local to
  either picker), is now shared by both, so browsing the sidebar and
  picking via "+ Add slot" always agree on the same lab context — no
  lab selected shows every part unfiltered, same "no filter" convention
  the Workstation & Hardware group-level selector already established;
  a specific lab shows that lab's own parts plus every Global one.
- **`TemplatePreviewPanel.tsx`** (~560 lines) — Word-style paginated
  preview, auto-pagination, sticky page-size preference. Consumes the
  adapter output from `TemplateAssemblyPage.tsx` — see Notes.
- **`RoutingRulesTab.tsx`** — Client override / physician preference /
  test-panel UI over `TemplateRoutingService`'s Pass 0→3 resolution order.
  Correctly cross-references `services/templates/templateService.ts`'s
  synoptic protocol list (not a mix-up between the two "template"
  systems) — Pass 1 of report-template resolution genuinely depends on
  which CAP/synoptic protocol is active. No issues. **Real addition
  (Report Template by facility, if none defined then Enterprise):** the
  Test panel now resolves the selected client's real Enterprise parent
  (`Facility.parentId`, same one-hop reasoning as the real production
  path in `TemplateRoutingService.resolveReportTemplateAsync()`)
  directly against the already-loaded `clients` list, so an admin
  testing "what template does Facility X get" sees the real Enterprise
  fallback exercised too, not just Pass 0's own direct lookup.

*Corrected in the Batch 496 README audit (Oct 9, 2026): line counts for the four large files updated.*

## Notes

- **Naming collision risk (architecture-level, not a bug):** "Template"
  means two different things depending on folder —
  `Config/Protocols/SynopticEditor.tsx`'s `EditorTemplate` (data-capture
  fields a pathologist fills in) vs. this folder's `ReportTemplate`
  (physical report layout/assembly). They're correctly kept in separate
  services (`services/templates/` vs `services/reportTemplates/`) and
  types (`types/templateTypes.ts` — now deleted — vs `types/reportPart.ts`),
  and `RoutingRulesTab.tsx` above shows a case where they're correctly,
  deliberately cross-referenced. Flagging only so future work doesn't
  assume "template" means the same thing in both places.
- **`OldTemplate` adapter — checked, genuinely correct, not a bug.**
  `TemplateAssemblyPage.tsx` and `TemplatePreviewPanel.tsx` both import
  `ReportTemplate as OldTemplate` from `types/template.ts` — a second,
  older `ReportTemplate` shape distinct from the current one in
  `types/reportPart.ts`. This looked, at first glance, exactly like the
  class of bug fixed elsewhere this session (an old parallel schema a
  renderer silently fell back to). It isn't: `TemplateAssemblyPage.tsx`
  builds a `syntheticTemplate: OldTemplate` by flattening all of the
  assembly's real, current resolved-part `nodes` into one array — the
  *content* is real and current, only the wrapper shape is old, because
  `TemplatePreviewPanel.tsx` was never migrated off the single-flat-node-
  list preview format. A legitimate, working adapter for one un-migrated
  consumer, not dead code or a content-loss bug. Worth migrating
  `TemplatePreviewPanel.tsx` to consume `AssemblySlot[]` directly someday
  to retire `types/template.ts`'s `ReportTemplate` export entirely, but
  nothing is broken today.

## Localized Duplicate names (Batch 317, PS-73)

`PartLibraryTab` and `TemplateListTab` now pass the copy's name to `clone()` from `t('common.copyOfName', { name })`. The services no longer fall back to an English `"(Copy)"`. "Use Standard Template" names its copy with `t('templateListTab.defaultCustomTemplateName')`, where it used to hard-code `'My Surgical Pathology Report'`.

`RoutingRulesTab`'s protocol pickers no longer offer **archived** synoptic protocols for new rules. A rule that already points at one still shows it. The non-published status beside a protocol's name is translated (`routingRulesTab.protocolWithStatus` + the lifecycle label); it used to show the raw English value, e.g. "(in_review)".

## Batch 367 (PS-74): no inline CSS

`TemplateAssemblyPage.tsx`, `TemplateCanvas.tsx`, `TemplateInspector.tsx`, `TemplatePalette.tsx`, `TemplatePreviewPanel.tsx`: the remaining inline styles moved into `pathscribe.css` classes. Per-instance values (sizes, positions, a colour) are passed as custom properties, and colours are derived with `color-mix()` from `--ps-hue` instead of hex strings built in JSX. The browser checks are listed in the Batch 367 changelog (`src/i18n/README.md`). The app-wide check is `services/styleRules/inlineCss.guard.test.ts`.

## Batch 368

`TemplateAssemblyPage.tsx` takes `reportTemplateService`, `reportPartService` and `onReportPartsChanged` from `@/services`, and is off the deployment baseline.

## Batch 428: Configuration permissions

Report templates and parts: editing needs `config:report-template:manage`, publishing `config:report-template:publish` (checked in their services). Template Assembly and the Part Builder show `ConfigRefusalBanner` when a change is refused.

## Batch 429: view-only sections, equipment log for the bench

The Report Templates tab is view only without the report-template capabilities; the part and template list filters stay usable.

## Batch 430: personal settings per person; view-only fields

Search and filter fields here are marked `data-config-nav`, so they keep working when the section is shown view only.

## Batch 431

The preview opens at the lab's page size and margins (Document Style). Changing them in the preview is for that preview only.

## Batch 437

Filter boxes are marked `data-dirty-ignore` (PS-128).

## Batch 449

`ReportTemplatesSection.tsx` opens the inner tab named in `?section=` (`templates`, `parts`, `routing`; the list is `TEMPLATE_SECTIONS`), so Configuration search lands on it.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
*When this folder's contents change meaningfully, update THIS file.*

## Batch 506 (PS-477)

Files here that imported a mock service directly now import it from `@/services` (see `services/deploymentReadiness/README.md`). No change in behaviour.

## Batch 513 (PS-269): the UI translation sweep is complete

Every visible string here now goes through `t()`, in all five languages, and `src/i18n/uiText.guard.test.ts` keeps it that way. `TemplateInspector`: "e.g." placeholders are translated; field paths stay literal. `TemplatePreviewPanel`: the sample department and DOB label are translated, and the date follows the user's locale (it was fixed to en-GB).

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

`TemplateInspector`: `Toggle` is a named switch; `Sel` takes `ariaLabel` (15 callers pass their visible label).

## Batch 548

Loading text here now uses `components/Common/LoadingState.tsx`: nothing for 300 ms, a placeholder, then "still working" from 3 s.

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- Loading text here now goes through `LoadingState` (`components/Common`): nothing for 300 ms, then the screen's own loading text, and "Still working…" from 3 s. Carried over from Batch 548; `services/connectivity/latency.guard.test.ts` now covers every loading text in the app.

## Batch 568 (WCAG 2.1 AA, 4.1.2)

- `TemplateCanvas.tsx`: a field's row holds buttons (show contents, remove), so it is no longer a button. Clicking it still selects the field; its name is the button (`aria-current` when selected), as wide as its text so the rest of the row still starts a drag. Keyboard focus inside a row shows Remove, as hover does; Remove is named with the field ("Remove Margin"); the show-contents button says whether it is open (`aria-expanded`).

## Batch 570

- `NodeCard` exported for its tests (`TemplateCanvas.nodeRow.test.tsx`: the name selects once, the row is no button, Remove and show-contents do only their own jobs).

- Batch 609 (#38): `TemplateAssemblyPage` shows a banner and disables Publish while a Final template has more than one Final Diagnosis field; `PartBuilderPage` warns when a saved part leaves a Final template with more than one. Test: `TemplateAssemblyPage.finalDiagnosis.test.tsx`.

## Batch 612 (part C)

Template Assembly: the template Style panel takes sizes in points (new templates are `fontUnits: 'pt'`); a template saved in pixels shows **Convert to points**. The label size box in the inspector is points.
