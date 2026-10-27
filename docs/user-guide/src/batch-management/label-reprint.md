---
module: Batch Management
screen: Label Reprint
slug: batch-management/label-reprint
workflow: Bench chain of custody
role: [Histotechnologist, Laboratory Manager]
keywords: [label reprint, reprint labels, requisition label, container label, cassette label, bulk print, retry failed, accession range, on-demand guardrail]
routes: [/batch-management/label-reprint]
previous: batch-management/pending-load
next: batch-management/engraver-monitor
related: [batch-management, batch-management/pending-load, grossing]
status: Draft
---

# Label Reprint {#top}

## Overview

**Purpose.** Label Reprint reprints requisition, specimen container and cassette labels for many cases at once. You find the cases by accession date or accession number range, tick the label types you want, and PathScribe prints them one at a time. Each label is recorded in the audit log, and any that fail can be retried.

**Intended users.** Histotechnologists and laboratory managers (and administrators). Printing needs its own permission, "Batch label reprint", which is not given to every role that can open the screen.

**Where it fits.** Use it after a printer jam, a lost tray or a damaged batch of labels, when labels for a whole day's cases must be redone. For a single case, use the print buttons on the case itself. Once labels are reprinted, the items can be scanned into batches on [Batch Management](help:batch-management).

## Screen Tour

![The Label Reprint screen with the filters, case list and label options](capture:batch-management-label-reprint-overview)

The page title is **Label reprint**. The subtitle reads: "Find cases by accession date or number, choose the labels, and reprint them one at a time. Every label is audited; failed labels can be retried."

### Field definitions

**Filters.** Enter at least one. An empty search finds nothing, on purpose, so that the whole laboratory is never reprinted by accident.

| Field | What it means |
|---|---|
| Accessioned from, Accessioned to | A date range, inclusive, on the day each case was accessioned. |
| Accession number from, Accession number to | A range of accession numbers, inclusive. They are compared as text, so type them in the same format as the case numbers. |

You can combine a date range with a number range. A case must satisfy every filter you fill in.

**Case list (after Find cases)**

| Item | What it means |
|---|---|
| "(n) cases found; (m) selected." | How many cases matched and how many are ticked. |
| Reprint (tick box) | Tick or untick a case. All found cases start ticked. Unticked cases are left out. |
| Accession | The case accession number. Cases are listed in accession order, oldest first. |
| Specimens | How many specimens the case has. |
| No cases match. Enter a date range or an accession number range. | Nothing matched, or no filter was entered. |

**Label options**

| Option | What it means |
|---|---|
| Requisition | One requisition label sheet per case. Ticked by default. |
| Specimen containers | One container label per specimen. Ticked by default. |
| Cassettes | One cassette label per block, and one per matrix block. Not ticked by default. |
| Cassette printer | Appears only when Cassettes is ticked. Choose the cassette printer from your printers. |
| "(n) labels to print." | The total for the cases and label types currently chosen. |

### Toolbar

| Button | What it does |
|---|---|
| Find cases | Searches with your filters. It also clears any earlier results and unticks nothing. Disabled while a print is running. |
| Reprint labels | Starts printing. Disabled when nothing is to print or a print is running; dimmed with a tooltip if you lack the permission. |
| Retry (n) failed label(s) | Appears after a run that had failures. Prints only the failed labels again. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Printing (done) of (total)... | The run is in progress. The tick boxes and buttons are disabled meanwhile. |
| Printed (n); failed (n); blocked by the on-demand guardrail (n). | The summary at the end of a run. |
| A list of problems | One line per failed or blocked label: the accession, the label type and target (for example a specimen letter or block), the status and any message. Statuses are printed, failed, blocked and not printed. |
| Choose the cassette printer first. | You ticked Cassettes without choosing a printer. |
| There is nothing to print. | No labels in the selection. |
| Sending label to the printer… | A small line at the bottom of the screen while a label goes to a printer through the PathScribe site agent. It goes away when the job finishes; the screen that printed reports the outcome. |
| Label queued: prints next | The label is waiting and will print as soon as the one in front is done. When others are ahead it reads "Label queued: n jobs ahead", and "n more labels waiting" is added when several are queued. |
| Printing on … | The printer (for example a ZD421) is printing your label now. It appears only when the site agent reports that printing has started. |
| Network print jobs | Labels sent to printers set to "Direct via Interface Engine" are listed in a small area at the bottom of the screen, each with its state: sent and waiting ("Label … sent to …. Waiting for the printer…"), printed, or failed with the reason (for example the printer is out of labels or out of ribbon, the print head is open, or the printer could not be reached). A failed label, or one with no answer after two minutes, shows **Retry** and **Dismiss**; retry is never automatic. |
| Simulate: printed / Simulate: out of labels | Two small demonstration buttons shown beside a waiting network print job only when no interface engine is connected (the demonstration). They stand in for the engine's answer; they do not print anything. |
| You don't have permission to reprint labels in a batch. | Your role lacks the permission. |

### Hotkeys

None.

## Step-by-Step Procedures

### Standard workflow

1. Open **Batch Management** and select the **Label reprint** tile.
2. Enter the date range and/or accession number range of the cases and select **Find cases**. The list appears with every case ticked.
3. Untick any case you do not want to reprint.
4. Under **Labels**, tick the types you need. If you tick **Cassettes**, choose the **Cassette printer**.
5. Check the line "(n) labels to print."
6. Select **Reprint labels**. The line "Printing (done) of (total)..." counts up. Labels are sent one at a time with a short pause between them.
7. When it finishes, read the summary. If everything printed, collect the labels.

### Alternative workflow

1. To reprint only cassettes for a run, untick Requisition and Specimen containers, tick Cassettes, and choose the printer.
2. To reprint one case, search by an accession number range with the same number in both boxes.

### Exception handling

1. **Some labels failed.** Read the problem list. Fix the cause (printer off, paper out, pop-ups blocked) and select **Retry (n) failed label(s)**. Labels that already printed are not printed again.
2. **Cassette labels are blocked.** The summary says "blocked by the on-demand guardrail". Your laboratory's print settings turn off batch cassette printing. A manager must change that setting, or the cassettes must be printed from the case.
3. **Pop-ups are blocked.** When labels print through the browser's print window, the browser asks you to allow pop-ups for this site. Allow them and retry.
4. **A case changed since you searched.** A message such as "Specimen (letter) is no longer on the case" or "Cassette (target) is no longer on the case" appears in the list for that label only.
5. **You ticked Cassettes without a printer.** Choose the printer and start again; nothing was printed.

### Error recovery

1. "Choose the cassette printer first." Select a printer in the list.
2. "There is nothing to print." Tick at least one label type and at least one case.
3. "You don't have permission to reprint labels in a batch." Ask your laboratory manager.
4. A run is interrupted by closing the page. Labels already sent are recorded in the audit log. Search again and reprint only what is missing, to avoid duplicates.
5. "The case could not be loaded." or "The cassette printer was not found." Refresh the page and try again, or choose another printer.

!!! warning "Duplicate labels on a specimen"
    A reprinted label is a second label for the same item. Remove and destroy the old label before attaching the new one, so two labels are never in circulation for one container.

## Tips and Best Practices

### Common mistakes

- Pressing Find cases with nothing entered and expecting every case.
- Leaving a range too wide and reprinting hundreds of labels. Check the count line first.
- Forgetting to choose the cassette printer.
- Treating "printed" as proof of paper in the tray. When a label goes to the browser print window, "printed" means the window opened and the print was handed over.

### Efficiency recommendations

- Use accession number ranges for a tray of consecutive cases.
- Untick the few cases you do not need rather than searching again.

### Workflow recommendations

- Reprint at the start of a shift for cases whose labels were damaged, then check [Pending Batch Load](help:batch-management/pending-load) to see what still needs loading.
- Keep the Cassettes box unticked unless you have the cassette printer loaded.

## Related Features

### Upstream workflow

- [Grossing](help:grossing): original cassette printing.
- [Engraver Monitor](help:batch-management/engraver-monitor): check the engraver and cassette supply before a large cassette run.

### Downstream workflow

- [Pending Batch Load](help:batch-management/pending-load) and [Batch Management](help:batch-management): scan the new labels into batches.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| "No cases match" | No filter entered, or nothing in that range. |
| Reprint labels is dimmed | You lack the permission; hover for the permission name. |
| Cassettes blocked | The on-demand guardrail in print settings. |
| Only the first label opens | Pop-ups are blocked in the browser. |
| The cassette printer list is empty | No printer profiles are set up. Ask your administrator. |

### Resolution steps

1. Read the summary and the problem list.
2. Fix the printer or browser setting and select Retry.
3. Search again with a narrower range.
4. Ask your laboratory manager to check your permission and the print settings.

### When to contact support

Contact your laboratory's PathScribe support when labels fail repeatedly with a working printer, or a summary does not match what came out. Have the accession range, the time and the message ready.
