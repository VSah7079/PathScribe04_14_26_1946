---
module: Quality & Compliance
slug: quality
workflow: Quality Assurance
role: [Quality Staff, Laboratory Manager, Pathologist]
keywords: [quality, compliance, deficiency, CAPA, reconciliation, audit, quality assurance queue, corrective action]
routes: [/quality-compliance, /quality-assurance]
previous: tumor-board
next: quality/ai-discordance
related: [report, worklist, my-contribution, quality/ai-discordance, quality/access-requests, quality/patient-matching, quality/turnaround-and-linkage, quality/fppe-tracking, quality/qa-dashboards, quality/cytology-qa]
status: Draft
---

# Quality & Compliance {#top}

## Overview

**Purpose.** Quality & Compliance is where problems found in the laboratory's work are recorded, dealt with and checked. Its main working area is the **Quality Assurance** queue: a list of deficiencies (a specimen or case that did not meet the standard), what was done about each one, and whether the fix worked. It also shows the frozen-to-final diagnosis reconciliation results.

**Intended users.** Quality staff and laboratory managers, who run the queue, and pathologists, who are asked about the cases in it. Which buttons are active depends on your role.

**Where it fits.** The screen opens from the **Quality & Compliance** tile on the Home Dashboard. That first screen is a hub: it shows a tile for each area you are allowed to open. Choose **Quality Assurance** to reach the working queue. Cases in the queue open on their report screen (see [Report](help:report)).

## Screen Tour

![The Quality Assurance screen with its pillars, tiles and deficiency list](capture:quality-overview)

### The hub

The hub is titled **Quality & Compliance**. A tile appears only if your role may open it.

| Tile | What it is |
|---|---|
| Audit | System activity logs, error and interface exception logs, and the financial audit trail. This is a read-only view of what happened in the system. Only people whose role allows it see the tile. It is not used to change anything. |
| Quality Assurance | The working queue described in this article. |
| Registry Exceptions | Cancer registry submissions that were held, not delivered, rejected or never answered. |
| Autopsy Dashboards | Turnaround, consent, organ retention and cause of death figures. |
| Outbound Queue | Hold, release and retry outbound messages, and fix registry rejections. |

Select **← Back to Home** to return to the Home Dashboard.

!!! note "Demonstration data"
    In the demonstration version the queue holds demonstration records. Nothing you do there reaches a real quality system.

### Field definitions

At the top of the Quality Assurance screen is a row of buttons called pillars. Under it is a row of tiles, each with a count.

| Item | What it means |
|---|---|
| Operations | The deficiency list and the clinical quality views: Deficiencies, Follow-up not received, Frozen Linkage, Discordance, Countersign Turnaround, Credentialing Review, Post-Final Drift, Patient Match Review, Patient Management, Access Requests and AI discordance. |
| Financials | Billing and coding deficiencies: Billing Deficiencies, Resolved, Code Review Pool and Charges awaiting approval. |
| CAPA Engine | Corrective-action follow-through: Recommended, Discordance Patterns (only if your role allows), Escalated to CAPA, Closed and Mgmt Reviews. |
| Cytology QA, Enterprise Rollup, QA Dashboard, Inspection Mode, Activities | Reports and evidence views, each a single screen. |
| Deficiencies tile | Number of open deficiencies. A line under it shows how many are overdue. |
| Escalated to CAPA tile | Number of deficiencies waiting for an effectiveness check. |
| Closed tile | Number of closed deficiencies. |

The deficiency list is split into **Case-Level** and **Specimen-Level** groups. Its columns are:

| Column | What it means |
|---|---|
| Status | **Open** or **Pending Verification**. |
| Case | The case number. Select it to open the case. |
| Specimen | The specimen, or "Case-level" if the problem is with the whole case. |
| Issue | The type of deficiency. A small ↺ and a number show how many times it was reopened. |
| Detail | What was observed (open items) or the corrective action taken (pending items). |
| When | Who raised it and when (open items), or "Due" with the effectiveness check date (pending items). An overdue date is highlighted. |
| Actions | The buttons for that row. |

**More wording on the Quality Assurance screen**

- **Tile tooltips.** The tile you are on says "Showing: … — click to switch"; the others say what they will show.
- **Empty lists.** "No open case-level deficiencies.", "No open specimen-level deficiencies.", "No escalated case-level deficiencies." and "No closed deficiencies yet." mean exactly that for the group you are viewing. Under Financials: "No open billing deficiencies." and "No resolved billing deficiencies." Under CAPA Engine: "No management reviews recorded yet." In the Code Review Pool: "No cases pending code review."
- **Code Review Pool** columns are Flagged, Flagged By and Source. Source is **Manual** (someone put the case in the pool) or **Random sample** (the system picked it). **Review** opens the window below.
- **Review Code Review Pool Entry.** The first line names the case and why it is in the pool ("flagged by …" or "random sample") with any note. Choose a **Review Outcome**: **No Issue Found**, or **Raise Billing Deficiency**. For a deficiency, choose the type, then the **Charge the deficiency is about** (starting at "— Select a charge —"), or "A charge is missing" when the problem is a charge that was never made. Auditor Notes are required for a deficiency. **Submit Review** records the outcome.
- **Management reviews** table: Reviewed, Reviewed By, **Items in Scope** (the closed items the review covered) and **Findings**.
- **CAPA owner: …** appears under a deficiency once a corrective action has an owner.
- **Closure trend** (CAPA Engine). A line chart of deficiencies closed per month for the last six months; hovering a point shows "Closed: …" and "Reopened at least once: …".

### Toolbar

| Button | What it does |
|---|---|
| Scope switcher | Chooses which facilities' deficiencies are listed. |
| Export | Saves the list you are looking at as a spreadsheet file. Your role must allow it. |
| Raise Deficiency | Opens a window to record a new deficiency by hand. Shown on the Deficiencies tile. |
| Immediate Containment | On an open row: closes it at once as a quick fix. |
| Escalate to CAPA | On an open row: starts a corrective action that must be checked later. |
| Verify Effectiveness | On a pending row: records whether the corrective action worked. |
| Start Management Review | On the Closed tile: records a review of closed items not yet reviewed. When there is none, the window reads "Nothing closed since the last review." |

Each action needs its own permission. If a button is greyed out, your role does not allow it; ask your manager.

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Open | The deficiency has been raised and nobody has acted yet. |
| Pending Verification | A corrective action was taken, and someone must come back and confirm it worked. |
| Closed | Finished. Closed items are never deleted. |
| "instant fix, not verified" | Closed by Immediate Containment; there is no root cause and no later check. |
| ↺ and a number | Reopened after a failed effectiveness check. |
| Overdue (highlighted date) | The effectiveness check date has passed. |

### Hotkeys

None are specific to this screen. F1 (View Help) opens this page.

## Step-by-Step Procedures

### Standard workflow

Raise, then contain or escalate, then verify.

1. Open **Quality & Compliance** from Home, then select **Quality Assurance**. The Operations pillar opens on the Deficiencies tile.
2. To record a problem, select **Raise Deficiency**. A window opens.
3. Type the case number in **Case ID / Accession** and select **Look up**. If the case is not found you see "No case found with that ID."
4. Optionally choose a **Specimen**. Leave **— Whole case —** for a case-level problem. Some deficiency types need a specimen to be chosen first.
5. Choose the **Deficiency Type**, describe **What was observed**, and select **Raise Deficiency**. The new item appears in the list as Open.
6. For a small problem that is fixed on the spot, select **Immediate Containment** on its row. Choose the **Resolution Type**, describe **What was done**, and select **Close — Contained**. The item moves to Closed with no later check.
7. For a problem that needs a real fix, select **Escalate to CAPA** on the row. Choose the **Resolution Type**, then fill in **Corrective Action** and **Root Cause** (both required), optionally **Preventive Action**, and set **Effectiveness Check Due** (it starts 14 days ahead). Select **Escalate to CAPA**. The item becomes Pending Verification.
8. When the check date comes, select **Verify Effectiveness** on the row. Describe what you checked.
9. Select **Effective — Close** if the fix worked. The item moves to Closed. Select **Recurred — Reopen** if it did not. The item returns to Open and its ↺ count goes up.
10. Periodically, open **Closed** and select **Start Management Review** to record the review of closed items not yet covered.

### Alternative workflow

1. To review frozen-section results against the final diagnoses, choose the **Discordance** tile under Operations. This is the Reconciliation view.
2. Read the summary tiles: Concordance Rate, Total Reconciliations, High and Medium Severity Discordances, Requiring Escalation and Teaching Cases. A chart shows the monthly concordance rate.
3. Read the **Discordant** list (frozen category to final category, delta, severity, root cause) and the **Concordant** list. Select a row to open the case.
4. Select **Export** for the full list. The Concordant list shows the first 25 rows only.

!!! note "Reconciliations are recorded at sign-out"
    Reconciliation entries are made on the report screen, when a pathologist signs out a case that had a frozen section. This view only reports them.

### Exception handling

1. If the case you want is missing from the list, check the scope switcher; it may be limited to one facility.
2. If you need a root cause analysis, do not use Immediate Containment, because it closes the item with no root cause and no check. Use Escalate to CAPA.
3. If a window's main button is greyed out, a required field is empty.

Immediate Containment states "This moves straight to Closed — no root cause, no later verification." Escalate to CAPA states "This moves to Pending Verification in CAPA Engine, not Closed". Both windows quote the deficiency being closed; when it has no detail they say "no additional detail recorded". In **Raise Deficiency**, the box under **What was observed** shows "Describe the specific issue observed".

### Error recovery

1. If a message says you do not have permission, your role does not allow that action. Ask your manager.
2. If the message reads "The change was not saved. Nothing was changed. Try again, and tell your administrator if it keeps happening," the action did not happen. It appears inside the window, which stays open with what you typed. Select the button again, or Cancel. The same applies when you submit a Management Review.
3. If you closed an item by mistake as contained, raise a new deficiency for the case and say so in the description; closed items are not reopened by hand.

## Tips and Best Practices

### Common mistakes

- Using Immediate Containment for something that needs a root cause. Use Escalate to CAPA.
- Escalating without a realistic Effectiveness Check Due date. The date drives the overdue flag.
- Writing a patient's name in the free-text boxes. Refer to the case number.
- Assuming a "not saved" message was only a warning. The change did not happen.

### Efficiency recommendations

- Select the case number in a row to jump straight to the case.
- Use the Deficiencies tile's overdue line to find what is late.

### Workflow recommendations

- Work the Deficiencies tile daily, the Escalated to CAPA tile weekly, and hold a Management Review on a regular schedule.
- Pathologists: open the Discordance view after sign-out weeks to see your frozen-section concordance, and compare it with [My Contribution](help:my-contribution).

## Related Features

### Upstream workflow

- [Tumor Board](help:tumor-board): the previous step in the review workflow.
- [Report](help:report): where reconciliations are recorded and cases are opened.
- [Worklist](help:worklist): where the affected cases are managed.

### Downstream workflow

- [My Contribution](help:my-contribution): your own quality and turnaround figures.

Detailed articles for the other Quality Assurance screens:

- [AI Discordance](help:quality/ai-discordance): AI products against pathologists, and stalled AI results.
- [Access Requests](help:quality/access-requests): request turnaround, denying requests and revoking access.
- [Patient Match and Management](help:quality/patient-matching): the match review queue, merge, link and move.
- [Countersign, Linkage and Drift](help:quality/turnaround-and-linkage): countersign turnaround, intraoperative linkage and post-final drift.
- [FPPE Tracking](help:quality/fppe-tracking): supervision periods for provisional hires.
- [QA Dashboards and Inspection](help:quality/qa-dashboards): discordance fields, Enterprise Rollup, QA Dashboard and Inspection Mode.
- [Cytology QA](help:quality/cytology-qa): the cytology quality reports and proficiency testing.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| The Quality & Compliance tile is missing | Your role does not include it. |
| The Audit tile is missing | Your role does not allow reading the audit logs. |
| Raise Deficiency, Escalate to CAPA or another button is greyed out | Your role does not allow that action. |
| "No case found with that ID." | The case number was mistyped, or you cannot see that facility. |
| A deficiency type is not in the list | Only active types appear, and a type for specimens appears only after you choose a specimen. |
| "The change was not saved." | The action did not complete. Try again. |

### Resolution steps

1. Check the case number and the scope switcher.
2. Refresh the page and try again.
3. Ask your manager to confirm your role allows the action.

### When to contact support

Contact your laboratory's PathScribe support when "The change was not saved" keeps appearing, or counts on the tiles do not match the list. Have the case number and the time of the problem ready.
