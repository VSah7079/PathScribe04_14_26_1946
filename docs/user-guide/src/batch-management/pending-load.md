---
module: Batch Management
screen: Pending Batch Load
slug: batch-management/pending-load
workflow: Bench chain of custody
role: [Histotechnologist, Cytotechnologist, Molecular Technologist, Laboratory Manager]
keywords: [pending load, pending batch, not yet batched, printed cassettes, engraved, waiting to be loaded, unbatched slides, find cassette]
routes: [/batch-management/pending-load]
previous: batch-management
next: batch-management/label-reprint
related: [batch-management, grossing, workstations/embedding, workstations/microtomy]
status: Draft
---

# Pending Batch Load {#top}

## Overview

**Purpose.** Pending Batch Load answers one question: which cassettes and slides have been printed or engraved but have not been scanned into any open batch yet? It is a read-only worklist for finding what still needs to be picked up and loaded. You do not load anything from this screen.

**Intended users.** Histotechnologists, cytotechnologists, molecular technologists and laboratory managers, anyone who has the Batch Management screen.

**Where it fits.** After [Grossing](help:grossing) prints cassettes, and after the [Embedding](help:workstations/embedding) and [Microtomy](help:workstations/microtomy) workstations produce blocks and slides, the items wait here until someone scans them into a batch on the [Batch Management](help:batch-management) page. As soon as an item is scanned into an open batch it leaves this list.

!!! note "Nothing is stored on this screen"
    The list is worked out fresh each time you open or refresh the page, by comparing every case's physical material with the manifests of all open batches. It cannot be edited, and it cannot go out of date except between refreshes.

## Screen Tour

![The Pending Batch Load screen with items grouped by case](capture:batch-management-pending-load-overview)

The page title is **Pending Batch Load**. The subtitle explains that it lists cassettes and slides that have been printed or engraved but not yet scanned into an active batch, and that to load one you open or create the batch it belongs in from Batch Management and scan it there. A second line tells you the scope:

- "Scoped to (facility), per the active scan station." when this computer has a scan station set. Only cases from that facility are shown.
- "No scan station set — showing every facility's own pending items. Set a station for a facility-scoped queue." when no station is set.

### Field definitions

| Field | What it means |
|---|---|
| Scan or type to search — cassette/slide id, case, or specimen... | A search box. It matches part of the item identifier (what a barcode holds), the case accession number or the specimen label, ignoring capitals. Scanning a label into it fills in the identifier. |
| Awaiting Batch Load (n) | The number of waiting items. While you search it reads "Awaiting Batch Load (n of total)". |
| Case heading | The case accession number and how many items it has waiting, for example "(accession) — 3 items". Items are grouped by case. |
| Item identifier | The cassette or slide identifier, as printed on the label. |
| Type | **Cassette** (a block) or **Slide**. |
| Specimen (letter) | The specimen the item belongs to. |

### Toolbar

| Button | What it does |
|---|---|
| Search box | Narrows the list as you type. |
| Clear | Appears once you have typed something. Empties the search box. |
| Refresh | Works the list out again. Reads "Refreshing..." while it works. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Computing the real, current queue... | The list is being worked out. |
| Nothing printed is currently waiting to be loaded into a batch. | Every printed item is already in an open batch. |
| No pending item matches "(text)". | Nothing matches your search. Clear it to see the full list. |

What counts as waiting:

- A cassette whose block has been grossed, embedded or marked exhausted. A block that is still a placeholder, with nothing printed yet, is not listed.
- A slide that has been cut. A slide still marked Pending Cut is not listed because nothing physical exists yet.
- Neither is in any Active or Reconciling batch. Items in Complete or Aborted batches that are not in an open batch count as waiting again.

### Hotkeys

None.

## Step-by-Step Procedures

### Standard workflow

1. Open **Batch Management** from the Pathology Workspace and select the **Pending Load** tile. The page shows "Computing the real, current queue..." and then the list.
2. Read the second line under the title to check which facility the list covers.
3. Look through the groups, or type or scan into the search box to find a specific cassette, case or specimen.
4. Collect the physical items.
5. Return to [Batch Management](help:batch-management) (use the breadcrumb or the browser back button), open or create the batch they belong in, and scan each one into it.
6. Return here and select **Refresh**. The scanned items are gone from the list.

### Alternative workflow

1. To check a single label, scan it into the search box. If its identifier appears, it is waiting. If it does not, it is already in an open batch, has been disposed of, or was never printed.
2. To check a whole case, type its accession number.

### Exception handling

1. **An item you printed is not listed.** Search by the case number. If the case is not there, check that the block was actually grossed and the label printed; a placeholder block is not shown. Check the facility scope too: a station set for another facility hides this case.
2. **An item you expected to be in a batch is listed.** It is not in any open batch. Perhaps it was in a batch that has since been aborted. Scan it into the right batch.
3. **A slide is not listed.** It is still Pending Cut, or it is in an open batch already.
4. **No scan station is set.** The list covers every facility. Set the station for this computer (see your laboratory manager) to scope it.

### Error recovery

1. The list looks stale after you load items. Select **Refresh**; the page does not update itself.
2. The search shows "No pending item matches". Select **Clear** and try fewer letters.
3. The list stays on "Computing..." for a long time. Refresh the page and, if it persists, contact support.

## Tips and Best Practices

### Common mistakes

- Expecting to load items from this page. It is only a list. Loading is done by scanning on a batch's detail page.
- Forgetting that the page does not refresh itself. Select Refresh after you load.
- Reading the list as the whole laboratory when a scan station is set. It is scoped to that station's facility.

### Efficiency recommendations

- Scan a label into the search box instead of typing.
- Search by the case number to see all of a case's waiting cassettes and slides together.

### Workflow recommendations

- Look at the list at the start of a run and before the end of the shift to catch cassettes that were printed and then left on the bench.
- Use it together with the stage tiles on the Batch Management page to see both what is in batches and what is not.

## Related Features

### Upstream workflow

- [Grossing](help:grossing): prints the cassettes.
- [Embedding](help:workstations/embedding) and [Microtomy](help:workstations/microtomy): turn cassettes into blocks and slides.
- [Label Reprint](help:batch-management/label-reprint): reprint labels for cases whose cassettes were damaged or lost.

### Downstream workflow

- [Batch Management](help:batch-management): create the batch and scan the items in.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| The list is empty but cassettes are on the bench | They are already in an open batch, or their blocks are placeholders, or this computer's station is set to another facility. |
| The Pending Load tile is missing | Your role does not include Batch Management. |
| An item stays on the list after you scanned it | The page has not been refreshed, or the scan was refused (for example it is in another open batch). |
| Items from other facilities appear | No scan station is set on this computer. |

### Resolution steps

1. Select **Refresh**.
2. Check the scope line under the title.
3. Search for the case number and look at its items.
4. Open the batch and check its manifest.

### When to contact support

Contact your laboratory's PathScribe support when a printed item never appears, or an item you have scanned into a batch stays listed after a refresh. Have the item identifier, the case number and the time ready.
