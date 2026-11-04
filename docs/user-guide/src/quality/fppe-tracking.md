---
module: Quality & Compliance
screen: FPPE Tracking
slug: quality/fppe-tracking
workflow: Quality Assurance
role: [Quality Staff, Laboratory Manager]
keywords: [FPPE, focused professional practice evaluation, proctor, provisional hire, credentialing review, supervision, graduated early, case count, duration]
routes: []
previous: quality/turnaround-and-linkage
next: quality/qa-dashboards
related: [quality, my-contribution]
status: Draft
---

# FPPE Tracking {#top}

## Overview

**Purpose.** FPPE Tracking (focused professional practice evaluation, shown as **Credentialing Review** among the Operations tiles) lists the supervision periods in which a provisional hire has their cases reviewed by a proctor. It shows who is being reviewed, how far each review has progressed, and which periods have finished and why.

**Intended users.** Quality staff and laboratory managers who manage credentialing.

**Where it fits.** Open it from the **Operations** pillar of **Quality Assurance**. Supervision periods are created in the laboratory's configuration; this screen only reports on them. See [Quality & Compliance](help:quality).

## Screen Tour

![The FPPE Tracking report with its three tiles and the active and completed tables](capture:quality-fppe-overview)

The screen says "Loading FPPE assignments…" while it opens.

### Field definitions

| Item | What it means |
|---|---|
| Active Assignments | Supervision periods still running. |
| Completed | Periods that have finished. |
| Threshold Reached — Needs Formal Graduation | Active periods that have reached their case count or duration but have not yet been formally graduated. Red when above zero. |

The active table has these columns:

| Column | What it means |
|---|---|
| Provisional Hire | The person being reviewed. |
| Proctor | The pathologist reviewing their cases. |
| Scope | The subspecialty the review covers, or "All subspecialties". |
| Cases Reviewed | How many cases the proctor has reviewed. |
| Progress | Percentage of the target reached. It turns red at 100 percent or more, which means the person is ready to be graduated. |
| Started | The start date. |

When nothing is running the table says "No active FPPE assignments." The completed table shows Provisional Hire, Proctor, Cases Reviewed, Completed and Reason, or "No completed FPPE assignments yet."

The Reason tells why a period ended:

| Reason | Meaning |
|---|---|
| Case count reached | The target number of cases was reviewed. |
| Duration elapsed | The set time ran out. |
| Graduated early | A manager ended the period before either limit. |

### Toolbar

| Button | What it does |
|---|---|
| Scope switcher | Offers facilities only. Choose the facility whose assignments you want. |
| Export | Saves active and completed assignments as a spreadsheet file. Your role must allow it. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Red Progress figure | The target is reached; formal graduation is due. |
| Red Threshold Reached tile | One or more people are waiting for formal graduation. |

### Hotkeys

None.

## Step-by-Step Procedures

### Standard workflow

1. Open the Credentialing Review tile.
2. Read the three tiles. If **Threshold Reached — Needs Formal Graduation** is above zero, find the red rows in the active table.
3. Graduate those people through your laboratory's configuration screen.
4. Use **Export** to keep a record for credentialing committees.

### Alternative workflow

1. A supervisee sees their own progress on [My Contribution](help:my-contribution).

### Exception handling

1. If a person is missing, check the facility chosen in the scope switcher.

### Error recovery

1. If the table stays on its loading message, refresh the page.

## Tips and Best Practices

### Common mistakes

- Forgetting to graduate people whose Progress is 100 percent. Reaching the target does not end the period by itself.

### Efficiency recommendations

- Check the red tile once a week.

### Workflow recommendations

- Export completed periods at each credentialing review.

## Related Features

### Upstream workflow

- [Countersign, Linkage and Drift](help:quality/turnaround-and-linkage): the previous report.

### Downstream workflow

- [QA Dashboards and Inspection](help:quality/qa-dashboards): the department-wide reports.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| Progress shows a dash | The period has no case-count target. |
| Nobody listed | No supervision periods exist for that facility. |

### Resolution steps

1. Choose another facility.
2. Refresh the page.

### When to contact support

Contact your laboratory's PathScribe support when a person's case count does not match the cases reviewed. Have the person's name ready.
