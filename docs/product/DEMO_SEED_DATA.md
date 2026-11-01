# Demo seed data: status and manifest

Pete's "PathScribe Demo Seed Data Requirements" (S1 to S14, Oct 30, 2026) checked against the demo build, and the list of every seed id the demo videos use. Kept up to date batch by batch. Passwords and display tokens are never written here (rule 2): ask Pete.

**How to read it.** *Status* is what the demo build has now: **Done** (the row's "Before you press record" items can be ticked), **Partial** (some of it), **Open** (not started). Every row was checked in the code; rows marked "checked in the browser" were also walked on screen.

## Decisions (Pete, Oct 30, 2026)

- Video 1's surgical case is a **colon resection**.
- No Lab Manager role: the videos use the **Lab Director** (Dr. Rachel Okafor) where the requirements say laboratory manager.
- The colon synoptic gets **PathScribe's own wording** (standard nomenclature: WHO tumour types, AJCC 8th edition categories), not CAP text, labelled as such.
- The demo prints labels with a **GS1 restricted-circulation GTIN** (`0299990000101`, GS1 prefix 02, internal use only). It is not ForMedrixAI's GTIN; the product default stays empty.
- The **whole slide image viewer** (OpenSeadragon) is built after the seed rows, behind a per-tenant feature flag that is off by default, with the tile source resolved from tenant configuration and its tile cache released when the viewer closes.
- The six **fluid-workflow decisions**: all approved (Pete, Oct 30, 2026), with these details: the hand-off from the Cytology Preparation bench to the Microtome checks a scan (container or aliquot to cell block) so no cell block appears without its source; Divide specimen records the starting volume beside the split volumes (total volume accounted for); when an aliquot's status becomes "Result back", the receiving department's accession number is recorded. Built so far: decisions 4, 5 and 6 (Batch 739), decision 1 (Batch 740, the Cytology Preparation bench), decisions 2 and 3 (Batch 741, Divide specimen and aliquot tracking; on Grossing and the preparation bench, not Accession). S14 seeded in Batch 744.

## Status by row

| Row | Status | What the demo has (Batch) | Still open |
|---|---|---|---|
| S1 Surgical case to sign-out | **Done** (738), checked in the browser | Grossing protocols for colon (resection for tumor and without), colon biopsy, skin biopsy, breast core and excision, prostate cores (`services/protocols/surgicalDemoProtocols.ts`), linked to starter entries sp001, sp002, sp011, sp013, sp014, sp028, sp050. Colon template wording (`data/templates/generic/colon_resection.json`). Sign-out-ready case **S26-4680** (passes every sign-out check; Full Reset brings it back unsigned). | Billing charge records for S26-4680 (its CPT codes are on the case). The other 18 generic templates still carry placeholder options. |
| S2 Surgical orders | **Done** (738) | 25 surgical orders already (STAT: ord-009, 011, 015, 017; several specimens: ord-018, 020, 021, 026). New: **ord-038** (Video 1's colon resection, Fenwick), **ord-039** (outside slides for consultation), ord-019 split into six prostate sites. ord-001 to 003 now dated relative to the reset. | Orders carry no intake type: for ord-039 choose Intake Type "Outside" on Accession. Most older orders still create a pending dictionary entry on import (no crosswalk code). |
| S3 Printer, stations | **Done** (738), checked in the browser | Every histology bench prints through the seeded profile, which now uses the PathScribe agent: in the demo a labelled "Simulated" result. Demo GTIN set. Home benches: Connor Whitlock → Grossing Station 1, Kevin Brooks → Microtome — Bench 1. | Other users still choose a station from the header (one click). |
| S4 Non-GYN cases | Partial (744) | S26-5005 (thyroid FNA with a cell block; Batch 744: ROSE inadequate, now on Priya Desai's worklist), S26-5106 (EBUS lymph node FNA, ROSE adequate), and the five S14 fluids. Non-GYN routes to the cytology queue in the demo. | A breast FNA. |
| S5 GYN volume | Partial | About 30 Pap cases across the tiles; HPV demo case S26-5003-CYT-001. | GYN peer review, a second AI result, a negative Pap for a cytotechnologist. |
| S6 Autopsy | **Done** (745) | A26-4660 to 4664 (gross-ready, medical examiner order, ancillary hold, HTA case). Batch 745: **A26-4665** temporary accession under a Medical Examiner's verbal order, written order pending; **A26-4666** hospital-consented with the brain excluded and retention refused, PAD signed, body in the mortuary, ready for release; **A26-4667** PAD and FAD signed, closed. The specimen dictionary has **Autopsy, Complete (Body)** (`sp-autopsy-complete`), which opens Accession's authority block and the Organ(s) Included list. The three new cases are Dr. Sarah Johnson's. | A26-4660, 4661 and 4663 are assigned to PATH-001, whom no video signs in as (Video 4 doesn't need them). |
| S7 Molecular | **Done** (746), checked in the browser | Batch 746 (`services/cases/demoMolecularCases.ts`, `services/molecular/molecularRunHistoryDemoSeed.ts`): twelve in-house orders waiting for a plate in the Order Queue, seven EGFR mutation PCR (S26-5201 to 5207) and five KRAS mutation PCR (S26-5211 to 5215), each on a block's DNA curls add-on; the send-out orders (HER2 FISH, MSI by PCR) stay. A KRAS control rule beside the HPV and EGFR ones. History & Archive: three completed runs with readouts (HPV on Panther 2 for S26-5001 and 5002; EGFR on Real-time PCR 1 for S26-5208 Positive and S26-5209 Negative; the KRAS repeat for S26-5216) and the first KRAS run, blocked (its no-template control amplified: the red banner) and superseded by the repeat with its reason. S26-5208's report shows EGFR Mutation Status: Detected. Reagent lot registry (Configuration → System → Reagent Lots): the kits' master mix lots, one expired (EGFR-MM-26041) and one that failed QC (KRAS-MM-26087). Already there: Panther 2's deck (plate slot A4), the blocked HPV run, the rack awaiting extraction, the HPV simulate tool, manual scan entry and the dispatch scan check. | The plate builder doesn't pick lots from the registry (see below). |
| S8 Wall displays | **Done** (747), checked in the browser | Desert Valley (the lab the demo cases belong to): a single-view profile for each of the five department views, one rotating through all five, a spare and a retired one; a second facility, Midwest Pathology Associates, with its own quieter profile. **Configuration → Demo Reset → Demo display tokens → Issue tokens** issues a fresh token for each after a reset (and the OR Suite terminal's), revokes the retired display's at once, and shows them once; none is seeded or written down. Volume (`services/cases/demoWallVolumeCases.ts`, `services/batches/wallDisplayDemoBatches.ts`): forty-one Desert Valley cases at the bench steps and six at Midwest Pathology, in open batches and scanner runs, all times relative to the reset. Each Desert Valley view shows 8 to 17 items with a STAT item; decalcification overdue, due within 30 minutes and on time; a failed stainer run, a cold-chain excursion, a failed scan and an image QC failure. The OR Suite board: Start demo puts four frozen sections at different steps, one PRELIMINARY (already built). | — |
| S9 Batches | Partial | Reconcile batch, cold-chain batch, two processing batches, racks (including RACK-STAIN-LF-01). | Seven of the ten steps. |
| S10 Slides, WSI | Partial | Scanners, pathologists, two slides failing QC. | Slides concentrated on four cases; the viewer address; the image viewer (feature work). |
| S11 Block types | Partial | Matrix block M1 on S26-4404; matrix add-ons (737). | Megablock, multi-piece prostate block, exhausted block with a waiting order. |
| S12 Reset, times | Partial (738) | Accession's received time is local time (was UTC). Seed times relative to the reset. This manifest. | Full Reset timing not measured; real team members' sign-ins stay but the videos use the fictional users. |
| S13 Users per role | **Done** (738) | See the table below; new administrator-only user Jordan Ellis. | — |
| S14 Fluids | **Done** (744), checked in the browser | Five fluids, one per stage (`services/cases/demoFluidCases.ts`): S26-5105 bronchial washing received; S26-5102 peritoneal decanted (1,200 mL, bloody, high: suggestions showing); S26-5103 CSF with two cytospins (one stained, one staining); S26-5101 pleural with ThinPrep Paps, a smear, two handed-off cell blocks and flow, culture and molecular aliquots (Sent, Received, Result back with MB26-11873); S26-5104 urine ready to sign (Paris synoptic complete, Dr. Sarah Johnson). Two ROSE evaluations (S26-5106 adequate, S26-5005 not). S26-5106's cell block at the Microtome with H&E and a TTF-1 add-on. A ThinPrep and a SurePath Pap, each with its slide, a Liquid-Based Cytology Processing batch on its processor and an instrument order. Open Cytology Staining and Cytology Imaging batches. | A step that adds a fluid's container as a decant at the bench (see below). |

## Manifest

### Demo users (S13)

| Role in the videos | Name | Sign-in |
|---|---|---|
| Accessioner | Maria Lopez | maria.lopez@demo.pathscribe.ai |
| Pathologists' assistant | Connor Whitlock | connor.whitlock@pathscribe.ai (home bench Grossing Station 1) |
| Histotechnologist | Kevin Brooks | kevin.brooks@demo.pathscribe.ai (home bench Microtome — Bench 1) |
| Cytotechnologist | Priya Desai, Nadia Rahman | priya.desai@demo.pathscribe.ai, nadia.rahman@demo.pathscribe.ai |
| Pathologist | Dr. Sarah Johnson | sarah.johnson@demo.pathscribe.ai |
| Laboratory manager | Dr. Rachel Okafor (Lab Director) | rachel.okafor@demo.pathscribe.ai |
| Administrator | Jordan Ellis | jordan.ellis@demo.pathscribe.ai |
| Molecular technologist | Daniel Kim | daniel.kim@demo.pathscribe.ai |

All use the shared demo password (not written here). Every role lands on the same Home, showing the tiles its permissions allow.

### Cases, orders and configuration added for the videos

| Id | What | Used by |
|---|---|---|
| S26-4680 | Sigmoid colectomy, adenocarcinoma pT3 pN1b, ready to sign out (Dr. Sarah Johnson); slides S26-4680-A1-L1 to A12-L1 | Video 1 step 25 |
| ord-038 (FGH-ORD-88402) | Colon resection order, Walter Brennick, code COLRES-T → sp014 | Video 1 step 2 |
| ord-039 (FGH-ORD-88417) | Outside slides for consultation, Lorraine Ashdown, code CONSULT-OS → sp041 | S2 |
| ord-019 | Prostate needle biopsy, six sites, code PROS-NBX → sp028 | S2 |
| proto-colon-resection-tumor and six more | Surgical grossing protocols | S1 |
| printer-zt411-example | The one label printer profile (PathScribe agent; simulated in the demo) | S3 |
| GTIN 0299990000101 | Demo restricted-circulation GTIN in Print Settings | S3 |
| RACK-STAIN-LF-01 | Staining rack for large-format slides (737) | S11 |
| S26-5101-CYT-001 | Pleural fluid: container AD3 (500 mL), cell blocks AD1 (H&E ready) and AD2 (held for IHC), aliquots AD4 flow, AD5 culture, AD6 molecular (744) | S14, Video 8 |
| S26-5102-CYT-001 | Peritoneal fluid: container AD3, suggestions showing (744) | Video 8 steps 3 to 5 |
| S26-5103-CYT-001 | CSF: container AD3, cytospins AD3-L1 and AD3-L2 (744) | Video 8 step 7 |
| S26-5104-CYT-001 | Urine, ready to sign (Dr. Sarah Johnson) (744) | S14 |
| S26-5105-CYT-001 | Bronchial washing, received (744) | S14 |
| S26-5106-CYT-001 | EBUS FNA, station 7: ROSE adequate; cell block AD1 (H&E, TTF-1 pending) (744) | S4, S14, Video 8 step 11 |
| S26-5107-CYT-001, S26-5108-CYT-001 | ThinPrep Pap and SurePath Pap, vial AD1 with its Pap slide (744) | S14 |
| CONT-CYP-DEMO-TP, CONT-CYP-DEMO-SP | Liquid-Based Cytology Processing batches on LBC_PROC_01 and LBC_PROC_02 (744) | Video 8 step 8 |
| CONT-CYS-DEMO, CONT-CYI-DEMO | Cytology Staining (Diff-Quik) and Cytology Imaging batches (744) | Video 8 step 10 |
| io-demo-lbc-tp, io-demo-lbc-sp | Instrument orders for the two processing batches (Sent, Queued) (744) | Video 8 step 9 |
| st-ttf1 | TTF-1 added to the stain catalog (744) | S14 |
| ord-036 | Pleural fluid order (Batch 716) | Video 8 step 1 |
| A26-4665 | Autopsy, temporary accession, written authorization pending (745) | Video 4 steps 6 to 9 |
| A26-4666 | Autopsy, PAD signed, ready for body release; brain excluded, retention refused (745) | Video 4 steps 10 and 11 |
| A26-4667 | Autopsy, PAD and FAD signed (745) | S6 |
| S26-5201 to S26-5207 | Lung cases, an EGFR mutation PCR add-on waiting for a plate (MO-2026-5201-01 to 5207-01) (746) | Video 5 steps 3 to 12 |
| S26-5211 to S26-5215 | Colorectal cases, a KRAS mutation PCR add-on waiting for a plate (MO-2026-5211-01 to 5215-01) (746) | Video 5 |
| S26-5208, S26-5209 | Lung cases resulted on the completed EGFR run: Positive (exon 19 deletion) and Negative, in the Lung Adenocarcinoma synoptic (746) | Video 5 step 16, S7 "a case whose report shows a molecular result" |
| S26-5216 | Sigmoid resection, KRAS Positive on the repeat run (746) | Video 5 steps 16 and 17 |
| mb-demo-746-hpv-done, mb-demo-746-egfr-done, mb-demo-746-kras-repeat | Completed runs with readouts (746) | Video 5 steps 16 and 17 |
| mb-demo-746-kras-fail | KRAS run blocked (no-template control amplified), superseded by the repeat (746) | Video 5 step 16 (the red banner) |
| rule-746-kras | Control rule for KRAS mutation PCR: no-template control A01, positive control A02 (746) | Video 5 step 9 |
| EGFR-MM-26104, KRAS-MM-26102, MM-2026-9310 | Valid master mix lots in the reagent lot registry (746) | Video 5 step 8 |
| EGFR-MM-26041, KRAS-MM-26087 | Expired lot and failed-QC lot (746) | Video 5 step 8 |
| S26-5301 to S26-5341, MPA26-2101 to 2106 | Wall-volume cases at the bench steps, not yet assigned to a pathologist (747) | Video 6 |
| CONT-DCL-WALL-*, CONT-PRC-WALL-*, CONT-EMB-WALL-*, CONT-MIC-WALL-*, CONT-STN-WALL-*, CONT-REF-WALL-*, WSI-WALL-* | The wall views' open batches and scanner runs (747) | Video 6 |
| dispprof-demo-dvmc-* (8), dispprof-demo-mpa-histology | Display profiles: rotating, five single-view, spare, retired; the second facility (747) | Video 6 steps 1 to 10 |
| sp-autopsy-complete | Specimen dictionary entry "Autopsy, Complete (Body)" (745) | Video 4 step 2 |
| img-4680-a-opened, img-4680-a-sections, img-4680-a2-face | S26-4680's two gross photos and A2 block-face photo: demo illustrations in `public/demo/attachments/`, labelled as such (742) | Attachments window, Video 1 |

## Not built, found while seeding (for Pete)

- (Fixed, Batch 747.) The wall views matched a profile's facility (a Facility id such as `c-ent-dvmc`) against each case's `originHospitalId`, which on the demo cases is a legacy tenant id (`HOSP-001`), so no batch, slide or add-on belonging to a case ever showed on any profile; the seeded Fenwick profile was empty. A legacy tenant id now resolves to its facility, as the support-access gate already did.
- (Batch 747.) With that fixed, the Grossing and Intake view's **Pending Intake** tile counts every block and slide at Desert Valley that is not in an open batch (about 190 after a reset) and raises a STAT alert for each such item of a STAT case (about 27). The count follows the existing rule; the alert list is long. Worth a decision: count blocks only, or one alert per STAT case.
- (Batch 747.) Video 6 says not to claim add-on orders appear on the wall display; since Batch 727 they do (Embedding and Microtome view, with their own countdown). The script line can go.
- (Batch 747.) The OR Suite board's four frozen sections appear only after **Start demo** on the board (it needs `config:or-board-demo:run`); Video 6 step 12 should include it.

- (Batch 746.) The plate builder's **+ Add Reagent Lot** is typed in, not chosen from the reagent lot registry, so the expired and failed lots in the registry block a plate only when their details are typed (lot, expiry, QC status). The Reagent Lots list doesn't mark an expired lot either; only the date shows it. Picking lots from the registry is feature work, not seed data.
- (Batch 746.) The Molecular Workspace opens on Active Runs & Batches when anything is running, not on the Order Queue; Video 5 step 4 should select **Order Queue** first.
- (Batch 746.) The Order Queue lists resulted orders with the waiting ones (18 rows after a reset), newest first.

- (Fixed, Batch 744.) The Cytology Worklist showed each patient's MRN where the name belongs: the seeded patients carry firstName and lastName, and the row read only the newer name fields.
- (Changed, Batch 744.) S26-5005 was assigned to PATH-001, whom no video signs in as, so it and its ROSE showed for no demo user; it is now on Priya Desai's worklist.
- A freshly accessioned fluid has only the two cell block cassettes its protocol planned, and the Cytology Preparation bench has no step that adds the fluid's container as a decant, so its volume, appearance and yield can only be recorded on a cell block. The S14 cases carry the container as a decant made at the bench.

- Sign-out waits for the AI critical-findings check with no time limit, so a slow AI service leaves the Finalize click with no visible response until it answers.
- The report page's "Some required fields are incomplete" banner shows on every report with a synoptic, whether or not anything is missing.
- (Withdrawn, Batch 742.) An earlier note here called the body-less report-page PDF of an Assist case (S26-4680) a fault. It is by design: in Assist the LIS writes the report and PathScribe sends the synoptic workups back, each with its own workup PDF. Still open: images placed in the Attachments window don't reach those workup PDFs.
