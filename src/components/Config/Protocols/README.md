# components/Config/Protocols/

The Synoptic Library — protocol/template lifecycle management (registry,
review queue, active library) and the full template builder. Tightly
coupled to `Config/Templates/` (the read-only reviewer) — see the Notes
section below for a real, now fully-diagnosed bug that spans both folders.

**Pattern:** `index.tsx` routes 3 list-view sections; `protocolShared.tsx`
is the shared metadata registry; `SynopticEditor.tsx` is the real content
builder.

## Admin guide: building and publishing a synoptic template

*Written for lab administrators and template authors. Intended for the PathScribe Admin Guide (PS-63). Walked through end to end in the app, Sep 2026.*

Synoptic templates live in **Configuration → Synoptic Library**, which has three lists:
- **Active Protocols:** published and in use.
- **Review Queue:** waiting for review, sent back for changes, or approved and waiting to go live.
- **All Protocols:** everything, in every state.

### 1. Start a template
Click **Build / Customise** (available from any of the three lists), then choose one of:
- **Start from Scratch:** a blank template where you add every section, field, answer and code yourself.
- **Base it on an existing template:** search for one and click **Customise This Template →**. You get an independent copy named "*original name* (Copy)"; the original is never changed.

To change a template that is already in use, open it from **Active Protocols** and choose **New Version** instead. The new version goes through review on its own, and publishing it retires the old one automatically.

### 2. Build it in the editor
- **Template metadata:** give the template a unique name, and choose the source (CAP, RCPath, ICCR, RCPA or Custom), the anatomical category and the version.
- **Sections and fields:** add sections, then fields within each. For each field, set the field type (dropdown, checkboxes, text and so on), whether it's required, optional helper text, and the answer options.
- **Coding:** add SNOMED CT and ICD-10/11 codes at field level, or on each answer (the ⌥ button beside an answer).
- **Side panel:** the **Coding coverage** panel shows how much is coded. The **Readiness** checklist shows what's still missing: name, category, at least one section and field, and SNOMED coverage of 80% or more.
- **Preview** shows the template as a pathologist will see it.
- **Save Draft** keeps your work without sending it anywhere. Pathologists never see a draft. A draft you no longer want can be archived from All Protocols.

### 3. Submit it for review
Click **Submit for Review** and confirm. The template moves to the **Review Queue** as **In Review**.

### 4. Review it
In the Review Queue, click the template to open the **reviewer**. The reviewer shows the form as pathologists will use it. You can try out answers and add a comment on any field while you check it. The **Lifecycle transition** bar at the top has the actions:

| Action | What it does |
|---|---|
| **Needs Changes** | Sends it back to the author. A reason is required. The template shows in the queue as *Needs Changes*; clicking it opens the editor. The author makes the changes and clicks **Submit for Review** again. |
| **Approve** | Clinical sign-off. Once it has the site's required number of approvals (one by default), the template shows in the queue as *Approved*, ready to go live. Until then it stays *In Review* and the reviewer sees "Approval recorded (1 of 2)". |
| **Publish** | Makes it available in synoptic reporting for all pathologists immediately, and moves it to Active Protocols. If it is a New Version, the previous version is archived. |
| **Reset** | Returns it to Draft and clears the reviewer's trial answers. A new review round starts. |

The action names follow the template's source, so reviewers see the terms their governing body uses:
- CAP templates: **Accept** and **Release**.
- RCPath templates: **Ratify** and **Publish**.
- Custom and ICCR templates: **Approve** and **Publish**.

Only the actions that make sense for the current state are enabled. For example, a template must be approved before it can be published.

### Who may approve and publish (PS-63)
PathScribe enforces two rules when someone clicks Approve or Publish. If a rule isn't met, the confirm box explains why and nothing changes.

- **Drafting.** Creating, editing, submitting and deleting draft templates needs the permission `config:protocol:draft`. Out of the box the **Template Author** and **Admin** roles have it. Anyone else can open the editor read-only: a banner explains what's needed, and Save Draft / Submit for Review are disabled.
- **Independent review.** Approving needs `config:protocol:approve` and publishing `config:protocol:publish`; archiving or restoring needs `config:protocol:retire`. Out of the box the **Template Approver**, **Lab Director** and **Admin** roles have them. An administrator can grant them to another role in Staff → Roles → Capabilities. The person must not be one of the template's authors. Anyone who has saved the template counts as an author. The rule, from Pete's spec:

  **Can Publish = (user has an approver role) AND (self-approval allowed OR user is not an author)**

  An author who tries to approve their own template sees: *"This template requires independent review before publication. Please assign a reviewer or request sign-off from a Lab Director."*
- **SNOMED coverage.** A diagnostic template can't be published until at least **80%** of its fields have a SNOMED code. Procedural templates, such as grossing checklists, are exempt. To fix it, add the codes in the editor and submit the template again.

The site sets these in **Configuration → System → Administration & Compliance → Template Review**:

| Setting | Default | Behaviour |
|---|---|---|
| Allow Template Self-Approval | Disabled (Block) | Authors can't approve or publish templates they authored or edited. Turn it on only for solo practices, small sites or testing. |
| Required Reviewers | 1 independent reviewer | Up to 3. Each approval must come from a different approver who isn't an author, unless self-approval is on. |

*Corrected in the Batch 496 README audit (Oct 9, 2026): since Batch 428 these checks use the capabilities above (`services/templates/templatePublishingRules.ts`, seeded in `services/authorization/capabilitySeeds.ts`); the role list is the default, not a fixed rule.*

**Template Author**, **Template Approver** and **Lab Director** are built-in roles in Staff → Roles, alongside Admin. Assign them to staff there. They can be renamed to suit the site and keep working, because PathScribe identifies them by a fixed internal id. A renamed role is updated on every staff record that has it.

Changes to these settings are recorded in the audit log. Editing a template, sending it back for changes, resubmitting it or resetting it clears its approvals, so the new version is reviewed again.

### 5. After publishing
- The template is offered in synoptic reporting (**+ Add Synoptic Report** on a case).
- If it was built in answer to a pathologist's template request, that pathologist gets an in-app message saying it's ready.
- From Active Protocols you can:
  - **View** it;
  - make a **New Version**;
  - **Duplicate** it as the start of a different template;
  - **Export JSON**;
  - **Archive** it. It is then no longer offered for new reports; reports already written keep their content. An archived template can be restored as a draft and must be reviewed again before use.

## Files

- **`index.tsx`** — Sidebar orchestrator for 3 sections (Active/Review
  Queue/All), URL-aware so navigating back from `TemplateRenderer.tsx` or
  `SynopticEditor.tsx` lands on the right section. No issues.
- **`protocolShared.tsx`** (~800 lines) — `PROTOCOL_REGISTRY`: the shared
  metadata/lifecycle registry (status, owner, review notes, `fields` as a
  **count**, not content) consumed across this folder and `Config/Templates/`.
  `protocolGroup()`/`isDiagnosticProtocol()` are well-reasoned derivation
  helpers with sensible defaults.

- **`SynopticEditor.tsx`** (real content builder) — **extended (Sep 2026, PS-272), per direct guidance:** building the Autopsy Grossing Synoptic on this real apparatus (rather than inventing a third, separate template system, or building on Cytology's own distinct `types/cytology/SynopticTemplate.ts`) surfaced two real gaps, both fixed additively: (1) `VisibilityCondition` extended with an optional `answerIds?: string[]` for real, multi-value OR-logic — a real section can now be revealed for several different specimen-container values at once, not just one; every existing single-value `answerId` condition keeps working completely unchanged. (2) `FieldOption` gained an optional `lexiconTermKey?: string`, alongside — never replacing — its real, existing `snomed`/`icd` fields, so specialized diagnostic/clinical options can route through the Managed Pathology Lexicon the same way Cytology's own options already do. `isVisible()` is now exported with its own dedicated test file (7 tests) given how much real behavior now depends on its correctness. See PS-273 for the deliberately-deferred, separate follow-up: migrating Cytology's own 5 templates onto this same unified apparatus.
- **`data/templates/Autopsy/autopsy_gross_examination.json`** — the real Autopsy Grossing Synoptic itself, now fully authored: all 7 real sections (Part A's original 6 — External Examination, Head & Neck, Cardiovascular, Respiratory, Gastrointestinal & Hepatobiliary, Genitourinary & Endocrine — plus Musculoskeletal & Hematopoietic, added per direct guidance's own confirmed canonical organ vocabulary), 98 fields total, real exact forensic/anatomic terminology throughout (Rigor Mortis, Livor Mortis, Circle of Willis, Arteriolosclerosis, trilineage hematopoiesis, etc.), every clinically meaningful option carrying a real `lexiconTermKey` under a `forensic.*` namespace (39 dedicated tests confirm this per-section, including that negative/normal findings deliberately carry none). Registered in `templateService.ts`'s `editorStore` and this file's own `PROTOCOL_REGISTRY` at `status: 'in_review'` — content-complete but honestly not yet reviewed by a real clinical/forensic domain expert.
- **Section visibility — two real, deliberately separate mechanisms**, per direct guidance's own confirmed architectural feedback that the original spec's 4 named rule sets couldn't cover every real combination (and shouldn't be user-editable presets requiring a new one hand-added for each):
  - `resolveAutopsyGrossingSectionVisibility.ts` / `resolveAutopsyTargetedOrganSectionVisibility()` — the original spec's own 4 named rule sets, expressed as fixed presets. Still real and correct; useful before a case's specimens carry real organ codes.
  - `resolveActiveAutopsyGrossingSections.ts` — the real, general, preferred mechanism: which sections are active is derived from which real organs are actually present among the case's real specimens (`Specimen.organCodes`, `types/autopsy/AutopsyOrganCode.ts`'s own `AUTOPSY_ORGAN_TO_SECTION` map), per direct guidance's own confirmed pseudocode. Every combination the original spec never named falls out for free. `classifyAutopsyOrganCodeFromSiteText.ts` is the real, explicitly-labeled fallback for legacy/unmapped specimens with no structured `organCodes` yet — a real, deliberately simple, word-boundary keyword lookup on free-text site descriptions, never the primary path. **Now genuinely wired, not just built in isolation**: called in `AccessionPage.tsx`'s own "Import from Order" path — exactly the real legacy/unmapped-specimen scenario this tier was built for — seeding a real, editable suggestion into the organ picker below rather than leaving every imported Autopsy specimen with no organ codes at all until manually checked.
  - **Now genuinely wired end-to-end, not just built in isolation.** `AccessionPage.tsx` has a real "Organ(s) Included" picker on each Autopsy-category specimen row, grouped by section, writing to `Specimen.organCodes` at submit time. `filterAutopsyTemplateToActiveSections.ts` is the real, pure connector: given a loaded template and the case's real specimens, returns a new template with `sections` filtered to only the active ones — scoped strictly to `category === 'AUTOPSY'`, every other real template passes through untouched, and never mutates the shared template cache. Called at both real template-load sites in `RightSynopticPanel.tsx` (initial report load, and the manual "Add Synoptic" template-picker path) — every one of that file's own 10+ internal `templateDetail.template.sections` references downstream benefits automatically, since they all read the same, now-pre-filtered state, never needing individual changes.
  - **Part B's own Rule Set 2 field-narrowing, now also real**: when a case's active sections are exactly External Examination + Head & Neck (i.e. genuinely Head & Neck Only scope — no other organ system present), `filterAutopsyTemplateToActiveSections.ts` additionally narrows External Examination's own fields to just Rigor Mortis, Livor Mortis, Medical Intervention Devices, and Surface Injuries/Trauma — dropping Body Weight/Length/BMI, which are genuinely inapplicable when only head/neck tissue exists to measure. This is a real, judgment-based mapping from the spec's own body-region language ("facial/scalp/conjunctival/neck trauma") onto this section's actual mechanism-based fields, not a verbatim mapping the spec itself gave — documented as such in the function's own header comment. Automatically takes effect at both existing call sites with no additional wiring, since it extends the same function rather than adding a second one a caller could forget.
  - **Cassette prefixing/protocol wiring — real gap found and fixed.** A full-codebase search turned up zero real Autopsy-category specimen dictionary entries anywhere — only `resolveSpecimenEntryMatchesCategory.test.ts` ever referenced `specimenCategory: 'AUTOPSY'`. This meant the entire Autopsy-relevant accessioning UI (Case Authority section, Organ(s) Included picker) was genuinely unreachable in practice: nothing in the real Specimen Dictionary picker would ever resolve to that category. Fixed by seeding a real, first example pair: `sp-heart-autopsy` ("Heart, Autopsy") in `mockSpecimenDictionaryService.ts`, linked via `protocolId` to a new `proto-autopsy-cardiac-sectioning` Protocol in `mockProtocolService.ts` — 4 coronary-vessel blocks + 2 myocardial blocks, matching the Autopsy Grossing Synoptic's own Cardiovascular section exactly. Confirmed working end-to-end against the real seeded records (not a synthetic fixture) in `generateDefaultMaterial.test.ts`: 6 real blocks, sequentially labeled C1\u2013C6 for a specimen labeled "C", matching Part B's own Rule Set 4 example precisely. The existing `getBlockLabel`/`cassetteIdentifier` numeric-prefixing mechanism itself needed no new code — it was already fully general; the real gap was that Autopsy had no seeded specimen/protocol pair to exercise it through.
  - **A second real gap this surfaced, now also fixed**: `ProtocolPathway.defaultCount`/`defaultPieceCount` (`IProtocolService.ts`) already drove real accession-time block generation, but `ProtocolDictionarySection.tsx` (the admin screen for protocols) had zero UI for either field — the data survived a save (pathways are spread-merged, not field-by-field remapped) but was completely invisible and uneditable to a lab admin, since no prior protocol had ever used non-default counts. Now wired into real form state, rendering (a new row per pathway: Default Block/Decant Count, and Default Piece Count — disabled, not hidden, for a decant pathway, with the value auto-cleared on switching to decant so the admin never gets stuck on stale validation), and schema validation (`resolvePathwayCountValidation.ts` — a real, pure, tested function: undefined stays valid, set values must be positive integers, `defaultPieceCount` is invalid on a decant pathway). 10 dedicated tests. **Known, separate gap, not fixed**: this same screen's spreadsheet import/export (`protocolsToRows`/import parsing) has no columns for either field — exporting this protocol to XLSX and re-importing it would silently drop both values. Out of scope for what was asked (form/validation/rendering), flagged rather than fixed. *(Since closed: `ProtocolDictionarySection.tsx` now exports and imports "Default Block/Decant Count" and "Default Piece Count" columns, with validation — checked in the Batch 496 README audit.)*
  - **`HistologyBlock.tissueDescription`** — new, general (not Autopsy-specific) optional field naming what's actually in a given cassette (e.g. "Heart \u2014 LAD"), distinct from `label` (sequential letter/number) and `sourcePathwayName` (which pathway generated it). Editable in `BlockStainEditorModal.tsx` right alongside the existing Piece Description field, same simple single-line pattern. Not yet wired into the printed cassette label (ZPL templates) \u2014 that's a real, separate, larger piece (GS1 DataMatrix encoding, physical label layout constraints) deliberately not taken on unasked. *(Since closed: `utils/labels/zplTemplates.ts` and `printCassetteSlideLabel.ts` now carry `tissueDescription` onto the cassette label — checked in the Batch 496 README audit.)*
- **Required-field validation — real, tiered, per direct guidance's own confirmed feedback** that a universal `required: true` creates real operational friction (specimen variability/autolysis, differential clinical depth, HL7/FHIR ingest compatibility). `EditorField` gained a real, optional `requiredIf?: VisibilityCondition` (reuses the existing shape, deliberately independent of `visibleWhen` — a field can be visible but only softly validated, or required under a different condition than what made it visible). `resolveAutopsyGrossingRequiredFields.ts` resolves the real, current requirement set (Tier 1: unconditional `required`; Tier 2: `requiredIf` triggered by the given answers) and the real, currently-missing subset for sign-out hard-blocking. Tier 3 (soft warnings on optional fields left blank) is deliberately not a "required" concept and has no function here — a real sign-out screen would check it separately. **All 7 real sections (98 fields) are now fully reconciled against this tiering** — real gatekeeper fields carrying their own "normal/none/intact" escape option stay Tier 1 (e.g. Spleen Status, Gallbladder Status, Rigor Mortis); bare measurements with no clean gatekeeper parent (body weight, organ weights, wall thicknesses) are genuinely Tier 3, never forcing dummy data on autolyzed or disrupted specimens; coronary stenosis grading across all 4 vessels is Tier 3 per the differential-clinical-depth principle — a basic medical autopsy shouldn't be forced into full 4-vessel grading; every positive-finding-detail field's own `requiredIf` exactly mirrors its own existing `visibleWhen` (e.g. once Epidural Hemorrhage is flagged, its own Volume becomes required). 45 dedicated tests confirm this, including a whole-template invariant that every `requiredIf` references a real, existing parent field in its own section.

  **CORRECTION (July 2026) — the 19 templates' registry exclusion was
  never intentional.** This README previously stated `PROTOCOL_REGISTRY`
  "correctly excludes" the 19 generic synoptic templates seeded directly
  into `editorStore` (breast_invasive, lung_adeno, colon_resection, etc.),
  framing it as a deliberate consequence of CAP/RCPath content-licensing
  cleanup. That was wrong — these templates were simply never given
  registry entries to begin with, meaning they were reachable only by
  direct URL (`/template-editor/breast_invasive`) and completely invisible
  to normal browsing/assignment via Configuration → Synoptic Library →
  All Protocols. Fixed by adding all 19 as `published` entries (see
  `scripts/add-generic-template-registry-entries.cjs`), each retaining
  the existing `-generic` version suffix as the honest signal that these
  are placeholder content pending a confirmed CAP/RCPath license — the
  license swap will replace file content in place, same template IDs,
  rather than needing a separate interim status. `PROTOCOL_REGISTRY` is
  now 32 entries (was 13).

  **FIXED this pass (PRIORITY_FIXES.md #8):** two hand-rolled modal
  shells — "Upload Protocol" and "Build / Customise" — converted to
  `ps-overlay`/`ps-modal-dark`. Confirmed these were a genuine duplicated
  shell (the exact background color appeared nowhere else in the file),
  not part of a broader deliberate internal theme, so safe to fully
  standardize rather than just convert the backdrop.

- **`SynopticEditor.tsx`** (~1,180 lines, the real template builder) — Add/
  reorder/delete sections and fields, 6 field types (dropdown/radio/
  checkboxes/numeric/text/longtext), per-field AND per-option SNOMED+ICD
  coding, preview modal. This is where `EditorTemplate`/`EditorSection`/
  `EditorField` — the actual rich content model — are defined. **See
  Notes — this is the other half of the TemplateRenderer bug.**

  **`EditorField.markerGroup?: string`** (added for the biomarker display
  work, July 2026) — optional metadata grouping related fields under one
  card in the `MarkersPanel` display (`pages/SynopticReportPage/
  components/MarkersPanel.tsx`) — e.g. "ER Status"/"ER % Positivity"/
  "ER Intensity" all tagged `markerGroup: "ER"` render together rather
  than as separate, disconnected badges. Only meaningful within a
  template's `biomarkers` section (currently only `breast_invasive` and
  `lung_adeno` have one); falls back to the field's own label if unset,
  so untagged fields/templates degrade gracefully rather than breaking.

  **FIXED this pass (PRIORITY_FIXES.md #8):** three overlay backdrops
  converted to `ps-overlay`. The live-preview modal's inner box was
  deliberately left white/light-themed — it renders the template as it
  would actually look in a real document, same "should look like paper"
  reasoning as the main report editor, not an oversight. The two confirm
  dialogs (Submit for Review, Unsaved Changes) had their backdrops
  converted; their inner boxes use this file's own `T.surface`/`T.border`
  theme tokens, applied *consistently* throughout the whole file (unlike
  `protocolShared.tsx`'s genuinely duplicated shell above) — left as-is
  rather than force onto slightly different exact shared-class values
  without being asked.

- **`ReviewQueueSection.tsx`** — Pre-publish lifecycle list
  (draft/in_review/needs_changes/approved). Routes to `TemplateRenderer.tsx`
  ("Open Reviewer") or `SynopticEditor.tsx` ("Open Editor"). No issues.
- **`AllProtocolsSection.tsx`** — Full library, filterable by status.
  **Real, found-and-fixed accessibility bug, per direct report
  ("occasional text that is dark and pretty much impossible to
  read")**: the lifecycle stepper's own separator dash (`—`) used
  `#1e293b` — darker than even its own sibling "future/inactive step"
  label color (`#334155`) right next to it. Fixed to `#64748b`,
  clearly visible without competing with the stepper's own real
  visual hierarchy (past/current/future).
- **`ActiveProtocolsSection.tsx`** — Published protocols in the reporting
  workflow. "View Protocol" → `TemplateRenderer.tsx` (read-only), "New
  Version" → `SynopticEditor.tsx` (draft fork). Same real lifecycle-
  stepper separator-dash fix as `AllProtocolsSection.tsx` above — the
  exact same copied pattern, independently confirmed and fixed here too.
- **`TerminologyAlertBanner.tsx`** — SNOMED/ICD deprecation alerts inline
  in `SynopticEditor.tsx`, plus a compact `TerminologyAlertBadge` used in
  protocol cards elsewhere in this folder. No issues.

## Notes

- **On naming:** "Editor" here (`SynopticEditor.tsx`) means something
  genuinely different from `components/Editor/` (the Tiptap narrative
  writing surface) — this one edits structured template *definitions*
  (sections, fields, conditional visibility), not free-text content.
  Prompted by a direct question about whether this file was mis-grouped;
  it isn't — same overloaded-terminology pattern already documented in
  the top-level `components/README.md` for "Search"/"Template"/"Review",
  now a fourth confirmed instance with "Editor". Correctly placed, folder
  path disambiguates rather than the bare filename.

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

## Real row actions + no inline CSS (Batch 317, PS-73)

Before this batch, the row actions were broken:

- **All Protocols:** Duplicate, Export JSON, New Version and Archive were buttons with empty handlers.
- **Active Protocols:** "Duplicate" opened the **published** protocol in the editor for direct editing. Export and Archive did nothing.

They are now real, in the new shared **`ProtocolCardParts.tsx`** (`ProtocolRowActions`, `LifecycleTracker`, and the mini-components that used to live in ActiveProtocolsSection.tsx). Which actions show per state, and what each does, is decided in `services/templates/protocolLifecycle.ts`:

- **Duplicate:** `/template-editor/:id?mode=duplicate` opens a new protocol copied from this one, with a localized copy name.
- **New Version** (published only): `?mode=newVersion`. The copy keeps the same name, takes a minor version bump, and gets `supersedesId`. Publishing it archives the old version.
- **Export JSON:** downloads the full editor template plus metadata (`utils/downloadJson.ts`).
- **Archive** (with confirmation; stronger wording for a published protocol): adds a new `'archived'` lifecycle state. **Restore** brings it back as a draft, which must be reviewed again. All Protocols gains an **Archived** filter, and "All" hides archived protocols.

**SynopticEditor.tsx:**

- Supports `mode=newVersion`.
- Takes copy names from `t('common.copyOfName')`.
- Name uniqueness now lets a New Version keep its predecessor's name (`findProtocolNameConflict`).
- A copy no longer shows its source's "changes requested" banner.
- The review date uses the user's locale (it was hard-coded `en-GB`).

**No inline CSS left** in protocolShared, AllProtocols, ActiveProtocols, ReviewQueue or SynopticEditor:

- Lifecycle, source, field-type, coverage and condition-toggle colours are CSS classes (`.ps-lc-hue--*`, `.ps-protocol-source--*`, `.ps-syned-*`).
- A category's colour and a bar's fill width are the only per-instance values; they cross into markup as `--ps-hue` / `--ps-pct`.
- `LIFECYCLE_STYLES` and `SOURCE_STYLES` were removed.
- The editor's imperative `onFocus`/`onBlur` border writes are now `:focus` rules.

## Batch 426

The template editor adds:
- **Reports as** on each field (pT, pN, pM, FIGO stage, block identifier);
- **Unit** on numeric fields;
- **Staging edition** on the template (e.g. AJCC 8th).

They feed the structured synoptic result (`services/reports/synopticResultPayload.ts`). The seeded templates have no tagged fields, so their staging is sent as null until a field is tagged.

## Batch 429: view-only sections, equipment log for the bench

The Synoptic Library tab is view only without any protocol capability. Its status and group filters are marked `data-config-nav`.

## Batch 430: personal settings per person; view-only fields

Search and filter fields here are marked `data-config-nav`, so they keep working when the section is shown view only.

## Batch 431

Protocol lifecycle overrides (`protocolShared.tsx`) are kept in the lab settings store.

## Batch 437

The section list asks before leaving unsaved changes (PS-128). A protocol's JSON export is audited (PS-282).

## Batch 461

`SynopticEditor.tsx`: field type `partGrid` (a results grid: one row per part, fixed columns, see `services/templates/partGrid.ts`). It is built in (PathScribe's Core results question) and kept out of the add-a-field pickers; the preview lists its columns.

## Batch 463

- `SynopticEditor.tsx`: field type `spatialStageCanvas` ("Mohs stage map"). Built in: it comes with PathScribe's Mohs template and its copies and isn't offered when adding a question. A field may carry `defaultHistologyFieldId` (kept from the template; no editor control yet). The preview shows a hint.
- `protocolShared.tsx`: "PathScribe — Mohs Micrographic Surgery" in the protocol registry (skin, 15 fields).

## Batch 463b

`SynopticEditor.tsx`: a Mohs stage question gets **Default histology from** (a choice question, or None). A source that was deleted or isn't a choice question is flagged on the field and stops Submit for review.

## Batch 464

`protocolShared.tsx`: field counts for Colon Resection (52), Colorectal Resection B (45) and Colorectal Local Excision (40) with their new map questions. Corrected: the prostate and breast templates' counts hadn't been raised for their Batch 461–462 map questions; they now match.

## Batch 465

`protocolShared.tsx`: registry entries for PathScribe's Oral Cavity Resection (17 fields) and Neck Dissection (8 fields), category `HEAD_NECK`. `SynopticEditor.tsx`: `HEAD_NECK` in the category list (`synopticEditor.category.headNeck`).

## Batch 465b

`SynopticEditor.tsx`: `EditorField.sumOf` (a total from a grid). It is set in template JSON; the editor doesn't expose it yet.

## Batch 466

- `protocolShared.tsx`: Kidney Resection now has 35 fields (the 10 renal map questions added).
- `SynopticEditor.tsx`: `EditorField.wholeNumber`.

## Batch 466b

`SynopticEditor.tsx` count settings:
- A numeric question has a number type (decimal or whole number), "can't exceed" (another numeric question), and a value that is either entered by hand or the total of a grid column.
- A grid's number columns each have a number type and a column they can't exceed.
- `protocolShared.tsx`: Kidney Resection has 36 fields.

## Batch 466c

- `SynopticEditor.tsx`:
  - The condition picker has a mode ("when the answer is" / "unless the answer is") and "+ Or also when…" alternatives. The renal vein and ureter conditions in Kidney Resection are now editable here.
  - The value list for a number question offers "Entered by hand, checked against a grid's total".
- The logic lives in `services/templates/conditionEdits.ts` and `templateCountRules.ts`.

## Batch 467 — In-house molecular orders

`MolecularResultBindingEditor.tsx`: on a choice question in the Synoptic Editor, "Filled from in-house molecular test", with what a positive and a negative result mean, and a warning when the binding can't be used. It loads the test list only when shown.

---
*See [components/Config/README.md](../README.md) for how this folder fits Config/.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master components/README.md or Config/README.md if this folder's overall PURPOSE changes.*

## PS-63 walkthrough findings (Batch 326)

The whole workflow was walked in the browser, end to end: build from an existing template → Save Draft → Submit for Review → Review Queue → Approve → Publish → Active Protocols. It works. The Admin Guide section above is written from that walkthrough. Findings:

- **Fixed: refreshing the editor made a second copy.** After the first save of a new template or a Duplicate / New Version, the address bar still showed `/template-editor/new` or the source's id with `?mode=duplicate`. A refresh opened a fresh copy, and the next save created a second protocol.
  - The editor now moves to the saved protocol's own address after the first save (`protocolLifecycle.ts → editorUrlAfterSave`).
  - Checked in the browser: save, refresh, save again leaves one copy.
- **Enforced since Batch 328: the 80% SNOMED rule.** The Review Queue banner says "Templates require ≥80% SNOMED coverage and clinical sign-off before publishing", and the editor's Readiness list shows it. Before Batch 328 nothing checked it, and the walkthrough published a template with 0% coverage. Per Pete, publishing a diagnostic template is now blocked below 80%.
- **Enforced since Batch 328: independent review.** Before Batch 328 the same user who wrote a template approved and published it. Pete's spec is now in force: approver roles, the self-approval setting (off by default) and the required-reviewers setting. See "Who may approve and publish" above.
- **Fixed in Batch 328: Reset only reset the reviewer page.** The service had no handler for going back to draft, so the queue kept the old status. It now has one (`templateService.resetToDraft`). The reviewer page also waits for the service before changing state, so a refused Approve or Publish no longer shows as done.
- **Open: e-mail notifications don't reach anyone yet.** Lifecycle e-mail notifications (`services/communications/recipientResolver.ts`) look up recipients from a backend API that doesn't exist yet. In the demo the lookup fails with a console error and no e-mail is sent. The in-app message for a *requested* template, sent when it's published, does work.
- **Open, reviewer screen:**
  - it has no on-screen guidance on what a reviewer should check;
  - its per-field comment boxes are bright white on the dark page;
  - **Reset** (back to Draft, clears answers) sits right beside **Approve**.
- **Enforced since Batch 329: drafting by role.** Per Pete, drafting is limited to Template Author, and Admin inherits it. The editor opens read-only for anyone else (`SynopticEditor.tsx` asks `templateService.canCurrentUserDraftTemplates()`), and the service refuses the save, submit or delete. Checked in the browser: a plain Pathologist sees the banner with both buttons disabled; after adding Template Author, the editor is editable.

  Candidates for a small follow-up.

## Batch 519 (PS-493, PS-494, PS-273)

`SynopticEditor.tsx`:
- **Conditions (PS-493):** `ConditionPicker` (now exported, with a test) ticks several answers, and each alternative has its own "is" / "is not" mode.
- **Node counts (PS-494):** a text question can be a node count, with the count it can't exceed and the counts it must cover.
- **Cytology (PS-273):** for a Non-GYN cytology protocol (or one that already has narrative sentences) each question shows its narrative sentence and clinical tier, each answer's expanded row its narrative phrase, and the protocol its reporting standard. A sentence without `{value}` warns. Editing a sentence drops PathScribe's translated wording for it. "Non-GYN cytology" is a category choice. `FieldCard` is exported for its test (`FieldCardNarrative.test.tsx`).
- The five cytology templates are now edited here like any other protocol, and the Cytology screens use what is published (this closes the follow-up the PS-272 note above deferred to PS-273).

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- Loading text here now goes through `LoadingState` (`components/Common`): nothing for 300 ms, then the screen's own loading text, and "Still working…" from 3 s. Carried over from Batch 548; `services/connectivity/latency.guard.test.ts` now covers every loading text in the app.

## Batch 568 (WCAG 2.1 AA, 4.1.2)

- `TerminologyAlertBanner.tsx`: the header holds a button (Re-check), so it is no longer a button; clicking it still shows or hides the list, and the title is the button (`aria-expanded`). The counts and the field / option references come from messages (`countsBoth`, `fieldRef`, `fieldOptionRef`), so each language sets its own punctuation. Test: `TerminologyAlertBanner.test.tsx`.
- `protocolShared.tsx`: the upload drop zone's hidden file input sits beside it, not inside it.
