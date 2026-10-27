---
module: Molecular
workflow: Molecular testing, from order to result
role: [Molecular Technologist, Laboratory Manager, Pathologist]
keywords: [molecular, workspace, workcenter, order queue, plate, batch, worklist, instrument, PCR, HPV, extraction rack, controls, run, results, send-out, reference lab, QC and specimen association]
routes: [/molecular]
previous: pathology-workspace
next: molecular/batch
related: [molecular/order-queue, molecular/batch, molecular/rack-board, molecular/rack, molecular/control-rules, add-on-orders, report, accession, batch-management]
status: Draft
---

# Molecular {#top}

## Overview

**Purpose.** The Molecular screen (the page title reads "Molecular Workspace") is the one home for molecular testing in PathScribe. From it you see the orders that are waiting for a plate, build the plates (batches) that go on an analyser, follow each run while it is on the instrument, look back at finished runs, and check which specimens each instrument run covered. It also leads to the extraction racks and to the control rules that every plate is checked against.

**Intended users.** Molecular technologists, who run the bench. Laboratory managers use the same screen to follow runs. Pathologists see the effect of the work in the report: a finished test can fill in the matching question of the synoptic report. The Molecular tile in the [Pathology Workspace](help:pathology-workspace) opens this screen. By default only the Molecular Technologist role has the Molecular screen; if the tile is missing, ask your laboratory manager or administrator to add the screen to your role.

**Where it fits.** A molecular test starts as an order (usually an add-on order placed from a case), waits in the Order Queue, is put on a plate with its controls, is sent to the analyser as a worklist, and comes back as a run result. The result goes onto the order, and, when it can be trusted, into the matching question of the pathologist's report.

!!! note "Several parts are demonstration only"
    The screen, the plate rules, the order queue, result handling and the report link are all built and work in the demonstration. What is **not** built is the live connection to a real analyser or reference laboratory. Sending a worklist and receiving a run result are stand-ins today. See "Exception handling" below and the notes on each tab.

## Screen Tour

![The Molecular Workspace with its five tabs and the Order Queue showing queued orders](capture:molecular-overview)

The top of the page shows the title, the line "Batch and plate management for molecular diagnostics runs (HPV, CT/NG, respiratory PCR panels, targeted NGS)", three buttons on the right, and a row of five tabs. When you open the screen without choosing a tab, it opens on **Active Runs & Batches**.

### Field definitions

**Batch tabs (Worklist & Plate Builder, Active Runs & Batches, History & Archive)**

These three tabs show the same table; each tab shows batches in different states. Click a row to open that batch ([Batch](help:molecular/batch)).

| Column | What it means |
|---|---|
| Batch | The batch barcode PathScribe gave the plate. |
| Assay | The test the plate is for. |
| Instrument | The analyser the plate is for, by name, with the deck slot in brackets when one was recorded. |
| Plate | The plate barcode. |
| Created | When the batch was made. |
| Status | A coloured badge: Draft, Active, Awaiting Results, Completed, Aborted or Superseded. |

| Tab | Shows batches that are | Empty message |
|---|---|---|
| Worklist & Plate Builder | Draft (being built, or built and not yet answered) | "No draft batches yet. Use "+ New Batch" to start building one." |
| Active Runs & Batches | Active or Awaiting Results | "No active runs right now." |
| History & Archive | Completed, Aborted or Superseded | "No completed, aborted, or superseded batches yet." |

A row whose instrument has an open malfunction, or is past due for maintenance or calibration, is shaded as an alert. Hold the pointer over the instrument name to read "This instrument has an open malfunction or is past due for maintenance or calibration — check it before running this batch." The alert does not stop you; it asks you to check the instrument first.

**Order Queue tab**

The queue lists in-house molecular orders. Above the table: "In-house molecular orders from pathologists' add-on orders. Select queued orders for one test, choose a draft plate of that test, and assign them: they take its free wells (never a control position)."

| Column | What it means |
|---|---|
| Select | A tick box. It appears only on orders that can be put on a plate now. |
| Order | The order number, with who ordered it and when. |
| Case | The accession number, and the specimen block when there is one. |
| Test | The molecular test ordered. |
| Performed | In-house or Send out (with the reference laboratory's name for send-out). A warning may appear here, see Exception handling. |
| Status | Queued, On a plate, Running, At the reference lab, Resulted or Cancelled. |
| Plate · well | The plate barcode and well once the order is on a plate. Click it to open the plate. "—" when not on a plate. |
| Result | The result once there is one: Positive (detected), Negative (not detected), Indeterminate, Invalid, or Report received. Under it a short note says what happened to the report (see "Results and the report"). |
| Actions | The buttons that apply to that row. |

**QC & Specimen Association tab**

A read-only list of instrument runs reported by the molecular platforms, headed "Molecular Batch Management". Columns: Run Date, Instrument, Assay, Reagent Lot, Samples Run and Specimens Linked. Click a row (the arrow turns from ▸ to ▾) to list the specimens linked to that run by Accession, Specimen and Patient MRN. Nothing on this tab is typed in: runs and links arrive from the instrument. When there is none you see "No molecular batches on file yet." A run with no specimens shows "No specimens are yet linked to this batch via an inbound event."

### Toolbar

| Button | What it does |
|---|---|
| Extraction Racks | Opens the list of extraction racks ([Rack Board](help:molecular/rack-board)). Not shown on the QC tab, or to a person who holds neither the view nor the manage permission for control rules. |
| Control Rules | Opens the controls each test requires on a plate ([Control Rules](help:molecular/control-rules)). Not shown on the QC tab. |
| + New Batch | Opens a blank plate to build ([Batch](help:molecular/batch)). Not shown on the QC tab. |
| Tabs | Order Queue, Worklist & Plate Builder, Active Runs & Batches, History & Archive, QC & Specimen Association. The address changes with the tab, so a tab can be bookmarked. |
| Reference lab list (Order Queue, send-out rows) | Chooses the reference laboratory for a send-out order. Greyed out unless you may choose labs. |
| Plate list and Assign to plate (Order Queue) | Choose a draft plate for the ticked orders, then put them on it. |
| Take off plate | Returns an order on a plate to the queue. |
| Send out instead | Moves an in-house order to send-out when your laboratory no longer runs that test in-house. |
| Cancel order | Cancels the order and its add-on slide order. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Grey Draft badge | The plate is being built, or built but not yet answered. |
| Blue Active badge | The worklist has gone to the instrument and the run is in progress. |
| Amber Awaiting Results badge | The run was reported as failed, or is waiting for a person to follow up. |
| Green Completed badge | The run's results have come back. |
| Red Aborted badge | The run was aborted. |
| Grey Superseded badge | The plate was retired and replaced by a copy (Clone & Supersede). |
| Shaded batch row | The instrument has an open malfunction or is overdue for maintenance or calibration. |
| Amber warning in the Performed column | "This lab no longer runs this test in-house" or "Choose the reference lab before this order is sent." |
| Order status badge | Queued, On a plate, Running, At the reference lab, Resulted, Cancelled. |

### Hotkeys

None on this screen. The plate builder has Ctrl+Alt+Shift+N (create the plate) and the rack screen has Ctrl+Alt+Shift+P (place the rack); see the articles for those screens. Both can also be spoken ("create plate", "place rack").

## Step-by-Step Procedures

### Standard workflow

This is the whole path of one in-house test, in the order it happens.

1. A pathologist or technologist places an add-on order for a molecular test on a case. When the order is for an in-house test, the add-on order page says "Goes to the Molecular Workcenter's Order Queue." Nothing more is needed from the person who placed it.
2. Open the Molecular screen and choose the **Order Queue** tab. The new order is listed as **Queued**.
3. Check the ordering details (case, test, who ordered it).
4. If the plate for that test does not exist yet, choose **+ New Batch** and build one. See [Batch](help:molecular/batch). Controls are placed by the plate builder according to the [Control Rules](help:molecular/control-rules). Come back to the Order Queue.
5. Tick the queued orders to run together. Once you tick one, the tick boxes for orders of a different test are disabled, because one plate carries one test. The line above the table shows "1 selected", "2 selected" and so on.
6. Choose the plate from the **Plate** list. Each choice reads for example "PLT-0042 (Panther 1) — 12 free wells". If there is none you see "No draft plate for this test".
7. Select **Assign to plate**. You see "Assigned to the plate." and the orders now read **On a plate**, with their plate and well in the Plate · well column. Orders take free wells in row order and never take a control position.
8. In the extraction rack screen, make sure the specimens are racked and the rack is placed on the instrument ([Rack Board](help:molecular/rack-board)).
9. Open the plate (click its link in the Plate · well column) and send the worklist to the instrument. The plate builder asks you to scan the plate barcode and the instrument's deck location first. See [Batch](help:molecular/batch).
10. When the worklist is sent, the orders on the plate change to **Running**.
11. When the instrument's results arrive, each order changes to **Resulted**, with its result in the Result column. The batch moves to **Completed** and appears under History & Archive.
12. Open the batch to review the run's controls, the Ct values and the interpretations. See [Batch](help:molecular/batch).
13. The pathologist sees the result in the report, in the matching synoptic question, and decides what to sign out. See [Report](help:report).

### Alternative workflow

1. **Send-out tests.** An order for a test that your laboratory does not run in-house goes to the Order Queue as **Send out**. Choose its reference laboratory from the list in the Performed column. The list holds only the laboratories approved for that test, or any active reference laboratory when the test has none. You see "Reference lab chosen." A send-out order has no tick box: it is sent with the specimen's referral batch, then reads **At the reference lab**, and **Resulted** when the laboratory reports. It never goes on a plate.
2. **Following a run.** Open the **Active Runs & Batches** tab to see plates that are on the instrument, and **History & Archive** to look back. A shaded instrument tells you to check it.
3. **Finding which specimens an instrument run covered.** Use **QC & Specimen Association**.
4. **Opening a plate from an order.** In the Order Queue, click the plate and well link on the order's row. The plate opens; a plate that has been saved can be looked at but not edited.

### Exception handling

1. **"This lab no longer runs this test in-house: send it out or cancel it."** The test was changed after the order was placed. The row offers only **Send out instead** and **Cancel order**, and cannot be put on a plate. The queue is checked again every time you open it or assign.
2. **"This lab no longer runs this test in-house: take it off the plate, then send it out or cancel it."** The same problem on an order that is already on a plate. Take it off first with **Take off plate**.
3. **"Choose the reference lab before this order is sent."** A send-out order has no laboratory yet. Choose one in the list.
4. **"Not enough free wells on that plate."** The plate is too full for the number of orders ticked. Nothing was assigned: assigning is all or nothing. Tick fewer orders or choose another plate.
5. **"Orders and plate must be for the same test."** You ticked orders for a different test than the plate's. Choose a plate of the right test.
6. **"That plate's worklist has been sent; it takes no more orders."** Only a draft plate whose worklist has not been sent takes orders. Build a new plate.
7. **"That order has moved on; the list is refreshed."** Someone else changed the order while you worked. Check the new status and try again.
8. **"You don't have permission for this."** Your role cannot do that action. Assign and Take off plate, Cancel and Send out instead, and choosing a reference lab are three separate permissions. The buttons are greyed out when you do not have the permission.
9. **A run result the plate cannot match.** If the result for a well names a different specimen than the one the order is for, the result is not applied and the order stays Running with the note "The run's result for this well names another specimen: not applied. Check the plate." Check the plate for a swapped or mislabelled tube before doing anything else.
10. **A blocked run.** If a control failed, the batch shows a red banner. See [Batch](help:molecular/batch). No order is filled into a report from a blocked run.

!!! warning "Cancelling an order"
    **Cancel order** cancels the order and also the add-on slide order it came from, and frees its well. It is a high-risk permission for that reason. Check the case and test on the row before you cancel.

### Error recovery

1. **An order was put on the wrong plate.** While the worklist has not been sent, select **Take off plate** on the order's row. You see "Taken off the plate and queued again." Then assign it again.
2. **An order was cancelled by mistake.** The Order Queue has no way to bring a cancelled order back. Ask the person who placed the add-on order to place it again.
3. **A plate was built wrongly after the worklist was sent.** Use Clone & Supersede on the plate ([Batch](help:molecular/batch)); do not try to edit it.
4. **The list looks out of date.** Where live updates are switched on at your laboratory, the queue reads again by itself when an order changes elsewhere (for example a result arrives, or a colleague assigns an order). Otherwise it is read when you open the tab and after each of your own actions. If it looks wrong, switch to another tab and back.

## Results and the report

When a run's results come back, PathScribe matches each order to the well that holds it and checks that the result names the same accession and specimen. It then decides whether the result is **reportable**: the plate's controls passed, the call is Positive or Negative, and the instrument did not flag the result. Only a reportable result can fill a report question.

The note under each result in the Order Queue says what happened:

| Note under the result | What it means |
|---|---|
| Report answered from this result. | The matching synoptic question was empty and now holds the answer, marked as coming from this result. |
| The report already had another answer: kept, with this result shown beside it. | The pathologist had already answered the question differently. Nothing is overwritten. In the report the question shows a "Result differs" tag with the result and a **Use result** button. |
| No report question takes this result. | The test is not linked to any question in the case's template. The report is unchanged. |
| Not reportable (invalid, indeterminate, flagged, or controls failed). | The report is unchanged. |
| Arrived after sign-out: report unchanged, addendum draft opened. | The report was already signed out, so it was left alone and an addendum draft was opened for the case's pathologist. |
| Arrived after sign-out: report unchanged, but no addendum draft could be opened — add one by hand. | As above, but no draft could be opened (for example no pathologist is assigned). Add the addendum yourself. |
| The reference lab sent a report with no coded result: enter the answer from it. | A send-out laboratory sent a report document only. |
| The run's result for this well names another specimen: not applied. Check the plate. | An identity mismatch. |

A signed-out report is never changed by a result. At sign-out, if a question's answer differs from its molecular result, PathScribe asks "Sign out with your answer anyway?" and lists each difference. The pathologist's answer stays theirs. See [Report](help:report).

## Tips and Best Practices

### Common mistakes

- **Trying to find a send-out order on a plate.** Send-out orders never have a tick box. They travel with the referral batch.
- **Looking for a draft plate that is already sent.** Once a worklist is sent the plate takes no more orders. Build a new plate for late orders.
- **Expecting an accessioned HPV co-test to appear in the Order Queue tab.** It does not. See "Related Features" below.
- **Ignoring the shaded instrument.** The screen flags an instrument with a malfunction or overdue service but does not stop you. The check is yours.
- **Assigning more orders than free wells.** The whole assignment is refused. The Plate list shows how many wells are free on each plate.

### Efficiency recommendations

- Tick all orders for one test and assign them in one go; one click puts every ticked order on the plate.
- Bookmark the tab you use most. The tab is part of the address.
- Use the plate link on an order to jump straight to its plate instead of searching the batch lists.

### Workflow recommendations

- Start the day on **Active Runs & Batches**, then check the **Order Queue** for new orders and the **Worklist & Plate Builder** tab for plates still being built.
- Finish racking and placing the rack on the instrument before you send the worklist.
- Treat a blocked run, a result that names another specimen, and an addendum that could not be opened as items for the laboratory manager the same day.

## Related Features

### Upstream workflow

- [Add-on Orders](help:add-on-orders): where an in-house molecular order is placed. A send-out line there always names its reference laboratory.
- [Accession](help:accession): the specimen is accessioned as any other. A protocol task marked to send an outbound order raises an order message that you can see on the [Molecular Order Queue](help:molecular/order-queue) demonstration page, not in this screen's Order Queue tab.
- [Pathology Workspace](help:pathology-workspace): the hub that holds the Molecular tile.
- [Control Rules](help:molecular/control-rules): which controls each test needs on a plate.

### Downstream workflow

- [Batch](help:molecular/batch): build the plate, send the worklist and review the run.
- [Rack Board](help:molecular/rack-board) and [Rack](help:molecular/rack): the extraction racks that feed a plate.
- [Report](help:report): where a reportable result fills a synoptic question and where sign-out asks about a difference.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| The Molecular tile is not in the Pathology Workspace. | Your role does not have the Molecular screen. |
| An order I placed is not in the Order Queue. | It is a send-out order with no laboratory yet, or the add-on page told you "n molecular order didn't reach the Molecular Order Queue". Or it was a protocol-triggered order from accessioning (not shown in this tab). |
| An order has no tick box. | It is send-out, already on a plate, running, resulted, cancelled, or flagged to be re-routed. |
| The tick boxes for some orders are greyed out. | You already ticked an order for a different test. |
| The Plate list says "No draft plate for this test". | No draft plate exists for that test, or every one is full. Build a new plate. |
| Assign to plate is greyed out. | No order is ticked, no plate is chosen, or you do not have the permission. |
| The batch is still under Worklist & Plate Builder after I sent the worklist. | See the note under Batch. The batch changes tabs when results arrive. |
| Nothing happens after I send the worklist. | Results come from the instrument. In the demonstration there is no instrument. See Resolution steps. |
| A Demo button appears on a row. | You are in a demonstration build. These stand in for the instrument or the reference laboratory. |

### Resolution steps

1. Read the message at the top of the Order Queue table. It names the cause in words.
2. Check the order's status badge and the Performed column; the row only offers what that status allows.
3. Reopen the Order Queue so it reads the orders fresh.
4. Ask your administrator whether your role has the Molecular screen and the three order permissions.
5. In the demonstration, use the Demo buttons on the row to stand in for the instrument or reference laboratory:
    - **Demo: run → positive** and **Demo: run → negative** appear on a running in-house order. They send the run's results for every patient sample on the plate, with the controls as expected. You see "Demo run results received."
    - **Demo: reference lab → positive** and **Demo: reference lab → negative** appear on a send-out order awaiting the laboratory. A queued send-out order needs its laboratory chosen first ("Choose the order's reference lab first."). You see "Demo reference lab result received."
    These buttons exist only in demonstration builds and must never be expected in live use.

### When to contact support

Contact your laboratory's PathScribe support when an order is stuck in a status you cannot change, a result is marked as naming another specimen and the plate looks right, a signed-out report did not get its addendum, or the list does not refresh. Have the order number, the accession number and the time of the problem ready.
