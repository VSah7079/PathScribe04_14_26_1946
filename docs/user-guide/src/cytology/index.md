---
module: Cytology
workflow: Cytology screening and cervical screening quality
role: [Cytotechnologist, Pathologist, Fellow, Quality Manager, Laboratory Manager]
keywords: [cytology worklist, cytology workspace, pap, gyn cytology, non-gyn, fna, pool, claim, qc rescreen, hpv triage, recall needed, csms, 5-year lookback, peer review, histology correlation, follow-up due, scans completed, rose, cell block, screening hours, workload limit, cytology qc queue, surgical qa, post-sign-out qa]
routes: [/cytology-worklist]
previous: pathology-workspace
next: cytology/screening-case
related: [worklist, quality, report, molecular, batch-management/wsi-scan, case-flags, messaging]
status: Draft
---

# Cytology Worklist {#top}

## Overview

**Purpose.** The Cytology Worklist is the cytotechnologist's list of work. It shows the cases assigned to you, the shared pool you can claim from, the shared queue of slides waiting for a QC rescreen, the cases waiting for an HPV result, and a row of quality and compliance lists (recall, CSMS eligibility, the 5-year lookback, peer review, histology correlation, follow-up due and completed scans). You open a case from here to screen it on the [Screening Case](help:cytology/screening-case) page.

This article also describes the two peer-review queues that open inside the main [Worklist](help:worklist): **Cytology QC Peer Review Queue** and **Surgical Post-Sign-Out QA**. See "Peer-review queue views" below.

**Intended users.** Cytotechnologists work from this page every day. Pathologists and fellows use it to see cytology cases and the quality lists, and the QC and QA queue views are for pathologists and quality staff. What you can open depends on your role: if the Cytology Workspace tile is missing from the Pathology Workspace, ask your laboratory manager.

**Where it fits.** A cytology specimen is accessioned, prepared and (for a digital laboratory) scanned. It then appears here: on My Worklist if it was assigned to you, or in the Pool if nobody has taken it. After you screen it, the case moves on to QC rescreen, pathologist review and sign-out, all on the Screening Case page. The quality lists on this page collect the cases that need a later quality step, such as a 5-year retrospective review or a histology correlation.

## Screen Tour

![The Cytology Worklist with the GYN and Non-GYN switch, the main tiles, the QA & Compliance row and a list of cases](capture:cytology-worklist-overview)

The page has, from top to bottom: the title **Cytology Worklist** and a one-line summary; the **GYN Cytology / Non-GYN / FNA Queue** switch; organ-site chips (Non-GYN only); your workload counter and screening hours panel (for those who screen); the main tiles; the **QA & Compliance** tiles; and the list for the tile you selected.

!!! note "Two names for one place"
    The page title says Cytology Worklist. The breadcrumb at the top and the tile in the Pathology Workspace say Cytology Workspace. They are the same place.

!!! note "Demonstration data today"
    The lists are built from the demonstration cases and the demonstration settings. The molecular platform, the registers and the scanner are not connected to a real site yet, so results and scans that would arrive from them are either demonstration data or entered by hand (see "Record an HPV result by hand").

### Field definitions

**The switch**

| Item | What it means |
|---|---|
| GYN Cytology | Cervical and vaginal screening cases (Pap, liquid-based cytology). This is the default. |
| Non-GYN / FNA Queue | Fluids, washings and fine needle aspirations. A lab may instead send non-GYN cytology to the surgical pathology worklist; your laboratory manager sets that, and then those cases do not appear here. |

Changing the switch returns you to **My Worklist** and clears any organ-site chip.

**Organ-site chips (Non-GYN only)**

| Chip | What it means |
|---|---|
| All Sites | No narrowing. |
| Body Fluids/Washings, Breast, GI/Pancreatic, Lung/EBUS, Salivary Gland, Thyroid, Urine/Paris System, Other | Narrows the list to one site. A chip appears only when at least one of your lab's Non-GYN cases is at that site right now. |

**Main tiles for GYN Cytology**

| Tile | What it lists |
|---|---|
| My Worklist | Cases assigned to you that are ready to screen. |
| Pool | Cases nobody has taken yet. You claim one to make it yours. |
| QC / Rescreen | Every GYN slide that was flagged for a mandatory QC rescreen and has not had that rescreen yet. It is one shared queue, not assigned to a person. |
| HPV Triage | Cases that wait for a primary high-risk HPV result before any slide is screened (only in labs that screen by HPV first, then reflex to cytology). |

**Main tiles for Non-GYN / FNA**

| Tile | What it lists |
|---|---|
| My Worklist | Cases assigned to you. |
| Unassigned Pool | Cases nobody has taken yet. |
| Cell Block / Ancillary Pending | Specimens with a cell block or residual fluid whose stain orders are not finished. |
| ROSE / Bedside Evaluations | Specimens with a recent rapid on-site evaluation on record. |

My Worklist and Pool do not repeat a case that already sits on a quality tile below. A case with a QC flag, for example, is on QC / Rescreen and not in My Worklist.

**QA & Compliance tiles (both switches)**

These tiles span GYN and Non-GYN. The switch and the organ-site chips do not narrow them.

| Tile | What it lists |
|---|---|
| Recall Needed | A self-collected HPV test came back positive (or invalid) and the programme asks for a clinician-collected sample (Australia and New Zealand rules). |
| CSMS QA | Cases sent to England's cervical screening register that still need an eligibility answer. |
| 5-Year Lookback | Earlier negative results of a patient who now has a high-grade or malignant diagnosis, waiting for a retrospective review. |
| Peer Review | Signed-out cases picked for post-sign-out peer review. |
| Histology Correlation | Abnormal cytology for which a later biopsy was found and needs a cyto-histologic correlation. |
| Follow-up Due | Abnormal results whose histology follow-up is due soon or overdue. |
| Scans Completed | Cases whose whole-slide scan is complete and that are waiting to be screened. |

Each tile shows a count. The count is the number of rows in its list.

**A row in the list**

| Item | What it means |
|---|---|
| Patient name | Select it to open the case on the Screening Case page. Rows on the Pool tile are not openable: claim the case first. If the name is missing, the MRN or "Unknown patient" is shown. |
| Case line | "Case S26-5002 · MRN 100002" (demonstration values): the case number and the MRN. |
| Final Diagnosis Recorded / Awaiting Review | Green when a specimen on the case already has its final diagnosis chosen; amber otherwise. |
| High-Risk QC / Random QC | On the QC / Rescreen tile: why the slide was picked. |
| Your primary screen - needs another screener | On the QC / Rescreen tile: you did the first screen, so another screener must do the rescreen. |
| AI: Review / AI: No Further Review (with a rank such as 2/5) | The result of the slide-level AI triage, when one has been completed. It is advice only. |
| AI-Flagged FOV | The number of fields of view the AI marked, when there is no triage result. |
| Hover text on the AI badges | Hold the pointer over the triage badge and it reads "AI slide-level triage"; over the field-of-view badge it reads "AI-flagged fields of view". |
| Case … · MRN … | The small line under the patient's name on a case row (for example in HPV Triage or Recall Needed): the case number, then the MRN. |
| Awaiting hrHPV Result / hrHPV result invalid: repeat test | On HPV Triage: the case waits for a result, or the result came back invalid. |
| Manual entry awaiting second sign-off | On HPV Triage: a hand-entered result is waiting for a second person. |
| Scan Complete - Ready to Screen | On Scans Completed. |
| Positive (Self-Collected) - Recall for Clinician-Collected LBC / hrHPV invalid (self-collected) - repeat collection needed | On Recall Needed. |
| CSMS Eligibility Verification Needed | On CSMS QA. |

**Empty lists** say what the tile is for, for example "No cases currently assigned to you." or "No cases are waiting for a QC rescreen."

**Your workload counter ("Your workload (last 24 hours)")**

Shown if your laboratory uses the CLIA workload limit and you screen. The first figure reads "… of … slides counted" (for example 4.5 of 12: the slides counted so far, then your cap), then the number of reviews, "slides left now" and "slides left in a full 8-hour day". The limit grows with the hours you have screened. It turns amber as you approach it ("Approaching your limit") and red at the limit and over it.

**Screening hours panel ("Today's screening hours")**

Shown if your role records screening hours and some time was recorded. It shows "Recorded: … h" (for example 6.5 h, a demonstration value), a hint "Confirm at the end of your day. This is your screening hours record." and the buttons below.

### Toolbar

| Button | What it does |
|---|---|
| GYN Cytology / Non-GYN / FNA Queue | Switches the main tiles. |
| A tile | Shows that list. The selected tile is highlighted. |
| Claim (Pool) | Takes the case. It is yours from then on and appears in My Worklist. Shows "Claiming..." while it works. Greyed out if you do not hold the claim permission. |
| Pass (Pool) | Passes the case on without taking it. Greyed out if you do not hold the pass permission. |
| Ask a colleague (QC / Rescreen) | On your own primary screens: opens a new message addressed to nobody yet, with the subject "QC rescreen needed: case ..." so you can ask another screener. |
| Verified (CSMS QA) | Records "Eligibility verified" in one step. |
| Reason not eligible, then Record not eligible (CSMS QA) | Choose Ceased from the programme, Suspended from the programme, Outside the programme age range or Another reason, then select **Record not eligible**. |
| Manage Flags (CSMS QA) | Opens the case flags window for that case. |
| Record Negative / Record Positive (HPV Triage) | Opens a window to enter the hrHPV result by hand. |
| Approve entry / Reject entry (HPV Triage) | A second person approves or rejects a hand-entered result that would replace an interface result. |
| Confirm … h / Correct (screening hours) | **Confirm … h** (for example Confirm 6.5 h) confirms the recorded hours in one click. **Correct** opens a small inline form to correct them; when your figure differs it asks for the "Reason for the correction". |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Coloured tile with a large number | The count of rows in that list. |
| Green badge | A completed step: Final Diagnosis Recorded, Scan Complete, AI: No Further Review. |
| Amber badge | Waiting: Awaiting Review, AI: Review, your own primary screen. |
| Red badge | A quality flag: High-Risk QC, Random QC, or a recall. |
| Violet badge | HPV: awaiting a result, invalid, or a manual entry waiting for approval. |
| Urgent / Routine, with "Target: 2-4 weeks" | On a Recall Needed row: the priority and the target window set by your laboratory. Urgent is for HPV 16/18. The recall wording and the recommendation codes are shown under the row. |
| Workload bar | Fills as you use your slide limit; a mark shows the limit so far. |

**Returned to trainee.** When you return a specimen with feedback, a message says "Returned to … with your feedback." On the trainee's screen a banner reads "Returned for revision by …" followed by your feedback.

### Hotkeys

None on this page. The keys for screening, the material drawer and the synoptic drawer work on the [Screening Case](help:cytology/screening-case) page.

## Peer-review queue views (Cytology QC and Surgical QA)

Two peer-review queues open inside the main [Worklist](help:worklist), beside the **LIS Cases** and **Orchestration Cases** tiles. They are not part of the Cytology Worklist page, but they belong to cytology quality (and, for Surgical QA, to surgical pathology quality). Each shows as a tile only if your role may open it, with the number of items waiting. The old addresses /cytology-qc-queue and /surgical-qa-worklist now forward to these views.

![The Worklist with the Cytology QC Peer Review Queue tile selected](capture:cytology-qc-queue-overview)

### Cytology QC Peer Review Queue

**What it is.** The pathologist's queue of cytology cases picked for a QC peer review, in priority order. This is a different step from the cytotechnologist's QC rescreen: the rescreen is done by a screener from the **QC / Rescreen** tile above; the peer review is a pathologist's verdict on the case ("concurrence" or "discrepancy").

**Who sees it.** The Pathologist and Fellow roles by default. Anyone whose role holds the QC bypass permission can also open it.

The page title is **Cytology QC Peer Review Queue**. Two buttons switch between **Queue** and **Compliance**.

**Queue view.** Three tabs narrow the list: **All Items**, **Escalations & Discrepancies** (priority 1 and 2) and **Routine & Random** (priority 3). Each row shows:

| Item | What it means |
|---|---|
| Patient name and accession number | Who the case is for. |
| Priority 1 - High Escalation / Priority 2 - Targeted High-Consequence / Priority 3 - Routine Random | The tier the rules gave the case. The list is sorted with the most urgent first. |
| Suggested: Abnormal, Malignant or Critical | The highest abnormal severity of the Bethesda review. It is advice only and does not block sign-out. |
| Small labels | Extra labels the rule added. |
| On Time / Approaching SLA / SLA Breached | The deadline for the review. It becomes "Approaching" at 80% of the time allowed, and "Breached" at the deadline. The page re-checks every 30 seconds. |
| Selected by: ... | Every reason the case was picked, for example ROSE discrepancy, CT escalation, High-risk peer review, Random peer review, or "Rule: " and the rule name. |
| Reviewer pool: ... | The roles that may take the review. |

Row buttons:

| Button | What it does |
|---|---|
| Open Case | Opens the case on the Screening Case page. **Back** there returns to this queue. You can record the verdict from the case's own bar as well. |
| Assign to Me | Takes the review. Offered only if you hold the QC review permission, you did not sign the case out and you are in the reviewer pool. |
| Record Concurrence | Records that you agree. It is one click with no window. Offered only on a review assigned to you. |
| Record Discrepancy | Opens the **Record Discrepancy** window (below). |
| Escalate | Appears on a review in progress whose deadline has passed. Asks for a reason, then returns the review to the queue unassigned so another reviewer can take it. |
| Supervisor bypass | Appears only for people holding the bypass permission. Asks for a justification, then approves the case without a QC review "to prevent a clinical delay". Your name and the justification are kept in the audit log. |

If you cannot take a review, the row says why in place of the button: "You signed this case out, so another pathologist must review it.", "You are not in the reviewer pool for this case, so you cannot take or record its review." or "Assigned to another reviewer".

**Record Discrepancy window.**

| Field | What it means |
|---|---|
| Primary Diagnostic Code | Required. The diagnosis you think is correct. |
| Secondary Diagnostic Code | Optional. Leave it empty when there is no second code. If you fill it, it must be a recognised code, and if it differs a lot from the primary code, you are asked to confirm (see below). |
| Severity | Major (the default) or Minor. |
| Reviewer Commentary | Free text. |

Select **Submit Discrepancy**. The button stays off until the primary code is filled. Select Cancel to leave without recording.

**When the two codes differ a lot.** PathScribe compares the two codes on the cytology category scale (0 negative, 1 ASC-US, 2 LSIL, 3 ASC-H, 4 HSIL, 5 malignancy). The codes "differ a lot" when they are two or more steps apart (for example NILM with LSIL, or ASC-US with HSIL), or when they sit on opposite sides of the low-grade / high-grade line even one step apart (LSIL with ASC-H). A message appears in the window and the button becomes **Confirm and Submit**; select it to record the discrepancy as entered, or change a code to go back. A code is matched to a category by its abbreviation or name (for example HSIL); a Secondary Diagnostic Code PathScribe cannot match is not skipped: the message "Unrecognised code: not compared with the primary" appears under that field and Submit stays unavailable until you pick a recognised code or clear the field (the code is never stored as typed). Severity (Major or Minor) is your own call and is not changed by the comparison.

A message in red under the title tells you when an action failed: "You don't have permission to record cytology QC reviews." or "The review couldn't be saved. Please try again."

**Compliance view.** A report for audits, built from every QC assignment on file. The figures are: All QC assignments, Resolved, Concordant, Discrepancies, Discrepancy rate, Major, Minor, SLA escalations and Supervisor bypasses. A table headed **By reviewer** lists each reviewer with Cases reviewed, Discrepancies and Discrepancy rate. It shows "No resolved reviews yet." until a review is resolved. It has no date filter.

### Surgical Post-Sign-Out QA

**What it is.** The queue of surgical pathology quality items found at sign-out: cases picked for post-sign-out peer review, biopsy-to-resection correlation candidates, and low-risk clinical mismatches that a pathologist deferred. The page title is **Surgical Post-Sign-Out QA**.

**Who sees it.** The Pathologist and Fellow roles by default.

**Review items.** Each row shows the patient and accession number and one label:

| Label | Meaning |
|---|---|
| Peer Review - Random | The case was picked at random for peer review. |
| Peer Review - Targeted | The case was picked because of a high-risk rule. |
| Biopsy-to-Resection Correlation Candidate: *case number* | A later resection (or biopsy) may correspond to this specimen and needs a correlation review. |

Row buttons:

| Button | What it does |
|---|---|
| Open Case | Opens the case's report page. **Back** returns to this queue. |
| Record Review | Opens the review form for that kind of item. |
| Not Relevant | On correlation candidates only: removes the candidate from the queue. |

The review form follows the QA activity your laboratory has set up for peer review or correlation. Its own fields come first (and are marked * when required). Then choose the outcome, **Concordant** or **Discordant**. A discordant outcome opens more fields: the direction of the change (Upgrade - understated severity, Downgrade - overstated severity or Minor variance), the severity, the root cause (Sampling error, Interpretation error, Technical artifact or Other, with a note for Other) and a narrative comment. All are required for a discordant outcome. The button reads **Confirm Review** or **Record Discordance**.

The list shows "Nothing pending - every flagged case and correlation candidate has been reviewed." when it is empty. Recording needs the surgical QA review permission; without it you see "You don't have permission to record surgical QA reviews."

**Deferred clinical mismatches (secondary review).** Below the review items: low-risk clinical mismatches that a pathologist chose to defer while reviewing a report. Each row shows the case, the kind of mismatch, and "Deferred by *name*, *date*". Select **Review** to open a short form: an optional quick-pick Reason (Clinical context reviewed, Expected variation or Pre-op diagnosis non-specific), an optional Note, and the answer **Resolved** or **Unresolved**. Unresolved lets sign-out go ahead and recommends a corrective action to QA. When none are waiting the list says "No deferred mismatches waiting."

## Step-by-Step Procedures

### Standard workflow

**Screen the cases assigned to you.**

1. Open **Cytology Workspace** from the Pathology Workspace. The Cytology Worklist opens on **GYN Cytology** with **My Worklist** selected.
2. If you also screen Non-GYN or FNA cases, select **Non-GYN / FNA Queue**. Use an organ-site chip to narrow the list.
3. If a "Yesterday's screening hours" panel is showing, confirm or correct it first (see below). It appears only while yesterday still needs signing off.
4. Select a patient's name. The [Screening Case](help:cytology/screening-case) page opens for that case.
5. Screen the case and save your review there. Use **Back to Worklist** to return. The case leaves My Worklist when it moves to another step.

**Take work from the Pool.**

1. Select the **Pool** tile (**Unassigned Pool** for Non-GYN). Pool rows cannot be opened.
2. Select **Claim** on the case you will screen. The button shows "Claiming..." and the list refreshes. The case is now in My Worklist.
3. If someone else took the case a moment before you, a message says it was taken and the case stays with them.

**Confirm your screening hours at the end of the day.**

1. Read "Recorded: *N* h" in the **Today's screening hours** panel.
2. If the figure is right, select **Confirm … h**. The panel changes to "Signed off: … h at …" (the hours, then the time you confirmed).
3. If it is not right, select **Correct**, type the hours (0 to 24) and, because the figure differs, choose the "Reason for the correction": "Screened at the microscope, away from the screen", "A slide was left open while I was away" or "Other". Add a note (required for Other; never put patient details in it), then select **Save**.
4. A correction of more than the tolerance from the recorded figure is marked for your supervisor ("More than *N* h from the recorded time: your supervisor will see it.").
5. Select **Change** later if you need to alter it. If more screening is recorded after you signed off, the panel asks you to confirm again.

### Alternative workflow

**Do a QC rescreen.**

1. Select **QC / Rescreen**. The list is shared: every slide waiting for a rescreen is here, not only yours.
2. Pick a slide that does not carry "Your primary screen - needs another screener". Select the name. The Screening Case page opens and your role is set to a QC role automatically.
3. Screen it independently and save. The rescreen is compared with the first screen on the page.
4. For a slide you screened yourself, select **Ask a colleague**. A new message opens with the subject "QC rescreen needed: case ...". Address it and send it.

**Record an HPV result by hand.**

1. Select **HPV Triage**. Each row says "Awaiting hrHPV Result" (or "hrHPV result invalid: repeat test").
2. Select **Record Negative** or **Record Positive**. A window opens with the title "Record hrHPV Negative by hand" (or Positive). It says the molecular platform's interface is the normal source of this result.
3. Choose the **Result source (required)**: Manual entry: interface downtime, external paper report, telephoned result (verified and countersigned), or historical back-entry.
4. If the case already holds a result from the interface, the window says your entry will not replace it until a different authorised person approves it. Select **Submit for second sign-off**. Otherwise select **Record result**.
5. The second person opens the same row, reads "*Result* entered by *name* (*source*); it would replace *previous*" and selects **Approve entry** or **Reject entry**. The same person cannot approve their own entry.

**Record CSMS eligibility.**

1. Select **CSMS QA**. Check the patient's status in the register.
2. Select **Verified** if she is eligible. The row clears and the message "Eligibility verified. The CSMS message is being sent." appears.
3. If she is not eligible, choose the reason in the box and select **Record not eligible**. The message "Recorded as not eligible. The CSMS message was not sent." appears.

**Work the quality tiles.** Select 5-Year Lookback, Peer Review, Histology Correlation or Follow-up Due and open the case. The matching banner or card is on the Screening Case page (see that article). Follow-up Due is closed out in Quality Assurance, under Operations, Follow-up; see [Quality](help:quality).

**Open a case from Scans Completed.** Select the row. The case opens ready to screen.

### Exception handling

1. **A case you expect is not on any list.** Switch between GYN and Non-GYN. Check the QA & Compliance tiles: a case with a QC flag, lookback flag, peer-review flag, correlation candidate or CSMS flag sits on that tile and not in My Worklist or Pool. A Non-GYN case may have been routed to the surgical pathology worklist by your lab's setting.
2. **You reach your workload limit.** When you save a review that would put you over the limit, the save is refused, the case and your other waiting cases go back to the pool or to colleagues with room, and you return to the worklist with a message about where they went. Review work already saved is never discarded. See the Screening Case article.
3. **A Recall Needed row.** It is for information and follow-up by the clinician and the programme. There is nothing to click on the row.
4. **A Pool row has no name link.** Claim it first.
5. **The count on a tile and the rows seem different.** Reload the page. The counts and rows are read together when the page loads.

### Error recovery

1. **"You do not have permission to record this result."** (HPV) or **"You do not have permission to record CSMS eligibility checks."** You need the permission for that action. Ask your laboratory manager.
2. **"The result could not be recorded. Check the source and try again."** Choose a source and submit again.
3. **"The eligibility check could not be recorded. Reload the worklist and try again."** Reload, then repeat the step.
4. **"Your hours weren't saved. Try again."** or **"Enter hours between 0 and 24."** Correct the figure and save again. **"That day can no longer be signed off here (the day has moved on). Your supervisor can correct it."** means you must ask your supervisor.
5. **A claim was refused for permission.** The Claim and Pass buttons are greyed out without permission, and a toast explains if a refusal still comes back.

!!! warning "A hand-entered HPV result can change what happens to a patient"
    An HPV result decides whether a slide is screened and what is recommended. Enter it only from a trusted source, choose the true source, and never approve your own entry. Every entry is recorded with your name, the time, the source and the result it replaces.

## Tips and Best Practices

### Common mistakes

- Looking for a QC-flagged case in My Worklist. It is on **QC / Rescreen**.
- Trying to do the QC rescreen of a slide you screened first. The Screening Case page refuses it; use **Ask a colleague**.
- Confusing the **QC / Rescreen** tile (a screener's rescreen) with the **Cytology QC Peer Review Queue** (a pathologist's verdict). They are different steps with different people.
- Confirming screening hours without reading them. The figure is your record; correct it when it is wrong.
- Choosing "Other" as the reason for a hours correction without a note.
- Recording an HPV result by hand when the interface result is only late. Check with the molecular bench first.

### Efficiency recommendations

- Start the day on **My Worklist**, then **QC / Rescreen**, then the pool.
- Use the patient name to open a case; a click anywhere on the row also opens it (not on Pool rows).
- Read the AI triage badge as a hint for ordering your work, not as a result.
- Confirm your hours in one click at the end of the shift.
- Watch the workload counter during the day. It shows the slides left now and left in a full day, so you can plan before you hit the limit.

### Workflow recommendations

- Clear the QA & Compliance tiles on a regular schedule so retrospective reviews and correlations do not age.
- Recall Needed and Follow-up Due are about patients who may be lost to follow-up. Treat them as time-sensitive.
- A laboratory manager reviews the Cytology QC Peer Review Queue's Compliance view for audits.

## Related Features

### Upstream workflow

- [Pathology Workspace](help:pathology-workspace), where the Cytology Workspace tile is.
- [Accession](help:accession), where the cytology specimen and its order are logged.
- [Batch Management, WSI scan](help:batch-management/wsi-scan), where slides are scanned before they appear on Scans Completed.
- [Molecular](help:molecular), where the HPV result is produced.

### Downstream workflow

- [Screening Case](help:cytology/screening-case), where you screen, review, QC and sign out.
- [Worklist](help:worklist), which holds the Cytology QC Peer Review Queue and Surgical Post-Sign-Out QA views and the Cytology Review tile for pathologists.
- [Quality](help:quality), for follow-up tracking and QA reports.
- [Report](help:report), for surgical cases opened from the Surgical QA queue.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| The Cytology Workspace tile is missing | Your role does not hold the permission to open the Cytology Workspace. |
| The Cytology QC or Surgical QA tile is missing in the Worklist | Your role may not open that queue. |
| My Worklist is empty but you were told you have cases | The cases are on a quality tile, are in the Pool, or are on the other side of the GYN / Non-GYN switch. |
| No Workload panel | Your laboratory does not use the workload limit, or your role does not screen. |
| No Screening hours panel | No time has been recorded today, or your role does not sign off hours. |
| Claim or Pass is greyed out | You do not hold the pool claim or pass permission. |
| HPV Triage is always empty | Your laboratory does not screen by HPV first. |
| The Peer Review tile is empty after a sign-out | The case was not picked by the sampling rule. |
| Record Review in Surgical QA says you lack permission | Your role cannot record surgical QA reviews. The button is not greyed out; the message appears after you try. |

### Resolution steps

1. Reload the page and wait for "Loading..." to disappear.
2. Check the GYN / Non-GYN switch and the organ-site chip.
3. Check the QA & Compliance tiles for the case.
4. Ask your laboratory manager to check your role's permissions.
5. For a case that still does not show, search for it by its case number in [Search](help:search) and open it from there.

### When to contact support

Contact your laboratory's PathScribe support when a count and its list never agree after a reload, when a case is missing from every list, or when a message appears that this article does not explain. Have the case number and the time of the problem ready.
