---
chapter: 6
id: ch6
title: Tier 5: Reporting, Synoptic Forms and Scheduler Configuration
---

# Tier 5: Reporting, Synoptic Forms and Scheduler Configuration {#ch6}

This chapter covers what a released report looks like, which structured (synoptic) forms pathologists fill in, and how a released report is sent, printed and scheduled. It documents 15 screens in four parts. Three things in the outline are not built, and each one is marked where it comes up: a patient portal delivery channel, automated loading of CAP protocol versions, and a nightly job scheduler that an administrator can configure. The nearest working things are named in each section.

**Setup order for this tier.** Do Tier 1 to Tier 4 first (in particular facilities, physicians, roles, and site agents). Then work through this tier in this order. Each screen's own "Setup sequence" box repeats its place in the list.

1. [Approved Fonts](#screen-fonts): choose which fonts the report editors offer.
2. [Document Style](#screen-document_style): set the lab's default report text style, page size and margins.
3. [Template Review](#screen-template_governance): decide who may approve and publish synoptic templates.
4. [Part Library](#screen-templates-parts): build or copy the reusable headers, bodies and footers.
5. [Report Templates](#screen-templates-templates): assemble parts into report templates and publish them.
6. [Routing Rules](#screen-templates-routing): choose which template a case uses for a facility, physician or protocol.
7. [Review queue](#screen-protocols-review): bring synoptic protocols through draft, review and approval.
8. [Active protocols](#screen-protocols-active): check and maintain the published synoptic protocols.
9. [Print Destination Routing Rules](#screen-print_routing_rules): decide which printer a released report goes to.
10. [Delivery Configuration Rules](#screen-delivery_rules): decide how each released report is sent (result message, print, e-fax, file drop).
11. [Delivery Schedules](#screen-delivery_schedules): decide when things go out.

Screens that are not part of setup and so have no step number: the two tab pages ([Report Templates tab](#screen-tab-templates) and [Synoptic Library tab](#screen-tab-protocols)), [All protocols](#screen-protocols-all) and [My exports](#screen-my-exports).

**Delivery channels at a glance.** Each is stated again, with its limits, in [Part 3](#ch6-scheduled-delivery).

| Channel | Status | What exists |
|---|---|---|
| Print queue | Built | Delivery rules send a print job; print routing rules pick the printer; the Print Queue screen manages jobs. |
| Result message to the interface engine (electronic) | Built | The default channel. |
| E-fax | Built | Sent to the interface server, which hands the PDF to an e-mail-to-fax gateway. |
| File drop | Built | Sent to the interface server, which writes the file to a folder or SFTP target set up on that server. |
| Secure e-mail | Demonstration | A person sends a case-linked message from a window; mail goes to the [Simulated mail outbox](#screen-simulated_mail). It is not a delivery rule channel. |
| Patient or provider portal | Not built | No portal channel exists. |

**Where the batch and nightly job tools are.** Batch printing and the nightly job scheduler are not one screen. [Part 4](#ch6-batch-jobs) lists the screens that exist and where each is documented.

## Report Template Designer and Branding Setup {#ch6-report-templates}
Breadcrumb: Home > Configuration > Report Templates

A report is built from three kinds of **part** (header, body, footer). A **template** places parts into five slots (page 1 header, pages 2 and later header, body, pages 2 and later footer, page 1 footer). **Routing rules** decide which template a case gets. The lab's default fonts, page size and margins sit underneath all of it.

**How a template is chosen for a case.** The router tries these in order and stops at the first match: a preliminary-report gate first; then a facility override (Pass 0); then, for an affiliate facility with no rule of its own, its enterprise parent's override (Pass 0a); then a physician preference (Pass 0b); then a synoptic protocol match, where admin-defined rules are checked before the built-in table (Pass 1); then the subspecialty fallback (Pass 2); then the gold-standard fallback (Pass 3). Within one rule type, a rule for one performing lab beats a Global rule for the same facility or physician.

**Text style layers.** The text style of a report comes from three layers; the most specific wins: the lab default (Document Style) is overridden by a template's own Style panel, which is overridden by a component's label formatting in the inspector.

**Branding.** The report header takes its logo, laboratory director name and accreditation number from the Department, falling back to the Facility, then the enterprise. Those fields are set on other screens; this chapter does not repeat them:
- Department branding: [Department Dictionary](#screen-departments) (Laboratory Director Name, accreditation number, Header Logo URL).
- Facility branding and reporting options: [Facility Configuration](#screen-clients) and [Facility Dictionary](#screen-facility-dictionary).

PathScribe stores only the address of a hosted logo image, never the image. A header part with **Show institution logo** switched on uses it.

### Report Templates tab {#screen-tab-templates}
Breadcrumb: Home > Configuration > Report Templates

**Status:** Built

**1. Navigation:** Configuration tab **Report Templates**
**2. Maintenance item:** The tab itself, with sub-tabs **Report Templates**, **Part Library** and **Routing Rules**.

**3. Business purpose and scope.** The tab groups the three screens that define report layout: the template list, the reusable part library and the template routing rules. The tab page has no fields of its own. The sub-tab buttons are the only controls.

**4. Prerequisites and dependencies.** The tab opens for anyone with `screen:configuration:open`. Each sub-tab is then limited by its own capability, so a person without it sees the list but cannot change anything.

Setup step: Reference, not part of setup
Requires: [Document Style](#screen-document_style)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: tab-templates - Report Templates tab with the three sub-tabs]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Report Templates (sub-tab) | Button | Not applicable | Opens the [template list](#screen-templates-templates). | Selected |
| Part Library (sub-tab) | Button | Not applicable | Opens the [part library](#screen-templates-parts). | Not selected |
| Routing Rules (sub-tab) | Button | Not applicable | Opens the [template routing rules](#screen-templates-routing). | Not selected |

**7. Permissions.** Open the tab: `screen:configuration:open`. Each sub-tab's actions use their own capabilities, listed on the sub-tab.
**Known limits.** None known.

### Part Library {#screen-templates-parts}
Breadcrumb: Home > Configuration > Report Templates > Part Library

**Status:** Built

**1. Navigation:** Configuration tab **Report Templates** > sub-tab **Part Library**
**2. Maintenance item:** Report parts (header, body, footer)

**3. Business purpose and scope.** A part is one reusable block of a report: a **header** (institution branding, accession number, patient demographics), a **body** part (diagnosis, gross description, microscopic, synoptic data) or a **footer** (page numbers, confidentiality notice, patient identity line). Parts are built once here and placed into any number of templates. A part can be Global (offered to every performing lab) or belong to one performing lab. The library ships with built-in parts, shown with a **Built-in** badge. Built-in parts cannot be edited or archived; duplicate one to change it.

**4. Prerequisites and dependencies.** Parts do not need other parts, but the lab text style and the performing labs they refer to should exist first. Skip the facility setup and the Performing Lab list offers only Global.

Setup step: Tier 5, step 4
Requires: [Document Style](#screen-document_style), [Facility Configuration](#screen-clients)
Unlocks: [Report Templates](#screen-templates-templates)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: templates-parts - Part Library with headers, bodies and footers grouped]

**What the screen shows.** Archived parts are hidden from the list. Parts are grouped under Headers, Bodies and Footers. Each card shows the name, a status badge (Draft, Published or Archived), the Built-in badge where it applies, the performing lab, and the type, specialty and description. A card offers **Edit** (not on built-in parts), **Duplicate**, and **Archive** with a Yes/No confirmation (not on built-in parts).

**6. Field reference.**

List controls:

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Search | Text | Optional | Filters the list by part name. | Blank |
| Type filter | Choice: All, Headers, Bodies, Footers | Optional | Shows one kind of part. | All |
| Lab filter | Choice: all labs, Global, or one performing lab | Optional | Shows parts for one lab. | All |
| New Part | Button | Not applicable | Opens the part type chooser (header, body or footer), then the part builder. | Not applicable |

#### Part builder {#ch6-part-builder}
Breadcrumb: Home > Configuration > Report Templates > Part Library > Part builder

[SCREENSHOT PLACEHOLDER: templates-parts-builder - Part builder with canvas, palette and inspector]

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Part type | Choice: Header Part, Body Part, Footer Part | Required | Chosen once, when the part is created. Decides which slot the part can be placed in. | None |
| Name | Text | Required | Shown in the library and in the template slot. Click the name to edit it. | `New Header Part`, `New Body Part` or `New Footer Part` |
| Specialty | Text | Optional | Groups the part. `General` means every specialty. | Blank (shown as General) |
| Description | Text | Optional | Short note shown on the library card. | Blank |
| Standard | Choice: None, CAP, RCPath, Custom | Optional | A label only. It records the source of the layout and does not load or check any protocol. | None |
| Performing Lab | Choice: Global (every performing lab), or one performing lab | Optional | A lab-specific part is offered only for that lab's templates. | Global |
| Grid | Switch: Grid on / Grid off | Optional | Shows or hides the layout grid on the canvas. Display only. | On |
| Components (canvas) | Drag from the palette | Optional | The part's content. See the inspector fields under [Report Templates](#screen-templates-templates). The count of components is shown. | Empty |
| Save state | Indicator: Unsaved, Saving, Saved, Error | Not applicable | The part saves as you edit. | Not applicable |
| Publish | Button | Not applicable | Makes the part available to templates (only published parts can be placed). A final-diagnosis check applies; see the template editor. | Draft |

**7. Permissions.** Open: `screen:configuration:open`. Create, save, archive, duplicate: `config:report-template:manage`. Publish: `config:report-template:publish`. Both are high risk and audited. Admin and Lab Director hold both; Template Author holds manage; Template Approver holds publish.
**Template variables for patient sex and NHS number (Batch 662).** Report templates print `{{patient.sexAtBirth}}` and can use `{{patient.nhsNumber}}`. Sex is still stored as the same code (M, F, U) plus I for indeterminate, so templates that test `patient.sex == 'M'` keep working. The badge on the patient banner shows "traced" only when the stored NHS Number Status Indicator is 01.
**Known limits.** The Standard field is a label. It does not link a part to a CAP or RCPath protocol.

### Report Templates {#screen-templates-templates}
Breadcrumb: Home > Configuration > Report Templates > Report Templates

**Status:** Built

**1. Navigation:** Configuration tab **Report Templates** > sub-tab **Report Templates**
**2. Maintenance item:** Report templates

**3. Business purpose and scope.** A report template defines the structure of a report: which header, body and footer parts it uses, in which slots, and (optionally) the lab's AI-assisted generation steps for it. A template is Draft, Published or Archived. Only a published template can be chosen by routing. The list shows every template with its status, an **AI** badge when AI generation is on, a **STANDARD** badge on the standard surgical layout, the number of active slots and the last update time.

**4. Prerequisites and dependencies.** Templates are built from published parts, so the Part Library comes first. Skip it and the part picker in the editor shows "No published parts found". The lab text style should be set so the template's Style panel has a default to fall back on.

Setup step: Tier 5, step 5
Requires: [Part Library](#screen-templates-parts), [Document Style](#screen-document_style)
Unlocks: [Routing Rules](#screen-templates-routing)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: templates-templates - Report Templates list with status filter, search, From Standard and New Template]

**6. Field reference.**

List controls:

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Status filter | Choice: All, Published, Draft, Archived, each with a count | Optional | Shows one status. | All |
| Search | Text | Optional | Filters by name. | Blank |
| New Template (Start Blank) | Button | Not applicable | Creates an empty draft and opens the editor. | Not applicable |
| From Standard (Use Standard Template) | Button | Not applicable | Copies the standard surgical pathology layout as a new draft named `My Surgical Pathology Report`. | Not applicable |
| Edit | Button on every row except the standard template | Not applicable | Opens the editor. | Not applicable |
| Duplicate | Button | Not applicable | Makes a copy named `<name> (Copy)` (in the language you are using). | Not applicable |
| Delete / Archive | Button with Yes/No confirmation | Not applicable | A draft is deleted; a published template is archived. | Not applicable |

#### Template editor {#ch6-template-editor}
Breadcrumb: Home > Configuration > Report Templates > Report Templates > Template editor

[SCREENSHOT PLACEHOLDER: templates-templates-editor - Template editor with Part Library panel, page slots and preview]

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Template name | Text | Required | Click to edit. Saved when you leave the box. | The name given at creation |
| Specialty and standard line | Read-only text | Not applicable | Shows the template's specialty and its standard (CAP, RCPath or Custom). A blank template starts as `general` and `custom`. | `general`, `custom` |
| Status | Draft, Published or Archived | Not applicable | **Publish** moves a draft to Published. Publish is disabled when the template has more than one field marked Final diagnosis. | Draft |
| Performing lab filter (Part Library panel) | Choice: All Labs (Global + every lab), Global, or one lab | Optional | Narrows the parts offered. | All Labs |
| Part search | Text | Optional | Filters the published parts. | Blank |
| Slot: Page 1 Header | One header part | Optional | Header on the first page. | Empty |
| Slot: Pages 2+ Header | One header part, or "same as Page 1" | Optional | Header on later pages. | Empty |
| Slot: Body | Ordered list of body parts | Optional | Drag to reorder. Body parts continue across all pages. Each can be switched off with the slot toggle without removing it. | Empty |
| Slot: Pages 2+ Footer | One footer part | Optional | Footer on later pages. | Empty |
| Slot: Page 1 Footer | One footer part | Optional | Footer on the first page. | Empty |
| Style (Font family) | Choice from the approved fonts | Optional | Template-level default text style for header, body or footer. Falls back to the lab default when blank. | Lab default |
| Style (Font size, pt) | Number | Optional | Same. Sizes are in points. | Lab default |
| Style (Bold, Underline) | Switches | Optional | Same. | Off |
| Style (Text transform) | Choice: As typed, Capitalize, UPPERCASE | Optional | Same. | As typed |
| Preview | Button | Not applicable | Shows the template with mock case data, the page count, and the mock context. | Not applicable |
| Preview margins (Top, Right, Bottom, Left, mm) | Number | Optional | For this preview only. The lab's real page size and margins are set in Document Style. | The lab setting |
| Preview page size | Choice: A4, US Letter, US Legal, A3, B5 | Optional | For this preview only. | The lab setting |

#### Inspector: fields on the selected component {#ch6-template-inspector}
Breadcrumb: Home > Configuration > Report Templates > Report Templates > Template editor > Inspector

The inspector shows the properties of whatever you select on the canvas. The same inspector is used in the part builder.

[SCREENSHOT PLACEHOLDER: templates-templates-inspector - Inspector panel for a selected field]

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Label | Text | Optional | The field's printed label. | Blank |
| Width | Columns out of 12 | Optional | Drag the handle on the canvas for finer control. | Set by component type |
| Required | Yes/No switch | Optional | The field must be filled in. | Off |
| Hide when empty | Yes/No switch | Optional | Leaves the field out of the printed report when it has no value. | Off |
| Page break before this field | Yes/No switch | Optional | Starts a new page. | Off |
| Final diagnosis field | Yes/No switch | Optional | Marks the field that carries the final diagnosis. A template may have only one. | Off |
| Include in FHIR export | Yes/No switch | Optional | Stored with the field. No FHIR export screen is built; see [Chapter 7](#ch7). | Off |
| Show when (visibility) | Condition list with AND/OR | Optional | Conditions on other fields: equals, does not equal, contains, is empty, is not empty, greater than, less than, and so on. | Always shown |
| Label position | Choice: Above field, Adjacent to field, Hidden | Optional | Label formatting. | Above |
| Label font size (pt), Bold, Underline, Text transform | Number and switches | Optional | Component-level label formatting. Wins over the template and lab styles. | Inherited |
| Binding key | Text | Required for bound fields | The case-data field a Text, Dropdown, Number, Date, Image or Data Paragraph reads. | None |
| Text field: Placeholder, Max length, Validation pattern (regex) | Text, number, text | Optional | Entry limits on a text field. | Blank |
| Dropdown: Options | One `value|Label` per line | Required | The choices. | Blank |
| Dropdown: Allow multiple selection, Allow free text entry | Switches | Optional | | Off |
| Number: Unit, Unit options, Decimal places, Min, Max | Text and numbers | Optional | | Blank |
| Date: Format, Default to today's date | Choice: Date, Date & time, Year only; switch | Optional | | Date, off |
| Computed: Expression, Output type, Unit | Text; choice Text, Number, Date | Required | A value calculated from other fields. | None |
| Static label: Text, Variant, Bold, Italic | Text; choice Heading 1, 2, 3, Body, Caption | Required | Fixed heading or text. | Body |
| Rich text block: Content, Font size (px), Text alignment | Text, number, choice Left, Center, Right | Optional | Fixed prose, the same in every report. | Blank |
| Data paragraph: Binding key, Rich text formatting, Allow AI to write this paragraph | Text and switches | Optional | A slot filled from case data. | AI write off |
| Image embed: Binding key or Static image URL, Alt text, Caption, Alignment, Width, Height (px) | Text, numbers | Optional | A hosted image address, never an uploaded file. | Auto size |
| Section: Print heading, Collapsible, Start collapsed | Text and switches | Optional | A group of fields. | Off |
| Column layout: Number of columns, Column gap (px) | Numbers | Optional | The columns the content flows across. | None |
| Repeat group: Iterate over, Item alias, Min items, Max items | Text, numbers | Optional | Repeats its contents for each item in a list. | None |
| If block: Show children when, Else branch | Condition list | Optional | Shows contents when the condition holds. | None |
| Switch block: Switch on, Cases (Case label, When) | Field and condition list | Optional | Shows the contents of the matching case. | None |
| Page break: Break behavior | Choice: Automatic, Always break, Avoid breaking | Optional | | Automatic |
| Template reference: Referenced template ID, name, Context overrides | Text | Optional | Inserts another template's content. | None |
| Header: Show institution logo, Show patient name, Show accession number, Page scope, Height (px), Custom HTML | Switches, choice All pages, Page 1 only, Pages 2+ only; number; text | Optional | Header content switches. | Off, all pages |
| Footer: Show page numbers, Page number format, Page scope, Height (px), Custom HTML | Switch, text, choice, number, text | Optional | Footer content switches. | Off, all pages |
| AI generation: Enable AI-assisted generation, System instruction, Temperature, Max tokens | Switch, text, number, number | Optional | Per-section AI settings used by Orchestration mode. Set up in [Chapter 5](#ch5). | Off |

**7. Permissions.** Open: `screen:configuration:open`. Create, save, duplicate, delete, archive: `config:report-template:manage`. Publish: `config:report-template:publish`. Both high risk, audited. Holders as for the Part Library.
**Known limits.** Final-diagnosis checks run in the editor before publishing. The template lifecycle here is Draft, Published, Archived; there is no review step like the synoptic one (see [Template Review](#screen-template_governance)).

### Routing Rules {#screen-templates-routing}
Breadcrumb: Home > Configuration > Report Templates > Routing Rules

**Status:** Built

**1. Navigation:** Configuration tab **Report Templates** > sub-tab **Routing Rules**
**2. Maintenance item:** Template Routing Rules

**3. Business purpose and scope.** Rules override the default chain (protocol, then subspecialty, then the gold standard) for specific facilities, physicians or synoptic protocols. A **Protocol Mapping** lets you map a new or changed synoptic protocol to a template without a software release. This is not the same screen as [Routing Rules](#screen-routing_rules) under System, which routes cases to pathologists.

**4. Prerequisites and dependencies.** Rules point at published templates, facilities, physicians and protocols. Skip templates and the Report Template list is empty. A protocol mapping picks from the protocols in the Synoptic Library, so it is most useful after [Review queue](#screen-protocols-review) work; a rule can be added later.

Setup step: Tier 5, step 6
Requires: [Report Templates](#screen-templates-templates), [Facility Configuration](#screen-clients), [Physicians](#screen-physicians)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: templates-routing - Template Routing Rules with facility, physician and protocol sections and the test panel]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Facility Overrides | List of rules | Optional | Pass 0 and Pass 0a. An affiliate facility with no rule of its own uses its enterprise parent's. | None |
| Physician Preferences | List of rules | Optional | Pass 0b. | None |
| Protocol Mappings | List of rules | Optional | Pass 1. They supplement, and take precedence over, the built-in protocol table. | None (built-in table only) |
| Priority panel | Read-only list | Not applicable | Shows each pass and whether it is admin-defined or admin-extensible; the pass that resolved the last test is highlighted. | Not applicable |
| Enable / Disable rule | Switch on each row | Optional | A disabled rule is skipped. | Enabled |
| Delete | Button with confirmation | Not applicable | | Not applicable |

#### Add or edit a rule {#ch6-routing-rule-window}
Breadcrumb: Home > Configuration > Report Templates > Routing Rules > Add rule

[SCREENSHOT PLACEHOLDER: templates-routing-rule - Add Facility Routing Rule window]

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Facility, Physician or Protocol | Picklist | Required | Which entity the rule applies to. The label follows the section you opened. | None |
| Performing Lab | Choice: Global (every performing lab), or one lab | Optional | A rule for a lab is checked before a Global rule for that lab's own cases. | Global |
| Report Template | Picklist of templates | Required | The template the entity always uses. | None |
| Note | Text | Optional | Why the override exists. | Blank |

#### Test Template Routing {#ch6-routing-test}
Breadcrumb: Home > Configuration > Report Templates > Routing Rules > Test

[SCREENSHOT PLACEHOLDER: templates-routing-test - Test Template Routing panel]

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Performing Facility | Picklist | Optional | The case's facility. | Any |
| Ordering Physician | Picklist | Optional | | Any |
| Subspecialty | Picklist | Optional | | Any |
| Synoptic Template ID | Picklist | Optional | | None |
| Test Routing | Button | Not applicable | Shows the template chosen and the pass that chose it. An ambiguous result lists the candidates. | Not applicable |

**7. Permissions.** Open: `screen:configuration:open`. Add, change, delete: `config:template-routing:manage` (high risk, audited). Admin and Lab Director hold it; Template Author and Template Approver do not.
**Known limits.** The subspecialty and gold-standard tables (Pass 2 and 3) are built in and cannot be edited here. The preliminary-report gate is built in.

### Approved Fonts {#screen-fonts}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Approved Fonts

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Administration & Compliance**
**2. Maintenance item:** Approved Fonts

**3. Business purpose and scope.** Controls which fonts the free-text editors offer pathologists in their toolbar (the report editor, narrative editor, macro editors and comment windows read the list). A font that is switched off is kept in the list but hidden from users. The pool is fixed at 14 fonts in three groups. You cannot add a font name here.

**4. Prerequisites and dependencies.** None. This setting only filters a toolbar. It does not change the lab's default report font; that is set in [Document Style](#screen-document_style), which offers its own shorter list of seven fonts and does not read this list.

Setup step: Tier 5, step 1
Requires: None, this is a starting point.
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-fonts - Approved Fonts with search and per-font switches]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Search fonts | Text | Optional | Filters the 14 fonts by name. | Blank |
| Count badge | Read-only text, "N of 14 enabled" | Not applicable | | Not applicable |
| Font switch (one per font) | Yes/No switch, shown Active or Inactive | Optional | On means the font appears in editor toolbars. The pool: Serif (Times New Roman, Georgia, Garamond, Palatino), Sans-Serif (Arial, Helvetica, Calibri, Verdana, Trebuchet MS, Tahoma, Roboto), Monospace (Courier New, Consolas, Lucida Console). | On for Arial, Times New Roman and Courier New; off for the rest |
| Last-font guard | Message "At least one font must remain enabled" | Not applicable | The last enabled font cannot be switched off. | Not applicable |

**7. Permissions.** Open: `screen:configuration:open`. Change: `config:report-appearance:manage` (high risk, audited). The section is greyed to view-only without it. Admin and Lab Director hold it by default.
**Known limits.** None known.

### Document Style {#screen-document_style}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Document Style

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Administration & Compliance**
**2. Maintenance item:** Document Style

**3. Business purpose and scope.** Sets the lab's default text style for the header, body and footer of every report, and the lab's page size and print margins. A template's own Style panel overrides the default for that template, and a component's label formatting overrides both. Sizes are stored in points, the size that prints, and nothing prints below 8 pt. A style saved before points existed is held in pixels (each pixel prints as 0.75 pt) and keeps printing as it did until you convert it.

**4. Prerequisites and dependencies.** None. Do this before building templates so each template starts from the right default.

Setup step: Tier 5, step 2
Requires: None, this is a starting point.
Unlocks: [Part Library](#screen-templates-parts), [Report Templates](#screen-templates-templates)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-document_style - Document Style with header, body and footer styles and page setup]

**6. Field reference.** The same five style fields appear once each for header, body and footer.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Font family (header, body, footer) | Choice: Arial, Helvetica, Times New Roman, Georgia, Calibri, Verdana, Courier New | Optional | The default report font for that area. | Arial |
| Font size (pt) | Number of points, minimum 8 | Optional | The printed size. Shown as "Font size (px, saved before points)" with a hint when the style is still in pixels. | Body 10, header 11, footer 10 |
| Bold | Yes/No switch | Optional | | Header on; body and footer off |
| Underline | Yes/No switch | Optional | | Off |
| Text transform | Choice: As typed, Capitalize, UPPERCASE | Optional | | As typed |
| Preview | Read-only sample text | Not applicable | Shows the chosen style live. | Not applicable |
| Convert to points | Button, shown only for a style saved in pixels | Not applicable | Opens a confirmation listing each size and what it will print at. The numbers stay the same and now mean points, so text prints larger. Recorded in the audit log. | Not applicable |
| Page size | Choice: A4 (210 x 297 mm), US Letter (216 x 279), US Legal (216 x 356), A3 (297 x 420), B5 (176 x 250) | Optional | The lab's paper size. The template preview opens with it. | A4 |
| Top, Right, Bottom, Left margin (mm) | Whole number from 5 to 50 | Optional | Print margins. | Top 25, Right 20, Bottom 25, Left 20 |

**7. Permissions.** Open: `screen:configuration:open`. Change: `config:report-appearance:manage` (high risk, audited), checked in the service as well as on the screen. Admin and Lab Director hold it.
**Known limits.** The development report renderer (`functions/`) still prints A4 and does not yet read the lab's page size; the setting is sent in the render payload so the production server can use it. Page size and margins are policy for the lab, set by the printer stock, not a personal choice.

### Template Review {#screen-template_governance}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Template Review

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Administration & Compliance**
**2. Maintenance item:** Template Review

**3. Business purpose and scope.** Sets who may approve and publish **synoptic templates** (the Synoptic Library) at this site. It does not govern report templates, which have their own simple draft, publish and archive lifecycle. Two settings apply, plus a fixed rule: a diagnostic synoptic template cannot be published below 80% field-level SNOMED coverage. Procedural templates, such as grossing checklists, are exempt because they are never coded.

**4. Prerequisites and dependencies.** The built-in roles Template Author, Template Approver, Lab Director and Admin do the work, so Staff roles are set up first. Skip this and nobody can approve a template, because approval needs the approver capabilities.

Setup step: Tier 5, step 3
Requires: [Roles](#screen-staff-roles)
Unlocks: [Review queue](#screen-protocols-review), [Active protocols](#screen-protocols-active)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-template_governance - Template Review with self-approval and required reviewers]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Allow Template Self-Approval | Yes/No switch | Optional | Off (recommended): an author cannot approve or publish a template they authored or edited. Every person who saved the template counts as an author. Turn on only for solo practices, small sites or testing. | Off |
| Required Reviewers | Choice: 1, 2 or 3 independent reviewers | Optional | Approvals a template needs before it can be published. Each must come from a different Template Approver, Lab Director or Admin who is not one of its authors (unless self-approval is on). | 1 |
| SNOMED threshold | Read-only text, 80% | Not applicable | Shown in the subtitle. Not editable. | 80% |

**7. Permissions.** Open: `screen:configuration:open`. Change: `config:template-governance:manage` (high risk, audited; the change is recorded with the old and new values). Admin holds it by default; Lab Director does not, so grant it in Staff > Roles if the Lab Director should manage it. Without it the screen shows a notice that you can view but not change the settings.
**Known limits.** None known.

## CAP Synoptic Reporting Module Setup {#ch6-synoptic}
Breadcrumb: Home > Configuration > Synoptic Library

The Synoptic Library holds the structured checklists (protocols) pathologists fill in for cancer and other reporting. It is separate from report templates: a protocol defines the questions and their coding, a report template defines how a report looks. The Routing Rules screen links the two.

**What is actually in the library today (read this first).** On the demonstration data the registry holds 36 protocols: 32 Published, 3 In Review and 1 Draft. By source, 23 are `Custom` and 13 are `PathScribe`. **None is a licensed CAP or RCPath checklist.** The CAP, RCPath and ICCR names exist only as source labels on the Upload window and as the names of governing bodies. The 19 entries named "Generic Template" (breast, lung, prostate, colon, kidney, Wilms, melanoma and others) are placeholders at version `0.1.0-generic`. The rest are two generic synoptic test forms, PathScribe forms such as Mohs and neck dissection, medical liver, placenta and renal-transplant forms, autopsy gross examination, the three gold-standard grossing routes, and five cytology reporting systems (Bethesda thyroid, Milan salivary, Paris urinary, Papanicolaou pancreaticobiliary, lymph node FNA). A hospital that needs a CAP protocol must obtain it under CAP's own licence and bring it in by the routes below.

**How a protocol version gets in, and out.**

| Step | Status | What exists |
|---|---|---|
| Import a PathScribe protocol file (JSON) | Built | **Upload Protocol** reads the file, checks it, and saves it as a draft. It then goes through review like any other draft. |
| Check a CAP electronic checklist (eCC, SDC XML) or an Excel workbook | Partial | The file's format is checked and the number of sections and questions shown. It cannot be imported yet, and the content is not verified against CAP or RCPath. |
| Build a protocol in the editor | Built | **Build / Customise** starts from scratch or from a copy of an existing protocol. |
| Load a new version of an existing protocol | Built | **New Version** opens the editor with the next version number. Publishing it archives the version it came from. |
| Automatic nightly sync of CAP, RCPath or ICCR updates | Not built | The Governing Bodies screen has an Auto-sync switch per body, and the Upload window and notification texts mention a nightly sync, but no sync job exists in this build and none is in the server job list. The notification contract (`TEMPLATE_NOTIFICATIONS_API.md`) describes the messages a future sync job would send. Until then, load updates by hand. |
| Retire a protocol | Built | **Archive** removes it from new reports; reports already written keep their content. **Restore as draft** brings it back for review and republishing. |

**Lifecycle.** Draft, In Review, Needs Changes, Approved, Published, Archived. Action names follow the source: for CAP the approval step is **Accept** and the publish step **Release**; for RCPath they are **Ratify** and **Publish**; for Custom, PathScribe and ICCR they are **Approve** and **Publish**. Governance (self-approval, number of reviewers, the 80% SNOMED rule) is set in [Template Review](#screen-template_governance).

### Synoptic Library tab {#screen-tab-protocols}
Breadcrumb: Home > Configuration > Synoptic Library

**Status:** Built

**1. Navigation:** Configuration tab **Synoptic Library**
**2. Maintenance item:** The tab, with three sub-pages: **Active Protocols** (Validated, in-use checklists), **Review Queue** (Staged for approval) and **All Protocols** (Complete library).

**3. Business purpose and scope.** One place for the whole protocol lifecycle. The tab has no fields of its own; its three navigation entries open the sub-pages below.

**4. Prerequisites and dependencies.** Opens for anyone with `screen:configuration:open`. Which governing bodies appear in the library is set in [Governing Bodies](#screen-governing_bodies).

Setup step: Reference, not part of setup
Requires: [Governing Bodies](#screen-governing_bodies)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: tab-protocols - Synoptic Library tab with Active, Review Queue and All Protocols]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Active Protocols | Navigation entry, "Validated, in-use checklists" | Not applicable | Opens [Active protocols](#screen-protocols-active). | Selected |
| Review Queue | Navigation entry, "Staged for approval" | Not applicable | Opens the [Review queue](#screen-protocols-review). | Not selected |
| All Protocols | Navigation entry, "Complete library" | Not applicable | Opens [All protocols](#screen-protocols-all). | Not selected |

**7. Permissions.** Open: `screen:configuration:open`. Actions use the protocol capabilities listed on each sub-page.
**Known limits.** None known.

### Review queue {#screen-protocols-review}
Breadcrumb: Home > Configuration > Synoptic Library > Review Queue

**Status:** Built

**1. Navigation:** Configuration tab **Synoptic Library** > **Review Queue**
**2. Maintenance item:** Protocols waiting before publication

**3. Business purpose and scope.** Lists every protocol in a pre-publish state (In Review, Needs Changes, Approved), grouped by anatomical category, with a count tile for each state. A banner repeats the rule: templates need at least 80% SNOMED coverage and clinical sign-off before publishing. Click a card to open the reviewer (In Review, Approved) or the editor (Needs Changes). Draft protocols do not appear here; find them in All protocols.

**4. Prerequisites and dependencies.** Needs the review settings and the roles that do the work. Skip them and approval is refused because the person lacks the capability, or because a single author is trying to approve their own work.

Setup step: Tier 5, step 7
Requires: [Template Review](#screen-template_governance), [Roles](#screen-staff-roles), [Governing Bodies](#screen-governing_bodies)
Unlocks: [Active protocols](#screen-protocols-active)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: protocols-review - Review Queue with state counts and cards]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Search | Text | Optional | Matches protocol name, category or source. | Blank |
| State tiles | Read-only counts: In Review, Needs Changes, Approved | Not applicable | | Not applicable |
| Upload Protocol | Button | Not applicable | Opens the [Upload window](#ch6-upload-window). | Not applicable |
| Build / Customise | Button | Not applicable | Opens the [Build window](#ch6-build-window). | Not applicable |
| Card: name, version, source badge, type, owner | Read-only text | Not applicable | Protocol data. | Not applicable |
| Card: lifecycle badge | Read-only: In Review, Needs Changes, Approved | Not applicable | | Not applicable |
| Card: review note | Read-only text | Not applicable | The reviewer's last note, shown with a return or warning marker. | Blank |
| Card action | Opens reviewer ("Open Reviewer", or "Open Reviewer to Publish" when Approved) or editor ("Open Editor to Address Changes") | Not applicable | | Not applicable |

#### Reviewer actions {#ch6-reviewer-actions}
The reviewer page (opened from a card) moves a protocol between states. Each move asks for confirmation and, for a return, a reason.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Mark In Review | Button | Not applicable | Puts a draft in the review queue. | Not applicable |
| Approve (CAP: Accept; RCPath: Ratify) | Button with confirmation and optional final notes | Optional notes | Needs `config:protocol:approve`. A person who authored or edited the template cannot approve it unless self-approval is on, and cannot approve twice. | Not applicable |
| Publish (CAP: Release) | Button with confirmation | Not applicable | Needs `config:protocol:publish`, the required number of independent approvals, and at least 80% field-level SNOMED coverage for a diagnostic template. Publishing makes it available to all pathologists at once. | Not applicable |
| Needs Changes | Button with required reason | Required reason | Returns the protocol to the author. Needs `config:protocol:approve`. | Not applicable |
| Reset to Draft | Button | Not applicable | Returns a protocol to draft. | Not applicable |

**7. Permissions.** Draft, import, build, save, submit: `config:protocol:draft`. Approve and return for changes: `config:protocol:approve`. Publish: `config:protocol:publish`. Retire (archive, restore): `config:protocol:retire`. All high risk and audited. Template Author holds draft; Template Approver holds approve, publish and retire; Admin holds all four; Lab Director holds all but draft. Submitting, returning, approving and publishing each send a notification (to approvers, the author and so on).
**Known limits.** The reviewer and editor are separate full pages (`/template-review/:id`, `/template-editor/:id`). Their field-by-field reference is not part of this chapter's 15 screens; see [Template editor fields](#ch6-protocol-editor).

### Active protocols {#screen-protocols-active}
Breadcrumb: Home > Configuration > Synoptic Library > Active Protocols

**Status:** Built

**1. Navigation:** Configuration tab **Synoptic Library** > **Active Protocols**
**2. Maintenance item:** Published protocols

**3. Business purpose and scope.** The checklists currently offered in the synoptic reporting workflow (state Published), grouped by category and filtered by Surgical Pathology, Non-GYN Cytology, GYN Cytology or Grossing. Click a row to expand it for statistics, the lifecycle tracker and actions.

**4. Prerequisites and dependencies.** Protocols reach this list by being published from the review queue, so work the queue first. Skip it and the list is empty ("No protocols found").

Setup step: Tier 5, step 8
Requires: [Review queue](#screen-protocols-review), [Governing Bodies](#screen-governing_bodies)
Unlocks: [Routing Rules](#screen-templates-routing)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: protocols-active - Active Protocols grouped by category with an expanded row]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Group filter | Choice: All, Surgical Pathology, Non-GYN Cytology, GYN Cytology, Grossing, each with a count | Optional | | All |
| Search | Text | Optional | Matches name, category or source. | Blank |
| Upload Protocol | Button | Not applicable | Opens the [Upload window](#ch6-upload-window). | Not applicable |
| Build / Customise | Button | Not applicable | Opens the [Build window](#ch6-build-window). | Not applicable |
| Row: name, version, source badge, type, lifecycle badge | Read-only text | Not applicable | | Not applicable |
| Sections | Read-only number | Not applicable | An estimate: the field count divided by 7, rounded, minimum 1. It is not a count of the protocol's real sections. | Not applicable |
| Fields | Read-only number | Not applicable | | Not applicable |
| Last Modified | Read-only text | Not applicable | | Not applicable |
| Owner | Read-only text | Not applicable | | Not applicable |
| SNOMED CT coverage, ICD-10/11 coverage | Read-only bars, percent | Not applicable | Field-level coding coverage. | Not applicable |
| View Protocol | Button | Not applicable | Opens the read-only reviewer. | Not applicable |
| Duplicate | Button | Not applicable | Opens the editor with a copy (a new protocol). | Not applicable |
| Export JSON | Button | Not applicable | Downloads the protocol as a PathScribe JSON file; the export is audited. | Not applicable |
| New Version | Button | Not applicable | Opens the editor on the next version. Publishing the new version archives this one. | Not applicable |
| Archive | Button with confirmation | Not applicable | Removes it from new reports. A published protocol shows a stronger warning. Reports already written keep their content. Needs `config:protocol:retire`. | Not applicable |

**7. Permissions.** As for the [Review queue](#screen-protocols-review). Viewing and exporting need only the screen.
**Known limits.** The Sections figure is an estimate.

### All protocols {#screen-protocols-all}
Breadcrumb: Home > Configuration > Synoptic Library > All Protocols

**Status:** Built

**1. Navigation:** Configuration tab **Synoptic Library** > **All Protocols**
**2. Maintenance item:** The complete library

**3. Business purpose and scope.** Every protocol in every state, grouped by category. This is the only place to find drafts and archived protocols and to restore an archived one.

**4. Prerequisites and dependencies.** None beyond the library having content.

Setup step: Reference, not part of setup
Requires: [Review queue](#screen-protocols-review)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: protocols-all - All Protocols with status filter pills]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Status filter | Choice: All, Published, Approved, In Review, Needs Changes, Draft, Archived, each with a count | Optional | **All** hides archived protocols; they show only under **Archived**. | All |
| Search | Text | Optional | Matches name, category or source. | Blank |
| Upload Protocol, Build / Customise | Buttons | Not applicable | As above. | Not applicable |
| Row: name, version, source, type, lifecycle badge, review note | Read-only | Not applicable | | Not applicable |
| Open Reviewer | Button, not on Published or Archived | Not applicable | | Not applicable |
| Open Editor | Button, not on Published or Archived | Not applicable | | Not applicable |
| Duplicate, Export JSON, Archive | Buttons | Not applicable | As on Active protocols (Duplicate and Archive are not offered on an archived row). | Not applicable |
| Restore as draft | Button, archived rows only | Not applicable | Brings an archived protocol back as a draft; it must go through review again. | Not applicable |

**7. Permissions.** As for the Review queue.
**Known limits.** None known.

#### Upload window {#ch6-upload-window}
Breadcrumb: Home > Configuration > Synoptic Library > Upload Protocol

[SCREENSHOT PLACEHOLDER: protocols-upload - Upload Protocol window with governing body and file drop zone]

Subtitle: "Manual upload, the fallback if nightly sync misses an update". A warning states that an imported protocol is saved as a draft and must be submitted for review and approved before it can be published.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Governing Body | Choice: CAP, RCPath, ICCR, RCPA, Other | Required | Recorded as the draft's source. | CAP |
| File | JSON, XML or XLSX file, up to 10 MB, dropped or browsed | Required | Read and checked as soon as it is chosen. | None |
| Format check result | Read-only list | Not applicable | Says whether the format is valid, lists problems, and always states that the content is unverified against CAP or RCPath. Only a PathScribe JSON protocol is importable. A CAP eCC (SDC) XML form or an Excel workbook is checked but "can be checked here but not imported yet". | Not applicable |
| Import as draft | Button | Not applicable | Saves the draft. Refused if a protocol with the same name exists, or without `config:protocol:draft`. | Disabled until the file is importable |

#### Build / Customise window {#ch6-build-window}
Breadcrumb: Home > Configuration > Synoptic Library > Build / Customise

[SCREENSHOT PLACEHOLDER: protocols-build - Build / Customise window]

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Start from Scratch | Choice | Optional | Opens the editor on a blank template. | Not applicable |
| Existing Template search | Text | Optional | Searches by name, source or category. | Blank |
| Existing Template | Choice from the library, each showing version and field count | Optional | The template to copy. | None |
| Customise This Template | Button | Not applicable | Opens the editor on a copy. | Not applicable |

#### Template editor fields {#ch6-protocol-editor}
Breadcrumb: Home > Configuration > Synoptic Library > Template editor

[SCREENSHOT PLACEHOLDER: protocols-editor - Synoptic template editor with metadata, sections and fields]

The editor is a full page. Its **Template Metadata** block is below; sections and fields carry many further settings (field type, answer options with SNOMED and ICD coding, conditions, count rules, reporting roles pT, pN, pM, FIGO stage and block identifier). The full reference for that page is an open question for the guide.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Template Name | Text | Required | Must be unique among non-archived protocols. | Blank |
| Anatomical Category | Choice of category pills | Optional | Groups the protocol in the lists. | Blank |
| Source / Governing Body | Choice of source pills | Required | Decides the action names (Accept, Ratify, Approve). | Custom |
| Reporting standard | Text | Optional | For cytology systems, for example the Bethesda edition. | Blank |
| Staging edition | Text | Optional | For example `AJCC 8th`. | Blank |
| Version | Major, minor and patch numbers with bump buttons | Required | Bumped automatically on New Version. | `1.0.0` |
| Save Draft | Button | Not applicable | Needs `config:protocol:draft`. | Not applicable |
| Submit for Review | Button with confirmation | Not applicable | Moves the template to the Review queue and notifies admins and clinical leads. You cannot edit it until it is returned. | Not applicable |

## Scheduled Report Engine and Auto-Distribution Rules {#ch6-scheduled-delivery}
Breadcrumb: Home > Configuration > System > Administration & Compliance

Three settings decide what happens to a report after sign-out: **Delivery Configuration Rules** pick the channels, **Print Destination Routing Rules** pick the printer for the print channel, and **Delivery Schedules** pick the time. A fourth screen, **My exports**, lists files a person asked for.

**Channel status, one by one.**

| Channel | Status | What exists today |
|---|---|---|
| Fax | Built | A delivery rule can set a channel to E-fax with a fax number (7 to 15 digits, optional leading `+`). PathScribe sends the signed PDF and its details to the interface server as a `REPORT_DELIVERY` message; the server hands it to an e-mail-to-fax gateway. The gateway is set up on the server, not in PathScribe. If the server has no fax channel it answers 503 and the delivery fails with that reason. Contract: `REPORT_DELIVERY_API.md`; development receiver: `functions/report_delivery.py`. Maximum PDF size 20 MB. |
| Portal | Not built | There is no portal channel in the delivery rules. The Facility record has a **Delivery Method** choice (Email, Fax, Portal, HL7) that is stored but nothing reads it when a report is sent. |
| Secure e-mail | Demonstration | Not a delivery rule channel. A person starts a case-linked secure message from a window; it is delivered to the [Simulated mail outbox](#screen-simulated_mail) and nothing leaves the building. A real mail channel is not connected. |
| Print queue | Built | The Print channel creates a print job. The printer comes from the print routing rules, else the facility's own default destination. Jobs are managed on the Print Queue screen (see [Part 4](#ch6-batch-jobs)). |
| Electronic (result message) | Built | The result message to the interface engine. It is the default when no rule matches. |
| File drop | Built | The server writes the PDF to a folder or SFTP target. The rule names the target; the server holds its address and sign-in details. |

### Delivery Configuration Rules {#screen-delivery_rules}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Delivery Configuration Rules

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Administration & Compliance**
**2. Maintenance item:** Delivery Configuration Rules

**3. Business purpose and scope.** Decides how each released report is sent: through the result message, printed, faxed, dropped to a file target, or held for manual retrieval. A rule matches on provider, ordering facility, patient location (point of care) and report type. The rule matching the most fields wins. When nothing matches, the report goes **Electronic Only**. The screen also holds the site's automatic retry setting and a test panel.

**4. Prerequisites and dependencies.** Rules point at providers, facilities and locations, and a print channel needs somewhere to print. Skip the facilities and physicians and the criteria lists are empty. Skip print routing and a print job falls back to the facility's own default destination.

Setup step: Tier 5, step 10
Requires: [Facility Configuration](#screen-clients), [Physicians](#screen-physicians), [Print Destination Routing Rules](#screen-print_routing_rules)
Unlocks: [Delivery Schedules](#screen-delivery_schedules)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-delivery_rules - Delivery Configuration Rules with the rules table, retry setting and test panel]

**6. Field reference.**

Screen controls:

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Rules table: Criteria, Channels, Note | Read-only list | Not applicable | Criteria read as Provider, Facility, Location and Report, or "Matches every case (lowest priority)". Channels read as Primary, Secondary and Fallback lists, or "Nothing is sent". | Empty: every case resolves to Electronic Only |
| Add Rule | Button | Not applicable | Opens the rule window. | Not applicable |
| Edit, Delete | Row buttons | Not applicable | | Not applicable |
| Automatic retries: wait before each (minutes) | Whole minutes separated by commas, each 1 to 1,440, at most 10 | Optional | A print, fax or file drop that fails is retried after each wait in turn. After the last try it goes to the delivery exceptions, Admin and Lab Director are sent a message, and the rule's fallback channels are sent. Blank means no retries. | `1, 5, 15` |
| Save retries | Button | Not applicable | Needs `config:delivery-rules:manage`. | Not applicable |

#### Add or edit a delivery rule {#ch6-delivery-rule-window}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Delivery Configuration Rules > Add rule

[SCREENSHOT PLACEHOLDER: system-delivery_rules-edit - Add Delivery Rule window with criteria and channels]

Every criterion is optional. A rule with none set matches every case, but only as the lowest-priority match. The window warns about this.

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Provider | Picklist of physicians | Optional | | Any provider |
| Ordering Facility | Picklist of facilities | Optional | | Any facility |
| Patient Location (Point of Care) | Picklist of locations | Optional | | Any location |
| Report Type | Choice: Preliminary, Final, Corrected, Addendum | Optional | | Any report type |
| Channel: Electronic (result message to the interface engine) | Choice: Off, Primary, Secondary, Fallback | Optional | Primary and secondary channels go at once. Fallback channels go when a primary print, fax or file drop has nowhere to go or still fails after its retries. | Off |
| Channel: Print | Same | Optional | | Off |
| Channel: E-fax | Same | Optional | | Off |
| Channel: File drop | Same | Optional | | Off |
| Fax number | Text, 7 to 15 digits with optional `+` | Optional | Leave blank to fax the ordering physician, or without a fax number the ordering facility. | Blank |
| File-drop target | Text, the target's name as set up on the interface server | Required when File drop is on | The folder or SFTP server and its sign-in details are kept on the server, not in PathScribe. | Blank |
| Note | Text | Optional | Why the rule exists. | Blank |

A fallback with no primary is refused ("A fallback needs a primary channel to fall back from"). A fax number that is not 7 to 15 digits, or a file drop with no target, is refused.

#### Test Delivery Resolution {#ch6-delivery-test}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Delivery Configuration Rules > Test

[SCREENSHOT PLACEHOLDER: system-delivery_rules-test - Test Delivery Resolution panel]

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Provider, Ordering Facility, Patient Location, Report Type | Pickers, as above | Optional | The case details to test. | Any |
| Resolve | Button | Not applicable | Shows the matched rule, the resolved action (Electronic Only, Print Only, Dual Delivery, Suppress) and the channel plan. With no match it says the default Electronic Only applies. | Not applicable |

**7. Permissions.** Open: `screen:configuration:open`. Add, change, delete rules and save retries: `config:delivery-rules:manage` (high risk, audited). Admin and Lab Director hold it. Resending a failed delivery uses the Print Queue or Outbound screens and their own capabilities.
**Known limits.** Fax and file drop need the interface server to have those channels and targets set up. Portal is Not built. Secure e-mail is not a channel here.

### Delivery Schedules {#screen-delivery_schedules}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Delivery Schedules

**Status:** Partial

**1. Navigation:** Configuration tab **System** > group **Administration & Compliance**
**2. Maintenance item:** Delivery Schedules

**3. Business purpose and scope.** Sets **when** things go out, per feed, for the whole enterprise, with an optional override for a performing facility. Registries get a schedule each. PathScribe decides when an item may leave its queue; the interface engine decides how it is sent. Feeds: Report delivery, Billing delivery, Results feed, Admissions feed (ADT), Accession feed, LIS sync, Registry. **Partial:** the schedule is stored, resolved and evaluated, and the outbound queue shows each item's scheduled time and reporting-deadline flag. The contract says the production server must apply the same rules before handing an item on; a browser or development build does not hold a send until its time.

**4. Prerequisites and dependencies.** A facility override picks from the facilities, so those come first. Skip that and only the enterprise schedule can be set.

Setup step: Tier 5, step 11
Requires: [Facility Configuration](#screen-clients), [Delivery Configuration Rules](#screen-delivery_rules)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-delivery_schedules - Delivery Schedules by feed with enterprise and facility scope]

**6. Field reference.**

Screen controls:

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Schedules for | Choice: Whole enterprise, or one performing facility | Optional | The scope being edited. | Whole enterprise |
| Feed card: summary and source | Read-only text | Not applicable | The summary reads for example "Batch Mon, Wed at 06:00 (America/New_York)". The source reads "No schedule set: sent immediately", "Follows the enterprise schedule" or "Set for this facility". | Sent immediately |
| Registry cards | One card per registry | Optional | Each registry has its own schedule and never borrows another's. | Hold 240 minutes after sign-out; an amendment re-queues |
| Edit, Set for this facility, Follow the enterprise | Buttons | Not applicable | Create or remove a facility override. Removing it makes the facility follow the enterprise. | Not applicable |

#### Schedule editor {#ch6-schedule-editor}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Delivery Schedules > Edit

[SCREENSHOT PLACEHOLDER: system-delivery_schedules-edit - Schedule editor]

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| How it goes out | Choice: Send immediately, Only during set hours, In a batch at set times, Hold until final sign-out, At sign-out after a review hold | Required | | Send immediately |
| Hours when items may go out | Rows of Days, From, Until (24-hour); Add hours / Remove | Required for set hours | Each must end after it starts on the same day. | None |
| Frequency (How often) | Choice: Every day, Weekly, Monthly | Required for batch | | None |
| Batch days | Weekdays Mon to Sun | Required for weekly | | None |
| Days of the month | Numbers 1 to 28, comma separated | Required for monthly | | None |
| Batch times (24-hour) | Times such as `06:00, 22:00` | Required for batch | | None |
| Cutoff time (optional) | Time, 24-hour | Optional | Items signed out after this time on a run day wait for the next run. Blank uses the run time. | Blank |
| Review hold (minutes after sign-out) | Whole number, 1 to 10,080 | Required for review hold | Match it to the QA and amendment window. | None |
| Days with no sending | Dates `YYYY-MM-DD`, comma separated | Optional | For example holidays. Applies to hours and batch. | Blank |
| Time zone | IANA name, for example `America/New_York` | Required | The times above are read in this zone. | None |
| Reporting deadline (days from sign-out) | Whole number, 1 to 3,650 | Optional | The queue flags cases near (within 3 days) or past it. | Blank |
| An amendment puts the item back in the queue | Yes/No switch | Optional | A corrected report is sent again under this schedule. On by default for registries. | Off, except registries |
| Save schedule | Button | Not applicable | Refused if invalid or without permission. | Not applicable |

#### Try a schedule {#ch6-schedule-test}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Delivery Schedules > Try a schedule

[SCREENSHOT PLACEHOLDER: system-delivery_schedules-test - Try a schedule panel]

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Feed | Choice of feeds | Required | | None |
| Performing facility | Choice, or None (enterprise schedule) | Optional | | None |
| Registry | Choice | Required for the Registry feed | | None |
| Date and time (in the schedule's time zone) | Date and time | Required | | Now |
| The case is finally signed out | Yes/No | Optional | | No |
| Signed out at | Date and time | Optional | | Blank |
| Check | Button | Not applicable | Answers "It goes out" or "It waits", with the reason and the next opportunity. | Not applicable |

**7. Permissions.** Open: `screen:configuration:open`. Change: `config:delivery-schedules:manage` (high risk, audited by feed, facility, registry and kind only; no patient data). Admin and Lab Director hold it.
**Known limits.** Registry destinations, required fields, go-live approval and transport belong to the registry's own setup, not the schedule. See `DELIVERY_SCHEDULES_API.md`.

### Print Destination Routing Rules {#screen-print_routing_rules}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Print Destination Routing Rules

**Status:** Built

**1. Navigation:** Configuration tab **System** > group **Administration & Compliance**
**2. Maintenance item:** Print Destination Routing Rules

**3. Business purpose and scope.** Decides which network printer a released report's print job goes to. A rule's scope is a tier: **Workstation / User**, **Location**, **Client Account (Ordering Facility)** or **Facility (Performing Lab)**. The most specific tier with any matching, active rule wins outright over less specific tiers. Within a tier, a rule may be narrowed by specimen or case type and by event trigger. When nothing matches, the job goes to the facility's own default destination.

**4. Prerequisites and dependencies.** A rule names a printer reached through a site agent or by address, and a scope drawn from workstations, locations and facilities. Skip the site agents and only a printer address can be given. A facility rule must use that facility's own site agent printers.

Setup step: Tier 5, step 9
Requires: [Site agents](#screen-site_agents), [Facility Configuration](#screen-clients), [Workstations](#screen-workstations)
Unlocks: [Delivery Configuration Rules](#screen-delivery_rules)

**5. Screen.**

[SCREENSHOT PLACEHOLDER: system-print_routing_rules - Print Destination Routing Rules with table and test panel]

**6. Field reference.**

Screen controls:

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Rules table: Scope, Criteria, Destination, Note | Read-only list | Not applicable | Criteria read "Specimen: ...", "Trigger: ...", or "Matches every job at this tier". | Empty: jobs use each facility's default destination |
| Add Rule, Edit, Delete | Buttons | Not applicable | | Not applicable |

#### Add or edit a print routing rule {#ch6-print-rule-window}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Print Destination Routing Rules > Add rule

[SCREENSHOT PLACEHOLDER: system-print_routing_rules-edit - Add Print Routing Rule window]

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Scope Tier | Choice: Workstation / User, Location, Client Account (Ordering Facility), Facility (Performing Lab) | Required | | None |
| Scope | Workstation or user id (text, for example `ws-fgh-theatre2-01`), or a location or facility picklist | Required | A warning shows when it is missing. | None |
| Specimen / Case Type | Choice: Routine Surgical, Frozen Section, Cytology | Optional | | Any specimen/case type |
| Event Trigger | Choice: Initial Sign-out, Amended Sign-out (Corrected/Addendum), Preliminary | Optional | | Any event trigger |
| Print Destination: Printer | Choice: Site agent printer, or Printer address (sent directly) | Required | A direct address works only from a PathScribe server inside the hospital network; from the cloud use a site agent printer. | None |
| Site (performing lab) | Picklist | Required for a site agent printer | | None |
| Printer | Picklist of the site agent's report printers | Required for a site agent printer | Needs permission to see that site's printers. | None |
| Address | IP address or host name, no `http://` or path | Required for a direct address | | None |
| Protocol | Choice: IPP, LPR/LPD, Raw (port 9100) | Required for a direct address | | None |
| Port | Whole number 1 to 65535 | Optional | | The protocol's default |
| IPP path | Text | Optional, IPP only | | `/ipp/print` |
| LPR queue | Text | Optional, LPR/LPD only | | `lp` |
| Name | Text | Optional | A friendly name for the printer. | Blank |
| Note | Text | Optional | Why the rule exists. | Blank |

#### Test Print Destination Resolution {#ch6-print-test}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Print Destination Routing Rules > Test

[SCREENSHOT PLACEHOLDER: system-print_routing_rules-test - Test Print Destination Resolution panel]

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Workstation / User ID | Text | Optional | | Blank |
| Location, Ordering facility, Performing facility | Pickers | Optional | | Any |
| Specimen / Case Type, Event Trigger | Choices | Optional | | Any |
| Resolve | Button | Not applicable | Shows the matched rule and its tier, and the resolved destination. With no match it says the job would fall back to the facility's default destination. | Not applicable |

**7. Permissions.** Open: `screen:configuration:open`. Add, change, delete: `config:print-routing:manage` (high risk, audited). Naming a site's agent printer is checked at that site, as is seeing its printers. Admin and Lab Director hold it.
**Known limits.** The facility's default destination and print mode (QZ Tray named printer, interface engine hand-off, or direct network print), and its paper size, are set on the Printing tab of the facility record in the [Facility Dictionary](#screen-facility-dictionary), not here. Direct network printing needs a PathScribe server or site agent inside the hospital network; a browser cannot open a printer socket.

### My exports {#screen-my-exports}
Breadcrumb: Home > My exports

**Status:** Demonstration

**1. Navigation:** The exports button in the top bar, which shows a count of exports ready to download. The button appears only when an API server is connected; in the demonstration, open the page at `/my-exports`.
**2. Maintenance item:** The signed-in person's own export files

**3. Business purpose and scope.** Large exports (QA, audit, disposal and search reports) are prepared as background jobs. The person asks, is told when the file is ready, and downloads it here. Files are kept 7 days and only the person who asked can download them. In this demonstration exports download at once, so the list is normally empty. A banner marks the simulated server: exports are prepared in the browser and kept only until sign-out. The API contract is `ASYNC_EXPORT_API.md`; with the PathScribe server connected, a large export is prepared there and appears here when ready.

**4. Prerequisites and dependencies.** None to open it. An export appears only if its own export capability was granted (for example `qa:deficiencies:export`), so grant those in Staff roles for the people who need them.

Setup step: Reference, not part of setup
Requires: [Roles](#screen-staff-roles)
Unlocks: None.

**5. Screen.**

[SCREENSHOT PLACEHOLDER: screen-my-exports - My exports list with status, rows and download]

**6. Field reference.**

| Field Name | Data Type / Format | Required/Optional | Description & Business Logic | System Default |
|---|---|---|---|---|
| Export | Read-only text | Not applicable | The export's title. | Not applicable |
| Requested | Read-only date and time | Not applicable | | Not applicable |
| Status | Read-only: Waiting, Preparing, Ready, Failed, Cancelled, Expired | Not applicable | | Not applicable |
| Rows | Read-only number | Not applicable | | Not applicable |
| Deleted after | Read-only date | Not applicable | Seven days after the request. | Not applicable |
| Actions: Download, Cancel | Buttons | Not applicable | Download when Ready; Cancel while Waiting or Preparing. | Not applicable |
| Refresh | Button | Not applicable | | Not applicable |
| Make exports take longer (to try the waiting experience) | Yes/No switch, shown only on the simulated server | Optional | A demonstration control. | Off |

**7. Permissions.** The page needs only a signed-in person, and lists that person's own exports. Each export is requested under its own `...:export` capability, which is high risk and audited as `DOCUMENT_EXPORTED` with the row count.
**Known limits.** The server side is not connected. Configuration exports (dictionaries, crosswalks, the physician list) are small, stay in the browser and do not appear here. Scheduled saved-report runs (Search page, Report > Schedules) are Simulated and send nothing; they have their own contract in `SCHEDULED_REPORTS_API.md`.

## Batch Printing and Nightly Job Scheduler Setup {#ch6-batch-jobs}
Breadcrumb: Home > Configuration

**Status of this part:** Partial. There is no single "batch printing and nightly job scheduler" screen, and an administrator cannot create or edit a scheduled job. What exists is below, with the chapter that documents each screen.

| Item | Status | Where it is configured | Where it is documented |
|---|---|---|---|
| Print queue (hold, release, cancel, retry, redirect, bulk actions) | Built | Jobs are managed on System Logs > Interfaces > Print queue. Printers and routing are set in [Print Destination Routing Rules](#screen-print_routing_rules) and on the facility's Printing tab. | [System Logs: interfaces](#screen-audit-interfaces) |
| Batch print aggregation ("Run Batch Now") | Partial | A button on the Print Queue screen with a window start and end (24-hour times, read as UTC) and a grouping choice (Client account or Delivery route). It groups queued, non-interfaced jobs signed out in the window under shared batch ids. It runs only when someone presses it. A recurring job named `print.batchAggregation` appears in the server job list with no fixed interval, but no timetable is set in this build. | [System Logs: interfaces](#screen-audit-interfaces) |
| Label batch reprint | Built | Batch Management > Label reprint: find cases by accession date or number, pick cassettes, specimen containers or requisitions, pick a cassette printer, reprint one label at a time. Every label is audited; failed labels can be retried. Needs `label:batch:reprint`. | [Batch Management](#screen-batch-management) |
| Scheduled exports | Demonstration | Saved case-search reports can be scheduled (daily, weekly or monthly) from the Search page, Report > Schedules. A run is simulated and sends nothing. Large exports run as background jobs and are listed in [My exports](#screen-my-exports). | `SCHEDULED_REPORTS_API.md`, `ASYNC_EXPORT_API.md` |
| Server jobs (queue health, dead letters, requeue) | Built, read and requeue only | System Logs > Server jobs. Shows job kinds (interface dispatch, delivery attempt, print dispatch, held report release, charge dispatch, export build, event) and the recurring jobs with how often each runs. Needs `jobs:server-job:view`; requeueing a dead-lettered job needs `jobs:server-job:requeue`. | [System Logs](#screen-audit-log) |
| Nightly job scheduler (create, edit, enable or disable jobs) | Not built | Recurring jobs are fixed on the API server. The Server jobs screen lists them and shows their health but has no controls to change a time or switch one off. | Not applicable |
| Nightly protocol sync (CAP, RCPath, ICCR) | Not built | See [Synoptic Library](#ch6-synoptic). | Not applicable |

**Recurring jobs the server lists today** (minutes between runs): delivery retry sweep (0.5), release due sweep (0.25), consult link expiry (5), registry stale escalation (60), follow-up daily alerts (1440), support access expiry (5), cytology histology correlation sweep (1440), LIS polling (its own schedule), print batch aggregation (its own schedule), cytology ROSE SLA monitor (5), message bus purge (1440).

**Setup order for batch work.** There is nothing to configure for server jobs. For printing, finish [Print Destination Routing Rules](#screen-print_routing_rules), then check the Print Queue. For label reprint, set up the cassette printer under Printer Profiles first. Grant `label:batch:reprint` and the `print:job:*` capabilities in Staff roles to the people who run these.
