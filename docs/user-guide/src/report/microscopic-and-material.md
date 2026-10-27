---
module: Report
screen: Microscopic and Material
workflow: Case Reporting and Sign-Out
role: [Pathologist, Fellow, Resident, Pathology Assistant, Histotechnologist]
routes: []
keywords: [microscopic, microscopic description, material tab, cassette, label printing, reprints, triage checklist, block status, slide status, clinical history, history, prior cases, related patients, images, frozen section, intraoperative, version history, change history, comments, internal note, spell check, personal dictionary]
previous: report/synoptic-reporting
next: report
related: [report, report/synoptic-reporting, report/sign-out-and-release, grossing, intraop-queue, wsi-viewer, messaging, voice-and-keyboard]
status: Draft
---

# Microscopic and Material {#top}

## Overview

**Purpose.** This article covers the parts of the Report screen that surround the diagnosis: the **Microscopic Description** entry panel, the **Material** tab (the case's specimens, blocks and slides, with cassette and label printing and the grossing triage checklist), the clinical history line, the **History** window (prior and related cases), report images, frozen section findings, the version and change history, case and specimen comments, internal notes, and the spell checker with your personal dictionary.

**Intended users.** Pathologists, fellows and residents write the microscopic description and read the history. Pathology assistants and histotechnologists use the Material tab to see block and slide status and to print labels.

**Where it fits.** These are the supporting tools on the [Report](help:report) screen. The structured checklist is in [Synoptic Reporting](help:report/synoptic-reporting); signing the case is in [Sign Out and Release](help:report/sign-out-and-release).

!!! note "What is demonstration only"
    - The **Similar Cases** list in the History window is marked "(Demonstration)" and its similarity score is a demonstration figure.
    - Frozen section code suggestions are unconfirmed: accepting one records your decision but does not post a charge.
    - Label printing needs a workstation with a connected label printer. Without one, the print actions are not able to produce a physical label.

## Screen Tour

![The Report screen with the left panel on the Material tab and the Microscopic Description panel on the right](capture:report-microscopic-and-material-overview)

The left side of the Report screen shows the **Full Patient Report** (read-only text of the case) and the **Material** tab. The panel on the right changes with what you select: the synoptic checklist, the billing review, or, when you choose a specimen's microscopic entry in the side list, the **Microscopic Description** panel.

### Field definitions

**Full Patient Report (left panel)**

| Field | What it means |
|---|---|
| Case / Patient / MRN / DOB | Identifiers for the case. A value that was never recorded shows "(not recorded)". |
| Clinical History | The history supplied with the request. |
| Gross Description | The grossing text. |
| Intraoperative Diagnosis | The frozen section diagnosis recorded for the case, when there is one (see "Frozen section and intraoperative findings"). |
| Microscopic Findings | The microscopic text. |
| Preliminary Diagnosis, Ancillary Studies | Further sections of the case. |
| Received from LIS, read-only | A notice when the content came from the LIS and cannot be changed here. |
| Internal Notes | A button; shows **Review Ready** when a colleague has published an informal review ("(name) published an informal review, click to view"). |

**Microscopic Description panel**

| Field | What it means |
|---|---|
| Title and subtitle | "Microscopic Description" and the specimen it applies to. |
| Hint | Explains that you can type or dictate (press the microphone with this field focused), or insert the standard attestation and add detail only when clinically indicated. The text is optional when the specimen's synoptic template has its own required fields complete. It also says that saving the narrative re-checks whether a different protocol fits better. |
| **+ Insert "Microscopic examination performed."** | Puts that standard sentence into the text. |
| Spelling | A small control that sets the spelling language for this report (see "Spell check and your personal dictionary"). |
| Editor | A rich-text box with the placeholder "Type the microscopic description, or press the mic with this field focused to dictate...". Fonts offered: Arial, Times New Roman, Calibri, Courier New. A light or dark appearance can be toggled. |
| Dictating indicator | "Dictating into this field..." while the microphone is feeding the box. |
| **Save** | Saves the text (shown as the check mark and Save). Greyed out when nothing has changed. |
| **Clear** | Empties the box and saves it as left blank. Shown only when there is text. |
| Status | One of: "Unsaved changes", "Saved", "Deliberately left blank" (saved with no text), or "Not started". |

**Side list status for a specimen's microscopic entry:** "Draft, unsaved", "Saved", "Saved, left blank", "No narrative text yet", plus a character count.

**Material tab**

| Item | What it means |
|---|---|
| Specimen rows | One block of rows per specimen, with its blocks and the slides cut from each. "No specimens on this case yet." when empty; "No blocks or decants recorded yet." when a specimen has nothing. |
| Block chip | The block name and status. Hover to see "(block), (status)", or the reason for a cancelled block. |
| Slide stain list | Stains for the block, shown as stained or "held, unstained". "no slides yet" appears when none are cut; click it to edit. |
| **Add specimen**, **Add decant/fluid**, **Request block/recut**, **Create Biopsy Array** | Buttons to add material. In an Assist case, new specimens are accessioned in the LIS: the panel says "New specimens are accessioned in the LIS" and only recuts and additional blocks on an existing specimen remain. |
| **Assign Code** | Assigns the specimen's base CPT code. A specimen without one shows the badge **Pending Base Code**. |
| **View Tracking History** | Opens the tracking history for the material. |
| Suggested: Template / Suggested: Narrative | A hint, from the specimen's CPT code, of which way to start reporting (structured fields or narrative). Both remain available. |

### Toolbar

| Control | What it does |
|---|---|
| **Manage Reprints** (bottom bar) | Opens the Manage Reprints window for requisition, container, cassette and slide labels. |
| **Attach images** (bottom bar) | Opens "Attach images to the report". Hover text: "Attach images to this report; they print after its pages". |
| **History** (bottom bar) | Opens the History window with prior pathology, similar cases and related patients. |
| **Codes** (bottom bar) | Opens the Codes window (see [Synoptic Reporting](help:report/synoptic-reporting)). |
| **Save Draft** | Saves the report draft, including the microscopic text. |
| Header chips | "n signed version(s), click to view history", "n recorded save(s), click to view change history", "n signature(s) recorded, click to view history". Each chip opens the matching window and appears only when there is something to show. |
| **Add-on order** (header) | Order recuts, special stains, IHC or molecular tests on the case's blocks. |

**Manage Reprints window**

| Item | What it means |
|---|---|
| Columns | **Specimen**, **Block**, **Slides**, **Requisition**. Tick a specimen to see its blocks, tick a block to see its slides. |
| Prompts | "Check a specimen to see its blocks.", "Check a block to see its slides.", "No slides generated for this block yet." |
| Badges | Damaged, Entirely Submitted, Exhausted, Lost, Recut. A damaged block says "Tissue structure damaged. Re-embedding required before recuts."; a lost block is "Not available for selection until located"; an exhausted block is "Not available for new slide requests". |
| **Select All** | Ticks everything in the column. |
| Footer buttons | **Print Req (n)**, **Print Spec (n)**, **Print Blk (n)**, **Print Sld (n)**, each with the number selected. While sending it says "Printing...". |
| Disabled batch printing | If the laboratory forces printing one at a time, the footer says "Batch printing is disabled, this lab enforces on-demand cassette printing" (or slide printing). |

### Icons and status indicators

**Block status:** Pending, Grossed, Embedded, Exhausted, Damaged, Lost, Cancelled, Deleted, Invalidated. After sign-out an affected block can be flagged **Superseded** or **Invalidated**; the tooltip says why, who and when, and that the block is not deleted.

**Slide (stain) status:** Pending Cut, Cut & Placed, Staining, Coverslipped, Ready for Review, Recut Requested, QC Failed, Cancelled.

**Badges on a block or specimen:**

| Badge | Meaning |
|---|---|
| Awaiting Scan | The cassette has not been scanned yet. |
| Pending LIS | Sent to the LIS, awaiting confirmation. |
| LIS Rejected | The LIS refused the request; follow up with histology. |
| Entirely Submitted | All tissue was used during grossing; nothing remains. |
| Partial submission | Some grossed tissue remains in wet storage. |
| Tissue Discrepancy | The number of pieces recorded at grossing differs from the number seen at embedding. |
| Exhausted, Damaged, Lost | As above. Damaged blocks need re-embedding before any recut. |
| n pcs | Pieces grossed. |

### Hotkeys

| Action | Keyboard | Voice phrases |
|---|---|---|
| Print Current Cassette | Alt+Shift+O | "print current cassette", "print this cassette", "print cassette" |
| Batch Print Case Slides | Alt+Shift+P | "batch print case slides", "print all cassettes", "print all cassettes for case" |
| Confirm Triage | Alt+Shift+T | "confirm triage", "triage complete", "triage confirmed" |
| Next Block / Previous Block | Alt+. / Alt+, | "next block", "go to next block" / "previous block", "prior block" |
| Mark Block Grossed | Alt+G | "mark grossed", "block grossed", "block complete", "grossing complete" |
| Open History / Close History | Alt+H / Alt+Shift+H | "open history", "show history", "prior cases", "similar cases" / "close history", "close prior cases" |
| Case Comment | Ctrl+Alt+C | "case comment", "open case comment", "add case comment", "dictate case comment" |
| Specimen Comment | Ctrl+Alt+S | "specimen comment", "open specimen comment", "add specimen comment" |
| Internal Note | Alt+I | "internal note", "open internal note", "open notes" |
| Add Note | Ctrl+Alt+Shift+N | see the registry |
| Enter Microscopic Description | Alt+Shift+G | "enter micro", "start micro", "dictate micro", "microscopic description" |
| Cancel | Ctrl+Alt+J | "cancel" |

Next Block, Previous Block, Mark Block Grossed and Confirm Triage act on the **focused block** of the case, so choose a block on the Material tab first. Print Current Cassette prints the focused block's cassette.

## Step-by-Step Procedures

### Standard workflow

**Write the microscopic description**

1. In the side list choose the specimen and its microscopic entry, or press Alt+Shift+G (or say "enter micro"). The **Microscopic Description** panel opens with the specimen named under the title.
2. If the specimen needs only the standard statement, select **+ Insert "Microscopic examination performed."**. The sentence is added to the box.
3. Otherwise type in the box, or click in the box and press the microphone. The "Dictating into this field..." indicator and a blue frame show that speech is going into this box.
4. Check the spelling. Words underlined by the spell checker can be corrected from the right-click menu.
5. Select **Save**. The status changes to "Saved" and the side list shows "Saved" with a character count. If the text is empty and you save, the status reads "Deliberately left blank".
6. If the specimen has a synoptic protocol, saving re-checks whether a different protocol fits better. If one does, the "Protocol adjustments proposed" window opens (see [Synoptic Reporting](help:report/synoptic-reporting)).

**Review the material and print labels**

1. Select the **Material** tab. Each specimen lists its blocks. Hover a block to read its status.
2. To print one cassette, select the block and press Alt+Shift+O, say "print current cassette", or use the print icon on the block. Printing a cassette uses the same function whichever block you pick.
3. To print all cassettes for the case, press Alt+Shift+P or say "batch print case slides".
4. For requisition, container, cassette or slide labels in any combination, select **Manage Reprints**, tick the specimens, blocks and slides, and select **Print Req**, **Print Spec**, **Print Blk** or **Print Sld**.
5. A block that is Lost, Exhausted or Damaged cannot be selected for new slides. Damaged blocks need re-embedding first.

**Confirm the triage checklist**

Some specimens require a triage checklist at grossing before cassettes are released.

1. In the grossing release area for the specimen, the heading reads "Triage required before release". The checklist items are listed; tick each one.
2. When every item is confirmed the heading changes to "Triage confirmed" and a line such as "2 cassettes resolved, ready to release" appears.
3. Select **Release & Print All** to release the cassettes and print them.
4. Faster: with the specimen's block focused, press Alt+Shift+T (or say "confirm triage"). That ticks every checklist item at once and records who completed it and when.

**Read the history**

1. Select **History** (or press Alt+H, or say "open history"). The History window opens.
2. **Prior Pathology** lists this patient's earlier cases; **Related Patients** lists linked records (name, MRN, date of birth); **Similar Cases (Demonstration)** lists AI-matched cases with a match percentage.
3. Open a case from the list to read its procedure, site, margins, lymph nodes, receptor status, Ki-67, gross and microscopic descriptions, ancillary studies, pathologist comment and tags.
4. To ask the other pathologist a question, select the case, type in "Message to pathologist" and select **Send**. Do not include patient identifiers: the box warns "Do not include patient identifiers".
5. Close with Alt+Shift+H (or "close history"). A breadcrumb at the top lets you go back to the Case Report, Case Search or Home.

**Attach images to the report**

1. Select **Attach images**. The window "Attach images to the report" opens, showing the accession.
2. Paste the image's link (it must begin with https:// and name a server, with no user name or password in it).
3. Choose the **Image type**: Block face, Gross specimen, Microphotograph or Other. Add an optional **Caption (optional)**, which is printed under the image.
4. Select **Add**. The image appears under "Attached images" with its source host. Repeat up to 12 images.
5. Select **Done**.

**Add a comment**

1. Press Ctrl+Alt+C (case comment) or Ctrl+Alt+S (specimen comment), or use the comment icon beside a specimen in the side list ("View / add comment"). The **Case Comment** window says it applies to the entire case and is visible to everyone who opens the case.
2. Type the comment and post it. The window shows "n comments on this case". A specimen comment window shows "n comments" for that specimen, with the note "Sent to LIS on finalization".
3. Internal Notes (Alt+I) are working notes between colleagues; use them for questions that should not go on the report.

### Alternative workflow

- **Dictate the whole section.** Say "enter micro" to start dictation into the microscopic text, speak, then say "done" or press Ctrl+Alt+J to stop.
- **Skip the narrative.** When the synoptic protocol's required fields are complete the narrative is optional, so you may save a deliberately blank description. Some procedures still require a narrative (see Exception handling).
- **Work from the synoptic first.** In Orchestration mode you can complete the synoptic and let PathScribe write the narrative, then edit the Microscopic text.

### Exception handling

- **Sign-out stops on the microscopic description.** The finalise check can say: "This specimen has no Microscopic Description and no synoptic template, add documentation before finalizing."; "A Microscopic Description narrative is required for this procedure."; "This specimen's Microscopic Description is an unsaved draft, save or discard it before finalizing."; or "This specimen's synoptic template has required fields that are still incomplete." Fix the named item and try again.
- **Could not save.** The toast "Could not save the Microscopic Description, please try again." means the save did not go through. Your text is still in the box; select **Save** again.
- **History is blocked.** "Cannot safely retrieve patient history, this patient record is missing (a date of birth / an MRN / an MRN and date of birth). A minimum of two patient identifiers is required before surfacing prior case history." Complete the patient identifiers in the LIS or at accessioning.
- **History is empty.** "No prior pathology cases on record." or "No matched cases found for the current context." are normal results.
- **Image link rejected.** "Enter an https:// link to a named server (no user name or password in it)." Other messages: "That image is already linked to this report.", "A report can have at most 12 images.", "You do not have permission to attach images to reports.", "The image could not be attached."
- **Clinical history cannot be recorded.** Messages: "You don't have permission to record clinical history.", "The case is signed out; a change now needs an amendment.", "The case changed while saving; try again.", "The case could not be found."
- **The case is signed out.** Comments become read-only ("Finalized, read only"). Text sections are locked; use an amendment (see [Sign Out and Release](help:report/sign-out-and-release)).
- **A label does not print.** Printer messages include "The label printer is out of labels.", "out of ribbon.", "The label printer head is open.", "The label printer is not responding.", and "The PathScribe Agent is not running on this workstation, or its security certificate is not trusted". Fix the printer or ask your administrator to start the agent, then print again. If a pop-up blocker stops a label window: "Please allow pop-ups for this site to print labels."

### Error recovery

- **Wrong text saved.** Edit and **Save** again. Every save is recorded in the change history.
- **Cleared by mistake.** **Clear** saves a blank description. Retype the text and save, or dictate again. Nothing restores the old text except retyping, so check before you clear.
- **Triage confirmed too early.** If the checklist was confirmed in error, tell the grossing staff; an override requires a reason ("Reason for overriding triage...").
- **Wrong image.** Open **Attach images**, select **Remove** beside it. A report already signed out is not changed; images added or removed apply to reports made from then on.
- **Printed the wrong label.** Print the right one from **Manage Reprints**.

## Clinical history, frozen section and history windows

**Clinical history line.** Above the report, one line shows either "Clinical history: n coded entries.", "Clinical history: clinical indication only, no coded entries.", or, when nothing was provided, "Mismatch check deferred: no clinical information provided. Add the clinical history when you have it." Select **Add clinical history** (or **Edit clinical history**) to open the coded picker used at accessioning, and **Save clinical history** to record it. Recording needs the permission to record clinical history; it is refused once the case is signed out. Adding history lets the clinical mismatch check at sign-out work.

**Frozen section and intraoperative findings.**

- The **Intraoperative Diagnosis** row of the Full Patient Report shows the frozen section diagnosis recorded in the Intraoperative queue for the case's specimen(s) (see [Intraoperative Queue](help:intraop-queue)).
- In the billing review, "Frozen section codes (suggested)" lists suggested CPT codes (for example "88331: specimen A, frozen block 1"). The first block on a specimen is counted as 88331 and each further block as 88332. They are marked "Unconfirmed". Select **Accept** or **Dismiss**; the row then reads "Accepted" or "Dismissed". Accepting records your decision; it does not post a charge.
- At sign-out the frozen-to-permanent comparison is a review check (see [Sign Out and Release](help:report/sign-out-and-release)).

**Version history, change history, signatures.**

- **Version History** ("n versions recorded for this case, signed and archived, read-only") lists each signed version with who signed it and whether it was the Initial Sign-Out or an Amendment, plus the patient and encounter details at sign-out. **View signed PDF** opens the stored PDF. If the PDF no longer matches its stored fingerprint, it is not shown and the window says to report it to your administrator.
- **Released documents** lists each sent report (Final, Preliminary, Corrected or Addendum) with the date released; **View as sent** opens exactly what was sent.
- **Change history** ("n saves recorded for this case") shows each save with who saved, when, from which workstation, and every field that changed (Added, Changed, Removed). Filter by **Show changes to**: All, Case details, Codes, Narrative, Specimens and blocks, Synoptic answers. **Export CSV** saves the list.
- The signature history lists the signatures recorded for the case.

## Spell check and your personal dictionary

- **Underlines.** Misspelled words are marked in the microscopic editor, the Report Draft editor and long-text synoptic fields.
- **Right-click a word.** The menu "Spelling suggestions for (word)" offers suggestions ("Finding suggestions..." while it looks, "No suggestions" if none), **Add to my dictionary**, **Add to the (facility) dictionary**, and **Ignore for this session**. Adding to the facility dictionary needs permission: "Couldn't add the word to the facility dictionary. You may not have permission." If the word is correct in another regional spelling, the menu says "Other spelling convention (this report uses (language))".
- **Spelling language.** The **Spelling** control shows the language in use and where it came from (chosen for this case, pathologist's preference, facility default, or platform default). Choose **Default** to go back. Offered languages: English (United States), English (United Kingdom), English (Canada), English (Australia and New Zealand), French (France), German (Germany), Spanish (Spain), Dutch (Netherlands and Belgium) and Korean. A language that is not ready shows "(choice) isn't available yet".
- **My dictionary.** Open it from your profile menu (**My dictionary**). It lists words you added; the spell checker accepts them in your reports only. Add a word with **Add**, remove one with its remove button. Refusals: "Enter a word.", "Only a single word can be added.", "That word is too long."
- **Accepting a section.** In Orchestration mode **Accept** on a Report Draft section checks the spelling and accepts the section.

### How spell check decides

When you stop typing for a moment (about a third of a second), the spell checker looks at each paragraph you changed. It checks every word against several lists, in this order, and the first list that accepts the word wins:

1. **My dictionary.** Words you added yourself.
2. **The facility dictionary.** Words your laboratory added, such as local abbreviations and shorthand.
3. **The spelling convention.** A word spelled the other regional way is underlined, and the menu offers this report's form. For example, "hematology" in a report set to English (United Kingdom) is underlined with "haematology" suggested.
4. **The pathology word list.** PathScribe's own list of pathology terms.
5. **The language's standard dictionary.**

**What is never underlined.** Anything with a digit in it (accession numbers, measurements, stage and grade codes such as Gleason scores, antibody names such as Ki-67), short capital-letter abbreviations of up to six letters, web and e-mail addresses, and dotted abbreviations. A hyphenated word is checked one part at a time.

**Which language is used.** The checker takes the first of these that applies: the language chosen on this case, then your own preference on your profile, then your facility's country, then English (United States). English (Australia and New Zealand) uses one dictionary for both countries. A language that is not ready is skipped and the next one in this list is used; the **Spelling** control says "isn't available yet" if you pick it.

**What an underline means, and does not mean.** An underline says the word is not in any list the checker uses. It does not say the word is wrong. The pathology word lists for French, German, Dutch, Spanish and Korean are starter lists, so a correct specialist term in those languages may be underlined; use **Add to my dictionary** or ask your administrator to add it to the facility dictionary. Likewise, a word that is not underlined is only known to be in a list, not confirmed clinically correct. Read the report before you sign it.

**Your words stay yours.** Words in **My dictionary** apply only to your own reports. Words added to the facility dictionary apply to everyone at that laboratory, and each addition or removal is recorded in the audit log. **Ignore for this session** hides the underline until you leave the case and is never saved.

## Material windows in detail

### Material tab tree

- A block that has no stains shows **no slides yet — click to edit**; clicking opens the Blocks & Stains window.
- A specimen that has ancillary codes but no base code shows an assign button with the tooltip **Assign this specimen's base CPT code**.
- A location badge shows the last place the item was scanned. Hover for **Reported by {{source}} on {{date}}**.
- A lost block shows a "Lost" badge with the tooltip **Block reported lost**. A damaged block shows a "Damaged" badge and the tooltip adds **Re-embedding required before any recut.**
- Under a residual fluid decant you can add **Cell block from (decant name)**.
- The **Biopsy Arrays** heading lists each array. Its **Edit** button has the tooltip **Edit Biopsy Array (label)**.

### Blocks & Stains window

The **Blocks & Stains** window is where you manage each block and its stains. When there are no blocks it says "No blocks on this case yet."

| Item | What it does |
|---|---|
| Priority | Set a block's priority. **Inherit from case (priority)** keeps the case priority. |
| Pieces Grossed | Number of tissue pieces, for example 3. When your laboratory requires it, a note under the box reads "Needed before grossing can be completed." until it is filled in. |
| Piece description | For example "2 core fragments, 1 tiny dust piece". The same note appears under it when your laboratory requires it. |
| Damage / re-embed details | For a damaged block; for a lost block the field reads **Missing / incident details**. |
| Block Face Photos, **📷 Add Photo** | Attach photographs of the block face. A window headed "Capture Block Face Photo" shows the camera; its buttons and messages are the same as in the [Intraop Queue](help:intraop-queue) photo window (see its Error recovery). |
| Foreign (outside) identifiers | Source and identifier fields for material from another laboratory, for example "Riverside Medical Center" and "the id already on the container". The decant fields have the same layout. |
| **Search stains to add — name or category…** | Search the stain list and add stains to the block. |
| **🩹 Unstained (spare slide)** | A choice in that list meaning "No stain yet — cut and ready". The slide then shows as **🩹 Unstained (spare)**. |
| **+ Create Spare Slide** | Cuts an unstained spare slide. |
| **Placing stain order…** | Shown briefly while an order is being placed. |
| Number of targets button (**Edit targets for this order**) | Opens **Targets for (stain name)** where you search targets such as TP53 or MYC with **Search targets to add (e.g. TP53, MYC)…**. |
| Billing suggestion | The block can show **Applied ancillary codes:** and **Suggested from this block's stains:** with an **Apply** button. |
| **🔁 Order Restain** | Choose the **Stain** and a **Reason for restain (required)**, then **Confirm Restain Order**. **Never mind** closes it. |
| **🚫 Cancel this block** | Pick a **Reason for cancellation (required)** (or describe it in **Describe the reason…**) and choose **Confirm Cancellation**. |
| **🖨️ Print Container Label** | Prints the container label for a decant. |
| **Decant Comments** | Comments on a decant. |

### Deleting or flagging a block

- Delete a block in process with **Delete this block**: choose a **Reason for deleting**, add a note (required for Other) and choose **Delete block**. **Never mind** backs out. The window records who did it and when, and lists **Billing codes released: (codes)**, or "No billing codes were applied to this block."
- On a signed-out case the block is invalidated instead. On an amended report you may use **Flag on amended report**: choose **Flag as** Invalidated or Superseded, a **Reason**, then **Flag block**. This only marks the block; it is not deleted.

### Biopsy arrays

- **Create Biopsy Array** selects two or more specimens that share one cassette. Type the **Cassette Label** (for example A1). It cannot be changed after the array is created.
- **Edit Biopsy Array — (id)** adds or removes specimens. An array needs at least two specimens.
- **Dissolve Array**, then **Confirm Dissolve**, cannot be undone.
- The array editor has two tabs, **Details** and **Biopsy Array / Matrix Mapping**. On Details you set the pieces grossed, the piece description, **Edit membership**, and **Reprint Cassette Label**. The **Array Mapper** lets you choose the core or cores an ancillary stain is for; under **Ancillary Stains on This Block** each stain shows the cores targeted, or **no core targeted yet**. Search stains with **Search stains (e.g. Ki-67, P53, PIN-4)…**. Choosing cores targets the order only; billing counts a core only when a pathologist confirms it was evaluated.
- The small diagram of an array labels each position as "pos (number)".

### Add Orders

**Add Orders** adds work after grossing. Its heading reads **Grossing in progress** or **Microscopic review**. Tabs:

- **Blocks / Recut**: choose the specimen (**Select the specimen this is from…**) and type the **Cassette / block label** (for example A2, A3). The window shows **Will append: "(sentence)"**, the sentence that is added to the gross description.
- **Specimens**: for a genuinely new container. **Continue to new specimen intake →** opens the full intake form.
- **Stains / Sectioning**: **Continue to Flag Manager →** opens the flag manager to order a level or stain.

### Specimen details

**Edit Specimen (label)** (or Add Specimen) holds: the specimen label (hint: Letter or short code (A, B, 1, 1A…)), a description (for example "Left breast mastectomy"), **Search specimen dictionary…** (with "No matches" or "No specimens in dictionary" messages), container type (**Select container type…**), **Collection Method** (for example Core biopsy, Excision), anatomic site (for example Breast), **SNOMED Specimen Type** and **SNOMED Anatomic Site** codes (for example 122643008 and 80248007), the referring client and its identifier, **Complexity**, **Gross weight (g)** with **Capture weight** (the window shows **Reading the scale…**, then **Weight read from the scale.**, or **Simulated scale reading** in the demonstration) and **Gross photos**. Errors read "Specimen label is required" and "Description is required".

### Manage Reprints

The window lists "No specimens yet." when empty. The requisition card is described as **Full-page requisition label**. Hover over a lost or damaged block for the explanatory tooltip.

### Hierarchy & Scan Audit Log

**Hierarchy & Scan Audit Log** shows every scan of each specimen, block, slide and aliquot. Select an item on the left to see its history. Items with no scan show **No events yet**. Searching with no result shows "No matches for (search text)." and an empty history says **No tracking events yet for this item.** The printout says **No tracking events yet** under such an item.

### Cassette colour

A cassette colour that the rules have not worked out shows **Not yet resolved**. Choose one yourself from **— Select a color —**.

### Parts covered (synoptic workups)

**Parts covered** chooses which parts of a case a synoptic workup reports on. Choose Combined (one protocol across the parts ticked) or Independent (this part only), then **Apply**. If the case has only one part the window says **This case has no other parts.** The AI is told which parts the workup covers and does not propose a second workup of the same protocol for them.

### Change history and version history

- **Change history** says "No changes recorded yet." until the first save.
- **Version History** shows a **Patient / Encounter at Sign-Out** box that records the encounter as it stood at sign-out (for example **Encounter Class** and encounter status). If a version's PDF cannot be opened the window says "Could not open this version's PDF."

## The report text editor toolbar

The Microscopic, narrative and comment boxes share one editing toolbar. Hover over a button to see its name. The editor shows **Loading editor…** for a moment when it opens, and an empty narrative shows "Begin narrative report…".

| Button | What it does |
|---|---|
| Undo (Ctrl+Z), Redo (Ctrl+Shift+Z) | Step back or forward through your edits. |
| Bold (Ctrl+B), Italic (Ctrl+I), Underline (Ctrl+U), Strikethrough | Character styles. |
| Subscript, Superscript | Lower or raise the selected text. |
| Font Color, Text Highlight Color | Colour the selected text or its background. **No Color** removes the colour. |
| Paragraph Shading, Borders | Shade or border the paragraph. |
| Align Left, Align Center, Align Right, Justify | Paragraph alignment. |
| Heading 1, Heading 2, Heading 3 | Heading styles. |
| Line & Paragraph Spacing | A menu with **Line Spacing** and **Paragraph Spacing** (**Add Space Before Paragraph**, **Add Space After Paragraph**). Known limit: today these choices only close the menu and do not change the text (see below). |
| Table | A size grid (**Select table size**) inserts a table. When the cursor is in a table, buttons appear for **Add Column After**, **Add Row After**, **Delete Column**, **Delete Row**, **Merge Cells**, **Split Cell** and **Delete Table**. |
| Insert Macro (or type trigger + Space) | Opens the macro list; a search with no match says **No macros found**. Typing a macro's trigger word followed by a space inserts it without opening the list. |
| Find & Replace (Ctrl+F) | Opens the find box. **Find Next** moves to the next match; in replace mode **Replace All** changes every match. |
| Signature line | Inserts a line with the **Pathologist Signature** caption and a date. |

!!! warning "Known limit: spacing choices"
    In the current version, the choices in the **Line & Paragraph Spacing** menu do not change the spacing of your text. The other toolbar buttons work as described.

When you right-click a misspelled word, the menu offers **Add to my dictionary**, and, if you have permission, **Add to the {{facility}} dictionary**, so every colleague at the laboratory stops seeing it flagged. If that is refused the menu says "Couldn't add the word to the facility dictionary. You may not have permission."

## Report preview

The report preview shows the report as it will print. Sections that have no text say **Not yet generated** (the AI draft has not run), **No content**, or **⚠ Required — not yet completed** for a required section. A synoptic with no answers says "No synoptic data recorded." With no sections at all the preview says **No report sections yet** and tells you to generate the report in the draft editor. The footer reads **CONFIDENTIAL — PATHOLOGY REPORT**.

## Attach images: messages

In **Attach images to the report**, type the **Link to the image (https)** (for example an address starting https://imaging.hospital.org/). The list says **No images attached yet.** until you add one. PathScribe does not store the image; it fetches it when the report is made.

## Internal notes, history and related cases in detail

### Internal Notes drawer

- **Add Internal Note** starts a note. Choose the **Note Type**, write the note and save.
- While the notes load the drawer says **Loading notes...**; with none it says "No internal notes yet for this case".
- A note that came from a message conversation shows **Linked to message thread**.
- The bin button (**Delete note**) opens **Delete Note**: "Delete this note? This cannot be undone."

### History window

- While the window looks for earlier cases it shows **Loading prior pathology…**, or **Searching case corpus…** for the similar-case search.
- In the similar-case view each match shows **Similarity Score (Demonstration)**. The score is demonstration data, not a validated measure.
- **Refine search** reruns the similar-case search with your changes.
- **Message Pathologist** (or "Message (name)" when the reporting pathologist is known) starts a message about the case you are viewing.
- Under the prior report, the panel **AI-extracted synoptic fields** shows what the AI read from an earlier narrative report. It is labelled "AI-extracted, not verified", is for you to look at only, and is never used in reports, printing, registries, billing, rules or exports. **Check again** reads the report again; **Flag as wrong** and **Flag all as wrong** record that a value is wrong ("Flagged"). If the flag cannot be saved the panel says **Could not record the flag.** While it works it says **The AI is reading this report…**.

### Other cases for this patient

When some of a patient's other cases cannot be opened with your access, a notice under **Other cases for this patient** says how many. You can:

1. Choose **Request access** (or **Request again** after a refusal). Pick a **Reason for the request** and, for Other, write in the note box **Say why you need these cases**.
2. Wait. The assigned pathologist or an administrator decides.

If you are the person deciding, the notice lists **Requests waiting for your decision** with **Approve** and **Decline**. Declining asks for a reason, then **Decline request**. A second list, **Access you can revoke**, shows "(name) has had access since (date)." with **Revoke**, then **Revoke access**. If no reason was given it shows **Not stated**.

### Related cases and the patient summary

- The related cases picker says **Looking for related cases…** while it searches. A case with no diagnosis shows **(none recorded)**.
- **Print summary** prints a **Patient summary** sheet of the cases you chose, footed "Compiled {{when}} by {{name}}".

## Tips and Best Practices

### Common mistakes

- Pressing Alt+Shift+O with no block focused, expecting every cassette to print. Use Alt+Shift+P for all.
- Clearing a microscopic description to "start again" without noting the old text.
- Leaving the description as an unsaved draft: sign-out will stop.
- Putting patient identifiers in a message to another pathologist from the History window.
- Treating the Similar Cases list as validated. It is a demonstration.

### Efficiency recommendations

- Use Alt+Shift+T to confirm triage in one step, then **Release & Print All**.
- Use the Insert attestation button for routine specimens.
- Learn Ctrl+Alt+C and Ctrl+Alt+S for comments; Alt+H and Alt+Shift+H for history.
- Add unusual terms to My dictionary once rather than ignoring them each time.

### Workflow recommendations

- Add the clinical history early so the mismatch check at sign-out has something to compare.
- Check the Material tab before signing: a pending recut, QC failed slide or Awaiting Scan cassette means the case may not be ready.
- Attach images before the final report is made, because a signed report is not changed afterwards.

## Related Features

### Upstream workflow

- Grossing creates the specimens, blocks and triage: [Grossing](help:grossing).
- Frozen sections come from [Intraoperative Queue](help:intraop-queue).

### Downstream workflow

- Checklist answers and codes: [Synoptic Reporting](help:report/synoptic-reporting).
- Review checks and sign-out: [Sign Out and Release](help:report/sign-out-and-release).
- Slides for review: [WSI Viewer](help:wsi-viewer).

## Troubleshooting

### Common user issues

- **Save is greyed out.** Nothing has changed since the last save.
- **Mic does not type into the box.** Click in the box first so it has focus, then press the microphone. Check the voice button state (see [Voice and Keyboard](help:voice-and-keyboard)).
- **Alt+H opens History, not Home.** On the Report screen Alt+H is History. Use Alt+J then H to go home.
- **Alt+I opens Internal Note, not Messages.** On the Report screen Alt+I is Internal Note.
- **A block cannot be selected for slides.** It is Lost, Exhausted or Damaged.
- **The Clear button is missing.** It only appears when there is text.
- **Version chip missing.** It appears only when at least one version has been signed.

### Resolution steps

1. Read the exact message or badge.
2. Match it against the lists above.
3. Fix the named item (save the draft, complete the field, correct the link, fix the printer).
4. Try the action again.

### When to contact support

Contact support if a label printer agent will not connect, a signed PDF fails its fingerprint check, a save keeps failing, or a language you need for spell check is unavailable.
