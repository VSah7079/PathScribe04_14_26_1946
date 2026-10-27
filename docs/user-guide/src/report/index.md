---
module: Report
workflow: Case Reporting and Sign-Out
role: [Pathologist]
keywords: [report, synoptic, diagnosis, microscopic, sign out, release, preliminary, addendum, AI suggestions, confidence, dictation, templates, comments, history, intraoperative findings]
routes: [/case/:caseId/synoptic, /report/:caseId]
previous: worklist
next: tumor-board
related: [quality, search, worklist, report/sign-out-and-release, report/case-team, report/synoptic-reporting, report/microscopic-and-material, report/billing-review, voice-and-keyboard]
status: Draft
---

# Report {#top}

## Overview

**Purpose.** The Report screen is where a pathologist completes a case: reads the clinical history, gross description and intraoperative findings, answers the synoptic (structured) checklist, writes or reviews the narrative report, adds codes, and signs the case out. It also holds the actions that go with a case in progress: comments, flags, delegation, the case team, history, and corrections after sign-out. A second, read-only view of the same report opens from the Worklist, Search, messages and the quality queues.

**Intended users.** Pathologists. Pathology assistants and others open the same screen for grossing and material work (see [Grossing](help:grossing)); this article covers the reporting and sign-out side.

**Where it fits.** You normally arrive from the [Worklist](help:worklist) by opening a case. When the report is signed out, the case can be flagged for tumor board ([Tumor Board](help:tumor-board)) and is reviewed by quality staff ([Quality & Compliance](help:quality)). Finished cases can be found again with [Search](help:search).

!!! note "Two reporting modes"
    Each case has a reporting mode, set when it is created. You do not choose it.

    - **Orchestration mode.** PathScribe owns the report. You get a **Report Draft** tab where the AI drafts the narrative from your synoptic answers, and you sign the case out in PathScribe with **Sign Out Case**.
    - **Assist mode.** Your laboratory information system (LIS) owns the official report. PathScribe helps you complete the structured (synoptic) data and sends it to the LIS. You finish with **Finalize**; the official sign-out happens in the LIS. There is no Report Draft tab, no Sign Out Case button and no Release as Preliminary button.

    A case with no mode recorded is treated as Assist mode. The sections below say which mode each item applies to.

!!! note "Demonstration data"
    In this version many connected services (the LIS, the printing service, the release timer, similar-case matching, AI suggestions) use demonstration data or are simulated. Where this changes what you see, it is noted below.

## Screen Tour

![The Report screen in Orchestration mode, showing the specimen list, the report area and the bottom action bar](capture:report-overview)

The screen has five zones, from top to bottom and left to right:

1. **Header** across the top, with the patient and case identity, status, priority and counters.
2. **Specimens & Reports** list on the left.
3. **Main area** with tabs: **Report Draft** (Orchestration only), **Synoptic Reporting** and **Material**.
4. **Synoptic panel** on the right: the checklist you answer, with AI suggestions.
5. **Bottom action bar** with the case-level actions and the save, finalize and sign-out buttons.

Below the header a banner reads **Some required fields are incomplete.** while the active synoptic still has required fields open. Select **Click to review →** (or **Review required fields →** in the Report Draft tab) to jump to the first one. The arrow at the right of the banner shows or hides a reminder to complete every required data element (marked with an asterisk) before finalizing.

![The read-only report view opened from the Worklist or Search](capture:report-fullreport)

### Field definitions

**Header**

| Field | What it means |
|---|---|
| Accession, Patient, MRN, Date of Birth, Sex at birth, NHS number (with a status badge), Referring | Identify the case. The header can be shrunk to a single line with **Compact view** and restored with **Full view** to give the report more room. In the Report Draft tab of an Orchestration case it is compact automatically. |
| Priority (Routine, Rush, STAT) | The case priority. If your role may change it, select it and choose **Change case priority**. |
| Case status | The overall status of the case, for example **Case: In progress**. Shown separately from the AI review indicator. |
| Releasing in / remaining | A live countdown, shown after sign-out while the report waits in its release hold (see "Release hold and recall" below). |
| Stage chips | Grossing, Processing, Synoptic, Finalise and Sign Out: where the case is in the workflow. |
| AI status chip | **No AI suggestions yet**, **AI Drafted** (no required field below the confidence limit) or **Review Pending** (a required field is below it). Selecting **Review Pending** opens AI Review Mode (see "AI suggestions"). |
| Data as of (Assist mode) | When the LIS last confirmed this case. **Check now** asks the LIS for the current state. |
| Counter chips | Signed versions, signatures recorded, recorded saves and specimen deficiencies. Each opens its own history window (see "History windows"). |
| Also opened by | Colleagues who have this case open now, and whether they are viewing or editing. Your own other window is listed too. |

**Specimens & Reports (left list)**

| Item | What it means |
|---|---|
| Specimen row | Letter and description of each specimen. Icons let you edit the specimen's details and add or view a specimen comment. |
| Gross, Micro, Synoptic entries | The reports under each specimen. A coloured dot shows **Not started**, **Partially answered** or **All fields answered**. |
| **N unverified** | The number of AI suggestions on that report you have not yet confirmed or overridden. |
| Add Synoptic Report, Add Microscopic Description | Add a checklist or a microscopic narrative to a specimen. |
| Case Comment | A comment that applies to the whole case. **Add Case Comment** becomes **Edit Case Comment** once one exists. |
| Case Hold | Marks the case as on hold. A hold blocks finalizing and sign-out until it is released. |
| Retention Hold | Blocks disposal of the material until released. |
| Review (on a specimen) | The AI re-check suggests that the specimen's checklist template may need to change. Select it to see the proposed change. |

**Main area**

| Field | What it means |
|---|---|
| Report Draft tab | Orchestration only. Three panes: a section navigator, the formatted report (read-only) in the centre, and the section editor. The centre pane shows the template in use (**Chosen by the system**, or **pathologist override**) with a **Change** list. Changing the template regenerates every section. |
| Synoptic Reporting tab | The case's clinical history, gross description, microscopic findings, ancillary studies and intraoperative diagnosis on the left (**Full Patient Report**), with the synoptic checklist on the right. In Assist mode the left text is **Received from LIS, read-only**. |
| Material tab | Blocks, cassettes, slides and stains for the case. Covered in the [Grossing](help:grossing) article. |
| Sequencer | Opens a window to set the order in which the specimen reports appear in the final report. |
| Report status dot | In Orchestration mode a coloured dot on the Report Draft tab shows Draft, In progress, Pending review, Awaiting countersign or Finalized. |

**Synoptic panel (right)**

| Field | What it means |
|---|---|
| Progress badge | Required and total fields answered, for example **3/8 req · 10/21 total**. |
| Required fields | Marked with an asterisk. They must be answered before finalizing. |
| Jump to: | **→ Next Required**, **→ Next Unanswered**, **→ Next Unverified** and **← Back** (return to the field you just left). |
| ☰ Page / ⊟ Tabs | Show every section on one scrolling page, or one section at a time. |
| ⚡ Orchestrator | Regenerates AI suggestions from the current gross description. It never overwrites a field you have already answered. Disabled until a synoptic template is assigned. |
| Suggest Synoptic from Narrative | Fills in AI suggestions from the gross, microscopic and ancillary text. Needs some narrative text first. Orchestration and Assist modes. |
| Generate Narrative from Synoptic | Writes narrative text from your synoptic answers. Needs some synoptic answers first. Orchestration only. |
| $ Billing review | Orchestration only. Switches the panel to a review of billing codes; **← Back to synoptic** returns. |

**AI badges on a field**

| Badge | What it means |
|---|---|
| A percentage, for example 92% | The AI's confidence in its suggestion. Green for 85% and above, amber from 50% to 84%, red below 50%. |
| **AI: low confidence (n%)** | The confidence is below your organisation's limit (75% unless your administrator set another). The suggested value is shown for review; read it carefully. |
| **AI: not found** | The AI read the report text and found no evidence for this field. Fill it in yourself. |
| **Manual — AI missed** | You filled a field the AI had no suggestion for. This helps the AI learn. |
| **✓ AI Confirmed** | You confirmed the suggestion. |
| **✎ Overridden** | You changed the suggested value. |
| **Source not found in report text** | The AI quoted a source that cannot be found in the gross, microscopic or ancillary text. Verify the value yourself. |

### Toolbar

The **bottom action bar** is the toolbar. It scrolls sideways on a narrow window; use the small arrows at either end. Buttons differ by case state and reporting mode, and a button is greyed out when your role does not allow the action (ask your manager).

| Button | What it does |
|---|---|
| ← Prev, Next → | Go to the previous or next case in your list. |
| EMR | Opens the patient record in a side window of the EMR. If the browser blocks the window, a side drawer opens instead. |
| Delegate | Opens the Delegate Case window (see "Delegate and Team"). |
| Team | Opens the case team window: the people on the case and their roles. Only roles valid for the case's laboratory and country are offered. |
| Req. Review | Request an informal peer review from a colleague. |
| Consult | Gives an outside reviewer access for a second opinion. This is demonstration or pilot only and is not real security. |
| History | Opens the patient's history window (see "History windows"). |
| Flags | Opens the Flag Manager to apply or remove flags on the case or specimens. |
| Tumor Board | Flags the case for tumor board or MDT. See [Tumor Board](help:tumor-board). |
| # Codes | Opens the Codes window. The button is amber until the case has a code and teal once it has. |
| Manage Reprints | Reprint requisition, container, cassette and slide labels. |
| Attach images | Attaches images to the report; they print after its pages. |
| Gen. Report / Abort | Orchestration only. Generates the AI report draft from your synoptic answers. While it runs the button becomes **Abort**. |
| Save Draft, Save & Next | Save your work, or save and move to the next case. The icon is blue when there are unsaved changes. |
| Finalize, Finalize & Next | Assist mode only. Opens the review window, then finalizes. |
| Release as Preliminary | Orchestration only, before the case is signed out. Sends the current preliminary findings to the outbound interface now. It does not sign out or finalize the case. |
| Sign Out Case | Orchestration only. Opens the sign-out window. |
| Print | Assist mode, after finalizing. Orchestration printing is in the Report Draft tab. |
| Request Amendment / Addendum | After sign-out: issue a correction or addition to the finalized report. |
| Mark follow-up expected | After sign-out: record that a follow-up specimen is expected. The due date comes from your facility's biopsy-to-resection window. It then reads **Follow-up expected · due** with the date. |
| Gross Complete / Update Gross | Shown instead of the reporting buttons while grossing is still in progress. Used by the grossing team; see [Grossing](help:grossing). |
| ✋ Claim This Case | Only for a case still in a pool. Hides the other case actions until you claim it. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Release countdown banner | After sign-out, a banner shows the status and the time left before the report is released automatically. The signing pathologist also sees **Recall Report**. |
| PRELIMINARY — SUBJECT TO CHANGE | Watermark on a preliminary report. |
| PENDING FINAL RELEASE | Watermark on a copy printed while the report is still in its release hold. |
| Locked badge | A report section that is committed and read-only. Changes after sign-out need an amendment or addendum. |
| Case updated banner | **Someone else saved this case while you have it open.** Choose **Show their changes** or **Later**. What you have not saved is kept. |
| Amendment and revision banners | Show that a report has a correction, amendment or addendum, and who is working on it. |
| Report with addendum, Amended report, Corrected report | Flags that appear on a revised report. |
| Dot beside a report | Not started, partly answered, or all fields answered. |
| Awaiting countersign | A trainee has released the case for an attending's review. |

**More report-screen wording**

- **Unsaved Draft Found.** If you reopen a case after a session ended with unsaved changes, this window offers to restore them. It lists what restoring will change under "Restoring will apply these changes:" (or says no differences were found). **Restore** applies the draft; **Discard Draft** throws it away.
- **Margin ink.** A margin entry that was inked carries a small colour chip. Its tooltip names the colour ("Inked …") and, if the ink was changed, the earlier colours: "Inked … (earlier: …)".
- **NHS number badge.** Beside the NHS number in the patient header, the tooltip says whether the number was verified on the NHS Personal Demographics Service, only passed its check-digit test, failed it, or has not been checked. When the record carries a status code the tooltip ends with "NHS status indicator: …".
- **Returned for revision.** After an attending returns a trainee's specimen, the trainee sees a banner "Returned for revision by …" with the attending's feedback. The attending, after **Return to Trainee** with feedback, sees "Returned to … with your feedback."
- **Comments in the block editor.** The comments box for a block shows "No comments yet." until someone adds one.

### Hotkeys

Quoted keys are those registered for this screen. A key acts only while its button is showing and enabled, and is ignored while another window is open in front. Pressing a key never signs anything for you: the sign-out and finalize windows still ask you to confirm who is signing.

| Key | Action |
|---|---|
| Alt+Shift+X | Sign Out Case (opens the sign-out window) |
| Ctrl+Alt+Shift+O | Sign Out and Next (opens the sign-out window, and when you finish it opens the next case; Assist and Orchestration) |
| Ctrl+Alt+Shift+F | Finalise Report (opens the review checks) |
| Ctrl+Alt+Escape | Cancel Finalise |
| Ctrl+Alt+E | Add Amendment |
| Ctrl+Alt+Shift+B | Add Addendum |
| Alt+H | Open History. Alt+Shift+H closes it. |
| Ctrl+Alt+G or Ctrl+Alt+H | Open the Codes window |
| Alt+I | Internal Note |
| Alt+Z | Add Synoptic |
| Alt+E | Edit (override) the active field |
| Ctrl+Alt+Shift+A | Confirm the active field |
| Ctrl+Alt+Shift+R / Ctrl+Alt+U | Next required field / next unanswered field |
| Tab / Shift+Tab | Next and previous field |
| Ctrl+Alt+C / Ctrl+Alt+S | Case comment / specimen comment |
| Ctrl+S | Orchestration, Report Draft tab: save the draft |
| Ctrl+G | Orchestration, Report Draft tab: generate the report |
| Ctrl+Shift+D, Ctrl+Shift+F, Ctrl+Shift+Q | Orchestration: switch to Report Draft, Full Report, Sequencer |
| Alt+1 to Alt+9 | Orchestration, Report Draft tab: jump to that section (not while typing in a field) |
| Space or the right arrow, O, S, Esc | In AI Review Mode: confirm, override, skip, cancel |

Alt+N on this screen adds a specimen (it covers Next Case, which you reach with Alt+J then N). Alt+U asks for confirmation before discarding unsaved changes. Printing the current cassette is Alt+Shift+O. Spoken commands: on this screen "back" and "forward" move between sections; they do not leave the page. F1 (View Help) opens this guide; Alt+V is Full View.

## Step-by-Step Procedures

### Standard workflow

**Part 1: Open the case and read it**

1. Open the case from the [Worklist](help:worklist). The Report screen opens on the **Synoptic Reporting** tab (or **Report Draft** in Orchestration mode).
2. Check the header: patient, accession, priority and status. If another person is listed under **Also opened by**, agree who is editing.
3. In the **Full Patient Report** pane read the clinical history, gross description, intraoperative diagnosis, microscopic findings and ancillary studies. Select **Internal Notes** to read notes colleagues left; internal notes are not included in the formatted patient report.
4. If a **Case On Hold** or **Retention Hold** is shown in the left list, you cannot sign out until the hold is released (see Exception handling).

**Part 2: Describe what you see**

5. Select the specimen in the left list, then **Add Microscopic Description** if your case needs one. Type, or press the microphone with the field focused to dictate. You may insert the standard attestation and add detail only when clinically needed. Select **✓ Save**.
6. Select **Add Synoptic Report** if the specimen has no checklist, and pick a template from **Suggested for this case** or **All templates**. The checklist opens in the right panel.

**Part 3: Complete the synoptic checklist**

7. Work through the sections. Answer each required field (marked *). Use **→ Next Required** to move quickly.
8. If you use the AI tools, select **Suggest Synoptic from Narrative** (or **⚡ Orchestrator**). Suggestions appear on fields with a confidence badge.
9. For each AI suggestion, select **✓ Confirm** if it is right, or **✎ Override** and enter the correct value. A suggestion you have not confirmed or overridden counts as unverified, and **a required field left unverified blocks finalizing**.
10. Use **→ Next Unverified** to reach the remaining ones. Fields marked **AI: low confidence** or **Source not found in report text** deserve a careful read against the narrative.
11. Select **Save Draft** at any time. The save icon is blue when something is unsaved.

**Part 4: Write the report (Orchestration mode)**

12. Open the **Report Draft** tab and select **⚡ Gen. Report** (or Ctrl+G). Sections appear as they are generated. If you have not completed the synoptic yet, the empty state offers **Start writing manually**, which opens blank sections with no AI involved.
13. In the section editor, edit each section. Select **Accept** to accept it, or **Accept all**. A section marked **Locked** has been committed and cannot be edited without an amendment.
14. If you change the narrative after answering fields, a field may show "The updated narrative suggests ... Keep your value or update it?" Select **Keep mine** or **Accept new value**. Nothing changes until you choose.

**Part 5: Add codes**

15. Select **# Codes**. In the Code Manager search the code system (for example ICD-10, SNOMED or CPT), pick a code, choose where it applies (case level or a specimen) and select **Apply code**. **AI Suggest Codes** proposes codes for your review. Select **Save**.

**Part 6: Sign out (Orchestration mode)**

16. Select **Sign Out Case**. The system first runs its review checks (see "Sign-out checks" below). If a check stops you, a message or window says why; fix it and select **Sign Out Case** again.
17. In the sign-out window read the **Coding Summary**. Tick **A follow-up specimen (resection or excision) is expected** if it applies.
18. Confirm who is signing as the window asks (your password, your organisation's sign-in page, or a second-factor code, depending on your laboratory). Select **Sign Out Case**.
19. A message reads **Report signed — release in n min unless recalled**. The case moves to Pending Release, and the banner counts down.

**Part 7: Finalize (Assist mode)**

20. Select **Finalize** (or **Finalize & Next**). The same review checks run.
21. In the **Review before finalising** window, check the synoptic data **as transmitted to LIS**. You can drag specimens to set the transmission order. Select **Finalise now** (or **Finalise & Next**) and confirm who is signing.
22. The bar shows **Finalized — structured data complete, LIS handles official sign-out**. The official sign-out happens in the LIS.

### Alternative workflow

1. **Release a preliminary report (Orchestration).** Select **Release as Preliminary** at any point before final sign-out, for example when a partial finding is clinically urgent. A message reads **Preliminary report released (n specimens)**, or says it is held for the release delay and goes out at a stated time. The case stays open and the report carries the PRELIMINARY watermark.
2. **Start from the narrative.** Dictate or type the gross and microscopic text first, then select **Suggest Synoptic from Narrative** to have the checklist filled in for your review.
3. **AI Review Mode.** When the header chip says **Review Pending**, select it. One uncertain AI finding is shown at a time ("Field 2 of 5") with its confidence and source. Press Space to confirm, O to override or S to skip. The footer can offer **Confirm & Finalise** at the last finding.
4. **Read-only view.** From the Worklist, Search, a message or a quality queue, a case can open in the read-only report view. It shows the accession, **Last Updated**, the full report and its internal notes. **← Back** returns where you came from. For a pool case, **✋ Claim This Case** appears. Quality staff reviewing a signed-out case see the post-sign-out review bar here.
5. **Comments.** Use **Add Case Comment** for a note to everyone on the case, or the specimen comment icon for one specimen. Comments on a specimen are sent to the LIS on finalization and become read-only when finalized. **Internal Notes** are for the team and are not part of the patient report.
6. **Delegate.** Select **Delegate**, pick a **Delegation Type**, then a recipient (an individual or a pool) from the right-hand list by dragging or selecting. Enter the note (required) and select **Confirm Delegation**. A type marked "transfers ownership" hands the case over. You cannot delegate to a cytotechnologist.
7. **Correct a signed-out report.** Select **Request Amendment / Addendum**. Choose an addendum (new information, original untouched), a minor amendment (a clerical correction) or a major amendment (a diagnostic change that needs a clinical notification record). Give the reason and explanation, then **Save Draft** or **Release Addendum**.

### Exception handling

1. **Required fields incomplete.** A window titled **Required fields incomplete** lists the fields ("n fields need attention", tagged **Cannot finalize**). Select a field name to go to it, or **Return and fix**.
2. **AI suggestions unverified.** A message reads "n AI suggestions still need your review before this case can be finalized — starting with ..." and takes you to the first one. Confirm or override each required one.
3. **Case on hold.** The message "This case is on hold: ... release the hold before finalizing" appears. Open **Case Hold** in the left list and release the hold with a note, or wait for the person who placed it.
4. **Critical or malignant finding.** A window lists the findings the system detected and asks you to record the notification before you continue.
5. **Microscopic text blocking.** A specimen with an unsaved or inconsistent microscopic description stops sign-out ("Specimen A: ..."). The screen opens that specimen's microscopic panel.
6. **Count or total problems.** A message beginning "Sign-out stopped." explains a number that cannot be right (for example a count larger than the total it belongs to). Correct it. If the system only warns that totals do not match the grid, you may **Go back and reconcile** or **Continue as entered**.
7. **Sign-out gates.** Windows may stop you for: collection or receipt dates missing, fixation time out of range, a stain quality-control issue, a margin-inking issue, a clinical mismatch to decide, or a required peer review. Resolve the item in its window; sign-out then continues. The inking window blocks sign-out when the issue is compliance critical.
8. **Missing codes.** If your country requires a code system and the case has none, the system asks you to confirm before signing out and records that you proceeded.
9. **Trainee sign-out.** If your role or case team requires a countersign, **Sign Out Case** instead releases the case for the attending ("Case ... released for attending countersign"). The attending sees **Countersign Case**, with optional feedback, and **Return to Trainee** (feedback is required to return).
10. **Someone else changed the case.** The window **Someone else changed this case** lets you **Use their version** (your unsaved changes are discarded), **Save mine anyway** (if your role allows overwriting) or **Keep working, decide later**. If the changes do not overlap, **Save mine with theirs** merges them.
11. **Pending release.** You cannot sign out a report that is already Pending Release. Recall it first.

### Error recovery

1. **Sign-out did not complete.** The message "The sign-out could not be completed, so the case was left as it was" means nothing changed. Try again. If it says the status could not be put back, reload the case and check it before trying again.
2. **Wrong signer or expired confirmation.** Messages such as "The signature confirmation has expired" or "Signing is locked after too many failed attempts" mean nothing was signed. Confirm again, or try after the time shown.
3. **Recall a signed report.** While the banner counts down, the signing pathologist selects **Recall Report**. You can then keep editing without making an amendment. Others see the countdown but not the button.
4. **Draft lost.** If a draft recovery window appears when you reopen a case, choose to restore it.
5. **Unsaved warning.** Leaving the case with unsaved changes asks whether to save. In the Report Draft tab, switching tabs asks **Save & switch** or **Discard & switch**.
6. **PDF failure.** If the report cannot be made as a PDF, a message says it is **Printing from the screen instead**.
7. **Wrong narrative inserted.** Generated narrative opens in a review window ("Review and edit before inserting into the report") where you can edit or **Discard** before it is inserted.

## Sign-out checks

Sign Out Case and Finalize run the same review checks before anything is signed, in this order. The first one that fails stops the process:

1. The report is not already Pending Release.
2. The case is not on hold.
3. Organ-map figures are current, Mohs blocks are complete, and derived margins agree with the answers.
4. Counts and totals in the synoptic are consistent.
5. Margins and molecular results that differ from what the AI or the order expected are confirmed by you.
6. Microscopic descriptions are saved and complete.
7. Critical or malignant findings have been acknowledged.
8. Every visible required field is answered, and no required AI suggestion is unverified. Sign Out Case checks every unfinished synoptic on the case; Finalize checks the synoptic you have open.

After these, the sign-out also checks your authority to sign, the collection and fixation gates, stain quality control, inking, clinical mismatch and peer review, as described under Exception handling.

## Release hold and recall

After sign-out a report waits in a release hold before it is sent out. The length is set by your laboratory (and can differ by facility); some cases bypass it. While the hold runs:

- The header shows **Releasing in** a countdown, and the banner repeats it.
- Only the signing pathologist can **Recall Report**. A recall sends nothing and reopens the case.
- Printing is limited. A print prompt warns that a copy will carry the PENDING FINAL RELEASE watermark; a supervisor override asks for a reason that is kept in the audit log.
- When the countdown ends, the message **Release buffer expired — report finalized and released** appears.

!!! warning "The release timer runs in your open window"
    Today the countdown that releases the report is run by the open Report screen. It is correct for the window you have open, but it is not yet backed by a separate scheduler that would release a case nobody has open. Do not close the case window during the hold if you expect an on-time release.

## Assist and Orchestration modes

| Item | Orchestration | Assist |
|---|---|---|
| Who owns the final report | PathScribe | Your LIS |
| Report Draft tab | Yes | No |
| Generate Narrative from Synoptic, Gen. Report | Yes | No |
| Suggest Synoptic from Narrative | Yes | Yes |
| Final button | Sign Out Case and Sign Out & Next | Finalize and Finalize & Next |
| Release as Preliminary | Yes | No |
| Left text panes | Editable | Received from LIS, read-only |
| Codes | Billing codes and review | CPT code is recorded for productivity (RVU) tracking only; the LIS owns real billing |
| Sign Out and Next key | Works (arms the next case; see [Sign Out and Release](help:report/sign-out-and-release)) | Works |

## Buttons, banners and tooltips on the Report screen

These small items appear on the Report screen. Hover over a button to see its tooltip.

### Bottom action bar tooltips

| Button | Tooltip and what it does |
|---|---|
| Save Draft | Saves the report so far. **Save and go to next case** (the Save and Next button) saves and then opens the next case in your list. |
| Finalize | **Finalize this report** (Assist mode). **Finalize and go to next case** does the same and then moves on. Both are unavailable while the synoptic is still being worked out. |
| Abort | **Abort generation**: stops a report that is being generated. |
| Delegate, Team, Review, Consult | **Manage case team** opens the case team window. **Request informal peer review** opens the review request. |
| Print | **Print this report**. While a report waits in the release hold, the tooltip explains that printing is restricted. |
| Follow-up | When a case is marked for follow-up the bar shows the date with the tooltip **Marked by {name}**. |
| Arrows at either end | **Scroll left for more actions** and **Scroll right for more actions** move the bar when it is wider than the window. |

### Header bar

- **Show full patient header** (tooltip) expands the compact header back to the full patient details.
- **Overall case status** (tooltip) is the status badge at the top right of the header.
- The block list in the header shows, for each block, its stains (or "no stains yet"), its status, and the case priority. When a block has its own priority a small tooltip reads **Priority override**.
- In the AI summary, **Field at {{pct}}% confidence** names the single field with the lowest confidence. **No required fields below threshold** means every required field the AI filled in is above your laboratory's confidence limit.

### Left report panel and sidebar

- The left panel says **No case loaded.** when no case could be opened.
- The synoptic sidebar collapses with **Collapse sidebar** and comes back with **Expand sidebar**.
- Under Case Comment, the line **Applies to entire case** shows once a case comment exists.
- When a hold is active the button reads Case On Hold, with the line **Blocks finalize until released**.
- On each specimen, the pencil icon (tooltip **Edit specimen details**) opens the specimen editor. On each synoptic report the icon **Parts covered** shows which parts it covers, and the bin icon (**Remove this synoptic report**) opens **Remove Synoptic Report**. Choose **Remove** to confirm or **Keep** to leave it; the removal can still be undone until you save the case.

### Banners

- **Got it**: shown on the yellow banner that says someone else changed the same parts you have not saved. Their other changes are shown and yours are kept as typed. Choose **Got it** to dismiss the banner; you decide what to keep when you save.
- **You, in another window**: in the strip that shows who else has the case open, your own second window appears under this name.
- **Amended (Most Recent)**: in the amended report banner the newest version is named, for example "2nd Amended (Most Recent)". **Show details** expands the table, **Synoptic Element** is the first column, and the lines **Reason for Amendment:** and **Amended by** give the explanation and the pathologist.
- **Triage overridden: reason** appears in the grossing release panel when a triage was released by override.
- **Billing**: see [Billing Review](help:report/billing-review).

### Narrative sections in Orchestration mode

| Item | Meaning |
|---|---|
| Tab view — one section at a time / Page view — all sections scrollable | The two layout buttons above the sections. |
| Accept all AI-generated sections | Accepts every section the AI wrote that you have not edited. |
| Check spelling and accept this section | The tick on a section: runs spell check and accepts it. |
| No sections yet — run Generate Report | Shown on the **Next empty** button before any section exists. |
| Complete the synoptic fields, then press Generate Report to create an AI-drafted narrative. | The empty-state message of the narrative panel. |
| New AI draft available for this section. | A newer AI draft arrived for a section you have edited. Choose **Use new draft** to replace your text or **Keep my version** to ignore the new draft. |
| Save as Personal Quick Text | Opens when you select text and choose to keep it. Give it a **Voice Trigger** (for example "normal colon comment") and save. It is saved for you at the laboratory shown; if none is found the window says "no facility resolved for this case". |

## Tips and Best Practices

### Common mistakes

- Leaving AI suggestions unverified. A required field that is unverified blocks sign-out even if the value looks right. Confirm or override it.
- Treating a high percentage as proof. A confident suggestion with **Source not found in report text** has not been matched to your narrative. Read it.
- Looking for Sign Out Case on an Assist case. Assist cases use **Finalize**; the LIS signs out.
- Editing after sign-out. Sections are locked; use **Request Amendment / Addendum**, or **Recall Report** while the hold is still running.
- Changing the template late. It regenerates every section in the Report Draft tab.

### Efficiency recommendations

- Use **→ Next Required** and **→ Next Unverified** instead of scrolling.
- Choose **Tabs** view for long checklists and **Page** view for a quick scan. Use **Compact view** in the header for more room.
- Dictate directly into the microscopic and report sections; saved quick texts can be inserted by their voice trigger.
- Use **Save & Next** and **Finalize & Next** to stay in flow.
- Use the hotkeys listed above in place of the mouse for sign-out, history and codes.

### Workflow recommendations

- Complete the narrative first when you dictate; let the AI suggest the checklist and review it. Complete the checklist first when you work from a protocol; let the AI draft the narrative.
- Clear holds and critical-finding notifications before you start sign-out so the checks pass at the first attempt.
- Use **Release as Preliminary** only for findings that are clinically urgent; it does not close the case.
- Check the **Coding Summary** in the sign-out window; a specimen with ancillary codes but no base code shows **Assign now**.

## Related Features

### Upstream workflow

- [Worklist](help:worklist): open the case to report.
- [Grossing](help:grossing): the gross description and material you read here.
- [Intraop Queue](help:intraop-queue): the intraoperative findings shown in the report.
- [Synoptic Reporting](help:report/synoptic-reporting): answering fields, Edit Field, dictation and AI suggestions.
- [Microscopic and Material](help:report/microscopic-and-material): the microscopic panel, Material tab, history, images and comments.
- [Case Team](help:report/case-team): collaborators, delegation, Flag for MDT and review requests.
- [Billing Review](help:report/billing-review): AI billing code review, Smart Capture, charge approval and billing corrections.
- [Voice and Keyboard](help:voice-and-keyboard): every command, key and phrase.

### Downstream workflow

- [Sign Out and Release](help:report/sign-out-and-release): Sign Out Case, Sign Out and Next, the release delay, addenda and amendments.
- [Tumor Board](help:tumor-board): flag and manage MDT listing.
- [Quality & Compliance](help:quality): post-sign-out review and deficiencies.
- [Search](help:search): find the completed case.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| No Sign Out Case button | The case is in Assist mode, is a pool case, grossing is not complete, the report is already signed out or pending release, or the synoptic reports are not all complete. |
| Sign Out Case or Finalize is greyed out | Your role does not allow it, or the synoptic layout is still being checked. Ask your manager if it stays grey. |
| "n AI suggestions still need your review" | A required field has an AI suggestion that is not confirmed or overridden. |
| "This case is on hold" | A case hold is active. |
| Cannot print | The report is in its release hold, the case is restricted, or your role does not allow printing. |
| "Someone else saved this case" | A colleague saved a change while you had the case open. |
| Cannot recall | Only the person who signed out the case can recall it, and only before the countdown ends. |
| Codes will not apply | The code system or your role does not allow it. OPCS-4 codes come from a short demonstration list and cannot be applied to a case. |

### Resolution steps

1. Read the message on screen; it names the field, specimen or hold that stopped you.
2. Fix that item and try again.
3. If a button is missing, check the reporting mode and the case state in the header.
4. If the screen looks out of date, choose **Show their changes**, or reload the case.
5. If a window does not open, allow pop-ups for PathScribe (the EMR and sign-in windows use them).

### When to contact support

Contact your laboratory's PathScribe support when sign-out fails twice with the same message, a report does not release after its countdown, the status will not change after a recall, or the signature window says signing is unavailable. Have the case number and the time of the problem ready.
