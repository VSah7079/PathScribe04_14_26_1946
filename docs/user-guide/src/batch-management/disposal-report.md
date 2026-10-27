---
module: Batch Management
screen: Waste Tracking Report
slug: batch-management/disposal-report
workflow: Retention and disposal
role: [Laboratory Manager, Histotechnologist, Quality Reviewer]
keywords: [waste tracking, disposal report, disposed, audit, CAP, CLIA, ISO 15189, export csv, who disposed, retention compliance]
routes: [/batch-management/disposal-report]
previous: batch-management/disposal
related: [batch-management, batch-management/disposal, batch-management/retention-holds]
status: Draft
---

# Waste Tracking Report {#top}

## Overview

**Purpose.** The Waste Tracking Report is a read-only record of everything that has already been disposed of: specimens, blocks, slides, decants and matrix blocks and slides. You can narrow it by facility, material type and date, and export it as a spreadsheet file for an inspection or audit. It reports the past; it never disposes of anything.

**Intended users.** Laboratory managers, quality staff and the bench roles that have Batch Management. Viewing needs only the Batch Management screen. Exporting needs a separate permission, checked for the facility you are reporting on.

**Where it fits.** Every successful scan on the [Disposal Queue](help:batch-management/disposal) adds a row here. The report is the mirror image of that queue: the queue lists what may be disposed of, and this report lists what was.

## Screen Tour

![The Waste Tracking Report with counts, filters and the table of disposed items](capture:batch-management-disposal-report-overview)

The page title is **Waste Tracking Report**. The subtitle reads: "A real, computed report of every specimen, block, slide, decant, and matrix block/slide that has genuinely been disposed — filterable by facility, material type, and disposal date, and exportable for regulatory audit."

Under the title are four count cards, the filter row and the table.

### Field definitions

**Count cards**

| Card | What it means |
|---|---|
| Total Disposed | The number of rows that match the filters. |
| Tissue Block | How many of those are blocks (cassettes included). |
| Slide | How many are slides. |
| Wet Tissue | How many are specimens or decanted portions. |

**Filters**

| Filter | What it means |
|---|---|
| Filter by facility | **All Facilities** or one facility. If this computer has a scan station, the report opens already filtered to that station's facility. |
| Filter by material type | **All Material Types**, Tissue Block, Slide or Wet Tissue. |
| From date, to, To date | An inclusive date range on the day of disposal. Leave either end empty for no limit. |

The report recomputes whenever you change a filter.

**Table columns**

| Column | What it means |
|---|---|
| Disposed | The date and time of disposal, in your language's format. |
| Type | Tissue Block, Slide or Wet Tissue. |
| Item ID | The identifier on the item's label. |
| Case | The case accession number. |
| Specimen | The specimen letter. A matrix block shows each specimen it holds, separated by commas. |
| Disposed By | The name of the person who scanned it. If the account can no longer be found, the stored user identifier is shown; if none, a dash. |
| Location | The item's last known location, or "Unknown". This is the location event with the latest time, the same rule the Disposal Queue and the disposal scan use. |

Rows are listed newest first.

### Toolbar

| Button | What it does |
|---|---|
| Export | Downloads the rows currently shown as a spreadsheet (CSV) file named waste-tracking-report-(date). Greyed out when there are no rows. |

The exported columns are Disposed At, Material Type, Item ID, Case Accession, Specimen, Disposed By and Location. The export records itself in the audit log.

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Computing the real, current report... | The report is being worked out. |
| Nothing has been disposed yet matching these filters. | No rows. Change or clear the filters. |
| You don't have permission to export the disposal report. | Shown if your role cannot export for the chosen facility. The Export button looks dimmed with a tooltip naming the permission. |

### Hotkeys

None.

## Step-by-Step Procedures

### Standard workflow

1. Open **Batch Management** and select the **Waste Tracking Report** tile. The report opens with the totals and the table. If your computer has a scan station, the facility filter is already set to its facility.
2. Choose the **facility** and **material type** you need, or leave them on All.
3. Enter the **From date** and **To date** for the period.
4. Read the count cards and the table. The cards update with the filters.
5. To keep a copy, select **Export**. A file downloads with the rows you see.

### Alternative workflow

1. For an audit of one facility, choose it in the facility filter and export, then repeat for the next facility.
2. For a monthly record, set From date to the first of the month and To date to the last.
3. To prove a single item was disposed of, filter by a narrow date and look up its identifier in the Item ID column.

### Exception handling

1. **An item you disposed of is not listed.** Check the facility filter. The facility is taken from the item's last known location, so an item with no location history appears only under All Facilities.
2. **The facility filter hides everything.** Choose All Facilities.
3. **Export is dimmed.** Your role cannot export for that facility. Ask your laboratory manager. Choosing a facility you work in may help.
4. **A date range returns nothing.** Check that From is not after To.

### Error recovery

1. "You don't have permission to export the disposal report." Choose a facility you are permitted for, or ask your laboratory manager to grant the permission.
2. The file opens with odd characters in a spreadsheet. Import it as UTF-8 text.
3. The numbers differ from yesterday's export. New disposals have been added, or the filter was different. Check the dates and facility.

!!! warning "Reports contain case identifiers"
    The table and the export contain case accession numbers. Store exported files where your laboratory keeps controlled records, and do not send them by ordinary email.

## Tips and Best Practices

### Common mistakes

- Reading the facility filter as the place of disposal. It is the item's last recorded location.
- Forgetting the report opens already filtered to your station's facility.
- Exporting before setting the dates, producing a very large file.
- Expecting the report to show items waiting for disposal. That is the Disposal Queue.

### Efficiency recommendations

- Set the dates first, then the facility, then export once.
- Use the count cards for a quick total before opening the file.

### Workflow recommendations

- Export at regular intervals and keep the files with your accreditation documents.
- Compare totals with the Disposal Queue after a large disposal run to confirm the work is recorded.
- Ask quality staff to review "Disposed By" for unusual patterns.

## Related Features

### Upstream workflow

- [Disposal Queue](help:batch-management/disposal): where items are disposed of and rows are created.
- [Retention Holds](help:batch-management/retention-holds): cases on hold never reach disposal.

### Downstream workflow

- [Batch Management](help:batch-management): the module page.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| The report is empty | No disposals match the filters, or the station's facility has none. |
| Export is dimmed | Your role lacks the export permission for the chosen facility. |
| A disposed item shows "Unknown" location | No location was ever recorded for it. |
| "Disposed By" shows a code instead of a name | That account was deactivated or removed. |
| The Tissue Block count includes cassettes | Cassettes and blocks are one item type here. |

### Resolution steps

1. Set the facility to All Facilities and the dates wide.
2. Narrow step by step.
3. Check your role's export permission with your laboratory manager.
4. Reload the page to recompute.

### When to contact support

Contact your laboratory's PathScribe support when a disposal you witnessed is missing, or a row shows the wrong person. Have the item identifier, the case number and the date ready.
