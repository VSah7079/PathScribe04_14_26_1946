---
module: Pathology Workspace
workflow: Bench and Workstation Work
role: [Histotechnologist, Pathology Assistant, Laboratory Manager]
keywords: [pathology workspace, microtome, embedding, slide distribution, cytology, molecular, batch management, workstation]
routes: [/pathology-workspace]
previous: grossing
next: worklist
related: [bench-contributions, grossing, batch-management, workstations/embedding, workstations/microtomy, workstations/slide-distribution, cytology, molecular]
status: Draft
---

# Pathology Workspace {#top}

## Overview

**Purpose.** Pathology Workspace is the doorway to the laboratory's workstations. It is a second-level screen of tiles: grossing, add-on orders, margin exception review, cytology screening, molecular diagnostics, the microtome, embedding and slide distribution workstations, and batch management. Choose a tile to open that workstation.

**Intended users.** Histotechnologists, pathology assistants and laboratory managers. Cytology and molecular staff reach their own workstations here too. What you see depends on your role.

**Where it fits.** The bench work follows [Grossing](help:grossing): cassettes are embedded, sectioned into slides, and the slides are handed out to pathologists or sent to a scanner. When the slides are ready, cases continue on the [Worklist](help:worklist). To see how your own bench work is going, open [Bench Contributions](help:bench-contributions).

## Screen Tour

![The Pathology Workspace with its tiles](capture:pathology-workspace-overview)

!!! note "You only see tiles you may open"
    A tile appears only if your role may open that workstation. A colleague with a different role will see a different set. If a tile you expect is missing, ask your laboratory manager to check your access.

### Field definitions

| Item | What it means |
|---|---|
| Pathology Workspace | The screen title. |
| Subtitle | "Cytology screening, molecular diagnostics, the microtome, embedding, and slide distribution workstations, and batch management". |
| Tiles | One per workstation. Each has a title and a one-line description of what it is for. |

The tiles, when your role allows them:

| Tile | One-line description on the tile |
|---|---|
| Grossing | For pathology assistants and grossing pathologists. Opens the list of cases waiting to be grossed, and from there the Grossing screen with its bench tools (cassettes, photos, loading a decal or processing carrier, add-on orders). |
| Add-On Orders | Opens the Add-On Orders screen, where add-on stains and levels are ordered on blocks already cut. |
| Margin Exception Review | The tile reads "Review margin answers". Margin-distance answers the system could not read, to tag or dismiss. Moved here from Quality & Compliance, so pathologists reach it from their workspace. |
| Cytology Workspace | The tile reads "Screening, triage and QC". Primary screening hub for GYN Paps, Non-GYN triage, cell block tracking, and mandatory QC. |
| Cytology Preparation | Batch 740. The tile reads "Fluids, slides, cell block hand-off". The bench where fluids and aliquots are prepared and cell blocks are handed off to histology (see [Cytology Preparation](workstations/cytology-prep)). |
| Microtome Workspace | The tile reads "Slide labels, stains, prep". Real-time on-demand or batch slide label printing, stain management, and cytology/decant prep at the microtome bench. |
| Embedding Workspace | The tile reads "Verify cassettes at embedding". Cassette scan/verify, piece-count confirmation, mold selection, and discrepancy flagging at the embedding bench. |
| Slide Distribution Workspace | The tile reads "Slide checkout and scanning". Continuous-scan checkout to pathologists or ingestion into a digital scanner, with split-destination warnings and exception handling. |
| Molecular Workspace | The tile reads "Batches, plates, runs and QC". Batch and plate management, active runs, and QC/specimen association for molecular diagnostics (HPV, CT/NG, respiratory PCR). |
| Batch Management | Track cassettes and slides through processing nodes via container barcodes. |

!!! note "Workstation names"
    The tile for the microtome workstation is called Microtome Workspace, but once you open it the page is titled Microtome Workstation. The same applies to Embedding and Slide Distribution, which are titled Embedding Station and Slide Distribution Station.

### Toolbar

| Button | What it does |
|---|---|
| ← Back to Home | Returns to the Home Dashboard. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Tile highlight when you point at it or tab to it | The tile you are about to open. |
| Coloured tile with a picture | Each workstation has its own colour. Some pictures are placeholders until real photographs are added. |

### Hotkeys

None are specific to this screen. Alt+H (Go Home) returns you to Home, and F1 (View Help) opens the guide page for the screen you are on. You can move between tiles with the Tab key and open one with Enter or the space bar.

### Cytology Workspace

**What it is for.** The cytology worklist: your assigned cases, the shared pool and the shared QC rescreen queue. A switch at the top chooses **GYN Cytology** or **Non-GYN / FNA Queue**.

**How to start.**

1. Select the **Cytology Workspace** tile. The Cytology Worklist opens.
2. Choose **GYN Cytology** or **Non-GYN / FNA Queue**.
3. Pick a list such as **My Worklist** or **Pool**. Use **Claim** on a pool case to take it.
4. Open a case row to go to the screening page.

### Molecular Workspace

**What it is for.** Batch and plate management for molecular runs (HPV, CT/NG, respiratory PCR panels, targeted NGS).

**How to start.**

1. Select the **Molecular Workspace** tile. The screen opens on **Active Runs & Batches**.
2. Use the tabs to move between **Worklist & Plate Builder**, **Active Runs & Batches**, **History & Archive** and **QC & Specimen Association**.
3. To build a new run, select **+ New Batch**. **Control Rules** opens the molecular control rules.

### Microtome Workspace

**What it is for.** The microtome bench: label printing for slides, stains to cut, and preparation of cytology fluids and decants.

**How to start.**

1. Select the **Microtome Workspace** tile. The Microtome Workstation opens with the prompt "Scan a block or decant/fluid container barcode to begin".
2. Scan the block (or type the barcode in the box) and select **Go**.
3. A **Block Summary** appears with the patient and block details, and a **Slide Grid** shows the slides for the block.

### Embedding Workspace

**What it is for.** The embedding bench: confirming each cassette, counting pieces, choosing a mold and reporting problems.

**How to start.**

1. Select the **Embedding Workspace** tile. The Embedding Station opens with the prompt "Scan a cassette barcode to begin".
2. Scan the cassette (or type the barcode) and select **Go**.
3. The **Block Summary** appears, with **Piece Count Verification**, **Base Mold Size**, **Orientation Instructions** and **Discrepancy Reporting** for the block. The station takes block cassettes only.

### Slide Distribution Workspace

**What it is for.** Handing finished slides to pathologists or pools (physical checkout) or sending them to a slide scanner (digital).

**How to start.**

1. Select the **Slide Distribution Workspace** tile. The Slide Distribution Station opens with the prompt "Scan a slide or block/cassette barcode — the queue grows continuously".
2. Scan slides or blocks. They collect in the **Work Queue**.
3. Choose a slide, then set its **Destination & Assignment**: **Physical Checkout** or **Digital Scanner**, and confirm the routing. Barcodes that cannot be read are listed in the **Scan Exception Log**.

### Batch Management

**What it is for.** Following groups of cassettes and slides through processing steps (decalcification and special processing, processing, embedding, microtome, staining, checkout) by their container barcodes.

**How to start.**

1. Select the **Batch Management** tile. The list of batches opens, with **Active & Reconciling** and **Complete & Aborted** sections.
2. Scan or type a master batch barcode in the lookup box to find a batch, or select **New Container** to register one.
3. Tiles on the screen open related queues, such as Pending Load, Disposal, Retention Holds, Label reprint, Slide scanning, Engraver Monitor and Equipment log.

!!! note "Full articles per workstation come later"
    Each workstation will get its own guide article. The steps above are only the first moves.

## Step-by-Step Procedures

### Standard workflow

1. Open the Home Dashboard and select the **Pathology Workspace** tile. This screen opens.
2. Find the tile for the work you are about to do.
3. Select the tile, or press Enter when it is highlighted. The workstation opens.
4. When you finish, use the browser's Back button or the breadcrumb bar to return here, or select **← Back to Home** on this screen.

### Alternative workflow

1. Press F1 on any workstation to open its guide page.
2. Use Alt+H to jump straight to Home.

### Exception handling

1. If a workstation tile is missing, your role does not include it. Tell your laboratory manager which workstation you need and why.
2. If a workstation says a scan "didn't resolve" or "wasn't found", check the barcode, scan again, or type it into the box.

### Error recovery

1. If you opened the wrong workstation, go back to this screen and choose the right tile. Nothing is changed by only opening a workstation.
2. If the screen looks empty, refresh the page. If tiles are still missing, sign out and sign in again.

## Tips and Best Practices

### Common mistakes

- Looking for Batch Management or Molecular on the Home Dashboard. They are now tiles here.
- Scanning the wrong kind of barcode. The Embedding Station takes block cassettes only, and the Slide Distribution Station takes block and slide barcodes only.

### Efficiency recommendations

- Keep a barcode scanner connected: every workstation opens ready for a scan.
- Use Tab and Enter to move between tiles without the mouse.

### Workflow recommendations

- Work in bench order: Embedding, then Microtome, then Slide Distribution.
- Use Batch Management to follow groups of items between steps.

## Related Features

### Upstream workflow

- [Grossing](help:grossing): tissue is cut up and placed in cassettes before embedding.

### Downstream workflow

- [Worklist](help:worklist): cases continue once slides reach the pathologist.
- [Bench Contributions](help:bench-contributions): review your accessioning, batch and molecular QC figures.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| A tile is missing | Your role does not include that workstation. |
| A scan is not accepted | The barcode is of a type the workstation does not take, or it was not read correctly. |
| A tile picture looks generic | Some pictures are placeholders until real photographs are added. |

### Resolution steps

1. Check the barcode and scan again.
2. Refresh the page.
3. Sign out and sign in again.
4. Ask your laboratory manager to confirm your access.

### When to contact support

Contact your laboratory's PathScribe support when a tile you should have is missing after you have checked with your manager, or when a workstation will not open. Have the case number and the time of the problem ready.
