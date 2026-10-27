---
module: Grossing
workflow: Specimen Grossing
role: [Pathology Assistant, Pathologist]
keywords: [grossing, gross description, blocks, cassettes, specimen dissection, triage checklist, photos, piece count, fixation, margins, ink, complete grossing, gross complete]
routes: [/case/:caseId/grossing]
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
    There is no tile for Grossing on Home. Open the case on the [report](help:report) screen, select the Material tab, and choose **Open Grossing Screen**. **Back to Case** returns you to the report screen.

## Screen Tour

![The Grossing screen for a case, with one section per specimen](capture:grossing-overview)

The title reads "Grossing" followed by the accession number. Under it are the clinical history bar, the **Complete grossing** bar, and then one section for each specimen in the case. Work is saved as you go, except where a button says otherwise.

!!! note "Work done on other screens"
    This screen does not print cassette or slide labels, does not hold the triage checklist and does not take photos. Releasing and printing the cassettes, the triage checklist that must be confirmed before they are released, and the printed labels are on the report screen's Material tab. Gross description text is written on the report screen too. Photos taken during an intraoperative consultation are in the [Intraop Queue](help:intraop-queue). Block face photos are taken from the block editor on the report screen's Material tab, in a window headed "Capture Block Face Photo". Under a block's piece count or piece description the editor shows "Needed before grossing can be completed." when your laboratory requires the item.

### Field definitions

| Field | What it means |
|---|---|
| Specimen A, description | The specimen's label and description from accessioning. |
| Protocol: … (v…) | The grossing protocol attached to the specimen and its version, for example "Protocol: Breast core (v2)". |
| Protocol Modified | A badge shown when you have changed what the protocol produced (for example by adding a stain). |
| No protocol assigned | The specimen has no protocol. You cannot add blocks from this screen. |
| Fixation ended | The time the tissue left fixative. Shows "Record now" until recorded. |
| Fixative-to-tissue ratio | Your confirmation that the ratio was adequate. Shows "Confirm adequate ratio" until confirmed, then who confirmed it and when. |
| Block ID | The specimen letter and block, for example A1. |
| Piece Count | The number of tissue pieces in the block. Starts from the protocol's default. |
| Stains | The stains ordered on the block. Each is tagged Auto-generated (from the protocol) or User-added. |
| Status | Where the block is. Only a block that is still Pending can be removed. |
| Slide ID, Stain, Imager Batch, FOV Count | For cytology preparations only. Imager Batch shows "Not yet imaged" until the slide has been imaged. |
| Margins & Ink Applications | The margins recorded on the specimen or on a block: name, orientation, laterality, Examined or Pending, and each ink applied with who applied it and when. They are grouped under "On specimen" and "On block …" (for example "On block A1"). Until one is recorded the section says "No margins recorded yet." |
| Audit Trail (n overrides) | A collapsible list of changes you made to what the protocol produced: piece counts changed, stains added, protocol stains removed. When there are none it says "No overrides recorded." |

### Toolbar

| Button | What it does |
|---|---|
| Back to Case | Returns to the case on the report screen. |
| Complete grossing | Marks grossing finished and moves the case to Gross Complete. Greyed out while required items are missing. |
| Record now | Records the current time as the end of fixation. |
| Confirm adequate ratio | Records that you confirmed the fixative-to-tissue ratio. |
| Raise deficiency | Raises a quality deficiency for missing fixation information. |
| Add Block (pathway name) | Adds another block following that protocol pathway, with its default stains and piece count. |
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

## Step-by-Step Procedures

### Standard workflow

1. Open the case on the report screen, select the Material tab, and select **Open Grossing Screen**. The Grossing screen opens with one section per specimen.
2. Read the protocol line for the first specimen. If it says "No protocol assigned", see Exception handling.
3. Select **Record now** next to "Fixation ended" if the time the tissue left fixative is not yet recorded. The current time appears in its place.
4. Select **Confirm adequate ratio** once you have judged the fixative-to-tissue ratio. Your name and the time appear.
5. In the block table, check each block. Type the number of pieces in **Piece Count** and move to the next field. The change is saved and, if it differs from the protocol, listed in the audit trail.
6. To add a stain to a block, select **+ Add Stain**, choose the stain and select **Add**. The stain appears tagged User-added.
7. To add another block, select **+ Add Block** with the pathway name. The new block appears with its protocol stains.
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
