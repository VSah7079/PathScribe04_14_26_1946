---
module: Cytology
screen: Screening Case
workflow: Cytology screening, QC and sign-out
role: [Cytotechnologist, Pathologist, Fellow]
keywords: [screening case, cytology workspace, bethesda, cisoe-a, cisoea, dutch, palga, bscc, rcpath, munchen iii, sfcc, adequacy, interpretation, recommendation, hpv, reflex, qc rescreen, mandatory qc, secondary review, pathologist review, sign out, countersign, recall, follow-up, 5-year lookback, retrospective review, histology correlation, cyto-histologic, rose, cell block, synoptic, final diagnosis, addendum, correction, preliminary report]
routes: [/cytology-worklist/:caseId]
previous: cytology
next: report/sign-out-and-release
related: [cytology, worklist, quality, molecular, wsi-viewer, case-flags, report/case-team, messaging, add-on-orders]
status: Draft
---

# Screening Case {#top}

## Overview

**Purpose.** The Screening Case page is where one cytology specimen is screened, reviewed and signed out. You enter your finding in the lab's reporting system (Bethesda, the UK BSCC/RCPath terms, the German München III groups, the French SFCC wording, or the Dutch CISOE-A six-axis score), see the earlier reviews, the HPV result and the patient's history, take part in QC and peer review, and finally sign the report out.

**Intended users.** Cytotechnologists record the first screen and QC rescreens. Pathologists and fellows review, choose the final diagnosis and sign out whatever a cytotechnologist may not sign out. The page works out your part in the case by itself.

**Where it fits.** You get here by selecting a case on the [Cytology Worklist](help:cytology) (or, as a pathologist, from the Cytology Review tile in the [Worklist](help:worklist)). After sign-out, the report is released (see [Sign-out and release](help:report/sign-out-and-release)). The cases that need a later quality step then show on the QA & Compliance tiles of the Cytology Worklist.

!!! note "Orchestration cases only"
    The page works only for cases that PathScribe manages itself. A case managed by an outside laboratory system shows "This case is managed by an external LIS (assist mode)..." and a **Back to Worklist** button. A case with no cytology specimen shows "No qualifying cytology specimen found on this case."

## Screen Tour

![The Screening Case page with the review history on the left and the review form on the right](capture:cytology-screening-case-overview)

The page has a header (case, patient and a row of buttons), several bars and banners that appear only when they apply, and two columns. The left column holds context: your role, the workload, Mandatory QC, HPV, patient history and the review history. The right column holds the form where you record your review.

!!! note "Demonstration data today"
    The HPV results, scans and AI triage come from the demonstration cases. The molecular platform, the registers and the scanner are not connected to a real site yet. The sample dictionary shown here is the demonstration dictionary; your laboratory manager sets the real one.

### Field definitions

**Header**

| Item | What it means |
|---|---|
| Case *number* | The case reference. |
| Vial type, slides | Batch 760 (Cytology Workspace spec): the screen shows no patient name, date of birth or MRN, so nothing of the patient is readable on an open screening monitor. Under the case number it shows each specimen's vial type and description and up to three slide ids, for example "A: ThinPrep – Cervical · Slides …". A badge shows the patient's registry opt-outs when there are any. **Ask a Colleague** names the case by its accession. |
| LMP | Last menstrual period. Type or pick a date; it saves when you leave the box. Required (marked *) on a GYN specimen if your laboratory requires it for the review. |

**Specimen tabs**

When the case has more than one cytology specimen, a tab for each appears ("Specimen A" and its description) with its status: Draft, Revision requested or Signed out. Each specimen is reviewed and signed out on its own. "*N* of *M* specimens signed out" shows the progress. The case report goes out when the last specimen is signed (see "Finalize the case early" below).

**Left column**

| Card | What it shows |
|---|---|
| Your Role for This Review | Your role, set automatically. See the table of roles below. "Determined automatically from review history and your account role." If you already reviewed the case it says "You already reviewed this case - editing your own review below." |
| Review Mode (cytotechnologists only) | How you screened this pass, which sets the weight toward your workload limit: Full Manual Screen (1.0 SCU), Liquid-Based Non-Gyn (0.5 SCU), FOV-Assisted, No Rescreen (0.5 SCU), FOV + Full Manual Rescreen (1.5 SCU). A pathologist's review does not count toward the limit. The small hint beside the title reads "(CLIA workload weight)". |
| Your workload (last 24 hours) | The same counter as on the worklist, and a banner when you approach or reach the limit. |
| Mandatory QC | Whether the specimen is flagged for QC (see "QC rescreen"). |
| HPV Co-Testing | The HPV result that arrived from the molecular platform. Read-only; the hint beside the title says "(upstream molecular result — read-only)". It lists "Co-test ordered" (Yes or No), the reason, the result and its flag, the "Reference range" the laboratory sent, and the "Genotype" (for example 16 or 18). When no result has arrived it says so. |
| Liquid-based platform, HPV assay (name), Action on the positive HPV result | Details you can record. See "HPV and reflex testing". When the action is Colposcopy referral, two dates appear: **Referred on** and **Response received on**. The UK failsafe report counts the referral and flags it if no response is recorded after 28 days. |
| Patient Cyto/Histo History | The hint beside the title reads "(prior cases for this patient)". Two lists: "Prior Pap Smears" with the final result (a smear that was never finalized reads "no final diagnosis on record"), and "Prior Surgical Biopsies", each biopsy with a **View Case** button. |
| 5-Year Retrospective Lookback | Shown when the diagnosis you are entering is high grade: the patient's earlier negative or low-grade Paps in the last five years, with **View Case**. |
| Review History | Every review recorded on this specimen, newest information in each card (see below). Before anyone has saved a review it reads "No reviews recorded yet." |

**Roles the page assigns**

| Role shown | When |
|---|---|
| Primary Screener | You are not a pathologist and nobody has reviewed this specimen yet. |
| Secondary Reviewer | You are not a pathologist and a review already exists. |
| QC - Random Selection / QC - Targeted High-Risk | The specimen carries a QC flag that no matching rescreen has cleared. |
| Pathologist Review | You are a pathologist. |
| Post-Sign-Out Peer Review - Random Selection / Targeted High-Risk | You are a pathologist other than the signer, and the signed-out specimen was picked for peer review. |

**A card in Review History**

| Item | What it means |
|---|---|
| Badge INITIAL REVIEW or the role | The type of review. |
| FINAL DIAGNOSIS | The review chosen as the final diagnosis. |
| CT-ELIGIBLE / PATHOLOGIST REQUIRED | Whether a cytotechnologist may sign out on this review. Hover to see the reasons. |
| Name and date | Who recorded it and when. |
| Adequacy, General Categorization, Primary, Additional, Recommendations | The review's content. |
| Agreement with the initial review | On every later review: exact, minor discrepancy or major discrepancy (with false negative, false positive or high-grade skip), and "Adequacy differs from the initial review." |
| Quoted notes | The review's notes. |
| Notes from other reviewers | Notes with a section, a status (Open, Acknowledged, Revised, Resolved by pathologist) and the person and date. |
| Clone, Revise and sign out, Set as Final | Buttons, described under Toolbar. |

**Right column: the review form (Bethesda-style systems)**

The title is **Record a New Review**, or **Edit Your Review** when you already have one.

| Field | What it means |
|---|---|
| General Categorization | The broad group, for example Negative for Intraepithelial Lesion or Malignancy. One choice. |
| Specimen Adequacy | One or more choices; each can carry a comment. Type in the box that reads "Search adequacy…" to narrow the list. |
| Primary Interpretation | Exactly one; it can carry a comment ("(exactly one; may carry a comment)" beside the title). Always required. Type in "Search primary interpretation…" to narrow the list. |
| Additional Interpretations | Any number, each with a comment if needed. The one you chose as primary is not offered again. The search box reads "Search additional interpretations…". |
| Recommendations | Any number, each with a comment if needed. The search box reads "Search recommendations…". |
| Notes | Free text with spell check. |

Which of these are required is set by your laboratory (Field Requirements, page Cytology). The primary interpretation is always required. When something is missing, the line "Still required: ..." names it and **Save** stays off.

**Right column: the CISOE-A form**

| Field | What it means |
|---|---|
| C - Composition | Score 0 to 9 ("(0-9)" beside each axis name), with a comment. |
| I - Inflammation | Score 0 to 9, with a comment. |
| S - Squamous Epithelium | Score 0 to 9, with a comment. |
| O - Other / Endometrium | Score 0 to 9, with a comment. |
| E - Endocervical Epithelium | Score 0 to 9, with a comment. |
| A - Adequacy | Satisfactory, Suboptimal or Unsatisfactory. |
| Notes | Free text. |

The form is headed "Record a New CISOE-A Review", or "Edit Your CISOE-A Review" when you already have one. All six components are required. Comments and notes are required only if your lab says so (the comment box then reads "Comment (required)").

### Toolbar

**Header buttons**

| Button | What it does |
|---|---|
| Spelling language | Sets the spelling language of the case. |
| Open EMR | Opens the patient's record from the hospital system in a second window, or in a side drawer if the browser blocks the window. |
| Print | Opens the PDF of this specimen's report. Before sign-out it is a preview; after sign-out it is the report as signed. |
| Attachments (n) / Add Attachments | Opens the Attachments window for the case's photos, files and links; images placed in the cytology report print after its pages. Greyed out without permission. |
| Print case report | Only after the case report was released and the case has more than one specimen. Opens the consolidated report. |
| Synoptic | Non-GYN only, for a pathologist or a CT holding an advanced sign-out credential, and never at a CISOE-A laboratory. Opens the **Synoptic Reporting** drawer: choose a template, answer the fields, **Save Synoptic**, or **Insert into Notes** for the generated narrative. The first box reads "Select Synoptic Template". A warning headed "Unvalidated Clinical Terms" lists clinical terms that have no validated translation in your language; tick the acknowledgment to continue. |
| Material | Opens the material drawer: the decants on this specimen, **Add Residual Fluid**, **Add Cell Block**, and the stains for each. A specimen with no decants says "No decants recorded for this specimen." Batch 739: each decant is named with its type, "D1 — Cell Block"; a portion set aside for a test is an aliquot named by its purpose, "D1 — Aliquot for HPV testing". |
| ROSE | Non-GYN only. Rapid on-site evaluation: location (Clinic, Operating Room, Radiology or Other), one or more passes each with adequacy (Adequate, Inadequate, Indeterminate) and a preliminary impression, and **Save Evaluation**. Earlier evaluations are listed under "Prior ROSE Evaluations"; the form for a new one is headed "Record New Evaluation", and **Add Pass** adds a further pass to it. |
| Codes | Opens the code window to add ICD, SNOMED, ICD-O or CPT codes to the specimen. |
| Billing | Opens the billing review drawer: review, approve or correct the case's billing codes. Each change is charged or credited and audited. |
| Flags | Opens the case flags window. This is not the high-risk QC flag; it is the general case flag. |
| Team | Opens the case team window. |
| Delegate | Opens the delegate window. |
| Req. Review | Opens the request-review window to ask a colleague to look at the case. |
| Slide preview | Appears only when your laboratory screens on whole-slide images: a small reference preview ("Reference preview. Not for diagnosis."), or **Open slide**. Selecting it opens the slide in your laboratory's digital pathology application (see [Slide Images](help:wsi-viewer)). |

**Other buttons**

| Button | What it does |
|---|---|
| Back to Worklist | Returns to the worklist (or to the queue you came from). If you have unsaved changes you are asked "You have unsaved changes to this review. Leave without saving?" |
| Save as *role* / Update Review | Saves your review. |
| Request Peer Review | Opens the request-review window. |
| Clone | Copies another review into your form, as a start. |
| Revise and sign out | For a pathologist, on another person's review before sign-out (not at a CISOE-A laboratory): loads that review into your form as your own. Saving makes it the final diagnosis and opens the signature. A banner above the form says whose review you are revising, and **Stop revising** drops the loaded review and returns you to a blank form. |
| Set as Final | Makes that review the specimen's final diagnosis. |
| Flag High-Risk QC / Remove Flag | Adds or removes the specimen's QC flag. |
| Add note, Acknowledge, *N* earlier versions, Load into form | On the review cards (see the procedure for notes). |
| Sign Out | Signs out the specimen. |
| Correct diagnosis, Add addendum | After sign-out. |
| Send urgent preliminary | Sends an early, marked preliminary report before sign-out. |
| Finalize case now | Appears when some specimens are signed out and some are not. |
| Return to Trainee | Appears for an attending when a trainee's specimen was released for countersign. |

**What you need to be allowed to do each thing**

Your laboratory manager gives these permissions by role. A button without its permission is greyed out; if you still get a refusal, a message names it.

| Action | Permission in plain words |
|---|---|
| Open this page | Open the Cytology Workspace. |
| Save or update a review | Record cytology reviews. |
| Set as Final | Choose the final diagnosis. |
| Sign Out | Sign out cytology reports (pathologist track); a cytotechnologist also needs the cytotechnologist sign-out permission. |
| Remove Flag | Remove QC flags. Adding a flag needs no permission. |
| Complete Review (5-year lookback) | Record retrospective reviews. |
| Confirm & Record, Record (correlation) | Record cyto-histologic correlations. |
| Finalize case now | Finalize a cytology case early. |
| Correct diagnosis / Add addendum | Correct a cytology report / add an addendum to one. |
| Send urgent preliminary | Send a cytology preliminary report. |
| Attachments | Place images in a report; attach, link or remove case files. |
| Record Concurrence, Record Discrepancy (QC bar) | Record cytology QC reviews. |

### Icons and status indicators

| Indicator | Meaning |
|---|---|
| Green "Ready to sign out." | The specimen can be signed out by you. |
| "Pathologist sign-out required: ..." | A cytotechnologist may not sign out; the reasons follow: non-GYN specimen, needs pathologist review, unsatisfactory adequacy, flagged for QC, unvalidated synoptic translation, revision requested from the author. |
| "Select a Final Diagnosis below before this case can be signed out." | Choose one review with **Set as Final** first. |
| "Signed out by … on …." (the name, then the date and time) | The specimen is signed. The form is replaced by correction and addendum actions. |
| Amber banner: Approaching your prorated CLIA screening limit... | Your workload limit is near. |
| Suggested: Abnormal / Malignant / Critical | Advice from the highest severity of the Bethesda interpretation you are entering. It does not block sign-out. |
| Violet card edge on HPV | The HPV result is Positive. |

### Hotkeys

These keys work while the Screening Case page is open. Their spoken phrases are in brackets.

| Key | Action |
|---|---|
| Ctrl+Alt+Shift+A | Save Cytology Review ("save review"). Does the same as Save, with the same checks. |
| Ctrl+Alt+Shift+B | Save CISOE-A Review ("save CISOE-A review"). |
| Ctrl+Alt+Shift+C | Complete Retrospective Review ("complete retrospective review"), when that banner is showing. |
| Ctrl+Alt+Shift+D | Record Cyto-Histologic Correlation ("record correlation"), for the first correlation banner on screen. |
| Ctrl+Alt+Shift+E | Open Material. |
| Ctrl+Alt+Shift+H | Add Residual Fluid. |
| Ctrl+Alt+Shift+I | Add Cell Block. |
| Ctrl+Alt+Shift+J | Open the Cytology Synoptic drawer. |

Sign-out has no key or spoken command on purpose, so a misheard command cannot sign a report.

## Step-by-Step Procedures

### Standard workflow

**Screen a GYN case as a cytotechnologist.**

1. Select the case on the Cytology Worklist. The page opens. Check the accession and the slide id against the slide label.
2. Read the left column. Note the HPV card, the patient history and any banner above the columns.
3. Choose your **Review Mode** if you are a cytotechnologist and it is not "Full Manual Screen".
4. In the form, choose the **Specimen Adequacy**. If it is unsatisfactory, a cytotechnologist cannot sign out this specimen.
5. Choose the **General Categorization** and the **Primary Interpretation**. Add **Additional Interpretations** and **Recommendations** as needed. Add comments where they help the reader.
6. Add **Notes**, then check that no "Still required: ..." line is left.
7. Select **Save as Primary Screener** (the button shows your role). A review card appears in Review History under INITIAL REVIEW. If the patient is high risk, a warning toast says "This case was flagged for mandatory QC review - the patient meets one or more standard high-risk criteria." If the case was picked at random, a toast says "This case was randomly selected for mandatory QC review."
8. If the slide had a completed AI result, a window titled "AI Screening Concordance" asks whether your finding agrees with it. It states the AI result (for example "Review Recommended", with its group out of five, or the number of AI-flagged fields of view). Select **Agree** or **Disagree**. It is asked once, after your finding is saved, so it cannot bias your finding.
9. If the review needs a pathologist (an abnormal result, for example), the case waits for one. If the result is negative and nothing blocks it, go on to sign-out.

**Sign out a specimen.**

1. On the review you want to report, select **Set as Final**. A FINAL DIAGNOSIS tag appears on that card. A cytotechnologist can set a review as final only when a cytotechnologist may sign it out; otherwise the button is greyed out and the message says only a pathologist may select it.
2. Check the row above the columns. It must say "Ready to sign out."
3. Select **Sign Out**. If the clinical mismatch check finds a mismatch with the clinical history, a window shows it first; decide there, then continue.
4. The signature window opens ("Confirm your signature to sign out this case"). Confirm your signature.
5. The banner "Signed out by … on …." appears, with the name of the signer and the date. If this is the last specimen the toast says "Report signed out."; if not, it says how many specimens remain. If you are a trainee, the toast reads "Case … released for countersign" (with the case number) and an attending now reviews it.

### Alternative workflow

**Enter a Dutch CISOE-A review.** This is the form shown at a laboratory whose reporting system is CISOE-A (PALGA).

1. Score each of the five axes from 0 to 9: C (Composition), I (Inflammation), S (Squamous), O (Other / Endometrium) and E (Endocervical). Add a comment where useful.
2. Choose **A - Adequacy**: Satisfactory, Suboptimal or Unsatisfactory.
3. Watch the blue suggestion: if the highest of S, O and E is 5 or more it says "Suggested: refer for colposcopy (moderate dyskaryosis or worse)."; from 2 to 4 it says "Suggested: recommend HPV genotyping (16/18 vs. other high-risk) to guide colposcopy vs. repeat cytology." It is advice. You still decide the recommendations.
4. Select **Save**. Red messages list what is missing or out of range. An amber warning appears when adequacy is Unsatisfactory but S or E is above 1: the finding is kept and flagged for review, not discarded.
5. The page also saves the Bethesda equivalents so reports, QC and sign-out rules work. The most severe axis becomes the primary interpretation; any other abnormal axis becomes an additional interpretation. S: 0-1 negative, 2-3 ASC-US, 4 LSIL, 5-7 HSIL, 8-9 squamous carcinoma. O and E: up to 2 negative, 3 atypical (not otherwise specified), 4-5 atypical (favor neoplastic), 6-7 adenocarcinoma in situ, 8-9 adenocarcinoma. ASC-H is never assigned. Suboptimal adequacy is treated as satisfactory; Unsatisfactory is treated as insufficient and blocks a cytotechnologist's sign-out.

**Report in the UK, German or French terms.** The form is the same as the Bethesda-style form; only the choices change.

| System | Adequacy | Interpretation choices (examples) | Recommendation choices (examples) |
|---|---|---|---|
| Bethesda | Satisfactory for Evaluation; two Unsatisfactory choices | Reactive changes, ASC-US, ASC-H, LSIL, HSIL, squamous cell carcinoma, atypical glandular, AIS, adenocarcinoma | Routine screening interval, repeat cytology, refer for colposcopy, HPV genotyping |
| BSCC / RCPath (UK) | Satisfactory; Unsatisfactory / Inadequate | Negative, Borderline Changes in Squamous Cells, Low-Grade Dyskaryosis, High-Grade Dyskaryosis (Moderate or Severe), ?Glandular Neoplasia | Return to Routine Recall, Direct Referral to Colposcopy, Urgent (2-Week) Colposcopy Referral, 62-Day Suspected Cancer Pathway Referral |
| München III (Germany) | Adequate / Inadequate for Evaluation | Group I, IIa, II-p, II-g, II-e, III, IIID1, IIID2, IVa, IVb, V (squamous, glandular, endometrial) | Return to Routine Screening, hrHPV Triage, Repeat Co-Testing in 12 months, Colposcopy / Excision Biopsy |
| SFCC (France) | As Bethesda, in French | As Bethesda, in French | As Bethesda, in French |

SFCC is not a separate set of categories: it is the Bethesda list shown with French wording. Your laboratory manager picks the system for your facility. The ranks and rules of each system are its own; the systems are not converted into one another on screen.

**Do a QC rescreen** (a cytotechnologist).

1. On the Cytology Worklist, open a slide from **QC / Rescreen** that you did not screen first.
2. The card "Your Role for This Review" says QC - Random Selection or QC - Targeted High-Risk. The card **Mandatory QC** says who flagged it and when.
3. Screen it independently and save with **Save as QC - ...**. The slide leaves the QC / Rescreen tile, and the page stores how your review agrees with the first screen (exact, minor or major discrepancy). Your rescreen is also recorded as a secondary-screening quality entry, marked concordant or discordant against the first screen.
4. If you did the first screen yourself, the save is refused: "You did the primary screen on this specimen, so another screener must do the QC rescreen. Use "Ask a colleague" on the QC / Rescreen tile."

**Add a note to someone else's review.**

1. On the review card, select **Add note**. A small form opens.
2. Choose the section the note is about: Adequacy, General categorization, Primary interpretation, Secondary interpretations, Recommendations or Notes.
3. Type the note. Tick **Requires revision (a cytotechnologist can't sign out until it's revised)** only if the author must change the review before sign-out.
4. Select **Save note**. The author sees it as Open. The author selects **Acknowledge**, edits the review and saves; the note becomes Revised. A pathologist's own review closes an open revision request as "Resolved by *name*'s pathologist review."
5. You cannot leave a note on your own review.

**Record a cyto-histologic correlation.** The banner "Cyto-Histologic Correlation Candidate" appears when a later case for the same patient may be the biopsy of an abnormal cytology result.

1. If the banner shows "Cytology: ... - Histology (from SNOMED coding): ... - Outcome: ...", check it against the biopsy case and select **Confirm & Record**.
2. If the banner says the histology diagnosis could not be read from the coding, type the **Histology Diagnosis** (the box shows the example "e.g. CIN III on biopsy") and choose the **Outcome**, Concordant or Discordant, then select **Record**.
3. If the later case is not the right biopsy, select **Not Relevant**. The banner goes away.
4. The toast "Cyto-histologic correlation recorded." confirms it.

**Complete a 5-year retrospective review.** The banner "5-Year Retrospective Review Required" appears on a prior negative result of a patient who now has a high-grade, in-situ or malignant diagnosis.

1. Re-examine the earlier slide.
2. Choose the **Outcome**: Confirmed Negative, Interpretation Error, Sampling Error or Screening Error.
3. Type the **Corrective Action** (needed if the outcome is not Confirmed Negative, when your lab requires it).
4. Select **Complete Review**. The toast "5-year retrospective review recorded." appears.

**Send an urgent preliminary report.** Available once a final diagnosis is chosen and before sign-out.

1. Select **Send urgent preliminary**.
2. Choose the **Reason**: Clinician request, Critical finding or Urgent clinical management. Add a **Note** if useful.
3. Select **Send** (or **Sign and send** if your lab requires a signature, which opens a window headed "Sign the urgent preliminary report"). The toast "Urgent preliminary report sent." appears and the history line shows who sent it. If a preliminary report was recalled before it reached the clinician, its history line ends "(recalled, not sent)". The case report follows at sign-out.

**Correct or add to a signed-out report.**

1. After sign-out, select **Correct diagnosis** (the signed diagnosis is replaced; the original stays on file) or **Add addendum** (the diagnosis stands; text is added).
2. A correction opens "Correct the signed-out diagnosis" with the line "Currently reported as: …" (the diagnosis now on the report) and the same search boxes as the review form; an addendum opens "Add an addendum". Give the "Reason for correction" or "Reason for addendum" (and the addendum text). Select **Release correction** or **Release addendum**, and confirm your signature.
3. "Changes since sign-out" lists each correction and addendum with who, when and why.

**Finalize the case early.** When some specimens are signed out and others will not be:

1. Select **Finalize case now**.
2. Type why. The label reads "Why finalize now? *N* specimens aren't signed out yet."
3. Select **Finalize case**. The unsigned specimens are recorded as not reported, with your reason, and the case report is released.

### Exception handling

1. **The case is flagged for pathologist review.** An abnormal interpretation, an unsatisfactory adequacy, a flagged-for-QC specimen or any open revision request means a cytotechnologist cannot sign out. Pathologists find these cases on the Cytology Review tile in the [Worklist](help:worklist). They take the case, review it and sign out here.
2. **An advanced-certified cytotechnologist.** In some countries a cytotechnologist holding the right credential may sign out abnormal GYN cases. This works only if the country allows it and the credential is current; it never applies to non-GYN specimens, unsatisfactory adequacy or QC-flagged specimens.
3. **You reach your CLIA workload limit while saving.** A new review is not saved. The case and your other pending cases are handed to colleagues with room or back to the pool, you return to the worklist, and a message lists where they went. If you were only escalating a review already saved (for example from FOV-assisted to a full manual rescreen), the save goes through and a note explains it.
4. **A pathologist wants to change a cytotechnologist's review.** Use **Revise and sign out**. The cytotechnologist's review stays as recorded.
5. **A revision was requested.** The row says "revision requested from the author" and the cytotechnologist cannot sign out until the author acknowledges and saves a revised review.
6. **A laboratory without the workload limit.** The counter and banner do not appear (the limit is on for US laboratories by default and off elsewhere).
7. **Another session changed the material.** If a decant change fails because someone else changed the case, the page reloads and says so; repeat the change.

### Error recovery

1. **"You don't have permission to record cytology reviews."** You lack the permission to record reviews. Ask your laboratory manager.
2. **"The review couldn't be saved. Try again."** Save again. If it keeps failing, note the time and contact support.
3. **"You don't have permission to choose the final diagnosis."**, **"...to remove QC flags."**, **"...to record cyto-histologic correlations."**, **"...to record retrospective reviews."** Each is a separate permission.
4. **"You don't have permission to sign out cytology reports as a cytotechnologist. A pathologist must sign this one out."** Hand the case to a pathologist.
5. **"The sign-out couldn't be saved. Try again."** Try once more; do not sign twice. Check the banner "Signed out by..." to see if it went through.
6. **You loaded another review by mistake.** Load an earlier version or clone again; nothing is lost until you save, and a saved edit keeps the earlier one as a version (select "*N* earlier versions" then **Load into form**).
7. **Unsaved changes.** The browser or the page asks before you leave or switch specimens. Save first, or confirm that you want to discard them.

!!! warning "Sign-out is a legal act"
    Signing out issues the report to the clinician. Check the patient, the specimen, the final diagnosis and the adequacy before you confirm the signature. A wrong report needs a correction, which is sent as a correction. Signing out cannot be taken back.

!!! warning "A CISOE-A score cannot be undone by the mapping"
    The Bethesda equivalents of a CISOE-A score are filled in for you and drive the sign-out rules. Check S, O and E again before you save: a wrong digit can change who is allowed to sign out.

## Tips and Best Practices

### Common mistakes

- Not reading the HPV card before choosing recommendations. The card is above the history; a positive result changes the recommendation.
- Choosing "Set as Final" on the wrong review. Check the FINAL DIAGNOSIS tag on the card before you sign.
- Leaving a comment out of an additional interpretation when it explains a finding.
- Treating the suggested severity or the CISOE-A suggestion as a decision. Both are advice.
- Doing the QC rescreen from your own primary screen. It is refused by design.
- Using the general **Flags** button when you meant the QC flag, or the other way round.
- Putting patient details in a note that goes to a supervisor, such as a screening hours note.

### Efficiency recommendations

- Use the keys for saving: Ctrl+Alt+Shift+A saves a Bethesda-style review and Ctrl+Alt+Shift+B a CISOE-A review. They do the same as the button and are stopped by the same "Still required" check.
- Use **Clone** to start from an earlier review of the same kind when a case repeats.
- If you already reviewed this specimen, your own review opens in the form for editing, so you do not retype it.
- Use the specimen tabs on multi-specimen cases instead of opening the same case again.
- Spell check in the Notes box follows the case's spelling language; change it with the spelling language control in the header.

### Workflow recommendations

- Save the screen first, then Set as Final, then Sign Out. Sign-out is one decision made on one saved review.
- Record the HPV assay, platform and the action on a positive result when you see it; the laboratory's HPV and failsafe reports read these.
- Close retrospective reviews and correlations soon after the banner appears. The tiles on the Cytology Worklist count them.
- Send a preliminary report only for an urgent finding. It is marked preliminary on the report.

## Related Features

### Upstream workflow

- [Cytology Worklist](help:cytology), where you choose the case.
- [Accession](help:accession), where the specimen, clinical history and prior cervical procedure are recorded.
- [Molecular](help:molecular), where the HPV result is produced.
- [Add-on Orders](help:add-on-orders), for tests added after the first screen.

### Downstream workflow

- [Sign-out and release](help:report/sign-out-and-release) for how a signed report is released.
- [Case team](help:report/case-team) and [Case flags](help:case-flags) for the Team and Flags windows.
- [Slide Images](help:wsi-viewer): the slide's reference preview and opening it in your laboratory's digital pathology application.
- [Quality](help:quality), for follow-up tracking and QA reports, including the cytology QC compliance report.
- [Messaging](help:messaging), for the "Ask a colleague" message.

## Troubleshooting

### Common user issues

| Problem | Likely cause |
|---|---|
| **Save** is greyed out | A required field is empty. Read the "Still required: ..." line. |
| **Set as Final** is greyed out | The review needs a pathologist, and you are not one; or you lack the permission to choose the final diagnosis. |
| **Sign Out** is greyed out | No final diagnosis chosen, the review is not one you may sign, or you lack the sign-out permission. The row above names the reasons. |
| No **Synoptic** or **ROSE** button | These are for Non-GYN specimens (ROSE), and for a pathologist or an advanced-certified CT at a laboratory not using CISOE-A (Synoptic). |
| No slide preview | Your laboratory does not screen this case on whole-slide images. |
| No Mandatory QC choice to remove | Only a flagged specimen has **Remove Flag**; otherwise **Flag High-Risk QC** is offered. |
| The HPV card says "No co-test on record." | No co-test was ordered, or its result has not arrived from the platform. |
| English error messages on the CISOE-A form | The range and completeness messages from the score check are shown in English in every language. |
| The page says "Assist mode" | The case is managed by an outside system. |

### Resolution steps

1. Read the line above the form and the row above the columns. They name what is missing or blocked.
2. Reload the page if the specimen tabs or the review list look out of date. Unsaved changes are kept only if you save first.
3. Check your role's permissions with your laboratory manager.
4. Use the case's **Back to Worklist** and open the case again if the page stays on "Loading...".
5. Try the action once more. Do not repeat a sign-out until you have checked for the "Signed out by..." banner.

### When to contact support

Contact your laboratory's PathScribe support when a signed-out report shows the wrong content, when a save or sign-out fails twice, or when a message appears that this article does not explain. Have the case number and the time of the problem ready.
