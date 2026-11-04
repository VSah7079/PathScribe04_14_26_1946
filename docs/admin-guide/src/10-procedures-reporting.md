---
chapter: 10
id: ch10
title: Step-by-step procedures: report templates, synoptic templates, JSON files and scheduled reports
---

# Step-by-step procedures: report templates, synoptic templates, JSON files and scheduled reports {#ch10}

This chapter is a set of numbered procedures. The screen chapters ([Chapter 6](#ch6) for templates, the Synoptic Library and delivery) say what each field means; this chapter says what to click, in what order, what you should see, and how to undo it. Each procedure names the screen it uses, so you can jump to the field reference. Labels, billing and registries are in [Chapter 11](#ch11).

Read these points first.

1. **Status.** Every screen used here is **Built**, except Delivery Schedules, which is **Partial**, and saved-report schedules, which are **Demonstration** (nothing is delivered). Today most data services are browser-held demonstration services; the production API is connected service by service. A step that works in the demonstration may not yet be backed by the production server.
2. **There are two different kinds of template.** A **report template** (Configuration tab **Report Templates**) lays out the printed report: header, body and footer parts. A **synoptic template**, also called a **protocol** (Configuration tab **Synoptic Library**), is the structured checklist of questions a pathologist answers for a cancer or cytology case. They are built on different screens, saved in different formats and routed by different rules. Only the synoptic template has a JSON file (see [Part C](#ch10-json)); a report template has none.
3. **Draft first, and a second person to publish.** A synoptic template is never published straight from the editor. It goes Draft, then In Review, then Approved, then Published. By default the person who wrote it cannot approve or publish it (see [Review rules](#ch10-syn-rules)).
4. **Permissions.** Each procedure lists the capability it needs. If a button is greyed out, you do not hold the capability. Who holds it by default is in the Permissions line of the screen's own section in Chapter 6.
5. **Copy names.** A copy made by **Duplicate** is named `<name> (Copy)` in English. The wording follows the language of the person who made it, and the name is stored, so it does not change if someone later switches language.

## Part A: Report templates, parts and routing {#ch10-report-templates}
Breadcrumb: Home > Configuration > Report Templates

A report template is built from **parts**. The order of work is always the same: make or copy the parts, publish them, assemble them into a template, publish the template, then tell routing which cases use it. Only **published** parts can be placed in a template, and only a **published** template can be chosen by routing.

Permissions: opening the tab needs `screen:configuration:open`. Create, edit, duplicate, delete and archive need `config:report-template:manage`. Publish needs `config:report-template:publish`. Both are high risk and audited. Admin and Lab Director hold both; Template Author holds manage; Template Approver holds publish. Reference: [Part Library](#screen-templates-parts), [Report Templates](#screen-templates-templates), [Routing Rules](#screen-templates-routing).

### A1. Copy an existing part (Duplicate) {#ch10-part-copy}
Breadcrumb: Home > Configuration > Report Templates > Part Library

Use this to change a built-in part, because a built-in part (the card shows a **Built-in** badge) cannot be edited or archived.

1. Open the Configuration tab **Report Templates**, then the sub-tab **Part Library**.
2. Find the part. Type part of its name in **Search**, or narrow with the type buttons (**All**, **Headers**, **Bodies**, **Footers**) and the lab filter.
3. On the part's card, select **Duplicate**. The button reads "Duplicating…" for a moment.
4. The part builder opens on the copy, named `<original name> (Copy)`, in Draft. Change what you need (see [A2](#ch10-part-create), steps 5 to 9).
5. Select **Publish** when it is ready.

To undo: archive the copy (see [A3](#ch10-part-archive)). The original is never changed.

### A2. Create a new part {#ch10-part-create}
Breadcrumb: Home > Configuration > Report Templates > Part Library > Part builder

1. Open **Report Templates** > **Part Library**.
2. Select **New Part**. The page asks "What kind of part are you creating?". The three choices are **Header Part** (institution branding, accession number, patient demographics, at the top of pages), **Body Part** (the clinical content: diagnosis, gross description, microscopic, synoptic data) and **Footer Part** (page numbers, confidentiality notice, patient identity line). Choose one. The kind cannot be changed afterwards, because it decides which template slot the part can go in.
3. The part builder opens with a name such as `New Body Part`. Click the name and type a clear one, for example `Surgical body: diagnosis and microscopic`.
4. Select **Settings** to open the details. Optionally fill in **Specialty** (blank means General), **Description**, **Standard** (None, CAP, RCPath or Custom; this is a label only and does not load or check any protocol) and **Performing Lab**. Leave **Performing Lab** on "Global (every performing lab)" unless the part is only for one laboratory.
5. Drag components from the **Components** palette (groups: Structure, Content Blocks, Layout, Conditional) onto the canvas.
6. Click a component on the canvas. Its settings appear in the inspector on the right: label, width, binding key, required, hide when empty, visibility conditions and so on. The full list is in [Inspector](#ch6-template-inspector). A field that shows case data needs its **Binding key**.
7. Drag components up or down to reorder them. Use **Grid on / Grid off** if the grid gets in your way; it only changes the display.
8. Watch the save indicator at the top: it reads Unsaved, Saving, Saved or Error. The part saves as you edit.
9. Select **Publish**. The button then reads **Published**. If the part marks a field as the final diagnosis and a template that already uses it would end up with more than one, publishing is refused with a message naming the template. Unmark the extra field and publish again.

You should see the part on its card in the library under Headers, Bodies or Footers, with a Published badge. Use the back arrow (←) to return to the library.

### A3. Edit, archive or restore a part {#ch10-part-archive}
Breadcrumb: Home > Configuration > Report Templates > Part Library

1. In the Part Library, find the part and select **Edit** (not offered on built-in parts).
2. Change it as in [A2](#ch10-part-create), steps 3 to 8.
3. To take a part out of use, select **Archive** on its card, then **Yes** to confirm (**No** cancels). Archived parts are hidden from the list and from the template editor's part picker.

Templates that already contain the part are not rewritten when you archive it. Whether the part still appears in a template that was published earlier is not verified here; check with a preview before you rely on it.

### A4. Create a report template {#ch10-rt-create}
Breadcrumb: Home > Configuration > Report Templates > Report Templates

1. Open **Report Templates** > the sub-tab **Report Templates**. The page is titled "Report Templates".
2. Choose how to start.
   - **From Standard** (also **Use Standard Template** when the list is empty). Copies the standard surgical pathology layout as a new draft named `My Surgical Pathology Report` and opens the editor. This is the quickest start.
   - **New Template** (also **Start Blank**). Opens the editor on an empty draft.
3. In the editor, click the template name at the top and type the real name. It saves when you click out of the box.
4. In the **Part Library** panel on the left, set the **Performing lab** filter. "All Labs (Global + every lab)" shows every published part; **Global** or one lab narrows the list. Use **Search parts** to find one by name. If the panel says "No published parts found", publish the parts first ([A2](#ch10-part-create)).
5. Click the **+** in a zone of the page layout to choose where the next part goes. The zones are **Page 1 Header**, **Pages 2+ Header**, **Body**, **Pages 2+ Footer** and **Page 1 Footer**. The panel header changes to "Click a part to add" and the target.
6. Click a part in the panel. It is placed in the zone you chose. Repeat for each zone. A header or footer zone holds one part; the Body zone holds a list. Pages 2+ can read "same as Page 1".
7. Drag body parts to reorder them. Use the dot (●) on a slot to switch it off or on without removing it. Use the remove button to take a part out. Body parts continue across all pages.
8. Select **Style** to set the template's default font family, size (points), bold, underline and text transform for headers, body or footers. Leave a value blank to follow the laboratory default from [Document Style](#screen-document_style). A single component can still override it.
9. If the template should use AI-assisted writing in Orchestration mode, select a component and set its AI generation fields in the inspector (see [Chapter 5](#ch5)).
10. Select **Preview** to see the template filled with mock case data, with the page count. Margins and page size here apply to the preview only.
11. Check that no message under "Assembly issues" remains. Mark at most one field as the final diagnosis if the template is a Final template: with more than one, **Publish** is refused ("A Final template may have only one; unmark the others before publishing").
12. Select **Publish**. The button then reads **Published**. The indicator reads "Saved" when the last change has been stored.

You should now see the template in the list with a Published badge, an **AI** badge if AI generation is on, and the number of active slots.

### A5. Copy a report template (Duplicate) {#ch10-rt-copy}
Breadcrumb: Home > Configuration > Report Templates > Report Templates

1. Open **Report Templates** > **Report Templates**. Use **Search templates…** or the status buttons (**All**, **Published**, **Draft**, **Archived**) to find the template.
2. Point at the row. Its buttons appear on hover: **Edit**, **Duplicate** and **Delete** (a draft) or **Archive** (anything that was ever published).
3. Select **Duplicate**. A copy named `<name> (Copy)` is created as a draft and the editor opens on it.
4. Change the copy as in [A4](#ch10-rt-create), steps 3 to 11, then select **Publish**.

The standard template shows a **STANDARD** badge and has no **Edit** button; copy it to change it.

### A6. Edit, delete or archive a report template {#ch10-rt-edit}
Breadcrumb: Home > Configuration > Report Templates > Report Templates

1. To change a template, select **Edit** on its row and work as in [A4](#ch10-rt-create). The editor offers Edit on every row except the standard template. To change a template that is already in use, the safest route is to **Duplicate** it, edit the copy, publish the copy, point routing at the copy ([A7](#ch10-routing)), then archive the old one.
2. To remove a draft that was never published, select **Delete**, then **Yes** at the "Delete?" prompt. This removes it for good.
3. To retire a template that was ever published, select **Archive**, then **Yes** at "Archive?". It is not deleted, so the structure of reports already generated from it stays available.

Whether editing a published template in place changes reports that are already open is not verified here. Do not edit a template in place during clinical hours; use the copy route in step 1.

### A7. Route cases to a template (Routing Rules) {#ch10-routing}
Breadcrumb: Home > Configuration > Report Templates > Routing Rules

Routing decides which published report template a case uses. The built-in chain is protocol, then subspecialty, then the gold standard. Rules you add override it. Permission: `config:template-routing:manage` (Admin and Lab Director). Reference: [Routing Rules](#screen-templates-routing).

1. Open **Report Templates** > the sub-tab **Routing Rules** ("Template Routing Rules").
2. Choose the section that fits.
   - **Facility Overrides**: a given facility always uses a given template. Select **Add Facility Rule**.
   - **Physician Preferences**: a given physician always uses a given template. Select **Add Physician Rule**.
   - **Protocol Mappings**: a given synoptic protocol uses a given template. Select **Add Protocol Mapping**. Use this when you have published a new or changed synoptic protocol and want it to use a template without waiting for a software release.
3. In the window, pick the facility, physician or protocol. A protocol that is not yet published shows its state in brackets, and archived protocols are not offered.
4. Pick the **Performing Lab**: "Global (every performing lab)" or one lab. A lab-specific rule is checked before a Global rule for that lab's own cases.
5. Pick the **Report Template**. Only published templates are listed.
6. Optionally type a **Note** ("Why does this override exist?"). Select **Add Rule**.
7. To test, scroll to **Test Template Routing**. Choose a **Performing Facility**, **Ordering Physician**, **Subspecialty** and **Synoptic Template ID** (each can stay "Any" or "None"), then select **Test Routing**. The result names the template and the pass that chose it, and the **Resolution priority** panel highlights that pass. An "Ambiguous" result lists the templates that qualify; add a more specific rule to settle it.
8. To switch a rule off without losing it, use **Disable rule** on its row (it then reads **Enable rule** and shows Disabled). To remove it, select the delete button and confirm at "Delete?". To change it, use the edit button and select **Save Changes**.

To undo a rule: disable it. Cases then fall through to the next pass.

## Part B: Synoptic templates (protocols) {#ch10-synoptic}
Breadcrumb: Home > Configuration > Synoptic Library

A synoptic template is a set of **sections**, each holding **questions** (the editor calls them fields). Each question has a type, answer options, optional SNOMED CT and ICD codes, and optional rules about when it shows. A template is saved as a draft, submitted for review, approved and then published.

### B1. Who may do what, and the review rules {#ch10-syn-rules}
Breadcrumb: Home > Configuration > Synoptic Library > Review Queue

| Step | Capability | Default holders |
|---|---|---|
| Draft, import, build, save, submit | `config:protocol:draft` | Template Author, Admin |
| Approve, or return for changes | `config:protocol:approve` | Template Approver, Lab Director, Admin |
| Publish | `config:protocol:publish` | Template Approver, Lab Director, Admin |
| Archive, restore | `config:protocol:retire` | Template Approver, Lab Director, Admin |

Rules enforced when someone approves or publishes (from `templatePublishingRules.ts`):

- **Independent review.** Anyone who authored or edited the template (every saver is recorded) cannot approve or publish it, unless the site setting **Allow Template Self-Approval** is on. It is off by default.
- **Approvals needed.** The site setting for required reviewers (1 to 3, default 1) says how many different people must approve before the template can be published. Set both in [Template Review](#screen-template_governance).
- **Coding coverage.** A diagnostic template needs at least **80%** field-level SNOMED coverage to publish. A procedural template such as a grossing checklist is exempt.
- If the check fails, the screen names the reason: the person is not an approver, is the author, the approvals are too few, or coverage is below 80%.

On a one-person system nobody can approve a template they wrote. Turn on self-approval in Template Review for a test system, or plan a second person before you start.

### B2. Create a synoptic template from scratch {#ch10-syn-create}
Breadcrumb: Home > Configuration > Synoptic Library > Template editor

Permission: `config:protocol:draft`. Without it the editor opens read-only with the message "Read only: you can view this template, but drafting and submitting it needs the Template Author role."

1. Open the Configuration tab **Synoptic Library**. Choose **Active Protocols**, **Review Queue** or **All Protocols**; each has the **Build / Customise** button.
2. Select **Build / Customise**. The window is titled "Build / Customise" with the line "Start blank or base it on an existing template".
3. Select **Start from Scratch** ("Blank template — define your own sections, fields, and coding"). The editor opens with the breadcrumb "Protocols › New Template".
4. Under **Template Metadata**, fill in:
   - **Template Name** (required). It must be unique among protocols that are not archived; otherwise the editor says `A template named "<name>" already exists`.
   - **Anatomical Category** (pick one of the pills, for example Breast, Colon, Lung, Prostate, Skin). The editor needs a category before the template counts as ready.
   - **Source / Governing Body**: CAP, RCPath, ICCR, RCPA or Custom. It decides the names of the review actions (for example CAP: Accept and Release; RCPath: Ratify).
   - **Reporting standard** (optional; for a cytology system such as a Bethesda edition) and **Staging edition** (optional, for example `AJCC 8th`).
   - **Version**. It starts at `1.0.0`. The up buttons bump MAJOR, MINOR or PATCH.
5. In the first section, type a **Section title** in the box. Select **+ Add Section** for each further section.
6. In a section, select **+ Add Field** to add a question. For each question:
   1. Type the **Field label** (for example `Tumor site`).
   2. Choose the **Field Type**: Dropdown, Radio, Checkbox, Numeric, Free Text or Long Text. (Part grid and Mohs stage map questions are built into some PathScribe protocols and cannot be picked as a new type.)
   3. Tick **Required** if it must always be answered. A required question shows a Required badge.
   4. For Dropdown, Radio or Checkbox, select **+ Add Answer Option** for each answer and type its label. Select the ⌥ button on an option to add its SNOMED CT and ICD codes.
   5. Optionally add **Field-level Coding** (a SNOMED CT code and an ICD code for the question itself), a **Hint / Helper Text**, and, for Numeric, a **Unit** (for example `cm`).
7. Use the up and down arrows to reorder sections and questions. Use **Collapse** and **Expand** to tidy a long form. Use the delete buttons to remove a question or section.
8. To show a question or section only in some cases, open its condition and choose **Show it**: "when the answer is" or "unless the answer is". Pick the trigger question (only Dropdown, Radio and Checkbox questions can be triggers), then the answer. **+ Or also when…** adds an alternative. A question that carries the badge **IF** has a condition.
9. Select **👁 Preview** to try the form as a pathologist would, with conditions live. Select **Reset** to clear your trial answers.
10. Check the **Readiness** panel on the right. It ticks Template name, Category set, At least 1 section and At least 1 field. The **Coding Coverage** panel shows the SNOMED CT and ICD percentages; a diagnostic template needs SNOMED at 80% or more to publish.
11. Select **💾 Save Draft**. The page shows "● Unsaved changes" until you do. The address changes to the saved template, so a page refresh does not create a second copy.
12. When it is ready for review, select **📤 Submit for Review**, then **Submit for Review →** in the window ("This will move … to the Review Queue and notify admins and clinical leads. You won't be able to edit it until it's returned for changes.").

If you leave the page with unsaved changes the window "Unsaved Changes" offers **Save Draft & Leave**, **Discard Changes** and **Keep Editing**.

To undo: before submitting, archive the draft (see [B8](#ch10-syn-archive)). After submitting, a reviewer must return it ([B6](#ch10-syn-review)).

### B3. Copy a synoptic template (Duplicate or Build / Customise) {#ch10-syn-copy}
Breadcrumb: Home > Configuration > Synoptic Library > All Protocols

Use a copy to start a variant of a protocol (for example a local version of a CAP checklist). The copy is a new protocol and the original is not changed.

Route 1, from the list:

1. Open **Synoptic Library** > **All Protocols** (or **Active Protocols**).
2. Find the protocol with **Search protocols…** or the status filter.
3. Open the row (on Active Protocols, click it to expand) and select **Duplicate**.
4. The editor opens on a copy, named `<name> (Copy)`. The version is bumped by one PATCH. The copy keeps whether the original is diagnostic, its type and its group.

Route 2, from the Build window:

1. Select **Build / Customise**.
2. Under "or base it on", search for the template by name, source or category (**Search by name, source, or category…**). Each result shows its version and field count.
3. Select the template, then **Customise This Template →**. The editor opens on a copy.

Then continue as in [B2](#ch10-syn-create), steps 4 to 12. Give the copy its own **Template Name** first, because two protocols that are not archived cannot share a name.

### B4. Edit an existing synoptic template {#ch10-syn-edit}
Breadcrumb: Home > Configuration > Synoptic Library > Template editor

1. Open **Synoptic Library** > **All Protocols** and find the protocol.
2. A Draft or Needs Changes protocol shows **Open Editor**. An In Review or Approved protocol shows **Open Reviewer** (the editor is locked until it is returned). A Published protocol shows **View Protocol** only; to change it, make a New Version ([B5](#ch10-syn-newversion)).
3. Select **Open Editor**. Change sections, questions, options, codes and conditions as in [B2](#ch10-syn-create) steps 5 to 10.
4. If a reviewer returned it, a **Changes Requested** banner shows the reviewer's note. Fix what it asks for.
5. Select **💾 Save Draft**, then **📤 Submit for Review**.

Things the editor can set on a question beyond the basics (all stored in the template and in the JSON file):

- **Narrative phrase** on an answer, and **Narrative sentence** and **Clinical tier** on a question. Write the sentence with a `{value}` placeholder, for example `The specimen is {value}.`. The editor warns "This sentence has no {value}" if you leave it out. Tier 1 carries the diagnostic category.
- **Reports as** (Nothing specific, pT, pN, pM, FIGO stage, Block identifier). What the question reports in the structured result sent to the LIS and registries.
- **Count rules** on a Numeric question: whole number, "Can't exceed" another count, "Can't be below the sum of" other counts, or a total from a grid. A value that breaks a count rule stops the save and the sign-out.
- **Filled from in-house molecular test** on a choice question, with what a positive and a negative result mean.
- **Deprecated codes** and **Terminology warnings** buttons appear at the top when the codes in use have alerts. Review them before submitting.

### B5. Publish a new version of a published template {#ch10-syn-newversion}
Breadcrumb: Home > Configuration > Synoptic Library > Active Protocols

1. Open **Synoptic Library** > **Active Protocols**. Click the protocol's row to expand it.
2. Select **New Version**. The editor opens on a copy with the same name, the MINOR number bumped (for example 1.0.0 becomes 1.1.0), and a link to the published protocol it replaces. The breadcrumb reads "New version — <name> v<version>".
3. Make the changes. Use a MAJOR bump for a change that alters what is reported, if your lab policy says so; the bump buttons are in **Template Metadata**.
4. **Save Draft** and **Submit for Review**, then review and publish as in [B6](#ch10-syn-review).
5. When the new version is published, the old one is archived. Reports already written with the old one keep their content.

### B6. Review, approve and publish {#ch10-syn-review}
Breadcrumb: Home > Configuration > Synoptic Library > Review Queue

This is done by a different person from the author (see [B1](#ch10-syn-rules)).

1. Open **Synoptic Library** > **Review Queue**. A banner states "Templates require ≥80% SNOMED coverage and clinical sign-off before publishing." Count tiles show In Review, Needs Changes and Approved.
2. Open the card ("Open Reviewer"). Read the questions, the options and the coding coverage.
3. To send it back, select **Needs Changes** and type the reason (required). The author sees it in the **Changes Requested** banner and the card shows "Open Editor to Address Changes".
4. To approve, select **Approve** (CAP: Accept; RCPath: Ratify) and optionally add notes. If the site needs more than one approval, the protocol stays In Review until enough different people have approved.
5. When it shows Approved, the card reads "Open Reviewer to Publish". Select **Publish** (CAP: Release). If a rule fails, the message names it; coverage under 80% must be fixed in the editor first.
6. After publishing, the protocol appears under **Active Protocols**, available to all pathologists at once.

To undo a publish: archive it ([B8](#ch10-syn-archive)) and restore a previous version.

### B7. Export a synoptic template to a file {#ch10-syn-export}
Breadcrumb: Home > Configuration > Synoptic Library > Active Protocols

1. Open **Active Protocols** or **All Protocols**, and open the protocol's row.
2. Select **Export JSON**. The browser downloads a file named from the protocol and version, for example `cap-colon-resection-v1.0.0.json`.
3. The export is recorded in the audit log. The button has no separate permission; anyone who can open the screen can export.

The file is the starting point for the JSON procedures in [Part C](#ch10-json).

### B8. Archive and restore a synoptic template {#ch10-syn-archive}
Breadcrumb: Home > Configuration > Synoptic Library > All Protocols

Permission: `config:protocol:retire`.

1. Open the protocol's row and select **Archive**.
2. Read the window "Archive protocol?". For a published protocol it says it will no longer be offered for new reports and that reports already written with it keep their content.
3. Confirm. The protocol disappears from the **All** filter; choose the **Archived** filter to see it.
4. To bring it back, open **All Protocols**, choose **Archived**, and select **Restore as draft**. It returns as a draft and must go through review again before it can be used.

## Part C: Building a synoptic template from a JSON file {#ch10-json}
Breadcrumb: Home > Configuration > Synoptic Library > Upload Protocol

A PathScribe synoptic template can be written as a JSON file and imported as a **draft**. The import checks only the file's **format**. It does not check the clinical content against the CAP or RCPath published protocol, because PathScribe does not hold those bodies' licensed files; every result says "Unverified against CAP or RCPath: only the file's format was checked, not its content against the published protocol." The imported draft still goes through review.

**What can be imported.** Only a PathScribe JSON protocol. A CAP eCC (SDC) XML form or an Excel workbook (.xlsx) is read and reported, but "can be checked here but not imported yet". Report templates have no import file.

**Limits.** JSON, XML or XLSX; at most 10 MB; not empty.

### C1. The easiest way: export, edit, import {#ch10-json-roundtrip}

1. Export an existing protocol as in [B7](#ch10-syn-export).
2. Open the `.json` file in a text editor that checks JSON (any code editor; a word processor will damage the quotation marks). Edit the values.
3. Change the `name` inside `template` to a name that no non-archived protocol uses. An import is refused if the name exists.
4. Save the file and import it ([C4](#ch10-json-import)).

PathScribe gives the imported draft a new id and ignores the `id`, `supersedesId` and `copiedFromId` in the file, so an import can never overwrite an existing protocol.

### C2. The file layout {#ch10-json-structure}

Two layouts are accepted.

1. **The export wrapper** (what **Export JSON** writes). `format` must be exactly `pathscribe-synoptic-protocol`. `formatVersion` is a number; the current version is `1`, and a file with a higher number is refused ("exported by a newer version of PathScribe"). The template is inside `template`. The `protocol` block (id, name, source, version, category, status, isDiagnostic, supersedesId) describes the protocol as it was when exported and is not used on import.
2. **A bare template**: just the object that would sit in `template`, with `sections` at the top.

The template object:

| Property | Type | Required | Meaning |
|---|---|---|---|
| `id` | text | Yes in the model | Replaced on import. |
| `name` | text | **Yes** (checked) | Shown in the library. Must be unique among non-archived protocols. |
| `source` | text | Yes in the model | CAP, RCPath, ICCR, RCPA or Custom. On import the Governing Body you choose in the window decides this (CAP, RCPath and ICCR are kept; RCPA and Other become Custom). |
| `version` | text such as `1.0.0` | Yes in the model | Major.minor.patch. |
| `category` | text | Yes in the model | The anatomical category, for example `COLON`. |
| `sections` | list | **Yes** (checked, at least one) | The sections. |
| `ajccEdition` | text | No | Staging edition, for example `AJCC 8th`. |
| `standard` | text | No | Reporting system, for example a Bethesda edition. |

A section:

| Property | Type | Required | Meaning |
|---|---|---|---|
| `id` | text | Yes in the model | Unique inside the template. Conditions point at ids, so give every section and field one. |
| `title` | text | **Yes** (checked) | The section heading. |
| `fields` | list | Yes | The questions. A section with none gives a warning. |
| `collapsed` | true or false | Yes in the model | Whether it starts collapsed. Use `false`. |
| `visibleWhen` | condition | No | Show the section only when a condition holds. |

A question (field):

| Property | Type | Required | Meaning |
|---|---|---|---|
| `id` | text | Yes in the model | Unique inside the template. |
| `label` | text | **Yes** (checked) | The question as the pathologist sees it. |
| `type` | text | **Yes** (checked) | One of `dropdown`, `radio`, `checkboxes`, `numeric`, `text`, `longtext`, `partGrid`, `spatialStageCanvas`. Anything else is refused. |
| `required` | true or false | Yes in the model | Always answered. |
| `snomed`, `icd` | text | Yes in the model | Codes for the question itself; use `""` when none. |
| `options` | list | Yes in the model | The answers of a `dropdown`, `radio` or `checkboxes` question; `[]` for the others. |
| `hint` | text | No | Helper text. |
| `unit` | text | No | For a `numeric` question. |
| `wholeNumber` | true or false | No | A count: a whole number, 0 or more. |
| `notMoreThan` | field id | No | A numeric question this one cannot exceed. |
| `visibleWhen` | condition | No | Show only when a condition holds. |
| `requiredIf` | condition | No | Required only when a condition holds. |
| `narrativeSentenceTemplate` | text with `{value}` | No | The narrative sentence. |
| `clinicalTier` | text | No | `tier_1_diagnostic_category` or `tier_2_descriptive`. |

An option: `id`, `label`, `snomed`, `icd` (each text, `""` when none) and optionally `narrativePhrase`.

A condition: `{ "fieldId": "<id of the triggering question>", "answerId": "<id of the option>" }`. For several answers use `"answerIds": ["a","b"]`, and `"answerId": ""` with `"notAnswerIds": [...]` for "unless". `or` holds a list of further conditions.

Only the properties marked "checked" are verified on import. A missing `id`, `collapsed`, `options` or `required` is **not** reported by the import check, and a file like that may import and then behave badly in the editor. Always include them. Whether a question without an `id` can be edited cleanly is not verified.

### C3. A minimal file {#ch10-json-minimal}

This is the smallest file that passes the check: one section, one question.

```json
{
  "id": "tmpl-example-min",
  "name": "Example: minimal checklist",
  "source": "Custom",
  "version": "1.0.0",
  "category": "OTHER",
  "sections": [
    {
      "id": "s1",
      "title": "Specimen",
      "collapsed": false,
      "fields": [
        {
          "id": "f1",
          "label": "Specimen adequacy",
          "type": "radio",
          "required": true,
          "snomed": "",
          "icd": "",
          "options": [
            { "id": "o1", "label": "Satisfactory", "snomed": "", "icd": "" },
            { "id": "o2", "label": "Unsatisfactory", "snomed": "", "icd": "" }
          ]
        }
      ]
    }
  ]
}
```

### C4. A fuller file {#ch10-json-full}

This example shows the export wrapper, two sections, every common question type, answer-level codes, a count rule, a visibility condition and narrative text. **The SNOMED CT and ICD codes are placeholders for illustration. Replace them with codes your clinical lead has checked; PathScribe does not validate them on import.**

```json
{
  "format": "pathscribe-synoptic-protocol",
  "formatVersion": 1,
  "exportedAt": "2026-10-26T12:00:00.000Z",
  "protocol": {
    "id": "tmpl-example-full",
    "name": "Example: colon resection (illustration only)",
    "source": "Custom",
    "version": "1.0.0",
    "category": "COLON",
    "status": "draft"
  },
  "template": {
    "id": "tmpl-example-full",
    "name": "Example: colon resection (illustration only)",
    "source": "Custom",
    "version": "1.0.0",
    "category": "COLON",
    "ajccEdition": "AJCC 8th",
    "sections": [
      {
        "id": "s-specimen",
        "title": "Specimen",
        "collapsed": false,
        "fields": [
          {
            "id": "f-procedure",
            "label": "Procedure",
            "type": "dropdown",
            "required": true,
            "snomed": "",
            "icd": "",
            "hint": "As stated on the requisition.",
            "options": [
              { "id": "o-right", "label": "Right hemicolectomy", "snomed": "", "icd": "" },
              { "id": "o-left", "label": "Left hemicolectomy", "snomed": "", "icd": "" },
              { "id": "o-other", "label": "Other", "snomed": "", "icd": "" }
            ]
          },
          {
            "id": "f-other-text",
            "label": "Other procedure (specify)",
            "type": "text",
            "required": false,
            "snomed": "",
            "icd": "",
            "options": [],
            "visibleWhen": { "fieldId": "f-procedure", "answerId": "o-other" }
          },
          {
            "id": "f-length",
            "label": "Specimen length",
            "type": "numeric",
            "unit": "cm",
            "required": false,
            "snomed": "",
            "icd": "",
            "options": []
          }
        ]
      },
      {
        "id": "s-tumour",
        "title": "Tumour",
        "collapsed": false,
        "fields": [
          {
            "id": "f-histology",
            "label": "Histologic type",
            "type": "dropdown",
            "required": true,
            "snomed": "363346000",
            "icd": "C18.9",
            "clinicalTier": "tier_1_diagnostic_category",
            "narrativeSentenceTemplate": "The tumour is {value}.",
            "options": [
              { "id": "o-adeno", "label": "Adenocarcinoma", "snomed": "413448000", "icd": "C18.9", "narrativePhrase": "an adenocarcinoma" },
              { "id": "o-muc", "label": "Mucinous adenocarcinoma", "snomed": "", "icd": "", "narrativePhrase": "a mucinous adenocarcinoma" },
              { "id": "o-na", "label": "Not specified", "snomed": "", "icd": "" }
            ]
          },
          {
            "id": "f-nodes-examined",
            "label": "Lymph nodes examined",
            "type": "numeric",
            "wholeNumber": true,
            "required": true,
            "snomed": "",
            "icd": "",
            "options": []
          },
          {
            "id": "f-nodes-positive",
            "label": "Lymph nodes positive",
            "type": "numeric",
            "wholeNumber": true,
            "notMoreThan": "f-nodes-examined",
            "required": true,
            "snomed": "",
            "icd": "",
            "options": []
          },
          {
            "id": "f-margins",
            "label": "Margins involved",
            "type": "checkboxes",
            "required": false,
            "snomed": "",
            "icd": "",
            "options": [
              { "id": "o-prox", "label": "Proximal", "snomed": "", "icd": "" },
              { "id": "o-dist", "label": "Distal", "snomed": "", "icd": "" },
              { "id": "o-rad", "label": "Radial (circumferential)", "snomed": "", "icd": "" }
            ]
          },
          {
            "id": "f-comment",
            "label": "Comment",
            "type": "longtext",
            "required": false,
            "snomed": "",
            "icd": "",
            "options": []
          }
        ]
      }
    ]
  }
}
```

Check that the example behaves as intended: the question "Other procedure (specify)" shows only when "Other" is chosen; "Lymph nodes positive" cannot exceed "Lymph nodes examined" and both must be whole numbers; the narrative sentence puts the chosen phrase where `{value}` is.

### C5. Import a JSON file {#ch10-json-import}
Breadcrumb: Home > Configuration > Synoptic Library > Upload Protocol

Permission: `config:protocol:draft`.

1. Open **Synoptic Library** > **Active Protocols**, **Review Queue** or **All Protocols**, and select **Upload Protocol**.
2. In the window "Upload Protocol", choose the **Governing Body**: CAP, RCPath, ICCR, RCPA or Other. It becomes the draft's source (RCPA and Other are stored as Custom).
3. Drop the file on the drop zone, or click it to browse. A line "Checking the file…" shows, then the result.
4. Read the result. "Format checked: no problems found" and "PathScribe protocol with N sections and M questions. It can be imported as a draft." means you can go on. "Format checked: problems found" lists each problem (see [C6](#ch10-json-errors)); fix the file, then choose it again.
5. Select **Import as draft →**. The window says `"<name>" was saved as a draft. Open it in Protocols to edit it, then submit it for review.`
6. Open **All Protocols**, find the draft (filter **Draft**), select **Open Editor**, check it with **👁 Preview**, make any changes, **Save Draft**, then **Submit for Review**.

Importing never publishes anything. An imported protocol must go through review and approval like any other.

### C6. Errors and warnings from the check {#ch10-json-errors}
Breadcrumb: Home > Configuration > Synoptic Library > Upload Protocol

| Message in the window | Cause | What to do |
|---|---|---|
| The file is empty. | Zero bytes. | Choose the right file. |
| The file is larger than 10 MB. | Over the size limit. | A protocol export is well under 1 MB; a larger file is probably the wrong file. |
| This file type is not supported. Use JSON, XML or XLSX. | Another extension. | Save as `.json`. |
| The file is not valid JSON. | A missing comma or quote, a trailing comma, or smart quotes from a word processor. | Paste it into a JSON checker or open it in a code editor, fix the marked line. |
| This JSON is not a PathScribe protocol (a protocol has a list of sections). | There is no `sections` list, or the file is a list instead of an object. | Use the layouts in [C2](#ch10-json-structure). |
| This file was exported by a newer version of PathScribe (format N). | `formatVersion` is above 1. | Export again from this PathScribe, or lower the number only if you know the layout is unchanged. |
| The protocol has no name. | `name` is blank. | Add a `name`. |
| The protocol has no sections. | `sections` is empty. | Add at least one section. |
| Section N has no title. | A section's `title` is blank. | Add the title. |
| Section N has no questions. (a warning) | `fields` is empty. | Add questions or remove the section; the file can still import. |
| Section N, question M has no label. | A question's `label` is blank. | Add the label. |
| Section N, question M has an unknown question type. | `type` is not one of the eight allowed values (lower case, exact). | Use `dropdown`, `radio`, `checkboxes`, `numeric`, `text`, `longtext`, `partGrid` or `spatialStageCanvas`. |
| The file is not well-formed XML. / No questions were found in the file. | XML file problems. | An XML form can be checked but not imported. |
| The file is not an Excel workbook. / The sheets were not read… | XLSX file problems. | A workbook can be checked but not imported. |
| A protocol with this name already exists. Rename it in the file, or archive the existing one, and choose the file again. | Name clash with a non-archived protocol. | Change `name`. |
| The draft could not be saved. Drafting protocols needs the Template Author role. | Missing `config:protocol:draft`. | Ask an administrator to grant the capability (Staff, Roles). |

Section and question numbers count from 1 in the order they appear in the file.

### C7. What the import does not check {#ch10-json-notchecked}

Be aware of these gaps when you write a file by hand. They are not reported by the import and are caught, if at all, only later in the editor or at sign-out.

- Whether `id` values exist and are unique.
- Whether a `visibleWhen` or `requiredIf` condition points at a question and an answer that exist.
- Whether a dropdown, radio or checkbox question has any options.
- Whether SNOMED CT and ICD codes are real, current, or match the label.
- Whether the content matches the CAP or RCPath protocol it claims to follow.
- Whether `version`, `category` and `source` use the expected values.

After every import, open the draft in the editor and use **👁 Preview** and the **Readiness** and **Coding Coverage** panels before you submit it.

## Part D: Scheduling reports and report delivery {#ch10-scheduling}
Breadcrumb: Home > Configuration > System > Administration & Compliance

"Scheduling reports" means three different things in PathScribe. Choose the one you need.

| You want to | Use | Status |
|---|---|---|
| Decide **where** each released patient report goes (result message, print, fax, file drop) | Delivery Configuration Rules ([D1](#ch10-delivery-rules)) | Built |
| Decide **when** feeds go out (report delivery, billing, registries and so on) | Delivery Schedules ([D3](#ch10-delivery-schedule)) | Partial |
| Run a **saved search report** every day, week or month for named recipients | Saved-report schedules ([D4](#ch10-saved-schedule)) | Demonstration: nothing is delivered |

Billing and registry schedules are covered with the Registry feed in [D3](#ch10-delivery-schedule) and in [Chapter 11](#ch11).

### D1. Choose where released reports go (Delivery Configuration Rules) {#ch10-delivery-rules}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Delivery Configuration Rules

Permission to change: `config:delivery-rules:manage` (Admin and Lab Director). Reference: [Delivery Configuration Rules](#screen-delivery_rules).

1. Open the Configuration tab **System**, group **Administration & Compliance**, then **Delivery Configuration Rules**.
2. Select **Add Rule**.
3. Choose the cases the rule covers. Every criterion is optional: **Provider**, **Ordering Facility**, **Patient Location (Point of Care)** and **Report Type** (Preliminary, Final, Corrected, Addendum). The more criteria that match, the stronger the rule. A rule with none set matches every case but only as the lowest priority, and the window warns you.
4. For each channel, choose Off, Primary, Secondary or Fallback. The channels are Electronic (result message to the interface engine), Print, E-fax and File drop. Primary and secondary go at once. A fallback goes only when a primary print, fax or file drop has nowhere to go or still fails after its retries.
5. If E-fax is on, type the **Fax number** (7 to 15 digits, optional leading `+`), or leave it blank to fax the ordering physician, or the ordering facility if there is no physician number.
6. If File drop is on, type the **File-drop target**, the name of the target as set up on the interface server. The folder or SFTP address and sign-in details are kept on the server, not in PathScribe.
7. Optionally type a **Note**. Save the rule.
8. Test it. In **Test Delivery Resolution**, choose a Provider, Ordering Facility, Patient Location and Report Type, then select **Resolve**. The result shows the matched rule, the action (Electronic Only, Print Only, Dual Delivery, Suppress) and the channel plan.
9. To set automatic retries, type the minutes to wait before each try in **Automatic retries: wait before each (minutes)**, for example `1, 5, 15`. Each wait is from 1 to 1,440 minutes and you may list up to 10. Select **Save retries**. After the last try the delivery goes to the delivery exceptions, Admin and Lab Director are sent a message, and the rule's fallback channels are used. Leave it blank for no retries.

The window refuses: a fallback with no primary ("A fallback needs a primary channel to fall back from"), a fax number that is not 7 to 15 digits, and a file drop with no target. When no rule matches, the report goes **Electronic Only**.

To undo: edit the rule or delete it. Reports already sent are not recalled.

### D2. Choose the printer for the print channel {#ch10-print-routing}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Print Destination Routing Rules

A delivery rule with the Print channel creates a print job. The printer comes from [Print Destination Routing Rules](#screen-print_routing_rules), otherwise the facility's own default destination. Set these rules before turning Print on in a delivery rule. The Add rule window and the Test Print Destination Resolution panel work like those in [D1](#ch10-delivery-rules).

### D3. Set when feeds go out (Delivery Schedules) {#ch10-delivery-schedule}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Delivery Schedules

Permission to change: `config:delivery-schedules:manage` (Admin and Lab Director). The schedule is stored and evaluated, and the outbound queue shows each item's scheduled time and reporting-deadline flag, but the production server must apply the same rules before handing an item on. A browser or development build does not hold a send until its time. Reference: [Delivery Schedules](#screen-delivery_schedules).

1. Open the Configuration tab **System**, group **Administration & Compliance**, then **Delivery Schedules**.
2. In **Schedules for**, choose "Whole enterprise" or one performing facility.
3. Find the feed's card. The feeds are Report delivery, Billing delivery, Results feed, Admissions feed (ADT), Accession feed, LIS sync and one card for each Registry. A card reads "No schedule set: sent immediately", "Follows the enterprise schedule" or "Set for this facility".
4. Select **Edit** (for a facility, **Set for this facility** first).
5. Under **How it goes out**, choose one:
   - **Send immediately.**
   - **Only during set hours.** Add rows of **Days**, **From** and **Until** (24-hour). Each must end after it starts on the same day.
   - **In a batch at set times.** Choose **How often** (Every day, Weekly or Monthly). For weekly, tick the **Batch days**. For monthly, type the **Days of the month** (1 to 28). Type the **Batch times**, for example `06:00, 22:00`. Optionally type a **Cutoff time**: items signed out after it on a run day wait for the next run.
   - **Hold until final sign-out.**
   - **At sign-out after a review hold.** Type the **Review hold** in minutes (1 to 10,080). Match it to your quality review and amendment window.
6. Optionally type **Days with no sending** as dates, for example `2026-12-25, 2027-01-01`. This applies to set hours and batch schedules.
7. Choose the **Time zone** as an IANA name, for example `America/New_York`. All times are read in this zone.
8. Optionally type a **Reporting deadline** in days from sign-out (1 to 3,650). The queue flags cases within 3 days of it or past it. Registries often need this.
9. Decide whether **An amendment puts the item back in the queue**. It is on by default for registries.
10. Select **Save schedule**. It is refused if a required value is missing or invalid, or if you lack the capability.
11. Test it with **Try a schedule**: choose the **Feed**, optionally a performing facility, the **Registry** for the Registry feed, and the **Date and time**; say whether the case is finally signed out and when. Select **Check**. It answers "It goes out" or "It waits", with the reason and the next opportunity.

For a facility to go back to the enterprise schedule, select **Follow the enterprise** on its card.

Registry destinations, required fields, go-live approval and transport belong to each registry's own setup, not to this schedule. A registry with no schedule holds each item 240 minutes after sign-out, and an amendment re-queues it.

### D4. Schedule a saved report (Search > Report > Schedules) {#ch10-saved-schedule}
Breadcrumb: Home > Search > Report > Schedules

Permission: `search:report-schedule:manage`. This is a user feature: the person who owns the saved report schedules it. An administrator sets it up for a person by granting that capability and teaching these steps.

**Nothing is delivered yet.** A schedule is stored, and **Run now (Simulated)** builds the report and records its counts, but nothing is emailed or filed. Do not rely on a schedule to reach anyone.

1. Open **Search**, run a search and select **Report**. Group the cases, choose the columns, then save the report with a name. A schedule runs a saved report; with none saved the panel says "Save a report first".
2. Select **Schedules**.
3. Under **New schedule**, choose the saved report from "Choose a saved report…".
4. Choose how often: daily, weekly or monthly. For weekly, set the **Day of the week**. For monthly, set the **Day of the month** (1 to 28). Set the time of day.
5. Optionally tick "Cover the most recent days each run, instead of the saved dates", then set **Days to cover** (1 to 366). Leave it unticked to use the dates saved with the report.
6. Tick the people under "Recipients": the label shows how many you chose out of the most allowed (20). PathScribe compares each person's access with the report ("Checking what each recipient can see…"). If someone cannot see every case, you are asked to narrow the report for them or skip them; PathScribe does not choose for you.
7. Select the create button. Each schedule is listed with its pattern, "Covers the last … days", the number of recipients and the next run. A person may hold up to 25 schedules.
8. Use **Run now (Simulated)** to test, **Pause** (then **Resume**) to stop temporarily, and **Delete** to remove.

A schedule shows "Not run yet" before its first run and "Last run failed: …" with the reason when a run fails. "The schedule could not be saved." means the form was refused for a reason not named; check each box and try again.

## What is not covered, and what to check {#ch10-gaps}
Breadcrumb: Home > Configuration

- **No import for report templates or parts.** Only synoptic templates have a file format.
- **No review step for report templates.** They go Draft, Published, Archived, with no second approver (unlike synoptic templates).
- **Not verified here:** how editing a published report template in place affects reports that are open; whether a part archived after a template uses it still prints; how a question with no `id` behaves in the editor; the exact shape of the production server's response for any save.
- **Scheduled report delivery.** Saved-report schedules do not deliver. Delivery Schedules are partly applied by the browser build.
- **Content is never verified against CAP or RCPath.** A reviewer must compare the protocol to the governing body's current published version.
- **Translations.** This chapter is written in English. The French, German, Dutch, Korean and Spanish editions do not yet contain it.
