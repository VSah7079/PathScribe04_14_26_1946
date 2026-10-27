---
module: Intraop Queue
workflow: Intraoperative consultation
role: [Pathologist, Accessioner]
keywords: [intraop, frozen section, intraoperative, verbal report, unlinked entry, merge into accession, quick gross, touch prep, surgeon read-back]
routes: [/intraop-queue]
previous: home
next: accession
related: [accession, report]
status: Draft
---

# Intraop Queue {#top}

## Overview

**Purpose.** The Intraop Queue is where an intraoperative consultation (a frozen section) is recorded before the formal case exists. You identify the patient, record the operating room and surgeon once, then record each specimen: its quick gross description, the touch prep and frozen block work, the frozen section diagnosis and the verbal report given to the surgical team. Entries that have no formal case yet wait in a list until someone merges them into the accession.

**Intended users.** Pathologists and other staff at the bench or in the operating room corridor (the screen works on a phone browser as well as on a desktop). Accessioners and pathologists use the same screen to match a waiting entry to its case. What you can open depends on your role; if the Intraop Queue tile is missing from Home, ask your laboratory manager.

**Where it fits.** The frozen section usually happens before the specimen reaches the laboratory for formal accessioning. Record it here first. When the formal case is logged in [Accession](help:accession), PathScribe looks for a waiting entry that belongs to it and offers the merge there. You can also merge from this screen. The frozen results then travel with the case that you report in the [report](help:report) screen.

## Screen Tour

![The Intraop Queue with the new entry form above and the list of waiting entries below](capture:intraop-queue-overview)

The screen has two halves. The top is the form for a new entry. Below it is the log of entries that are still unlinked ("Pending Match").

!!! note "Demonstration data today"
    The patient lookup (ADT) uses a small set of demonstration records, and the "Simulate scan (no camera)" link invents a number. Try the lookup with MRN 12345 to see a matched patient; any other number gives "No ADT match" and you type the name and date of birth yourself.

### Field definitions

**New entry form, step 1: identify the patient**

| Field | What it means |
|---|---|
| Scan Patient Barcode | Opens the camera to read the patient wristband. The whole text read is used as the MRN. |
| Simulate scan (no camera) | A demonstration link that makes up an MRN so you can try the screen without a camera. |
| No barcode? Enter MRN manually | Shows an MRN box and the **Look Up Patient** button. |

**New entry form, step 2: patient and session**

| Field | What it means |
|---|---|
| Matched via ADT, confirm before proceeding | Shown when the number matched a patient record. It lists Name, DOB and MRN. |
| No ADT match | Shown when no record matched. Enter **Patient name (Last, First)** and **Date of birth** yourself. |
| I have verified this is the correct patient | You must tick this. Changing the name or date of birth clears the tick. |
| OR number | The operating room, for example OR-3. Required. |
| Surgeon | The operating surgeon. Required. |
| Submitting facility (optional) | Choose the facility. Your laboratory may have made it required. |
| Location, ward / room / bed (optional) | Lists the locations of the chosen facility. It stays greyed out until you choose a facility. |

Your laboratory can change which of these fields are required. A line beginning "Still required" under the form names what is missing, and the **Continue to Specimen** button stays greyed out until nothing is missing.

**New entry form, step 3: one specimen**

| Field | What it means |
|---|---|
| Specimen label | Name of the specimen, for example "Specimen A: Left breast, margins". Required. |
| Quick Gross, dimensions, blocks frozen, orientation | A short gross description. Required. |
| Frozen section diagnosis | Optional here. If it is not read yet, add it later from the specimen card (see Alternative workflow). |
| Preliminary category | Benign, Malignant, Atypical / Suspicious or Deferred. This category, not the diagnosis text, is what is compared with the final category at sign-out. Your laboratory may require it whenever you enter a diagnosis. |

**Entry card in the log**

| Item | What it means |
|---|---|
| Pending Match | The card does not show the patient name or MRN. It shows the OR, surgeon, facility, location, who recorded it and how the patient was identified. |
| STAT / Routine button on a specimen | Switches which frozen section time target the clock counts against. It disappears once the frozen diagnosis is recorded. |
| Timeline | The time of each step logged for the specimen: Gross Logged, Touch Prep Performed or Touch Prep Skipped (with its reason), Frozen Section Cut. |
| Preparation Type and Block Count | Records what was actually made: Frozen Block(s), Touch Prep / Smear, Squash Prep, Cytology / Fluid Evaluation, or Gross Only / Intraoperative Consultation. Each is numbered automatically. |
| Quick Gross, Frozen section diagnosis, Preliminary cytology | The text recorded for the specimen. |
| Verbal report line | Shows the time, who received the report and their role, a "Read back" tag and a "Critical result" tag. |

More wording:

- While the page reads the queue it says "Loading intraoperative entries…".
- On a new entry, once a facility is chosen the **Location** list offers that facility's locations; before that it says "Select a facility first", and "None specified" lets you leave it blank.
- A queue card ends with "matched via barcode scan (simulated)" or "matched via manual / ADT entry", showing how the patient was matched. The scan route is a demonstration today.
- In the merge window, besides the suggested cases, the last choice is "Enter case ID manually" for a case that is not on the list.

### Verbal report form labels

The form that **Log Verbal Report** opens is headed "Verbal report to the surgical team".

| Label | What it means |
|---|---|
| Dictate the report | A box for speaking or typing who you told, their role and whether they read it back. **Fill in from dictation** then fills the fields below. |
| Mentioned | A small tag on a surgeon-unavailable reason that the dictation appeared to name. It is only a suggestion; choose the reason yourself. |
| Suggested critical result | A notice shown when the frozen diagnosis matches your laboratory's list of critical terms, with the specimens that matched. The **Critical result** tick box stays yours to set. |
| Type to search, or enter a name | Hint in **Received by**. Pick a suggested name or type one. |
| Why the surgeon couldn't be reached | Hint for the short reason you type when you choose Other as the reason the surgeon was unavailable. |
| Say briefly why, in a few words. | Appears while that reason is too short to log. |
| Note on the verbal report to the surgeon | The optional note line at the bottom of the form. |

When something is missing, the "Still required" line names it with the same wording as the field. Two names used there are **Surgeon unavailable: reason** (which reason applied) and **Surgeon unavailable: note ("Other")** (the short explanation for Other).

### Toolbar

| Button | What it does |
|---|---|
| View Log / Hide Log (with a count) | Shows or hides the list of waiting entries. On a phone the log starts hidden so that the form is in view. |
| Live status badge | Shows whether the list is updating by itself. New entries, diagnoses and merges from other devices appear without reloading. |
| Switch to Full Desktop View | Only on a phone. Leaves the phone layout and returns to Home. |
| Save & Next Specimen | Saves this specimen and returns to the specimen step for the next one in the same session. |
| Save & Close | Saves this specimen, ends the session and puts it in the log. |
| Cancel | Asks "Discard current entry?" if you have gone past the scan step. Choose **Discard and Start New** or **Cancel, keep working**. |
| Log Quick Gross | Records the quick gross on a specimen card (when it was not entered earlier). |
| Capture Gross Photo | Takes a photo of the specimen with the camera. It appears as a thumbnail on the card. |
| Log Touch Prep Performed / Skip Touch Prep | Records the touch prep step. A skip asks for a reason: Fibrotic / Scant, Direct to Frozen, or Other with a typed reason. |
| Log Frozen Block(s) and the other Log buttons | Records preparations of the type chosen in Preparation Type. |
| Log Verbal Report | Opens the verbal report form. |
| Merge Mobile Intake Data | Opens the merge window for that entry. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Lock icon and "Pending Match" | The entry is not yet linked to a case, so the patient is hidden until you merge it. |
| Red dot on a timeline row | The step was skipped (touch prep). |
| Read back / Critical result tags | On the verbal report line: the read-back was confirmed; the result was marked critical. |
| MRN match / Fuzzy (high or medium) | In the merge window: how strongly a case matches the entry. |
| Asterisk (*) after a label | The field is required. |

**"Still required" names.** When fields are missing, the line under a form lists them by name. In the intraoperative forms the names include **Case to merge into** (the case ID in the merge window) and **Reason for skipping touch prep ("Other")** (the note you must write when you choose Other as the reason for skipping the touch prep).

### Hotkeys

The keys work while the Intraop Queue is open.

| Key | Action |
|---|---|
| Alt+O | Open Intraop Queue (from other screens). |
| Alt+S | Start New Intraop Entry. If you have an unsaved entry, you are asked before it is discarded. |
| Alt+Shift+Y | Log Touch Prep Performed. |
| Alt+T | Skip Touch Prep (records the reason Direct to Frozen). |
| Alt+Shift+L | Log Frozen Section Cut (one frozen block). |
| Alt+Shift+S | Log Squash Prep. |
| Alt+Shift+C | Log Cytology / Fluid Evaluation. |
| Alt+Shift+G | Log Gross Only. |
| Alt+L | Log the verbal report, while the verbal report form is open. |
| Ctrl+Alt+Shift+1 | Continue to Specimen. |
| Ctrl+Alt+Shift+2 | Save & Next Specimen. |
| Ctrl+Alt+Shift+3 | Save & Close. |
| Ctrl+Alt+Shift+4 | Merge, while the merge window is open. |

!!! note "One specimen only"
    The touch prep and preparation keys (and their spoken phrases) work only when the session has exactly one specimen. With two or more specimens, use the buttons on the specimen you mean. Each key applies the same checks as its button.

## Step-by-Step Procedures

### Standard workflow

1. Open the Intraop Queue from Home, or press Alt+O. The new entry form shows **Scan Patient Barcode**.
2. Select **Scan Patient Barcode** and read the wristband, or select **No barcode? Enter MRN manually**, type the MRN and select **Look Up Patient**. The patient step opens.
3. If the patient matched, read the name, DOB and MRN against the patient. If there was no match, type the name and date of birth.
4. Tick **I have verified this is the correct patient**.
5. Enter the OR number and the surgeon. Choose the facility and location if you know them.
6. Select **Continue to Specimen**. The specimen step opens with a banner showing the patient, OR and surgeon.
7. Enter the specimen label and the quick gross description.
8. If the frozen section is already read, enter the diagnosis and choose the preliminary category.
9. Select **Save & Next Specimen** for another specimen from the same patient, or **Save & Close** for the last one. The banner counts the specimens saved. After Save & Close the entry appears in the log as Pending Match.
10. Later, on the entry card, add the touch prep, the frozen blocks and the other preparations (see the alternative workflow), then record the verbal report.
11. To record the verbal report, select **Log Verbal Report** and complete the form (see below), then select **Log Now**. The line shows who received it. The time is the time you press the button and cannot be edited.
12. When the formal case exists, select **Merge Mobile Intake Data** on the entry card. The merge window opens.
13. Choose the matched case (an MRN match is listed first) and select **Merge into** that case number. The entry leaves the log. The frozen section diagnosis and the photos are added to the case as intraoperative findings; the final diagnosis is not changed. A case number you type by hand must be a real case: if it is not found, the window stays open and says so.

**The verbal report form**

1. Optional: tap the dictation box, speak or type who you told, their role and whether they read it back, and select **Fill in from dictation**. Fields that were filled are tagged "From dictation". Check each one.
2. Check **Critical result** if it is one. PathScribe suggests this when the frozen diagnosis matches your laboratory's list of critical terms; you decide.
3. In **Received by**, type a name or pick from the suggestions (the session's surgeon is listed first).
4. Choose the recipient's role: Operating surgeon, Surgical fellow, Surgical resident, Physician assistant or Designated OR staff.
5. Tick the read-back box: the recipient repeated the patient identifiers and the diagnosis. You cannot log without it.
6. If the result is critical and went to anyone but the operating surgeon, select **Surgeon unavailable** and choose a reason. For Other, give a short reason of a few words.
7. Optionally add a note, then select **Log Now**.

### Alternative workflow

1. To add the frozen section diagnosis after the session is saved, type it in the **Add the frozen section diagnosis** box on the specimen card, choose the category, and select **Save diagnosis**. The clock stops and the diagnosis shows on the card. If the entry has already been merged, the diagnosis is added to the case as well.
2. Log the quick gross after the session is saved: on a specimen card, type the description and select **Log Quick Gross**. Touch prep and frozen block logging stay unavailable until you do.
2. Choose Preparation Type, set Block Count for frozen blocks, and select the Log button. For example, three frozen blocks are numbered one after another.
3. For an accessioner: when you log a new case in [Accession](help:accession), a window titled "Intraoperative Entry Found" offers **Merge Now**, **Not this case** or **Review in Intraop Queue**.

### Exception handling

1. If the touch prep cannot be done, select **Skip Touch Prep** and pick the reason. The skip shows in the timeline.
2. If no case matches, the merge window says "No automatic match found, enter the case ID". Type the case number. Check it carefully.
3. If you change your mind mid-entry, select **Cancel** and then **Discard and Start New**. The unsaved patient and specimen details are lost.
4. If the specimen is routine rather than STAT, select the STAT button on it to switch to Routine before the frozen diagnosis is recorded.

### Error recovery

1. If a button is greyed out, read the "Still required" line and complete the named fields.
2. If you try to log the touch prep or frozen block before the quick gross, the quick gross box is shown instead. There is no override.
3. If "The verbal report couldn't be logged. Check the details and try again." appears, check the red lines and select **Log Now** again.
4. If you merged into the wrong case, tell your laboratory manager or quality staff with the case number. The screen has no undo.

!!! warning "Check the patient"
    The Pending Match card hides the patient, but the merge window shows the name and MRN. Confirm they match the case before you merge. A wrong merge puts one patient's frozen results on another patient's case.

## Tips and Best Practices

### Common mistakes

- Starting a second session for a second specimen from the same patient. Use **Save & Next Specimen** instead.
- Leaving the verbal report until later. Its time is the time you log it, so log it when you give it.
- Choosing a preliminary category that disagrees with the diagnosis text. The category is what is compared at sign-out.

### Efficiency recommendations

- Use the keyboard or spoken phrases for the touch prep and preparation steps when the session has one specimen.
- Tap the Quick Gross box, then the microphone, to dictate it.
- Pick the recipient from the suggestions instead of typing.

### Workflow recommendations

- Open the Intraop Queue at the start of the shift and keep it open; entries from other devices appear without a refresh.
- Merge entries as soon as the formal case exists, so that the log holds only entries still waiting.

!!! note "What is not yet built"
    The frozen section diagnosis entry box appears only in the new entry form. A specimen saved without one has no box on its card to add one later, even though the form says it can be added later. The frozen findings are copied onto the case when you merge, but no screen shows them yet. The merge window's note about appending to the Gross Description and Clinical History does not describe what happens today.

## Related Features

### Upstream workflow

- [Home](help:home): the Intraop Queue tile.

### Downstream workflow

- [Accession](help:accession): log the formal case and merge a waiting entry.
- [Report](help:report): the case report, where a critical result record carries the verbal report.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| No Intraop Queue tile on Home | Your role does not include it. |
| Continue to Specimen is greyed out | The patient is not ticked as verified, or a required field is empty. See "Still required". |
| Camera scan does not start | Camera permission was refused on the device. Use manual MRN entry. |
| "Requesting camera access…" stays on the barcode scanner | The browser is waiting for you to allow the camera. Allow it when asked. Once the camera is running it reads "Point the camera at the patient barcode." |
| "No camera was found on this device." | Barcode scanner or photo window: the device has no camera the browser can use. Use manual MRN entry, or attach the photo from another device. |
| "Could not start the camera: …" | The barcode scanner could not open the camera; the reason follows (for example the camera is in use by another program). Close the other program and try again. |
| "Unexpected barcode scan error" | The scanner failed in a way it could not describe. Cancel, then try again or enter the MRN by hand. |
| "Could not access the camera (…)." | The photo window could not open the camera; the name of the browser's reason is in the brackets. Check the camera and the browser's permission for this site. |
| "Could not process the captured frame." | The photo was taken but could not be read from the camera picture. Select the capture button again. |
| "Uploading…" then "Upload failed." | The photo window is saving the picture (the button reads "Uploading…" and **Cancel** is greyed out). If it fails, the message appears in the window and the photo is not attached; select the capture button again. |
| "No ADT match" for a real wristband | The patient record was not found. Type the name and date of birth. |
| Touch prep buttons are missing | The quick gross has not been logged for that specimen. |
| Spoken or keyed preparation commands do nothing | The session has more than one specimen. Use the buttons. |
| The merge window lists no case | The case is not yet accessioned or no case matches. Enter the case number manually. |
| The log looks empty | Everything has been merged, or the log is hidden. Select **View Log**. |

### Resolution steps

1. Read the "Still required" line and complete each field.
2. Refresh the page and open the log again.
3. Use manual entry if the camera does not work.
4. Check with the accessioner that the formal case exists before merging.

### When to contact support

Contact your laboratory's PathScribe support when an entry is missing from the log, a merge fails, or a verbal report will not log after you have completed the form. Have the OR number, the case number and the time of the problem ready.
