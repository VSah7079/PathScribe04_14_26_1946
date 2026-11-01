---
module: Workstations
screen: Cytology Preparation
workflow: Bench and Workstation Work
role: [Cytotechnologist, Histotechnologist, Laboratory Manager]
keywords: [cytology preparation, fluid, decant, aliquot, cell block, hand-off, cytospin, liquid-based, ThinPrep, SurePath, volume, yield]
routes: [/workstations/cytology-prep]
previous: workstations/embedding
next: workstations/microtomy
related: [pathology-workspace, cytology, batch-management, workstations/microtomy]
status: Draft
---

# Cytology Preparation {#top}

## Overview

**Purpose.** The Cytology Preparation bench is where a fluid or other cell sample is prepared (Batch 740): you scan the container, record how much there is and what came out of it, accept or change the suggested slides, print their labels, and make cell blocks. A cell block goes on to the Microtome only after its **hand-off**: you scan the fluid or aliquot it was made from, then its cassette, and both must match. Until then the Microtome refuses it ("Cell block … has not been handed off"), so no cell block reaches histology without its source.

**Intended users.** Cytotechnologists and histotechnologists who prepare fluids. The screen opens for roles with the Cytology Preparation screen switched on; by default the Cytotechnologist and Histotechnologist roles.

## Screen Tour {#screen}

Pathology Workspace → **Cytology Preparation**.

### Field definitions

| Field | What it means |
|---|---|
| Scan a container or decant barcode | Scan a fluid (residual fluid), an aliquot or a cell block. A block is refused: "This is a block: cut it at the Microtome." |
| Decant | The decant on the bench and its type, for example "D1 — Residual Fluid" or "D3 — Aliquot for flow cytometry". |
| Total Volume (mL), Appearance, Decant Yield / Pellet Size | As at the Microtome before Batch 740. A CSF, or any fluid of 5 mL or less, is suggested two cytospin slides. |
| Accept suggestion | Adds the suggested slides; print them with **Print/Etch Next** or in a batch, as at the Microtome. |
| Cell blocks | The specimen's cell blocks. **Make a cell block from this decant** adds one ("Cell block A D2 made. Print its label, then hand it off once the pellet is in the cassette."). |
| Print label | Prints the cell block's label; its barcode is what the hand-off scans. |
| Hand off | Two scans: **Scan the source fluid or aliquot**, then **Scan the cell block cassette**. "Cell block … handed off to histology." The row then reads "Handed off by (name), (time)". |
| Waiting for hand-off | The cell block has not been handed off yet; the Microtome will refuse it. |

### Divide specimen

Batch 741. Under each specimen, **Divide specimen** splits it into aliquots, one per destination (for example flow cytometry, microbiology, molecular). Enter **Starting volume (mL)**; each row has **For** (the purpose), **Volume (mL)**, **Destination type** (Department or Reference laboratory) and **Destination**. A fluid or FNA specimen's protocol pre-fills its usual rows; **+ Add aliquot** and **Remove** change them. The line under the rows accounts for the volume: "Split 8 mL of 30 mL; 22 mL remaining." **Divide** saves it once: "Divided into D2, D3; 22 mL remaining." A specimen can be divided once; the record then reads "Divided by (name), (time): 8 mL of 30 mL into aliquots, 22 mL remaining."

Each aliquot shows its volume and destination ("5 mL → Flow Cytometry") and its status: **Not sent**, **Sent**, **Received**, **Result back**. **Mark Sent** (and so on) moves it forward one step; the status never goes back. For **Result back**, type the **Receiving accession number** (the receiving department's own number for it) first. Results stay in that department's system.

Messages: "Enter the starting volume first.", "Add at least one aliquot.", "Every aliquot needs a volume above 0 mL.", "Every aliquot needs a destination.", "The aliquots add up to more than the starting volume.", "This specimen has already been divided.", "An aliquot's status only moves forward.", "Enter the receiving department's accession number to record Result back."

### Prompts and messages

See Troubleshooting below.

### Toolbar

**Back** returns to Pathology Workspace; **Scan next** clears the bench for the next container.

### Icons and status indicators

A cell block row shows **Waiting for hand-off** (amber) until it is handed off, then "Handed off by (name), (time)" (green).

### Hotkeys

The foot pedal and keyboard shortcuts of the Microtome are not set up here yet; scan and the buttons work by touch, mouse or keyboard.

### Using a tablet at the bench

The scan fields take a barcode without opening the on-screen keyboard, as at the other stations.

## Step-by-Step Procedures {#steps}

### Standard workflow

1. Scan the fluid container. Enter the volume, appearance and yield; select **Accept suggestion**, then print the slides.
2. To make a cell block, select **Make a cell block from this decant**, then **Print label** and put the label on the cassette.
3. When the pellet is in the cassette, select **Hand off**, scan the fluid, then scan the cassette.
4. Take the cell block to the Microtome.

### Alternative workflow

An aliquot (for example for flow cytometry) is scanned the same way; it carries no slides of its own unless you add them.

### Exception handling

A cell block planned at Accession (by the specimen's protocol) has no parent: hand it off against any fluid or aliquot of the same specimen.

### Error recovery

If a hand-off or a new cell block shows "Not saved", scan the container again and repeat; nothing was recorded.

## Tips and Best Practices {#tips}

### Common mistakes

Scanning the cassette first: the hand-off asks for the source first, then the cassette.

### Efficiency recommendations

Print a cell block's label as soon as you make it, so the hand-off scan is ready when the pellet is.

### Workflow recommendations

Hand off cell blocks in a group at the end of a run, before they go to processing.

## Related Features {#related}

### Upstream workflow

Accession (the specimen and, from its protocol, its fluid, aliquots and planned cell blocks).

### Downstream workflow

[Batch Management](batch-management) (Liquid-Based Cytology Processing and Cytology Staining batches), [Microtome Workspace](workstations/microtomy) (handed-off cell blocks), [Cytology](cytology) (screening).

## Troubleshooting {#messages}

### Common user issues

| Message | What to do |
|---|---|
| Not handed off: the first scan is not the fluid or aliquot this cell block was made from. | Scan the container the cell block was made from. A cell block planned at Accession can be scanned against any fluid or aliquot of the same specimen. |
| Not handed off: the second scan is not this cell block's cassette. | Scan the cassette of this cell block (print its label if needed). |
| This cell block was already handed off. | Nothing to do: take it to the Microtome. |
| You don't have permission to hand off a cell block. | Ask your administrator for "Hand off a cell block to histology". |

### Resolution steps

1. Read the message under the scan box or in the Cell blocks panel.
2. Scan the container again, or type its barcode and select **Go**.
3. For a hand-off that was refused, select **Hand off** again and scan the fluid first, then the cassette.

### When to contact support

Contact your laboratory's PathScribe support when a hand-off is refused although both labels are right, or when a cell block made here does not appear after reloading. Have the case number, the decant and cassette labels and the time ready.

## At the Microtome {#microtome}

The Microtome now takes only blocks and handed-off cell blocks. Scanning a fluid or aliquot there says "… is a fluid or aliquot: prepare it at the Cytology Preparation bench."
