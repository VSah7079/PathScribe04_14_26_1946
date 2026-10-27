---
module: Audit Log
workflow: Compliance and oversight
role: [Laboratory Manager, QA Reviewer, Laboratory Director]
keywords: [audit log, system logs, audit trail, error log, interface log, quality assurance log, export csv, quick links, support reference, consult links, critical alerts, compliance, inspection]
routes: [/audit]
previous: quality
next: migration-jobs
related: [quality, my-exports, external-consult, critical-alert, help]
status: Draft
---

# Audit Log {#top}

## Overview

**Purpose.** The Audit Log screen (the title on the screen is **System Logs**) is the laboratory's record of what happened: what people, the system and the AI did, which errors occurred, what the interfaces sent and received, the permanent quality assurance record, billing and charge failures, critical result notifications, outside consult links, and the background jobs of the PathScribe server. You read it, search it, and download parts of it as spreadsheets for an inspection or a review. This article is written for the person who reads the record. Setting up who may see it is in the Administrator Guide.

**Intended users.** Laboratory managers, quality staff and the laboratory director. By default the roles Admin, Lab Director and QA Reviewer can open the screen. A Pathologist cannot open it unless the laboratory has granted it. If the **System Logs** tile is missing from Home, or you see "You don't have access to this screen", ask your laboratory manager.

**Where it fits.** The screen shows only what has already happened. Nothing is set up here. Work that creates the entries happens on the other screens: sign-in, accessioning, grossing, reporting, quality work. You come here afterwards to answer "who did this and when", to clear errors and failed messages, and to prepare evidence for CAP or another inspector.

!!! note "Read-only, with a few actions"
    Almost everything on this screen is for reading. The actions are: **Resolve** on an error, **Review** on an interface exception, resending a failed interface message or print job, **Revoke** on a consult link, **Requeue** on a failed server job, and the **Export CSV** buttons.

## Screen Tour

![The System Logs screen with its tabs, type filters and the log table](capture:audit-log-overview)

At the top are the title, the line "Complete record of AI actions, user changes, system events, errors, and quality assurance activity", and the row of tabs. Below the tabs is a box for finding a support reference. The rest of the screen is the tab you chose, and a footer.

### Field definitions

**Tabs**

| Tab | What it records |
|---|---|
| Audit Log | Every audit entry you are allowed to see: AI actions, user actions and system actions. |
| Error Log | Errors, warnings and information messages raised by the system, each marked Open or Resolved. A number on the tab counts the open ones. |
| Interface Log | Messages between PathScribe and other systems. Five sub-tabs (see below). A number on the tab counts interface exceptions waiting for review. |
| Quality Assurance | The permanent, searchable record of quality work, in eight groups. A number on the tab counts open deficiencies. |
| Financial | Billing logs and failed charge messages. |
| Critical Alerts | Every automated critical result notification and what became of it. |
| Consult links | Every link given to an outside consultant, with its status. |
| Server jobs | The background jobs of the PathScribe server. This tab appears only for people who hold the permission to see it. |

**Audit Log tab**

| Field | What it means |
|---|---|
| All, AI, User, System | Filter buttons by type of entry, each with a count. AI is what the AI did, User is what a person did, System is what the system did by itself. |
| Patient Management Only | A tick box. Shows only patient merge, move, link, rebind and demographic update events. It combines with the other filters. |
| All Users | A list of users. It appears only in a Superadmin session (ForMedrixAI support). Everyone else finds a person by typing their name in the search box. |
| Date range | Today, Last 7 Days, Last 30 Days, Last 90 Days or Custom Range. Custom Range shows a from date and a to date; the to date includes the whole day. The screen opens on **Last 7 Days**. |
| Search | "Search event, detail, case ID". Matches the event name, the detail text, the user and the accession number, ignoring capital letters. |
| Timestamp | When the entry was written. |
| Type | AI, User or System. |
| Event | The name of the event, with a small "Support ref" chip you can click to copy the support reference. |
| Detail | A sentence describing what happened. It is written in English in every language, and contains no patient name, date of birth, MRN or clinical value. |
| User | The person or system actor. Automatic actions show a system actor. |
| Case | The accession number when the entry concerns a case. Click it to open the case report. |
| Footer count | "Showing N of M events": the entries your filters leave, out of all the entries you may see. |

**Error Log tab**

| Field | What it means |
|---|---|
| All, Error, Warning, Info | Filter by severity, each with a count. |
| All Status, Open Only, Resolved Only | Filter by whether the error has been dealt with. |
| Search | "Search message, code, source". |
| Columns | Timestamp, Severity, Code, Message, Source, Case, Status. |
| Status | Open, or Resolved. Hover over Resolved to see "Resolved by (name), (time)". |

**Interface Log tab, sub-tabs**

| Sub-tab | What it shows |
|---|---|
| Interface Exceptions | Inbound messages PathScribe could not safely match to a patient or case. Filter by All, Pending, Resolved or Dismissed; search by event type or reason. Columns: Timestamp, Event Type, Reason, Source Patient, Target Patient, Status. |
| Outbound Interface DLQ | Outbound messages that failed or are waiting, in eight queues (patient updates, results, accession events and others). Choose the queue; each failed row shows its error and retries, with **Retry Dispatch** and **Capture as CAPA**. |
| Outbound Dispatches | A history of the order-creation messages PathScribe sent, with the outcome: Delivered, Failed or Outcome unknown. Click a row to see the exact message that was sent and **Copy Payload**. |
| Print Queue | Queued, held, failed and completed print jobs, with Hold, Release, Cancel, Retry and Redirect, singly or in bulk, and **Run Batch Now** for grouping jobs. A line above the list reads "Site agents — online: n, need attention: n, offline: n." with an **Open site agents** link to the place where an administrator manages them. It appears only when a site agent has been set up for a site you may see. |
| Engines | The health of each hospital's interface engine: status, last check-in, free disk, certificate expiry, and each channel with what is waiting. Shown only to people who hold the permission to see engine status. |

**Quality Assurance tab**

| Field | What it means |
|---|---|
| Group | Which record to read: Deficiencies, Intraoperative Linkage, Discordance & Reconciliation, Countersign Turnaround, Credentialing Review, Post-Finalization Drift, Patient Match Review, or Management Reviews. |
| Status | Each group has its own statuses. For example Deficiencies: Open, Pending Verification, Closed. Discordance & Reconciliation: Concordant, Discordant. Countersign Turnaround: Pending, Countersigned. Credentialing Review: Active, Completed. Post-Finalization Drift: Detected, Auto-Corrected, Deferred, Failed. Patient Match Review has only Needs Review, and Management Reviews only Completed. |
| Date range | Includes **All Time**, which is the starting choice here (unlike the Audit Log tab). |
| Search | "Search case, detail, user". |
| Columns | Date, Case, Specimen, Detail, Status, User. |
| Footer count | "Showing N of M (group) records". |

**Financial tab**

| Sub-tab | What it shows |
|---|---|
| Billing Logs | A search of billing events, with filters for case number, patient, dates, billing type, facility, pathologist and staff, and **Save Query**. |
| Outbound DLQ | Charges that could not be sent, for example a missing ICD-10 code or provider NPI. You can enter the missing value on the row, retry, and capture the failure as a CAPA. |

**Critical Alerts tab**

| Column | What it means |
|---|---|
| Case, Finding, Severity | The case and the critical finding that triggered the notification. |
| Physician | Who was notified. |
| Channels | Secure Email, SMS and EHR Inbox Push, each with what happened. A **Simulated** tag means nothing was really delivered. |
| Dispatched | When it was sent. |
| Reference Link | Active or Expired, and how many times the link was viewed. "No reference link (EHR push only)" if none was issued. |
| Acknowledged | When the recipient acknowledged it, or "Not yet acknowledged". |
| Filter by case | A box above the table. |

**Consult links tab**

| Column | What it means |
|---|---|
| Issued, Case, Consultant, Scope | When, which case, who it was given to (with their organization) and whether it covers the Full case or some slides. |
| Issued by, Expires | Who issued it and when it stops working. |
| Status | Active, Expired or Revoked (with who revoked it and when). |
| Views | How often it was opened and when last, or "Not viewed". After a Signed opinion a line under Status shows how many views and hours are left (the link allows 3 views or 48 hours after the signature), or why it closed. |
| Preview identity | For a person who may show full identity but may not issue links. Shows the patient's name and date of birth (as 24-OCT-1980) on screen for review. It is recorded in the audit log; nothing is sent to the consultant. |
| Active only | A tick box, on at first. Untick it to see expired and revoked links too. |

**More about the Interface Log and Financial sub-tabs**

*Print Queue.* The sub-tab is headed **Print Queue Dashboard**. Its columns include Case, Report type, **Delivery mode**, Status, **Paper / Duplex** (the paper tray and one- or two-sided printing the job asked for), Destination, Queued at, Batch and Actions. "No print jobs match this filter." means the status filter leaves none. Tick jobs to act on several together: the bar reads "n job(s) selected" and offers the same Hold, Release, Cancel, Retry and Redirect actions; **Redirect & Retry** sends the chosen jobs to another printer and tries again (jobs you may not redirect, or whose printer is not at their laboratory, are reported as not redirected). For **Run Batch Now**, set a **Window start** and **Window end** (times are read as UTC); queued jobs signed out inside that window that were not sent through an interface are grouped into shared batches by client account or delivery route.

*Outbound Dispatches.* Opening a row shows **Outbound Payload**, with **Copy Payload**; "Copied to clipboard." confirms. The category column reads "Category E: Order Creation" in the detail.

*Billing Logs.* Boxes carry the hints "Accession or case ID" (Case Number), "MRN or MPI" (Patient ID) and "Search within event detail" (Detail). To keep a search, type a name in "Name this query…" and select **Save**; saved queries appear as buttons. A line summarises the search; with no filter it reads "All billing events".

*Outbound DLQ (Financial).* The sub-tab is headed **Outbound Charge DLQ**. "No failed charge dispatches." means nothing is waiting for you. A second list, "Queued (for testing — Simulate Failure)", holds charges waiting to be sent, with **Simulate Rejected** and **Simulate Timeout** buttons that create an artificial failure so you can practise the repair steps; "No queued charges." appears when it is empty.

### Map Patient and Review Interface Exception windows

**Map Patient — Restricted.** Opened by the Map Patient button. It attaches a case created under a temporary downtime placeholder identity to the confirmed patient. It is rare, restricted and fully audited, and the placeholder record is retired, not kept.

| Field | What it means |
|---|---|
| Downtime / placeholder identity to resolve | The placeholder to retire. While the list loads it says "Loading downtime records…". The list starts with "Select a downtime record…", or says "No downtime records awaiting a rebind" when there are none. |
| Confirmed target patient (search by name or MRN) | Appears once a placeholder is chosen. Type a name or MRN (the box suggests e.g. Smith or MRN-987654), then select one result. "No matching patients found." means nobody matched. |
| Reason code | Why the mapping is needed. It is filled in from the placeholder when known. |
| Justification | A written reason of at least the stated number of characters. The window counts the characters still needed. |

Select **Review & Confirm** (greyed out until every field is complete). The window then warns that the placeholder will be retired and its cases repointed, and that this cannot be undone from the window. Select **Confirm Map Patient** to go ahead, or **Back** to change something. A green message lists the cases moved; a failure message explains why nothing moved.

**Review Interface Exception.** Opened by Review on a pending row. While it opens it says "Loading patient and case details…". Depending on the message type it offers: choose a patient record from a list that begins with **Choose a patient** (after typing a name or number and selecting Search), pick which of the source patient's cases move to the target, or, for an order code PathScribe did not recognise, search the specimen dictionary (the box reads "Select a specimen type…" and says "No specimen types match" when the search finds nothing) and select **Map & Link**. **Dismiss — No Action Needed** closes the exception without changes. Other identity message types cannot yet be resolved by hand in this window; dismiss them once the identity is corrected at the source.

### Toolbar

| Button | What it does |
|---|---|
| ↓ Export CSV | Downloads the rows the current filters leave as a spreadsheet file. There is one on the Audit Log, Error Log, Interface Exceptions and Quality Assurance tabs. It is greyed out, with a tooltip, unless you have the export permission for that log. |
| Find (support reference box) | Type a reference like SR-7K2Q-9MXD and select **Find**. The screen says what it names (an audit entry, an error entry, a case or an interface exception) and offers **Open case**. |
| Resolve | On an open error row. Marks it resolved and records who and when. Needs its own permission. |
| Review | On a pending interface exception. Opens a window to match it by hand or dismiss it. |
| 🔗 Map Patient | On the Interface Exceptions sub-tab. A restricted tool for rebinding a patient. Shown only with the special permission and a known organisation. |
| Retry Dispatch, Dispatch Now, Capture as CAPA | On the outbound sub-tabs. Resend a failed message; raise a deficiency from a failure. Resending needs a permission. |
| Revoke | On an active consult link. Closes it at once. |
| Quick Links | Opens the Quick Links window (Protocols, References, Systems). There is no button for it on this screen; press Alt+Q. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Red number on a tab | Open errors, interface exceptions waiting, or open deficiencies. |
| Green badge (Resolved, Closed, Merged, Concordant, Countersigned, Completed, Auto-Corrected, Active) | The item is finished or healthy. |
| Red badge (Open, Discordant, Failed) | The item needs action. |
| Amber badge (Pending, Pending Verification, Detected, Deferred, Needs Review) | The item is waiting. |
| Simulated | The channel or engine is a stand-in; nothing real was sent. |
| Role notice (yellow line under the title) | "Showing your case activity only". Shown to pathologists, who see only entries about cases plus their own. |

**No status footer.** The Audit Log shows no "systems operational" line and no compliance claim: neither was a real check, so both were removed (Batch 669). Use Engines and Server jobs for health.

**Counts and empty lists.** Below each log a line reads "Showing … of … events" (Audit tab), "Showing … of … errors" (Errors tab) or "Showing … of … (group) records" (Quality tab): the entries your filters leave out of all those you may see. When the filters leave nothing the list says "No logs match your filters" (Audit tab), "No errors match your filters" (Errors tab) or "No … records match your filters" naming the group (Quality tab). Widen the date range or clear a filter.

**Interfaces tab status line.** If you hold the permission, a line "Interface engines: …" summarises how many engines are online, degraded, offline or need attention. **View engines** opens the Engines sub-tab; the line is hidden while you are already there.

### Hotkeys

| Key | Action |
|---|---|
| Alt+U | Open System Logs (from other screens). |
| Alt+Q | Open Quick Links. |
| F1 | Open the User Guide page for this screen in a new tab. |

!!! note "Quick Links"
    The Quick Links window lists the Protocols, References and Systems links your laboratory has set up. A link that does not start with https is shown as text with an "Insecure link" tag and is not opened; ask your administrator to correct it. Select **Close** to leave the window.

## Step-by-Step Procedures

### Standard workflow

**Find what happened to a case**

1. Open System Logs from Home, or press Alt+U. The Audit Log tab opens on the last 7 days.
2. Choose **Custom Range** or a longer range if the event may be older. Entries outside the range are hidden, not missing.
3. Type the accession number in the search box. The table narrows to that case.
4. Read Timestamp, Event, Detail and User. The footer shows how many entries match.
5. Select the accession number in the Case column to open the case report.

**Find a change to a setting or a permission**

1. On the Audit Log tab, set the date range.
2. Search the English name of the event, for example `Role capabilities changed`, `Staff access changed`, `Sign-in locked` or `Capability refused`. The search matches the event and the detail text.
3. Read the User column for who and the Timestamp column for when. Use the **User** filter button to leave out system actions.

**Export a record for an inspection**

1. Open the tab you need and set the filters first. The file holds only the rows the filters leave.
2. Select **↓ Export CSV**. The file downloads at once, named like `pathscribe-audit-log-` followed by the date.
3. Open the file. The first lines say what the report is, who requested it, which filters were used and how many rows it holds. The columns follow.
4. Keep the file with your review notes. The export itself is recorded in the Audit Log.

**Read the permanent quality record**

1. Open the **Quality Assurance** tab.
2. Choose a **Group**, then a **Status**.
3. Leave the date range at **All Time**, or narrow it.
4. Search by case, detail or user. Select the accession number to open the case.

### Alternative workflow

1. A link to this screen can carry a search text (for example a case's accession number). The screen then opens already filtered, with the date range set to all dates so older events are not hidden.
2. A message about pending interface exceptions can open the Interface Log tab directly. Addresses ending in `?tab=` followed by `errors`, `interfaces`, `quality`, `financial`, `criticalAlerts`, `consultLinks` or `serverJobs` open that tab.
3. Support may quote a reference (SR-XXXX-XXXX) instead of a case number. Type it in **Find a support reference**.

### Exception handling

1. **An error is open and cannot be fixed by you.** Leave it Open and note its Code and Source for support. Use Resolve only when the cause has been dealt with.
2. **An inbound message could not be matched to a patient.** Open the Interface Log tab, **Interface Exceptions**, select **Review** on the pending row, and match it by hand or dismiss it. Nothing is guessed.
3. **An outbound message failed.** On **Outbound Interface DLQ**, check the **Engines** sub-tab first. When the engine is healthy, select **Retry Dispatch**. A message held on the Outbound Queue screen must be released there first.
4. **A charge failed for a missing code.** On Financial, **Outbound DLQ**, type the missing ICD-10 code or provider NPI on the row and resend.
5. **A consult link should stop working now.** On Consult links, select **Revoke** on the row.

!!! note "Known limits"
    Charges are not sent to an outside billing system yet. The Outbound Charge DLQ therefore only shows real problems found in the case itself (a missing ICD-10 code or provider NPI); a rejected or timed-out send appears only when someone uses **Simulate Rejected** or **Simulate Timeout**. Network printing needs the PathScribe site agent: a job that cannot be sent from a browser fails with that explanation. A job that shows Printed with the note "Simulated: sent to printer" was not sent to a real printer.

### Error recovery

1. If the support reference box says "That is not a support reference. They look like SR-7K2Q-9MXD.", retype it.
2. If it says "No record has that support reference.", check the characters with the person who gave it to you.
3. If it says "That entry is not in the range loaded here. Widen the date range to see it.", change the date range on the Audit Log tab and try again.
4. If an export button is greyed out, you lack the permission for that log. Ask your laboratory manager.
5. If Resolve was pressed by mistake, it cannot be undone from this screen. Tell your laboratory manager, who can follow up with the error's Code and time.

!!! warning "Exports leave the application's protection"
    A downloaded file is no longer protected by sign-in or roles. The files contain case numbers and staff names. Store them where your laboratory keeps inspection records, and do not send them outside the laboratory without approval.

## Tips and Best Practices

### Common mistakes

- Reading only the last 7 days and concluding that nothing happened. The Audit Log tab opens on 7 days; widen the range.
- Searching with the wording of a screen instead of the event name. Detail text and event names are in English in every language; search in English.
- Exporting before setting filters. The file holds the filtered rows, so an unfiltered export can be very large.
- Expecting the Quality Assurance tab to be a work queue. It is the permanent record. The Quality Assurance screen is where deficiencies are worked.
- Pressing **Resolve** to make the red number go away. Resolving records that the cause was dealt with.

### Efficiency recommendations

- Use the filter buttons (User, System, AI) before searching to remove noise.
- Click the Support ref chip beside an entry to copy its reference and send it to support instead of a case number.
- Use the Quality Assurance Group list to move between records without leaving the tab.
- Check the number badges on the tabs first; they tell you where the work is.

### Workflow recommendations

- Review open errors and pending interface exceptions at the start of each day.
- For a periodic review, set the Audit Log range to the period, note the footer count, search `Role capabilities changed`, `Staff access changed`, `Capability refused`, `Sign-in locked` and `DOCUMENT_EXPORTED`, then read the Error Log (Open Only) and export the record.
- Keep exports with your review notes rather than re-running them later; the log may have grown.

!!! note "What the log cannot prove today"
    The main audit log is append-only: the application never edits or deletes an entry. It is not yet protected by a chain of checks or signatures, and nothing on this screen verifies that an entry is unaltered. Only the Support Access record kept for ForMedrixAI support visits has that protection. If your inspector requires it for the main log, say so to ForMedrixAI. The keeping period set under Data Retention is a recorded policy; nothing is deleted by it yet.

## Related Features

### Upstream workflow

- [Quality](help:quality): where deficiencies and other quality work are done; their permanent record appears on the Quality Assurance tab.
- [External Consult](help:external-consult): the links listed on the Consult links tab.
- [Critical Alert](help:critical-alert): the reference page the recipient of an alert opens; its views and acknowledgement appear on the Critical Alerts tab.

### Downstream workflow

- [My exports](help:my-exports): where an export prepared by the server is collected, when your installation uses one.
- [Help](help:help): how to use this guide.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| No System Logs tile on Home | Your role does not include the screen. |
| "You don't have access to this screen" | You typed the address, but your role lacks access. |
| The table is empty | The date range or a filter hides the entries, or the search text matches nothing. |
| I cannot see a colleague's activity that has no case | If you are a pathologist you see all case events and your own other entries only. |
| The Server jobs or Engines tab is missing | You do not hold the permission to see it. |
| Consult links says "You don't have permission to see consult links" | The permission to see them has not been granted to your role. |
| Export CSV is greyed out | You lack the export permission for that log. |
| Timestamps look hours off | Entries are stored in UTC; the Date range cut-offs use the facility's time zone. |
| Critical Alerts channels say Simulated | No real SMS, secure email or EHR connection is in place; the text shows what would have been sent. |

### Resolution steps

1. Clear the filters and widen the date range.
2. Check the tab and, on Interface Log, the sub-tab.
3. Search in English, using the event name or the accession number.
4. Refresh the page if a number on a tab looks out of date.
5. Ask your laboratory manager to check your role.

### When to contact support

Contact your laboratory's PathScribe support when an entry you expect is missing from the log, an export fails, or a failed message will not resend after the engine is healthy. Have the case number, the support reference and the time of the problem ready.
