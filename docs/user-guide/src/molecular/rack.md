---
module: Molecular
screen: Rack
workflow: Loading tubes and placing the rack on an instrument
role: [Molecular Technologist]
keywords: [extraction rack, rack loading, tube, scan tube, sample ID, accession, deck slot, place rack, place on instrument, deck position, LOC-INST, new rack, rack barcode, movement]
routes: [/molecular-rack/:rackId]
previous: molecular/rack-board
next: molecular/batch
related: [molecular, molecular/rack-board, molecular/batch, molecular/control-rules]
status: Draft
---

# Rack {#top}

## Overview

**Purpose.** This screen, titled "Extraction Rack Loading" in its breadcrumb and headed by the rack's barcode, does two jobs. First it creates a new extraction rack. Second, for an existing rack, it lets you scan each specimen tube into a numbered position, give every tube its accession (the sample ID), and then place the finished rack on an instrument's deck, with a check that the deck slot is the right one.

**Intended users.** Molecular technologists preparing specimens for lysis and extraction.

**Where it fits.** It sits between accessioning and the plate. Open the rack from the [Rack Board](help:molecular/rack-board). When the rack is on the instrument, build the plate and send the worklist in [Batch](help:molecular/batch). Each tube you scan records a movement from the primary vial to the rack, with your name, the workstation and the time. That record appears later in the Trace of the run result.

!!! note "No tube can be removed here"
    A position holds one tube at a time. The screen has no way to take a tube out or replace it once it is scanned in. Tubes that have no accession can be given one. If a tube was scanned into the wrong position, tell your laboratory manager before you place the rack; see Error recovery.

## Screen Tour

![The extraction rack with numbered positions, one flagged for a missing sample ID, and the Place on instrument panel](capture:molecular-rack-overview)

There are two forms of the page. With the address ending **/new** it is the new rack form. With a rack's own number it is the rack itself.

### Field definitions

**New Extraction Rack**

| Field | What it means |
|---|---|
| Rack identifier / barcode * | Scan or type the rack's own barcode (the box shows the example "e.g. RK-HPV-0417"). Leave it blank and PathScribe generates one (RACK-MOLE- and a number). Letters are made upper case. It must be 3 to 40 letters, digits, dashes or underscores, starting with a letter or digit. |
| Capacity | How many tube positions the rack has. It starts at 24; the box accepts 1 to 384. |

**The rack**

| Item | What it means |
|---|---|
| Heading | The rack barcode. |
| Position grid | One button per position, numbered 1, 2, 3 and so on. |
| Instruction line | "Select an empty position, then scan a specimen vial to load it. Each load records the vial-to-rack movement with the current user and station. When every tube has its sample ID, place the rack on its instrument below." |
| "Needs a sample ID: position 3, 4. Click a flagged position to record its accession." | Shown when a tube has no accession. It lists the positions. |
| Hover text on a position | "Position 1 — empty"; "Position 1: SPEC-0001 (S26-1001)" for a tube with its accession; "Position 1: SPEC-0001, no accession yet" for a tube without one. |

**Loading a tube**

| Field | What it means |
|---|---|
| Tube barcode | The tube's barcode, when you type it. |
| Accession number | The accession the tube belongs to. Optional when you load, but the rack cannot be placed until every tube has one. |
| Accession for position N (barcode) * | Appears when you click a flagged position, to record the missing accession. |

**Place on instrument**

| Field | What it means |
|---|---|
| Instrument * | The active analyser the rack is going on. The list shows the analysers of this workstation's laboratory first. Until you choose, it reads "Select an instrument". |
| Assay | The test the rack is for. Optional unless your laboratory requires it. Until you choose, the list reads "Select an assay". It narrows the slots to the ones the test's control rule allows. When the rule names slots, a line reads "This assay's sample rack goes in A1, A2." |
| Deck slot | The slot on the instrument. Until you choose, it reads "Select a slot". It lists only slots that take a sample rack and suit the test. Required only when the instrument has more than one such slot. Otherwise you see "This instrument has one slot for a sample rack, so no slot is needed." or "No deck layout is recorded for this instrument (Configuration → Equipment)." |
| Placed line | After placing: "Placed on PANTHER_01, slot A1, by Name, date." |

### Toolbar

| Button | What it does |
|---|---|
| ← Back to Racks | Returns to the [Rack Board](help:molecular/rack-board). |
| Create Rack | Creates the rack and opens it. Shows "Creating…" while it works. |
| Scan into position N | Waits for a barcode scan for the selected empty position. The button then reads "Waiting for scan into position N…". |
| Scan not working? Enter specimen ID manually | Opens boxes for the tube barcode and accession. **Load** puts the tube in the position (Enter does the same). **Cancel** closes the boxes. |
| Save | Records the accession for a flagged tube (Enter does the same). |
| Scan deck position | Waits for a scan of the label on the instrument's deck slot. The button reads "Waiting for the deck position's barcode…". |
| Place rack | Places the rack on the chosen instrument and slot. After a first placement the button reads **Record new placement**. Shows "Placing…" while it works. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Plain position | Empty. |
| Occupied position | Holds a tube. Not selectable unless it is flagged. |
| Flagged (unmapped) position | Holds a tube but no accession. Click it to record one. |
| Selected position | The one that the next scan will fill. |
| "Still required: …" | The placement fields still missing: for example "Sample ID for every occupied position", "Instrument", "Deck slot". The rack must also hold at least one tube. |
| Red warning under Place on instrument | The slot or scan is wrong. See Exception handling. |
| Green "Scanned: …, slot …." (for example "Scanned: PANTHER_01, slot A1.") | A deck scan was accepted. |

### Hotkeys

| Key | Action |
|---|---|
| Ctrl+Alt+Shift+P | Place the rack. Works on a saved rack and acts exactly as **Place rack**, including all the checks. |

You can also say "place rack" or "rack on instrument".

## Step-by-Step Procedures

### Standard workflow

Creating a rack and loading it:

1. On the [Rack Board](help:molecular/rack-board) select **+ New Rack**. You see "New Extraction Rack".
2. In **Rack identifier / barcode**, scan or type the barcode on the physical rack. Leave it blank if the rack has none.
3. Set **Capacity** to the number of tube positions on the rack.
4. Select **Create Rack**. The rack opens, headed by its barcode, with an empty numbered grid.
5. Click position 1. It is highlighted, and the button **Scan into position 1** appears.
6. Select the button, then scan the first tube. You see the tube in position 1; position 2 is selected and the scan is armed again ("Waiting for scan into position 2…").
7. Scan the rest of the tubes in order. If your scanner recognises the accession from the tube, it is stored with the tube.
8. Look at the line "Needs a sample ID: …". For each flagged position, click it, type the accession in **Accession for position N**, and press **Save** or Enter. The position stops being flagged and the selection clears.
9. When no position is flagged, scroll to **Place on instrument**.
10. Choose the **Instrument**. Choose the **Assay** if your laboratory uses it. Choose the **Deck slot** if it is offered.
11. Select **Place rack**. You see "Placed on PANTHER_01, slot A1, by Name, date." The Rack Board now shows the rack as on that instrument.

### Alternative workflow

1. **Typing a tube instead of scanning.** Select the empty position, then **Scan not working? Enter specimen ID manually**. Type the **Tube barcode** and the **Accession number**, then select **Load** or press Enter. The boxes close and the next empty position is selected.
2. **Placing by scanning the deck.** Select **Scan deck position** and scan the label on the deck slot (it reads LOC-INST-, the instrument, and the slot). The instrument and slot fill in. You see "Scanned: PANTHER_01, slot A1." and the rack's place is recorded as a deck scan.
3. **Placing by voice.** Say "place rack" once the fields are complete.
4. **Moving a rack.** Change the instrument or slot and select **Record new placement**. The placed line is updated with who moved it and when.

### Exception handling

1. **"A rack barcode is 3 to 40 letters, digits, dashes or underscores."** The barcode you typed is not allowed. Remove spaces and symbols other than dash and underscore.
2. **"Another rack already has this barcode."** A rack with that barcode exists. Open it from the board instead.
3. **"That position already holds a tube. A position holds one tube at a time."** Someone filled it (possibly on another workstation). Select another position.
4. **The deck scan is not a deck position.** You see "That isn't a deck position barcode. Scan the label on the deck slot." You scanned something else, such as a tube. Scan the deck label.
5. **Scan names a different instrument.** "Wrong instrument: that position is on PANTHER_02, not PANTHER_01." Choose the right instrument or scan the right label.
6. **Scan names an instrument that is not active.** "The deck barcode names X, which isn't an active analyser."
7. **Wrong slot.** "Wrong slot: A5 on PANTHER_01 doesn't take a sample rack. Move the rack." or "Wrong slot: this assay's sample rack doesn't go in B1. Move the rack." or "PANTHER_01 has no slot Z9." The slot is shown in the list marked "(not valid here)". Place the physical rack in a valid slot and choose it. **Place rack** stays off while a slot problem is shown.
8. **"No slot on this instrument suits this rack and assay."** The deck layout or the test's control rule is wrong. Ask an administrator to check Configuration → System → Workstation & Hardware → Equipment, and the [Control Rules](help:molecular/control-rules).
9. **"The rack can't be placed until every required field is filled in."** Read the "Still required:" line.
10. **"That instrument isn't an active analyser."** The instrument was retired. Choose another.

!!! warning "Scan each tube against the tube in your hand"
    A tube in the wrong position, or with the wrong accession, ties a result to the wrong patient. There is no way to unload a tube on this screen. Check the accession and the position before you press Load or Save.

### Error recovery

1. **A tube has the wrong accession.** Only a tube with no accession can be given one on this screen. If the accession is wrong, do not place the rack. Tell your laboratory manager, who can have a new rack created and the specimens rescanned.
2. **A tube went into the wrong position.** The same: the position cannot be cleared. Tell your laboratory manager before the rack goes on an instrument.
3. **The rack was placed in the wrong slot.** Choose the right slot and select **Record new placement**.
4. **A scan did not register.** The screen goes on waiting. Select the button again to turn the wait off and on, or use manual entry.
5. **A message appears that you do not understand.** Messages that PathScribe does not recognise read "Something went wrong. Try again." or "Unknown error loading specimen into rack." Try again once; if it repeats, report it.

## Tips and Best Practices

### Common mistakes

- **Scanning with no position selected.** The scan has nowhere to go. Select a position first; after the first scan the next is selected for you.
- **Forgetting the accession.** The tube loads but the rack will not place. Look for flagged positions.
- **Using a barcode with spaces or symbols.** Only letters, digits, dashes and underscores.
- **Trying to place an empty rack.** At least one tube is needed.
- **Choosing a slot by memory.** Pick from the list or scan the deck label; the screen checks it.

### Efficiency recommendations

- After the first scan the screen selects the next empty position and arms the scanner. Keep scanning; do not click.
- Scan the deck position instead of choosing the instrument and slot by hand.
- Use manual entry only when the barcode is damaged. Type the accession at the same time to avoid a flagged position.

### Workflow recommendations

- Load racks in the order the specimens arrive and finish one rack before starting the next.
- Place the rack on the instrument before you send the plate's worklist ([Batch](help:molecular/batch)).
- Let your laboratory manager know about any tube that cannot be fixed on screen before the run is dispatched.

## Related Features

### Upstream workflow

- [Rack Board](help:molecular/rack-board): the list from which you open or create a rack.
- [Accession](help:accession): where each specimen's accession number comes from.
- [Control Rules](help:molecular/control-rules): which deck slots a test's sample rack may use.

### Downstream workflow

- [Batch](help:molecular/batch): the plate and its worklist.
- [Molecular](help:molecular): follow the run through its tabs.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| Place rack is greyed out. | A field is missing, a tube has no accession, the rack is empty, or a slot problem is showing. |
| The Deck slot list is empty. | The instrument has no deck layout, or none of its slots suit the rack or the test. |
| The Deck slot list is greyed out. | No instrument is chosen yet. |
| I cannot click a position. | It holds a tube that already has an accession. |
| The scan fills nothing. | No position is selected, or the scan button was not pressed. |
| The Assay list does not offer my test. | The test is not an active molecular test in the diagnostic catalog. |
| Capacity will not go above 384. | That is the limit. |

### Resolution steps

1. Read the red or "Still required:" line near the Place button; it names the problem in words.
2. Click a flagged position and record its accession.
3. If the slot is not allowed, move the physical rack and choose or scan the valid slot.
4. Reload the page and look at the rack again if it seems out of date.
5. If the instrument or slot you need is not offered, ask an administrator to check the equipment register and the control rule.

### When to contact support

Contact your laboratory's PathScribe support when a rack will not place although every field is filled and no warning shows, or when a scan keeps landing in the wrong position. Have the rack barcode, the position and the time ready.
