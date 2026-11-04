---
module: My Contribution
workflow: Personal Performance Review
role: [Pathologist, Pathology Assistant]
keywords: [my contribution, workload, quality, TAT, turnaround, trends, peer average, teaching cases]
routes: [/contribution]
previous: home
related: [worklist, quality]
status: Draft
---

# My Contribution {#top}

## Overview

**Purpose.** My Contribution (the screen is titled **Contribution Dashboard**) shows your own work: how many cases you finalized, how much is still in progress, how fast your cases move, the quality issues linked to your cases, and how these change over time.

**Intended users.** Pathologists and pathology assistants looking at their own figures. Residents and fellows also see their teaching cases and progress here, and supervisors see their supervisees under the Mentor tab. Bench staff have their own screen, [Bench Contributions](help:bench-contributions).

**Where it fits.** Open it from the **My Contribution** tile on the Home Dashboard. It is a place to review, not to work cases. Selecting a quality flag opens the case; for open deficiencies see [Quality & Compliance](help:quality). Your daily work stays on the [Worklist](help:worklist).

## Screen Tour

![The Contribution Dashboard Overview tab](capture:my-contribution-overview)

!!! note "Some figures are illustrations"
    Most Overview figures are worked out from the cases in the system. The AI Contribution tab shows a **Demo data** label on figures that are illustrative only and not yet calculated from your real cases. Treat any figure carrying that label as an example.

At the top are your name and the tabs: **Overview**, **Productivity**, **Quality**, **AI Contribution** and **Mentor**.

### Field definitions

Overview tab:

| Field | What it means |
|---|---|
| Cases Finalised (or Cases Signed Out) | Cases you completed in the last 30 days. The wording follows your organization's setting. |
| Cases In Progress | Cases assigned to you that are not yet complete. |
| AI-Assisted Cases | Your cases from the last 30 days where the AI assistant was used. |
| ▲ / ▼ with "vs prior period" | The change compared with the period before. Green up and red down arrows show direction only. |
| Peer avg | The average of your peers for the same figure (see below). |
| % of target | Shown when your organization has set a performance target for that figure. |
| TAT Performance | Average First Touch and Total Case turnaround time in hours, each as a percentage of its target, and the share of cases on target, weighted across the facilities you cover. |
| RVUs - Last 30 Days | Your workload units for the last 30 days, the change against the previous 30 days ("New" if there was nothing before), and the average per case. |
| This Week | A bar chart of daily cases and RVUs. |
| Performance targets and client service levels | Your actual figures against the targets, and how each client's cases did against its agreed turnaround. |
| Case Mix | Your cases by area such as breast, GI, GU and dermatology, with counts. |
| Quality Flags | Up to three recent cases with a flag, an open deficiency or a frozen-to-final discordance. "No open quality items right now." when there are none. |
| Active Intraop Sessions | Your intraoperative entries still waiting to be linked to a formal accession, or "all merged". |
| My Teaching Cases | For trainees: cases you drafted that an attending reviewed, with a concordance percentage and the latest feedback. |
| My Progress | For trainees with a supervision assignment: progress toward the expected case numbers. |

Other tabs:

| Tab | What it shows |
|---|---|
| Productivity | Monthly cases and year-to-date RVU accumulation, with last year for comparison, and a Peer Comparison panel (see the notes below). Ranges: 1M, 3M, 6M, YTD. |
| Quality | Tiles for Discordant Cases, Amended Reports and Concordance Rate, and sections for Frozen vs Final, Amended Reports, TAT Outliers and TAT by Facility. Choose a range of 30 Days, 90 Days or 1 Year. Select a turnaround tile to see its trend against target and peer lines. |
| AI Contribution | How often AI suggestions were accepted or overridden, with reasons. Marked **Demo data**. |
| Mentor | For supervisors: your active supervisees, their countersigned cases and progress. "You have no active supervisees right now." if none. |

More wording on the Overview tab:

- **TAT Performance** shows each average with a bar and a line such as "…% of …h target" (how the average compares with the target in hours). Under the bars it says "(n)% on target" and "weighted across … facilities", meaning the on-target figure is combined across the facilities you cover.
- **RVUs — Last 30 Days** ends with "vs prev 30d" after the change and "Avg / case" for the average per case.
- **This Week** has the subtitle "Daily cases and RVUs — shared scale": cases and RVUs are drawn on one scale, so a day with many RVUs and few cases looks different from the reverse.
- **My Teaching Cases** lists each subspecialty with "… of … expected" when a target has been set for it, or a concordance percentage when no target is set.
- **My Progress** names your supervision programme and "supervised by …", with a bar headed "Progress toward graduation".

### Peer average

On the Overview tab, "Peer avg" compares you with colleagues, using this rule:

- A peer is another **active** member of staff with the **same role** as you who works at **at least one facility you also work at**. Someone with no facility restriction counts as working at all facilities. You are never counted as your own peer.
- The average is the mean of each peer's own figure, worked out the same way as yours.
- There must be **at least three** peers. With fewer, the row shows **Not enough data**, so that no individual colleague can be identified.
- The row is shown only if your organization allows you to see peer comparison. Pathologists see it only when their organization has turned that on; if you do not see it, that is the reason.

!!! note "The Productivity tab uses a different peer group"
    The Peer Comparison panel on the Productivity tab is anonymized and shows the average and top performer for year-to-date RVUs. It compares you with all other active pathologists, not only those who share your facility, and it does not use the three-person minimum. Do not read the two comparisons as the same measure.

### Tab details

**Productivity tab.** Two views, chosen with the buttons **Monthly Cases** and **YTD RVU Accumulation**. **Monthly Case Counts** shows finalized cases per month as a volume overview (the legend reads Finalized cases). **Year-to-Date RVU Accumulation** shows the subtitle Cumulative RVUs · finalized cases only, and plots your running total; the series is **Your RVUs**, and the toggles **Peer Avg** and **Top Perf.** add the peer average and top performer lines. The card **Total RVUs** for the chosen period shows the change against last year (for example "up 8% vs last year") and **Avg per case**. If some procedure codes are not in the active RVU table, a note says how many were left out. The **Peer Comparison** panel is described under Peer average above; its subtitle reads "YTD RVUs — anonymized · role-gated".

**Quality tab.** Choose the range with the buttons 30 Days, 90 Days and 1 Year. The sections are Frozen vs Final, Amended Reports, TAT Outliers and TAT by Facility.

- Each summary tile shows **Click for trend**; once selected it shows **Showing trend**. The trend chart is headed Last 4 Weeks, Last 90 Days or Last 12 Months, and a **Trend period:** row beside it switches between 4-week, 90-day and 12-mo views. Its lines are your monthly average, the target, and **vs peers**. Hovering a month shows a tick when it was within target, or a triangle with how far it was over target.
- **Discordant Diagnoses** (cases where frozen section and final diagnosis differ) lists Case, Type, **Frozen Dx**, **Final Dx**, Delta and Severity.
- **Amended Reports** (reports modified after initial sign-out) lists Case, Type, **Reason for Amendment**, Date and Severity.
- **TAT Outliers** lists, for the measure you choose, the cases that missed the target: Facility, the measured time, Target and **Over By**. The measured time is labelled **First Opened** for first touch, **Actual TAT** for total case, **Cold Ischemia Time** for cold ischaemia, and **Wait Time** for consults you are still waiting on. When there are none, a tick and a message say there are no breaches this period.
- **TAT by Facility** compares each facility with its target. A line ending in h vs peers (hours, with an arrow) shows whether you are faster or slower than your peers. Peer figures are estimated; your own figures and the targets are real.

**AI Contribution tab.** The buttons **Acceptance Rate** and the AI-versus-manual view switch the content. Tiles: **AI Acceptance Rate** (with a change such as +3% vs YTD avg), and the counts of AI-assisted cases and overrides. **Acceptance by Case Type** ("Loading case types…" while it opens) shows the share of AI field suggestions accepted. **Acceptance Trend** plots the rate over Last 4 Weeks, 90 days or Year to Date. **AI Overrides** lists cases where you changed the AI suggestion: Case, Type, AI Suggestion, Final Diagnosis, Date and **Override Reason**. **AI-Assisted vs Manual** compares volume and turnaround, with columns such as AI-Assisted Avg TAT, Manual Avg TAT and **TAT Improvement**; this comparison is illustrative and marked Demo data. **View Validation Studies →** opens the practice-wide AI performance screen.

**Mentor tab.** For each supervisee a bar shows **Progress toward graduation** against the expected number of cases; the label gives your total of the expected number. Rows by case type show the concordance rate, or the count against the expected number.

### Toolbar

There is no toolbar. Controls are the tabs, the range buttons inside tabs, and:

| Button | What it does |
|---|---|
| Export Case Log | On My Teaching Cases. Saves a reference list of your teaching cases as a spreadsheet, for typing into the ACGME system by hand. It is not an official ACGME file. Your role must allow it. |
| Print | On the Productivity tab. Opens the browser print dialog for the productivity report. |
| Export PDF | On the Productivity tab. Not working yet: it shows only a message, "PDF export — connect to your PDF library". Use Print and choose Save as PDF. |
| Export Progress Summary | On My Progress. Saves a flat summary of your case mix and progress. Your role must allow it. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| ▲ green / ▼ red | Direction of change versus the prior period. |
| Red, amber or green TAT summary | Under 65 percent of cases on target, 65 to 84 percent, 85 percent or more. |
| Demo data | The figure is illustrative only. |
| Not enough data | Fewer than three peers. |

### Hotkeys

| Key | Action |
|---|---|
| Alt+K | Open My Contribution from another screen. |
| F1 | View Help for this screen. |
| Alt+S, Alt+T, Alt+F, Alt+G, Alt+Shift+S, Alt+C, Alt+R, Alt+A | Switch the turnaround trend shown on the Quality tab: First Touch, Total Case, Frozen Section, Grossing, Sign-Out, Cold Ischaemia, My Response Time, Awaiting Response. |

## Step-by-Step Procedures

### Standard workflow

1. Select the **My Contribution** tile on Home (or press Alt+K). The Overview tab opens.
2. Read the three KPI tiles. Note the arrow, which compares you with the prior period, and the Peer avg row if it is shown.
3. Read **TAT Performance** and **RVUs - Last 30 Days**.
4. Check **Quality Flags**. Select a flag to go to the case.
5. Select the **Productivity** tab and choose a range (1M, 3M, 6M or YTD) to see your trend.
6. Select the **Quality** tab. Choose a range, then select a turnaround tile to see its trend.
7. If you are a trainee, read **My Teaching Cases** and **My Progress** on the Overview tab.

### Alternative workflow

1. To look at a single turnaround measure, open the Quality tab and press its key (for example Alt+T for Total Case).
2. To see everything about one case behind a flag, select the flag; the case opens.

### Exception handling

1. If Peer avg shows **Not enough data**, there are fewer than three peers in your group. Nothing is wrong.
2. If Peer avg is missing altogether, your organization has not enabled peer comparison for your role.
3. If a figure carries **Demo data**, do not use it for any decision.
4. If a case count looks wrong, check the case on the Worklist; the figures follow case status.

### Error recovery

1. If a tab shows zeros or is empty when it should not be, refresh the page.
2. If it is still wrong, sign out and in again.
3. If a flag does not open the case, find the case on [Search](help:search).

## Tips and Best Practices

### Common mistakes

- Reading a single month as a pattern. Use the range buttons for a longer view.
- Treating Peer avg as a target. It is only a comparison, and the group can be small.
- Using the Teaching Cases export as an official upload. It is a reference list.

### Efficiency recommendations

- Alt+K takes you here from most screens.
- Use the Quality tab's trend keys to flip between turnaround measures.

### Workflow recommendations

- Review the Overview weekly and the Quality tab before any departmental review meeting.
- Act on open items: Quality Flags point to cases that need attention.

## Related Features

### Upstream workflow

- [Home](help:home): the tile that opens this screen.
- [Worklist](help:worklist): where the cases counted here are worked.

### Downstream workflow

- [Quality & Compliance](help:quality): where deficiencies and discordances are handled.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| Peer avg row is not shown | Peer comparison is turned off for your role by your organization. |
| Peer avg shows "Not enough data" | Fewer than three active colleagues share your role and a facility. |
| TAT Performance shows 0 | No finalized cases with turnaround data yet. |
| Quality Flags is empty | No open items on your cases. |
| Mentor says no supervisees | You have no active supervision assignment. |
| Export button greyed out | Your role does not allow the export. Ask your manager. |

### Resolution steps

1. Refresh the page.
2. Check your role and facility with your manager.
3. Check the case on the Worklist if a count looks wrong.

### When to contact support

Contact your laboratory's PathScribe support when a figure disagrees with your cases after a refresh. Have your name, the tab and the time of the problem ready.
