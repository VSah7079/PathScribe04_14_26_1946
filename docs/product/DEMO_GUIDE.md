# PathScribe demo guide

This guide covers who to sign in as, and which seeded case to open, to demo each workflow. It describes the demo baseline as of Batch 457.

**Full Reset** returns everything to this baseline. Run it once after installing this batch, so every new seed loads (registry submissions, the critical alert, the support-access request, the consult link and the supervision records come back only through a reset; the cases, cytology reviews, molecular runs, staff and pools update on their own): Configuration → ⟳ Demo Reset (corrected in Batch 456; this said Configuration → System before). It needs `config:demo-data:reset`; Pete, Michelle and any Superadmin can run it.

- It clears every tester's changes.
- It restores the seeded cases, people, delegations and reviews.
- It puts the seeded billing and modifier versions back to "pending approval", so the approval demo can be repeated. Versions someone created themselves are kept.
- Passwords set on the Staff screen are cleared, but the built-in demo sign-ins below keep working.

All demo sign-ins use the same password as `demo@pathscribe.ai`. The password is not written here; ask Pete.

**Sign-in lockout (Batch 456):** 5 wrong passwords in a row for one email lock that email for 15 minutes. The fourth failure warns that one more will lock it. To unlock early, an administrator sets a new password for the person on the Staff screen (that also replaces the built-in demo password), or runs a Full Reset. Each failure and lock is in the Audit Log.

**Password rules (Batch 456):** a password set on the Staff screen, or chosen at sign-in, must be at least 12 characters, and is refused if it is on a list of commonly used passwords, is a simple pattern (`abcabcabcabc`, `123456789012`), contains PathScribe, ForMedrixAI or the person's email, or appears in a known data breach (checked with Have I Been Pwned without sending the password).

## Who to sign in as

All are at Desert Valley (Metro General Hospital) unless noted.

| Sign in as | Email | Role | Use for |
|---|---|---|---|
| Pete Nimmo | demo@pathscribe.ai | Superadmin (Pathologist, Admin) | Everything; the attending in two-person pairs |
| Dr. Sarah Johnson | sarah.johnson@demo.pathscribe.ai | Pathologist | Second pathologist: her own cases, second opinions, informal reviews, surgical peer review |
| Dr. James Okafor | james.okafor@demo.pathscribe.ai | Resident | Releasing a draft for countersign (S26-4610) |
| Dr. Lucas Moreau | lucas.moreau@demo.pathscribe.ai | Fellow | Fellow drafting; claiming from subspecialty pools |
| Dr. Rachel Okafor | rachel.okafor@demo.pathscribe.ai | Lab Director | Discordance patterns, registry go-live approval, configuration |
| Priya Desai | priya.desai@demo.pathscribe.ai | Cytotechnologist | Primary screening; QC-rescreens Nadia's work (S26-4652) |
| Nadia Rahman | nadia.rahman@demo.pathscribe.ai | Cytotechnologist | QC-rescreens Priya's work (S26-4650, S26-4651) |
| Hannah Price | hannah.price@demo.pathscribe.ai | Template Author | Drafting a synoptic template and submitting it for review |
| Dr. Samuel Osei | samuel.osei@demo.pathscribe.ai | Template Approver | Approving and publishing a template someone else wrote |
| Grace Liu | grace.liu@demo.pathscribe.ai | QA Reviewer | Quality Assurance: exports, follow-up outcomes, the clinician email; viewing registry exceptions |
| Maria Lopez | maria.lopez@demo.pathscribe.ai | Accessioner | Accessioning |
| Kevin Brooks | kevin.brooks@demo.pathscribe.ai | Histotechnologist | Embedding, microtomy, slide distribution, Batch Management |
| Daniel Kim | daniel.kim@demo.pathscribe.ai | Molecular Technologist | Molecular Workspace and Extraction Racks (HPV runs on the baseline Paps) |
| Connor Whitlock | connor.whitlock@pathscribe.ai | Pathologists' Assistant | Grossing; PA on autopsy A26-4661 (open it through Search: it's on Pete's worklist, not his) |
| Michelle Nimmo | michelle.nimmo@ai.com | Pathologist and Admin | Configuration, Demo Reset |
| Paul Carter / Dr. Oliver Pemberton | (UK, Manchester) | Attending / resident | UK countersign (MFT26-8802) |

## Two-person workflows

| Workflow | First person | Second person | Case |
|---|---|---|---|
| Resident release → attending countersign | Dr. James Okafor releases | Pete Nimmo countersigns (it then shows on his Countersign tile) | S26-4610 |
| Second opinion (delegation) | Sarah Johnson asked Pete | Pete answers | S26-4603 |
| Second opinion, the other way | Pete asked Sarah | Sarah answers | S26-4604 |
| Informal review | Sarah asked Pete; Pete asked Sarah | The other one publishes | S26-4601, S26-4602 |
| Cytology QC rescreen | Priya Desai screened | Nadia Rahman rescreens | S26-4650, S26-4651 |
| Cytology QC rescreen, the other way | Nadia Rahman screened | Priya Desai rescreens | S26-4652 |
| Template author → approver | Hannah Price drafts and submits | Dr. Samuel Osei approves | Configuration → Templates |
| Billing dictionary approval | (seeded as pending) | Michelle or Pete approves | Configuration → Billing |
| Surgical post-sign-out peer review | Pete signed out | Sarah reviews | S26-4405, S26-4412, S26-4492 |
| Pool claim | Any demo pathologist or the fellow | (none needed) | Pool tile on the worklist |
| Support access | Amber Fehrs-Battey (ForMedrixAI support) asked for access to Desert Valley, ticket FMX-20417 | The hospital's administrator, Michelle Nimmo (or Pete), approves or rejects | Configuration → System → Support Access |

## Cases for specific screens

| To show | Case(s) |
|---|---|
| Sarah Johnson's worklist | S26-4601, S26-4602, S26-4603 |
| Finalizing / Pending Release / On Hold tiles | S26-4620 / S26-4621 / S26-4622 |
| A closed case (no tile; All Cases or Search) | S26-4623 |
| Biopsy-to-resection correlation | S26-4630 (core biopsy) → S26-4631 (mastectomy, same patient). Sign out S26-4631 to see the candidate. |
| Cyto-histo correlation | S26-4641 (HSIL Pap) → S26-4642 (LEEP, same patient) |
| Follow-up not received (QA → Operations) | S26-4632 overdue, S26-4633 due soon, S26-4640 overdue (cytology); S26-4630 and S26-4641 received. Metro General has "Email ordering clinician" turned on. |
| Follow-up due tiles | Pete's worklist (S26-4632) and Sarah's worklist (S26-4633). On the cytology worklist, S26-4640 shows under Follow-up Due for anyone whose cytology worklist includes Sarah's signed-out Paps. |

| Autopsy | Worklist → Autopsy tab. Pete: A26-4660 (accessioned, ready for the gross), A26-4661 (preliminary diagnosis drafted: sign the PAD, then release the body; consent excludes the brain, and the body's organ list includes it — Batch 468, see below) and A26-4663 (forensic, Medical Examiner order, one chain-of-custody transfer on record — Batch 468, see below). Sarah: A26-4662 (PAD signed, body released, brain fixing; final diagnosis to sign). |
| Molecular Workspace (Daniel Kim) | Active Runs & Batches tab: an HPV run on Panther 2 for S26-4650, and a failed run for S26-4651 (positive control low, results blocked; Clone & Supersede repeats it). Extraction Racks: RACK-MOLE-00456 with S26-4652, awaiting extraction. |
| Molecular Order Queue (Configuration → ⟳ Demo Reset → Testing & Demo Tools → Molecular Order Queue → Open; Pete or Michelle) | HPV orders sent for S26-5001, S26-5002 (and the reflex genotyping order its positive result triggered), S26-4650 and S26-4651; S26-4652's order failed (the Panther middleware didn't answer), which is why its rack is still waiting. The page's demo panel still queues an order and simulates a result for S26-5003. |
| Registry Exceptions (Quality & Compliance) | S26-4405 rejected (laterality missing), S26-4490 acknowledgement overdue, S26-4633 revised by the registry after acceptance. Accepted submissions for S26-4412 (with a correction) and S26-4630 appear only in Download transmission audit (the screen lists exceptions, not history). See the limits below. |
| Critical-finding alert | Sign in as Pete: Audit Log → Critical Alerts shows the outstanding secure-email alert to Dr. Jennifer Davis for S26-4621 (tumour at the deep margin). The physician's page is `/critical-alert/cat_demo4621margin`, with Acknowledge Reviewed. Full Reset makes it outstanding again. |
| Decants (Cytology Workspace, material view) | S26-4650 and S26-4652: residual fluid decants (S26-4652 with a repeat ThinPrep). S26-4651: a decant with a p16/Ki-67 slide, on the Cell Block / Ancillary Pending tile. |
| Cell block from a decant (Kevin Brooks, Microtomy) | S26-5005 (thyroid FNA): scan `S26-5005-CYT-001-AD2`, the cell block, H&E pending cut. |
| Matrix block | S26-4404 (prostate biopsies): block M1 holds cores D, E and F. Report page → Material tab → Biopsy Arrays. |
| Consult link | Sign in as Sarah: S26-4602 → Consult shows an active link to Dr. Miguel Ortega (Sonoran Dermatopathology Associates, fictional). The seeded link itself can't be opened (the address is shown only when a link is made); issue a new one to show the consultant's view. |
| Supervision (FPPE) | Configuration → Staff → Credentialing Review → FPPE Assignments: Pete supervises all three: Oliver Pemberton (active, GI), Paul Carter (completed by case count) and Michelle Nimmo (graduated early). |

## Limits of the seeded data

- **Registry Resend (Batch 457):** Metro General now reports to the US (NAACCR) cancer registry, and S26-4405 and S26-4490 carry their ICD-O code, diagnosis and date. Resend rebuilds the submission and then stops with "Not sent: this is a validation instance…": the demo runs as a validation instance, which by design never sends a real case to a registry (only the synthetic test suite, to the registry's test system). To show a successful send, use the registry's go-live steps: record the data-sharing agreement, then send the synthetic test suite.
- **Molecular:** the in-house instruments run HPV and (Batch 467) EGFR mutation PCR on Real-time PCR 1, so there are no breast or colon molecular runs. (Before Batch 467 this said only HPV ran in-house.) The workcenter has no "review results" step: a run passes automatically or is blocked.
- **Microtomy and matrix blocks:** *superseded (Batch 460):* the Microtomy workstation opens a matrix block (scan `S26-4404-M1`).
- **Call-backs:** no call-back is seeded; a call is logged during sign-out when the detector flags a finding.

## Demo: two people in the same case (PS-71, Batch 458)

This build keeps its data in one browser, so the demo uses **two tabs of the same browser**, signed in as the same person; the second tab plays "someone else". (Two different people signing in at once needs the API server: in the demo, one browser holds one sign-in.) Reload both tabs before each step, so each starts from the saved case.

1. **Set up.** Sign in as Pete Nimmo. Open **S26-4631** (Pete's open Assist case, with a draft Breast Invasive synoptic report) in a tab, and the same case in a second tab.
2. **Different parts: the review box.**
   - In tab 2, add a specimen comment. It saves at once.
   - In tab 1, without reloading, answer a synoptic question and click **Save Draft**.
   - The box "Someone else changed this case while you were working" says they changed *Specimens, blocks and slides* and you're saving *Synoptic reports*.
   - Choose **Not yet: show me their changes**. Tab 1 now shows the comment from tab 2, and your answer is still there, unsaved. Click **Save Draft** again: it saves with no box, since you've now seen their change.
   - To show **Save mine with theirs**, reload both tabs and repeat this step, choosing it the first time.
3. **Same field: the Edit Conflict box.**
   - Reload both tabs. In each, change the same synoptic answer to a different value.
   - Save in tab 2, then in tab 1. Tab 1 shows the Edit Conflict box.
   - Show **View changes** ("Replaced by yours" / "Kept as saved"), then **Save mine anyway**.
   - Open the Audit Log and show "Concurrency conflict overridden".
4. **Without the permission.** Sign out, sign in as Maria Lopez (Accessioner), find S26-4631 through Search, and repeat step 3 in two tabs. "Save mine anyway" is greyed out: she can keep working, view changes or reload.
5. **Nothing is lost.** Type something in tab 1 without saving, wait a second, then close the tab. Reopen the case: PathScribe offers your unsaved changes back, fitted around anything saved since.

The pool-claim race (two people accepting the same pool case at once) needs two people signed in, so it can't be shown in one browser. It is covered by the automated test `mockCaseServicePoolClaim.test.ts`.

## Demo: billing at the bench, matrix blocks, Label Designer (Batch 460)

**Billing in the Cytology Workspace (full review)**
1. Open S26-4650 in the Cytology Workspace and click **$ Billing** (next to # Codes).
2. Approve a pending code, then delete it.
3. Open Quality Assurance → Audit Log. It shows "Billing code charged", then "Billing code credited".
4. Take "Review a case's billing codes" off a test role in the Role Dictionary and sign in as that role. Approving is refused with a message, and nothing changes.

**Billing at Microtomy (read-only, with full review)**
1. At the Microtomy workstation, scan a block with special stains or IHC.
2. The Billing box lists each slide's codes: applied, pending review or no billing code, plus any "waiting for billing approval".
3. **$ Full billing review** opens the full panel. It's greyed out for a role without the permission.

**A matrix block at Microtomy**
1. Scan `S26-4404-M1`. The left panel lists cores D, E and F with their positions.
2. Add a Ki-67. Billing warns that the pathologist hasn't confirmed which cores were evaluated yet.
3. On the report page, tick the evaluated cores in the Array Mapper. Each specimen then gets its own code.

**Slide order**
1. Switch to Batch mode and drag a slide above another.
2. Scan the printed label of the moved slide. It still opens that slide.
3. Remove an unprinted slide and add a new one. The new slide gets a new level and never reuses the removed one.

**Label Designer**
1. Configuration → Label Designer. Click a field and drag a corner handle; it stops at the label's edge.
2. Type a width larger than the label; it's capped.

## Demo: the anatomical map beside the synoptic (Batch 461)

The map's cancer data comes from the synoptic report: it is drawn from the synoptic answers.

**Prostate needle biopsy (core map)**
1. Sign in as a pathologist and open S26-4404. On the synoptic (Prostate Needle Biopsy), press **Map**.
2. The core map shows cores A–C (right apex, mid, base) as Grade Group 2 and D–F (left) benign; the other sites are "not sampled". Hover core B: Grade Group 2, Gleason 3+4=7, 70 %.
3. In the synoptic, open **Anatomical map (PathScribe) → Core results** and change core D to carcinoma, Grade Group 3. The map changes at once.
4. Click a core on the map: the synoptic jumps to Core results.

**Radical prostatectomy (sector map)**
1. Open MFT26-8804 and press **Map**. The PI-RADS v2.1 sector map shows Grade Group 3 in the right peripheral zone, with extraprostatic extension and a positive margin outlined at the right posterolateral mid-gland.
2. Press **Insert into report**, then change an answer (for example tick another tumour sector). The panel says "Report image is out of date — insert again".
3. Print or preview the PDF: the map appears after the report body.

**Colours by site**
1. Configuration → System → Organ maps → Colours & patterns. Choose Facility, pick the case's facility, **Override here** on "Grade Group 3 or higher", change its colour and save.
2. Reopen the map on the case: it uses the facility's colour; the Audit Log shows "Organ map colours changed".

## Demo: the breast map (Batch 462)

The map's cancer data comes from the synoptic report: it is drawn from the synoptic answers.

1. Open S26-4401-BX-001 (left mastectomy) and the Breast Invasive synoptic; press **Map**.
2. The clock face (viewed facing the patient) shows invasive carcinoma at 2 o'clock, labelled upper outer quadrant for a left breast, with focus 1 (invasive) and focus 2 (DCIS) marked. Hover a focus: type, position, size, distance from the nipple.
3. The margin diagram shows six faces, each split invasive / DCIS. The deep (posterior) margin is 2.0 mm: clear at the 2 mm default.
4. Configuration → System → Organ maps → Colours & patterns: choose the case's facility, **Override here** on "Breast: a margin is close below (mm)", set 2.5 and save. Reopen the map: the deep margin is now close (and an inserted report image says it is out of date).
5. In the synoptic, change focus 2's clock position to 3 o'clock: the map moves it at once. Click a focus marker to go to Tumour foci.
6. S26-4405 (right lumpectomy, signed out) shows DCIS with calcifications at 10 o'clock, upper outer quadrant for a right breast.

## Demo: colorectal maps (Batch 464)

The maps come from the synoptic answers; the margins are judged by the site's rules (Configuration → System → Organ maps → Colours & patterns: "Malignant polyp: margin involved at" and "Rectal CRM: involved at", each a distance and ≤, < or =; 1.0 mm and ≤ by default).

**Malignant polyp**
1. Open S26-4465 (sigmoid polyp, snare polypectomy) and the Colorectal Local Excision synoptic; press **Map**.
2. The pedunculated polyp (Paris 0-Ip) shows carcinoma in the head and neck (Haggitt level 2) and the stalk margin at 0.8 mm: **involved** at ≤ 1 mm. The map prints the rule it used.
3. In **Anatomical map (PathScribe)**, change the Paris type to 0-IIa: the drawing becomes a sessile lesion with the submucosa in thirds; set the depth to Kikuchi sm2 and adenoma at the lateral margin "Present" to see both.
4. In Configuration, choose the facility (Metro General), **Override here** on the malignant-polyp rule, set "= (exactly)" and 0, and save. Reopen the map: 0.8 mm is now clear (only carcinoma on ink is involved), and an inserted image says it is out of date.
5. Batch 466d — margins per component (CAP's two blocks), with the default rule and the Paris type back to 0-Ip (undo steps 3 and 4 first): under **Margins**, "Invasive carcinoma margins" reads "Invasive carcinoma present at margin" with "Deep (stalk / submucosal)" ticked, both locked (calculated from the map). Set adenoma at the lateral margin "Present": "Adenoma (non-invasive) margins" turns to "Adenoma present at mucosal margin" — the carcinoma's answers don't change. Change the deep distance to 2 mm: the carcinoma's margins turn negative while the adenoma's stay involved. Clear the deep distance and sign out (remove the map image inserted earlier first, or sign-out stops on the out-of-date image): PathScribe lists the carcinoma margins still blank and asks before going on; the generic template's unanswered required questions then stop it.

**Rectal resection**
1. Open S26-4464 (low anterior resection) and the Colorectal Resection B synoptic; press **Map**.
2. The cross-section (viewed from below) shows tumour in the anterior and left walls, the CRM closest anteriorly at 1.5 mm: clear at ≤ 1 mm. The long view shows the tumour below the peritoneal reflection and the distal margin at 25 mm. The caption gives the mesorectal plane and the CRM rule.
3. At a site whose CRM rule is ≤ 2 mm, the same answers show the anterior CRM involved.

## Demo: head and neck maps (Batch 465)

S26-4466 is a composite resection: two specimens, each with its own PathScribe synoptic, on one case.

**Oral cavity**
1. Open S26-4466 (Desmond Okafor-Hale; A: partial glossectomy, B: right neck dissection) and the **PathScribe — Oral Cavity Resection** synoptic on part A; press **Map**.
2. The mouth (facing the patient) shows carcinoma on the right oral tongue and right floor of mouth. Beside it, the deep margin at 0.6 mm is **involved** (< 1 mm) and the peripheral mucosal margin at 3 mm is **close** (1–5 mm), outlined for high-grade dysplasia. The captions give the depth of invasion (7 mm) and both site rules.
3. Change the peripheral margin to 6 mm: it turns clear. Press **Insert** to put the map in the report (optional, as for the other organs).
4. Configuration → System → Organ maps → Colours & patterns: choose the facility (Metro General), **Override here** on "Oral cavity: margin close at", set 2.5 and save. Reopen the map: a 3 mm margin is now clear, and an inserted image says it is out of date. A close distance below the involved one is refused.

**Neck dissection**
1. On part B, open the **PathScribe — Neck Dissection** synoptic. **Nodes by level** has a row for each level and side.
2. Press **Map**: level IIa shows metastasis (2/6) outlined heavily for ENEma; level III (1/5) outlined lightly for ENEmi; Ia, Ib, IIb and IV examined without tumour; right levels V–VII and the whole left neck not dissected. The caption totals 3 of 27 nodes positive with the worst ENE.
3. Enter nodes on the "Left level IIa" row: the left neck fills in at once, and **Total nodes positive / examined** add them up (calculated, read-only).
4. Enter 5 positive of 3 examined on that row: the row is flagged, **Save Draft** says the draft wasn't saved, and sign-out stops, until the count is corrected.
5. Configuration (Batch 465b): at the enterprise, set "Oral cavity: margin involved at" to 4 mm while Metro General's close distance is 2.5 mm (step 4 of the oral cavity demo): the save warns that Metro General's rules conflict, the warning stays on the screen, and the map's close line reads "Close ≤ 5 mm (default: site rules conflict)" until Metro General's rules are reconciled.

## Demo: renal resection map (Batch 466)

1. Open S26-4467 (Marguerite Ellsworth, right radical nephrectomy) and the **Kidney Resection** synoptic; press **Map**.
2. The right kidney (hilum toward the middle) shows carcinoma in the upper pole, lateral half, marked A (anterior aspect); perinephric fat and the renal vein show carcinoma. The renal vein margin is involved, the ureteral margin clear, and the soft tissue margin at 0 mm is involved by the site's rule (= 0.0 mm, on ink). The caption reads "Extent and size: pT3a (AJCC 8th)" — a guide; the stage stays the pathologist's answer.
3. In **Anatomical map (PathScribe)**, change the soft tissue margin to 0.5 mm: it turns clear. Change the procedure to partial nephrectomy: the renal vein and ureteral margin questions disappear from the form (and from the report), and the map shows the parenchymal and perinephric / capsular soft tissue margins, each with its site rule. Batch 466c: the drawing drops the renal vein, vena cava and ureter too (a partial specimen doesn't hold them). Tick "Renal vein segment submitted" under **Add non-standard margin**: its question and box come back. Choose "Left" for the kidney: the drawing mirrors.
4. Enter −1 (or 1.5) in **Number Positive** under Regional Nodes: the field is flagged, and Save Draft and sign-out stop until it's a whole number (Batch 466: node counts are whole numbers, 0 or more; the neck dissection's level counts and totals too).
5. Configuration → Organ maps → Colours & patterns: "Kidney, radical nephrectomy: soft tissue margin involved at" (and the partial nephrectomy's parenchymal margin) — each a distance and an operator per site.
6. Batch 466b — the generic margin questions follow the map: Configuration → Organ maps → Map bindings, choose Kidney Resection, and under **Generic margin questions (calculated from the map)** choose "Margin Status" (say which answer means involved and which not involved) and "Margin(s) Involved" (which answer is the renal vein, ureter, soft tissue). Save, reopen S26-4467: both questions are filled from the map and locked; change the soft tissue distance to 2 mm and the vein margin to not involved — they turn to "not involved" at once.
7. Batch 466b — count settings in the Synoptic Editor: open a copy of Neck Dissection; a numeric question offers **Number type** (decimal / whole number), **Can't exceed** (another numeric question) and **Value** (entered by hand / total from a grid); the levels grid lists its number columns with the same rules.
8. Batch 466c — the Synoptic Editor builds the new conditions: Configuration → Protocols, open Kidney Resection in the editor and select "Renal vein margin". Its visibility reads **Shown unless…** the procedure is "Partial nephrectomy", **or also when** "Add non-standard margin" is "Renal vein segment submitted" — editable, no longer "Custom condition". On "Total nodes positive" in the Neck Dissection template, the **Value** list now offers "Entered by hand, checked against a grid's total".

## Demo: in-house molecular orders (Batch 467)

1. Sign in as Daniel Kim (Molecular Technologist) and open the Molecular Workspace. The first tab, **Order Queue**, lists MO-2026-0467-01 (S26-4493 A1, EGFR mutation PCR, in-house, queued) and MO-2026-0403-01 (S26-4401-BX-001, HER2 FISH, send-out to Summit; it can only be cancelled).
2. Tick the EGFR order, choose the plate "PLT-… (PCR_01) — 94 free wells" (the count leaves out A01 and A02, kept for the controls the EGFR rule fixes), and press **Assign to plate**: the order is "On a plate", PLT-… · A03.
3. Press **Demo: run → positive**: the plate is dispatched (the order is "Running") and the run's results come back; the order is "Resulted", Positive, "Report answered from this result."
4. As Pete, open S26-4493 (Angela Weiss) and the **Lung Adenocarcinoma** synoptic: EGFR Mutation Status reads "Detected", with the note "From in-house EGFR mutation PCR result (MO-2026-0467-01)."
5. Change the answer to "Not Detected": the question shows the delta tag **Result differs** ("In-house EGFR mutation PCR (MO-2026-0467-01) reported “Detected”.") and **Use result**. Your answer is never overwritten; pressing Use result puts "Detected" back.
6. Re-routing: in Configuration → Stain Dictionary, edit EGFR mutation PCR and untick Desert Valley under **Run in-house at**. A queued in-house EGFR order now reads "This lab no longer runs this test in-house: send it out or cancel it." and offers **Send out instead** (to Summit, the test's default lab) and Cancel; it can't go on a plate. Tick it again afterwards.
7. Ordering: on the Add-On Order page for S26-4493, add EGFR mutation PCR: the line offers In-house (selected) or Send-out; the reference lab is asked for only for send-out. The placed order appears in the Order Queue.
8. Configuration → Protocols, open Lung Adenocarcinoma in the editor, select EGFR Mutation Status: **Filled from in-house molecular test** shows EGFR mutation PCR and what a positive and a negative result mean.

After sign-out, a late result doesn't change the report: the order reads "Arrived after sign-out: report unchanged, addendum draft opened." and the draft waits for the case's pathologist.

**Batch 467b — send-out, the plate, sign-out and the instrument.**

1. **Choosing a lab.** MO-2026-0467-02 (MFT26-8801-CR-RES, MSI by PCR, send-out) reads "Choose the reference lab before this order is sent." MSI by PCR has no approved lab, so the list offers every active reference lab. Choose one.
2. **Reference lab result.** Press **Demo: reference lab → positive**. The order is sent in a referral batch of its own and its result comes straight back, so the row reads "Resulted" and names the referral batch. A real order reads "At the reference lab" while it waits.
3. **The difference.** As Dr Paul Carter (the case's pathologist), open MFT26-8801's **Colorectal Further Investigations** synoptic: "Microsatellite instability (MSI) status" still says "Microsatellite stable (MSS)", with **Result differs** and "MSI-high (MSI-H)" beside it.
4. **Sign-out warning.** Try to sign out the case: it asks first ("…differs from the MSI by PCR result…"). You may go on, or press **Use result**.
5. **HER2.** MO-2026-0403-01 (S26-4401-BX-001, HER2 FISH, Summit): **Demo: reference lab → negative** fills the breast synoptic's HER2 ISH Status with "Non-amplified".
6. **The plate.** After assigning the EGFR order (steps 1–2 above), open the plate from the queue: well A03 has a corner mark, its tooltip names the order, and clicking it lists the accession and order.
7. **Development builds only.** On the Mock Interface Engine page, choose the instrument's results (Positive or Negative; the default is No results). The Plate Builder's own **Dispatch worklist** is then answered by the simulated instrument a few seconds later, through the real results processing.

## Demo: Mohs stage maps (Batch 463, updated 463b)

The stage maps are drawn from the Mohs synoptic's answers and are always part of the report (Pete: "Always, for Mohs").

1. Open S26-4463 (Walter Brennan, left nasal ala; parts A and B are stages 1 and 2) and the **PathScribe — Mohs Micrographic Surgery** synoptic.
2. Under **Mohs stages**, stage 1 (09:15, 3 blocks) shows residual tumour at 12 and 1 o'clock (block A, nodular BCC) and at the deep margin (block C, infiltrative BCC, perineural invasion outlined). Stage 2 (10:30) is clear.
3. Press **Add stage 3**: it is stamped with the time. Enter **Blocks cut** 2. Click 6 o'clock on its canvas, or tick 6 o'clock in the checklist beside it: the sector turns positive with the tumour type's histology (basal cell carcinoma, nodular) and its block **Unassigned**; the stage warns "choose the block for every sector with tumour". Try Sign out: it stops with the same reason. Choose block A on the row: the warning clears.
4. With voice on, say "Stage 3, positive at 9 o'clock, block B" (or "Stufe 3 positiv bei 9 Uhr, Block B" with a German voice profile): 9 o'clock turns positive with block B. "Stage 3 positive at noon" marks 12 o'clock. "Stage 3 clear" clears the stage.
5. Press **Map**: the companion shows every stage. The panel says the map is part of the report automatically; there is no Insert button.
6. Preview or print the PDF: the stage maps appear after the report body, in the report's language.
7. Configuration → System → Organ maps → Colours & patterns: the preview now includes a Mohs map, so the "Residual tumour" and "Perineural invasion" colours can be changed per site.

## Demo: autopsy consent-scope enforcement, chain-of-custody (Batch 468)

**Consent-scope enforcement (hospital-consented cases).**

1. Sign in as Pete and open **A26-4661** (Eleanor Brooks). Its consent is narrowed to exclude the brain ("Complete autopsy, brain excluded"), but the body specimen's organ list already includes Brain and Heart. A banner reading **"Consent excludes an organ present on this case"** shows above the report, naming the excluded organ: "The consent on file excludes: Brain. Findings should not be recorded for these organs." This is a warning, not a hard block — the gross-exam template has no per-finding organ tag, so the pathologist is told and left to apply it to the right findings.
2. Contrast with **A26-4660** and **A26-4662**: both consents are active/unrestricted (A26-4662's family specifically asked for brain retention), so neither shows the banner.
3. The other half of consent-scope enforcement — a consent whose `retentionPermitted` is false hard-blocks the **Organ Retention Tier** control — has no seeded case to demo from the UI: that control only ever shows for an HTA-governed jurisdiction (UK England & Wales/Northern Ireland/Scotland, or New Zealand — `resolveHtaApplicability.ts`), and every seeded autopsy is US. It's covered by `resolveAutopsyConsentScopeViolation.test.ts` instead.

**Forensic chain-of-custody.**

1. Sign in as Pete and open **A26-4663** (Marcus Devereaux) from Worklist → Autopsy. It's a medicolegal/forensic case (County Medical Examiner order ME-2026-04663) — no next-of-kin consent section; instead there's a **Chain of Custody** panel.
2. The log already shows one transfer: Pathology Department (PathScribe Mortuary) → Medical Examiner (County Medical Examiner Toxicology Lab), "Postmortem blood and vitreous fluid (toxicology specimens)", released by Pete Nimmo, received by Tech. R. Alvarez.
3. Press **Record Custody Transfer**. Fill in Item ("Decedent's clothing"), Transferred To (Type) "Law Enforcement", Transferred To (Name) (e.g. "Metro PD Evidence Unit"), Released By, and press **Save Transfer**: the toast reads "Custody transfer recorded." and the new entry appears, continuing on from the Medical Examiner (the log's own last recipient), not from the mortuary — the current custodian is always wherever the chain last left it.
4. This panel and its capability (`autopsy:custody:transfer`) only appear for a forensic case; open A26-4660/4661/4662 again to confirm it's absent there.

**Limits of this seed:** toxicology and the fuller organ/tissue retention & release workflow are out of scope for this batch (still open per PS-261); there's no screen yet to narrow or revoke an already-granted hospital consent (A26-4661's narrowed consent above is pre-set, not something you can do from the UI yet); the retention-tier hard block has no UI-demoable case, as noted above; and body release (A26-4661/4662) is still a separate event from this custody log, not yet unified into one timeline.

## Demo: autopsy toxicology ordering/results, organ-retention disposal, consent narrowing (Batch 469)

1. Open **A26-4663** (Marcus Devereaux): the Toxicology Log shows one order ("ordered" status). Press **Record Result** to see the result form; cancelling the order itself has no button yet (that's Batch 471, below).
2. Open **A26-4664**, a `GB_EW` hospital-consented case with `organRetentionTier` set beyond "none": a **Record Disposal** form sits below the tier select, with nowhere yet to note who's actually holding the retained organs while retention is ongoing (that's also Batch 471).
3. Open **A26-4661** (Eleanor Brooks) and press **Narrow or Revoke Consent**: the form seeds from the case's current narrowed state. There is no action to widen it back once narrowed or revoked.

## Demo: autopsy toxicology cancellation, organ-retention detail, consent reinstatement (Batch 471)

1. On **A26-4663**'s still-open toxicology order, press **Cancel Order**, give a reason, and save: the order's status and a cancellation reason/date appear in the log, and (if nothing else has claimed the case's ancillary hold since) the hold clears.
2. On **A26-4664**, use the new **Organ Retention Detail** panel (above the existing disposal panel) to record a recipient name and location — overwrite it a second time to see it replace rather than append.
3. On **A26-4661**, after narrowing consent per the Batch 469 demo above, a **Reinstate Consent** button now appears. Press it, enter a required note (e.g. "Family confirmed consent restored in writing"), and save: status returns to active and the exclusions/retention permission widen back to what the note's input specified. The button disappears again once status is active.

