---
module: Workstations
screen: Microtomy
workflow: Bench and Workstation Work
role: [Histotechnologist, Laboratory Manager]
keywords: [microtomy, microtome, sectioning, cutting, slide label, print etch, recut, levels, add stain, control slide, decant, fluid, cytology prep, block exhausted, batch print, reprint]
routes: [/workstations/microtomy]
previous: workstations/embedding
next: workstations/slide-distribution
related: [pathology-workspace, batch-management, add-on-orders, workstations/embedding, workstations/slide-distribution, voice-and-keyboard]
status: Draft
---

# Microtomy Workstation {#top}

## Overview

**Purpose.** The Microtomy Workstation is the bench screen for the person cutting blocks. You scan a block (or a cytology decant or fluid container), see every slide that has been ordered from it, add stains and levels, and print or etch the slide labels, either one slide at a time as you cut or as a batch. It also lets you write comments for the block or a slide, flag a block that has run out of tissue, and read what each slide will be billed.

**Intended users.** Histotechnologists at the microtome, and laboratory managers who oversee the bench. The screen opens only for roles that have the Microtomy screen switched on; by default that is the Histotechnologist role. If the tile is missing from the Pathology Workspace, ask your laboratory manager.

**Where it fits.** Embedding comes first: the block was embedded at the [Embedding Station](help:workstations/embedding). Slides are ordered from the report screen, from [Add-On Orders](help:add-on-orders), or here. After cutting and staining, finished slides move on to the [Slide Distribution Station](help:workstations/slide-distribution). The microtomy bench is also one of the processing steps tracked in [Batch Management](help:batch-management). You reach this screen from the [Pathology Workspace](help:pathology-workspace) (the **Microtomy Workspace** tile) or with the **Go to Bench** button in the top bar when your station is a microtomy station.

!!! note "Printers and labels today"
    Slide labels go to the label printer set up for your scan station. In a demonstration setup the printing is simulated, and the **Label Preview** is always a drawing of the label (a pattern standing in for the barcode), not the barcode itself. Check the first real labels on your laboratory's own printer.

## Screen Tour

![The Microtomy Workstation with a block open: block summary on the left, slide grid in the middle, print controls on the right](capture:workstations-microtomy-overview)

The page is titled **Microtomy Workstation**. A **Back** button at the top left returns to the Worklist (not to the Pathology Workspace). Before anything is scanned, the screen shows only the prompt "Scan a block or decant/fluid container barcode to begin" and a scan box. Once a block or decant is open, a grey bar shows its identity and the screen splits into three columns.

!!! note "Your station"
    The top bar carries a small station indicator (a pin and a station name). The label printer used here is the one linked to **that** station. If it says "No station", click it and choose your bench. Station setup is an administrator task; see the Administrator Guide.

### Field definitions

**Identity bar (after a scan)**

| Field | What it means |
|---|---|
| Accession | The case number. |
| Patient | Patient name, as recorded on the case. |
| DOB | Date of birth, in your language's date format. |
| Specimen/Block | The specimen letter and block (or decant) label, for example A1. |
| Type | The specimen description. |
| Scan next block/decant → | Closes this work item and returns to the scan box. Nothing is lost: each change is saved as you make it. |

**Left column**

| Field | What it means |
|---|---|
| Tiny Tissue, Fragile, Decal Required | Three alert badges on the block. A bright badge is on, a dim one is off. Select one to switch it. They show on the embedding screen too. Blocks only, not decants. |
| Block exhausted | Opens a window to tell the ordering pathologist the block has no tissue left. Greyed out unless your role has the permission to flag a block exception (Histotechnologists have it by default). After you flag, a line beside the button says where the notice went. See Exception handling. |
| Cores in this matrix block | For a matrix block (several specimens in one block): each position and the specimen in it. |
| Status, Piece count, Tissue | The block's current status, the piece count recorded at grossing, and its tissue description. |
| Block comments | Opens the comment window for the block. The number in brackets is how many comments exist. |
| Prior Slide History | Each slide already printed on this block, newest first, with its print time. Reads "No slides printed yet for this block." when there are none. |
| Billing | Read only. One row per slide with its billing codes and state (Applied, Declined, No billing code, Pending review) and, where a charge exists, its progress (Awaiting billing approval, Approved, Charged, Exported, On hold, Rejected by billing). Warnings appear above the rows, for example that charges are waiting for billing approval, or that a matrix-block slide is billed once the pathologist confirms which cores were evaluated. |
| $ Full billing review | Opens the full billing panel for the case. It is greyed out unless you have the billing review permission. |

**Center column: Slide Grid**

| Column or control | What it means |
|---|---|
| Level | The slide's level on this block, shown as L1, L2 and so on, with the cut depth in micrometres when one was given, for example "L2 (4µm)". A level number is never reused, even when a slide is removed. |
| Stain | The stain name. A **Control** badge marks a control slide paired with a patient slide. An **On Label** badge means a comment on that slide will print on the label. |
| Print Status | Pending, Printing…, Printed, Failed or Canceled. A failed slide shows the printer's message under the badge. "Reprinted 2×" shows how often a slide has been reprinted. |
| Actions | Print, Reprint, + Level, the comment button (speech bubble with a count), Remove. See the Toolbar table. |
| Checkbox column | Appears only in Batch print mode. Used to choose slides to print together. Printed and canceled slides cannot be ticked. |

**Add a stain (under the grid)**

| Field | What it means |
|---|---|
| Category tabs | Special Stains, IHC, Cytology, Molecular, Other. They filter the list. |
| Search stains… | Narrows the list by name. |
| Select a stain… | The stain to add. Required. |
| × | How many identical slides to add, from 1 to 12. |
| µm | The cut depth. Optional unless your organisation requires it (then it carries a red star). |
| Pair with control slide | Blocks only. Also adds a control slide for the stain. |
| + Add | Adds the slide(s). A line beginning "Still required" names anything missing, and the button stays grey until it is complete. |

**Decant panel (replaces the left block summary for a decant)**

| Field | What it means |
|---|---|
| Total Volume (mL) | Volume of the fluid. Saved when you leave the box. |
| Appearance | Clear, Bloody or Turbid. |
| Decant Yield / Pellet Size | Low, Moderate or High. |
| Suggested preparation | Appears once a yield is chosen. For example "2× ThinPrep (Liquid-Based), 2× Cell Block, 1× Direct Smear (Air-Dried)". |
| Accept suggestion | Adds the suggested slides that are not on the decant yet. Pressing it again adds nothing: once every suggested slide is on the decant the button is replaced by the line "The suggested slides are already on this decant." The suggestion counts a slide with the same preparation method that has not been cancelled, including one you added yourself. |

**Right column**

| Field | What it means |
|---|---|
| Print Mode | On-Demand or Batch. It starts in your laboratory's default. |
| Next unprinted slide | The slide that **Print/Etch Next** will print. Reads "Every slide on this block has been printed." when none is left. |
| Device Status | The printer for your station, with Ready, Print Error or Offline. Messages here explain why: no station selected, the station is not set up for slide-label printing, or its printer profile no longer exists. |
| Label Preview | A drawing of the label of the next slide (or, in Batch mode, the first ticked slide), with its size in millimetres. A warning appears if the label's text cannot fit its face. |

### Prompts and messages

| Text | Where and what it means |
|---|---|
| Scan or type a barcode… | Grey hint in the scan box. Scan, or type the barcode and select **Go**. |
| No comments yet. | Shown in the comment window when the block or slide has no comments. |
| No slides on this block yet. | Shown in the **Billing** panel when no slide has been ordered, so there is nothing to bill. |
| {{width}} mm × {{height}} mm | The size of the label face under **Label Preview**, for example 25 mm × 10 mm. The numbers replace the braces. |
| {{count}} slide(s) selected | In Batch print mode, how many slides are ticked for **Print Batch**. |
| Flag block as exhausted | The title of the window that **Block exhausted** opens. It explains the consequence, takes a note and flags the block. |
| Undo (message at the bottom of the screen) | Shown for 8 seconds after you remove a slide or reprint one, with the slide's name and the reason. **Undo** puts the slide back as it was. It disappears by itself, when you scan the next block, or when you remove or reprint another slide. After you use it, the message says the slide is back. |
| Reprint of … undone. If the extra label already came out of the printer, discard it. | After undoing a reprint. The record is put back, but the label has already gone to the printer, so throw it away. |
| No ordering pathologist is recorded for this slide, so the notice was sent to the Supervisor / Accessioning Desk. | Green line beside **Block exhausted**, after flagging a slide that was not ordered through Add-On Orders (an original H&E, say). |
| The block was flagged, but nobody could be told … | Red-edged line beside **Block exhausted**. The flag is saved, but there is no ordering pathologist and no Supervisor / Accessioning Desk address. Tell your supervisor. |
| You don’t have permission to flag a block exception. Ask your administrator. | Shown in the Block exhausted window if the permission was withdrawn after the screen opened. |

### Toolbar

| Button | What it does |
|---|---|
| On-Demand / Batch | Switches the print mode. |
| Print/Etch Next | On-Demand mode. Prints the next unprinted slide in the grid. If nothing prints, a red line above the columns says why: the block is flagged exhausted, "The print couldn't be started.", or the printer's own message. The line goes away at the next print, or when you scan the next block. |
| Print Batch | Batch mode. Prints every ticked slide, one after another, in grid order (not the order you ticked them). A **Batch Print Progress** window shows each slide as Pending, Printing…, Printed or Failed. |
| Print (on a row) | On-Demand mode. Prints that one slide. |
| Reprint (on a row) | Printed slides only, on a block or a decant. Choose a reason from the list (Jam, Scratched Glass, Misprint, Other); the label prints again as soon as you choose, and an **Undo** message appears for a few seconds. |
| + Level | Adds another level of the same stain, with no cut depth. |
| Comment button | Opens the comment window for that slide (on a block or a decant); its tooltip reads "Slide comments". |
| Remove | A slide not yet printed is removed at once. A slide already printed asks for a reason first. Either way an **Undo** message appears for a few seconds. |
| + Add | Adds the chosen stain. |
| Scan next block/decant → | Returns to the scan box. |

**Comment window.** Shows earlier comments (author and time) and a **Comment** box. **Add Comment** saves it. On a slide, tick **Print this comment on the physical label** if it should be on the glass; otherwise it stays on the record only. **Close** closes the window.

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Bright or dim alert badge | Tiny Tissue, Fragile or Decal Required is on or off for the block. |
| Print Status badge | Pending (not printed), Printing…, Printed, Failed, Canceled. |
| Control badge | The slide is a control slide paired with a patient slide. |
| On Label badge | The slide's comment prints on the physical label. |
| Red banner "Block exhausted." | The block has been flagged and cutting is blocked until the ordering pathologist answers. |
| Green banner | The pathologist approved destructive cutting. Cutting can go on. |
| Red message above the columns | A change could not be saved. See Error recovery. |
| Device Status colour | Ready, Print Error or Offline. |

### Hotkeys

Both keys work only while this screen is open, and each does exactly what its button does, including the same "Still required" checks. Your administrator can change them.

| Key | Spoken phrase | Action |
|---|---|---|
| Ctrl+Alt+Shift+B | "add stain" or "add slide" | Adds the stain currently chosen in the grid, as **+ Add** does. |
| Ctrl+Alt+Shift+A | "add comment" or "save comment" | Saves the text in the comment window, while a comment window is open. |
| Foot pedal 2 | none | Print/Etch Next. Set up for your workstation by an administrator; see the Administrator Guide. |
| F1 | none | Opens this help article. |

There are no keys for scanning, printing in a batch or reprinting. Phrases are also available in French, German, Dutch, Korean and Spanish. See [Voice and Keyboard](help:voice-and-keyboard).

## Step-by-Step Procedures

### Standard workflow

1. Check the station indicator in the top bar shows your bench. If it does not, select it and choose your station.
2. Open the **Microtomy Workspace** tile in the [Pathology Workspace](help:pathology-workspace). The scan box is ready with the cursor in it.
3. Scan the block barcode (or a slide barcode from that block). You can scan even when the cursor is not in the box. The identity bar appears and the three columns fill in. A decant or fluid container opens the decant panel instead of the block summary.
4. Read the identity bar against the block in your hand. Look at the alert badges (Tiny Tissue, Fragile, Decal Required) and the block comments.
5. Look at the slide grid. Slides ordered earlier show as Pending.
6. To add a stain, choose its category tab, pick it in **Select a stain…**, set the number and depth if needed, and select **+ Add**. A new row appears at the bottom of the grid as Pending.
7. In On-Demand mode, cut the first slide, then select **Print/Etch Next** (or tap foot pedal 2). The row changes to Printing…, then Printed, and the next slide is named under **Next unprinted slide**.
8. Repeat until the panel reads "Every slide on this block has been printed."
9. Select **Scan next block/decant →**, or simply scan the next block. The new block replaces the one on screen.

### Alternative workflow

1. **Batch printing.** Switch **Print Mode** to **Batch**. Tick the slides to print, select **Print Batch**, and watch the **Batch Print Progress** window. In Batch mode you can also drag a row to change the order of the grid (blocks only); labels print in that order.
2. **Another level.** To cut another level of a stain already on the block, select **+ Level** on its row. A new Pending row appears with the same stain.
3. **Control slides.** Tick **Pair with control slide** before **+ Add** to add a control slide next to the patient slide. The control carries a **Control** badge.
4. **Cytology decant.** Scan the decant or fluid container. Enter **Total Volume (mL)**, choose **Appearance** and **Decant Yield / Pellet Size**. When a suggestion appears, select **Accept suggestion** to add the suggested slides, then print them as usual. You can also use **+ Add** for any other stain.
5. **Scan at the station.** If your station is set to the Microtomy / Sectioning stage, scanning a block with a handheld scanner can also trigger the slide labels automatically through Batch Management. See Related Features.

### Exception handling

1. **The block has run out of tissue.** Select **Block exhausted**, type a note (required only if your organisation requires one), and select **Flag as exhausted**. A red banner says "Block exhausted. Flagged by …. Cutting is blocked until the ordering pathologist answers." While the banner shows, Print/Etch Next and Print Batch do not print. If the slide was ordered through Add-On Orders, the ordering pathologist is e-mailed. If it was not (an original H&E, say), or the pathologist has no e-mail address, the notice goes to the Supervisor / Accessioning Desk (the people with the Lab Director or Accessioner role) and a line beside the button says so. The flagged slide appears in the Add-On Orders tracking list either way. The pathologist answers on the [Add-On Orders](help:add-on-orders) screen: **Approve Destructive Cutting** turns the banner green and cutting goes on, while **Cancel Order** or **Modify & Resubmit** puts the block's status back.
2. **Cancel a slide already printed.** Select **Remove**. A window titled "Reason required" says "This slide has already printed — select a reason to cancel it." Choose Damaged Section, Ordered in Error, Tissue Exhausted or Other. The slide is canceled as soon as you choose, with no second confirmation; use **Undo** in the message that appears if you chose wrongly. **Cancel** closes the window without removing it.
3. **A label did not print well.** Select **Reprint** on the row and choose Jam, Scratched Glass, Misprint or Other. The slide shows "Reprinted 1×" and an **Undo** message appears for a few seconds. This works on decant slides too. Undo clears the reprint from the record; if the label has already come out of the printer, discard it.
4. **A bad barcode scan.** A message such as "That scan didn’t resolve to a case, block, or decant — check the barcode and try again." appears under the scan box. Scan again or type the barcode and select **Go**.
5. **A specimen label scanned instead of a block.** The message "A bare specimen scan isn't supported at the Microtomy Workstation. Scan a block, matrix block or decant/fluid container barcode." appears.

!!! warning "Cancelling a printed slide"
    Removing a printed slide cancels it on the case, and it may already be on its way to staining. Tell the stainer. A removed level number is not reused, so a replacement slide gets a new level.

### Error recovery

1. If a red message says "Not saved: someone else changed this block at the same time. The block has been reloaded; please make the change again.", the screen has reloaded the block. Look at the grid and repeat your change.
2. If the message says "Not saved. The block has been reloaded as it is now; please make the change again.", do the same. A label is printed only after the slide's "Printing" mark has been saved, so an unsaved change never produces a label.
3. If a slide shows **Failed**, the printer's own message is under the badge. Fix the printer (Device Status shows Print Error or Offline), then select **Print** on that row again.
4. If Device Status reads "No scan station selected for this device — set one from the NavBar station indicator.", select the station indicator and choose your bench.
5. If it reads "This station isn't configured for real slide-label printing.", your station has no printer set up. Tell your administrator. You can still add stains and comments.
6. If you ticked the wrong slides in Batch mode, clear the ticks before **Print Batch**. Once printing starts it cannot be stopped from this window.

!!! warning "Check the slide against the label"
    Always compare the printed label with the block and slide in your hand before the slide leaves the bench. Printing marks the slide Printed on the case; it does not know whether the right section is on the glass.

## Tips and Best Practices

### Common mistakes

- Printing a batch of slides for the wrong block because the previous block was still open. Read the identity bar after every scan.
- Switching to Batch mode and then pressing Print/Etch Next, expecting it to print a ticked slide. In Batch mode use **Print Batch**.
- Using **+ Level** when a different depth is needed. **+ Level** adds no depth; use **+ Add** with the µm box.
- Flagging **Block exhausted** when only the first level is poor. The flag stops all cutting on the block until the pathologist replies.

### Efficiency recommendations

- You do not need the cursor in the scan box. A handheld scanner is picked up wherever the cursor is, so you can scan the next block without touching the mouse.
- Use foot pedal 2 for **Print/Etch Next** when your hands are at the microtome.
- Use **×** to add several identical slides in one step.
- In Batch mode, drag the grid into the cutting order before printing.

### Workflow recommendations

- Open this screen at the start of the shift on your own bench station, so the right printer is used all day.
- Add comments on the block (not a slide) for anything the embedder or the pathologist should see, such as "tiny fragments, face gently".
- Check the **Billing** box before you move on if a pathologist asked for a stain that needs approval; it shows warnings but you cannot change charges here without the billing review permission.

## Related Features

### Upstream workflow

- [Pathology Workspace](help:pathology-workspace): the Microtomy Workspace tile and the Go to Bench button.
- [Embedding Station](help:workstations/embedding): confirms the piece count and sets the block's mold and orientation notes.
- [Add-On Orders](help:add-on-orders): pathologists order extra levels, stains and tests; each order appears here as a Pending slide, and the pathologist answers a Block exhausted flag there.
- [Batch Management](help:batch-management): the Microtomy / Sectioning step of chain of custody. A block scanned at a Microtomy / Sectioning station can generate its pending slide labels on the scan itself; this screen then recognises a label already produced and does not print a second one.

### Downstream workflow

- [Slide Distribution Station](help:workstations/slide-distribution): finished slides are scanned and routed to a pathologist or a scanner.
- [Batch Management](help:batch-management): staining batches and, for digital slides, [WSI scanning](help:batch-management/wsi-scan).
- [Report](help:report): the pathologist sees the slides on the case.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| No Microtomy Workspace tile in the Pathology Workspace | Your role does not include the Microtomy screen. |
| "Block … not found." or "Case not found." | The barcode is for a block that does not exist on that case. Check the label. |
| Print/Etch Next does nothing | The panel says every slide is printed, or there is no slide still Pending. Otherwise a red line above the columns gives the reason (the block is flagged exhausted, the print could not start, or the printer's message). |
| Print Batch is greyed out | No slide is ticked. Printed and canceled slides cannot be ticked. |
| Device Status is Offline | The station has no printer profile, or no station is selected. |
| A slide shows Failed | The printer refused the label. Read the message under the badge. |
| Add is greyed out | No stain is chosen, or your organisation requires a cut depth and the µm box is empty. Read the "Still required" line. |
| Alert badges and Block exhausted are missing | You opened a decant. They apply to blocks. |
| The Undo message has gone | It stays for 8 seconds only. Add the slide again with **+ Add**; a removed level number is not reused, so it gets a new level. |
| Block exhausted is greyed out | Your role does not include the permission to flag a block exception, or the block is already flagged. Ask your laboratory manager. |
| Full billing review is greyed out | You do not have the billing review permission. |

!!! note "Decant slides"
    Alert badges, block comments and Block exhausted are for blocks and matrix blocks only. On a decant you can add, remove, comment on and reprint slides, use the cytology panel and print.

### Resolution steps

1. Read the red message above the columns or under the scan box.
2. Scan the block again. If it still does not open, type the barcode in the box and select **Go**.
3. Check the station indicator and the Device Status panel.
4. Reload the page and scan the block again. Changes already shown as saved are kept.
5. Ask a colleague to check the same block from another computer to rule out a printer fault.

### When to contact support

Contact your laboratory's PathScribe support when a label prints for the wrong slide, a Printed slide has no label, a change keeps coming back as "Not saved", or the printer is Offline although it is switched on and connected. Have the case number, the block label, the slide level and the time ready.
