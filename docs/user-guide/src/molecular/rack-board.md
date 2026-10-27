---
module: Molecular
screen: Rack Board
workflow: Extraction racks before plate loading
role: [Molecular Technologist, Laboratory Manager]
keywords: [extraction rack, rack list, rack board, tube rack, lysis, extraction, occupied, needs sample IDs, placed on instrument, new rack]
routes: [/molecular-rack]
previous: molecular/batch
next: molecular/rack
related: [molecular, molecular/rack, molecular/batch, molecular/control-rules]
status: Draft
---

# Rack Board {#top}

## Overview

**Purpose.** The Rack Board is the list of extraction racks. On screen its heading is "Extraction Racks", with the line "Physical tube racks holding input specimens prior to or during lysis/extraction, ahead of plate loading." Each row is one physical rack of specimen tubes, with how full it is and where it stands: still being loaded, waiting for sample IDs, or already placed on an instrument. From here you start a new rack or open an existing one.

**Intended users.** Molecular technologists who prepare specimens for a run. Laboratory managers use it to see what is waiting.

**Where it fits.** The rack comes before the plate. Specimens are scanned into tube positions on a rack ([Rack](help:molecular/rack)), the rack is placed on the instrument's deck, and then the plate for the run is built and its worklist sent ([Batch](help:molecular/batch)). You reach the board from the **Extraction Racks** button on the [Molecular](help:molecular) screen. Like the rest of the Molecular screens it needs the Molecular screen permission; by default that belongs to the Molecular Technologist role. If the button or the address does not open, you will see "You don't have access to this screen" with a **Back to Home** button; ask your administrator to add the Molecular screen to your role.

## Screen Tour

![The Extraction Racks list showing racks with capacity, occupied tubes and status](capture:molecular-rack-board-overview)

The page has the heading and subtitle at the top left, a **+ New Rack** button at the top right, and a table below.

### Field definitions

| Column | What it means |
|---|---|
| Rack | The rack's own barcode, for example RK-HPV-0417. If you did not give a barcode when you created the rack, PathScribe made one that starts RACK-MOLE- followed by a number. |
| Capacity | How many tube positions the rack has. |
| Occupied | How many positions hold a tube, shown as for example "9 / 24". |
| Status | Where the rack stands (see the table of indicators). |
| Created | The date and time the rack was created, in your language's format. |

The newest rack is at the top. While the list loads you see "Loading…". When there is no rack at all you see "No extraction racks yet."

### Toolbar

| Button | What it does |
|---|---|
| + New Rack | Opens a blank "New Extraction Rack" form ([Rack](help:molecular/rack)). |
| A row | Click anywhere on a row (or select it with the keyboard and press Enter) to open that rack. |

There is no search box, filter or sort control on this page. The board shows every rack, newest first.

### Icons and status indicators

| Status | Meaning |
|---|---|
| Loading | The rack is still being filled, and every tube on it already has its accession. This word means the rack is being loaded, not that the page is loading. |
| Needs sample IDs | At least one tube is on the rack but has no accession against it. The rack cannot be placed on an instrument until each tube has one. |
| On *instrument* | The rack has been placed on that instrument. |
| On *instrument*, *slot* | The rack has been placed on that instrument in that deck slot. |

The status is worked out each time the page opens from what is on the rack. A rack that has been placed always reads as placed, even if a tube was added afterwards.

### Hotkeys

None on this screen.

## Step-by-Step Procedures

### Standard workflow

1. On the [Molecular](help:molecular) screen select **Extraction Racks**. The board opens with the newest rack first.
2. Look at the Status column. Racks that read **Needs sample IDs** are the ones that still need work before they can go on an instrument. Racks that read **On** an instrument are done.
3. To start a rack, select **+ New Rack**. The "New Extraction Rack" form opens. Complete it as described in [Rack](help:molecular/rack).
4. To carry on with a rack, click its row. The rack's page opens with its positions.
5. When you are finished, use **← Back to Racks** on the rack's page. The board shows your rack with its new Occupied count and Status.

### Alternative workflow

1. **Finding a rack for a run.** Go to the Rack Board, look for the rack barcode written on the physical rack, and click it. The barcode in the Rack column is what is printed or scanned.
2. **Checking what is ready to run.** Read down the Status column. A rack on an instrument is ready for the worklist. Then go to the plate in [Batch](help:molecular/batch).
3. **Going back from a plate.** The plate screen has no link to the Rack Board. Use **Extraction Racks** on the Molecular screen.

### Exception handling

1. **A rack reads "Needs sample IDs" and you cannot see why.** Open the rack. Positions that hold a tube without an accession are marked in a different colour and a line under the instructions lists their numbers. Give each one its accession.
2. **The rack count looks wrong.** Occupied counts positions that hold a tube barcode. A position that was never scanned does not count.
3. **A rack you expect is missing.** The board lists every rack. Check you are signed in to the right site, and look at the barcode on the physical rack. A new rack is created only by someone using **+ New Rack**.
4. **A rack was placed on the wrong instrument.** Open it and record a new placement. See [Rack](help:molecular/rack).

### Error recovery

1. **You created a rack by mistake.** There is no delete on the board or on the rack's page. An empty rack that is never used does no harm; leave it. If it carries a wrong barcode, create a new one and use that.
2. **The page says "Loading…" for a long time.** Reload the page. If the board is still empty and you know racks exist, tell your laboratory manager.
3. **You opened the wrong rack.** Select **← Back to Racks** and choose the right row. Nothing changes until you scan or save.

## Tips and Best Practices

### Common mistakes

- **Reading "Loading" as a problem.** It is the normal word for a rack being filled.
- **Placing a rack with tubes missing accessions.** The rack will not place; fix the tubes first.
- **Creating a second rack for the same physical rack.** Check the board first and open the existing one. A duplicate barcode is refused ("Another rack already has this barcode.").
- **Searching for a patient here.** The board shows racks, not patients. A tube is found by opening its rack.

### Efficiency recommendations

- Use the rack's barcode label: scan or type it when you create the rack and the barcode shown in the Rack column will match the physical rack.
- Start each shift on the board and clear the **Needs sample IDs** racks first.
- Leave the barcode blank when your laboratory does not label racks. PathScribe will number them for you.

### Workflow recommendations

- Finish a rack in one sitting where you can. A half-loaded rack with tubes that have no accession is the commonest reason a run is late.
- Keep the physical rack barcode and the board in agreement. The board is the record of what is on each rack.
- Place the rack on the instrument before you send the worklist for the plate.

## Related Features

### Upstream workflow

- [Molecular](help:molecular): the workspace that opens the board.
- [Accession](help:accession): the specimens that go on racks are accessioned first.

### Downstream workflow

- [Rack](help:molecular/rack): load tubes into a rack and place it on an instrument.
- [Batch](help:molecular/batch): build the plate and send its worklist.
- [Control Rules](help:molecular/control-rules): the deck slots a test's rack may use are set here.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| I cannot open the Rack Board. | Your role does not have the Molecular screen. |
| The board is empty. | No rack has been created yet: "No extraction racks yet." |
| A rack reads Needs sample IDs. | A tube on it has no accession. |
| Occupied shows fewer than I loaded. | Only positions with a tube barcode count. |
| The Extraction Racks button is missing from the Molecular screen. | You are on the QC & Specimen Association tab, where the header buttons are hidden. Choose another tab. |
| The status did not change after I placed the rack. | Go back to the board; the status is read when the page opens. |

### Resolution steps

1. Check which tab of the Molecular screen you are on, then select **Extraction Racks**.
2. Reload the Rack Board if the list looks stale.
3. Open the rack and read the line above the positions.
4. Ask your administrator to check your role if the screen will not open.

### When to contact support

Contact your laboratory's PathScribe support when a rack you created is missing from the board, or when a rack's status does not match what is on it after you reload. Have the rack barcode and the time of the problem ready.
