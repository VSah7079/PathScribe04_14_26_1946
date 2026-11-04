---
module: Worklist
workflow: Case Management
role: [Pathologist, Pathology Assistant, Laboratory Manager]
keywords: [worklist, pending cases, my cases, pool, claim, accept case, assignment, awaiting countersign, peer review queue, hold]
routes: [/worklist]
previous: pathology-workspace
next: report
related: [search, grossing, quality, cytology, case-flags, voice-and-keyboard, report/case-team]
status: Draft
---

# Worklist {#top}

## Overview

**Purpose.** The Worklist lists the cases you have to work on: cases assigned to you, cases waiting in a pool for someone to claim them, and the queues that need your attention (countersign, release, revision, review, holds, follow-up). Tiles across the top count each kind of work and filter the list when you select them. Selecting a case opens it.

**Intended users.** Pathologists, pathology assistants and laboratory managers. What you see depends on your role: the peer-review queues, for example, appear only to people who may open them.

**Where it fits.** The Worklist is the usual start of the working day. Cases arrive here after accessioning and grossing. From a row you go on to the case report. To find a case that is not in your list (for example a completed case from last month), use [Search](help:search).

## Screen Tour

![The Worklist with the LIS Cases and Orchestration Cases tiles, the branch tabs, the filter tiles and the case table](capture:worklist-overview)

!!! note "Demonstration data"
    In this version the cases, pools and counts come from demonstration data. Screens, buttons and rules behave as described here, but the cases you see are not real patients.

The screen has four bands, from the top:

1. **LIS Cases and Orchestration Cases tiles** (and, for people who may use them, the two peer-review queue tiles). These switch the whole screen between your laboratory's own cases and Orchestration cases.
2. **Branch tabs**: All Cases, Surg Path, Cytology and Autopsy, each with a count.
3. **Filter tiles**: one per kind of work, each with a count.
4. **The case table**, under the page title (the title changes to name the filter you chose, for example "Urgent" or "Awaiting Countersign").

### Field definitions

| Field | What it means |
|---|---|
| LIS Cases / Orchestration Cases | Switches between the two sources of cases. LIS Cases come from your laboratory information system. Orchestration cases are the ones PathScribe Orchestration holds itself (the lock window calls them Orchestration cases), a different source with its own access rule. The number is every case in that group, assigned to you plus waiting in a pool. Your choice is remembered for the rest of your session. |
| Urgent and Pool badges | On the tile you are not currently viewing, small badges tell you that the other group has urgent cases or pool cases waiting. |
| Cytology QC Peer Review Queue, Surgical Post-Sign-Out QA | Two peer-review queues that open inside the Worklist, with the number of items waiting. They are shown only if your role may open them. |
| All Cases, Surg Path, Cytology, Autopsy | Branch tabs. They narrow the list and the tile counts to one discipline. All Cases is the default. Your choice is remembered for the rest of your session. |
| Case | The accession number of the case. |
| Patient, DOB (Age), Sex, MRN | Who the case belongs to. Cases you may not see yet show a lock and a message instead (see Exception handling). |
| Physician | The requesting physician. |
| Specimen(s) | The specimens on the case. Point at a chip to read the full description. |
| Flag(s) | Flags on the case or on its specimens. Point at a chip to see whether it is a case flag or a specimen flag and what it means. |
| Staff | The people on the case. A small RES tag marks a resident or fellow. Selecting a name starts a message to that person. |
| Status | Where the case is, for example Draft, Accessioned, Gross Complete, In Progress, Finalizing, Pending Countersign, Pending Release, Returned, Pool. A finalized case with a revision reads, for example, "Final (Amended)". A case has one final diagnosis, but each specimen can have its own synoptic report. When a case has several synoptic reports that are not all in the same state, the status shows how many are final, for example "1/2 Final" (two synoptic reports, one final). |
| Digital Readiness, DP AI Triage & Biomarkers | Shown for cases that have digital slides or an AI screening result. Select the badge to open the slide or triage details. |
| Sorted by | A ribbon above the table that appears when you sort. **Clear All** removes the sort. |

**Slide Detail panel.** It slides out from the right when you select a digital-slide badge. The heading is **Slide Detail**, with the accession, patient and MRN under it.

- **Case Readiness Summary** shows the case's digital-readiness status and, when an AI screen exists, "AI Triage:" with its result and any biomarker note. With neither it says "No digital slide data available for this case."
- **Slide Assets** lists each scanned slide by its position, with a status (Pending, Scanning, Ready or Error), the acquisition mode and number of focal planes, and a note when a scan failed. "No WSI scan data available for this case." means no scan has been recorded. Slides are not matched to blocks, so the panel does not say which block a slide came from.
- **Open Case Workspace** opens the case.

### Toolbar

The Worklist has no toolbar. Its controls are the tiles and tabs described here, and the sort headings of the table.

| Control | What it does |
|---|---|
| A filter tile | Shows only that kind of work. The tile you chose stays highlighted and its label changes to "Back to LIS Cases" (or "Back to Orchestration Cases"). Select it again to return to all cases. |
| A branch tab | Narrows the list to Surg Path, Cytology or Autopsy cases, or back to All Cases. |
| LIS Cases / Orchestration Cases | Switches the group of cases and resets the filter to Active Cases. |
| Table column headings | Sort the table. Sorting more than one column is possible; the Sorted by ribbon lists them. |

### The filter tiles

Each tile shows a count. The counts follow the branch tab and the LIS or Orchestration choice you made, and they count the same cases the list shows when you select the tile.

| Tile | The cases it shows |
|---|---|
| Pool Cases | Cases waiting in a pool for someone to claim. Selecting one opens the claim window. |
| Delegated | Cases delegated to you that you have not yet taken up. |
| Awaiting Countersign | Cases a resident has released that are waiting for your countersignature as attending. |
| Collaborating Cases | Open cases where you are an active member of the case team, in any role (not only the ones assigned to you). Finalized and closed cases are left out. If you are taken off a case's team, it leaves this tile. |
| Queued for Release | Cases you signed out that are held in the release buffer, where you can still recall them before the report is released. |
| Needs Revision | Cases returned to you for revision, or returned by you and still waiting for the revision. Shown only when there are some. |
| Urgent | STAT and Rush cases. The tile also shows "+n in Pool" when urgent cases are waiting unclaimed in a pool. |
| In Progress | Cases being worked on. |
| Awaiting Grossing | Cases accessioned and waiting for grossing. |
| Gross Complete | Cases grossed and ready for the microscopic read. |
| Cases on Hold | Cases with an active hold. |
| Digital Pathology | Cases with digital slides or an AI screening result. Not shown on the Autopsy branch. |
| GYN Cytology, Non-GYN Cytology / FNA | Shown only when the Cytology branch tab is chosen. |
| New Cases | Cases you have never opened. The tile turns red when one of them is urgent. |
| Amend & Addenda | Cases with a pending amendment notice from the laboratory system, or an open amendment, correction or addendum draft. The list groups them under "Amendment & Correction", "Addenda" and "LIS Notices — Pending Review". |
| Completed Today | Cases finalized today, in your facility's time zone. |
| Draft | Cases still in draft. |
| Finalizing | Cases in the finalizing step. |
| Informal Review | Cases a colleague has asked you to look at informally. |
| Peer Review | Cases with a peer review waiting on you. Shown only when there are some. |
| Follow-up due | Your signed-out cases whose follow-up is due soon or overdue. Shown only when there are some. |
| Cytology Review | Positive GYN cytology waiting for a pathologist, if your role may take them. Shown only when there are some. |

Two bars can also appear above the table when they apply: **Amended & Addenda Triage** (inbound laboratory-system amendment notices and open amendment or addendum drafts) and **Pending Grossing Triage** (specimens whose grossing checklist is not fully confirmed, with "n of m checklist items confirmed").

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Red dot | Urgent case (STAT). |
| Status dot | The case status. Point at it to read "Status: ..." in words. |
| New / Grossed (pool rows) | New means the pool case is awaiting gross. Grossed means it is ready for pickup. |
| Urgent and All Cases bars | Divider bars inside the list. Urgent cases that are unclaimed in a pool sit at the very top. |
| n Restricted | On a divider bar: more cases of the same type are waiting unclaimed in a pool and are not counted in that group's own total. Beside a pool name: you are not a member of that pool, so its cases are visible but you cannot claim them. |
| Lock with "Restricted ..." | You cannot open this case yet (pediatric, Orchestration or pool access). |
| Access requested | You have already asked for access and are waiting. |
| SLA | The case is past a client's first-touch or signed-report target. |
| Warning triangle | The case has an open specimen deficiency (see the Deficiencies queue in [Quality & Compliance](help:quality)). |
| Coloured dot (Abnormal, Critical, Malignant) | A finding confirmed at sign-out. |

**More worklist wording**

- **Tile tooltips.** The LIS Cases and Orchestration Cases tiles say what they are: when active, "Currently in LIS Cases" or "Currently in Orchestration Cases"; when not, "Switch to LIS Cases" or "Switch to Orchestration Cases".
- **Sorted by.** When you sort by more than one column, a ribbon lists the columns in order, each marked "asc" or "desc" (ascending or descending), with an x to drop that column and **Clear All** to reset.
- **Empty list.** "No cases match the current filter." means the tile, tab or LIS/Orchestration choice holds no cases.
- **Pool dots.** A pool case carries a small dot with a tooltip: "New — awaiting Gross" (not yet grossed) or "Grossed — ready for pickup" (grossing is done, so it can be claimed and reported).
- **Digital slide badges.** The badge under Digital Readiness has the tooltip "View slide details"; the badge under DP AI Triage & Biomarkers has "View AI triage details". Either opens the **Slide Detail** panel (see below).
- **Restricted rows.** The patient name is replaced by a lock and "Restricted Patient", "Restricted Case" or "Restricted Pooled Case". Under it a hint says what to do: "Click to request pediatric access", "Click to request Orchestration access", or, for a pool case, "Claim this case to view patient details". After you ask, the hint becomes "Access requested". The window that opens is titled **Pediatric Access Required** ("Patient age … · Case …") or **Orchestration Access Required** ("Case …"). Pediatric access needs both your own qualification and the submitting facility's authorisation; Orchestration cases come from a separate source with their own access rule.
- **Small screens.** In a window narrower than 1024 pixels, or on a tablet, the table becomes a list of cards. A card pairs the labels "Accession · Physician" with the received date under them. The tiles, sorting and indicators work the same way. Make the window wider and the table returns. The Search results use the same list, so they change to cards at the same width.
- **Amended & Addenda Triage.** A draft amendment or addendum that has no explanation of change or title shows "Draft not yet released" in place of its detail.

### Hotkeys

Click a row, or move through the list with the keys below. Keys marked "screen" apply on the Worklist; if a key is also used by an always-available command, the Worklist wins while you are on this screen and the other command is reached with Alt+J, then its key.

| Action | Key |
|---|---|
| Open the Worklist from another screen | Alt+W |
| Next row / previous row | Alt+Down Arrow / Alt+Up Arrow |
| Ten rows down / up | Alt+Page Down / Alt+Page Up |
| First row / last row | Alt+Home / Alt+End |
| Open the selected case | Alt+Enter |
| Refresh the list (the page stays as it is) | Alt+R |
| Filter Urgent | Alt+F |
| Filter Completed Today | Alt+C |
| Filter Pool Cases | Alt+Shift+P |
| Filter Awaiting Countersign | Alt+A |
| Filter Collaborating Cases | Ctrl+Alt+F |
| Filter by Physician | Alt+Shift+F |
| Filter New Cases | Alt+Shift+U |
| Filter Digital Pathology | Ctrl+Alt+Y |
| Filter GYN Cytology / Non-GYN Cytology / Autopsy | Ctrl+Alt+Z / Alt+Shift+K / Alt+Shift+Q |
| Clear the filter | Alt+Shift+C |
| Sort by date / priority / status | Alt+S / Alt+P / Alt+Shift+S |
| Sort by a named column / clear sort | Ctrl+Alt+S / Ctrl+Alt+C |
| In the claim window: Accept / Pass | Alt+A / Ctrl+Alt+P |

!!! note "Alt+A has two meanings"
    On the Worklist, Alt+A filters Awaiting Countersign. While the pool claim window is open, Alt+A means Accept instead, and goes back to the filter when the window closes. Accept and Pass only act when their buttons are showing and not greyed out.

## Step-by-Step Procedures

### Standard workflow

1. Open the Worklist from Home, or press Alt+W. The list opens with the Active Cases title, showing everything in the group and branch you last used.
2. Check the tiles. Counts above zero on Urgent, Awaiting Countersign, Queued for Release, Needs Revision and the others tell you what needs attention first.
3. Select a tile to filter the list. The page title changes to the tile's name and the tile's label becomes "Back to LIS Cases".
4. Select a case row. The case opens in the report screen. (For a pool case, see the next procedure.)
5. When you leave the report and come back, the filter you were using is restored and the next case in the list is selected for you.

### Alternative workflow

**Claim a case from a pool.**

1. Select the **Pool Cases** tile, or find a row whose status reads Pool (pool rows are grouped under their pool name, urgent pools first).
2. Select the row. The claim window opens under the heading "*pool name* — Case Assignment" and first shows "Checking availability...".
3. When the window is ready it says what you can do. Select **Claim & Continue** to assign the case to yourself and open its report, or **Pass** to return it to the pool for another reviewer.
4. After **Pass**, you return to the Worklist with the Pool Cases tile still selected.
5. To leave without deciding, close the window. The case is released and stays in the pool.

**Work through the keyboard.**

1. Use Alt+Down Arrow and Alt+Up Arrow to move through the list, and Alt+Enter to open the highlighted case.
2. Use the filter keys in the Hotkeys table to switch tiles without the mouse.

**Review a peer-review queue.**

1. Select the Cytology QC Peer Review Queue or Surgical Post-Sign-Out QA tile (shown only if your role allows).
2. The queue opens inside the Worklist. Select the LIS Cases tile to return to your cases.
3. The Cytology QC view is described in [Cytology](help:cytology). The Surgical QA view lists post-sign-out peer review cases (random or targeted), biopsy-to-resection correlation candidates and a second list of deferred clinical mismatches awaiting secondary review. A row's buttons are Open Case, Record Review (Concordant or Discordant; Discordant asks for the direction of change, severity, root cause and a comment) and, for correlation candidates, Not Relevant. Recording a review needs the surgical QA review permission.

**Take a positive cytology case.**

1. Select the **Cytology Review** tile.
2. Select a case with no pathologist yet. The window "Take this case for review?" explains that taking it makes you the pathologist and opens it in the Cytology Workspace.
3. Select **Take and open**. A case that is already yours opens directly.

### Exception handling

1. **The case shows a lock.** A pediatric case, an Orchestration case or a pool case from a pool you do not belong to cannot be opened. Select the row to see what is needed. For pediatric and Orchestration cases, select **Request Pediatric Access** or **Request Orchestration Access**; an automated request goes to your system administrator and the row then reads "Access requested". For a pool case, the claim window shows **Request Pool Access**.
2. **The claim window says "Case Unavailable".** Another pathologist is reviewing the case, or accepted it first. Close the window and choose a different case.
3. **The claim window says "Pool Access Required".** You are not a member of that pool. Select **Request Pool Access**; an administrator is notified and can add you.
4. **Claim & Continue or Pass is greyed out.** Your role must allow the action. Ask your manager.
5. **A tile you expect is missing.** Needs Revision, Peer Review, Follow-up due and Cytology Review disappear when their count is zero. The GYN and Non-GYN tiles appear only on the Cytology branch tab, and Digital Pathology is hidden on the Autopsy branch.
6. **A case is not in your list at all.** The list shows cases assigned to you, cases in pools, and cases that reach you through delegation, review, follow-up or countersign. Use [Search](help:search) for anything else.

!!! note "Automatic pool routing"
    A case that nobody has accepted after grossing is routed to its pool once the Assignment Timeout set by your administrator has passed. This is checked while the Worklist is open, about every 30 seconds. It never takes a case away from a pathologist who already holds it.

!!! note "Known limits"
    The claim window always offers **Claim & Continue** and **Pass**. The older **Claim Case** and **View Report** choices are not shown anywhere. The Slide Detail panel has no **Request Rescan** button on this screen even though the wording exists. In the claim window the explanation reads "You can claim this case and continue reporting, or pass it back to the pool for someone else to review", followed by **What Happens Next**; once you have asked for pool access it says "Access request sent" and that an administrator has been told.

**Taking a Cytology Review case fails.** "The case couldn't be taken. Try again." means the take did not complete for a reason not otherwise named (other messages name them: another pathologist already took it, the case no longer needs review, no permission). Try again, or choose another case.

When the claim window is opened from a report and the case carries no pool name, its heading reads "MFT Pool — Case Assignment".

### Error recovery

1. If a claim was refused with a message under the buttons, read it. It says what your role is not allowed to do. Close the window; nothing was changed.
2. If you selected the wrong tile, select it again to return to Active Cases, or use Alt+Shift+C.
3. If counts look out of date, press Alt+R to refresh the list.
4. If you passed a case by mistake, find it in the Pool Cases tile and claim it again if it is still there.
5. A wrong sort is removed with **Clear All** in the Sorted by ribbon.

## Tips and Best Practices

### Common mistakes

- Expecting a "my cases" filter. There is none; Active Cases already lists the cases assigned to you plus the pools.
- Forgetting that the tiles follow the LIS Cases or Orchestration Cases choice and the branch tab. A tile showing 0 may simply be on the other side.
- Opening a pool case just to look. Opening it starts the claim window; close the window to leave the case in the pool.
- Pressing Alt+A in the claim window when you meant the countersign filter. Close the window first.

### Efficiency recommendations

- Learn the keys for the tiles you use every day: Alt+F (Urgent), Alt+A (Awaiting Countersign) and Alt+Shift+P (Pool).
- Alt+Down Arrow and Alt+Enter let you move through a list of cases without the mouse.
- After you finish a case, PathScribe returns you to the Worklist with the next case in the list already selected.

### Workflow recommendations

- Start with Urgent and Queued for Release, then Awaiting Countersign and Needs Revision, then the pool.
- Check Cases on Hold regularly so that held cases are not forgotten.
- Laboratory managers can use the branch tabs and the Urgent tile's pool count to see whether urgent work is sitting unclaimed.

## Related Features

### Upstream workflow

- [Pathology Workspace](help:pathology-workspace): bench work that brings cases to the Worklist.
- [Grossing](help:grossing): cases reach Gross Complete here.

### Downstream workflow

- [Report](help:report): open a case from the list to write and sign it out.
- [Search](help:search): find any case that is not in your list.
- [Quality & Compliance](help:quality): deficiencies, audit trail and corrective action.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| A tile is missing | Its count is zero (Needs Revision, Peer Review, Follow-up due, Cytology Review), or it belongs to another branch tab. |
| The Urgent count is higher than the cases I can see | Urgent cases waiting in a pool are counted in the "+n in Pool" line and on the divider bars. |
| A case shows a lock | Pediatric, Orchestration or pool access is needed. Select the row and request access. |
| Claim & Continue is greyed out | Your role does not allow claiming pool cases. |
| "Another pathologist accepted this case first" | Someone else claimed it while you were looking. Choose another case. |
| The peer-review queue tiles are not there | Your role does not include them. |

### Resolution steps

1. Press Alt+R to refresh the list.
2. Select Active Cases (select the highlighted tile again) and the All Cases tab to remove filters.
3. Check that the LIS Cases or Orchestration Cases tile is the one you expect.
4. Ask your laboratory manager to confirm your role and pool membership.

### When to contact support

Contact your laboratory's PathScribe support when cases you know are assigned to you do not appear after checking the tabs and tiles, or when the claim window stays on "Checking availability..." Have the case number and the time of the problem ready.
