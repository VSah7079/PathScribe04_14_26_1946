---
module: Batch Management
screen: Lab Workflow Reports
slug: batch-management/workflow-reports
workflow: Bench chain of custody
role: [Laboratory Manager, Histotechnologist, Cytotechnologist, Molecular Technologist]
keywords: [reports, turnaround, TAT, volume, STAT, add-on, recut, rework, reconciliation, exceptions, batch duration, CSV, Power BI]
routes: [/batch-management/workflow-reports]
previous: batch-management/equipment-log
next: batch-management/retention-holds
related: [batch-management, facility-operations, workstations/embedding, workstations/microtomy, workstations/slide-distribution]
status: Draft
---

# Lab Workflow Reports {#top}

## Overview

**Purpose.** Lab Workflow Reports answers the questions a wall display cannot, such as "how long did cases take last month". Seven built-in reports are built from the station scans, the cases and the carriers: **Turnaround by step**, **Volume per station**, **STAT performance**, **Add-on orders**, **Recut and rework**, **Reconciliation exceptions** and **Batch duration**. Each can be exported as CSV. They show totals only; research cases are left out.

**Intended users.** Laboratory managers and supervisors, and the bench roles that have Batch Management. Each report has its own permission to view it and another to export it; a report you are not allowed to see is greyed out. The turnaround, volume and STAT reports read the station scan log, so they also need permission to see scan history.

**Where it fits.** Open it from the **Workflow Reports** tile on [Batch Management](help:batch-management). The live picture stays on the [Facility Operations](help:facility-operations) wall displays. Labs with Power BI can use the reporting feed for the same figures and more.

## Screen Tour

The page is titled **Lab Workflow Reports**. **← Back to batches** returns to Batch Management. Under the title, a row of report buttons picks the report; a line below says what it shows. The filters come next, then the table, then a note on what is counted.

### Field definitions

**Filters**

| Field | What it means |
|---|---|
| From, To | The calendar days covered, in the laboratory's time zone. They start on the last 30 days. If the start is after the end the page says "Choose a start date on or before the end date." |
| Group by | Turnaround and STAT: **All cases**, **Case type** (Surgical pathology, Cytology, Autopsy), **Priority** or **Facility**. |
| Per | Volume: **Day** or **Week** (ISO weeks, for example 2026-W41). |
| Staining target (minutes) | Batch duration: the target a Staining batch is measured against. Starts at 120. Decal batches use the target set on the batch. |
| Targets (hours from accessioning) | Turnaround and STAT: a target for each step (Gross, Embed, Cut, Stain, Distribute, Sign-out). They start at 24, 36, 48, 54, 60 and 72. A case past the target counts as late. |

The report rebuilds as soon as you change anything; there is no Run button. While it builds, "Building the report…" shows. With nothing in the dates it says "Nothing in these dates."

**The reports**

| Report | Columns | How it is counted |
|---|---|---|
| Turnaround by step | Group, Step, Cases, Median (h), 90th percentile (h), Target (h), Late, Late % | Cases accessioned in the dates. Hours from accessioning to grossing complete, to embedding, cutting, staining and distribution, and to sign-out. A case reaches a step when its last item does. |
| Volume per station | Period, Station, Stage, Items, Scans | Cassettes, blocks and slides scanned at each station. Only scans of the item itself count, not a carrier scanned for all its items; items moved without a carrier are counted. |
| STAT performance | As Turnaround | STAT cases only. |
| Add-on orders | Type, Ordered, Cut, Median minutes to cut, STAT | Add-on orders placed in the dates, by type (recut or levels, special stain, IHC, send-out, molecular, other). |
| Recut and rework | Measure, Value | Slides cut, Recut orders, Recut rate (% of slides cut), Slide label reprints, Cassette label reprints, Rework rate (% of slides cut). |
| Reconciliation exceptions | Kind, Carrier, Item, Case, When, By, Reason | Items **Missing** or **Unexpected** when a carrier was reconciled, and each **Supervisor override** with its reason. |
| Batch duration | Step, Carrier, Started, Finished, Minutes, Target (min), Over target | How long each Decal and Staining batch spent at that step. A batch that moved on keeps its barcode, so its time at each step is measured from its step history. |

### Toolbar

| Button | What it does |
|---|---|
| Report buttons | Pick the report. Greyed out without that report's permission. |
| Export CSV | Downloads the report as shown, with the column names in your language. Needs that report's export permission; without it the button is greyed out, and a refusal says "You do not have permission to export this report." The download is recorded in the audit log with the number of rows. |

### Icons and status indicators

The selected report button is highlighted; a greyed report button is one you cannot open. There are no other icons.

### Hotkeys

None on this page.

## Step-by-Step Procedures

### Standard workflow

1. Open **Batch Management** and select the **Workflow Reports** tile.
2. Pick a report.
3. Set **From** and **To**, and the options for that report.
4. Read the table. Select **Export CSV** to keep it.

### Alternative workflow

To compare groups, set **Group by** to Case type, Priority or Facility on the turnaround report. For STAT work only, pick **STAT performance**.

### Exception handling

To follow up an exception, take the carrier barcode or case from **Reconciliation exceptions** and open it in Batch Management or Case Search.

### Error recovery

If the report says it could not be built, change a filter or reopen the page; it rebuilds each time.

## Tips and Best Practices

### Common mistakes

- Embed, cut, stain and distribute come from station scans. Work done at a computer with no station set, or before station tracking (Batch 726), is not counted. Set a station on every bench computer.

### Efficiency recommendations

- Set your laboratory's own targets once per session; the late percentage follows them.

### Workflow recommendations

- Grossing and sign-out come from the case itself, so they are counted for every case. Use the CSV for monthly reviews.

## Related Features

### Upstream workflow

- [Batch Management](help:batch-management): the carriers these reports read; the bench screens record the station scans.

### Downstream workflow

- [Facility Operations](help:facility-operations): the live picture on the wall.

## Troubleshooting

### Common user issues

| What you see | Why |
|---|---|
| A report button is grey | You do not have permission to view that report. |
| "You do not have permission to see this report." | The same, or the report reads the scan log and you cannot see scan history. |
| Embed or Cut shows no cases | No station scans were recorded for those cases. |
| "The report could not be built. Try again." | Something went wrong while reading the data. |

### Resolution steps

1. Check the dates. 2. Check that your bench computers have a station set. 3. Ask an administrator for the report's permission if it is greyed out.

### When to contact support

If a report stays empty although stations are set and work was scanned, contact support with the report name and the dates. Scheduled delivery of these reports by e-mail is not built yet.
