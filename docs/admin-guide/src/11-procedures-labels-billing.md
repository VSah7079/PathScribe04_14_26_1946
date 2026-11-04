---
chapter: 11
id: ch11
title: Step-by-step procedures: labels, billing and charge capture
---

# Step-by-step procedures: labels, billing and charge capture {#ch11}

This chapter is a set of numbered procedures. The screen chapters ([Chapter 2](#ch2) for labels and printers, [Chapter 8](#ch8) for billing and registries) say what each field means; this chapter says what to click, in what order, what you should see, and how to undo it. Each procedure names the screen it uses, so you can jump to the field reference when you need it.

Read these four points first.

1. **Status.** Every screen used here is **Built** or **Demonstration** as its own chapter says. Today most data services are browser-held demonstration services; the production API is connected service by service. A step that works in the demonstration may not yet be backed by the production server.
2. **Two people for billing tables.** Billing rules, the RVU Code Map, the CPT Modifier Dictionary and NCCI Edit Rules never take effect on their own. Whoever saves a change submits it, and a different person with approval rights approves it on [Pending Billing Rule Approvals](#screen-pending_approvals). On a one-person system nobody can approve, so plan for a second approver before you start (see [Approve or reject a change](#ch11-bill-approve)).
3. **Things that do not exist.** There is no fee schedule or price field anywhere in the billing rules, no way to copy a label layout from one label type to another, and no MIPS or MACRA reporting. Each is marked **Not built** where it comes up, with the nearest thing that does exist.
4. **Permissions.** Each procedure lists the capability it needs. If a button is greyed out, you do not hold the capability. Who holds it by default is in the Permissions part of the screen's own section.

## Part A: Labels {#ch11-labels}
Breadcrumb: Home > Configuration > System > Workstation & Hardware > Label Designer

PathScribe has nine label types: Requisition, Specimen (Container), Block (Cassette), Slide, Decant Container, Molecular Specimen, Molecular Plate, Molecular Rack and Molecular Deck Location. A **layout** is where each field sits on one label type, in millimetres, on a label of fixed size. The size cannot be changed.

How a layout is used, so you know what you are changing:

- A layout is kept per label type. There is one **Enterprise Default** for each type. Only Requisition, Specimen and Decant Container also allow a **facility override**. Block, Slide and the four Molecular types show **Enterprise Standard: Locked** and can be edited only at the enterprise default, because every site must print the same physical format for cassette, slide and instrument hardware.
- When a label prints, PathScribe uses the facility override if one exists and is allowed, otherwise the Enterprise Default, otherwise the built-in layout. A saved layout with no fields placed counts as no layout, so the built-in layout is used.
- The print paths for all nine label types read the saved layout this way. Printing a label for a real case shows the layout you saved, not only the preview.
- The designer previews with sample values (for example patient name `Maria Garcia`, accession `DVMC26-0001`). It is not a live case.

Permission: opening the screen needs `screen:configuration:open`. Save, reset and restore need `config:label-layouts:manage` (high risk, audited). Reference: [Label Designer](#screen-label_designer).

### Open the Label Designer and choose what to edit {#ch11-lbl-open}
Breadcrumb: Home > Configuration > System > Workstation & Hardware > Label Designer

1. Select **Configuration** from Home, then the **System** tab.
2. In the group **Workstation & Hardware**, select **Label Designer**.
3. In **Label Type**, choose the label. The canvas resizes to that label's fixed size, and the caption under it shows the size, for example "50.8mm × 25.4mm — live preview using sample data".
4. Look at the **Scope** control next to it.
   - For Requisition, Specimen and Decant it offers **Enterprise Default** and one "(facility name) (override)" entry per active facility.
   - For every other type it shows **Enterprise Standard: Locked** instead of a choice, and you edit the enterprise default.
5. Choose the scope you want to edit.

Expected result: the canvas shows the saved layout for that type and scope, or is empty if none has been saved.

Be careful: **changing Label Type, or Scope, replaces what is on the canvas with the saved layout for the new choice, with no warning.** Changing Label Type also puts Scope back to Enterprise Default. Save before you switch.

### Create a layout from nothing {#ch11-lbl-create}
Breadcrumb: Home > Configuration > System > Workstation & Hardware > Label Designer

Use this when a label type has no saved layout yet (the canvas is empty and **Available Fields** lists every field).

1. [Open the Label Designer](#ch11-lbl-open) and choose the label type and scope.
2. Under **Available Fields**, drag a field onto the canvas where you want it. Fields you have already placed disappear from the list, so a field cannot be placed twice. When none are left the list says "All fields placed."
3. Drag a placed field to move it. It keeps the point where you grabbed it, and it stops at the label's edge.
4. Click a placed field to select it. Eight handles appear on it (hover text "Drag to resize"). Drag a handle to resize. Handles show only on the selected field.
5. For an exact position, use the **Inspector** panel on the right: **X (mm)**, **Y (mm)**, **Width (mm)**, **Height (mm)** and **Font Size (mm)**. Type a number and move out of the box. Values are kept inside the label.
6. The barcode field draws a real sample barcode at the label type's symbology. If the sample cannot be drawn the field shows "barcode render failed" instead; the layout can still be saved.
7. If any field goes past the label edge it is outlined, and a warning reads "N field(s) go past the edge of the label and would print off it." Select **Fit to label** to bring every field inside.
8. Select **Save Layout**.

Expected result: a message under the buttons. "Enterprise default saved." when you edited the enterprise default, "Facility override saved." when you edited a facility override. If a field is past the edge the message is "Not saved: a field goes past the edge of the label. Use “Fit to label”, or move or resize it." and nothing is saved.

To undo: use [Version history](#ch11-lbl-history) to restore an earlier version, or [Reset to Default](#ch11-lbl-history) to remove the layout.

### Edit an existing layout {#ch11-lbl-edit}
Breadcrumb: Home > Configuration > System > Workstation & Hardware > Label Designer

1. [Open the Label Designer](#ch11-lbl-open) and choose the label type and scope you want to change. The saved layout loads.
2. To change a field, click it on the canvas, then move it, resize it, or use the Inspector.
3. To remove a field, select it and choose **Remove Field**. It returns to **Available Fields**.
4. To add a field, drag it from **Available Fields**.
5. Select **Save Layout**. Every save is kept as a new version, with who saved it and when.

Expected result: "Enterprise default saved." or "Facility override saved." The next label printed for that type and facility uses the new layout.

To undo: [restore the previous version](#ch11-lbl-history).

### Make a facility override from the enterprise default (copy) {#ch11-lbl-override}
Breadcrumb: Home > Configuration > System > Workstation & Hardware > Label Designer

This is the one way to copy a layout. It works only for Requisition, Specimen and Decant Container labels.

1. [Open the Label Designer](#ch11-lbl-open) and choose one of those three label types.
2. In **Scope**, choose the facility, shown as "(facility name) (override)".
3. If that facility has no override yet, the canvas opens with the enterprise default's layout. This is the starting copy.
4. Change whatever the facility needs. Leave the rest alone.
5. Select **Save Layout**. The message is "Facility override saved."

Expected result: the facility now has its own layout, separate from the enterprise default. A later change to the enterprise default does not change it, and a facility with no override keeps following the enterprise default.

To go back to following the enterprise default: choose that facility's scope and select **Reset to Default** (see [below](#ch11-lbl-history)).

**What cannot be copied.** There is no copy between two facilities, no copy between two label types, and no export or import of a layout as a file. A layout belongs to one label type, and each type offers its own list of fields. To build a second facility's layout, start from the enterprise default as above, or place the fields again by hand. **Not built:** a facility-to-facility or type-to-type copy.

### Show a field only when another field has a value {#ch11-lbl-condition}
Breadcrumb: Home > Configuration > System > Workstation & Hardware > Label Designer

Use this to hide a line when its data is missing, for example the referring provider on a label.

1. Open the layout and click the field you want to make conditional.
2. In the Inspector, find **Show this field**. It shows **Always**. Open it and choose the other field to test. The barcode and the field itself are not offered.
3. A second choice appears. Choose one of:
   - **when that field has a value**
   - **when that field is empty**
   - **when that field equals**, then type the **Value to match** (matching ignores upper and lower case).
4. To see how the label prints when the tested field is empty, tick **Preview with that field empty**. This changes the preview only.
5. Select **Save Layout**.

To undo: set **Show this field** back to **Always**.

### Version history, restore, and reset {#ch11-lbl-history}
Breadcrumb: Home > Configuration > System > Workstation & Hardware > Label Designer

**See and restore a version.**

1. Choose the label type and scope.
2. Select **Version history**. The list is headed "Saved versions of this layout". Each row reads "Version N, saved (when) by (who)". A layout never saved shows "This layout has not been saved yet."
3. Select **Restore this version** on the row you want.

Expected result: "Version restored and saved as the newest version." The restore is itself a new version, so the old versions stay. The designer keeps the 20 most recent versions of each layout.

**Reset to Default.** Select **Reset to Default** to remove the saved layout for the chosen type and scope. The canvas clears and the message is "Layout reset to default." Printing then uses the next level: for a facility override, the enterprise default; for an enterprise default, the built-in layout. Reset needs `config:label-layouts:manage`.

### Export printer code and test the label {#ch11-lbl-export}
Breadcrumb: Home > Configuration > System > Workstation & Hardware > Label Designer

Use this to check that a layout fits and scans before you trust it, without printing on a real label.

1. Open the layout (saved or not). The export uses what is on the canvas, so you do not have to save first.
2. Select **Export ZPL**, **Export EPL** or **Export DPL**. A box appears headed **Exported ZPL**. It carries this heading for all three languages; read the note above the text to see which language it holds.
3. Select the text and copy it.
4. For ZPL, open the viewer named on the screen (`labelary.com/viewer.html`), set 203 dpi (8 dpmm) and the label size shown, and paste. Check that every field is on the label and the barcode scans.
5. Or send the code to your own printer yourself.

Things to know:

- ZPL is the language PathScribe sends to printers (through QZ Tray). **EPL and DPL are export text only.** PathScribe never sends them to a printer; the screen says the text is a starting point and barcode commands differ a little between printer models.
- The barcode in the export is a sample value, not a real case's barcode. The export confirms fit and general scannability, not the exact encoding of a real label (for example a real GS1 GTIN for cassettes and slides).

### Send labels to the right printer {#ch11-lbl-printer}
Breadcrumb: Home > Configuration > System > Workstation & Hardware > Print Settings

A layout decides what is on the label. Printer settings decide where it prints. Set up the printer once, then test.

1. Register the printer on [Printer Profiles](#screen-printer_profiles): select **+ Add Printer Profile**, enter the **Printer ID**, **Model**, **Bridge Type**, **DPI** and the other fields, and save. Only the QZ Tray bridge sends labels directly today. Any other bridge falls back to the browser print dialog.
2. Open [Print Settings](#screen-print_settings) (Configuration > System > Workstation & Hardware > Print Settings).
3. To change one facility only: in the facility selector, choose the facility, then select **+ Create Facility Override**. This copies the system default so the facility can differ. Until you do, the facility shows the default and is read-only.
4. Under the printer profile pickers, choose the profile for **Container Label Printer Profile**, **Molecular Label Printer Profile** and **Requisition Label Printer Profile**. Each control saves as you change it. With no profile chosen the label goes to the browser print dialog ("Use browser print dialog").
5. For cassette and slide labels, set the label face (width, height, barcode module size, text height) and the **GS1 GTIN**. Without a GTIN each real GS1 print is refused with an error. The fit check under each shows a warning when the barcode or text will not fit.
6. Select **Send Test Print**, choose a profile, and hold the printed label against a real cassette, container or slide before use.

Expected result: a test label prints through the chosen profile. If a field is cut off, adjust the layout in the Label Designer or the face size in Print Settings and test again.

Permission: Print Settings changes need `config:print-settings:manage`; printer profiles need `config:printers:manage`.

### Reprint labels for many cases {#ch11-lbl-reprint}
Breadcrumb: Home > Batch Management > Label reprint

1. Open **Batch Management** from Home and select the **Label reprint** tile ("Reprint labels for many cases at once").
2. Enter at least one of **Accessioned from**, **Accessioned to**, **Accession number from**, **Accession number to**. With all four empty, no cases are found ("No cases match. Enter a date range or an accession number range.").
3. Select **Find cases**. The list shows each case, oldest first, with a **Reprint** tick box and its specimens ("N cases found; N selected").
4. Under **Labels**, tick **Cassettes**, **Specimen containers** and/or **Requisition**.
5. If you ticked Cassettes, choose the **Cassette printer**. Without one the screen says "Choose the cassette printer first."
6. Select **Reprint labels**. Labels print one at a time, about a quarter of a second apart, with a "Printing N of M…" counter.
7. When it ends, read the summary: "Printed N; failed N; blocked by the on-demand guardrail N." Select **Retry N failed labels** to try the failures again.

Every label is audited. The permission is `label:batch:reprint` (Histotechnologist and Admin hold it by default). Without it the screen says "You don’t have permission to reprint labels in a batch." Reference: [Batch Management](#screen-batch-management).

### Choose letters or numbers for specimens, blocks and slides {#ch11-lbl-numbering}
Breadcrumb: Home > Configuration > System > Integrations > Facility Configuration

The Label Designer decides how a label looks. This setting decides what the specimen, block and slide labels say. It is set separately for **Specimens**, **Blocks** and **Slides**, each **Letters** or **Numbers**, on the enterprise as the default and, if a lab needs it, per lab.

1. Open **Configuration > System > Integrations > Facility Configuration** and edit the **Enterprise** facility (the one with "This is a top-level Enterprise institution" ticked). On the **General** tab find **Letters or numbers for labels**.
2. Set **Specimens**, **Blocks** and **Slides**. The line under the selectors shows the result, for example "Specimen A · Block 1 · Slide L1" and "Cassette A1 · slide label A1 L1". **Preset** sets Specimens and Blocks together to one of the two original pairs and leaves Slides alone.
3. Save. Every lab under the enterprise follows these choices.
4. To give one performing lab its own labels, edit that lab (**Parent Enterprise** set to the enterprise) and change only the selectors that differ. A selector left on **Same as enterprise (value)** keeps following the enterprise, and shows its current value in brackets.

What each choice does:

| Choice | Letters | Numbers |
|---|---|---|
| Specimens | A, B, C... then AA, AB... | 1, 2, 3... |
| Blocks | A, B, C... (joined to the specimen: A**A**, 1**A**) | 1, 2, 3... (A**1**, A**2**) |
| Slides | The printed level reads La, Lb, Lc | The printed level reads L1, L2, L3 (as before) |

- **Slides change the printed text only.** The code inside a slide's barcode and its slide ID stays L1, L2, L3 whichever you choose, so scanning, reprints and every existing slide keep working. Screens that list a slide's level (for example the Microtome Workstation) still show L1, L2.
- **New cases only.** The choice in force when a case is accessioned is saved on the case. Specimens, blocks and slides added to that case later (Add Block at Grossing, Add Block on the report page, a specimen leaving a Biopsy Array) follow it, even if the facility changes afterwards. Nothing already printed, scanned or signed out is relabelled. There is no "Relabel existing" action: **Not built**. Relabelling would change cassette and slide barcodes that are already on tissue.
- **Same kind for Specimens and Blocks.** You may choose letters for both or numbers for both. A label such as AA or 11 can then mean two things (specimen A block A, or a specimen past Z; specimen 1 block 1, or specimen 11). The screen says so; it does not stop you.
- **Existing facilities keep their labels.** A facility that had the old single choice keeps it: it opens as the matching Specimens and Blocks choices, with Slides following the enterprise (numbers unless set).
- Each change is written to the audit log ("Facility label style changed" or "Enterprise label style changed", with the old and new choice per level).

Expected result: the next case accessioned for that lab shows specimens labelled in the chosen style, and Add Block at Grossing or on the report page continues the sequence.

Permission: saving a facility needs `config:facilities:manage`. Reference: [Facility Dictionary](#screen-facility-dictionary).

## Part B: Billing and charge capture {#ch11-billing}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups

The order matters, because later screens read earlier ones. Work in this order the first time:

1. [RVU Code Map](#screen-rvu_code_map) and [CPT Modifier Dictionary](#screen-modifier_dictionary): the lists the billing rules pick from.
2. [Billing Dictionary](#screen-billing_dictionary): the billing rules.
3. [NCCI Edit Rules](#screen-ncci_edit_rules): bundling pairs.
4. [Pending Billing Rule Approvals](#screen-pending_approvals): a second person approves steps 1 to 3.
5. [Charge Release Triggers](#screen-billing_type_triggers) and [Billing Release](#screen-billing_release): when a charge is created and when it is released.
6. [Master Payment Type Dictionary](#screen-master_payment_types) and [Jurisdiction Payment Mapping](#screen-jurisdiction_payment_mappings): who pays.
7. [Billing Export Preview](#screen-dft_export_preview): check what a real case would send.

All of these live under **Configuration > System** and need `screen:configuration:open`; Billing Release is in the group **Administration & Compliance**, the others in **Financial & Revenue Lookups**.

**What PathScribe does with a charge.** At final sign-out it resolves each charge once into a fixed record: CPT or HCPCS code, relative value units (RVU) and modifier. Later edits to a rule do not change a charge already made. **Fee schedules: Not built.** There is no price, dollar amount or payer rate field. Your billing system or the interface engine works out reimbursement. The nearest things are the RVU values on a rule and in the RVU Code Map.

**Auto-coding is not set up on a screen.** The suggested codes (special stains, immunohistochemistry, frozen sections) come from rules built into the product, and a person always confirms them. The only screen that touches the nearest setting is [Smart Capture](#screen-smart_capture). Base specimen codes (88302, 88305, 88309) are not worked out automatically. See [Auto-coding and billing hold rules](#ch8-autocoding-holds).

### Add a code to the RVU Code Map {#ch11-bill-rvu-add}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups > RVU Code Map

Capability: `config:billing-rvu:manage`. Approval needs `config:billing-tables:approve`.

1. Open **RVU Code Map**. The **Active version** table lists the codes; **Search** narrows it.
2. Select **+ Add Code**. The window is headed "Add Code".
3. Enter **Code** (for example `88305`) and **Billing Code** (placeholder "Often same as Code"). Both are required.
4. Choose **Level** (Specimen, Block, Stain or Decant) and **Component Type** (TC, 26 or Global). The Component Type decides when the charge is created: TC at specimen grossing complete, 26 and Global at case sign-out.
5. Optionally enter **Description**, **HCPCS Code** and the **Work RVU**, **RVU — Practice Expense** and **RVU — Malpractice** values. Leave **Work RVU** blank if you have not verified it; the row then shows **Unverified**. A Work RVU must be a positive number.
6. Select **Submit for Approval**.

Expected result: a message "(code) submitted for approval — see Pending Billing Rule Approvals." A code that already exists in the active version is refused ("Code (code) already exists in the active version."). The change does not apply until a second person [approves it](#ch11-bill-approve).

To undo: before approval, the second person rejects it. After approval, edit the code and submit again.

### Edit or bulk-load the RVU Code Map {#ch11-bill-rvu-edit}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups > RVU Code Map

**Edit one code.**

1. In the Active version table, select **Edit** on the row. The window is headed "Edit — (code)". **Code** and **Billing Code** are locked.
2. Change the other fields and select **Submit for Approval**.

**Load many codes from a file.**

1. Select **Download Template**, fill it in a spreadsheet and save it as `.csv`. Columns are Code (or HCPCS), Description and WorkRVU.
2. Select **Upload Spreadsheet** and choose the file. A file that is not `.csv` is refused with a message telling you to save it as CSV. A file with no usable rows says "No real rows found in this file - check it has Code and WorkRVU columns."
3. The window **Review before saving** shows the codes found. Only payable codes load; the screen tells you how many non-payable or modifier rows it skipped.
4. Enter a **Version label** and an **Effective date**.
5. Select **Submit for Approval (N codes)**.

Expected result: "(label) submitted for approval". The whole file becomes one pending version. Uploaded rows get their level guessed from the description (specimen if unclear) and billing type Global; check them after approval. Older versions stay under the older-versions toggle with their status (Approved (superseded), Pending approval, Rejected).

### Edit or upload the CPT Modifier Dictionary {#ch11-bill-mod}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups > CPT Modifier Dictionary

Capability: `config:billing-modifiers:manage`. The dictionary is a reference list only. PathScribe sets the modifier from the billing type (TC takes `-TC`, 26 takes `-26`, Global none). It does not check or add any other modifier.

**Change one description.**

1. Select **Edit** on a modifier row. The window is headed "Edit — (code)".
2. Change the **Description** and select **Submit for Approval**.

**Replace the list from a file.**

1. Select **Download Template**, fill in Code and Description, save as `.csv`.
2. Select **Upload Spreadsheet** and choose the file. The window "Import Modifier Dictionary — (file name)" shows the rows read.
3. Enter a **Version Label** and **Effective From** (a valid date is required).
4. Tick **I confirm my organization holds a real, current AMA license covering these modifier descriptions.** The upload does not go ahead without it, and says "Confirm you hold a real, current AMA license for these modifier descriptions before importing."
5. Select **Submit for Approval**.

Expected result: a pending version waits for a second person. The shipped descriptions are placeholders (marked synthetic); the American Medical Association text is licensed, so only load your own text if you hold the licence.

### Create a billing rule {#ch11-bill-rule-new}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups > Billing Dictionary

Capability: `config:billing-rules:manage`. Prerequisite: the CPT code exists in the [RVU Code Map](#screen-rvu_code_map). The CPT picker reads that map, and an empty map gives an empty picker.

1. Open **Billing Dictionary**. The table lists each billing code's current rule for the scope in **Viewing**. **Viewing** starts on Enterprise-Wide; choose a site to see or add that site's rules.
2. Select **+ Add Billing Code**. The window is headed "New Billing Code", with two tabs: **Billing & RVU** and **Coding Rules**.
3. On **Billing & RVU**, enter **Billing Code** (for example `IHC-FIRST`), choose **Scope** (Enterprise or a site), and optionally **Country**.
4. Choose the **CPT Code** by searching the RVU Code Map entries. Optionally search an **HCPCS Code**.
5. Choose **Level** (Specimen, Block, Stain or Decant) and **Component Type** (TC, 26 or Global). Enter **Description**. Enter the **RVU — Work**, **RVU — Practice Expense** and **RVU — Malpractice** values, or leave **RVU — Work** blank if unverified ("Never fabricated — leave blank if unverified.").
6. Enter **Effective From**. Optionally add **Notes**.
7. On the **Coding Rules** tab, add any reminders: **Modifiers Commonly Associated**, **Quantity Rule**, **Bundling Rule**, **Documentation Requirements**, **Suppression Advisory**. These are stored for audit and the billing system only. PathScribe never validates, enforces or suppresses a charge because of them.
8. Select **Create Billing Code**.

Expected result: the rule is saved as version 1 with status **DRAFT**. A DRAFT is not used. Continue with [Submit a rule for approval](#ch11-bill-rule-submit).

### Submit a rule for approval {#ch11-bill-rule-submit}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups > Billing Dictionary

1. On the rule's row, select **History**. The window is headed "Version History — (code) ((scope))" and lists every version with its status.
2. On the DRAFT row, select **Submit for Approval**.

Expected result: the status becomes **PENDING_APPROVAL**, and the audit log records "Billing rule submitted for approval". The rule now waits on [Pending Billing Rule Approvals](#screen-pending_approvals). The statuses a version can have are DRAFT, PENDING_APPROVAL, ACTIVE, REJECTED and RETIRED.

### Change a rule: a new version {#ch11-bill-rule-version}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups > Billing Dictionary

Versions are only ever added; you never overwrite one.

1. Make sure **Viewing** is the scope you want to change (Enterprise-Wide or a site).
2. On the rule's row select **New Version**. The window is headed "New Version — (code) ((scope), v(N))" and is filled from the latest version. (A row marked **Inherited** has no rule of its own at that site; it shows no **New Version** button. Use **Duplicate** to give the site its own.)
3. Change the fields. **Change Reason** is required when the scope already has versions.
4. Select **Create New Version**. It saves as DRAFT.
5. [Submit it for approval](#ch11-bill-rule-submit).

Expected result: when a second person approves it, the new version becomes ACTIVE and the version it replaces ends. Charges already created keep the values they were made with.

### Copy a rule, or give one site its own rule {#ch11-bill-rule-dup}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups > Billing Dictionary

**Duplicate** copies a rule into a new billing code, a different site, or both. It is how you start from an existing rule.

1. On the rule's row select **Duplicate**. (You can also select **History**, then **Duplicate** on a version row to copy an older version.) The window is headed "Duplicate — (code) ((scope), v(N))" and is filled from the rule.
2. Change **Billing Code**, **Scope**, or both. To give a site its own version of an enterprise rule, keep the code and choose the site as **Scope**. When the code or scope changes, the window explains "This will create a real, new, independent version 1 for this billing code + scope combination".
3. Change any other fields, enter **Effective From** and **Change Reason** if asked.
4. Select **Save Duplicate**. It saves as DRAFT.
5. [Submit it for approval](#ch11-bill-rule-submit).

Expected result: at that site, the site rule replaces the enterprise rule (**Scope** on the row shows **Site Override** instead of **Inherited**).

### Retire a rule {#ch11-bill-rule-retire}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups > Billing Dictionary

1. On the rule's row select **History**.
2. On the ACTIVE version, select **Retire**. There is no confirmation window.

Expected result: the status changes to RETIRED. Retire is offered only on an ACTIVE version. If a site override is retired, that site goes back to the enterprise rule (shown as **Inherited**). To bring a retired rule back, create a new version or [duplicate](#ch11-bill-rule-dup) it and approve it.

### Approve or reject a change {#ch11-bill-approve}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups > Pending Billing Rule Approvals

Capability: `config:billing-tables:approve`. The person who drafted or submitted a change cannot approve it (Four-Eyes Principle). That includes you if you submitted it: the button is locked and the hint reads "You drafted or submitted this change — a different reviewer is required (Four-Eyes Principle)."

1. A different approver opens **Pending Billing Rule Approvals**. Two tables can show. **Pending Billing Rule Approvals** lists billing rule versions (billing code, CPT, RVU (Work), effective date, scope, drafted by, submitted by, change reason). **Pending Dictionary Updates** lists whole-table updates: modifier dictionary versions, NCCI imports, RVU Code Map versions and bulk code imports.
2. Check the row. For a table update, the label tells you which upload it is.
3. Select **Approve** to activate it, or **Reject**. **Reject** opens a box: enter a reason (required, "A real rejection reason is required.") and select **Confirm Reject**.

Expected result: an approved item takes effect; a bulk code import applies the whole job. A rejected item ends, and its reason shows on the older-versions list of the screen it came from. Both decisions are audited.

If nobody else can approve (a one-person system), the change stays pending. Grant `config:billing-tables:approve` to a second person in [Roles](#screen-staff-roles).

### Upload or edit NCCI bundling pairs {#ch11-bill-ncci}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups > NCCI Edit Rules (Bundling)

Capability: `config:billing-ncci:manage`. **No real National Correct Coding Initiative data ships.** The seed is one synthetic pair, and the screen warns while it is active. The holder of the licensed CMS file loads it.

1. Select **Download Template**, fill the columns Column 1, Column 2, Modifier Indicator (`0`, `1` or `9`), Effective Date and Deletion Date, and save as `.csv`.
2. Select **Upload Spreadsheet** and choose the file. Rows with a problem are skipped and listed ("N rows skipped:" with the row and reason: a missing code, an indicator other than 0, 1 or 9, or a missing effective date).
3. Enter the **Quarter Version** (for example `2026Q3`).
4. Select **Submit for Approval (N pairs)**.
5. To change one pair, select **Edit** on its row, change the **Modifier Indicator** or **Deletion Date**, and select **Submit for Approval**. An edit sends the whole table again as a new pending import.

Expected result: a pending import waits for [approval](#ch11-bill-approve). Only pairs with indicator `0` raise a deficiency at sign-out; `1` and `9` do not.

### Set when each charge is created {#ch11-bill-triggers}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups > Charge Release Triggers (TC/26/Global)

Capability: `config:billing-triggers:manage`. Defaults: **TC (Technical Component)** at **Specimen grossed**; **26 (Professional Component)** and **Global (Combined)** at **Case signed out**.

1. Open **Charge Release Triggers**. The selector shows "Viewing: Enterprise-Wide". To change one site only, choose "Viewing: (site name)". A site that already has an override is marked "(has override)".
2. For each billing type, open the **Releases At** list and choose **Specimen grossed** or **Case signed out**. Each change saves at once, with "✓ Saved (scope)". There is no Save button.
3. To undo, select **Reset all to real default** (enterprise) or **Reset (site) to Enterprise-Wide** (a site). The button is greyed out when there is no override.

Expected result: only charges created from then on follow the new setting. Charges already made are not changed. Each change and reset is audited ("Charge release trigger changed", "Charge release triggers reset to default").

### Add, edit or remove a billing release (hold) rule {#ch11-bill-release}
Breadcrumb: Home > Configuration > System > Administration & Compliance > Billing Release

Capability: `config:billing-release:manage`. A release rule says what happens to a charge once it exists: release at once, hold it a set time, or release it in a scheduled batch. The most specific matching rule wins. When no rule matches, the charge is released at its milestone. PathScribe decides what and when; the interface engine moves the message.

1. Open **Billing Release**. **Rules for** starts on **Whole enterprise**; choose a facility to see its own rules. A facility with none shows "This facility has no rules of its own and follows the enterprise rules."
2. Select **Add a rule**. The window is headed "Billing release rule: (scope)".
3. Under **Applies to**, choose **Billing type** (Any billing type, Technical component (TC), Professional component (-26), Global). Optionally enter **Case types (specimen categories)** separated by commas (empty means every case), choose an **Ordering site**, enter the **Primary pathologist (ID)**, and choose **Amendment reports** (Original or amended, Original reports only, Amended reports only).
4. Under **Release**, choose **Release mode**:
   - **Release after a hold**: enter **Hold (minutes)**. A technical charge is counted from grossing, the others from final sign-out. `0` means at once. The limit is 30 days (43,200 minutes).
   - **Release in a batch**: choose **How often** (daily or weekly), the **Batch days** for weekly, the **Batch times** (24-hour, comma separated; a charge goes in the first batch after its milestone) and the **Time zone**. The window shows the same schedule as a cron line.
5. Tick or clear **Release automatically when due** (clear it to keep charges until a person releases them from the [Outbound Queue](#screen-outbound-queue)) and **Park for review when the code is unmapped or the technical facility is missing**.
6. If the window shows a problem in red, fix it. **Save rule** stays greyed out until there are none. Possible problems: "Choose a billing type from the list.", "Choose a release mode.", "The hold must be a whole number of minutes, 0 or more, up to 30 days.", "A batch rule needs a batch schedule.", "Choose which reports the rule applies to.", "Case types can't be empty entries."
7. Select **Save rule**. The screen shows "Saved." (or "Not saved." if it was refused).

To change a rule select **Edit**; to delete one select **Remove** (no confirmation window). A charge from an amended report, a charge whose CPT is unmapped, and a split case with no technical facility are always parked for review, whatever the rules say.

**Test a rule before you rely on it.** Under **Try a charge**, enter the **Billing type of the charge**, **Case type**, **Performing facility**, **Charge generated (UTC)**, and tick whichever apply (**From an amended report**, **A delta charge of the amendment**, **The CPT code is mapped**, **The technical-component facility is missing**, **The case is finally signed out**, with **Final sign-out (UTC)**). Set **Check at (UTC)** and select **Check**. The result is Released, Waits, Waits for a person or Parked for review, with the rule that matched.

### Add or change a payment type {#ch11-bill-paytype}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups > Master Payment Type Dictionary

Capability: `config:payment-types:manage`. A payment type is a category of payer (self pay, commercial insurance, national health service). Eleven are seeded.

1. Open **Master Payment Type Dictionary**.
2. To add one, select **+ Add Payment Type**. Enter **Category ID** (stored in capitals, spaces become underscores, for example `SELF_PAY`) and **Display Name**. Both are required, and a duplicate ID is refused (the **Create** button stays greyed out).
3. Tick **Requires Subscriber ID** if staff must enter a policy number, and if so optionally enter its label (for example "NHS Number" or "Claim #"). Choose **Requires Guarantor** (Required, Optional or Not Required). Tick **Supports Split Billing** if technical and professional parts may go to different payers. Add **Notes** if you wish.
4. Select **Create**.
5. To edit, select **Edit** on a row, change the fields and select **Save Changes**. The **Category ID** is locked ("locked — referenced by Jurisdiction Mappings") because mappings point to it.
6. To retire one, select **Deactivate**; to bring it back select **Reactivate**. **Show inactive** lists inactive rows too.

Notes: there is no Duplicate button here. Deactivating a type is not checked against the mappings that use it, so check [Jurisdiction Payment Mapping](#screen-jurisdiction_payment_mappings) first.

### Add or change a jurisdiction payment mapping {#ch11-bill-mapping}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups > Jurisdiction Payment Mapping

Capability: `config:payment-mappings:manage`. A mapping ties a local payer scheme to one payment type. The Primary Jurisdiction selector on the accessioning Outside Patient Data tab reads these.

1. Open **Jurisdiction Payment Mapping**. Use the country filter and **Show inactive** to find rows.
2. Select **+ Add Mapping**. Enter **Country Code** (for example `US`, `UK`, `DE`, `CA_ON`), **Local Scheme Code** (for example `DE_GKV`), **Local Display Terminology** (the local-language name), choose the **Master Payment Type** (only active types are offered), and enter **Primary Outbound Format**. All five are required. Add **Notes** if you wish.
3. Select **Create**. Codes are stored in capitals.
4. To change one, select **Edit**, change the fields and select **Save Changes**. To hide one from accessioning select **Deactivate**; to bring it back, **Reactivate**.

Notes: nothing checks for a repeated country and scheme code. The **Primary Outbound Format** (for example `X12 837P`) is a label only. No file is generated; X12 837P, KVDT and SESAM-Vitale output are Planned.

### Check what a case would send, and read the financial log {#ch11-bill-check}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups > Billing Export Preview

**Preview the charge payload.** Capability `config:interface-preview:view`.

1. Open **Billing Export Preview** and enter a case id or accession. The case must be finalised and have charges.
2. Read the **JSON payload**. This is what PathScribe sends: the charge lines (CPT or HCPCS, RVU, modifier) and the financial class from the payment type and mapping. It carries no dollar amounts. The **HL7 DFT^P03 preview** beneath it is an illustration only; PathScribe does not build or send HL7.
3. If the case has an open billing deficiency, the export is blocked until the deficiency is resolved. **Send to billing engine** goes to a simulated engine in the demonstration ("Simulated" badge).

**Find a billing event in the log.** Capability `screen:audit-log:open`.

1. Open **System Logs** and select the **Financial** tab, sub-tab **Billing Logs**.
2. Filter by **Case Number**, **Patient ID (MRN/MPI)**, **Type** (Charge, Credit, Deficiency, Code Review, Dispatch, Amendment, Audit), **Status** and the date ranges. Select **Search**. At most 50 cases show; "Case limit reached" appears when more match.
3. To export the result select **Export CSV** (needs `audit:billing-log:export`).

**Fix a charge that failed to send.** On the **Outbound DLQ** sub-tab, find the case in the Failed table. If the error is `MISSING_ICD10` or `MISSING_PROVIDER_NPI`, use **Fix & Retry** (**Save & Re-queue** attaches the code or NPI to the case and re-queues it, and is audited). Use **Retry Dispatch** to try again, or **Capture as CAPA** to raise a deficiency. **Simulate Timeout** and **Simulate Rejected** are test buttons only. Real dispatch is not built.

### Choose and approve a cancer registry {#ch11-bill-registry}
Breadcrumb: Home > Configuration > System > Lab Materials & Workflows > Cancer Registry Reporting

Capability: `config:cancer-registry:manage`. PathScribe builds one structured JSON payload for the chosen registry. It does not write NAACCR XML, COSD XML or any other registry file format; the interface engine translates and sends. Every cancer registry's specification is marked as not verified against the registry's own, so a person must confirm it. There is no Spain registry.

**Choose the registry.**

1. Open **Cancer Registry Reporting**.
2. Set **Enterprise Default registry**. With none chosen, no cancer report is made.
3. Optionally tick **Honours opt-out**. It is off by default; when off, a patient who opted out is still reported and the audit log records it.
4. Select **Save**.
5. For one facility that reports elsewhere, select **+ Add Override**, choose the **Facility** and **Registry**, and **Save**. **Remove** takes the override away.

**Take a registry live.**

1. In the **Registry (go-live)** panel, choose the registry. Enter the **Agreement reference** for the data-sharing agreement and select **Record agreement**.
2. On a validation instance, select **Run test suite** (needs `registry:test-suite:run`), then **Export validation record**. On a production instance, import that record file under **Validation record file**.
3. Tick **Specification confirmed** (required for registries whose specification is not verified) and, if you have it, enter the **Registry test sign-off reference**.
4. Check the **Go-live pre-checks** list. Then select **Request go-live**.
5. An approver (`registry:live-register:approve`) chooses **I am approving as**, selects **Approve with my credentials**, and re-enters their credentials. The number of approvals needed (1 to 3) and whether the requester may approve are settings on a production instance.
6. To cancel a request select **Withdraw request**. To stop reporting select **Stop live reporting**.

Expected result: a production instance sends real results only to a registry with a current approval; results for others are held. Each request, approval and stop appears in the **Go-live history**. The same panel appears on [Cytology Registry Reporting](#screen-cytology_registry). Reference: [Cancer Registry Reporting](#screen-cancer_registry_settings).

### Not built: fee schedules and quality reporting {#ch11-bill-notbuilt}
Breadcrumb: Home > Configuration > System > Financial & Revenue Lookups

- **Fee schedules: Not built.** There is no screen, field or contract for a price or payer rate. Keep prices in your billing system.
- **MIPS and MACRA quality reporting: Not built.** See [Quality and public health reporting](#ch8-quality-reporting). The nearest things are the reporting feed to a business intelligence tool and the CSV exports.
- **Auto-coding from the report text by AI: Not built.** The rule-based code suggestions are described in [Auto-coding and billing hold rules](#ch8-autocoding-holds).
- **X12 837P, KVDT and SESAM-Vitale output: Not built.** The payload is JSON for the interface engine.

## Common problems {#ch11-problems}
Breadcrumb: Home > Configuration > System

| What you see | Likely cause | What to do |
|---|---|---|
| A label type shows **Enterprise Standard: Locked** and no facility choice | Block, Slide and the four Molecular types allow only an enterprise default | Edit the enterprise default. A facility cannot override these types. |
| "Not saved: a field goes past the edge of the label." | A field is outside the label | Select **Fit to label**, or move or resize the field, then save. |
| The canvas changed and my edits are gone | Changing Label Type or Scope reloads the saved layout without warning | Save before you switch. Use **Version history** to recover a saved version. |
| A saved layout does not appear on the printed label | The layout has no fields (it counts as none), or a facility override is hiding the enterprise one | Check the scope you saved to. For a facility, an override takes the place of the default. |
| The text after **Export EPL** is headed "Exported ZPL" | The heading does not change | Read the note above the text; it says which language the text is in. |
| Labels open the browser print dialog instead of printing | The printer profile is not on the QZ Tray bridge, or no profile is chosen | Set the profile on [Printer Profiles](#screen-printer_profiles) and choose it in [Print Settings](#screen-print_settings). |
| "Choose the cassette printer first." | Cassettes were ticked on Label reprint with no printer | Choose the **Cassette printer**. |
| The CPT search in a billing rule is empty | The RVU Code Map has no active codes | Add codes and have them approved. |
| A change never takes effect | It is waiting for a second person, or it was rejected | Open **Pending Billing Rule Approvals**; a different person approves. |
| **Approve** is locked | You drafted or submitted the change | Ask a different approver. |
| **Retire** is not offered | Only an ACTIVE version can be retired | Check the version's status in **History**. |
| No **New Version** button on a row | The row is **Inherited** from the enterprise | Use **Duplicate** to give the site its own rule. |
| "Code (code) already exists in the active version." | The code is already in the RVU Code Map | Edit it instead. |
| The modifier upload does nothing | The licence box is not ticked, or the effective date is blank | Tick the licence confirmation and enter a valid date. |
| A deficiency blocks the billing export | An open billing deficiency exists on the case | Resolve it, then export again. |
| Charges release too early or too late | A trigger or a release rule differs from what you expect | Check [Charge Release Triggers](#screen-billing_type_triggers), then test with **Try a charge**. |
| A payment type cannot be picked for a mapping | The type is inactive | **Reactivate** it on the Master Payment Type Dictionary. |
