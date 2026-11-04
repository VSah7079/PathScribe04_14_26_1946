---
module: Workstations
screen: Slide Distribution
workflow: Bench and Workstation Work
role: [Histotechnologist, Laboratory Manager]
keywords: [slide distribution, qc checkpoint, stain qc, sign off, re-stain, re-cut, image qc, checkout, route slides, pathologist assignment, subspecialty pool, slide folder, tray, courier bag, digital scanner, scanner rack, chain of custody, missing glass, replacement label, split destination]
routes: [/workstations/slide-distribution]
previous: workstations/microtomy
next: batch-management
related: [pathology-workspace, batch-management, batch-management/wsi-scan, workstations/microtomy, add-on-orders, voice-and-keyboard]
status: Draft
---

# Slide Distribution Station {#top}

## Overview

**Purpose.** The Slide Distribution Station is where finished, stained slides leave the laboratory bench. You scan slides one after another and send each either to a pathologist (a physical checkout, with the folder, tray or courier bag recorded) or to a digital slide scanner (with the scanner, rack and slot recorded). The screen keeps a running queue of what you have scanned, warns when slides from one block are going to different places, lets you flag a slide that has a problem, and keeps a chain-of-custody history for every slide.

**Intended users.** Histotechnologists who distribute slides, and laboratory managers. The screen opens only for roles that have the Slide Distribution screen switched on; by default that is the Histotechnologist role.

**Where it fits.** Slides arrive here after cutting at the [Microtome Workstation](help:workstations/microtomy) and staining. A checked-out slide goes to the pathologist's desk; a slide routed to a scanner appears in the scanning queue in [Batch Management](help:batch-management) (see [WSI Scan](help:batch-management/wsi-scan)), where it is loaded onto the scanner and scanned. Slides ordered through [Add-On Orders](help:add-on-orders) show their progress as "Checked Out / Scanned" once they are checked out or loaded on a scanner here. Open the screen from the [Pathology Workspace](help:pathology-workspace) (the **Slide Distribution Workspace** tile) or with the **Go to Bench** button when your station is a distribution station.

!!! note "What the queue is"
    The queue lives on the screen while you work. Each routing you confirm is saved on the slide at once, but the list of scanned slides itself is not kept: if you leave the page or reload it, the queue starts empty again. The slides keep their routing and their history.

## Screen Tour

![The Slide Distribution Station with a queue of slides, the active slide in the middle and the destination controls on the right](capture:workstations-slide-distribution-overview)

The page is titled **Slide Distribution Station**. **Back** at the top left returns to the Worklist. Unlike the other two stations, the scan box is always on screen, with the prompt "Scan a slide or block/cassette barcode — the queue grows continuously".

### Carriers at this station

A card at the top of the screen, **Carriers at this station**, links this bench to [Batch Management](help:batch-management). A carrier is the basket, rack or tray that moves a group of slides between steps. Using one is optional: an item scanned on its own is still recorded at this station.

- **The list.** The card lists the open carriers for this station: the ones routed to it (marked **Routed here**) and the ones at Checkout and External Referral. STAT carriers come first, then the oldest; with none it reads "No open carriers for this station." Select one, or scan its barcode (it starts with CONT- or RACK-), to open it here.
- **A carrier from the step before.** A staining rack from Staining moves to Checkout when you scan it here. It stays the same batch, and every slide in it is recorded as received from the carrier.
- **Unloading.** With a carrier open, scan each item as you take it out. The first scan starts the unloading. The card counts what has been scanned off (the line "… of … scanned off", for example 3 of 12) and lists what is still to scan. When everything is scanned off, **Finish unloading** closes the carrier.
- **An item that is not in the carrier.** The item does not open straight away. The card says it is not in the carrier: **Continue anyway** opens it and records it as unexpected (this is audited), **Cancel** does nothing.
- **A carrier for another step.** The card warns you which step the carrier belongs to. **Open here anyway** opens it and records that it was opened at another step.
- **A closed or unknown carrier.** The card says so plainly, with the date it was completed or aborted.
- **No station set.** The card asks you to choose this computer's station from the list and select **Use this station**. Until you do, nothing scanned here is recorded and carriers can't be opened here.
- **Seal manifest** stops anything being added to or removed from the carrier.

Every scan here is recorded with this station, the time and your name, which is what the scan trail and the turnaround reports are built from. A slide sent to a pathologist or loaded on a scanner is recorded as completed here. Slides cut from a matrix block (for example M1) are queued the same way: scan the matrix block for all its slides, or one of its slides.

### QC checkpoint

Batch 763. Stained slides wait for quality control before they are handed out. When a staining run finishes, its rack appears in the **QC checkpoint** card, just below the carrier card, with "Stained slides and scanned images wait here until their QC is signed off. A rack waiting for QC cannot be checked out, and its slides are not handed out." The card is shown only while something is waiting.

- **A rack waiting for QC.** Each rack shows its barcode, the number of slides and how long it has been waiting, and how it is signed off: **PathScribe sign-off** (you sign it off here), **Instrument sign-off (interface engine)** (the stainer signs off its own runs) or **Auto-accept** (released at once; you rarely see these). Select the rack to open it.
- **Signing off.** Every slide starts as **Pass**. Look at the slides; for one that is not good enough select **Fail**, then choose the follow-up, **Re-stain** or **Re-cut**, and a reason (Weak staining, Over-staining, Uneven staining, Control failed, Coverslip bubble, Folded tissue, Other). Select **Sign off: all slides passed**, or **Sign off: 1 slide failed** when you failed some. The rack can then be checked out. A failed slide shows **QC Failed** (re-stain) or **Recut Requested** (re-cut) on its case and stays out of distribution.
- **Stainer.** When the stainer was not recorded with the run, pick it from the **Stainer** list (or leave **Not recorded**).
- **A stainer that signs off its own runs.** The card says "This stainer signs off its own runs through the interface engine. The run is released when its result arrives; a supervisor can sign it off here instead." A supervisor can select **Sign off instead of the stainer**; this is recorded as an override.
- **Scanned images waiting for QC.** When the lab checks scanned images before the Pathologist sees them, the card lists them under **Scanned images waiting for QC**, with the scanner and the scan batch. **Release to the Pathologist** makes the image available; to send it back choose a reason (Out of focus, Tissue missed, Stitching error, Debris on the slide, Other) and select **Scan again**: the slide goes back in the scanning queue. Until then the slide's image reads "Waiting for image QC".

Scanning a rack that waits for QC, to check it out, is refused with "This rack’s stained slides wait for QC. Sign off the run at the QC checkpoint on Slide Distribution first." Scanning a held slide says it "waits for QC sign-off and can’t be handed out yet", "failed QC and is waiting to be re-stained" or "failed QC and a re-cut has been requested"; scanning a block whose slides are all held says "Every slide of block … is held by QC". Signing off needs the permission to sign off stain QC (and, for images, scanned image QC); the roles with this station have both by default. Without it the button is grey and the card says "You don’t have permission for this QC decision. Ask your administrator."

### Scan history

With a slide active, **Show scan history** (just below the carrier card) opens the case's scan trail: every station scan of its cassettes, blocks and slides, newest first. The columns are **When**, **Item**, **Where** (the station and the step), **Who** and **What happened** (Received, Loaded into carrier, Taken out of carrier, Matched, Missing, Unexpected, Label printed, Completed here), with the outcome when it was not OK (Wrong item, Not found, Mismatch), the carrier the item was in ("In carrier" and its barcode), and "Recorded when the carrier was scanned" for a scan made for every item in a carrier. **Hide scan history** closes it. While it reads the trail it says "Loading scan history…". It is closed until you open it, and it is shown only to people allowed to see scan history; if the service refuses, it says "You do not have permission to see the scan history." With nothing recorded yet it reads "No station scans recorded for this case yet."

!!! note "Picture"
    The picture above was taken before the carrier card was added.

### Exhausted blocks

Batch 731. When the active slide's block is exhausted, an amber line above the work says so and what remains: "Block A3 is exhausted. What remains: unstained slides L4 and L5; other blocks of this part: A1, A2." ("none" when there are none). When orders wait for the block to be re-embedded it adds "1 order waits for this block to be re-embedded."

### Slide size and pieces

Batch 732. For a slide from a megablock, a multi-piece or a matrix block, a panel shows the block type, "Slides: Large-format slide" or "Slides: Standard slide", and the pieces the slide was ordered for (all of them when it names none). A large-format slide is loaded only on a scanner marked as taking large-format slides; otherwise the message is "… doesn’t take large-format slides. Choose a scanner marked for large-format slides."

### End state

Batch 731. **End state** records where the active slide finished: Returned to storage, Archived, Sent out, Consumed for testing or Discarded. The line shows the current end state with its reason, who and when, or "No end state recorded yet." (while it reads, "Loading the end state…") **Record end state** opens the form: choose the end state, pick one of the **Quick reasons** or type a **Reason** (required), and select **Record**. "End state recorded." confirms it; the earlier end states are kept as history. Recording needs the permission to record an item's end state (the roles with this station have it by default); without it the button is grey, and if it was withdrawn the line says "You don’t have permission to record an end state. Ask your administrator." "A reason is required." means the reason was empty. Some end states are recorded for you: Discarded when the item is disposed of by scan, Sent out when a referral batch is completed, and Exhausted (no tissue remaining) when the pathologist confirms a "Block exhausted" flag or the block's last piece is used up; Exhausted is not chosen by hand, so it always matches the block. When an exhausted block is re-embedded its end state is withdrawn and the line reads "No end state recorded yet." again; the history keeps both.

### Field definitions

**Top bar**

| Field | What it means |
|---|---|
| Slides in Queue | How many slides are in the queue now. |
| Destination Mode | Physical Checkout or Digital Scanner: the side of the destination panel you are on. |
| Carrier / Scanner | For the slide you are working on: its courier bag, tray, folder or scanner, whichever is recorded. A dash if none. |
| Tech | Your name. It is written on every chain-of-custody line you create. |

**Left: Work Queue**

| Field | What it means |
|---|---|
| Row heading | The accession, specimen and block, and a priority badge (STAT, Rush or Routine) from the case. |
| ✕ | Takes the slide out of the queue. It does not undo any routing already saved. |
| Second line | The stain and the routing status, or "Not yet routed". |
| Third line | Where it is going: the pathologist's name, "Subspecialty pool", the scanner, or "Unassigned". |

**Center**

| Field | What it means |
|---|---|
| Batch Progress | One small square for each queued slide, labelled with its block. Colours show physical, digital or exception. Hold the pointer over a square to read the slide and stain. Select a square to make that slide the active one. |
| Unresolved Scans | The last five scans that did not match anything, with the reason and time. |
| Active Slide | The slide you are working on: its name, stain and routing status. |
| Split-destination warning | Appears when slides from the same block are going to different places (see below). |
| Scan Exception Log | A Note box and three reason buttons (Unreadable Barcode, Unassigned Accession, Missing Glass). |
| Trigger Replacement Label | Prints a new label for the active slide. |
| Chain of Custody | Every step recorded for the slide, newest first, with the time. |

**Right: Destination & Assignment**

| Field | What it means |
|---|---|
| Physical Checkout / Digital Scanner | Chooses the kind of routing. |
| Pathologist or pool | A search box and buttons for pathologists ("Dr. Name") and subspecialty pools. Choosing one clears the other. Selecting the same button again clears it. |
| Slide Folder ID, Tray Number, Courier Transit Bag | Where the physical slide is going. |
| Scanner Instrument | A slide scanner from the laboratory's equipment list. |
| Rack ID, Slot Position | Where the slide sits in the scanner (examples shown: Rack 102, Slot 14). |

When you select a slide that has not been routed, the physical side is filled in with the case's assigned pathologist and subspecialty pool, if the case has them. Your laboratory can require some of these fields, shown by a red star; a line beginning "Still required" names anything missing, and the confirm button stays grey. By default the folder, tray, courier bag, rack and slot are optional, but a checkout always needs at least one of a pathologist, a pool or a location ("a pathologist, pool or location").

**Routing status shown for a slide**

| Status | Meaning |
|---|---|
| Assigned | A pathologist or pool is set but no physical location has been recorded. |
| Checked out | A folder, tray or courier bag has been recorded. |
| In scanning queue | A scanner is chosen, but no rack and slot yet. |
| Loaded on scanner | Scanner, rack and slot are all recorded. |
| Scanned | The slide's scan batch was unloaded after a good scan. |

### Prompts and messages

| Text | Where and what it means |
|---|---|
| Scan or type a barcode… | Grey hint in the scan box. Scan a slide or block, or type the barcode and select **Go**. |
| No slides scanned yet. | Shown in the Work Queue until the first scan. The queue is not kept when you leave the page. |
| Search pathologists or pools… | Hint in the recipient search for a physical checkout. Type part of a name to narrow the buttons. |
| e.g. Rack 102 | Hint in **Rack ID** for a scanner routing. |
| e.g. Slot 14 | Hint in **Slot Position** for a scanner routing. |

### Toolbar

| Button | What it does |
|---|---|
| Go | Looks up the barcode typed in the scan box. A scanner does the same without pressing it. |
| ✕ (queue row) | Removes the slide from the queue. |
| Confirm Physical Routing | Saves the checkout for the active slide. |
| Confirm Scanner Routing | Saves the scanner routing for the active slide. |
| Unreadable Barcode, Unassigned Accession, Missing Glass | Flags the active slide with that reason, and the note if you typed one. |
| Resolve | Clears the open exception on the active slide. |
| Trigger Replacement Label | Opens a reason window, then prints a new label. The label uses your laboratory's configured slide label layout (the same one the Microtome Workstation prints with). |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Priority badge | The case priority: STAT, Rush or Routine. |
| Highlighted queue row or square | The active slide. |
| Square colours | Physical routing, digital routing, or an open exception. |
| Warning with a triangle in the Active Slide panel | Either a split-destination warning or the slide's open exception. |

**Split-destination warning wording.** "Slides on this block are split between physical checkout and digital scanning." / "Slides on this block are checked out to different pathologists or locations." / "Slides on this block are loaded on different scanners." The warning appears only when at least two slides on the block have been routed. When all go to the same place, nothing is shown. It looks at one block only, not at the whole case.

### Hotkeys

Both keys work while this screen is open, and each acts only for the side of the destination panel that is on screen. An administrator can change them.

| Key | Spoken phrase | Action |
|---|---|---|
| Ctrl+Alt+Shift+P | "confirm checkout" or "check out slide" | Confirm Physical Routing, while Physical Checkout is showing. |
| Ctrl+Alt+Shift+D | "confirm scanner" or "send to scanner" | Confirm Scanner Routing, while Digital Scanner is showing. |
| F1 | none | Opens this help article. |

Each key applies the same "Still required" checks as its button. Phrases are also available in French, German, Dutch, Korean and Spanish. See [Voice and Keyboard](help:voice-and-keyboard). There is no foot pedal action on this screen.

### Using a tablet at the bench

Since Batch 735 the station screens work with a finger, including a gloved one.

- **Touch layout.** On a tablet, buttons, chips and tick boxes are at least 44 px, main actions such as Confirm or Print are larger, and text in fields is 16 px. On a desktop the screen keeps its compact layout. Change this per computer with **Touch layout on this computer** in the station menu at the top (**Auto**, **Always on**, **Always off**).
- **Scanning.** The scan field accepts a barcode scanner without opening the on-screen keyboard and stays ready for the next scan. To type an ID by hand, select **⌨ Type**; **⌨ Scan** hides the keyboard again.
- **Keyboard up.** When you type in a field, the field stays in view. If the form's Save button would be hidden by the keyboard, a copy of it appears just above the keyboard.
- **Tooltips.** Tap a label that has extra information to read it.

## Step-by-Step Procedures

### Standard workflow

1. Check the station indicator in the top bar. Open the **Slide Distribution Workspace** tile in the [Pathology Workspace](help:pathology-workspace). The scan box has the cursor.
2. Scan the first slide. It appears in the Work Queue and becomes the active slide; its stain and status show under **Active Slide**. To queue a whole block's slides at once, scan the block (cassette) barcode instead: every slide cut from that block is queued and the first one is active.
3. Check the stain and accession against the slide in your hand.
4. For a pathologist: on **Physical Checkout**, choose the pathologist or pool (it may be filled in already), type the folder, tray or courier bag if you use them, and select **Confirm Physical Routing**. The status changes to Assigned, or to Checked out if a location was given, and a line is added under Chain of Custody.
5. For a scanner: select **Digital Scanner**, choose the **Scanner Instrument**, enter the **Rack ID** and **Slot Position** if the slide is already racked, and select **Confirm Scanner Routing**. The status changes to In scanning queue, or to Loaded on scanner when rack and slot are both given.
6. Scan the next slide. Repeat until the tray is empty. The Batch Progress squares show how many are routed, and which are physical and which digital.
7. Watch for the split-destination warning. If slides from one block are going to different places on purpose, carry on; otherwise route them together.

### Alternative workflow

1. **Select from the queue.** Select a queue row or a Batch Progress square to make that slide active, then route it. Use this to route slides in an order different from the scan order.
2. **Route in two stages.** Confirm a pathologist first (status Assigned) and come back later to add the folder or tray. Values already recorded are kept; only the fields you change are replaced. Each confirmation adds its own history line.
3. **Change a slide's destination.** Select it, switch to the other side of the destination panel and confirm. The new destination is recorded; earlier values stay in the history.

### Exception handling

1. **A slide is missing, or its barcode will not read.** For a scan that matches nothing, a message such as "That scan didn’t match a case, block or slide. Check the barcode and try again." appears and the scan is added to **Unresolved Scans**. For a slide that is in the queue but has a problem (for example the glass is not there), select it, type a **Note** if useful, and select **Missing Glass**, **Unreadable Barcode** or **Unassigned Accession**. The square turns to the exception colour and the slide shows the reason with a **Resolve** button. The note is optional unless your organisation requires it; when it is required, the reason buttons stay grey until you type it.
2. **Resolve an exception.** Once the problem is fixed, select **Resolve**. A "Resolved" line is added to the history.
3. **A label is damaged.** Select **Trigger Replacement Label**. In the "Reason required" window the text reads "A reprinted slide label could be a duplicate, so the reason is kept on the slide’s chain-of-custody record." Choose Damaged label, Unreadable barcode, Smudged print or Other, and select **Reprint**. The reason goes in the history.
4. **No scanner is listed.** The panel says "No slide scanners are set up in Configuration → Equipment." Ask an administrator to add the scanner. Until then a digital routing cannot be confirmed.
5. **A block with no slides.** "Block A1 has no slides to distribute." Check that the slides were cut and recorded at the [Microtome Workstation](help:workstations/microtomy).

!!! warning "Missing glass"
    Flagging a slide as Missing Glass records the problem and sends nothing anywhere. Tell your supervisor, and do not route the slide until the glass is found and you have selected **Resolve**.

### Error recovery

1. If the red line "Could not save this routing — see the message above." appears, read the message above it. It is either the "Still required" line or a note that the slide is no longer in the queue.
2. If "That slide is no longer in the queue." appears, scan the slide again.
3. If you sent a slide to the wrong person, select it, choose the right pathologist and confirm again. The earlier line stays in the history, which is intended.
4. If you removed a slide from the queue by mistake, scan it again. Its routing is unchanged.
5. If a replacement label does not print, a message appears under the button (for example no station selected, or the station is not set up for slide-label printing). The reason has been recorded already. Choose your station in the top bar, or ask your administrator to set up the printer, and try again.

## Tips and Best Practices

### Common mistakes

- Confirming a physical checkout without a pathologist or location. The button stays grey and the line "Still required: a pathologist, pool or location" explains why.
- Routing one slide of a block to a scanner and the rest to the pathologist without meaning to. Watch for the split-destination warning.
- Leaving the page with unrouted slides in the queue. The queue is not kept; scan the slides again.
- Scanning a slide again to refresh its status after a scanner has loaded it. A slide already in the queue is not reloaded. Remove it with ✕ and scan it again to see the current status.

### Efficiency recommendations

- Scan a block barcode to queue all of its slides at once, then route each in turn.
- Let the case's assigned pathologist or pool fill in, then only add the folder or tray.
- Use the keys or voice to confirm while your hands hold the tray.
- Keep the same side of the destination panel open for a run of similar slides. The panel switches to the right side for each slide you select, so check it each time.

### Workflow recommendations

- Distribute STAT and Rush slides first; the priority badge in the queue shows them.
- At the end of the run, check that no square shows the exception colour.
- Use the Chain of Custody list to answer "where is this slide" before you go looking.

## Related Features

### Upstream workflow

- [Microtome Workstation](help:workstations/microtomy): where the slides were cut and labelled.
- [Add-On Orders](help:add-on-orders): additional slides ordered by pathologists reach this bench.
- [Batch Management](help:batch-management): staining and other steps of chain of custody before distribution.

### Downstream workflow

- [WSI Scan](help:batch-management/wsi-scan): slides routed to a scanner wait in its scanning queue, are loaded onto the scanner and scanned. A slide that does not scan, fails, or fails the image check goes back to "In scanning queue".
- [Report](help:report): the pathologist reads the slides and reports the case.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| No Slide Distribution Workspace tile | Your role does not include the Slide Distribution screen. |
| The destination panel says "Select a slide from the queue first." | No slide is active. Scan one or select one. |
| Confirm Physical Routing is grey | No pathologist, pool or location, or a required field is empty. |
| Confirm Scanner Routing is grey | No scanner chosen, or a required field (rack or slot) is empty. |
| The Ctrl+Alt+Shift+P or D key does nothing | The other side of the destination panel is showing, or a required field is empty. |
| "This station takes block, matrix block and slide barcodes." | You scanned a cell block, decant or specimen barcode. |
| Queue is empty after a reload | The queue is kept only while the page is open. |
| A red "Not saved" line above the queue | The last routing, flag or reprint reason was not stored. PathScribe tried again on the newest copy of the case, then reloaded the queued slides as they are stored. Repeat the change. |
| The case's pathologist did not fill in | The case has no assigned pathologist or pool. |

### Resolution steps

1. Read the red or "Still required" line near the button.
2. Select the slide in the queue so the destination panel shows it.
3. Scan the barcode again, or type it and select **Go**.
4. If a red "Not saved: …" line shows, the queued slides have already been reloaded as stored: the routing you just made is not on them, so repeat it. A replacement label is printed only after its reason has been saved, so an unsaved reason never produces a label. Otherwise reload the page and scan the slides again to check what has been saved; routings already confirmed are kept.
5. Check the station indicator if a replacement label will not print.

### When to contact support

Contact your laboratory's PathScribe support when a routing you confirmed is not shown after you scan the slide again, a slide's history lines are missing, or a replacement label prints wrongly. Have the accession, block and stain, and the time ready.
