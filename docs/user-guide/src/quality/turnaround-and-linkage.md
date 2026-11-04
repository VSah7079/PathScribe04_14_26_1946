---
module: Quality & Compliance
screen: Countersign, Linkage and Drift
slug: quality/turnaround-and-linkage
workflow: Quality Assurance
role: [Quality Staff, Laboratory Manager, Pathologist]
keywords: [countersign turnaround, resident, attending, feedback, fields changed, intraoperative linkage, pending linkage, merged, post-final drift, drift correction, deferred, unresolved]
routes: []
previous: quality/patient-matching
next: quality/fppe-tracking
related: [quality, intraop-queue, report/sign-out-and-release, my-contribution]
status: Draft
---

# Countersign, Linkage and Drift {#top}

## Overview

**Purpose.** Three Quality Assurance reports watch for work that is slow or has gone wrong after the fact. **Countersign Turnaround** measures how long attending pathologists take to countersign reports released by residents. **Frozen Linkage** (the intraoperative linkage report) shows intraoperative entries that have not yet been joined to a formal case. **Post-Final Drift** lists cases whose content changed after the report was finalised, and whether PathScribe put it right.

**Intended users.** Quality staff, laboratory managers, and pathologists who supervise residents.

**Where it fits.** All three are tiles on the **Operations** pillar of **Quality Assurance**. Each report is read-only apart from opening cases. See [Quality & Compliance](help:quality).

## Screen Tour

![The Countersign Turnaround report with its trend chart, tiles and tables](capture:quality-turnaround-overview)

Each report opens with the scope switcher and an **Export** button on the first line, then a chart, tiles and tables. The screens say "Loading countersign data…", "Loading intraoperative linkage data…" or "Loading drift correction data…" while they open.

### Field definitions

**Countersign Turnaround**

| Item | What it means |
|---|---|
| Chart | Average turnaround in hours by month. A month with none says "No countersigns this month". |
| Avg Turnaround | Average hours from release to countersignature. |
| Pending Countersign | Released reports still waiting for the attending. |
| Avg Fields Changed | Average number of report fields the attending changed when countersigning. |
| With Feedback | Countersigned reports where the attending left feedback. |
| Pending table | Cases waiting, with the resident, attending, release time and how long they have waited. |
| Countersigned table | Resident, Attending, Released At, Turnaround, **Fields Changed** and Feedback ("none" when empty). |

**Frozen Linkage (intraoperative linkage)**

| Item | What it means |
|---|---|
| Chart | Average hours between an intraoperative entry being created and being merged into a case, by month. "No merges" for an empty month. |
| Merged | Entries already merged into a case. |
| Pending Linkage | Entries not yet linked to a case. |
| Pending Over 24h | Entries waiting more than 24 hours. Turns red when above zero. |
| Pending table | **Entry ID**, the OR, who performed it and when it was created. Select a row to open the intraoperative queue. |
| Merged table | **Entry ID**, the case it was merged into, **Merged At**, who performed it and how it was resolved. |

**Post-Final Drift**

| Item | What it means |
|---|---|
| Drift Events Detected | Cases where a change after finalisation was found. |
| Auto-Corrected | Cases PathScribe put right by itself. |
| Unresolved — Needs Review | Cases still needing a person. Amber when above zero. |
| Cases with unresolved drift correction | Case, Status, Detail and Detected time, with an **Open** button. |
| All drift events | Every event, newest first: Case, Event, Detail and Timestamp. "No drift events recorded in this scope." when there are none. |

### Toolbar

| Button | What it does |
|---|---|
| Scope switcher | Limits the report to the whole enterprise, an organisation or a referring facility. |
| Export | Saves the report as a spreadsheet file. Your role must allow it. On Frozen Linkage the file holds merged and pending entries together. |
| Open | In the unresolved drift table. Opens the case. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Deferred (conflict) | PathScribe held back its correction because it conflicted with something else. A person must decide. |
| Failed | The automatic correction did not work. |
| Red Pending Over 24h tile | At least one entry has waited more than a day. |
| "no audit record — merged before the resolution-logging fix" | In the Frozen Linkage export: an older merge with no recorded detail. |

### Hotkeys

None.

## Step-by-Step Procedures

### Standard workflow

1. Choose the report tile and set the scope.
2. Read the tiles. For Countersign Turnaround, look at **Pending Countersign** and **Avg Turnaround**.
3. Select a row to open the case or queue behind it.
4. Use **Export** to keep the figures for a meeting.

### Alternative workflow

1. Residents and attendings see their own figures on [My Contribution](help:my-contribution).

### Exception handling

1. If **Unresolved — Needs Review** is above zero, open each case, read the detail and decide whether the report needs a correction.
2. An intraoperative entry pending over 24 hours should be linked in the [Intraop Queue](help:intraop-queue).

### Error recovery

1. If a report stays on its loading message, refresh the page.

## Tips and Best Practices

### Common mistakes

- Treating a high Avg Fields Changed as a fault of the attending. It shows how much the resident draft needed changing.

### Efficiency recommendations

- Rows open the related case directly; you do not need to search.

### Workflow recommendations

- Review Pending Over 24h daily; the other figures weekly.

## Related Features

### Upstream workflow

- [Patient Match and Management](help:quality/patient-matching): the previous screen.

### Downstream workflow

- [FPPE Tracking](help:quality/fppe-tracking): supervision of newly hired pathologists.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| Report is empty | Nothing in the chosen scope. |
| Frozen Linkage ignores the scope for pending entries | Pending entries are not tied to a case yet, so all pending entries show. |

### Resolution steps

1. Set the scope to the whole enterprise.
2. Refresh the page.

### When to contact support

Contact your laboratory's PathScribe support when an entry stays pending after the case exists. Have the Entry ID ready.
