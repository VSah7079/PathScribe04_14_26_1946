---
module: Registry Exceptions
workflow: Quality and compliance oversight
role: [Laboratory Manager, Lab Director, QA Reviewer, Administrator]
keywords: [registry exceptions, cancer registry, screening registry, cervical screening, rejected, held, attestation required, not delivered, no answer, conflicting answers, revised after acceptance, resend, re-validate, CAPA, transmission audit, go-live]
routes: [/registry-exceptions]
previous: outbound-queue
next: audit-log
related: [outbound-queue, report, cytology, quality]
status: Draft
---

# Registry Exceptions {#top}

## Overview

**Purpose.** Registry Exceptions lists every cancer registry or screening programme submission that needs a person. A submission lands here when it was held and never sent, could not be delivered, was rejected by the registry, has had no answer for 72 hours, was answered twice with different results, or was changed by the registry after it had accepted it. For each one you see what went wrong in the registry's own words, can open the case, correct the patient's identifiers, and then re-validate and resend.

**Intended users.** Laboratory managers, laboratory directors, quality reviewers and administrators who are responsible for registry reporting. Everyone who can open the screen can read and open cases; resending and marking a revision reviewed need their own permissions (see "Who may do what").

**Where it fits.** Cancer and screening results are sent to registries automatically after sign-out. Most go without anyone touching them. This screen shows only the ones that did not. A live count appears as a badge on the warning triangle in the top bar for anyone who can open the screen. The same messages also appear, with less detail, in the [Outbound Queue](help:outbound-queue). A screen to the side of the sign-out workflow, it lets you correct the data and send again without redoing the case.

!!! note "Only your own organisation's cases"
    The list shows only the cases of the organisation you are signed in to. The count in the top bar follows the same rule.

!!! note "Demonstration build"
    In the demonstration build submissions are held in the browser and nothing reaches a real registry. Acknowledgements and rejections you see come from demonstration data or from the test sender, and resending produces a new demonstration entry.

## Screen Tour

![Registry Exceptions with the filter tabs, the table of submissions and an expanded row showing findings and the acknowledgement](capture:registry-exceptions-overview)

At the top are the title, a description, and three header controls: a **Transmission audit for** choice, **Download transmission audit** and **Refresh**. Below are the filter tabs, then the table.

### Field definitions

**Filter tabs.** Each tab carries a count. **All** shows everything; the others show one kind of exception.

| Tab (and the status shown in the row) | What it means |
|---|---|
| Rejected outright (*Rejected outright*) | The registry refused it and a resubmission as it stands will not be accepted. |
| Rejected, fixable (*Rejected, fixable*) | The registry refused it because of data you can correct. |
| Conflicting answers (*Conflicting answers*) | The registry accepted it, then a different answer came back. |
| Revised after acceptance (*Revised after acceptance*) | The registry changed data it had already accepted. A deficiency is raised in Quality Assurance automatically. It stays on the list until someone marks it reviewed. |
| Not delivered (*Not delivered*) | The interface engine could not be reached and retries have stopped. |
| No answer (*No answer in 72 h*) | Sent, and the registry has not answered for 72 hours. |
| Attestation required (*Held: attestation required*) | Never sent because the registry is switched to its live system but the go-live approval is not current. |
| Held (*Held, not sent*) | Never sent. The patient identifier, codes or eligibility were not ready, or the registry's required data is missing. |

Rows are ordered by kind in the order above, then newest first. Only the latest version of each result is shown: an older version replaced by a newer one is finished with. Patients excluded by their consent or not eligible are never listed, since they are never sent.

**Table columns**

| Column | What it means |
|---|---|
| Case | The accession number. |
| Registry | The registry or screening programme. When the submission has a version, a second line reads "Version N · new / correction / amendment". A **TEST** tag marks a send to the registry's test system. |
| Status | The kind, as above. |
| What went wrong | The first finding: a code (in a code box) and the registry's message, or PathScribe's own message for a hold. "and N more" shows when there are further findings. A no-answer row reads "Sent; the registry has not answered for 72 hours." A row with nothing to say reads "No details were given." |
| When | The time of the last acknowledgement, otherwise the last attempt, otherwise when it was queued. |
| Actions | The buttons below. |

**Details row.** **Details** opens the row to show every finding with its severity (**Fatal**, **Rejected**, **Warning**, **Information**), its tier number and location where given, and **Acknowledgement as received**: the registry's reply as it arrived (shown in a monospace box, tagged as patient data). If no reply has arrived it says "No acknowledgement has been received for this submission."

### Toolbar

**Header**

| Control | What it does |
|---|---|
| Transmission audit for | Choose **Screening and cancer**, **Screening (cytology)** or **Cancer registry**. |
| Download transmission audit | Downloads a file listing what was sent to the registries: when, the registry's status and its response code. It holds no patient names or MRNs. The screen then says "Transmission audit downloaded: N submissions." (or, with the PathScribe server, a notice says when the file is ready; see [My Exports](help:my-exports)). |
| Refresh | Reloads the list. It is greyed out while loading. |

**Row actions**

| Button | What it does |
|---|---|
| Details / Hide details | Opens or closes the findings and the acknowledgement. |
| Open case | Opens the case in the right place: the Cytology Workspace for a screening submission, the report for a cancer submission. |
| Patient details | Opens "Patient identifiers and registry opt-outs" for the case. Changes apply to the patient, not only this case, and are sent to the hospital's system as a demographic update. Resend a held submission afterwards. |
| Capture as CAPA | Raises the problem into Quality Assurance as a deficiency that can be escalated to a CAPA. A row with one open shows **CAPA open** instead. |
| Mark reviewed | Only on a *Revised after acceptance* row. Takes the row off the list. The deficiency raised with it stays open in Quality Assurance. |
| Re-validate and resend | Rebuilds the submission from today's data and sends it again. Not offered for conflicts, revisions after acceptance, a message still waiting for the CSMS eligibility answer, or an old submission with no header. |
| Resend all N | Appears only when the **Attestation required** tab is open: resends every row on the list, each checked on its own. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Count on each tab | How many submissions are in that group. |
| Badge on the top-bar triangle | The number of submissions needing attention. It is checked when the window regains focus and about once a minute, and it appears only when above zero. |
| **TEST** | The submission went, or will go, to the registry's test system. |
| **CAPA open** | A deficiency for this submission is already open in Quality Assurance. |
| Finding severity | Fatal, Rejected, Warning or Information. |

**Patient details saved.** After you change an identifier or an opt-out and select **Save** in "Patient identifiers and registry opt-outs", a message says "Patient details saved." Other outcomes are "Nothing changed.", "Saved in part: you do not have permission for some of these changes." and "Not saved: you do not have permission to change these patient details."

### Hotkeys

None. All controls are ordinary buttons and tabs.

### Who may do what

| To do this | You need |
|---|---|
| Open the screen, read rows, open a case, Capture as CAPA | The permission to open Registry Exceptions. By default: Administrator, Lab Director and QA Reviewer. |
| Re-validate and resend, Resend all | Resend a registry submission. By default: Administrator and Lab Director. |
| Mark reviewed | Mark a registry revision reviewed. By default: Administrator and Lab Director. |
| Download transmission audit | Export the registry transmission audit. By default the quality and administration roles; a laboratory can grant it to others. |
| Patient details | The permissions to record the patient's national identifier and registry opt-outs, which accessioning roles hold. Without them the window says "Not saved: you do not have permission to change these patient details." |

A button for an action you lack is shown greyed out. Hold the pointer over it to see the permission it needs.

## Step-by-Step Procedures

### Standard workflow

**Work a rejected submission**

1. Open **Quality & Compliance**, then **Registry Exceptions** (or select the warning triangle in the top bar). The list opens on **All**.
2. Select **Rejected, fixable**. The table shows each case with the registry's first finding.
3. Select **Details** on a row. Read each finding: the code, the message, and where in the submission it applies. Read **Acknowledgement as received** if the finding is not clear.
4. Select **Open case**. Correct what the finding names (for example a missing code or provider number) in the report. If the problem is the patient's identifier or opt-out, close the case and select **Patient details** instead.
5. Return to Registry Exceptions and select **Re-validate and resend** on the row. A message appears: "Sent as version N (correction)." or "Sent again as the same submission."
6. Select **Refresh**. The row leaves the list once nothing else is wrong. If the registry rejects it again it returns with new findings.

**Clear held submissions**

1. Select **Held**. The finding says what is not ready.
2. Fix it (patient identifiers through **Patient details**, codes in the case). Select **Re-validate and resend**.
3. If the message is "Still held:" followed by the reason, the data is still not ready; correct that and try again.

**Attestation required**

1. Select **Attestation required**. A note says these are held because go-live is not approved for these registries.
2. Normally the go-live approval resends them automatically. To send them now, select **Resend all N**. A message reports "N resent, M not resent".

**Review a revision after acceptance**

1. Select **Revised after acceptance**. The row lists the fields the registry changed (field name and new value).
2. Check the changes against the case. Select **Mark reviewed**. The message says "Revision marked reviewed. Its CAPA deficiency stays open in Quality Assurance."

### Alternative workflow

1. To keep a record of a recurring problem, select **Capture as CAPA** on a row. The message reads "Raised for CAPA review in Quality Assurance" and the row shows **CAPA open**. Follow it in [Quality](help:quality).
2. To prepare for an inspection, choose a queue under **Transmission audit for** and select **Download transmission audit**.

### Exception handling

1. **Rejected outright.** Resending the same content is refused ("Nothing has changed since the registry rejected it. Fix the data first."). Correct the data; if the case should not be reported at all, deal with it in the [Outbound Queue](help:outbound-queue) with **Mark not reportable**.
2. **Conflicting answers.** There is no resend. Open the case and the Details, decide which answer is right, and use **Capture as CAPA** so the discrepancy is followed up.
3. **Not delivered.** The engine could not be reached. Once the interface is back, select **Re-validate and resend**: it is sent as the same submission, marked as a duplicate retry, so a registry that did get it can drop the copy.
4. **No answer in 72 h.** Check with the registry. A resend is allowed and uses the same rule.
5. **Waiting for the CSMS eligibility answer.** The row cannot be resent from here. Record the eligibility answer on the case; the answer releases it.

### Error recovery

1. "You do not have permission to resend registry submissions." Ask your administrator for the resend permission.
2. "This submission predates resending and cannot be resent from here." Ask support; the submission has no header.
3. "Not sent:" followed by a reason. The patient has since opted out, or the registry or result no longer applies. Nothing is sent.
4. "The interface engine could not be reached." Wait, then resend again.
5. "The CAPA could not be raised" or "You do not have permission to do this." Try again; if it persists, tell your administrator.
6. "Not all changes were saved: someone else changed this case at the same time." In Patient details, close and reopen the window and repeat the change.

!!! warning "Patient details change the patient, not only the case"
    A national identifier or opt-out edited here applies to every case of the patient and is sent to the hospital's system as a demographic update. Check the patient and the new value before you save.

!!! warning "A registry opt-out is honoured"
    If a patient has opted out, the submission is not sent, even if you resend. Do not try to bypass this.

## Tips and Best Practices

### Common mistakes

- Selecting Re-validate and resend before correcting the data. A rejected submission with unchanged content is refused.
- Marking a revision reviewed without checking the changed fields. The row leaves the list and the deficiency stays open, but the check is yours.
- Forgetting that Patient details changes the patient's record for all cases.
- Using Resend all on the Attestation required tab without checking that go-live really is approved.

### Efficiency recommendations

- Use the tab counts to decide where to start; the order of the tabs puts the most serious first.
- Use **Details** before **Open case**: the code and location often tell you exactly which field to correct.
- Keep the screen open on the **Held** tab during a catch-up: after each fix, resend, then Refresh.

### Workflow recommendations

- Check the top-bar badge at the start and end of each day.
- Capture a CAPA for any problem that repeats, not for every single row.
- Download the transmission audit before an inspection or an annual registry review.

## Related Features

### Upstream workflow

- [report](help:report): cancer reports are sent to the registry when they are signed out.
- [Cytology](help:cytology): cervical screening results are sent to the screening programme.
- [Outbound Queue](help:outbound-queue): the wider list of outgoing messages, including these.

### Downstream workflow

- [Quality](help:quality): where a captured CAPA or an automatic revision deficiency is followed up.
- [Audit Log](help:audit-log): holds the entry for each resend, refusal and review.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| "No registry submission needs attention." | Nothing is wrong, or the rows belong to another organisation. |
| "Nothing in this group." | The chosen tab is empty. Select **All**. |
| No Re-validate and resend button on a row | The row is a conflict or a revision after acceptance, is waiting for the eligibility answer, or has no header. |
| Re-validate and resend is greyed out | You lack the resend permission, or another action on that row is running. |
| The top-bar badge does not match the list | The badge refreshes about once a minute or when you return to the window. Select Refresh. |
| A row reappears after a resend | The registry rejected it again or the hold reasons remain. Open Details. |
| A patient is missing from the list | Patients excluded by consent or not eligible are never listed. |

### Resolution steps

1. Select **Refresh**.
2. Open **Details** and read every finding and the acknowledgement.
3. Correct the case or the patient details, then resend.
4. If it keeps failing, select **Capture as CAPA** and tell your administrator which finding repeats.

### When to contact support

Contact your laboratory's PathScribe support when the same submission is rejected repeatedly with a finding you cannot explain, when a submission has no header, when the registry says it never received a submission shown as sent, or when the count in the top bar never clears. Have the accession number, the registry name and the time of the last attempt ready.
