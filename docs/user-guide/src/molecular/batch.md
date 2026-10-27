---
module: Molecular
screen: Batch
workflow: Building a plate and running it
role: [Molecular Technologist, Laboratory Manager]
keywords: [batch, plate, plate builder, well, controls, NTC, positive control, reagent lot, scan to well, auto-fill, worklist, dispatch, deck slot, run results, Ct value, trace, clone and supersede, superseded, blocked]
routes: [/molecular-batch/:batchId]
previous: molecular
next: molecular/rack-board
related: [molecular, molecular/control-rules, molecular/rack, report, batch-management]
status: Draft
---

# Batch {#top}

## Overview

**Purpose.** A batch is one plate that goes on one analyser in one run. This screen, headed "New Molecular Batch" while you build and by the batch barcode and test name afterwards, is where you choose the test and the instrument, enter the reagent lots, lay out the wells (controls and patient specimens), and create the batch. Once it is created you can print its labels, send its worklist to the instrument, read the run's results, trace any result back to its source, and, if the plate was built wrongly, retire it and start a corrected copy.

**Intended users.** Molecular technologists. Laboratory managers read batches to review runs.

**Where it fits.** You reach it from the [Molecular](help:molecular) screen: **+ New Batch** opens a blank plate, and a click on any row in the batch lists, or on a plate link in the Order Queue, opens an existing one. Before you build, the specimens should be racked ([Rack](help:molecular/rack)). Afterwards the run's results flow into the Order Queue and the report.

!!! note "An existing batch is read-only"
    A batch is built once. After you select **Create Batch**, the layout, lots and instrument cannot be changed. You can look at the wells, send the worklist, read the results, and print labels. If the plate is wrong, use **Clone & Supersede**.

!!! note "Sending a worklist and receiving results are stand-ins in the demonstration"
    PathScribe never talks to an analyser directly. The worklist is passed to your laboratory's interface engine, which drives the instrument, and the engine sends the results back. That connection is **not built**. In the demonstration the worklist is accepted only when the development "Mock Interface Engine" tool has been switched on; otherwise sending fails with a message that PathScribe could not reach the service. Results then arrive only through the Demo buttons on the Order Queue (see [Molecular](help:molecular)) or the same development tool. Nothing on this screen sends a real run to a real instrument yet.

## Screen Tour

![The plate builder with batch information, reagent lots, the plate grid and the well panel](capture:molecular-batch-overview)

### Field definitions

**Batch Info (new batch only)**

| Field | What it means |
|---|---|
| Assay * | The molecular test, chosen from the molecular tests in your diagnostic catalog. Required. The test's name is filled in for you. |
| Target Instrument * | The analyser the plate is for. The list holds only active analysers from the equipment register, with the ones at this workstation's laboratory first. Before you choose, the list reads "— Select an instrument —". An instrument with an open malfunction or overdue maintenance or calibration is shown in red, for example "⚠ Panther 3 (PANTHER_03): Malfunction". You may still pick it. A red box under the list says "… has an open malfunction. You can still choose it, but check it before running this batch." (or "… is past its maintenance or calibration due date. …"). When no analyser is active the list shows "No active analysers. An administrator can add them under Configuration → System → Equipment." |
| Deck Slot | Where the plate sits on the instrument. If the instrument has a deck layout this is a list of its extraction-plate slots, each shown with its deck. The list starts with "Select a slot". Otherwise it is a text box with the example "e.g. SLOT_A1". Your laboratory decides whether it is required; a star shows when it is. |
| Plate Layout | The size of the plate: 6-well, 12-well, 24-well, 48-well, 96-well (the default), 384-well, 1536-well, an 8-well strip or a 12-well strip. Changing it clears the grid. |

**Reagent Lots (new batch only)**

Each lot has: **Component** (Master mix, Primer / probe, Extraction buffer, Detection reagent, Positive control, Negative control or Control), **Lot Number**, **Expiration** (a date) and **QC Status** (Signed Off, Pending or Failed). A star on the heading shows when your laboratory requires at least one lot.

**Well panel (new batch, after you select a well)**

| Field | What it means |
|---|---|
| Sample Type | Unassigned, Specimen, NTC (no-template control), PTC (High), PTC (Low) or Calibrator. |
| Control Lot Number, Control Expiration, Expected Result | For a control or calibrator. The lot number and expiry are required for every control well: the batch is refused without both. The control's identity follows the lot number as you type it, so the Trace shows the whole lot. The expiry box shows the date you entered when you select the well again; clearing it clears the date. **Expected Result** is Negative or Positive and starts at the usual answer for the type (Negative for NTC; Positive for PTC (High), PTC (Low) and Calibrator). Change it if your control is different; it travels to the instrument with the worklist. |
| Container Barcode | For a patient specimen: the tube's barcode. |
| Accession Number | For a patient specimen: the accession. A patient well must have a container barcode or an accession. |
| Aliquot Volume (µL) | For a patient specimen. Your laboratory decides whether it is required. |

**Existing batch**

| Item | What it means |
|---|---|
| Heading | The batch barcode and the test name. |
| Plate Layout (rows×columns) | The grid. A filled well can be clicked to see its sample type, accession (and the molecular order or control it holds). |
| Molecular order | For a well that holds an in-house order: "Placed from the Order Queue; take it off the plate there." |
| Run Results | A table of Well, Accession, Ct Value, Internal Control Ct, Interpretation, Flag and Trace. It appears once the instrument's results have arrived. Until then there is no table. When it is shown but empty it reads "No per-well results received yet." |

### Toolbar

| Button | What it does |
|---|---|
| ← Back to Batches | Returns to the Molecular screen, on the tab that shows this batch (Worklist & Plate Builder for a draft, Active Runs for a running batch, History & Archive for a finished one). |
| Plate Label | Prints the plate's label. |
| Deck Location Label | Prints the label for the plate's place on the instrument. It reads LOC-INST- followed by the instrument and the slot. |
| Specimen Labels | Prints a label for each specimen on the plate. |
| Dispatch Worklist | Opens the scan check. Shown only for a batch whose worklist has not been sent and that is not superseded. |
| Clone & Supersede | Opens the retire-and-copy panel. Shown on every batch that is not already superseded. |
| Auto-fill (Row-Major) / Auto-fill (Column-Major) | New batch. Marks every empty well as a patient specimen well, working along the rows or down the columns. It does not invent any specimen: you scan each one in afterwards. |
| Scan to Fill | New batch, specimen well. Waits for a barcode scan into the selected well. The button changes to "Waiting for scan…" while it waits. |
| Scan not working? Enter specimen ID manually | New batch. Opens a box (its prompt reads "Specimen / container barcode") where you type the specimen or container barcode and select **Fill** (or press Enter). **Cancel** closes it. |
| + Add Reagent Lot / Remove | Adds or removes a lot row. |
| Create Batch | Creates the batch. Greyed out until everything passes. |
| Confirm Dispatch | Sends the worklist after both scans. |
| Confirm Clone & Supersede | Retires this batch and creates the copy. Greyed out without a reason or without permission. While it works the button reads "Cloning…". If the copy cannot be made, a red line under the button gives the reason in your language (for example a reagent or control lot that is expired, failed or without QC sign-off, or that the run was already superseded), or a general "The change could not be made" line when the cause is not recognised. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Well colours | Blue for a patient specimen, red for NTC, green for PTC (High), light green for PTC (Low), purple for a calibrator. The legend sits under the grid. |
| Corner mark on a well | The well holds an in-house molecular order. The tooltip names it. |
| Selected well | The well being edited (new batch) or viewed (saved batch). |
| Red "Still required: …" line | Names the fields still missing. |
| Red lines above Create Batch | Reagent lot or control problems, such as "Master mix (LOT-1): expired", "… failed QC", "… no QC sign-off" or "… control lot or expiry missing"; or "NTC is required for this assay but not present on this plate" and "PTC (High) must be at A02 but was found at B05". |
| Red line "These patient wells don't name a specimen yet: …" | Patient wells with neither barcode nor accession. |
| Banner "✓ Worklist dispatched at …" | The worklist has been sent. |
| Banner "⚠ Blocked from auto-verification — one or more controls on this run failed. Results require manual review before sign-out." | The run's controls failed. |
| Banner "This batch is a clone of a superseded, earlier batch — every patient specimen well was reset and requires a fresh scan." | This batch is a replacement. The words "a superseded, earlier batch" are a link to the earlier one. |
| Banner "⚠ This batch was superseded on … by … — "reason"." with **View replacement batch →** | This batch has been retired. |

### Hotkeys

| Key | Action |
|---|---|
| Ctrl+Alt+Shift+N | Create the plate. Works only on a new batch, while the plate builder is open. It acts exactly as **Create Batch**, including the checks. |

You can also say "create plate" or "create batch". Clone & Supersede has no key and no voice command, on purpose.

## Step-by-Step Procedures

### Standard workflow

Building and running a plate:

1. On the [Molecular](help:molecular) screen select **+ New Batch**. You see "New Molecular Batch" with the Batch Info panel and an empty plate grid.
2. Choose the **Assay**. Choose the **Target Instrument**; if it appears in red, read the warning under the list and decide whether to continue.
3. Choose the **Deck Slot**. If the instrument has a deck layout, only slots that hold an extraction plate are offered.
4. Choose the **Plate Layout** if it is not 96-well. Do this before you lay out wells: changing it later clears the grid.
5. Under **Reagent Lots** select **+ Add Reagent Lot** for each lot. Choose the component, type the lot number, set the expiration date and the QC status. A lot that is expired, has failed QC or has no QC sign-off blocks the batch.
6. Place the controls. Click a well in the grid, then in the panel set **Sample Type** to the control (NTC, PTC (High), PTC (Low) or Calibrator) and fill in **Control Lot Number** and **Control Expiration**, and check **Expected Result**. Put each control where the [Control Rules](help:molecular/control-rules) say: a rule may fix NTC at A01, for instance.
7. Place the patient specimens. Either click each well and set it to Specimen, or choose an **Auto-fill** button to mark all the remaining empty wells at once.
8. For each patient well, scan the tube. Select **Scan to Fill** and scan the tube; the specimen is recorded in the well and the next unfilled patient well is selected and waits for the next scan automatically. Work through the whole rack this way. The well panel shows the accession when a scan finds one.
9. If the scanner does not read, select **Scan not working? Enter specimen ID manually**, type the barcode, and press Enter or **Fill**.
10. Enter the **Aliquot Volume (µL)** for each patient well when your laboratory requires it.
11. Read the lines above **Create Batch**. Fix everything listed in red, and the "Still required:" line. The button turns on when all is well.
12. Select **Create Batch**. You see the batch open with its barcode in the heading, and its status is Draft.
13. Print the labels: **Plate Label**, **Deck Location Label** and **Specimen Labels**. Put them on the plate, the deck position and the tubes.
14. Place the rack on the instrument ([Rack](help:molecular/rack)).
15. Select **Dispatch Worklist**. A panel titled "Dispatch Worklist — Scan Verification" opens. It says that the target plate and the instrument deck location must both be scanned and confirmed to match before the worklist is sent.
16. Next to **Plate Barcode** select **Scan** and scan the plate. Next to **Deck Location Barcode** select **Scan** and scan the deck position's label. Each shows what was scanned instead of "— not scanned —".
17. Select **Confirm Dispatch**. When it is accepted you see "Worklist dispatched successfully.", the panel closes, and the green banner "✓ Worklist dispatched at …" appears. The batch's status changes from Draft to Active, so it now sits on the **Active Runs & Batches** tab, and the orders on the plate change to Running. In the demonstration the worklist goes to the simulated interface engine (see [Demonstration tools](help:demonstration-tools)), the same one other outbound messages use, so it works without a real engine.
18. When the run's results arrive, the **Run Results** table appears. Read each well's Ct value, internal control Ct, interpretation and flag. Compare the result for each control with its expected value. If a control failed, you see the red blocked banner.
19. Use **Trace** on any row to see where that result came from (see below).

### Alternative workflow

1. **A plate for waiting orders.** To put in-house orders on a plate with the Order Queue, build the plate with **controls only** and leave the patient wells empty. The queue puts each order in the next free well, in row order, and never in a control position. Do **not** use Auto-fill for that plate: every well it marks as a patient specimen then needs a barcode before the batch can be created.
2. **Trace a result.** In Run Results select **Trace** on a row. A panel lists: the control (one line reading "…, lot …, expires …": the control id, its lot number and its expiry date), the plate UUID and barcode, the deck location (instrument and slot, or "(no deck slot recorded)"), who created the batch (the line "Batch created by:" followed by the name), the reagent lots, and the specimen's Movement history, each line reading for example "Primary vial → Secondary rack — Name at Station — date". "No tracked movement recorded for this specimen." appears when the tube was never scanned into a rack. Select **Hide** to close it.
3. **Retire and replace a plate (Clone & Supersede).** Use it when the plate was built wrongly, a specimen was mis-scanned, or a lot has to change:
    1. Open the batch and select **Clone & Supersede**. The panel explains: this batch is never edited in place; confirming creates a new draft batch with the same test, instrument and plate settings and the same control assignments, but every patient specimen well resets and must be scanned again; this batch becomes a closed, superseded record. A well that holds an in-house order from the Order Queue is the exception: while the plate is still a draft that has not been dispatched, that well keeps its order (and its accession) on the copy, and the order moves to the new plate in the same well. You do not have to put it back.
    2. Type the **Reason** (for example "Well A03 specimen was mis-scanned; re-running with corrected accession"). It is required.
    3. Select **Confirm Clone & Supersede**. The new batch opens with the clone banner; the old one is Superseded and points to its replacement.
4. **Look at a finished or retired batch.** Open it from History & Archive. Wells can be viewed; nothing can be changed.

### Exception handling

1. **A control is missing or in the wrong well.** The red lines say which. Move the control to the position the rule fixes, or add the missing one. A rule that allows "random position" only needs the control to be somewhere on the plate.
2. **A reagent lot is expired, failed or unsigned.** The batch is blocked. Replace the lot with a good one or get the QC sign-off done first. Setting the QC Status to Signed Off here is a record of what the laboratory already did; it is not itself a sign-off.
3. **"That instrument is no longer an active analyser in the equipment register. Choose another."** The analyser was retired while you built. Choose another.
4. **"… on … doesn't take an extraction plate. Choose one of its plate slots."** The deck slot is not a plate slot. Choose from the list.
5. **Scan verification failed.** The message reads "Scan verification failed: …" followed by what did not match: "the plate barcode didn't match", "the deck location didn't match", "this workstation isn't the instrument's scan station". Scan the right plate and deck label, and use the workstation that belongs to the instrument.
6. **A plate with no deck slot cannot be dispatched.** The deck check compares your scan with the label made from the instrument and the slot. With no slot recorded it can never match. A batch cannot be edited after creation, so use Clone & Supersede and choose a slot on the copy.
7. **The worklist could not be sent.** You see, in your language, that the interface engine did not answer, did not answer in time, or refused the worklist (with its code when it gave one). The plate stays unsent and its status does not change. In the demonstration the simulated engine answers according to the mode set on the Mock Interface Engine page (succeed, reject or time out), so a refusal there is a test you set up.
8. **You do not have permission to supersede a run.** The message reads "You don't have permission to supersede a run. Ask your administrator." The button is also greyed out.
9. **The copy was refused.** Clone & Supersede builds the copy by the same rules as a new plate. If a reagent lot or control lot has expired since, the copy is refused with the reason, and the original is left exactly as it was.

!!! note "Orders on a plate you supersede"
    Clone & Supersede keeps the controls and the wells that hold in-house orders from the Order Queue, and clears every other patient well. The orders move to the new plate, in the same wells, and the Order Queue shows the new plate. Only orders still waiting on the plate move: if the worklist was already sent, the orders are running on that plate and stay with it. An order that somehow still points at a superseded plate can be taken off with **Take off plate** (it used to be refused, leaving only Cancel).

!!! warning "Check the specimens before you create the batch"
    The patient wells tie each result to a specimen. A swapped tube produces a result that names the wrong case. Confirm every scan against the tube in your hand. When a result names a different specimen from the well's order, PathScribe will refuse to apply it, but a swap between two wells that both belong to the same kind of order is yours to prevent.

### Error recovery

1. **A well was set to the wrong type.** Select the well and change **Sample Type**, or set it back to "— unassigned —".
2. **A scan went into the wrong well.** Select that well and type or scan the correct value over it; the new value replaces the old.
3. **A wrong lot was added.** Select **Remove** on its row.
4. **The batch was created with an error.** Clone & Supersede it. There is no edit.
5. **The worklist went to the wrong instrument.** Tell your laboratory manager. A sent worklist cannot be recalled from this screen.
6. **A run came back blocked.** Do not report from it. A blocked run is held out of automatic filling of the report; the banner says its results require manual review before sign-out. Find the cause of the control failure with your laboratory manager and re-run on a new plate.

## Tips and Best Practices

### Common mistakes

- **Changing the plate layout late.** It clears the grid.
- **Using Auto-fill on a plate for queued orders.** Leave patient wells empty for the queue to use.
- **Skipping the control lot and expiry.** Every control well needs both, whatever your laboratory's other requirements.
- **Choosing a red instrument without checking it.** It is a warning, not a block.
- **Expecting to edit after Create Batch.** Use Clone & Supersede.

### Efficiency recommendations

- Select the first patient well, then press **Scan to Fill** once; each scan moves on to the next well by itself.
- Use column-major Auto-fill when your analyser reads the plate down the columns, and row-major when it reads along the rows.
- Create the plate with Ctrl+Alt+Shift+N when your hands are on the keyboard.

### Workflow recommendations

- Print the deck location label and the plate label at the time you create the batch, so the scan check at dispatch has real labels to scan.
- Dispatch only after the rack is on the instrument and the deck slot has been checked at [Rack](help:molecular/rack).
- Review run results the same day. A blocked run and a result with a flag are items for the laboratory manager.

## Related Features

### Upstream workflow

- [Control Rules](help:molecular/control-rules): which controls the test needs and where they must sit.
- [Rack](help:molecular/rack) and [Rack Board](help:molecular/rack-board): racking the tubes and placing the rack on the instrument.
- [Molecular](help:molecular): the Order Queue that supplies the orders for the plate.
- [Add-on Orders](help:add-on-orders): where the molecular order starts.

### Downstream workflow

- [Report](help:report): a reportable result fills the matching synoptic question, marked as coming from the molecular result.
- [Batch Management](help:batch-management): the separate histology batch screens, which do not apply to molecular plates.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| Create Batch is greyed out. | A "Still required" field, a reagent lot problem, a control problem or a patient well with no specimen. Read the red lines above it. |
| The Assay list is empty. | No molecular tests are active in the diagnostic catalog. An administrator adds them. |
| The Deck Slot list is empty or short. | The instrument has no deck layout, or none of its slots take an extraction plate. |
| Dispatch Worklist is not on the page. | The worklist was already sent, or the batch is superseded. |
| Confirm Dispatch is greyed out. | Both Scan buttons must have been used first. |
| The scan check fails even with the right plate. | No deck slot on the batch; or you are at a workstation that is not the instrument's scan station. |
| The batch still shows as Draft after dispatch. | The dispatch did not go (look for a red line under the buttons). A dispatched batch moves to Active. |
| There is no Run Results table. | No results have arrived yet. |
| Confirm Clone & Supersede is greyed out. | No reason typed, or you lack permission to supersede a run. |

!!! note "Status after dispatch"
    After a worklist is sent, the batch moves from Draft to Active and shows on the Active Runs & Batches tab until the results come back; then it moves to History & Archive as Completed. A batch that already has another status keeps it.

### Resolution steps

1. Read the red lines above **Create Batch** from the top. Fix the first one and look again.
2. For scan problems, scan again, and make sure the scan went into the field you armed (the button says "Waiting…").
3. For a scan refusal, check the three causes in order: plate barcode, deck label, workstation. For a worklist that was refused or not answered, check the interface engine (or, in the demonstration, the Mock Interface Engine mode).
4. For a refused copy, replace the expired lot on a brand-new plate instead.
5. If you still cannot proceed, note the batch barcode and message and ask the laboratory manager.

### When to contact support

Contact your laboratory's PathScribe support when a dispatch is refused with a message you cannot explain, a result names the wrong specimen and the plate is correct, or a plate you superseded still shows orders against the old plate. Have the batch barcode, the instrument and the time of the problem ready.
