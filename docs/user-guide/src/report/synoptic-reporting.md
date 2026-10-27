---
module: Report
screen: Synoptic Reporting
workflow: Case Reporting and Sign-Out
role: [Pathologist, Fellow, Resident, Pathology Assistant]
routes: []
keywords: [synoptic, protocol, template, CAP, RCPath, ICCR, required field, conditional field, edit field, confirm field, AI suggestion, confidence, codes, SNOMED, ICD-10, margin, staging, Mohs, organ map, right panel, orchestration, dictation, enter gross, enter diagnosis]
previous: report/case-team
next: report/microscopic-and-material
related: [report, report/sign-out-and-release, report/microscopic-and-material, voice-and-keyboard, wsi-viewer, tumor-board]
status: Draft
---

# Synoptic Reporting {#top}

## Overview

**Purpose.** A synoptic report is a structured checklist: a protocol for the organ and diagnosis, made of questions with fixed answers (histologic type, grade, margins, stage and so on). This article explains how to add a protocol to a specimen, answer the fields, work through the AI's suggestions, apply codes, use the voice and keyboard commands that move around the checklist, and how the checklist relates to the narrative **Report Draft** in Orchestration mode.

**Intended users.** Pathologists, fellows and residents who complete the diagnostic report. Pathology assistants see the same checklist when it is part of their grossing work.

**Where it fits.** The synoptic panel sits on the [Report](help:report) screen (route `/case/:caseId/synoptic`, described in that article). Its answers feed the narrative draft and the sign-out checks (see [Sign Out and Release](help:report/sign-out-and-release)). Gross, microscopic and ancillary text is entered on the other tabs (see [Microscopic and Material](help:report/microscopic-and-material)).

!!! note "Template library today"
    The protocol templates that ship with PathScribe are generic, PathScribe-authored placeholders (organ-system protocols for breast, prostate, kidney, lung, colon, skin and others, plus PathScribe's own Mohs, oral cavity and neck dissection checklists, cytology, grossing and one autopsy template). The licensed College of American Pathologists (CAP) and Royal College of Pathologists (RCPath) wording is not shipped: a site needs its own licence before those exact protocols can be loaded. The protocol list shows the source and version of each template, so check them against what your laboratory has approved.

!!! note "AI behaviour is simulated in demonstration builds"
    The AI suggestions described below are produced by PathScribe's demonstration AI unless your site has connected a validated model. Treat every suggestion as a draft that a pathologist must verify.

## Screen Tour

![The Report screen with the Synoptic Reporting tab and the right synoptic panel](capture:report-synoptic-reporting-panel)

The Report screen has up to three tabs above the work area: **Report Draft** (shown only in Orchestration mode), **Synoptic Reporting** and **Material**. The synoptic checklist can also appear in a panel at the right of the screen next to the narrative text.

### Field definitions

**Add Synoptic Report window** (opens from **Add Synoptic**, or when a specimen has no protocol yet, from the template picker)

| Field | What it means |
|---|---|
| Select Specimens | Tick the specimen(s) the protocol will cover. A badge shows how many are selected. A specimen that already has a report is marked **Report exists**. |
| Search protocols by name, source, or organ… | Narrows the list as you type. |
| Filter chips | **All**, **Breast**, **Colon**, **Lung**, **Prostate**. |
| Protocol list | Each template shows its source, version and category. **Suggested · n%** marks the protocol the AI recommends for the specimen; **Applied** marks one already on the case. |
| Learn this pairing | Tick it so the AI suggests this protocol for similar specimens in future cases. |
| Don't see what you need? Request a template | Sends a request for a new template. |
| Add Report | Adds the protocol to the selected specimens. The footer says "Select specimen(s) and a protocol to continue" until you have chosen both, then "Adding "name" to n specimen(s)". |

**Template picker inside the panel** (shown when the active specimen has no synoptic yet)

| Field | What it means |
|---|---|
| Synoptic Report | Heading. The subtitle says no synoptic report is associated with the specimen yet and asks you to pick one. |
| Suggested for this case | Templates matching the case. |
| All templates | Every approved template. If none exist, the message is "No approved synoptic templates are available." |

**The checklist (right synoptic panel and Synoptic Reporting tab)**

| Field | What it means |
|---|---|
| Progress badge | For example "3/5 req · 8/20 total": required fields answered of required total, then all fields answered of all fields. |
| Assignment | Shows who the synoptic is assigned to. When it is assigned to someone else the line reads "This synoptic is assigned to (name), they must finalise it"; when it is yours the header shows "Assigned to you". A **countersign required** note appears when the protocol needs a second signature. |
| Required marker | A red asterisk (*) after the field name. Every required field must be answered before finalising. |
| Field controls | One of: single-line text, long text (with spell check), number, drop-down (— Select —), radio buttons, tick boxes (multiple answers), a per-part grid, or the organ map for Mohs stages. |
| Check notes | A red note under a field when what you typed cannot be right, for example "Enter a whole number, 0 or more", "Enter a whole number, "cannot be determined" or "at least N"", or "(value) is more than the (limit) it can't exceed". |
| Part grid | A table with one row per part of the case and one column per measurement (for example positive nodes by part). Counts must be whole numbers; a total typed in the field must match the grid or you are asked to reconcile (see Exception handling). |

**AI badges on a field**

| Badge | What it means |
|---|---|
| AI Confirmed | You (or Confirm) accepted the AI's value. |
| Overridden | You replaced the AI's value. |
| Check source | The AI offered a value that needs a closer look. Hovering says "Compare with the source text before confirming". Your laboratory's setup can instead show "AI: low confidence (n%)" with the score. |
| Tinted field with a dashed edge in Windows high-contrast mode | The field holds an AI value you have not confirmed or overridden. See "AI values you have not confirmed" below. |
| AI: not found | The AI read the narrative and found no evidence for the field. Fill it in yourself. |
| Manual, AI missed | You answered a field the AI had no suggestion for. The wording says this helps train the AI. |
| Source not found in report text | The AI quoted a source that cannot be found in the Gross, Microscopic or Ancillary text. Verify the value by hand. |

### Toolbar

| Button | What it does |
|---|---|
| **Orchestrator** (lightning icon) | Regenerates the AI suggestions for this synoptic from the current Gross description. It never overwrites a field you have already answered. It is greyed out when no template is assigned to the specimen ("nothing to regenerate against"), and shows Generating… while it works. |
| **Jump to:** Next Required, Next Unanswered, Next Unverified | Moves to the next field of that kind. Next Unverified finds AI values that have not yet been confirmed or overridden. |
| **Back** | Returns to the field you were just on. Greyed out when there is nowhere to go back to. |
| **Tabs / Page** | Tab view shows one section at a time; Page view shows all sections on one scrolling page. |
| Section tabs | Each tab shows how many AI suggestions on it are awaiting review ("n unverified"). |
| **Confirm** on a field | Accepts the AI value. |
| **Override** on a field | Lets you choose a different value. |
| **undo** on a field | Reverses a confirm or override. |
| **Suggest Synoptic from Narrative** | Asks the AI to suggest synoptic answers from the gross, microscopic and ancillary text. Greyed out ("Enter a gross, microscopic or ancillary narrative first") when there is no text. |
| **Generate Narrative from Synoptic** | Writes narrative text from the current answers. Greyed out ("Answer some synoptic fields first") when nothing is answered. |
| **Codes** | Opens the Codes window (see below). |

### Icons and status indicators

- A red asterisk marks a required field.
- The progress badge counts answered fields. Required fields are what block finalising.
- The "Some required fields are incomplete" banner appears when required fields are open. Its link, **Review required fields**, jumps to them.
- A field whose answer depends on another answer is hidden until the answer that triggers it is given (see Conditional fields).
- After you edit the narrative, a note under a field you answered yourself may say "The updated narrative suggests (value) ((n)% confidence). Keep your value or update it?" with **Keep mine** and **Accept new value**. PathScribe never applies this on its own.

### Hotkeys

These are the default keys; voice phrases are the English ones (French, German, Dutch and Korean phrases also exist).

| Action | Keyboard | Voice phrases |
|---|---|---|
| Edit Field | Alt+E | "edit field", "change field", "correct field", "modify field", "override field" |
| Confirm Field | Ctrl+Alt+Shift+A | "confirm field", "accept field", "approve field", "confirm answer", "accept answer" |
| Next Unanswered Field | Ctrl+Alt+U | "next unanswered", "go to next unanswered", "next empty field", "next blank" |
| Next Required Field | Ctrl+Alt+Shift+R | "next required", "go to next required", "next required field", "show required" |
| Skip Field | Ctrl+Alt+Q | "skip field", "skip this field", "move on", "leave blank" |
| Full View / Tabbed View | Alt+V / Ctrl+Alt+T | "full view", "show full view"; tabbed view phrases are in the registry |
| Add Synoptic | Alt+Z | "add synoptic", "open add synoptic", "add report", "new synoptic" |
| Add Code / Go to Codes | Ctrl+Alt+H / Ctrl+Alt+G | "add code", "open add code", "new code", "add medical code" |
| Enter Gross Description | Ctrl+Alt+Shift+G | "enter gross", "start gross", "dictate gross", "gross description" |
| Enter Microscopic Description | Alt+Shift+G | "enter micro", "start micro", "dictate micro", "microscopic description" |
| Enter Diagnosis | Ctrl+Alt+Shift+D | "enter diagnosis", "start diagnosis", "dictate diagnosis", "add diagnosis" |
| Cancel (stop or discard dictation, close a window) | Ctrl+Alt+J | "cancel", "close modal", "dismiss", "go back to report" |
| Confirm AI finding (AI Review window) | Space | "confirm finding" |
| Override AI finding | O | see the registry |
| Skip AI finding | S | see the registry |

!!! note "Voice and keyboard are not security"
    The keys and phrases are shortcuts. They do not replace the permission checks on actions such as sign-out.

## Step-by-Step Procedures

### Standard workflow

**Add a protocol and complete it**

1. On the Report screen select **Add Synoptic** (or press Alt+Z, or say "add synoptic"). The **Add Synoptic Report** window opens.
2. Under **Select Specimens**, tick the specimen(s) the protocol covers. A specimen that already has a report shows **Report exists**.
3. Pick a protocol. Use the filter chips or the search box if the list is long. A protocol marked **Suggested** is the AI's recommendation. Tick **Learn this pairing** if you want the AI to propose this protocol for similar specimens later.
4. Select **Add Report**. The window closes and the checklist for the protocol appears in the panel.
5. Look at the progress badge. Select **Next Required** (or press Ctrl+Alt+Shift+R) to land on the first required field that has no answer.
6. Answer each field. Click the field or use the control: choose from the drop-down, tick a radio button or boxes, type text or a number. The badge counts up as you answer.
7. Where a field shows an AI value and badge, read the source (hover the badge or click the field to highlight the matching text in the report) and select **Confirm** if it is right, or **Override** and pick another value.
8. Continue until the "Some required fields are incomplete" banner goes away and the badge shows all required fields answered.
9. Open **Codes** to apply any codes the laboratory needs (see below), then continue to sign-out.

**Let the AI draft the answers from your narrative**

1. Enter or dictate the Gross, Microscopic and Ancillary text.
2. Select **Suggest Synoptic from Narrative**. The button shows Suggesting… and then fields fill with AI values and badges.
3. Use **Next Unverified** to step through values you have not yet confirmed. Confirm or override each.
4. Fields where the AI could not find evidence show **AI: not found**. Fill them yourself.

**Answer by keyboard or voice**

1. Say "next required" (or press Ctrl+Alt+Shift+R). The cursor moves to the field.
2. Say "edit field" (or press Alt+E) to put the cursor in the field and speak or type the answer. See "Edit Field" below.
3. Say "confirm field" (or press Ctrl+Alt+Shift+A) to accept the AI value for the current field.
4. Repeat from step 1.

### Alternative workflow

**Edit Field.** Alt+E, or the voice command "edit field", gives the keyboard focus to the answer of the synoptic field you are on, so you can type or dictate straight into it. It works on answers in the synoptic panel (since Batch 665). It does not do anything useful on the narrative Report Draft; use the section editor there.

**Dictation into the narrative.** "Enter gross", "enter micro" and "enter diagnosis" start dictation into the matching section of the Report Draft. Enter Gross and Enter Diagnosis act on the Report Draft only, so open the Report Draft tab (Orchestration mode) first. The dictation banner reads "DICTATING INTO" followed by the section, with "Say "done" or click to stop". Say "done", or click the banner, to stop.

**Cancel (Ctrl+Alt+J or "cancel").** While dictating, the first cancel stops the dictation ("Dictation stopped."). A second cancel removes what you dictated ("Dictation removed."); if you edited some of the passages in the meantime, those are kept ("Dictation removed. Passages you edited were kept."). If you cancel once and wait, the message "Cancel again to remove what you dictated." tells you what a second cancel will do. Outside dictation, cancel closes the window in front.

**AI values you have not confirmed.** A field that holds an AI value you have not confirmed or overridden is tinted so you can see it. Nothing is hidden or blocked for an optional field, but the value will not be in the signed report: when you press **Sign Out Case** or **Finalize**, PathScribe clears every optional field that still holds an unchanged, unconfirmed AI value before the sign-out window opens, and the window says how many ("n optional AI-filled fields you have not confirmed were left out of this report"). The AI suggestion stays beside the field, so you can cancel, select **Confirm**, and the value returns. A value you edited yourself is yours and is kept. A required field with an unconfirmed AI value still stops the sign-out. The same rule applies to the grossing report when you complete the gross on this page in Orchestration mode. Each omission is recorded in the audit log (the count only, no values).

**Values filled in for you.** If your laboratory has switched on auto-insert, or you select the **Orchestrator** (lightning icon), PathScribe fills empty fields with AI values. These stay unconfirmed, tinted and subject to the rule above, and the fill is recorded in the audit log. A field you already answered is never replaced.

**AI Review before finalising.** In Orchestration mode an **AI Review Mode** window titled "Review uncertain AI findings before sign-out" can step you through the findings the AI is least sure of, one at a time ("Field 2 of 6"). Each shows its confidence (where your laboratory's setup shows scores) and, where relevant, a banner "Source not found in report text". Press Space to confirm and go on, **O** to override, **S** to skip. Skipped findings are counted ("1 skipped"). On the last finding the confirm button reads "Space - Confirm & Finalise".

**Change the protocol.** When microscopic findings suggest a different protocol, a window "Protocol adjustments proposed" lists each change as Current and Proposed with the AI's reason and confidence. Tick the changes you want, select **Apply n change(s)**, or select **Keep existing protocols**.

**Codes window.** Select **Codes** (Ctrl+Alt+G), or **Add Code** (Ctrl+Alt+H). Both open the Code Manager window, titled **Codes**. Codes the AI suggests under **AI Suggested Codes — review and apply** each show **Strong match** or **Possible match**. The label says how closely your case wording matches the code's description. It is not a chance that the code is correct, and a code is added only when you apply it. Each suggestion also says **Checked origin:** which part of the case the code was taken from (the report narrative, the gross or microscopic description, the ancillary studies or the synoptic answers, and the specimen when the text names one), or "Origin not stated" when that cannot be confirmed. The software checks only that the named part exists and holds text; no person has verified the origin, so read the suggestion against the case yourself (hover the line for this note). The description beside the code is the official wording from the code dictionary, and a tick means the code was found there. Read the suggestion against your own diagnosis before you apply it. (A laboratory profile that shows scores displays a percentage instead.)

1. Choose the code system. SNOMED CT, ICD-10, CPT, LOINC and others appear as tabs. A code system marked **Required** is required for your jurisdiction; sign-out asks first if it has no code. A system that your jurisdiction does not allow is refused: "(system) is not allowed for this jurisdiction, so the code was not added."
2. Type a code or a term in the search box. For SNOMED you can narrow with the filters **All**, **Anatomy**, **Morphology**, **Organism**, **Specimen**. The hint text suggests what to type (for example a diagnosis, site, specimen type or organism for SNOMED; a code such as C50 for ICD-10; a test name or LOINC number for LOINC).
3. Choose where the code goes: **Case Level** or a specimen (the "Applying to" line shows the target). Click a result to apply it. A code already applied shows how many times ("Applied ×2"); click again to add another instance.
4. Select **AI Suggest Codes** to have the AI propose codes. Review the "AI Suggested Codes, review and apply" list and apply only what you agree with. Suggestions that cannot be verified are left out and the window says how many.
5. Use **Remove code**, **Remove this instance** or **Undo removal** to change your mind, then select **Save**. If you close with unsaved changes you are asked "You have unsaved changes. Close without saving?"

**Billing codes (CPT).** The billing code search ("Search Billing Codes") can apply a CPT code to a block, stain or specimen. In Assist mode the window says: "Assist mode: this records a CPT code for RVU/productivity tracking only, your LIS owns real billing for this case." The RVU figure is labelled **Estimate**: "Rough RVU estimate only, not a precision billing determination."

### Exception handling

- **Template missing.** If the specimen has no protocol, the panel shows the template picker. If the list is empty, the message is "No approved synoptic templates are available." Ask your template administrator.
- **Orchestrator button is grey.** No template is assigned to the specimen yet. Add a protocol first.
- **Generate Narrative is grey.** Answer at least some fields first.
- **Suggest Synoptic is grey.** Enter some gross, microscopic or ancillary text first.
- **Totals do not match the grid.** A window "Totals don't match the grid" says what you entered and what the grid adds up to. Choose **Go back and reconcile**, or **Continue as entered** to keep the typed total. At sign-out the same check can stop you with "Sign-out stopped." followed by the problem; a draft save can fail with "The draft wasn't saved." followed by the problem.
- **Number errors.** A count must be a whole number of 0 or more. A node count field also accepts "cannot be determined" or "at least N". A value over its limit shows "can't exceed" with the limit.
- **Assigned to someone else.** The assignment line names the person who must finalise the synoptic. You can read it; ask the named person or reassign (see [Case Team](help:report/case-team)).
- **Locked after sign-out.** A committed section is read-only: "This section is committed and read-only. Use Delegate, Amendment to make changes after sign-out." See [Sign Out and Release](help:report/sign-out-and-release).

### Error recovery

- **Wrong value confirmed.** Select **undo** on the field, then choose the right value.
- **Wrong protocol added.** Remove it from the specimen (or use the protocol change window if the AI proposes a better one) and add the right one. Check answers carried over from the first protocol.
- **Dictated into the wrong place.** Press Ctrl+Alt+J twice to stop and remove the dictation. Passages you edited stay.
- **AI overwrote nothing, but you want a fresh start.** The Orchestrator button only fills fields you have not answered. To redo a field, clear it yourself and run it again.
- **Code applied by mistake.** Open **Codes**, use **Remove this instance**, then **Save**.

## Required, conditional and calculated fields

- **Required fields** carry a red asterisk. Sign-out is blocked while a required field is empty. The progress badge shows required counts separately.
- **Conditional fields** appear only when an earlier answer calls for them. Choosing a different earlier answer hides the follow-on fields and they no longer count towards "required". If a hidden field had an answer, check it when you change the earlier answer.
- **Multi-answer conditions.** A field can depend on either of two answers (for example "linear or focal"); it shows when any one matches.
- **Calculated fields.** Some totals are worked out for you: "Calculated from the grid." (a part grid total) or "Calculated from the organ map's margin questions." Until the grid has counts, enter the total yourself.

## Margins, staging and the organ map

- **Margins.** Margin questions (distance to margin, status of each margin) are ordinary fields of the protocol. When the protocol includes an organ map, margin answers can be drawn on the map and the margin totals can be worked out from the map's margin questions.
- **Staging.** Staging fields (for example pT, pN, pM) are protocol fields too. The protocol decides the options; PathScribe does not calculate a stage from other answers unless the protocol says so.
- **Organ map.** Protocols that include the PathScribe anatomical map (the prostate templates and some colorectal ones) show a map where you mark findings. For Mohs micrographic surgery, the stages question is required and uses the map to record each stage; if a stage has not been added yet, a voice instruction about it is refused with "Not applied: that stage hasn't been added yet".

## Orchestration mode and Synoptic mode

The Report screen follows the laboratory's reporting mode.

- **Orchestration mode** (PathScribe owns the report). The **Report Draft** tab is shown. When the synoptic is complete, PathScribe shows "Synoptic complete. Generating a narrative draft…" and writes the narrative sections. You review each section (**Accept**, **Accept all**, **Regen all**), and you sign out from PathScribe. An empty Report Draft offers **Generate Report** (after you complete the synoptic fields), **Start writing manually** (blank sections with no AI), or dictating the Gross directly.
- **Assist mode** (the LIS owns the official report). The **Report Draft** tab is not shown. You work in the **Synoptic Reporting** tab and the **Material** tab, and finalise through the LIS (see [Sign Out and Release](help:report/sign-out-and-release)).

In both modes the **Synoptic Reporting** tab and the right-hand panel carry the same checklist, with the same answers.

## Synoptic panel, sequencer and AI review windows

### Right synoptic panel

- While the protocol loads the panel says **Loading synoptic report…**. If it cannot, it shows **Failed to load template**. With no case it says **No case loaded.**
- **Tab view — one section at a time** and **Page view — all sections scrollable** switch the layout of the sections.
- Hover over a field name: for an AI-filled field the tooltip is **Click to highlight source in report**; otherwise **Click to focus field**.
- The jump bar's back button is **Return to the field you were just on**; it is disabled with **Nowhere to go back to yet** until you have jumped.
- A grid of counts with no entries says **The grid has no counts yet.**; a part grid with no parts says **This case has no parts yet.**

### Add Synoptic

Search the protocol list in the Add Synoptic window. When nothing matches it says **No protocols match your search**.

### AI Protocol Review

When the microscopic findings suggest a different protocol, **AI Protocol Review** opens with the title "Protocol adjustments proposed". Each change shows the **Current** and **Proposed** protocol (a protocol that is no longer needed reads **(remove — no longer needed)**) and the AI's confidence. Tick the changes you want. The counter reads **{{selected}} of {{total}} selected**. The apply button reads **Apply N changes →**, and **No changes selected** while none is ticked. **Keep existing protocols** closes the window without change.

### AI-Generated Narrative

**AI-Generated Narrative** opens the title "Review and edit before inserting into the report". Edit the **Generated Text — edit freely before accepting**, choose where it goes (**Insert into**) and select the **Insert into (field)** button, or **Discard**.

### Sequencer

The sequencer sets the order of specimens and synoptics in the report. A specimen with none says **No synoptics for this specimen**. The preview says **No report preview available.** when empty, and **No fields completed yet** for a synoptic with no answers; **Show less** collapses a long list. **Save Sequence** saves the order (it is available only after you change something); the close button is named **Close sequencer**.

### Unsaved changes

Leaving the page with unsaved work opens a warning. **Stay on Page** keeps you where you are, **Discard & Leave** throws the changes away, and **💾 Save Draft & Leave** saves first.

### WSI viewer

When more than one slide viewer is installed, a selector with the tooltip **Select WSI viewer** chooses which one the launch button opens.

## Code Manager: more detail

Several small items in the **Codes** window (Code Manager):

- **Applied Codes** is the list on the left; **No case-level codes** shows when nothing is applied at case level. A code already used on another specimen shows **Applied elsewhere**; hover over it for **Already applied to: (where)**. Use **Move here** to move it.
- The code-system tabs include **CPT (RVU)** (named **Billing Code** in Orchestration mode) and **Case coding**, which shows the codes already on the case: "No codes on this case yet." A code from a system your laboratory does not allow shows **Not allowed by the Code Systems setting**.
- Search box: **Search {{system}} — code or term…**. Above the right-hand panel, a hint reads **— click a row on the left to change**: it means the target of a new code is whichever row you select in the Applied Codes list. The hint under it depends on the system, for example **Type a code (e.g. C50) or description** for ICD-10 and **Type a test name or LOINC number** for LOINC. When nothing is found the window says **No results for "(search)"** and **Try a different term or switch filters**. If the search itself fails it shows **Search unavailable** with the reason, or "Search failed — please try again."
- **Findings that may need a code:** lists words from the report. Select one to search for it; you choose what is applied.
- The AI button reads **AI Suggest Codes** or **AI Suggest (Narrative)** the first time, **AI thinking…** while it works, and afterwards **Re-run (Synoptic)**, **Re-run (Narrative)** or **Re-run AI Suggestions**. If it fails the message is "AI suggestion failed". A code already applied shows a tick and "apply again" to add another instance; if saving fails the window says "Failed to save — please try again."
- **ICD-10 and ICD-11 side by side** compares the two systems. The mapping is marked **Simulated map**; where only a guess exists it shows **Simulated suggestion**, and a code with no mapping shows **No map entry**.
- **Enter an ICD-O-3 code yourself**: type a code and choose **Add**. The box shows the hint 8500/3 or C50.9. 8500/3 is a morphology code; C50.9 is a topography code. A morphology code is four digits, a slash and a behaviour digit (0, 1, 2, 3, 6 or 9); a topography code runs from C00 to C80. The code is stored as "ICD-O-3 topography, entered manually" or "ICD-O-3 morphology, entered manually (behaviour)".
- **OPCS-4 needs an NHS TRUD licence**: until your organisation holds the licence, a **Reference sample** (marked Simulated) is shown for orientation only and cannot be applied to a case.

## Comments and toast messages

- The case comment and specimen comment windows say "No comments yet on this case." or "No comments yet on this specimen." when empty. Your new comment is labelled "— new comment" under your name, and the specimen box says "Add a comment for (specimen)…".
- A message bar that appears after a save (for example the draft saved message) can be closed with the cross, named **Close message**.

## Organ map and Mohs stages

- The organ map panel says **Click a sector to go to its question.** Choose **Remove from report** to take the picture out of the report.
- For Mohs surgery, the stage table has a row per sector with a **Tumour at margin** tick box (its screen-reader name is "Tumour at margin: (sector)"), a **Blocks cut** box, **Add stage N**, **Remove stage N** and **Mark stage clear**. The number of stages is limited.

## Tips and Best Practices

### Common mistakes

- Confirming an AI value without reading its source, especially one marked "Source not found in report text".
- Changing an early answer and forgetting that conditional follow-on fields are now hidden or newly shown.
- Dictating with Enter Gross or Enter Diagnosis while on a tab that has no Report Draft. The command only acts on the Report Draft.
- Treating "Suggested" protocols as approved. The AI proposes; you choose.
- Applying codes in a system your jurisdiction does not allow.

### Efficiency recommendations

- Learn the three jump keys: Next Required (Ctrl+Alt+Shift+R), Next Unanswered (Ctrl+Alt+U) and the **Next Unverified** button.
- Use Confirm Field (Ctrl+Alt+Shift+A) for each AI value you agree with; it applies any codes tied to the answer.
- Use Page view to read the whole checklist at once, Tab view to focus on one section.
- Tick **Learn this pairing** when you pick a protocol so the next similar specimen is suggested correctly.

### Workflow recommendations

- Complete the narrative first, then use **Suggest Synoptic from Narrative**, then clean up the exceptions.
- Review every unverified AI value before sign-out. The AI Review window is a safety net, not a substitute.
- Check the progress badge and the required-fields banner before choosing Sign Out.

## Related Features

### Upstream workflow

- Gross and microscopic text, specimen details and images: [Microscopic and Material](help:report/microscopic-and-material).
- Grossing sets the specimens and parts the protocol covers: see [Report](help:report).

### Downstream workflow

- Narrative generation, review checks and sign-out: [Sign Out and Release](help:report/sign-out-and-release).
- Second opinions and delegation of the synoptic: [Case Team](help:report/case-team).
- Cases flagged for discussion: [Tumor Board](help:tumor-board).

## Troubleshooting

### Common user issues

- **Edit Field does nothing.** It needs a synoptic field to be current. Click a field in the panel or use a Next command first.
- **The Orchestrator button is greyed out.** No template is assigned to the specimen.
- **"Sign-out stopped" with a totals message.** The typed total and the grid disagree. Reconcile or continue as entered.
- **A required field will not clear.** It may depend on another answer. Use Next Required to find it.
- **Codes will not apply.** The code system may not be allowed for your jurisdiction, or the search is a short demonstration list (OPCS-4 codes in this build "come from a short demonstration list and cannot be applied to a case"; ICD-11 and ICD-O search show "coming soon").
- **My template is not the CAP or RCPath wording.** The shipped templates are generic placeholders; see the note at the top.

### Resolution steps

1. Note the exact message on screen.
2. Check the progress badge and the banner for what is still open.
3. Use Next Required or Next Unanswered to find the field.
4. If the problem is a missing or wrong template, contact your template administrator.

### When to contact support

Contact support if a protocol will not load, if answers disappear after a save, if the AI suggestions never appear on a connected model, or if a code system your site needs is missing.
