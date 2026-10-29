---
module: Report
screen: Sign Out and Release
workflow: Case Reporting and Sign-Out
role: [Pathologist, Fellow, Resident, Pathology Assistant]
routes: []
keywords: [sign out, sign out and next, finalise, finalize, countersign, release, release buffer, pending release, recall, watermark, addendum, amendment, correction, preliminary, STAT bypass, held report, print policy]
previous: report
next: report/case-team
related: [report, report/case-team, report/synoptic-reporting, worklist, quality, voice-and-keyboard]
status: Draft
---

# Sign Out and Release {#top}

## Overview

**Purpose.** This article covers everything that happens at the end of a case on the [Report](help:report) screen: the review checks, signing the case out, the short release hold that follows, recalling a report, and correcting a report after it has gone out. It also covers the quick variants, **Sign Out & Next** and **Finalize & Next**, and trainee sign-out with an attending's countersign.

**Intended users.** Pathologists and fellows, who sign out. Residents and other trainees, who release a case for an attending's countersign. Attendings, who countersign. Pathology assistants and quality staff read the same banners.

**Where it fits.** You arrive here when the synoptic checklist and the narrative are complete (see [Synoptic Reporting](help:report/synoptic-reporting) and [Microscopic and Material](help:report/microscopic-and-material)). After sign-out the case moves to Pending Release, then to Finalized. Quality review and tumor board listing follow (see [Quality & Compliance](help:quality)).

!!! note "Two reporting modes"
    **Orchestration** cases are signed out in PathScribe with **Sign Out Case**. **Assist** cases are finalized in PathScribe with **Finalize**, and the official sign-out happens in your laboratory information system (LIS). Each section below says which mode it applies to. The mode is set when the case is created; you do not choose it.

!!! note "Demonstration data"
    In this version the LIS, the outbound interfaces and the sign-in confirmation use demonstration data or are simulated. A release that "goes out" is recorded in the case and its audit log; whether anything reaches a real outside system depends on how your laboratory has connected it.

## Screen Tour

![The bottom action bar of an Orchestration case with Sign Out Case, Sign Out & Next and Release as Preliminary](capture:report-sign-out-and-release-action-bar)

The sign-out and release controls are on the **bottom action bar**, in two banners under the header, and in a small number of windows that open on demand.

![The sign-out window with the Coding Summary and the follow-up tick box](capture:report-sign-out-and-release-sign-out-window)

### Field definitions

**Sign-out window (Orchestration)**

| Field | What it means |
|---|---|
| Title: Sign Out Case | The window for the signing pathologist. For an attending reviewing a trainee's case the title is **Countersign Case**. |
| Body text | "All synoptic reports for Case (accession) have been finalized." for a normal sign-out; "Released by (name) for your countersign" for a countersign. |
| Coding Summary | The billing codes applied to each specimen and block. A specimen that has ancillary codes but no base code shows a warning with **Assign now**. Codes suggested but not applied are listed as "suggested, not applied". |
| A follow-up specimen (resection or excision) is expected | Optional tick box. When ticked, the laboratory is warned if no follow-up specimen arrives within the biopsy-to-resection window. |
| Feedback for (trainee) | Countersign window only. Optional to countersign, required to return the case. |
| Signature confirmation | How you prove who is signing. Depending on your laboratory this is your password, your organisation's sign-in page, or a second-factor code. The button reads **Sign Out Case** with the method added, for example "(Password Required)". |

**Review before finalising window (Assist)**

| Field | What it means |
|---|---|
| Review before finalising | Title of the window. A tag shows **Assist mode**. |
| Preview, as transmitted to LIS | The synoptic answers exactly as they will be sent. Each specimen shows how many fields are filled, for example 12/21, and its place in the sending order ("Transmits 1st"). |
| Drag specimens to set transmission order | Drag a specimen to change the order. Synoptics stay locked to their specimen. |
| Required field incomplete, sign-out blocked | A count of required fields still empty on a report. |
| Optional fields empty | A count of optional fields left empty (a reminder only). |
| Finalise now / Finalise & Next | The buttons that finalize. Finalise & Next shows "next case queued". |

**Release banners**

| Field | What it means |
|---|---|
| Release countdown banner (signed-out report) | Shows the status and the time left. The pathologist who signed sees "releasing automatically in (time)" with **Recall Report**. Everyone else sees that the signing pathologist's recall window closes automatically in (time). |
| Held-report line | For other held outputs (a preliminary, a correction or addendum): "(type) (what) held for the release delay until (time) (released by (name))." The person who released it sees **Recall**. |
| Releasing in | Countdown in the case header while a release is held. |
| Watermark | A diagonal watermark across the report while it is Pending Release. Its wording is set by your laboratory (see "The release hold"). |

**Correction window (Request Amendment / Addendum)**

| Field | What it means |
|---|---|
| Mode buttons | **Addendum**, **Minor Amendment** and **Major Amendment**. A new window opens set to Major Amendment. |
| Applies to | The report being revised (shown as "Amending:" or "Correcting:"). |
| Reason | A required pick list. |
| Addendum title | Addendum only, for example "Addendum: Immunohistochemical Staining Results". |
| Explanation | What changed and why. Required for every kind; it is the audit trail. |
| Clinical Notification Log | Who was told and how. Required for a Major Amendment, and for a Minor Amendment when your organisation requires it. Fields: **Clinician notified**, **Method** (Verbal / Phone Call, Secure Page, Secure Email, Fax, Direct LIS Flag) and **Date / time notified**. |

### Toolbar

| Button | What it does |
|---|---|
| Sign Out Case | Orchestration. Runs the review checks, then opens the sign-out window. Hidden while grossing is unfinished, while the case is Pending Release, after it is Finalized, and for a pool case you have not claimed. |
| Sign Out & Next | Orchestration. The same sign-out, then opens the next case in your list when it completes. |
| Finalize, Finalize & Next | Assist. Runs the review checks, then opens the Review before finalising window. |
| Release as Preliminary | Orchestration, before final sign-out. Sends the current preliminary findings now (held for the release delay like any output). Does not sign out or finalize. |
| Request Amendment / Addendum | Shown on a Finalized case. Greyed out when your role may not release any kind of revision. |
| Mark follow-up expected | Shown after sign-out when no follow-up has been recorded yet. Afterwards the bar reads "Follow-up expected · due (date)". |
| Print | Assist, after finalizing. Orchestration printing is in the Report Draft tab. Subject to the Release Hold Print Policy. |
| Recall Report | In the release banner, for the person who signed. |
| Return to Trainee | In the countersign window, for the attending. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Pending Release | Signed, and held for the release delay. Shown as "Queued for Release" in the Worklist filter. |
| Pending countersign | A trainee released the case for an attending. The attending finds it with the Worklist's awaiting-countersign filter. |
| Returned | The attending returned the case to the trainee for revision. |
| Finalized | Released. Sections are locked; changes need an amendment or addendum. |
| PRELIMINARY — SUBJECT TO CHANGE | Watermark on a preliminary report. |
| AMENDMENT IN PROGRESS — not yet transmitted | Banner on a report unlocked for a Major Amendment. A correction reads **CORRECTION IN PROGRESS — not yet transmitted**. It shows the baseline and a **Changed Items Summary**. |
| AMENDED REPORT, CORRECTED REPORT, ADDENDUM (number) | Headings on a revised report. |
| (n) amendments on record, AMENDED DIAGNOSIS | Banner on a report that has been amended, with the amended diagnosis and a timestamp. |

### Hotkeys

A key acts only while its button is showing and enabled, and is ignored while another window is open in front. A key never signs anything for you: the sign-out and finalize windows always ask you to confirm who is signing. The spoken forms are in English here; the commands also exist in French, German, Dutch, Korean and Spanish.

| Action | Key | Spoken phrases |
|---|---|---|
| Sign Out Case | Alt+Shift+X | "sign out case", "sign out the case", "case sign out" |
| Sign Out and Next | Ctrl+Alt+Shift+O | "sign out and next", "sign out next", "signout next", "finalize and next", "next case sign out" |
| Finalise Report | Ctrl+Alt+Shift+F | "finalise", "finalize", "finalise report", "finalise case", "sign off", "sign off report" |
| Cancel Finalise | Ctrl+Alt+Escape | "cancel finalise", "cancel finalize", "cancel sign off" |
| Add Amendment | Ctrl+Alt+E | "add amendment", "open amendment", "request amendment", "amendment" |
| Add Addendum | Ctrl+Alt+Shift+B | "add addendum", "open addendum", "addendum request", "request addendum" |
| Save Amendment or Addendum | Alt+Shift+F3 | "save amendment", "save correction", "release addendum" (only while the correction window is open) |
| Recall Report | Ctrl+Alt+Shift+V | "recall report", "pull back report", "recall the report" (say it twice) |
| Record Critical Notification | Alt+Shift+F7 | "record notification", "record critical notification" |
| Continue Past Fixation Time Gate | Ctrl+Alt+Shift+5 | "continue fixation gate", "continue fixation time" |
| Continue Past Collection/Receipt Date Gate | Ctrl+Alt+Shift+6 | "continue date gate", "continue receipt date gate" |
| Record Frozen-Final Reconciliation | Ctrl+Alt+Shift+Z | "record discordance", "record reconciliation", "confirm concordant" |
| Place Case On Hold | Alt+Shift+F5 | "place hold", "place case on hold" |
| Release Case From Hold | Alt+Shift+F6 | "release hold" (say it twice) |
| Go to Codes | Ctrl+Alt+G | "go to codes", "open codes" |
| Return to Trainee | Ctrl+Alt+Shift+T | "return to trainee", "reject with notes", "send back to resident" |

How the commands behave:

- **Sign Out and Next** does what the button for your mode does. On an Orchestration case it is **Sign Out & Next**; on an Assist case it is **Finalize & Next**. On a case where neither button is showing, it does nothing.
- **Add Addendum** and **Add Amendment** act only on a Finalized case, when your role may release a revision. Add Addendum opens the correction window already set to Addendum; Add Amendment opens it set to Major Amendment. If a draft is already open on that report, either command resumes the draft.
- **Say-it-twice commands.** Recall Report and Release Case From Hold are hard to undo, so a spoken command is held until you say it a second time. A key press is already deliberate and runs at once.
- **Confirm Finalise** (Ctrl+Alt+Shift+C, "confirm finalise") is registered, but nothing on the screen answers it, by design: finalizing needs your own sign-in confirmation. Select **Finalise now** in the window.
- **Enter Addendum** (Alt+Shift+D) is registered as a dictation target but has no screen handler yet; type the addendum in the correction window.

## Step-by-Step Procedures

### Standard workflow

**Sign out an Orchestration case**

1. Check that the checklist and report text are complete and that no hold is on the case.
2. Select **Sign Out Case** (or press Alt+Shift+X). PathScribe runs the review checks first (see "The review checks" below). If one stops you, a message or window says why and the sign-out window does not open.
3. If a specimen has ancillary codes but no base code, the screen opens the billing review instead of the sign-out window. Assign the base code (select **Assign now**), then select **Sign Out Case** again.
4. In the sign-out window read the **Coding Summary**. Tick **A follow-up specimen (resection or excision) is expected** if it applies.
5. Confirm who is signing as the window asks, then select the **Sign Out Case** button in the window. If your confirmation is refused, the message says why (for example "The signature confirmation has expired. Confirm again to sign.") and nothing is signed.
6. A message reads **Report signed — dispatch in (n) min unless recalled**, and the case becomes **Pending Release**. The banner counts down. If the laboratory has no release hold for this case, the message is **Case signed out successfully** and the case is Finalized at once.
7. A billing item that PathScribe flags for quality review does not block the sign-out; a message tells you how many were flagged. If the margin rule lists the case for tumor board, a message says so.

**Sign Out & Next (Orchestration)**

1. Open the case from the Worklist so that your queue of cases is known. (A case opened from Search or a message has no queue.)
2. Select **Sign Out & Next** (or press Ctrl+Alt+Shift+O, or say "sign out and next"). The button does exactly what Sign Out Case does, and remembers that you want to move on.
3. Work through the same checks and the same sign-out window. Nothing is skipped or shortened.
4. When the case has been signed out (or released for countersign), the next case in your list opens by itself.
5. If there is no next case, you stay on the signed-out case and see **Case signed out. There is no next case in your list.**

**Finalize & Next (Assist)**

1. Select **Finalize & Next** (or press Ctrl+Alt+Shift+O). The review checks run.
2. In the **Review before finalising** window check the synoptic data as transmitted. Drag specimens to set the order if needed.
3. Select **Finalise & Next** and confirm who is signing. The case is finalized and the next case in your list opens. With no next case you see **Case finalised. There is no next case in your list.**
4. The bar shows **Finalized — structured data complete, LIS handles official sign-out**.

**Recall a signed report**

1. While the countdown runs, select **Recall Report** in the banner (or press Ctrl+Alt+Shift+V).
2. The message **Report recalled — you can continue editing.** appears. The case returns to the status it had before sign-out, nothing has been sent, and the report is open to edit again.
3. Make the change and sign out again. A recall does not create an amendment.

### Alternative workflow

1. **Release as Preliminary.** Select **Release as Preliminary** before final sign-out when a partial finding is clinically urgent. The message reads **Preliminary report released (n specimens)**, or **Preliminary report held for the release delay; it goes out at (time).** The case stays open. The button is greyed out unless your role may release preliminary reports (by default pathologists and fellows only).
2. **Trainee sign-out and countersign.** If your role or the case team requires a countersign, **Sign Out Case** releases the case for the attending instead of finalizing it: **Case (id) released for attending countersign**. The attending is told by email when an address is on file. The attending opens the case, reads the **Countersign Case** window, adds optional feedback, confirms who is signing, and signs. The release hold then starts as for any sign-out. To send the case back, the attending enters feedback (required) and selects **Return to Trainee**: **Case returned to (name) for revision.** The trainee can edit it again.
3. **Delegate before sign-out.** If someone else should sign the case, hand it over first (see [Case Team](help:report/case-team)). Signing authority follows the case team, not the window you have open.
4. **Print during the hold.** See "The release hold" for what the Release Hold Print Policy asks of you.
5. **Mark a follow-up later.** After sign-out, select **Mark follow-up expected** if you forgot to tick the box.

### Exception handling

**Added gates.** After the review checks, one more set of checks can stop the sign-out. Each opens its own window, you answer it, and the sign-out then carries on from where it stopped:

1. **Collection or receipt date missing.** The window **Collection/Receipt Date Required Before Sign-Out** asks you to enter the real date and time, or to state that it is not recoverable with a justification. **Continue Sign-Out** goes on; **Cancel — don't sign out** stops.
2. **Fixation time required.** **Fixation Time Required Before Sign-Out** appears for specimen types that need documented fixation timing. Enter the fixation time, enter an estimate, or choose **No time or estimate possible — override** and give a reason.
3. **Stain quality control.** **Stain QC Gate — Sign-Out Blocked** lists the stain batches to resolve. Confirm the visual read checklist for each. A batch with a reported instrument failure blocks sign-out until its deficiency is resolved in Quality.
4. **Margin inking.** **Sign-out cannot be completed** when an inking issue is compliance critical. Resolve it, or, if your role allows, record an **Administrative Override** with a reason.
5. **Clinical mismatch.** The AI may suggest a possible mismatch between the clinical picture and the findings. The flag shows the words it relied on from each side ("Clinical side: …", "Pathology side: …"); a quote that cannot be found in the case text says "not found in the record, check it yourself". Read the quotes before you decide. In the default setup a mismatch is a plain flag: it is logged for quality review and does not hold sign-out. Where your laboratory has switched on the clinical-support setup, a high-risk one asks for a decision (Resolved or Unresolved) and may hold the release.
6. **Peer review.** Where your laboratory requires an independent peer review of a first-time malignancy, sign-out waits for it. Ask a colleague, or choose **Sign out now** for urgent care and give the reason; the review is still owed within 24 hours.
7. **Frozen section reconciliation.** If a frozen section was done, you compare it with the final diagnosis in **Frozen-to-Permanent Reconciliation**. If the categories differ it must be logged as a discordance (comment required). This window shows only when your laboratory has "Require Review Screen at Sign-Out" on.

**Other stops.**

8. **Critical finding.** A window lists critical or malignant findings. Record the notification (clinician, method, read-back) or select **Acknowledge without recording**. The list always includes a finding flagged Critical or Malignant. A finding the AI flagged only as Abnormal, and could not support firmly from the report text, is set aside and counted, not listed; you still read the report and decide.
9. **Missing code system.** If your country requires a code system and the case has none, you are asked to confirm before signing out. Going on is recorded in the audit log.
10. **You are not allowed to sign this case.** The message reads "Only an active participant on this case whose participation type can finalize may sign it out." Ask the primary pathologist, or have yourself added to the case team (see [Case Team](help:report/case-team)). Holding the sign-out permission is not enough on its own.
11. **Already Pending Release.** "This report is already Pending Release — recall it first if you need to make further changes."
12. **Someone else changed the case.** Choose to use their version, keep working, or (if your role allows) save yours. A sign-out never overrides a newer version.

**Correct a Finalized report**

13. Select **Request Amendment / Addendum** (or press Ctrl+Alt+E for an amendment, Ctrl+Alt+Shift+B for an addendum).
14. Choose the kind. **Addendum** adds new information and leaves the original text untouched. **Minor Amendment** fixes a clerical error without changing the diagnosis. **Major Amendment** changes a diagnosis, staging or interpretation and needs the Clinical Notification Log.
15. Choose the **Reason**, write the **Explanation**, and fill the notification fields where required.
16. For an addendum, enter the **Addendum title** and the addendum text and select **Release Addendum**. The message **Addendum released** appears. If the addendum text conflicts with the clinical history, a mismatch decision is asked first.
17. For an amendment, select **Save Draft (unlocks for editing)**. The report unlocks: **Report unlocked for amendment — edit the synoptic fields, then re-finalize and sign out to transmit.** The banner **AMENDMENT IN PROGRESS — not yet transmitted** (or CORRECTION) shows what differs from the baseline. Edit the report and sign out again. The revised report is released through the same release hold and headed **AMENDED REPORT** or **CORRECTED REPORT**.
18. If the report has been amended before, a **Select baseline values** step lets you pull an older value for a field instead of the latest.

!!! warning "A report in its release hold is corrected by recall, not by amendment"
    Until the release hold ends, nothing has been sent. Starting an amendment or addendum then is refused: "This report is still in its release delay, so it hasn't been sent. Recall it to make changes, or wait until the delay ends to add a correction or addendum." Recall, edit, and sign out again. Recalling a sign-out also takes back any correction or addendum released on it during the hold.

### Error recovery

1. **The sign-out did not complete.** "The sign-out could not be completed, so the case was left as it was. Please try again." means nothing changed. If the message adds that the case status could not be put back, reload the case and check it before trying again.
2. **Countersign could not be recorded.** "The countersign could not be recorded (reason), so the case was not signed out. Please try again."
3. **A correction was not released.** "(n) corrections could not be released. They stay open on their reports, not finalized." Open the report, check the banner, and release again.
4. **An addendum was released but not sent.** "The addendum was released but could not be sent. Check the outbound queue or contact support." The addendum is on the report; the sending is what failed.
5. **Recall refused.** Only the person who signed can recall; the report must still be inside its hold; you need the recall permission. Messages read "Only the pathologist who signed this report out can recall it", "The release buffer has already expired", or "You don't have permission to recall reports." The same wording appears for held outputs: "Only the person who released it can recall it", "The release delay has ended; it has gone out."
6. **Sign Out & Next did not move on.** See "Sign Out & Next: what ends the arming" below.
7. **Leaving with unsaved work.** The screen asks whether to save before it leaves the case.

## The review checks

**Sign Out Case** and **Finalize** run the same checks before anything is signed, in this order. The first one that fails stops the process:

1. The report is not already Pending Release.
2. The case is not on hold. The message gives the hold note.
3. Organ-map figures are current, Mohs blocks are complete, and derived margins agree with the answers.
4. Counts and totals in the synoptic are consistent. A count larger than its total blocks sign-out; a total that differs from its grid only warns, and you may go on.
5. Margins and molecular results that differ from what was expected are confirmed by you.
6. Every specimen's microscopic description is saved and complete. The screen opens the specimen's microscopic panel.
7. Critical or malignant findings have been acknowledged or recorded.
8. Every visible required field is answered, and no required AI suggestion is unverified. Sign Out Case checks every synoptic on the case that is not yet finalized; Finalize checks the report you have open.
9. Every section of AI-drafted narrative has been accepted, edited, or kept as the earlier text. The message reads "The AI-drafted text in (section) has not been accepted yet. Accept or edit it before signing out." Accepting, editing and rejecting AI text are recorded in the audit log, as is adding an AI-suggested code.

After these, PathScribe checks your sign-in confirmation, the code-system rule, whether a countersign is needed, whether you are allowed to sign this case, and then the collection and fixation, stain, inking, mismatch, peer-review and frozen-section checks described above.

## Unconfirmed AI values are left out

Before the **Sign Out Case** or **Finalize** window opens, PathScribe clears every optional field that still holds an unchanged AI value you have not confirmed or overridden. The window shows a note such as "2 optional AI-filled fields you have not confirmed were left out of this report (recorded in the audit log). Cancel and Confirm them to keep them." To keep a value, select **Cancel**, **Confirm** the field, and sign again. Values you edited, and fields you confirmed, are untouched. The signed report is made from what is left. When the sign-out checks pass, the audit log records how many fields were left out (no values).

!!! warning "Cancelling does not bring the values back by itself"
    The cleared fields stay empty until you select Confirm on them again.

## Sign Out & Next: what ends the arming

Pressing **Sign Out & Next** (or **Finalize & Next**) "arms" the move to the next case. The arming:

- **Survives a parked sign-out.** A collection, fixation, stain, inking, mismatch or peer-review window closes the sign-out window and later resumes it. The case still moves on after you answer it and the sign-out completes.
- **Ends when you press a plain button.** Pressing **Sign Out Case**, **Finalize** or the plain hotkey clears it, so a sign-out you started plainly never moves you on.
- **Ends after ten minutes.** If the sign-out has not completed within ten minutes, the arming clears and you stay on the case, so an old arming cannot move you away after some later sign-out.
- **Ends when you open another case.**
- **Does not survive a stop at the review checks.** After fixing the problem, press **Sign Out & Next** again.

## The release hold

After sign-out a report waits before it is sent out. The hold is set by your laboratory: on or off, from 1 to 30 minutes (10 by default), and it can differ by performing laboratory.

- **What waits.** Every report output: the final sign-out, a preliminary, a correction, an addendum, autopsy reports and cytology reports. A resend after a failed delivery is not held.
- **STAT bypass.** When your laboratory has the STAT bypass on, a case with STAT priority skips the hold; it is Finalized and released at once, and there is nothing to recall.
- **When it goes.** The hold ends and the report is finalized and sent: **Release buffer expired — report finalized and released.** While PathScribe is open on any screen, a held report is released within about 15 seconds of its time. Until the server job that does this by itself is built, a report whose time has passed is released when someone next opens PathScribe.
- **Recall.** Only the person who signed (or released) the report can recall it, and only before the hold ends. Records are never deleted: a recalled sign-out stays on file, marked recalled, with who and when.
- **What a recall reopens.** A surgical sign-out returns to its earlier status. A surgical preliminary has its attestation cleared. A surgical correction or addendum goes back to draft. Autopsy and cytology outputs reopen as described in their own articles.
- **Print policy.** Your laboratory chooses what happens when someone prints during the hold: **Allow** (print at once), **Warn and confirm** (the default; the screen says "Hard-copy printing is restricted while this report is Pending Release. The printed copy will carry the PENDING FINAL RELEASE watermark." and you confirm), **Supervisor override** (only a person with that permission may print, and gives a reason: "Reason for printing during the release hold", kept in the audit log) or **Block** (no printing until released). Any copy that prints during the hold carries the watermark. A released report's file never carries it.

!!! warning "The release timer is not backed by a separate scheduler yet"
    The countdown is correct for the window you have open. A server job that releases a case nobody has open is designed but not built. Do not rely on closing the window and expecting an on-time release.

## Messages and fields in the sign-out windows

This section lists the wording of the windows that can appear while you sign a case out. Each one is described in the order it can appear.

### Review before finalising

- **Drag specimens to set transmission order** and **Synoptics are locked to their specimen**: you can reorder specimens, but a synoptic report always stays with its own specimen.
- **Preview — as transmitted to LIS** shows what will be sent. If no synoptic exists it says "No synoptic reports to transmit."; if a synoptic has no answers it says "No fields completed".
- After you finalise, the window shows **Verifying…** and then **Verified**, and tells you how many synoptics were transmitted and whether the next case is queued. If a fingerprint check does not recognise you it says "Biometric didn't recognise you — please use your password." In the demonstration the check is simulated and your password also works.

### Stain, inking and date gates

- **Stain QC Gate — Sign-Out Blocked**: for each batch, choose **Confirm visual read checklist complete**. The row then reads "Visual read confirmed by (your name)." A batch with a reported instrument failure cannot be confirmed here; resolve its deficiency first.
- **Administrative Override — Sign-Out Gate** (margin inking): pick a **Reason for override** from the list (emergency intraoperative consultation, specimen pre-inked as a foreign object, specimen consumed or unavailable for re-inking, or Other). For Other, add **Additional detail (optional)**. Choose **Record Administrative Override**. You need permission to do this.
- **Collection and fixation dates**: when a date cannot be found, a row offers **Not recoverable — apply "(label)"**, where the label is your laboratory's own wording for an administrative override.

### Critical findings

- **Requires urgent notification** is the red label at the top of the **Critical Finding Detected** window.
- In **Notified by** type the name of the person who made the call; in the physician field type the **Name of the physician contacted**. Tick that the clinician read the finding back, then choose **Record Notification**. For email, choose **Write the secure email…**; a read-back does not apply, and the notification is recorded when the email has been sent.

### Frozen-to-Permanent Reconciliation

- **Automatically Flagged for Review** appears because a frozen section was done on the specimen. Compare it with the final diagnosis before you continue. If the frozen diagnosis has no text it shows "(no diagnosis text recorded)".
- If the category matches, choose **Confirm Concordant — Continue Sign-Out**. If it differs, give a required comment and choose **Record Discordance — Continue Sign-Out**.
- For a teaching case, **Feedback for {{name}} — optional** (the name is the person who drafted the report) lets you write feedback for the person who drafted the report.

### Printing a signed report

- **Print report** or **Reprint report** opens before printing. When your laboratory asks for a reason on a reprint, give a **Reason for reprint** (for example "copy for the clinic, original lost"). The reason is kept in the audit log.
- During the release hold the window warns that the copy carries the "PENDING FINAL RELEASE" watermark and asks for a **Reason for printing during the release hold**, because this is a supervisor override.

### Amendments

- The amendment window and the amended report banner show **Amended by** and the time of the change; if the person cannot be found it shows "Unknown user".
- Versions are named Original, then "1st Amended", and so on. The newest is named, for example, "2nd Amended (Most Recent)".
- The change table lists each **Synoptic Element**, the **Value used**, and the other columns. **Confirm & Continue** moves on to the next step.
- In the report view **Synoptic Report — as sent to LIS** shows an amended report with the columns **Synoptic Element**, **Originally Reported As** and **Currently Reported As**, and the line **Reason for Amendment:**.

### AI review before sign-out

- In AI Review Mode, the footer buttons read **Space — Confirm & Next →** (or **Space — Confirm & Finalise 🔒** on the last field), **O — Override** and **S — Skip**.

### Countersign

When a resident's case reaches you for countersign, the message names the resident; if the name is missing it says "the resident".

### Holds and deficiency history

- The case hold and retention hold windows list earlier holds under **Past Holds (N)**.
- **Deficiency History** is read-only. It lists each deficiency on the case with **Issue:**, **Corrective action:** details, **Raised by** (a person, or **System (auto-detected)**) and, once closed, **Verified effective:** with the verifier's name. When there are none it says "No deficiencies recorded for this case."

## Confirming your identity to sign

When you sign, the confirmation box asks for your credentials. Depending on how your organisation signs people in it shows **Username** and password ("Enter your password to sign."), a second-factor code box (placeholder "Six-digit code or recovery code"), or a separate sign-in window. While the separate window is open the box says **Waiting for the sign-in window…** If the browser blocks the window, allow pop-ups for PathScribe and try again. Too many wrong attempts lock signing for a short time; the box tells you how many attempts remain.

## Tips and Best Practices

### Common mistakes

- **Leaving an AI suggestion unverified on a required field.** The sign-out stops with a message naming the field. Confirm or override it.
- **Expecting an unconfirmed optional AI value to appear in the signed report.** It is left out. Confirm it before you sign.
- **Pressing Sign Out Case and expecting to move on.** Only **Sign Out & Next** (or the hotkey) moves to the next case.
- **Opening a case from Search and using Sign Out & Next.** There is no queue, so you stay on the case.
- **Trying to amend while the report is Pending Release.** Recall it instead.
- **Waiting to recall until the last seconds.** If the countdown ends first, the recall is refused and you must amend.
- **Looking for Sign Out Case on an Assist case.** Assist cases use **Finalize**; the LIS signs out.
- **Speaking "confirm finalise".** It does nothing by design. Select **Finalise now**.

### Efficiency recommendations

- Clear holds and critical-finding notifications first so the checks pass at the first try.
- Use **Sign Out & Next** (Ctrl+Alt+Shift+O) from the Worklist queue to read, sign and move on without returning to the list.
- Settle collection and fixation dates at accessioning and grossing; they are the most common cause of a parked sign-out.
- Tick the follow-up box at sign-out rather than returning to the case later.

### Workflow recommendations

- Use **Release as Preliminary** only for urgent partial findings. It does not close the case.
- Treat the release hold as your last proofreading window. Re-read the printed or on-screen report while the countdown runs; recall is free, an amendment is not.
- Trainees should add a short note to the attending before releasing for countersign; the attending's feedback is captured in the countersign window, not in a separate note.

## Related Features

### Upstream workflow

- [Report](help:report): the screen as a whole.
- [Synoptic Reporting](help:report/synoptic-reporting): the checklist whose required fields the sign-out checks.
- [Microscopic and Material](help:report/microscopic-and-material): the microscopic description each specimen must have.
- [Case Team](help:report/case-team): who is allowed to sign, delegate and countersign.
- [Grossing](help:grossing): grossing must be complete before sign-out is offered.

### Downstream workflow

- [Tumor Board](help:tumor-board): cases can be flagged automatically at sign-out by the margin rule (a message tells you).
- [Quality & Compliance](help:quality): post-sign-out review, deficiencies and billing flags.
- [Search](help:search): find the Finalized case.
- [Voice and Keyboard](help:voice-and-keyboard): all voice phrases and hotkeys.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| No Sign Out Case button | The case is Assist (use Finalize), grossing is not complete, the report is Pending Release or Finalized, or it is a pool case you have not claimed. |
| Sign Out Case is greyed out | Your role lacks the sign-out permission, or the synoptic layout is still being checked. |
| "Only an active participant on this case..." | You are not on the case team with a participation type that may finalize. |
| "This case is on hold" | A case hold is active. Release it in the left list. |
| "n AI suggestions still need your review" | A required field has an unconfirmed AI suggestion. |
| "The AI-drafted text in (section) has not been accepted yet" | AI-drafted narrative has not been accepted or edited. Accept it, edit it, or keep the earlier text. |
| A value I expected is missing from the signed report | It was an optional AI value you had not confirmed, and it was left out. The sign-out window said how many. |
| Sign-out window did not open after pressing the button | A review check stopped you, or the billing review opened because a base code is missing. |
| Sign Out & Next stayed on the case | No next case in your list, a check stopped the sign-out, or ten minutes passed. |
| Request Amendment / Addendum is greyed out | Your role may not release amendments, corrections or addenda. |
| "This report is still in its release delay" | The report is Pending Release. Recall it. |
| Recall Report button missing | You are not the person who signed, or the hold has ended. |
| Cannot print | Release Hold Print Policy, a restricted case flag, or no print permission. |
| Hotkey does nothing | The matching button is not showing or is greyed out, or a window is open in front. |

### Resolution steps

1. Read the message on screen; it names the field, specimen, hold or gate.
2. Fix that item, then select the same button again.
3. If a button is missing, check the reporting mode, the case status in the header, and whether grossing is complete.
4. If the sign-out window is refused, confirm your identity again; an expired confirmation is simply asked for again.
5. If you cannot sign, check the case team in [Case Team](help:report/case-team).
6. If a window does not open, allow pop-ups for PathScribe; the sign-in confirmation can use one.

### When to contact support

Contact your laboratory's PathScribe support when sign-out fails twice with the same message, a report does not release after its countdown, the status does not return after a recall, or the signature window says signing is unavailable. Have the case number and the time of the problem ready.
