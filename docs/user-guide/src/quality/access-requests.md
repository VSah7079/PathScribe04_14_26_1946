---
module: Quality & Compliance
screen: Access Requests
slug: quality/access-requests
workflow: Quality Assurance
role: [Quality Staff, Laboratory Manager]
keywords: [access request, access requests, deny, revoke access, patient case access, turnaround, pending, granted, denied, pediatric, pool, orchestration]
routes: []
previous: quality/ai-discordance
next: quality/patient-matching
related: [quality, my-contribution, notifications]
status: Draft
---

# Access Requests {#top}

## Overview

**Purpose.** Access Requests shows how quickly requests for access to cases are answered, lists the requests still waiting, and lets an authorised person deny a request or take back access that was given to see a patient's other cases.

**Intended users.** Quality staff and laboratory managers who answer for response times, and administrators who decide requests.

**Where it fits.** Open **Quality Assurance**, stay on the **Operations** pillar and choose the **Access Requests** tile. Requests are raised elsewhere in PathScribe; this screen is where the answers are tracked. See [Quality & Compliance](help:quality).

## Screen Tour

![The Access Requests screen with the turnaround chart, tiles and the three tables](capture:quality-access-requests-overview)

The screen shows "Loading access request data…" while it opens.

### Field definitions

At the top is a monthly chart of the average turnaround in hours for the last six months. Hover a point to see the average and how many requests were resolved. A month with no answers says "No requests resolved this month". Four tiles follow.

| Tile | What it means |
|---|---|
| Avg Turnaround | Average hours from request to answer, for requests that have been answered. |
| Pending | Requests still waiting. Turns amber when above zero. |
| Granted | Requests that were approved. |
| Denied | Requests that were refused. |

Pending requests table:

| Column | What it means |
|---|---|
| Type | Pediatric, Pool, Orchestration, or Patient's other cases. |
| Requested By | Who asked. |
| Case | The case the request names, if any. Select the row to open it. |
| Requested At | When the request was made. |
| Waiting | Hours since the request. |
| Actions | **Deny** on every row; **Approve** as well on Patient's other cases requests. |

**Patient case access in force** lists access to a patient's other cases that you may take back. Its columns are Requested By, Resolved By (who allowed it, and when) and Actions. It says "No patient case access to revoke." when there is none.

The Resolved list has the columns Type, Requested By, Status (Granted or Denied), Turnaround and Resolved By. Until a request is answered in the chosen scope it says "No resolved requests in this scope yet."

### Toolbar

| Button | What it does |
|---|---|
| Scope switcher | Chooses the organisation or referring facility whose requests are listed. Its groups are By Organisation and By Referring Facility. Pool and Orchestration requests belong to no referring facility, so they appear only under the whole enterprise or an organisation. |
| Export | Saves the listed requests as a spreadsheet file. Your role must allow it. |
| Deny | Opens the window **Deny this access request?** |
| Revoke | In Patient case access in force. Opens the window **Revoke access**. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Granted (green) | The request was approved. |
| Denied (red) | The request was refused. |
| Amber Pending tile | At least one request is waiting. |

### Hotkeys

None.

## Step-by-Step Procedures

### Standard workflow

1. Open the **Access Requests** tile. Read the tiles to see how many requests wait.
2. In the Pending table, find the oldest by the Waiting column.
3. To refuse, select **Deny**. In the window **Deny this access request?** type a **Reason** and select **Deny**. The person asking gets a message with your reason.
4. For a Patient's other cases request, select **Approve** to allow it. The request moves to the Resolved list.

### Alternative workflow

1. To take back access already given, find the person under **Patient case access in force** and select **Revoke**.
2. In the window **Revoke access**, type the **Reason for revoking** and select **Revoke access**. The person can no longer open that patient's other cases and is told why.

### Exception handling

1. If **Deny** or **Approve** is greyed out, your role may not decide that kind of request.
2. Pediatric, Pool and Orchestration requests are granted where the access itself is managed; the request then closes by itself. Only Deny and, for Patient's other cases, Approve are offered here.

### Error recovery

1. "The request couldn’t be denied." means nothing changed. Try again.
2. "The access could not be revoked." means the access is still in force. Try again.

## Tips and Best Practices

### Common mistakes

- Denying without a useful reason. The reason is sent to the person.
- Reading the average turnaround while a request waits: the average counts only answered requests.

### Efficiency recommendations

- Sort your day by the Waiting column.

### Workflow recommendations

- Review Avg Turnaround each month and export the list for your records.

## Related Features

### Upstream workflow

- [AI Discordance](help:quality/ai-discordance): the previous report.

### Downstream workflow

- [Patient Match and Management](help:quality/patient-matching): the next screen in the Operations pillar.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| Nothing pending | Every request has been answered. |
| A request type is missing | It is outside the scope you chose. |
| Buttons are greyed out | Your role may not decide that request type. |

### Resolution steps

1. Set the scope to the whole enterprise.
2. Refresh the page.

### When to contact support

Contact your laboratory's PathScribe support when a request is stuck as Pending after it was answered. Have the requester's name and the time ready.
