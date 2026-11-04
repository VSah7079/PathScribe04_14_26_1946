---
module: Grossing
workflow: Specimen Grossing
role: [Pathology Assistant, Pathologist]
keywords: [grossing, gross description, blocks, cassettes, specimen dissection, triage checklist, photos, piece count, fixation, margins, ink, complete grossing, gross complete]
routes: [/workstations/grossing, /case/:caseId/grossing]
previous: accession
next: pathology-workspace
related: [worklist, report]
status: Draft
---

# Grossing {#top}

## Overview

**Purpose.** The Grossing screen is where the person cutting up a case records the physical work: which blocks (cassettes) each specimen produced and how many pieces are in each, the stains ordered on each block, how long the tissue was in fixative, the margins and the ink used on them, and then marks the case as grossed. It works from the protocol attached to each specimen, so the blocks and stains a protocol calls for appear ready for you to adjust.

**Intended users.** Pathology assistants and pathologists who gross specimens. By default pathologists, fellows, residents and pathology assistants may complete grossing. If a button is greyed out, your role must allow it; ask your manager.

**Where it fits.** Grossing comes after the case has been logged in [Accession](help:accession) and before the tissue goes on to processing, embedding and cutting at the stations under [Pathology Workspace](help:pathology-workspace). Completing grossing moves the case to Gross Complete, and the case can then be sent to a pathologist pool.

!!! note "How you reach this screen"
    Pathology assistants and grossing pathologists use the **Grossing** tile under [Pathology Workspace](help:pathology-workspace). It lists the cases waiting to be grossed (urgent first, then oldest); choose **Gross** on a row, or type or scan an accession number, to open the case. Physicians can still open the same screen from the report: select the Material tab and choose **Open Grossing Screen**. **Back to Case** returns you to the report screen.

**Patient identity and typed entries (Batch 759).** This screen shows no patient name, date of birth or MRN. Check the accession number and the specimen source against the container; an outside case also shows its **Foreign case ID** (and a block or specimen's own **Foreign ID**). A typed id (when the scanner can't read a label) opens at once; a line says "Typed, not scanned: check the container shows … and …", and the typed entry is recorded quietly on the audit trail and in the scan history. See the Microtome page for the full account.

## Screen Tour

![The Grossing tile's queue of cases waiting to be grossed](capture:grossing-queue)

![The Grossing screen for a case, with one section per specimen](capture:grossing-overview)

The title reads "Grossing" followed by the accession number. Under it are the clinical history bar, the **Complete grossing** bar, and then one section for each specimen in the case. Work is saved as you go, except where a button says otherwise.

### The Grossing tile's queue

The Grossing tile's page is titled "Grossing Workspace" and has **← Back to Pathology Workspace**. The box labelled "Open a case by accession number" takes a typed or scanned accession. The list shows "Loading cases…" while it loads, and "No cases are waiting to be grossed." when the queue is empty. On the Pathology Workspace the tile reads "Gross cases and cut blocks".

### Bench tools

The **Bench tools** card sits above the Complete grossing bar. It has the tools you need at the bench, so you do not have to go back to the report screen.

| Tool | What it does |
|---|---|
| Print cassettes | Prints the cassette labels for the case. Greyed out if your laboratory's print settings do not allow batch printing. Also Alt+Shift+1, the words "print cassettes", or foot pedal 2. |
| Take a photo | Opens the camera for a gross photo of the first specimen and saves it on that specimen. Also Alt+Shift+2, the words "take a photo", or foot pedal 1. |
| Add-On Orders | Opens the Add-On Order Builder for this case. Also Alt+Shift+4 or the words "add-on order". |
| Carrier, Block to load, Load into carrier | Loads the chosen block into the chosen open carrier: a decalcification vessel or a processor basket (Batch 726; it used to offer decal batches only). A sealed carrier is not offered. It tells you "(block) is already in that carrier." or that it is in another active batch. Also Alt+Shift+3 or the words "send to decal". With this computer's station set, the load is recorded at the station. |
| Messages | With no open carrier the list reads "No open carrier". With no block yet: "There is no block to load yet." If the block cannot be found you see "That block could not be found." |
| Release panel (one per specimen with cassettes waiting) | Shows each waiting cassette with its colour. You can change the colour, remove a cassette, and confirm the triage checklist (or override it with a reason). **Release** is greyed out until the checklist is done. Releasing is always a click, never voice. |

Foot pedals use the bindings set up under your workstation's foot pedal settings. Hotkeys and phrases work only while this screen is open, and only if your role has been given them.

!!! note "Work done on other screens"
    Gross description text is written on the report screen. Photos taken during an intraoperative consultation are in the [Intraop Queue](help:intraop-queue). Block face photos are taken from the block editor on the report screen's Material tab, in a window headed "Capture Block Face Photo". Under a block's piece count or piece description the editor shows "Needed before grossing can be completed." when your laboratory requires the item.

### Field definitions

| Field | What it means |
|---|---|
| Specimen A, description | The specimen's label and description from accessioning. |
| Protocol: … (v…) | The grossing protocol attached to the specimen and its version, for example "Protocol: Breast core (v2)". |
| Protocol Modified | A badge shown when you have changed what the protocol produced (for example by adding a stain). |
| No protocol assigned | The specimen has no protocol. You cannot add blocks from this screen. |
| Fixation ended | The time the tissue left fixative. Shows "Record now" until recorded. |
| Fixative-to-tissue ratio | Your confirmation that the ratio was adequate. Shows "Confirm adequate ratio" until confirmed, then who confirmed it and when. |
| Block ID | The specimen and block labels together, for example A1 (specimen letter A, block 1) or 1A (specimen 1, block A). Your laboratory chooses letters or numbers for each. |
| Piece Count | The number of tissue pieces in the block. Starts from the protocol's default. |
| Type & pieces | Batch 732. Under the piece description: the block's type (Standard block, Megablock or Multi-piece block) and its piece count. **Type & pieces** opens the form: **Block type**, a note on the slides it produces ("Slides from this block: Large-format slide." for a megablock), and the piece map: **+ Add piece**, then for each piece its **Position**, **Part** (the specimen it came from), **Description**, **Orientation** and **Ink**, and × to remove it (Remove piece). **Save** stores it and sets the piece count; a megablock also gets the mega mold if none was chosen. Problems are listed above the buttons: "Choose a block type.", "Each position must be a whole number from 1.", "Two pieces have the same position.", "Each piece needs its part.", "Several pieces need the type Multi-piece block or Megablock." "Saved." or "Not saved. Check the pieces and try again." confirms. The block keeps one barcode; the pieces are details of it. |
| Stains | The stains ordered on the block. Each is tagged Auto-generated (from the protocol) or User-added. |
| Status | Where the block is. Only a block that is still Pending can be removed. |
| Slide ID, Stain, Imager Batch, FOV Count | For cytology preparations only. Imager Batch shows "Not yet imaged" until the slide has been imaged. |
| Margins & Ink Applications | The margins recorded on the specimen or on a block: name, orientation, laterality, Examined or Pending, and each ink applied with who applied it and when. They are grouped under "On specimen" and "On block …" (for example "On block A1"). Until one is recorded the section says "No margins recorded yet." |
| Audit Trail (n overrides) | A collapsible list of changes you made to what the protocol produced: piece counts changed, stains added, protocol stains removed. When there are none it says "No overrides recorded." |

### Divide specimen

Batch 741. Under each specimen, **Divide specimen** splits it into aliquots, one per destination (for example flow cytometry, microbiology, molecular). Enter **Starting volume (mL)**; each row has **For** (the purpose), **Volume (mL)**, **Destination type** (Department or Reference laboratory) and **Destination**. A fluid or FNA specimen's protocol pre-fills its usual rows; **+ Add aliquot** and **Remove** change them. The line under the rows accounts for the volume: "Split 8 mL of 30 mL; 22 mL remaining." **Divide** saves it once: "Divided into D2, D3; 22 mL remaining." A specimen can be divided once; the record then reads "Divided by (name), (time): 8 mL of 30 mL into aliquots, 22 mL remaining."

Each aliquot shows its volume and destination ("5 mL → Flow Cytometry") and its status: **Not sent**, **Sent**, **Received**, **Result back**. **Mark Sent** (and so on) moves it forward one step; the status never goes back. For **Result back**, type the **Receiving accession number** (the receiving department's own number for it) first. Results stay in that department's system.

Messages: "Enter the starting volume first.", "Add at least one aliquot.", "Every aliquot needs a volume above 0 mL.", "Every aliquot needs a destination.", "The aliquots add up to more than the starting volume.", "This specimen has already been divided.", "An aliquot's status only moves forward.", "Enter the receiving department's accession number to record Result back."

### Toolbar

| Button | What it does |
|---|---|
| Back to Case | Returns to the case on the report screen. |
| Complete grossing | Marks grossing finished and moves the case to Gross Complete. Greyed out while required items are missing. |
| Record now | Records the current time as the end of fixation. |
| Confirm adequate ratio | Records that you confirmed the fixative-to-tissue ratio. |
| Raise deficiency | Raises a quality deficiency for missing fixation information. |
| Add Block (pathway name) | Adds another block following that protocol pathway, with its default stains and piece count. The new block gets the next unused label in the case's style (A3 after A2, or 1C after 1B), and never repeats a label after a block was removed. |
| Remove Block | Removes a block that is still Pending. |
| Add Stain | Opens a list of the stains allowed for that block, which starts at "— select stain —"; choose one and select **Add**. |
| x beside a stain | Removes the stain. Hover text: "Remove stain". |
| Add margin / Add ink application | Records a margin, or a further ink on an existing margin. The margin form starts with a list "Attach to: specimen" or "Attach to: block …" (for example "Attach to: block A1"), then boxes prompting "Margin name (e.g. Lateral, Deep)", "Orientation (optional)" and "Laterality (optional)", and an ink list that starts at "Select ink color". |
| Audit Trail | Opens or closes the list of overrides for the specimen. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Grossing completed (with a tick) | Grossing has been completed for this case. |
| This case is past grossing. | The case has moved beyond the stage where grossing can be completed. |
| Highlighted block row | The block was changed from the protocol. |
| Auto-generated / User-added | Whether a stain came from the protocol or you added it. |
| Examined / Pending | Whether a margin has been examined. |
| Deficiency raised | A fixation deficiency is already open for the specimen. |
| Note under the Complete grossing button | "Still required" lists what is missing and where, for example "Piece count (A2)". |

### Hotkeys

These work on the Grossing screen. Each does what its button does, with the same checks.

| Key | Action |
|---|---|
| Alt+Shift+F9 | Complete grossing. You can also say "complete grossing", "finish grossing" or "grossing done". |
| Alt+Shift+F10 | Confirm completing without a protocol, while that window is open. |
| Alt+Shift+F11 | Cancel that window. |

### A cassette from another case, and the scan history

**Wrong case.** If you scan a cassette, block or slide that belongs to a different case from the one open, an orange warning says so, for example "S26-2-A1 belongs to case S26-2, not to S26-1 open here." **Set it aside** (the usual answer) closes the warning; **Continue anyway** closes it and is recorded in the audit log. Either way the scan is recorded at this station as a wrong item, with which case was open.

**Scan history.** **Show scan history** opens the case's station scan trail: every station scan of its cassettes, blocks and slides, newest first, with **When**, **Item**, **Where**, **Who** and **What happened**. It is shown only to people allowed to see scan history. **Hide scan history** closes it.

### Using a tablet at the bench

Since Batch 735 the station screens work with a finger, including a gloved one.

- **Touch layout.** On a tablet, buttons, chips and tick boxes are at least 44 px, main actions such as Confirm or Print are larger, and text in fields is 16 px. On a desktop the screen keeps its compact layout. Change this per computer with **Touch layout on this computer** in the station menu at the top (**Auto**, **Always on**, **Always off**).
- **Scanning.** The scan field accepts a barcode scanner without opening the on-screen keyboard and stays ready for the next scan. To type an ID by hand, select **⌨ Type**; **⌨ Scan** hides the keyboard again.
- **Keyboard up.** When you type in a field, the field stays in view. If the form's Save button would be hidden by the keyboard, a copy of it appears just above the keyboard.
- **Tooltips.** Tap a label that has extra information to read it.
- **Next case.** Scanning another case's accession number while nothing is selected opens that case's grossing screen, not its report.

## Step-by-Step Procedures

### Standard workflow

1. Open the case on the report screen, select the Material tab, and select **Open Grossing Screen**. The Grossing screen opens with one section per specimen.
2. Read the protocol line for the first specimen. If it says "No protocol assigned", see Exception handling.
3. Select **Record now** next to "Fixation ended" if the time the tissue left fixative is not yet recorded. The current time appears in its place.
4. Select **Confirm adequate ratio** once you have judged the fixative-to-tissue ratio. Your name and the time appear.
5. In the block table, check each block. Type the number of pieces in **Piece Count** and move to the next field. The change is saved and, if it differs from the protocol, listed in the audit trail.
6. To add a stain to a block, select **+ Add Stain**, choose the stain and select **Add**. The stain appears tagged User-added.
7. To add another block, select **+ Add Block** with the pathway name. The new block appears with its protocol stains and the next label in the case's style (letters or numbers, as chosen when the case was accessioned).
8. Record the margins: select **+ Add margin**, choose whether it belongs to the specimen or a block, enter the margin name (for example Lateral, Deep), optionally the orientation and laterality, choose the ink colour, tick **Mark this margin examined** if it applies, and select **Add**. The margin appears with its ink history.
9. Repeat for each specimen.
10. When no required item is missing, select **Complete grossing**. The bar changes to "Grossing completed", and the case is moved to the pathologist pool your laboratory has set up for it. A line reads "Routed to (pool name) pool." when that happens.

### Alternative workflow

1. To add a further colour to a margin already recorded, select **+ Add ink application** under that margin, choose the colour and select **Save**. The earlier inks stay in the history.
2. Use Alt+Shift+F9 or say "complete grossing" instead of selecting the button.
3. To see what has been changed from the protocol on a specimen, open its **Audit Trail**.

### Exception handling

1. If a specimen has no protocol, you cannot add blocks here. If your laboratory requires a protocol (the default), **Complete grossing** stays greyed out and the note names the specimen. Attach a protocol or grossing template on the report screen.
2. If your laboratory has switched the protocol rule off, a note says the specimen will be routed for secondary review. Selecting **Complete grossing** opens "Complete grossing without a protocol?". Select **Complete and route for review** (or press Alt+Shift+F10) to continue, or **Cancel** (Alt+Shift+F11). A "Grossed without protocol" deficiency is raised for each specimen.
3. If you remove a stain that came from the protocol, a window "Remove Protocol Default Stain?" asks you to confirm and the removal is recorded as an override. Removing a stain you added yourself needs no confirmation.
4. If fixation details are missing and you cannot supply them, select **Raise deficiency**. It changes to "Deficiency raised".
5. If a margin issue is shown under a margin ("Not yet examined", "No ink applied", or an ink colour that is not in the dictionary), fix it before completing. Depending on your laboratory's inking mode, an unresolved issue either opens a window headed "Unresolved margin-inking issue(s)" that lists the issues and lets you continue with **Proceed with Advisory Note**, or stops completion with "Grossing cannot be completed". There is no bypass on this screen.

### Error recovery

1. If **Remove Block** is greyed out, the block has already moved on from Pending. Hold the pointer over the button to see its status. It cannot be removed here.
2. If "This block can't be removed." appears, reload the case and try again.
3. If the message "This case was updated elsewhere. Reload to see the latest version." appears, select **Reload**. Your earlier changes were saved; redo the last one.
4. If a margin will not save, read the message under the form (for example, someone else changed the case, or you lack permission), reload and try again.
5. If "Grossing couldn't be completed. Try again." appears, select **Complete grossing** again.
6. If the Complete grossing button is gone and the screen says "This case is past grossing.", nothing more is needed here.

!!! warning "Completing grossing is recorded"
    Completing grossing moves the case on and is written to the audit trail. There is no button to undo it on this screen. Check piece counts and margins first.

## Tips and Best Practices

### Common mistakes

- Typing a piece count and not leaving the field. The count is saved when you move out of the box.
- Adding a stain to the wrong block. Remove it with the x beside it, then add it to the right one.
- Removing a protocol stain without meaning to. The confirmation window and the audit trail exist for this; read the window.
- Looking here for the cassette labels or the triage checklist. They are on the report screen's Material tab.

### Efficiency recommendations

- Use Alt+Shift+F9 when your hands are busy; the button's checks still apply.
- Look at "Still required" under the button to see exactly which block or specimen needs attention, instead of searching the table.
- Use **Record now** at the bench the moment the tissue leaves fixative so the time is accurate.

### Workflow recommendations

- Gross one specimen completely, then the next, so the "Still required" list stays short.
- Record margins and ink while the specimen is in front of you. The ink dictionary is set by your laboratory.
- Complete grossing before the tissue goes to processing so that it can be routed.

!!! note "What is limited today"
    Each block has a piece count and a piece description, and the case's matrix blocks (one cassette shared by several specimens) are listed under **Matrix blocks** with the same two fields. Your laboratory chooses whether Complete grossing requires them. The Next Block and Previous Block keys work on the report screen, not here. Pool routing and the demonstration protocols use sample data in this build.

## Related Features

### Upstream workflow

- [Accession](help:accession): the case and its specimens are logged and given grossing protocols.
- [Worklist](help:worklist): find the case waiting for grossing.

### Downstream workflow

- [Report](help:report): the Material tab, cassette release and printing, and the gross description.
- [Pathology Workspace](help:pathology-workspace): processing, embedding and cutting stations that receive the blocks.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| Complete grossing is greyed out | Required items are missing (see the note below the button), or your role may not complete grossing. |
| No Add Block button | The specimen has no protocol, or its protocol has no block pathway. |
| Remove Block is greyed out | The block is no longer Pending. |
| Stain list is short | Only the stains your protocol allows for that block are offered. |
| "Grossing can only be completed while the case is waiting for it." | The case has already moved past grossing. |
| "Grossing completed" shown but the case is not in a pool | No pool rule applied, or routing did not run. Ask your manager. |
| A line says a specimen could not be routed for secondary review | The deficiency could not be raised. Raise one by hand. |
| Margin issue prevents completion | An unresolved inking issue under your laboratory's inking rules. |

### Resolution steps

1. Read the note under **Complete grossing** and fix each item named.
2. Reload the page to get the latest version of the case.
3. Open the case on the report screen and check the specimen's protocol and the Material tab.
4. Ask your laboratory manager to check your role if a button stays greyed out.

### When to contact support

Contact your laboratory's PathScribe support when a block cannot be saved, the case does not reach Gross Complete after every item is complete, or a margin ink colour is missing from the list. Have the case number and the time of the problem ready.
