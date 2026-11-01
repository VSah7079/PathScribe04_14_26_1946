---
module: Accession
workflow: Specimen Intake
role: [Accessioner, Laboratory Manager]
keywords: [accession, new case, log specimen, intake, receive specimen, assign grossing template, import order, labels, requisition, downtime, outside case]
routes: [/accession]
previous: home
next: grossing
related: [lockbox-drop-off, intraop-queue, search]
status: Draft
---

# Accession {#top}

## Overview

**Purpose.** Accession is where a specimen becomes a case. You enter (or import) the patient and order details, describe each specimen, and submit. PathScribe then gives the case its accession number, creates a grossing worksheet for each specimen, proposes a grossing template for each one, sets up the first block and stain orders, and offers labels to print.

**Intended users.** Accessioners and laboratory managers. Saving a case needs a permission of its own: if **Submit Accession** is greyed out when everything is filled in, your role does not allow it; ask your manager.

**Where it fits.** Before Accession, a specimen arrives at the bench or in the lockbox ([Lockbox Drop-Off](help:lockbox-drop-off)), and an order may already be waiting. After Accession, the case goes to [Grossing](help:grossing) and appears on the Worklist.

!!! note "What is demonstration data today"
    The waiting orders, patient index, facilities, physicians and specimen dictionary you see come from demonstration data. The grossing template suggestion is made by PathScribe's AI assistant when it is configured; if it is not, every specimen keeps the default template and the screen says so. Sending the new order to your laboratory information system depends on that connection being set up. If it is not delivered you are told with a message after the case is saved.

## Screen Tour

![The Accession screen on the Case & Patient tab](capture:accession-overview)

The screen is titled **Accession** ("Log a new Orchestration case and assign Grossing Templates per specimen"). On a wide window (about 1,480 pixels or more, which includes a full-HD monitor) it shows two columns at once: **Case & Patient** on the left, and **Specimens** on the right, with the Cytology card under the specimens when a cytology specimen is chosen. On a narrower window it has two tabs, **Case & Patient** and **Specimens**, one at a time. A third tab, **Outside Patient Data**, appears only for an outside or contract case; on a wide window it replaces the Specimens column while it is selected.

![The Specimens tab with one specimen entered](capture:accession-specimens)

![Ready to accession, the labels card and the assigned grossing templates](capture:accession-after-submit)

### Field definitions

**Import from Order (top of Case & Patient)**

| Field | What it means |
|---|---|
| Import from Order (n pending) - Optional | A search box over orders already waiting. Search by order number, MRN, patient name, date of birth or facility code. Type at least two characters. "No matching order? Skip this and enter the case details directly below." |
| Advanced Search | Opens **Order Lookup & Patient Verification**, which searches waiting orders and this laboratory's known patients side by side. |

**Patient Origin / Intake Type**

| Choice | What it means |
|---|---|
| Standard / EMR Order | The usual case. |
| Temporary / Downtime | For an unidentified patient or a registration outage. Shows a warning that the identity must be reconciled later, and a required **Downtime Reason** list; you cannot go on or submit until a reason is chosen. |
| Outside / Contract Case | External billing and report distribution. Adds the **Outside Patient Data** tab. |

**Patient**

| Field | What it means |
|---|---|
| Given Name(s), Family Name(s) | Required. |
| Preferred Name (optional) | Shown in brackets in the summary if it differs. |
| Prefix (optional), Suffix (optional) | Title and suffix lists. |
| Date of Birth | Required. |
| Sex at birth | Female, Male, Indeterminate or Not known. Starts blank (a dash) and must be chosen before the case can be accessioned. |
| Patient ID | The medical record number. Whether it is required is set by your laboratory. The placeholder text shows the expected format for the chosen facility. If you leave it blank and it is optional, PathScribe makes one. A small coloured dot beside the label shows whether the ID format is recognised (after a facility is chosen). |
| National identifier and registry choices | Appear for facilities in some countries. They record a national number and any opt-out from screening or cancer registry. |
| Priority | The case priority list set by your laboratory. Starts as Routine. |

**Encounter**

| Item | What it means |
|---|---|
| Checking for active encounters... | PathScribe is looking for a current visit for the patient ID you typed. |
| Auto-filled from Encounter #n | One active visit was found and applied. Select **Change / Unlink Encounter** to undo. |
| Select Encounter (n active) | Several were found. Choose the correct one, or "Create without encounter link (Manual Entry)". |

**Order details**

| Field | What it means |
|---|---|
| Submitting Facility | Required. The ordering facility. |
| Technical component performed by | Shown only for outside material or consultations. Choose a lab only when another lab did the processing, cutting and staining and this lab reads the case. "None (same lab)" otherwise. |
| Location (Ward / Room / Bed) | Optional unless your laboratory requires it. Choose a facility first. |
| Origin Hospital / Organisation, Site / Facility | Show where the case belongs. The site list appears when your organisation has more than one site. |
| Requesting Provider | Required. Search staff or type a name. Unverified physicians are marked "unverified". |
| Assign to Pathologist (optional) | Leave as "Unassigned - leave for triage" to let triage decide. |
| Clinical Indication | The reason for the specimen. Your laboratory may require it. It also helps PathScribe propose grossing templates and feeds the Clinical-Pathologic Mismatch Check. When you import an order, the box fills with the ordering clinician's own reason, and a small note under it names the order field it came from (for example "From the order: OBR-31 Reason for Study. Check it; edit if needed."). If you change the text the note reads "Edited from the order" and shows the original order text; both are kept on the case. Text you type yourself carries no note. |
| Check for Existing Patient (optional) | Search for a patient already known under another name (for example a name change). **This is the same patient** links the new case to that person without merging the two records. |
| ICD-10 Diagnosis Code(s) | Search by code or description and add as many as you need. |
| Case Comment (optional) | A general note about the whole case. |
| Case-Level Deficiencies (optional) | Flag a problem with the whole case, such as missing requisition paperwork. |

**Cytology (shown when a specimen is gynaecological or non-gynaecological cytology)**

| Field | What it means |
|---|---|
| Patient Detail tab | Last Menstrual Period, Hormonal Status, Reason for Study, Prior HPV Result, IUD / Contraception Use, "Persistent contact bleeding observed during specimen collection" and Prior cervical procedure. Each has "not specified" or "Not recorded" as a choice. |
| Clinical History tab | Structured history entries by category, for the whole case or for one specimen. |

**Autopsy (shown when a specimen is an autopsy specimen)**

| Field | What it means |
|---|---|
| Jurisdiction, Case Authority | Required. Medicolegal / Forensic or Hospital-Consented. |
| Authority Type, Verbal Order Received At, Verbal Order Received From | For a medicolegal case. |
| Consenting Relative Name, Relationship | Optional, for a hospital-consented case. |

**Specimens tab (one block per specimen, labelled A, B, C... or 1, 2, 3...)**

!!! tip "Letters or numbers"
    Your laboratory chooses whether specimens, blocks and slides are labelled with letters or with numbers. With the usual choice the specimens are A, B, C, the blocks are A1, A2, A3 and the slide labels read L1, L2. Another laboratory may use specimens 1, 2, 3 with blocks 1A, 1B, 1C, or letters for slides (La, Lb). The labels follow the laboratory that will do the work, once you have chosen the facility; if you change the facility, the specimens still on the form are relabelled. When you submit, the choice is saved on the case, so blocks and slides added later (at grossing or on the report) are labelled the same way, even if the laboratory changes its setting afterwards. Labels already on a case never change.

| Field | What it means |
|---|---|
| Specimen A - Dictionary Entry | Opens the specimen picker. Choose an entry, or leave "Select from Specimen Dictionary, or leave as Custom". |
| Description | Required. Filled from the dictionary entry; edit it to match the requisition. |
| Anatomic Site | For example Breast. |
| Laterality | Left, Right, Bilateral, Midline, Not applicable. A lightbulb badge "Suggested from order" means PathScribe read it from the description; it disappears when you change the field. |
| Container Type | Grouped as Histology, Cytology and Special Media. |
| Fixative Volume (mL) | Fills in from the container, and can be changed. |
| Organ(s) Included | Autopsy specimens only. Ticks which autopsy grossing sections apply. |
| Date/Time Collected | Left blank on purpose. It starts the cold-ischemia clock. |
| Date/Time Placed in Fixative | Left blank on purpose. Tick **Estimated - not directly documented** if you are estimating. |
| Date/Time Received | Starts at the current time. |
| Outside Lab Name, Outside Lab Specimen / Accession ID (optional) | The outside lab and the id it gave the specimen. A warning appears if that id is already on another case or specimen. |
| Comment (optional) | Opens a comment window for the specimen. |
| Deficiencies (optional) | Flag a problem with this specimen (damaged container, too little volume). More than one can be added. |

**More about the Case & Patient tab**

- **Prefix** also offers Sir and Dame, as well as the usual titles.
- **Preferred Name** shows the hint "If different from Given Name(s)". **Fixative Volume (mL)** shows "Real, actual volume used": enter what was actually used, not the container's size.
- **Submitting Facility** starts at "Select facility…". The **Location** list then shows "Select a Submitting Facility first" until you pick one; afterwards it offers the facility's locations, or "None specified" when you do not choose one (or says no locations are set up for that facility).
- **Select Encounter (… active)** starts at "Choose the correct encounter…". Pick the visit this specimen belongs to.
- **Check for Existing Patient (optional)** has a box "Search by name or MRN…". "No matching patients found." means nobody matched; once you choose someone the line "Will link to" names them, and **This is the same patient** confirms it.
- **ICD-10 Diagnosis Code(s)**: "No matching codes." means nothing in the code list fits what you typed.
- **Import from Order**: "Keep typing…" shows after one character, and "No pending orders match." when nothing fits.
- **Order Lookup & Patient Verification** (Advanced Search) shows "Type at least 2 characters to search." until you do, "Searching patient index…" while it works, "No pending orders match." for the **Pending Orders** list and "No existing patient record matches." for the **Known Patients** list.
- **Case comment.** The comment window for a case that is not yet accessioned is headed "(new case — not yet accessioned)".

**Cytology details**

- **Hormonal Status** choices: Premenopausal, Perimenopausal, Postmenopausal, Pregnant (or not specified).
- **Reason for Study** includes "Routine programme-invited screening" and "Private / opportunistic test".
- **Prior HPV Result** includes Negative, **Not Tested** and Unknown.
- **Structured Clinical History** panel: choose a **Category (Alt+1–6)** from "— select category —", pick the history item, then select **+ Add to Clinical History**. If you try to add without a code you see "Select a history code before adding." Entries can apply to the whole case ("Case-Level (applies to all specimens)") or to one specimen.

**Autopsy.** The block is headed "Autopsy — Case Authority & Authorization". Its boxes (Authority Type, Verbal Order Received From, Consenting Relative Name (optional) and Relationship) are the ones listed above.

**Specimens tab, further wording**

- **Container Type** starts at "Select container type…".
- Under the specimen, "Department: …" says which department PathScribe chose for it. When the department did not exist before, the line adds "(new — pending admin review)": an administrator confirms it later; you can carry on.
- **Outside Lab Name (optional)** is the outside lab; the id box beside it is the number that lab gave the specimen.
- The Deficiencies button shows the type of a single problem, as "⚠ (type) — click to edit", or "⚠ n deficiencies reported — click to manage". If the type cannot be named it reads "Deficiency reported".
- In the comment window a specimen without a description yet shows "(no description yet)".
- After accessioning, **Blocks & Stains** lists each block; a block with no stain shows "(no stains ordered yet)".

**Report Deficiencies window.** Its heading is "⚠ Report Deficiencies — Whole Case" when opened from the case, or names the specimen when opened from a specimen. Choose an **Issue**, describe it in **Detail** ("What's wrong, specifically?"), and select **+ Add Deficiency**. Once one is listed the choice is labelled **Add another issue**. The cross on a listed item ("Remove this deficiency") takes it off. Each deficiency is tracked on its own after accessioning.

**Intraoperative Entry Found.** If an unlinked intraoperative entry looks like the case, a window offers **Merge Now**, **Review in Intraop Queue** or **Not this case**. Its specimen lines show the Quick Gross dictation, or "(no Quick Gross logged)".

**Outside Patient Data tab** (only for an Outside / Contract Case)

| Section and field | What it means |
|---|---|
| Facility & Origin: Facility Account | The Submitting Facility you chose on Case & Patient. It cannot be edited here; until you choose one it says to select it on Case & Patient. |
| Facility & Origin: Ordering Provider | The Requesting Provider from Case & Patient, shown read-only. Until entered it says "(enter on Case & Patient)". |
| Facility & Origin: Account Billing Type | How the sending facility's account is billed. You can always type over any value that fills in. |
| Patient & Jurisdiction Identification: Primary Jurisdiction | The country whose payment schemes apply. Choose it before the payment category. |
| Patient & Jurisdiction Identification: Local ID Number | The patient's number under that country's scheme. The label changes to "Local ID Number (scheme)" once you choose a payment category. Until then the box says "Select a payment scheme first". |
| Financial Class & Coverage Routing: Payment Category / Scheme | The specific payment scheme for the case, listed for the chosen jurisdiction. |
| Financial Class & Coverage Routing: Primary Payer / Fund | The payer or fund, typed in free text. |
| Financial Class & Coverage Routing: Coverage / Policy # | The policy or coverage number. |
| Apply Secondary / Complementary Coverage (Split-Billing) | Tick to add a second payer. It opens **Secondary Category / Scheme** (only schemes that allow split billing are listed), **Secondary Payer** and **Member / Card ID**. |

**Specimen picker.** The **Dictionary Entry** button opens a window headed "Select Specimen — Dictionary Entry". Choose an entry to fill the specimen's description and defaults. The last choice, "— Custom specimen (not in dictionary) —", keeps your own wording for a specimen the dictionary does not list.

### Toolbar

| Button | What it does |
|---|---|
| Case & Patient, Specimens | The tabs on a narrow window, and the two column headings on a wide window. The Specimens heading shows how many specimens have a description, for example "Specimens (2)". |
| Search (magnifier) | Searches waiting orders. Enter does the same. |
| Next: Specimens | Moves to the Specimens tab. Greyed out until the required case fields are filled. Not shown on a wide window, where the specimens are already beside the case. |
| + Add Specimen | Adds the next specimen (B, C... or 2, 3...). |
| Remove specimen (x) | Removes that specimen and relabels the rest, in your laboratory's letters or numbers. Shown only when there is more than one. |
| Back | Returns to Case & Patient. Not shown on a wide window. |
| Submit Accession | Saves the case. It reads "Assigning Grossing Templates..." while working. |
| Print Labels | Labels print by themselves when you save, unless your laboratory has turned that off (Configuration > Print Settings > Print labels when a case is accessioned). The button stays on the card for reprints: it prints one requisition label and one label per container. |
| Accession Another Case | Clears the form for the next case. |
| Go to Worklist | Opens the Worklist. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Red asterisk | Required field. Which fields are required follows your laboratory's Field Requirements. |
| "Still required: ..." line | Lists what is missing. It disappears when complete. |
| "Clinical history not yet recorded: ..." | A reminder only. The case can be accessioned now and the history added later. |
| Warning banner "Specimen requisition deficiency" | An imported specimen's text did not match the dictionary. Pick the right entry or select **Confirm - no dictionary match, proceed as custom**. It blocks submission until resolved. |
| Warning "These specimens span different case types" | The specimens belong to different case types (the departments Surgical, Non-GYN Cytology and Consultation each draw their numbers from their own accession series). Today PathScribe blocks submission and asks for separate cases. Several specimens of one case type (A, B, C) stay on one case, and molecular testing is not affected: it is ordered later as an add-on on the same case and keeps that case number. |
| Lightbulb "Suggested from order" | Laterality was guessed from the description. |
| Warning triangle on Deficiencies | One or more problems are flagged. |
| Check mark on a comment button | Shows how many comments exist. |

### Hotkeys

On this screen: **Alt+N** adds a specimen, **Alt+I** goes to Import from Order, **Alt+Shift+C** opens the case comment, **Alt+.** and **Alt+,** move between the two tabs (on a wide window both are already on screen, so they change nothing you can see), and **Alt+1** to **Alt+6** jump to the clinical history categories (cytology only). **Alt+Enter** ("Submit Case") only takes you to the Specimens tab (on a wide window it changes nothing you can see); you must still select **Submit Accession** yourself. F1 opens this guide.

## Step-by-Step Procedures

### Standard workflow

1. Open Accession from the Home tile. The Case & Patient tab opens (on a wide window the specimens are beside it).
2. If an order is waiting, type its number, MRN, name or date of birth in **Import from Order**. Select the order in the list. The patient, facility, provider, clinical indication and specimens fill in; read the note under Clinical Indication and edit the text if it needs it. If the form already holds your typing, a window "Replace Unsaved Information" asks you to confirm.
3. If there is no order, leave that box and keep going.
4. Check **Patient Origin / Intake Type**; leave it on Standard unless one of the exceptions below applies.
5. Enter or check the names, Date of Birth, Sex, Patient ID and Priority.
6. Choose the **Submitting Facility**. The Patient ID hint now shows the facility's format.
7. Enter the **Requesting Provider**, and a Clinical Indication if you have one.
8. Select **Next: Specimens**. The Specimens tab opens with Specimen A. (On a wide window skip this step: Specimen A is already on the right.)
9. Select the Dictionary Entry button, pick the specimen type, then check the Description, site and laterality against the requisition.
10. Choose the Container Type, then enter the times you know: collected, placed in fixative, received.
11. For another specimen, select **+ Add Specimen** (or Alt+N) and repeat.
12. Check the "Ready to accession" card: the patient, the specimen count, priority and facility.
13. Select **Submit Accession**. A message says the case was accessioned with the number of specimens.
14. The Labels card appears. Select **Print Labels** to print one requisition label and a container label for each specimen.
15. The "Grossing Templates assigned" card lists each specimen with its template (marked "override" when an override chose it) and its reason, and a "Blocks and Stains" list shows the first block and stains created. A message follows when templates are refined.
16. Select **Accession Another Case** or **Go to Worklist**.

### Alternative workflow

1. **Scan.** Scan the label or requisition barcode while this screen is open. PathScribe returns to Case & Patient and imports the matching waiting order. A scanned label that carries patient details but no matching order fills in the name, MRN and date of birth. If nothing matches exactly, the Order Lookup window opens with your scan filled in.
2. **Advanced Search.** Select **Advanced Search** to look across waiting orders and known patients at once, useful when a name or date of birth alone does not tell two people apart.
3. **Lockbox specimens.** Scan the lockbox container's barcode (or type its order number). Saving the case then closes its lockbox receipt automatically.

### Exception handling

1. **Unidentified patient or system outage.** Choose **Temporary / Downtime**, then pick a reason under **Downtime Reason** (required; Next and Submit Accession stay greyed out until you do). A flag marks the identity to be reconciled later.
2. **Outside or contract case.** Choose **Outside / Contract Case**, finish the Specimens tab, then open **Outside Patient Data** for the primary jurisdiction, payment category, payer, coverage number and optional secondary coverage.
3. **Imported specimen does not match the dictionary.** Choose the right dictionary entry, or confirm no match exists. A record of the mismatch is kept either way.
4. **Specimens of different case types (departments).** Today they are accessioned separately. (Molecular tests are not a separate accession: order them as an add-on on the case.) Remove the other specimens, submit, then use **Accession Another Case**.
5. **Several active encounters.** Choose the correct one, or create without a link.
6. **Specimen problem found.** Use **Deficiencies (optional)** on the specimen, or **Case-Level Deficiencies** for the whole case. Choose an Issue, add Detail, and **Done**. Each becomes an open record tracked on its own; you need not resolve it now.
7. **A matching intraoperative entry exists.** After saving, a window "Intraoperative Entry Found" offers **Merge Now**, **Not this case**, or **Review in Intraop Queue**. Merge adds the entry's gross description and photos to the case.
8. **Leaving with work typed in.** The "Leave Accession?" window warns that the information will be lost. Choose **Leave and Discard** only if you mean it.

### Error recovery

1. "Accession failed: ..." The case was not saved. Read the message, correct the form and submit again. Your entries stay.
2. "A Patient ID couldn't be generated for this case. Enter the Patient ID, then submit again."
3. "n specimen(s) didn't exactly match the Specimen Dictionary - resolve on the Specimens tab before submitting."
4. "Patient match needs review: ..." The case was saved, but the patient match needs a person to look at it.
5. "The case was saved, but the order message ... was not delivered." The case exists. Ask support to resend it.
6. "Someone else changed this case at the same moment, so that detail wasn't saved. Open the case and enter it again."
7. "Import failed" or "Could not resolve order": enter the details by hand.
8. A wrong value found after saving cannot be fixed on this screen. Open the case from the Worklist or Search.

## Tips and Best Practices

### Common mistakes

- Choosing the wrong Sex at birth; the field starts blank on purpose.
- Filling the collected and fixation times with "now". Leave them blank when unknown; they are not the received time.
- Adding the same patient twice because the order was not imported. Search the waiting orders first.
- Expecting Alt+Enter to save the case. It does not.
- Choosing Temporary / Downtime but leaving the reason empty. **Next** and **Submit Accession** stay greyed out, and the "Still required" line under them lists **Downtime reason**, until you pick one. Switch back to Standard and the reason is no longer asked for.

### Efficiency recommendations

- Scan the requisition barcode instead of typing a search.
- Use Alt+N for extra specimens, Alt+. to move on, and Alt+1 to Alt+6 for clinical history in cytology.
- Pick the dictionary entry first; it fills Description, site and container for you.
- Clinical history can be completed later; do not hold the specimen for it.

### Workflow recommendations

- Accession in the order specimens were received, and print labels at once so containers are never left unlabelled.
- Accession lockbox containers first thing, urgent ones first.
- Report a specimen problem at accession so quality staff can track it.

## Related Features

### Upstream workflow

- [Home](help:home): the Accession tile opens this screen.
- [Lockbox Drop-Off](help:lockbox-drop-off): after-hours containers waiting in the Overnight folder.

### Downstream workflow

- [Grossing](help:grossing): the next step for each specimen.
- [Intraop Queue](help:intraop-queue): match intraoperative entries that were not merged here.
- [Search](help:search): find the case afterwards.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| Next: Specimens is greyed out | A required case field is empty. Read the "Still required" line. |
| Submit Accession is greyed out | A required field is empty, a specimen needs a dictionary decision, specimens belong to different case types (departments), autopsy details are incomplete, or your role does not allow saving cases. |
| No orders appear in the list | Fewer than two characters typed, or no waiting order matches. |
| A scan opens the lookup window | The scan was not an exact match to any waiting order. |
| Location list is empty | No facility chosen yet, or none configured for it. |
| Technical component field missing | It appears only for outside material and consultations. |
| Template shows "default" | The assistant was unavailable or unsure. Grossing can still proceed. |

### Resolution steps

1. Read the "Still required" line and the red banners.
2. Check the Specimens tab for banners.
3. Remove specimens that belong to a different case type (department) and accession them separately.
4. Reload the waiting orders by clearing the search box and typing again.
5. If a button stays greyed out, ask your manager to check your role.

### When to contact support

Contact your laboratory's PathScribe support when a case is reported as failed more than once, when waiting orders are missing, when labels will not print, or when the order message was not delivered. Have the case number (if one was made), the facility and the time ready.
