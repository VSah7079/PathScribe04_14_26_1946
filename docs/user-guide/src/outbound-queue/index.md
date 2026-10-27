---
module: Outbound Queue
workflow: Quality and compliance oversight
role: [Administrator, Interface Analyst, Laboratory Manager]
keywords: [outbound queue, outbound messages, hold, release, retry, resend, dead letter, failed, rejected, not reportable, retract charge, release now, delivery schedule, reporting deadline, billing, registry, interface]
routes: [/outbound-queue]
previous: autopsy
next: registry-exceptions
related: [registry-exceptions, audit-log, report]
status: Draft
---

# Outbound Queue {#top}

## Overview

**Purpose.** The Outbound Queue is the one list of everything PathScribe sends out of the building: results, patient movement (ADT) messages, accession messages, LIS sync messages, billing charges, report delivery, cytology results, referrals, molecular orders and registry submissions. For each message you can see where it is going, whether it is waiting, held, sent, acknowledged, failed or rejected, when it is due to go, and how close it is to its reporting deadline. You can stop a message, let it go again, retry a failed one, and fix or close a message that a registry refused.

**Intended users.** People who look after the connections to other systems: administrators, interface analysts, and laboratory managers who watch billing and registry reporting. It is not a screen for pathologists or bench staff, and by default only administrators can open it. Each action needs its own permission (see "Who may do what").

**Where it fits.** A message joins the queue when something happens elsewhere, for example a case is signed out or a charge is made. PathScribe decides what is sent and when (the delivery schedule); the interface engine decides how it is carried and reports back whether the receiver accepted it. This screen shows both. Open it from Home, then **Quality & Compliance**, then **Outbound Queue**. Registry submissions that need a person are also listed, with more detail, in [Registry Exceptions](help:registry-exceptions).

!!! note "Demonstration build"
    In the demonstration build the queue is built from the demonstration queues held in the browser, and nothing is really delivered to an outside receiver. Statuses change when you act here, not because a real receiver answered. The screen works the same way with a live installation, where the interface engine's acknowledgements update the status.

## Screen Tour

![The Outbound Queue with count tiles, feed filters, action buttons and the message table](capture:outbound-queue-overview)

From the top: the title and description, a row of count tiles, a row of feed filter buttons, a row of search, facility and sort controls, the action buttons, an optional reason panel, a result line, and the message table.

### Field definitions

**Count tiles.** Every tile is a count and a filter. Selecting a tile limits the table to that group; select it again to remove the filter. Several tiles can be on together.

| Tile | What it counts |
|---|---|
| Overdue | Open messages past their reporting deadline. |
| Due soon | Open messages whose reporting deadline is within 3 days. |
| Needs review | Billing charges parked for a person (an unmapped CPT code, no technical-component facility, or a delta charge from an amended case), plus registry reports the state profile parked for a person. Selecting it shows only those. |
| Amendment deltas | Billing delta charges from amended cases. This tile is a count only; it does not filter. |
| Waiting, Held, Sent, Acknowledged, Failed, Rejected, Not reportable, Retracted | Messages in that state (see "Icons and status indicators"). |

The state tiles ignore the state filter itself, so each shows how many messages are in that state under your other filters. Opening the screen with no filters shows everything.

**Filters and sort**

| Control | What it does |
|---|---|
| Feed buttons (Results, Patient ADT, Accession, LIS sync, Billing, Report delivery, Cytology results, Referrals, Molecular orders, Registry) | Limit the list to one or more feeds. |
| Accession number box | Finds messages whose accession number contains what you type, ignoring capitals. |
| Facility | **All facilities** or one facility. The list shows the facility codes that appear in the queue. A message with no known facility disappears when you choose one. |
| Sort by | **State** (the default: rejected first, then failed, held, waiting, sent, acknowledged, closed), **Reporting deadline**, **Scheduled time**, **Queued time**, **Feed** or **Attempts**. |
| Arrow button | Reverses the sort direction. |

**Table columns**

| Column | What it means |
|---|---|
| Tick box | Selects the message. The tick box in the heading selects all those listed. |
| Accession | The case the message concerns, or a dash. |
| Feed | The feed and, in small type, the kind of message (for example "finalReport"). |
| Destination | Interface engine, Billing system, LIS partner, Delivery service or Registry, with the transport (for example SFTP) under it when known. |
| State | The status badge. |
| Scheduled | When it is due to go: the delivery schedule's time when one applies, otherwise the time it was queued. |
| Attempts | How many retries so far. |
| Detail | Why it is in this state: the error (Missing ICD-10 code, Missing provider NPI, Timed out, Receiver unreachable, Rejected by the receiver), the registry's error codes, the correction due date, who held it and why, why it was closed, "Amends an earlier message", the billing type (TC, 26 or Global), "Needs review" reasons, the scheduled release time of a charge, and "Released ahead of schedule (user …)". |
| Deadline | **Overdue** or **Due soon** when it applies, with the due date and time. |

A row with a deadline that is overdue or near is tinted. Deadlines count from the time the report was signed out, using the number of days in the delivery schedule for that feed. A message that is already sent, acknowledged or closed carries no flag.

### Toolbar

The action buttons act on the ticked messages. A button is greyed out if none of the ticked messages can take that action in their current state, or if your role lacks the permission (hold the pointer over it to see which permission). The line "Selected: N" shows your selection.

| Button | What it does |
|---|---|
| Hold | Stops waiting or failed messages from going. Opens a panel asking for a reason. |
| Release | Lets held messages go again. |
| Retry | Sends a failed message through its own queue again. For a message a registry rejected, it opens a panel asking why it was fixed, then resubmits it. |
| Release now | Billing charges only. Forces a waiting or held charge out immediately, ahead of its schedule. The user is recorded. |
| Retract charge | Billing charges only. Cancels a waiting, held or failed charge before release. Opens a panel asking why. Final. |
| Mark not reportable | Closes a rejected registry message with a reason. Nothing more is sent for it. |

**Reason panel.** Appears below the buttons with a short list of reasons, the first already chosen, and **Confirm** and **Cancel**. Hold and Mark not reportable also offer an optional **Note** (up to 200 characters; the box says "No patient details"). Reasons:

- Hold: Receiver downtime, Receiver maintenance, Checking the data, Billing review, Possible duplicate, Other.
- Resubmit after the fix: Data corrected, Coding corrected, Pathologist corrected, Other.
- Mark not reportable: Not a reportable condition, Outside the registry's jurisdiction, Already reported, Other.
- Retract: Case amended, Case retracted, Duplicate charge, Other.

**Result line.** After an action a line reads "Changed: N." and, where relevant, "Not applicable to the state: N." and a refusal for each reason (for example "You don't have permission for this action (2).", "Cannot be held", "Cannot be retried", "A reason is required").

### Icons and status indicators

| State | Meaning | What you can do |
|---|---|---|
| Waiting | Queued; goes at its scheduled time. | Hold; Retract and Release now (billing). |
| Held | A person stopped it. Nothing sends it until it is released. | Release; Retract and Release now (billing). |
| Sent | The engine has it; no confirmation yet. | Nothing. |
| Acknowledged | The receiver confirmed it. | Nothing. |
| Failed | A send failed and can be retried. There is no separate "dead-lettered" state: a message that has used up its automatic retries stays Failed until a person retries it. | Hold; Retry; Retract (billing). |
| Rejected | The receiving registry returned it with errors. | Retry (after fixing the data, with a reason); Mark not reportable. |
| Not reportable | A person closed it. | Nothing. |
| Retracted | A charge cancelled before release. | Nothing. |

Other indicators: **Overdue** and **Due soon** deadline flags; "The registry will not accept a resubmission as it is." (a fatal rejection); "Correction due …" (the date the registry expects the corrected message); "Needs review before it can go" with the reason, for example "Preliminary reports are not sent to this state"; "Scheduled release …" under a waiting charge.

### Hotkeys

None of its own. Every control is a normal button, box or tick box, so Tab, Space and Enter work. **Escape** closes an open reason panel.

### Who may do what

| To do this | You need |
|---|---|
| Open the screen | The permission to open the Outbound Queue. By default: Administrator. |
| Hold | Hold outbound messages. |
| Release | Release held outbound messages. |
| Retry / Resubmit | Resend interface messages. |
| Release now | Release charges ahead of schedule. |
| Retract charge | Retract queued charges. |
| Mark not reportable | Mark rejected messages not reportable. |

Administrators hold all of these by default. A laboratory can give any of them to another role. The check is made once for the whole selection; every message that changes writes one entry to the audit log with the feed and the reason, never patient text or your note.

## Step-by-Step Procedures

### Standard workflow

**Find what needs attention**

1. Open **Quality & Compliance**, then **Outbound Queue**. The table opens sorted by state, so rejected and failed messages are at the top.
2. Read the tiles. Select **Overdue** to see messages past their reporting deadline, or **Rejected** or **Failed** to see what needs a person.
3. Narrow with the feed buttons, the facility box or an accession number. The tile counts follow your filters.

**Retry a failed message**

1. Tick the failed rows. "Selected: N" updates and **Retry** becomes available.
2. Read the Detail column first. "Receiver unreachable" or "Timed out" often clears by itself; "Missing ICD-10 code" or "Missing provider NPI" needs the case corrected before a retry can succeed.
3. Select **Retry**. The result line says "Changed: N." and the row's Attempts goes up.

**Hold and release**

1. Tick waiting or failed rows, select **Hold**, choose a reason (add a short note if useful) and select **Confirm**. The rows show **Held**, and "Held: <reason>" in Detail.
2. When the reason has passed, tick the held rows and select **Release**. They go back to waiting.

**Fix and resubmit a registry rejection**

1. Select the **Rejected** tile. The Detail column shows the registry's error codes and, if there is one, the correction due date.
2. Correct the case data (see [Registry Exceptions](help:registry-exceptions) for Open case and Patient details).
3. Tick the row and select **Retry**. A panel asks why it was fixed. Choose a reason and select **Confirm**.
4. If the registry will not take it, close it instead: tick the row, select **Mark not reportable**, choose the reason and **Confirm**.

### Alternative workflow

1. To work a whole batch, tick the box in the table heading to select everything listed, after filtering to one feed and one state. Actions apply to the rows that can take them and skip the others, and the result line says how many were skipped.
2. To find a single case, type its accession number in the search box. Only the accession number is searched.

### Exception handling

1. **Billing charge parked for review.** Select **Needs review**. The Detail column says why. Fix the code mapping, facility or amendment with the billing team; the charge is not sent while it waits.
2. **A case was amended after its charge was queued.** The charge may need **Retract charge** (reason: Case amended) and the delta charge appears as an amendment delta. Retraction is final.
3. **A charge must go now.** Select **Release now** on a waiting or held charge. It leaves ahead of its schedule and Detail records your user id.
4. **US pathology registry report parked by the state profile.** It shows "Needs review before it can go" with a reason, such as a missing ICD-O-3 code or a specimen with no identifier. Correct the case; the message cannot be pushed through from here.

### Error recovery

1. "You don't have permission for this action": your role lacks the permission. Ask your administrator.
2. "Cannot be held / retried / released": the message is not in a state that allows it. Check the State column; someone else may have changed it, so re-open the screen.
3. "No longer in the queue": another person or the engine changed it. Re-open the screen.
4. "A reason is required": choose a reason in the panel and confirm.
5. "Not sent, see the detail column": the retry was tried and failed again. Read the Detail column.
6. If you held the wrong message, tick it and select **Release**. If you marked the wrong message not reportable or retracted the wrong charge, there is no undo on this screen; tell your administrator at once.

!!! warning "Retract and Mark not reportable are final"
    A retracted charge and a message marked not reportable cannot be reopened on this screen. A registry submission closed in error may miss a reporting deadline. Check the case and the reason before you select Confirm.

!!! warning "Holding a message delays what the receiver sees"
    A held result or registry message is not sent. Do not hold a message for a patient whose result is urgent, and release held messages as soon as the reason ends. Watch the Due soon and Overdue tiles.

## Tips and Best Practices

### Common mistakes

- Retrying a rejected registry message without correcting the data. The registry will refuse it again; the Detail column's error codes say what to fix.
- Treating Sent as delivered. Only **Acknowledged** means the receiver confirmed.
- Putting patient details in the hold note. The note is for the reason only.
- Expecting the facility box to show facility names. It lists the facility codes found in the queue.

### Efficiency recommendations

- Leave the sort on State so problems are on top.
- Use the feed buttons plus a state tile to work one kind of problem at a time, then tick all and act once.
- Use the sort **Reporting deadline** before a registry or billing cut-off.

### Workflow recommendations

- Start each shift with Rejected, Failed, Overdue and Needs review.
- Agree who owns each feed: billing charges with the billing team, registry rejections with the person who corrects the case.
- Always record a clear reason; the audit log keeps the reason code, and it is what an inspector sees.

## Related Features

### Upstream workflow

- [report](help:report): signing out a case is what creates most results, delivery and registry messages, and starts the reporting deadline clock.
- [Autopsy Dashboards](help:autopsy): another oversight screen in Quality & Compliance.

### Downstream workflow

- [Registry Exceptions](help:registry-exceptions): the worklist for registry submissions that need a person, with the registry's findings and the resend.
- [Audit Log](help:audit-log): holds the entry for every hold, release, retry, retraction and closure.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| The Outbound Queue tile is missing | Your role cannot open the screen. By default only administrators can. |
| Buttons are greyed out | None of the ticked rows can take that action in their current state, nothing is ticked, or your role lacks the permission. |
| Release now and Retract charge never light up | They apply to billing charges only. |
| The table says "Nothing in the queue matches these filters." | A filter is on; select the tile or button again to remove it. |
| A row disappeared after I chose a facility | A message with no known facility is hidden when a facility is chosen. |
| Rejected row will not resubmit | The registry may refuse the same content; correct the data first and try again. |

### Resolution steps

1. Clear every tile, feed button and the search box.
2. Open the screen again to reload the queue.
3. Check the State column of the row against the table in "Icons and status indicators".
4. Read the Detail column and correct the case if it names a missing code or number.
5. Ask your administrator to check your permissions.

### When to contact support

Contact your laboratory's PathScribe support when many messages stay Failed after a retry, when the receiver says it never got an acknowledged message, or when a message shows a state that does not match what you did. Have the feed, the accession number and the time ready, but do not send the patient's name.
