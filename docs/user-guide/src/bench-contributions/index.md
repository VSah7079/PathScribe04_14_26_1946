---
module: Bench Contributions
workflow: Bench Performance Review
role: [Histotechnologist, Pathology Assistant, Laboratory Manager]
keywords: [bench contributions, accessioning rate, batch throughput, queue aging, turnaround time, molecular QC]
routes: [/bench-contributions]
previous: home
related: [pathology-workspace]
status: Draft
---

# Bench Contributions {#top}

## Overview

**Purpose.** Bench Contributions shows how bench work is going over the last 30 days: how many cases you accessioned, how many items you added to batches, how long batches are waiting, how long specimens take to move from one stage to the next, and how your molecular runs performed on quality control.

**Intended users.** Bench roles such as histotechnologists, pathology assistants and laboratory managers. The tile appears only if your role may open it.

**Where it fits.** Open it from the Home Dashboard when you want to review your work. It is a single page that you scroll; it has no buttons and changes nothing. The work itself is done in the [Pathology Workspace](help:pathology-workspace).

## Screen Tour

![The Bench Contributions page with its five tiles](capture:bench-contributions-overview)

!!! note "Your figures, and the shared ones"
    The page title line shows your name and says which figures are yours and which are laboratory-wide: your accessioning, batch and molecular QC activity, plus laboratory-wide queue aging and turnaround, for the last 30 days. Accessioning Rate, My Batch Throughput and Molecular QC count only your own work. Queue Aging and Stage-to-Stage TAT cover the whole laboratory, not just you.

!!! note "Demonstration data"
    Figures are worked out from the cases and batches held in the system. In a demonstration setup these are demonstration cases and batches, so the numbers are not real laboratory results.

### Field definitions

Every figure uses the last 30 days. Days are counted in your facility's local time, not the time on your device. A figure that cannot be worked out is shown as a dash (—).

**Accessioning Rate** (yours)

| Field | What it means |
|---|---|
| Cases accessioned | The number of cases you accessioned in the last 30 days. |
| Per active hour | Cases accessioned divided by the number of different clock hours in which you accessioned at least one case. It is not divided by a full shift, so hours when you accessioned nothing do not count. |

Under the two figures, a **Daily accessioning** chart shows one bar for each day of the window, oldest on the left. A day with no cases has a short grey bar, and pointing at a bar shows the date and the count. The bars are scaled to your busiest day.

When you accessioned nothing in the window, the tile says "No accessioning activity in this window."

**My Batch Throughput** (yours)

| Field | What it means |
|---|---|
| Node name (for example Embedding, Microtome / Sectioning, Staining) | One box for each processing step where you added items. |
| Items added | How many items (cassettes or slides) you personally added to batches at that step in the last 30 days. It counts who added the item, not who created the batch. |

Steps with no items from you are left out. When there are none, the tile says "No batch activity in this window."

**Queue Aging — All Techs** (the whole laboratory)

| Field | What it means |
|---|---|
| Open batches | Batches at that step that are still Active or Reconciling right now. |
| Oldest open batch | How long, in hours, the oldest of those batches has existed since it was created. |
| Average age | The average age, in hours, of all open batches at that step. |

This answers "what is backing up right now". It is not limited to your own batches or to the 30-day window. When nothing is open, the tile says "No open batches at this node."

**Stage-to-Stage TAT** (the whole laboratory)

Turnaround time (TAT) is the time between two stages for the same cassette or slide. Each box is named *group · from stage → to stage*.

| Field | What it means |
|---|---|
| Surgical | Accessioning → Embedding, then Embedding → Staining. |
| Cytology | Accessioning → Cytology Processing, then Cytology Processing → Cytology Staining. |
| Mean | The average time in hours between the two stages. |
| Median | The middle time in hours: half of the items were faster, half slower. It is less affected by a few very slow items. |
| Samples | How many items passed through both stages in the window. |

Only these named stage pairs are shown, and only pairs with at least one sample appear. When there are none, the tile says "No specimens passed through both stages in this window." The "Accessioning" time is the moment the case was accessioned, and it counts only if that happened inside the 30-day window.

**Molecular QC** (yours)

| Field | What it means |
|---|---|
| Batches | The number of molecular batches you created in the last 30 days. |
| Pass rate | Of the batches whose controls have a recorded result, the share where the controls passed. Batches still waiting for results are left out; they are not counted as failures. |
| Controls evaluated | The number of batches that have a recorded control result, which is the base for the pass rate. |
| Rerun rate | The share of your batches that were later replaced by a rerun. |

When you created no molecular batches in the window, the tile says "No molecular batches in this window."

### Toolbar

The page has no toolbar and no buttons. Scroll to see all five tiles.

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| — (dash) | There is not enough activity to work out the figure. |
| Number followed by h | A time in hours, rounded to one decimal place. |
| Percentage | A rate, rounded to a whole number. |

### Hotkeys

None are specific to this page. Alt+H (Go Home) returns to Home, and F1 (View Help) opens this page.

!!! note "Not shown today"
    The page works out a day-by-day count of your accessioning, but no daily chart is displayed. Only the totals above are shown.

## Step-by-Step Procedures

### Standard workflow

1. On the Home Dashboard, select the **Bench Contributions** tile. The page opens and the figures fill in.
2. Read **Accessioning Rate** for your cases accessioned and your rate per active hour.
3. Read **My Batch Throughput** to see where you added items.
4. Read **Queue Aging — All Techs** to see which steps have old open batches.
5. Read **Stage-to-Stage TAT** to compare mean and median times between stages.
6. Read **Molecular QC** for your pass rate and rerun rate.

### Alternative workflow

1. Press F1 on this page for this guide page.
2. Laboratory managers can use Queue Aging and Stage-to-Stage TAT to decide where to add staff or move work.

### Exception handling

1. If a tile says there was no activity, you did not do that kind of work in the last 30 days, or nothing has been recorded yet.
2. If a figure is a dash, there is not enough data to work it out.

### Error recovery

1. If the figures do not appear, refresh the page.
2. If the page is still empty, sign out and sign in again. Your figures depend on being signed in as yourself.

## Tips and Best Practices

### Common mistakes

- Reading Queue Aging or Stage-to-Stage TAT as your own performance. They describe the whole laboratory.
- Treating a low Per active hour figure as slow work. It counts only the hours in which you accessioned, so it is a rate for busy hours.
- Reading a pass rate as complete when many batches are still waiting for results.

### Efficiency recommendations

- Compare the median with the mean: a mean much higher than the median means a few items waited very long.
- Check Queue Aging at the start of a shift to see where to help first.

### Workflow recommendations

- Review the page weekly with your supervisor.
- Use a rising rerun rate as a prompt to review controls and instrument checks in the [Pathology Workspace](help:pathology-workspace).

## Related Features

### Upstream workflow

- Home Dashboard: the page opens from its **Bench Contributions** tile.
- [Pathology Workspace](help:pathology-workspace): the bench work that these figures count.

### Downstream workflow

- [Pathology Workspace](help:pathology-workspace): act on a backlog.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| A tile says there was no activity | Nothing of that kind in the last 30 days. |
| Molecular QC pass rate is a dash | No batch has a recorded control result yet. |
| Stage-to-Stage TAT is empty | No item passed through both stages inside the window, or the case was accessioned before the window began. |
| The Bench Contributions tile is missing | Your role does not include this page. |

### Resolution steps

1. Refresh the page.
2. Sign out and sign in again.
3. Ask your laboratory manager to confirm your access and that your bench work is recorded under your own sign-in.

### When to contact support

Contact your laboratory's PathScribe support when figures look wrong for work you know you did, or when the page will not load. Have your name and the time of the problem ready.
