---
module: Batch Management
workflow: Bench chain of custody
role: [Histotechnologist, Cytotechnologist, Molecular Technologist, Laboratory Manager]
keywords: [batch, container, master barcode, reconciliation, chain of custody, decal, processing, staining, referral, rack, manifest, supervisor override, cold chain, abort batch, new container]
routes: [/batch-management]
previous: pathology-workspace
next: batch-management/pending-load
related: [pathology-workspace, workstations/embedding, workstations/microtomy, workstations/slide-distribution, grossing]
status: Draft
---

# Batch Management {#top}

## Overview

**Purpose.** Batch Management follows groups of cassettes and slides from one laboratory step to the next. A *batch* is a physical carrier (a processor basket, a decalcification vessel, a staining rack, an archive tray, or an ad-hoc box) with a barcode on it. You scan each cassette or slide into the batch, and when the carrier reaches its destination you scan every item back out and PathScribe checks that nothing is missing and nothing extra arrived. The result is a record of who handled what, and when.

The module is also the doorway to eight related screens, reached from the tiles at the top of the page: Pending Load, Disposal, the Waste Tracking Report, Retention Holds, Label reprint, Slide scanning, the Engraver Monitor and the Equipment log. Each has its own article, linked at the end of this one.

**Intended users.** Histotechnologists, cytotechnologists and molecular technologists, who have the screen by default, and laboratory managers. Administrators can open the screen but their roles do not include the batch actions unless your laboratory adds them. If the Batch Management tile is missing from the [Pathology Workspace](help:pathology-workspace), ask your laboratory manager.

**Where it fits.** Batch Management sits between the workstations. [Grossing](help:grossing) creates the cassettes. The [Embedding](help:workstations/embedding) and [Microtomy](help:workstations/microtomy) workstations turn them into blocks and slides. [Slide Distribution](help:workstations/slide-distribution) hands slides to pathologists or to a scanner. Batch Management records the movement of groups of those items between the processing, staining and checkout steps, and out to a reference laboratory.

!!! note "Demonstration data today"
    In this version the batches, racks and readings are held in your browser session and the example batches are seeded for demonstration. Three examples are provided: a staining batch part-way through reconciliation (one slide missing, one unexpected scan), a referral batch with an unacknowledged temperature excursion of 11.4 °C, and a running processing batch. Resetting the demonstration restores them. The cold-chain readings come from a labelled Simulated control because no temperature sensor feed is connected yet.

### Terms used in this module

| Term | What it means |
|---|---|
| Batch (container session) | One carrier and the list of items scanned into it. Also called a container. |
| Master barcode | The barcode of the carrier. A disposable container gets a new single-use label that begins CONT-. A reusable rack carries a permanent engraved ID that begins RACK-. |
| Cassette | The plastic holder that carries a tissue block. In this module a cassette and its block are the same item and are shown as a *Block*. |
| Block | Tissue embedded in wax in a cassette. Its identifier is the accession, specimen letter and block number. |
| Slide | A section cut from a block, identified by the block identifier plus the slide level. |
| Specimen, Decant, Matrix Block | Other items a batch can hold: the wet specimen container, a portion decanted from it, and a block shared by several specimens. Each decant slide and matrix slide is also an item. |
| Manifest | The list of items scanned into a batch. Items can enter a batch only by being scanned; nothing is pre-filled. |
| Processing node | The laboratory step a batch belongs to. There are ten: Decal / Special Processing, Processing, Embedding, Microtomy / Sectioning, Staining, Checkout, External Referral, Cytology Processing, Cytology Staining and Cytology Imaging. |
| Reconciliation | Scanning every item back out of the carrier and comparing the scans with the manifest. |
| Missing, Matched, Unexpected | After reconciliation starts, an item is *Missing* until scanned out, *Matched* once scanned out, and a scan of something not on the manifest is *Unexpected*. |

## Screen Tour

![The Batch Management page with stage tiles, page tiles, the lookup box and the batch list](capture:batch-management-overview)

The page title is **Batch Management** with the line "Track groups of cassettes and slides through processing nodes (Decal / Special Processing, Processing, Embedding, Microtomy, Staining, Checkout) via container barcodes — chain-of-custody scanning, reconciliation, and QA discrepancy logging."

From top to bottom: a row of tiles, the lookup box with the **New Container** button, then two lists of batches. Selecting a batch opens its detail page. **New Container** opens a dialog.

![The New Container dialog](capture:batch-management-new-container)

![A batch open on its detail page with the manifest and action buttons](capture:batch-management-batch-detail)

### Field definitions

**Stage tiles (the first ten tiles)**

| Tile | What it counts |
|---|---|
| Decal / Special, Processing, Embedding, Microtomy, Staining, Checkout, Referral, Cyto Processing, Cyto Staining, Cyto Imaging | The number of open batches (Active or Reconciling) at that step. Select a tile to show only those batches in the Active & Reconciling list. The tooltip reads "Filter by: ..." and, once chosen, "Showing: ... — click to reset". Select the tile again to clear the filter. |

The filter changes the Active & Reconciling list only. The Complete & Aborted list always shows every closed batch.

**Page tiles (the last eight tiles)** open other screens. They do not filter anything.

| Tile | Opens |
|---|---|
| Disposal | [Disposal Queue](help:batch-management/disposal) |
| Waste Tracking Report | [Waste Tracking Report](help:batch-management/disposal-report) |
| Retention Holds | [Retention Holds](help:batch-management/retention-holds). Hover text: "Open the Retention Holds queue". |
| Pending Load | [Pending Batch Load](help:batch-management/pending-load) |
| Label reprint | [Label Reprint](help:batch-management/label-reprint). Hover text: "Reprint labels for many cases at once". |
| Slide scanning | [Slide Scanning](help:batch-management/wsi-scan) |
| Engraver Monitor | [Engraver Monitor](help:batch-management/engraver-monitor) |
| Equipment log | [Equipment Log](help:batch-management/equipment-log) |

**Lookup box**

| Field | What it means |
|---|---|
| Scan or enter a master batch barcode... | Scan or type the carrier's barcode and press Enter. If it is an existing batch, the batch opens. If it is a registered reusable rack that is free, New Container opens with that rack already filled in. Otherwise a red message appears. |

**Batch lists**

| Item | What it means |
|---|---|
| Active & Reconciling (n) | Batches that are still open. Each row shows the status, master barcode, processing node, protocol, a STAT badge for urgent batches, the item count and the time the batch was created. |
| Complete & Aborted (n) | Closed batches, shown dimmed, with the time they were completed or aborted. The list appears only when there is at least one. |
| No active batches. Create one to get started. | There is nothing open (or nothing open at the chosen stage). |
| Loading batches... | The list is being read. |

**New Container dialog**

| Field | What it means |
|---|---|
| Container Type | Staining rack, Tissue processor basket, Archive storage tray, Decal vessel or Ad-hoc batch. |
| Target Workstation | The scan station the batch is for ("— No station —" if none). The list shows each station with its workflow stage. Choosing one sets the Processing Node when the station's stage matches one exactly, and the line "Set from …'s own stage." appears (with the station's name). |
| Processing Node | The step. If you change it after choosing a station whose stage differs, a warning reads "(station) is normally a (node) station — double-check this is intentional." |
| Protocol / Run Parameters | Free text; the box shows the example "e.g. Standard H&E Overnight Run". Required. |
| Priority | **Routine** or **STAT**. STAT batches carry a STAT badge in the lists. |
| Solution Type (Decal / Special Processing only) | EDTA, 10% NBF (fixation window) or Rapid decal (formic/HCl). |
| Target Duration / Alert Timer (Decal only) | Hours and minutes. A line reads "Warning alert at (time) — 15 minutes before target." Required. |
| Reference Lab Destination (External Referral only) | The reference laboratory. Until you choose, the list reads "— select reference lab —". If none is set up the dialog says "No facility is currently configured with the Reference Lab role — add one in Facility settings first." Required. |
| Test / Panel Requested (External Referral only) | Optional by default. The box shows the example "e.g. Foundation Medicine CDx NGS Panel". |
| Stain Protocol (Cytology Staining only) | The stain, chosen from the stain list, which starts at "— select stain protocol —". Required. |
| Reagent / solution lots used (Staining only) | Tick the active reagent lots used on the run. "No active reagent lots in the registry." appears when there are none. Optional by default. |
| Container Identifier Mode | Shown for every container type except Ad-hoc batch. **Disposable Label** makes a new single-use label. **Reusable Rack** uses an engraved rack with no new label. |
| Rack ID | Reusable Rack only. The box prompts "Scan or enter e.g. …" followed by an example built from your laboratory's rack prefix. Scan or type the ID, or select one of the available racks shown as buttons beneath. Required. |

Your laboratory can change which of the optional fields are required. A required field has a star, and a line starting "Still required:" names what is missing. **Generate & Print** (or **Start Session** for a reusable rack) stays greyed out until nothing is missing.

**Batch detail page**

| Item | What it means |
|---|---|
| Header | The master barcode, then container type, node, protocol, solution or test requested, a STAT badge, and a lock icon with the rack ID for a reusable rack ("Rack released" with an open lock after release). The status pill at the right reads Active, Reconciling, Complete or Aborted. |
| Instrument reports: (status) | For Staining and Cytology Processing batches, the status the instrument sent. A failed run shows a warning. It cannot be typed in on this screen. |
| Reagent / Solution Lots Used | For a Staining batch, the lots chosen when it was created. |
| Decal timer | For an open Decal batch: "(time) remaining of (target) target", a warning in the last 15 minutes, then "Overdue by (time) — target was (time)". It refreshes every 30 seconds. |
| Referral status | For an External Referral batch once dispatched: "Dispatched to reference lab — awaiting transit update.", "In transit to reference lab.", "Delivered to reference lab — awaiting result.", then "Result received" with the result or, when the result came as a document, "Result received (PDF):" followed by a "view report" link. |
| Cold-chain excursion banner | "Cold-chain excursion detected: (temp)°C at (time). Batch completion is blocked until acknowledged." with an **Acknowledge** button. The button opens a window headed "Acknowledge temperature excursion" that asks for your note. |
| Cold chain panel | A collapsible "Cold chain" section for a batch in a smart container. It shows the status ("Within range", "Excursion" or "No readings yet"), the latest reading as "Latest: … °C at …" (with a Simulated badge when it was entered by hand), the count of readings and excursions, the last five readings in a table (Time, Temperature, and a Result column that reads "Within range" or "Excursion") and a labelled **Simulated** control, "Try a temperature reading". After you send a simulated reading a line under the control tells you the outcome: that it was within range or an excursion, and, for an excursion in a container that holds an open batch, "The batch in this container is on hold." and how many quality deficiencies were raised. A batch not in a smart container says "This batch is not in a smart container, so there are no readings to show." The panel opens by itself when there is an excursion. |
| Scan hint | While Active: "Scan a cassette or slide barcode to add it to this batch. Hands-free — no need to click into a field first." While Reconciling: "Out-of-Process Verification: scan each physical item as you remove it from the carrier." |
| Manifest (n items) | Each row: the item's identifier, its type (Block, Slide, Specimen, Decant, Decant Slide, Matrix Block or Matrix Slide), who added it and when, and "moved from (barcode)" if it came from another batch. A batch with nothing in it says "No items scanned into this batch yet." During reconciliation each row shows Matched or Missing instead of the Move and remove buttons. |
| Unexpected / Extra (n) | During reconciliation, scans that were not on the manifest. |
| Override and abort notes | After an override: "Reconciliation was overridden by (name) on (time) — (reason)". On an aborted batch: "Aborted — (reason)". |

### Toolbar

**Hub page**

| Button | What it does |
|---|---|
| New Container | Opens the New Container dialog. |
| A stage tile | Filters the Active & Reconciling list to that step. |
| A page tile | Opens the related screen. |
| A batch row | Opens that batch's detail page. |

**New Container dialog**

| Button | What it does |
|---|---|
| Generate & Print | For a disposable label. Creates the batch, sends its label to the workstation's printer if one is set, and shows the barcode. Reads "Generating..." while it works. |
| Start Session | For a reusable rack. Checks the rack out to the new batch. No label is printed. |
| Cancel and the close mark (x) | Closes the dialog without creating anything. Clicking outside the dialog does the same. |
| Print | On the result screen, prints the container label from the browser. Not shown for a reusable rack. |
| Continue — Scan Items | Opens the new batch, ready for scanning. The close mark on the result screen does the same. |

**Batch detail page**

| Button | What it does |
|---|---|
| Back to Batches | Returns to the list and refreshes it. |
| Move (on each item, Active batches) | Hover text "Move to another batch". Opens a small list of the other Active batches. Choose one to move the item there. "No other active batches to move into." appears if there is none. |
| x (on each item, Active batches) | Hover text "Remove from batch". Removes the item from the batch, and a message reads "… removed from batch." (with the item's identifier). The item itself is untouched; it simply is not in this carrier any more. |
| Release Rack | Hover text "Release … back to Available" (with the rack's ID). A reusable rack only, while the batch is Active or Reconciling. Returns the rack to Available while the batch stays open. |
| Start Reconciliation | Active batches. Begins the scan-out check. Greyed out when the batch is empty. |
| Transfer to Processing | Replaces Start Reconciliation on a Decal / Special Processing batch. Greyed out when the batch is empty. |
| Abort Batch | Active batches. Opens a dialog that asks for a reason; the reason box prompts "Why is this batch being aborted?". |
| Complete Batch | Reconciling batches. Greyed out until the check passes. |
| Supervisor Override... | Reconciling batches that cannot be completed normally. Opens a dialog that asks for a reason. |
| Acknowledge | On the cold-chain banner. Opens a dialog that asks for a note. |
| Mark in transit, Mark delivered | External Referral batches after dispatch. Move the referral tracking forward one step. |
| Send simulated reading | In the cold chain panel. Records a temperature you type, marked Simulated. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Active (blue) | Open. Items can be scanned in, moved and removed. |
| Reconciling (amber) | The scan-out check is under way. Items can no longer be added or moved. |
| Complete (green) | Closed after a successful check, an override, or a transfer to Processing. |
| Aborted (red) | Closed without completing. The manifest is kept for audit. |
| STAT badge | The batch was created as STAT. |
| Lock with rack ID | The batch holds a reusable rack. The open lock means the rack was released. |
| Green "Added...", "Matched..." or "Already matched — nothing changed" flash | The scan was accepted (or changed nothing). A short beep sounds. |
| Red flash and error tone | The scan was refused, or the item is not on the manifest (Unexpected). |
| Matched (check) / Missing (circle) | An item's state during reconciliation. |
| Unexpected (warning) | A scan during reconciliation that is not on the manifest. |
| Simulated badge | A temperature reading entered with the Simulated control, not from a sensor. |

### Hotkeys

On the hub, a barcode scan beginning CONT- or RACK- opens the matching batch from anywhere on the page, with no need to click first. On a batch's detail page every scan goes to the batch.

In the New Container dialog, **Ctrl+Alt+Shift+N** does what Generate & Print (or Start Session) does, and the spoken command "create container" or "generate container" does the same. They work only while the dialog is open. The overrides, abort and acknowledge buttons have no key and no voice command on purpose.

## Step-by-Step Procedures

### Standard workflow

**Create a batch and fill it**

1. Open **Batch Management** from the Pathology Workspace. The list of batches appears.
2. Select **New Container**. The dialog opens on Container Type.
3. Choose the **Container Type** and, if you know it, the **Target Workstation**. The Processing Node is filled in when the station's stage matches one.
4. Check the **Processing Node**, type the **Protocol / Run Parameters** and choose **Routine** or **STAT**. Complete any extra fields that appear for the node (see the table above).
5. Choose **Disposable Label** or **Reusable Rack**. For a rack, scan or type the Rack ID, or select one of the available racks.
6. Select **Generate & Print** (or **Start Session**). The dialog changes to "Container Created" (or "Session Started") and shows the master barcode.
7. For a disposable label, affix the printed label to the carrier. Select **Print** if the label did not print. Select **Continue — Scan Items**.
8. The batch opens, marked Active. Scan each cassette or slide as you load it. For every good scan a beep sounds, a green "Added (identifier)" appears and the item joins the manifest.

**Reconcile and complete a batch**

1. When the carrier reaches its destination, open the batch (scan its barcode in the lookup box on the hub, or select its row) and select **Start Reconciliation**. The status becomes Reconciling and every item shows Missing.
2. Scan each physical item as you remove it from the carrier. A good scan shows a green "Matched (identifier)" and the row turns to Matched.
3. When every row is Matched and nothing is under Unexpected / Extra, **Complete Batch** becomes available. Select it. A message reads "Batch … complete." (with the batch barcode) and the status becomes Complete.
4. A reusable rack is returned to Available automatically.

**Decalcification batches**

1. Create the batch with node Decal / Special Processing, choose the **Solution Type** and set the **Target Duration**.
2. Scan the cassettes in. Watch the timer on the batch page.
3. When decalcification is finished, select **Transfer to Processing**. All items move into a new Processing batch in a disposable processor basket, the decal batch is marked Complete and a message reads "(n) item(s) transferred to new Processing batch (barcode)." You return to the list. No reconciliation is needed for this step.

### Alternative workflow

1. **Find a batch by scanning.** Scan its barcode at the lookup box on the hub. The batch opens straight away.
2. **Start from a rack.** Scan an available reusable rack's barcode in the lookup box. New Container opens with Reusable Rack and the Rack ID already chosen. You still choose the node and protocol.
3. **Use a station to set the node.** Choose the Target Workstation first and let the node fill in.
4. **Move an item to a different batch.** On an Active batch, select **Move** beside the item and choose the other batch. The item leaves this manifest and appears in the other with "moved from (barcode)".
5. **Control slides.** When you create a Staining batch with reagent lots whose stain needs a control slide, a control slide may be added to the manifest automatically, shown as added by "System (auto-appended control)".

### Exception handling

1. **A missing item at reconciliation.** Look for it. If it is found, scan it. If it cannot be found, a person with the override permission can complete with **Supervisor Override...**.
2. **An unexpected scan.** Something not on the manifest was scanned out. Put it aside and check where it belongs. The unexpected scan stays on the record and blocks a normal Complete, so the batch must be completed by override if the extra scan is genuine.
3. **A batch that should not continue.** Select **Abort Batch** on an Active batch, give a reason and confirm. The manifest is kept for audit and the batch can no longer accept scans. A batch that is already Reconciling has no Abort button; complete it (or override) instead.
4. **A temperature excursion.** The banner appears and **Complete Batch** stays greyed out. An excursion also holds the batch and raises a quality item for each case affected. Select **Acknowledge**, describe what happened and what was done, and confirm. A later normal reading does not clear it.
5. **A rack needed back early.** Select **Release Rack**. The rack becomes Available for another batch while this batch stays open.
6. **Referral batches.** After the batch is completed the referral is dispatched. Use **Mark in transit** and **Mark delivered** to record where it is; the steps only go forward.

### Error recovery

1. "No batch or registered container found for (value)." The barcode matches no batch and no registered rack. Check the label and scan again.
2. "Rack (value) is already checked out to another active batch." Release it from that batch first, or choose another rack.
3. "Rack (id) isn't registered. Check the ID or register the rack first." The rack is not in the rack list. Ask your laboratory manager.
4. "(identifier) is already in this batch." A repeat scan; nothing to do.
5. "(identifier) is already in active batch (barcode)." The item belongs to another open batch. Move it from there or remove it there first.
6. "(value) doesn't match any cassette or slide on any case." The barcode is unreadable or the label belongs to nothing in PathScribe. Reprint the label from [Label Reprint](help:batch-management/label-reprint) if it is damaged.
7. "Still not scanned out: (items). Scan them, or use a supervisor override." Complete refused because of missing items.
8. "(n) item(s) that don't belong to this batch were scanned. Resolve them, or use a supervisor override."
9. "This batch has a cold-chain excursion that hasn't been acknowledged. Acknowledge it, or use a supervisor override."
10. "You don't have permission for this. Ask your administrator." Your role lacks the permission for Abort, Override or Acknowledge. The button is also dimmed, with a tooltip that names the permission.
11. "A reason is required." The reason box was empty. Fill it in. The line "Still required: (field)" shows under the box.
12. "That didn't go through. Reopen the batch and try again." An unexpected failure. Go back and reopen the batch.
13. "Batch (barcode) isn't active any more. It may already have been reconciled, transferred or closed." A colleague acted first. Go back to the list.
14. "Start reconciliation on batch (barcode) first." You scanned out an item on a batch that is not Reconciling.

!!! warning "Overrides and aborts are permanent"
    Completing a batch with discrepancies, aborting a batch and acknowledging a temperature excursion are each recorded permanently under your name with your reason. Use plain, specific wording. The record cannot be edited.

## Tips and Best Practices

### Common mistakes

- Adding items to a batch after starting reconciliation. Once the status is Reconciling, scans are treated as scan-outs. Scan everything in first.
- Scanning an item twice during reconciliation. Scanning an item that is already Matched changes nothing and shows a green "Already matched — nothing changed"; only an item that is not on the manifest gets the red Unexpected warning and the error tone.
- Relying on the stage tiles to show closed batches. The filter changes the open list only.
- Typing a Rack ID by hand with a mistake. Use the available-rack buttons.
- Choosing the wrong Processing Node and then wondering why the extra fields differ. Fix the node before generating.
- Leaving a rack on an open batch you no longer need. Use **Release Rack**.

### Efficiency recommendations

- Keep the scanner ready and scan item after item. You do not need to click into a field on the batch page.
- Pick the Target Workstation first so the node fills in.
- Use the available-rack buttons for reusable racks.
- On the hub, scan the carrier's barcode instead of looking down the list.

### Workflow recommendations

- Make a new batch for each physical carrier, and name the protocol clearly so the list is readable at a glance.
- Reconcile at the receiving bench, not the sending bench, so the check is independent.
- Check the stage tiles at the start of the shift to see what is open at each step.
- Review the [Pending Batch Load](help:batch-management/pending-load) screen before loading a run, to see which printed cassettes and slides are not yet in any batch.

## Related Features

### Upstream workflow

- [Pathology Workspace](help:pathology-workspace): the Batch Management tile opens this module.
- [Grossing](help:grossing): creates the cassettes and shows the imager batch and field-of-view count for cytology slides.
- [Embedding](help:workstations/embedding) and [Microtomy](help:workstations/microtomy): produce the blocks and slides that go into batches.
- [Engraver Monitor](help:batch-management/engraver-monitor) and [Label Reprint](help:batch-management/label-reprint): the engravers and labels behind the items you scan.

### Downstream workflow

- [Pending Batch Load](help:batch-management/pending-load): what is printed but not yet batched.
- [Slide Distribution](help:workstations/slide-distribution) and [Slide Scanning](help:batch-management/wsi-scan): slides routed to a scanner.
- [Equipment Log](help:batch-management/equipment-log): maintenance and calibration of the instruments batches run on.
- [Retention Holds](help:batch-management/retention-holds), [Disposal Queue](help:batch-management/disposal) and [Waste Tracking Report](help:batch-management/disposal-report): the end of the material's life.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| The Batch Management tile is missing | Your role does not include the screen. |
| Complete Batch is greyed out | Items are still Missing, there are Unexpected scans, or a cold-chain excursion is unacknowledged. The tooltip names the cause. |
| Start Reconciliation or Transfer to Processing is greyed out | The batch has no items yet. |
| Abort Batch, Supervisor Override or Acknowledge looks dimmed and does nothing | Your role does not include that permission. The tooltip says which. |
| Abort Batch is not shown | The batch is Reconciling, Complete or Aborted. Only Active batches can be aborted from this screen. |
| Generate & Print stays greyed out | A required field is empty. Read the "Still required" line. |
| No label printed | The workstation has no printer set, or the printer is off. Use the Print button on the result screen. |
| The Cold chain panel is missing | It appears only after the page has finished checking for a smart container. |
| A scan does nothing on the hub | Only barcodes beginning CONT- or RACK- are acted on there. Open the batch first to scan items. |
| The Move list is empty | There are no other Active batches. |

### Resolution steps

1. Read the message or tooltip; most name the exact cause.
2. Select **Back to Batches** and reopen the batch to see its latest state.
3. Check the barcode against the label and scan again.
4. Ask your laboratory manager whether your role has the permission.
5. For a printer problem, check the workstation's printer or use **Print**.

### When to contact support

Contact your laboratory's PathScribe support when scans from valid labels are refused repeatedly, when a batch you created is missing from the list, or when a rack stays checked out after its batch is closed. Have the batch barcode, the item identifier, the time and the message ready.
