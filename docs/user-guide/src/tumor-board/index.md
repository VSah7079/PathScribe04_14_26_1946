---
module: Tumor Board
workflow: Multidisciplinary Review
role: [MDT Coordinator, Pathologist]
keywords: [tumor board, MDT, multidisciplinary, nominate case, board agenda, flag case]
routes: [/tumor-board]
previous: report
next: quality
related: [report, search]
status: Draft
---

# Tumor Board / MDT {#top}

## Overview

**Purpose.** The Tumor Board / MDT screen is the agenda for your multidisciplinary team meetings. It lists every case that has been flagged for a board, grouped by meeting, so that the team can see what is coming, who is presenting each case and which cases still need a presenter.

**Intended users.** MDT coordinators and administrative staff who schedule the meetings, and pathologists, fellows and residents who present cases. What you can change depends on your role.

**Where it fits.** A case is flagged for a board from the report screen (see [Report](help:report)). It then appears here. Before the meeting a presenter claims it, and after the meeting its status is set to Presented.

## Screen Tour

![The Tumor Board / MDT screen with its filters and meeting groups](capture:tumor-board-overview)

!!! note "Flagging happens on the report screen"
    You do not flag a case from this screen. Open the case, and on the report screen choose **Tumor Board** in the bottom action bar. This screen is for managing what has already been flagged.

!!! note "Demonstration data"
    In the demonstration version the agenda is held in the demonstration data set. Calendar invitations and messages described below are produced by the same demonstration set-up.

### Field definitions

The filter bar across the top has five drop-down lists.

| Field | What it means |
|---|---|
| Board | Limit the list to one board: Breast MDT, GI MDT, Gyn-Onc or Thoracic MDM. The default is **All boards**. |
| Case status | Limit the list to one status: Pending Presentation, Presented, Deferred, Cancelled or Dismissed. The default is **Pending Presentation**. Choose **All statuses** to see everything. |
| Presenter | Limit the list to one presenter. The list offers active pathologists, fellows and residents. |
| Meeting window | **All**, **Today**, **Next 7 days** or **Next 30 days**. The default is **All**. |
| Sort by | **Meeting date** (soonest first; cases with no date last) or **Recently updated**. |

Each meeting is a group with a heading such as "Breast MDT" followed by the date and time. Cases with no meeting date yet are grouped under **Unscheduled**. Each case is a row:

| Row item | What it means |
|---|---|
| Patient name and accession number | The case. If no name is available, the case identifier is shown. |
| Board badge | The board the case is listed for. |
| Source badge | **Manual** if a person flagged the case, or **Auto-flagged** if a rule listed it when the report was signed out. Point at the badge to see the reason. |
| Claimed by *name* | Shown when a presenter has been set. Point at it to see when. |
| Status drop-down | Pending Presentation, Presented, Deferred or Cancelled. |
| Claim this case | Shown only when the case has no presenter and you are allowed to present. |
| Presenter drop-down | The presenter. **No presenter assigned** when empty. |
| Meeting date and Meeting time | When the case will be discussed. The time stays greyed out until a date is set ("Set a meeting date first"). |

The **Presenter** filter starts at "All presenters"; choose a presenter to list only the cases they present.

### Toolbar

| Button | What it does |
|---|---|
| Print | Prints the agenda as a checklist. The filter bar and the row controls are left off the printout. |
| Dismiss | On a row. Removes a case from the agenda with a reason (see Exception handling). |
| Open case | On a row. Opens the case on its report screen. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Open | The meeting's case list can still have cases added or moved. |
| Locked | The meeting's case list is frozen because the meeting is close. Your laboratory sets how many hours before the meeting this happens. |
| *n* cases unassigned | How many cases in that meeting have no presenter yet. |
| Unscheduled | Cases flagged without a meeting date. |

### Hotkeys

None are specific to this screen. F1 (View Help) opens this page.

## Step-by-Step Procedures

### Standard workflow

1. Open **Tumor Board / MDT** from the Home Dashboard. The screen opens showing cases that are Pending Presentation, grouped by meeting.
2. Choose a **Board** or a **Meeting window** to narrow the list to the meeting you are preparing. The groups update.
3. To schedule an unscheduled case, set its **Meeting date** on the row, then its **Meeting time**. The case moves into the meeting's group. Your role must allow scheduling; if the control is greyed out, ask your manager.
4. To present a case yourself, select **Claim this case**. The row then shows "Claimed by" and your name.
5. To assign a colleague, choose their name in the **Presenter** drop-down on the row. If the date is in the future and the person has an email address on file, they receive an in-app message and a calendar invitation. Neither contains patient details, only the board name and the accession number.
6. Select **Print** if you want a paper checklist for the meeting.
7. After the meeting, change each row's status to **Presented** (or **Deferred** if it was not discussed). Your role must allow status changes.

### Alternative workflow

1. To flag a case yourself, open it from [Search](help:search) or the worklist, go to the report screen and select **Tumor Board** in the bottom action bar.
2. In the window **Flag for Tumor Board / MDT**, choose the **Board**. Optionally set **Meeting date** and **Meeting time**; leave them blank if the date is not known yet.
3. Select **Flag for MDT**. A message confirms the case was flagged, and the case appears here as Pending Presentation with no presenter.

### Exception handling

1. To remove a case that should not be discussed, select **Dismiss** on its row. A window titled **Dismiss Tumor Board flag** opens.
2. Type the **Reason** (required) and select **Dismiss flag**. The case's status becomes Dismissed. Dismissing needs a clinical permission that is narrower than scheduling; if the button is greyed out, ask your manager.
3. To stop a meeting going ahead for a case without dismissing it, set its status to **Cancelled** or **Deferred**.
4. If a meeting is **Locked**, you cannot move cases into it or change its board, date or time. You can still claim or assign a presenter, and change a status.

### Error recovery

1. If a case already has an active listing, a second flag is refused with "This case is already flagged for a Tumor Board." Find the existing row here instead.
2. If you see "This board's case list is locked for its upcoming meeting — choose a later date," choose a later meeting date.
3. If you see "That person isn't eligible to present at Tumor Board," pick a pathologist, fellow or resident. Pathology assistants cannot be presenters.
4. If a change on a row does not take, a red message at the top says why (the meeting is locked, that person cannot present, you may not change the listing, or it could not be saved) and the row returns to its earlier value. Fix the cause and try again.

## Tips and Best Practices

### Common mistakes

- Looking for a case that is not listed. The default status filter is Pending Presentation; switch to **All statuses** to find presented or cancelled cases.
- Setting a meeting time before the date. Set the date first.
- Dismissing when you mean to postpone. Use **Deferred** to keep the case on the agenda record.

### Efficiency recommendations

- Pick a **Board** and **Meeting window** once; the screen remembers your filter choices.
- Presenters can use **Claim this case** instead of asking a coordinator to assign them.

### Workflow recommendations

- Flag cases at sign-out with a meeting date where you can, so they land in the right meeting at once.
- Coordinators: check the "cases unassigned" count a few days before each meeting, and print the checklist after the list locks.

## Related Features

### Upstream workflow

- [Report](help:report): where a case is flagged for a board.
- [Search](help:search): find a case to open and flag.

### Downstream workflow

- [Quality & Compliance](help:quality): the next step in the review workflow.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| "No cases match these filters." | The filters are too narrow. Choose **All boards**, **All statuses** and **All** for the window. |
| The Claim this case button is missing | The case already has a presenter, or your role is not one that presents (pathologist, fellow or resident). |
| Row controls are greyed out | Your role does not allow that action, or the case is Dismissed. |
| The time field is greyed out | No meeting date is set on the row. |
| The Tumor Board button is missing on the report screen | Your role may not flag cases, or the case has not been assigned to a person yet. |

### Resolution steps

1. Clear the filters and look again.
2. Refresh the page.
3. Ask your laboratory manager to confirm that your role allows scheduling, status changes or dismissing.

### When to contact support

Contact your laboratory's PathScribe support when a flagged case does not appear here, or a change keeps reverting although your manager confirms your role allows it. Have the case number and the time of the problem ready.
