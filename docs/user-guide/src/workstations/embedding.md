---
module: Workstations
screen: Embedding
workflow: Bench and Workstation Work
role: [Histotechnologist, Pathology Assistant, Laboratory Manager]
keywords: [embedding, cassette, piece count, tissue discrepancy, mold size, orientation, split block, reprint cassette, wax, embedding station, tiny tissue, fragile, decal]
routes: [/workstations/embedding]
previous: grossing
next: workstations/microtomy
related: [pathology-workspace, batch-management, quality, workstations/microtomy, voice-and-keyboard]
status: Draft
---

# Embedding Station {#top}

## Overview

**Purpose.** The Embedding Station is the bench screen for the person embedding tissue in wax. You scan a cassette, check that the number of pieces in it matches the number counted at grossing, record the mold size and how the tissue is oriented, and mark the block as embedded. If something is wrong with the cassette (broken, empty, unprocessed, extra tissue) you report it with one touch. You can also reprint a cassette label that has become damaged or covered in wax, and you can link cassettes that hold one specimen's tissue split across several blocks.

**Intended users.** Histotechnologists and pathology assistants at the embedding bench, and laboratory managers. The screen opens only for roles that have the Embedding screen switched on; by default these are the Histotechnologist and Pathology Assistant roles.

**Where it fits.** Embedding follows grossing and tissue processing and comes before cutting. The block you confirm here is the block you cut at the [Microtomy Workstation](help:workstations/microtomy). The piece count you compare against was recorded in [Grossing](help:grossing). A mismatch or a reported discrepancy raises a Tissue Discrepancy item in [Quality](help:quality) for the supervisor. The embedding step is also part of the chain of custody tracked in [Batch Management](help:batch-management). Open the screen from the [Pathology Workspace](help:pathology-workspace) (the **Embedding Workspace** tile) or with the **Go to Bench** button when your station is an embedding station.

## Screen Tour

![The Embedding Station with a cassette open: specimen blocks on the left, piece count and mold controls in the middle, printer on the right](capture:workstations-embedding-overview)

The page is titled **Embedding Station**. The **Back** button at the top left returns to the Worklist. Before a scan the screen shows only "Scan a cassette barcode to begin" and a scan box. After a scan a grey identity bar appears, with three columns below it.

!!! note "Cassettes only"
    This station takes block cassettes. A cassette shared by several specimens (a matrix block), a cell-block cassette, a decant or a bare specimen barcode is refused with "The Embedding station takes block cassettes only. Matrix or cell-block cassettes, decants and specimen barcodes aren’t supported yet." A slide barcode opens the block it belongs to.

### Field definitions

**Identity bar**

| Field | What it means |
|---|---|
| Accession | The case number. |
| Patient | Patient name. |
| DOB | Date of birth, shown in your language's date format. |
| Specimen/Block | The specimen letter and block label. |
| Type | The specimen description. |
| Scan next cassette → | Closes this cassette and returns to the scan box. |

**Left column: Specimen Blocks**

| Field | What it means |
|---|---|
| Specimen Blocks | Every block on this specimen with its status. The one on screen is marked "(current)". The status is shown in your language (for example Grossed, Embedded). |

**Center column**

| Field | What it means |
|---|---|
| Block Summary: alert badges | **Tiny Tissue**, **Fragile** and **Decal Required** are switches on the block (bright means on). **Biopsy** and **Needle Core** are fixed badges worked out from the specimen type and procedure; you cannot change them here. |
| Status, Tissue | The block's status (Pending, Grossed, Embedded and so on) and its tissue description. |
| Block comments | Opens the comment window. The number in brackets is how many comments exist. |
| Expected (from grossing) | The piece count recorded at grossing. A dash if none was recorded. |
| Observed count | Your count of the pieces in the cassette. It starts with the grossing count filled in. A whole number of 0 or more. Locked once the block is embedded. |
| Confirm | Marks the block Embedded with your observed count. Off while a discrepancy is flagged. |
| Observed at embedding | After confirming: the count you recorded. |
| Discrepancy Reporting | Four buttons: Damaged Cassette/Broken Hinge, Extra Tissue Found, Missing Tissue/Empty Cassette, Unopened Cassette/Unprocessed Tissue. |
| Last flagged | The most recent discrepancy reason and the name of the person who reported it, with a **Clear flag** button. While a flag is showing, **Confirm** is off. |
| Base Mold Size | Quick-select buttons: 7 × 7 mm, 15 × 15 mm, 24 × 24 mm, 24 × 30 mm, Mega mold. The chosen one is highlighted. |
| Orientation Instructions | A free-text box ("Free-text orientation notes…") with three quick fills: Cross-section up, Epithelial surface down, Embed on edge. A quick fill replaces the text. |
| Multi-Cassette / Split-Block | Lists the other ungrouped blocks on this specimen as tick boxes, with **Group as split cassettes**. |

Some fields can be required by your organisation. A red star marks them, and a line beginning "Still required" under the box names what is missing. **Confirm** stays grey until it is complete. By default the observed count is required; the mold size and the orientation text are optional.

**Right column**

| Field | What it means |
|---|---|
| Device Status | The cassette printer for your station and whether it is Ready, in Print Error, or Offline, with the reason when it is not ready. |
| Cassette Reprint | The **Reprint Cassette** button, and once used, "Reprinted 2×, last reason: …". |
| Label Preview | A drawing of the cassette label with its size in millimetres. It is a picture, not a barcode. |

### Prompts and messages

| Text | Where and what it means |
|---|---|
| Scan or type a barcode… | Grey hint in the scan box. Scan the cassette, or type the barcode and select **Go**. |
| No comments yet. | Shown in the comment window when the block has no comments. |
| Reprinted {{count}}×, last reason: | Under **Reprint Cassette** once a label has been reprinted: how many times, followed by the last reason chosen. The number replaces the braces. |
| Last flagged: {{reason}} (by {{by}}) | A warning on the block after a discrepancy was reported: the reason and the name of who reported it. |

### Toolbar

| Button | What it does |
|---|---|
| Scan next cassette → | Returns to the scan box. |
| Block comments | Opens the comment window. Add Comment saves a note on the block; Close closes the window. |
| Confirm | Records the piece count and marks the block Embedded. |
| Discrepancy buttons | One touch records the reason on the block, alerts quality and stops **Confirm** until the flag is cleared. |
| Clear flag | Removes the discrepancy flag (one click, no confirmation) and records who cleared it in the audit log. |
| Mold chips and quick fills | Save at once. |
| Group as split cassettes | Links this cassette with the ticked ones. |
| Reprint Cassette | Opens the reason window; **Reprint** in that window prints the label. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Bright or dim alert badge | Tiny Tissue, Fragile or Decal Required is on or off. |
| Fixed Biopsy / Needle Core badge | Derived from the specimen. Not editable. |
| Warning line "Last flagged: …" | A discrepancy has been reported on this block and **Confirm** is off until you select **Clear flag**. |
| Green line "A Tissue Discrepancy item has been raised for QA." | The Tissue Discrepancy item reached Quality. |
| Red line "The Tissue Discrepancy item could not be raised for QA…" | The block was flagged but the item for Quality was not created. Tell your supervisor. |
| Red line "Not saved…" | The last change was not saved; see Error recovery. |
| Banner "Split across A2, A3 — not every cassette is embedded yet." | The block is linked to others and at least one is not yet Embedded. |
| Banner "Split across A2, A3 — all cassettes embedded." | Every linked cassette is Embedded. |
| Device Status | Ready, Print Error or Offline. |

### Hotkeys

Both keys work while this screen is open and do exactly what the button does, including the "Still required" checks. An administrator can change the keys.

| Key | Spoken phrase | Action |
|---|---|---|
| Ctrl+Alt+Shift+C | "confirm count" or "confirm embedding" | Presses **Confirm** with the count in the box. |
| Ctrl+Alt+Shift+A | "add comment" or "save comment" | Saves the text in the comment window, while it is open. |
| Foot pedal 1 | none | Confirms the piece count **as the grossing count**. Does nothing if no grossing count exists or the block is already Embedded. Set up per workstation by an administrator. |
| F1 | none | Opens this help article. |

Phrases are also available in French, German, Dutch, Korean and Spanish. See [Voice and Keyboard](help:voice-and-keyboard).

## Step-by-Step Procedures

### Standard workflow

1. Check the station indicator in the top bar names your embedding bench. If it does not, select it and choose your station.
2. Open the **Embedding Workspace** tile in the [Pathology Workspace](help:pathology-workspace). The scan box is ready.
3. Scan the cassette barcode. The identity bar and the three columns appear. The block status shows in the Block Summary.
4. Compare the identity bar with the cassette in your hand. Look at the alert badges and any block comments.
5. Count the pieces of tissue in the cassette. Type the number in **Observed count**, replacing the number that was filled in. Do not accept the filled-in number unless you have counted.
6. Select a **Base Mold Size** button. The chosen size is highlighted.
7. Type orientation notes, or select a quick fill such as **Cross-section up**. The text is saved when you leave the box.
8. Select **Confirm**. The status changes to Embedded, the box is locked, and "Observed at embedding" shows your count.
9. Scan the next cassette. The new cassette replaces the one on screen.

!!! warning "A count that differs from grossing"
    If the count you confirm is different from the grossing count, PathScribe raises a Tissue Discrepancy item for your supervisor and says so on the screen. Check your count before you confirm.

### Alternative workflow

1. **Confirm by foot pedal.** With the grossing count known and the block not yet embedded, tap foot pedal 1. This confirms the grossing count as the observed count. Use it only when you have counted and the count matches.
2. **Confirm by voice or key.** Say "confirm count" or press Ctrl+Alt+Shift+C once the box holds your count.
3. **Split cassettes.** When one specimen's tissue was split over several cassettes (A1, A2, A3), scan one of them, tick the others in **Multi-Cassette / Split-Block** and select **Group as split cassettes**. The banner then lists the group and tells you whether every cassette is embedded yet.
4. **Comment on a block.** Select **Block comments**, type in the **Comment** box and select **Add Comment**. Comments stay on the block for the next person.

### Exception handling

1. **Something is wrong with the cassette.** Select the matching discrepancy button: Damaged Cassette/Broken Hinge, Extra Tissue Found, Missing Tissue/Empty Cassette or Unopened Cassette/Unprocessed Tissue. The block's status does not change, "Last flagged: …" appears, **Confirm** goes grey, and a Tissue Discrepancy item is raised in [Quality](help:quality) for the supervisor; the screen tells you it was raised, or that it could not be. There is no confirmation. When the problem has been dealt with, select **Clear flag** next to "Last flagged": one click, and **Confirm** works again. Clearing is recorded in the audit log with your name.
2. **The count really differs.** Type the number you counted and select **Confirm**. The block is embedded with your count and a Tissue Discrepancy item records both numbers.
3. **The label is damaged or covered in wax.** Select **Reprint Cassette**. In the window titled "Reason required" choose Faded barcode, Mechanical jam, Wax buildup or Other, then select **Reprint**. The label prints and the panel shows "Reprinted 1×, last reason: …". **Cancel** closes the window without printing.
4. **The cassette is the wrong kind.** This screen cannot embed a matrix block, cell block or decant. Ask your supervisor how your laboratory records them. Once embedded they can be opened at the [Microtomy Workstation](help:workstations/microtomy).

!!! note "A reported discrepancy stops Confirm"
    Reporting a discrepancy records the reason, alerts quality and switches **Confirm** off (also for the key, voice and foot pedal) until the flag is cleared. **Clear flag** does not close the Tissue Discrepancy item in Quality; the supervisor does that there.

### Error recovery

1. If "That scan didn’t match a case or block. Check the barcode and try again." appears, scan again, or type the barcode and select **Go**.
2. If "Block A2 wasn’t found." appears, the block is not on that case. Check the cassette label against the case.
3. If **Confirm** is grey, read the "Still required" line and fill the field it names.
4. If **Reprint Cassette** reports "Reprint failed — see the message above.", the reason has already been recorded on the block, and the printer's own message is shown under the button. Fix the printer and reprint; the count will rise by one more.
5. If Device Status says "This station isn't configured for real cassette-label printing." or "No scan station selected for this device — set one from the NavBar station indicator.", choose your station from the indicator, or tell your administrator.
6. If a red line says "Not saved: …", the change you just made was not stored. The screen has reloaded the block as it is now (PathScribe first tried again on the newest copy of the case). Look at the block and repeat the change. Nothing was printed or raised for an unsaved change.
7. If you confirmed the wrong count, tell your supervisor with the case number. The count box is locked once the block is Embedded.

## Tips and Best Practices

### Common mistakes

- Pressing Confirm with the count that was filled in, without counting. The box starts with the grossing count, which makes a mismatch invisible.
- Using foot pedal 1 without counting. It confirms the grossing count, so it can never record a mismatch.
- Expecting **Clear flag** to close the item in Quality. It only lifts the hold on this screen.
- Choosing a quick fill and then typing more text before leaving the box, expecting the quick fill to stay. The quick fill replaces the whole text.
- Grouping cassettes by mistake. There is no way to ungroup from this screen; tell your supervisor.

### Efficiency recommendations

- Scan one cassette after another; a scan opens the next cassette at once, and a handheld scanner works whether or not the cursor is in the scan box.
- Use the mold chips and quick fills rather than typing.
- Use the keys or voice for **Confirm** when your hands are in the wax.

### Workflow recommendations

- Start the shift by checking the station indicator and the printer in Device Status.
- Report discrepancies as soon as you see them, before you embed, so the supervisor can decide.
- Use block comments to pass on anything that matters at the microtome, such as "orient edge toward blade".

## Related Features

### Upstream workflow

- [Grossing](help:grossing): the piece count you check against, and the block's tissue description.
- [Pathology Workspace](help:pathology-workspace): the Embedding Workspace tile.
- [Batch Management](help:batch-management): processing steps that bring the cassettes to the embedding bench.

### Downstream workflow

- [Microtomy Workstation](help:workstations/microtomy): the embedded block is cut and its slide labels printed.
- [Quality](help:quality): where a Tissue Discrepancy item raised here is followed up.
- [Slide Distribution Station](help:workstations/slide-distribution): finished slides.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| No Embedding Workspace tile | Your role does not include the Embedding screen. |
| "Takes block cassettes only" | You scanned a matrix block, cell block, decant or specimen barcode. |
| Confirm is grey | A required field is empty, a discrepancy is flagged (select **Clear flag** once dealt with), or the block is already Embedded. |
| The count box cannot be edited | The block is already Embedded. |
| Foot pedal 1 does nothing | There is no grossing count, the block is already Embedded, a discrepancy is flagged, or a required field (for example the mold size, if your organisation requires it) is empty. |
| Mold or orientation not kept | The orientation text is saved when you leave the box; click elsewhere before scanning the next cassette. |
| "Reprint failed" | The printer refused the label. The attempt is still counted. |
| A red "Not saved" line | The change was not stored; the block was reloaded. Repeat the change. |

### Resolution steps

1. Read the line under the button or the red message under the scan box.
2. Scan the cassette again, or type its barcode and select **Go**.
3. Check the station indicator and Device Status.
4. If a "Not saved" line shows, the block is already reloaded; repeat the change. Otherwise reload the page and scan the cassette again to see what was saved.
5. If a count or a mold size looks wrong after reloading, repeat it.

### When to contact support

Contact your laboratory's PathScribe support when a cassette will not open although its barcode is correct, a Confirm does not stick after reloading, or a cassette label prints for the wrong block. Have the case number, the cassette label and the time ready.
