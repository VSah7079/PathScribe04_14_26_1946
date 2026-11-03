## Batch 763 — The stain and scanner QC gate; every new action on Superadmin (Nov 2, 2026)
Pete (video feedback, Nov 2): "Missing QC gate: a Post-Stain / Pre-Distribution QC checkpoint with Option A (vendor sign-off via the interface engine) and Option B (native PathScribe QC), configurable per instrument"; scope "Stainers and scanners"; and the standing rule "add new actions to super user role". `services/stainQc/` (new): types (`QC_MODES` autoAccept, vendorSignOff, pathscribeSignOff; `QC_FAIL_ACTIONS`; `STAIN_QC_FAIL_REASONS`; `IMAGE_QC_FAIL_REASONS`), rules (`qcModeFor`, `runQcAllowsDistribution`, `signOffProblems`, `slideStatusFromQc`, `distributionQcProblem`, `imageQcAtUnload`), `stainQcService.ts` (open a run, PathScribe sign-off, the stainer's own result, override, image QC, defaults; four capabilities in `authorization/stainQcCapabilities.ts`; audit Stain QC Pending / Passed / Failed / Instrument Result Ignored, Image QC Pending / Passed / Failed, Stain QC Settings Saved), case writes, mock, http (`/api/stain-qc/stain-qc/*`), instance. `services/hl7/processInboundStainQcSignOffEvent.ts` and `types/events/StainQcSignOffEventPayload.ts` (new); the stainer's status message carries `instrumentCode`. **Gate:** `mockBatchService.advanceToNode` refuses Staining → Checkout while QC is pending (`batchDetail.errors.stainQcPending`); Slide Distribution refuses a held slide or block (`slideDistribution.scanErrors.qcPending`, `qcFailed`, `recutRequested`, `blockHeldByQc`); stain status `QC Pending` (`Specimen.ts`, the union line edited in place, 1,838 lines; `materialTreePanel.stainStatus.qcPending`; `facilityOpsDashboard.stats.stainQcPending`). **Scanners:** an image held at unload (`lastScanOutcome: imageQcPending`, `slideImage.state.awaitingImageQc`). **Screens:** Slide Distribution's QC checkpoint (`QcCheckpointPanel`, `stainQc.*`: title, hint, runLine_*, modes.*, actions.*, reasons.*, imageReasons.*, signOffAllPassed, signOffWithFailures_*, signOffInstead, waitingForInstrument, imagesTitle_*, releaseImage, rescan, errors.*); Configuration → System → Workstation & Hardware → Stain & scan QC (`stainQcSection.*`, `systemTab.sections.stainQc`, config search `sys-stain-qc`; `config:stain-qc:manage`); Equipment's QC sign-off (`equipmentSection.modal.qcMode*`). Demo stainers `VENTANA_HE600_01` (Instrument sign-off) and `LEICA_ST5020_01` (PathScribe sign-off). A PathScribe sign-off is also recorded as the run's visual read (`confirmQcVisualRead`). **Action list:** `constants/stainQcActionGroup.ts` (Stain & Scan QC, F40+PS001–005), permission-only, granted to Histotechnologist and Lab Director. **Superadmin** (`services/roles/actionSeeds.ts`): offered every action in the Action list (`ALL_ACTION_IDS`), not only the Batch 600-601 groups; CLAUDE.md rule 7 records the rule. Capability text `capabilities.items.stainQcSignOff`, `stainQcOverride`, `scanImageQcSignOff`, `configStainQcManage`. Tests: `stainQcService.test.ts`, `stainQcRules.test.ts`, `stainQcAdvanceGate.test.ts`, `processInboundStainQcSignOffEvent.test.ts` (new); `wsiScanQueue.test.ts`, `slideImages.test.ts`, `actionSeeds.test.ts`, `authorization.test.ts` (`CONFIG_SECTIONS` 122), `mockEquipmentService.test.ts` (added to). New keys machine-translated; native review pending.

## Batch 762 — Requisition ingestion and the Requisition Inbox (Nov 2, 2026)
Pete's "Automated Batch Requisition & Document Ingestion" specification (v1.0), for the accessioning demo video; demo decision (Nov 2): real PDFs, read in the browser. Sources (Pete, Nov 2: "the scanner would output to a folder on their network, or to a 3rd party system … There could be multiple URLs"): `REQUISITION_SOURCE_KINDS` gains `documentSystem` (a third-party system read at its https address); `sourceLocationValid` checks a folder address, an https address or a name; as many sources as needed (`requisitionIngestion.kinds.*`, `location.documentSystem`, `locationHint.*`). Action list (Pete: "have the new capabilities been built into the Action list?"): `constants/requisitionActionGroup.ts` (Requisition Inbox group, F39+PS001–006), `REQUISITION_RUN_NOW` (voice, Alt+G, context `REQUISITIONS`, `requisitionVoiceCommands.ts`, Spanish phrases), the rest classified in `permissionOnlyActions.ts`, default grants (Accessioner all; case-access roles Show the case's requisition). Expected requisitions (Pete, Nov 2: "If a case has no associated [requisition] do we raise a flag and track? Also, orders from the HIS may not have a paper req"; "if a req has no case, that could be a problem too"; the quarantine-queue bullets): `RequisitionExpectation` per facility (which origins need a scan; Electronic HIS/LIS order off by default; `graceHours`, `unmatchedAlertHours`, 24 each), `requisitionOriginOf`, `sweepMissing` (flag, Missing Requisition case deficiency through `specimenDeficiencyService`, close on arrival; mark scans with no case), `getMissing`, `missingForCase`, `waiveMissing`, `findCasesToLink`; `order.externalOrderId` now recorded at Accession from an imported order (`AccessionPage.tsx` one line, 4,001); resolution type `res-requisition-received` (seeds added to a stored list); `RECURRING_JOBS` `requisition.missingSweep`; Accession → **New case from this scan** (`AccessionFromRequisition`, `useRequisitionForAccession`). Keys: `requisitions.missing.*`, `missingChip`, `withoutCase`, `origins.*`, `waiverReasons.*`, `toast.waived`, `inbox.newCase`, `foundTitle`, `foundNone`, `accession.*`, `requisitionIngestion.expected.*`, `serverJobs.recurring.requisition.missingSweep`. Several performing facilities (Pete, Nov 2: "I assume that we support multiple facilities - performing?"): each source has a `facilityId` (or all facilities); queued scans, links and runs carry it, and every check is made for that facility (lists filtered with `evaluate`), so a person assigned to one laboratory sees and resolves only its scans (`requisitions.allFacilities`, `requisitions.inbox.facilityFilter`, `everyFacility`, `sourceOff`, `noSources`, `notRun`; Configuration: `requisitionIngestion.facility`, `facilityHint`, `sources`, `addSource`, `newSource`). Reference-only: a case keeps a link (the case attachments' `AttachmentPointer`), the page range, the barcode, the time and the source; no copy. `services/requisitions/` (new): types, rules (PDF only; page grouping: a new barcode starts a requisition, a page with none joins the one before, the separator sheet ends it; lookup keys with and without a container suffix), `requisitionService.ts` (match, link, quarantine, link a queued scan once its case exists, re-associate, discard, view; five capabilities in `authorization/requisitionCapabilities.ts`; audit Requisition Matched / Quarantined / Re-associated / Discarded / Viewed / Source Saved, never the file name), mock, http (`/api/requisitions/requisition/*`), instance, `requisitionPages.ts` (each page's JPEG out of the PDF with pdf-lib), `demoRequisitionEngine.ts` (ZXing Code 128 and Code 39 on each page), `requisitionIngestionRunner.ts` (the browser runs only without an API server). `public/demo-requisitions/` (new): two fictional batch PDFs and a TIFF. **Screens:** Accession → `requisitions.inboxLink` → `/accession/requisitions` (sub-screen `requisitionInbox`, `requisition:inbox:review`): `requisitions.inbox.*` (last run, the Unmatched Requisitions queue with View, Link by scan or typing, Discard with `requisitions.discardReasons.*`, Recently linked), `RequisitionPreview` (`requisitions.preview.*`: the scanned pages); the report header's `requisitions.caseButton_*` (`case:requisition:view`); Configuration → System → Integrations → Requisition ingestion (`requisitionIngestion.*`, `systemTab.sections.requisitionIngestion`, config search entry `sys-requisition-ingestion`; `config:requisition-ingestion:manage`). `RECURRING_JOBS` gains `requisition.ingest` (`serverJobs.recurring.requisition.ingest`). Line counts: `AccessionPage.tsx` 4,002 → 4,001 (baseline 4,002), `HeaderBar.tsx` 708 → 711, `capabilityCatalog.ts` 998 (spread, not grown). Tests: `requisitionService.test.ts`, `requisitionRules.test.ts`, `demoRequisitionEngine.test.ts`, `httpRequisitionService.test.ts` (new); `authorization.test.ts` (seeds); `ChangeHistoryModal.test.tsx` and `SignatureHistoryModal.test.tsx` (their capabilities mock gains `has`, which the header's Requisition button reads); `supportTicketRules.ts` knows `/accession/requisitions`. New keys machine-translated; native review pending.

## Batch 761 — Reusable staining racks: scan, load, close (Nov 2, 2026)
Pete (Nov 2, feedback on Video 1): "the slide stainer [rack] may be permanent … rather than building the container, you simply scan the container then load the container then close the container. The system should warn if the container wasn't properly closed after the last stain run in it." `services/batches/rackRuns.ts` (new). **Bug fixed:** every run on a reusable rack has the rack's barcode, and `mockBatchService.getByMasterBarcode` returned the first (oldest, finished) one, so a second run could not be started by scanning the rack, Batch Management reopened the finished run, and the inbound stainer status could be written to it; it now returns the open run (`currentRunForBarcode`). **Microtome:** a registered staining rack whose last run is closed starts a new run on scan, with no form (`stationCarrier.rack.newRun`); one sealed, on the stainer or unloading but never closed is held (`stationCarrier.rack.notClosed_*`) with **Close last run and start a new one** (`closeLastRun`: start reconciliation if needed, then the supervisor override `batch:reconciliation:override`, reason `RACK_REUSE_CLOSE_REASON`), Open in Batch Management and Cancel. **Batch Management:** a closed rack opens as a new run (New Container pre-filled); an unclosed one opens with `batchManagement.rackLastRunNotClosed`. Tests: `rackRuns.test.ts`, `useStationCarrier.rackReuse.test.tsx` (new). New keys machine-translated; native review pending.

## Batch 760 — Cytology screening without patient details (Nov 2, 2026)
Pete's "Cytology Workspace & Automated Screening Module" specification (v1.0, approved), §2.1, built first of its gaps (Pete, Nov 2: "the most critical feature to build first"). `services/cytology/cytologyBenchIdentity.ts` (new) and `components/Cytology/CytologyIdentityLine.tsx` (new): the accession, each specimen's vial type and description, and up to three slide ids (`cytologyIdentity.vial`, `vialWithPlatform`, `withSlides`). `CytologyScreeningPage.tsx`: the patient line (name, MRN) is replaced, and Ask a Colleague names the case by its accession (`cytologyScreening.patientLine`, `patientUnknown` removed; 1,527 lines, not grown). `CytologyWorklistPage.tsx`: every row's title is the accession and its subtitle the vial and slides line (`cytologyWorklist.rowSubtitle`, `unknownPatient` removed). Tests: `cytologyBenchIdentity.test.ts` (new), `CytologyWorklistPage.rowOpen.test.tsx` (rows found by accession; no name or MRN on screen). New keys machine-translated; native review pending.

## Batch 759 — No patient names at the bench, Foreign case ID for outside cases, the Manual Entry flag (Nov 2, 2026)
Pete's "Patient Verification, Outside Case Tracking, and Audit Logging" specification (v1.0, approved for development). Decisions (Nov 2): name, date of birth and MRN all come off the bench screens; the Foreign Identifier is a new case field at Accession plus the block or specimen's own outside number; the Manual Entry flag goes on the audit trail and the station log, not on the case record. **§1:** `embeddingStation.context.patient`/`dob`, `microtomyWorkstation.context.patient`/`dob` and `cytologyPrep.patientName` removed (no longer used); the Add-On Order Builder and Margin Exception Review no longer show the name (the review row shows the specimen, `benchIdentity.specimenSource`); Molecular Batch Management drops the MRN column. **§2.1:** `order.originatingCase` (`types/case/OriginatingCase.ts`), entered at Accession → Outside Patient Data → Originating case (`accessionPage.outsidePatient.originatingCase*`, `originatingInstitution`; the card moved to `OutsideCaseCard.tsx`); `ForeignIdTag` (`benchIdentity.foreignCase`, `foreignItem`, `foreignSource`) on the benches, Grossing and the report header. **§2.2/§2.3:** `services/scanEntry/` tells a scan from a typed id; `StationScanField` and `CaseSearchBar` record a typed one (audit "Manual Entry", station action `typed`, `scanTrail.actions.typed`) without blocking; `TypedEntryCheck` (`benchIdentity.typedCheck`, `typedCheckAccession`) shows the two identifiers to check. Line counts: `AccessionPage.tsx` 4,162 → 4,002, `Case.ts` 1,058 → 1,055 (`AiFieldSuggestion.ts` moved out), `HeaderBar.tsx` 704 → 708, `GrossingScreenPage.tsx` 812 → 820. Tests: `entryMethod.test.ts`, `lastEntry.test.ts`, `manualEntryLog.test.ts`, `benchIdentity.test.ts`, `useManualEntryRecorder.test.tsx` (new); `StationScanField.test.tsx` (added to). New keys machine-translated; native review pending.

## Batch 758 — The Microtome's own print mode, Block printing, the block lockout, rack first or rack last (Nov 1, 2026)
Pete (Nov 1, 2026), on the dev note's three ideas: separate Grossing and Microtome print modes; in block-level batching, scanning a block prints all its labels; an "Active Block Lockout" when a new block is scanned with labels of the current one unscanned, with a quick single-action override for a damaged slide; and both rack orders (Scan-First as built, Scan-Last with a bench buffer strictly scoped to the station, an unassigned counter, and a prompt on logout or close). **Print mode:** `PrintSettingsConfig.microtomePrintBehavior` (`on_demand`, `block`, `batch`; unset follows `defaultPrintBehavior`, `printSettings/microtomePrintMode.ts`); Print Settings gains a Microtome Print Behavior card and the old card is titled Grossing Print Behavior (`printSettingsSection.defaultBehavior.title` reworded in six languages; `microtomeBehavior.*` new). **Block mode:** the Microtome's third mode button (`microtomyWorkstation.hardware.blockMode`, `blockModeHint`, `printBlock_*`); scanning a block prints every unprinted label (`blockLabelsToPrint`), and the labels still to scan are listed (`labelScan.awaitingMany`). **Lockout:** `nextBlockLockout`, `BlockLockoutBanner` (`microtomyWorkstation.lockout.*`): Recut (reprint, reason Damaged Section, now also a reprint reason), Void (cancel, Damaged Section), Continue (station action `missing`, note "Label not scanned before the next block"), Stay; held for Scan next too. **Scan-Last:** `services/batches/benchSlideBuffer.ts` (per station, `dataStorage`), `stationCarrierRules.outputScanPlan`; the carrier card shows `stationCarrier.bench.counter` and `bench.hint`, the Microtome's own `outputHintMicrotomy`; notices `bench.slideOnBench`, `bench.noneAdded`, `bench.someLeft_*`; `bench.leaveWarning_*` on closing the tab (beforeunload) and on sign-out (`utils/leaveGuards.ts`, `hooks/useLogout.ts`). Fixed on the way: the dual scan (Batch 757) never matched a slide recorded before slide ids were stored (the seeded cases): its label id is now derived the way the Microtome prints it (`withLabelIds`); and a staining rack made after the Microtome page opened was set as the output tray but never used (not in the page's list). Tests: `microtomePrintMode.test.ts`, `benchSlideBuffer.test.ts`, `leaveGuards.test.ts`, `useStationCarrier.benchSlides.test.tsx`, `useMicrotomyWorkstation.blockMode.test.tsx` (new); `slideLabelCheck.test.ts`, `stationCarrierRules.test.ts` (added to). Line counts: `useMicrotomyWorkstation.ts` 695 → 795; `Specimen.ts` (1838) not grown. New keys machine-translated for fr/de/nl/ko/es; native review pending (Korean clinical wording especially).

## Batch 757 — Processor to staining, scan by scan: carrier lists, Embedding-to-Microtome tray, the dual scan, sealed rack (Nov 1, 2026)
Pete (Nov 1, 2026): Embedding scans the processor's carrier and sees its blocks; each block is scanned (or checked off) as it is embedded; blocks are grouped into an ad-hoc Microtome tray; the Microtome scans the tray, then for each slide the block and the newly printed label (the dual scan, which binds slide to block and records the cut); slides go into a staining rack, and scanning the full rack seals it for the stainer. "We always need to be able to type in a field in case the scanner breaks." **Carrier lists:** `StationCarrierPanel` lists a loaded carrier's items, marked ✓ Arrived as scanned off (`carrierItemRows`); a waiting item can be checked off by hand with a quick reason (label unreadable, label damaged, scanner not working), written to the station log (`checkOffByHand`). `stationCarrier.stillToScan` and `andMore` removed. **Embedding output tray:** Embedding's output node is Microtome / Sectioning; a Microtome tray scanned at Embedding becomes the output tray and each embedded block goes into it (`blockForOutputTray`). **Dual scan:** `services/material/slideLabelCheck.ts` (new); at the Microtome a printed label waits for its scan (shown above the slide grid), Print/Etch Next refuses until then, and the scan records the new station action `sectioned` with the parent block and puts the slide in the staining rack; the "Add printed slides to tray" button (which skipped the scan) is removed (`stationCarrier.addToOutput`, `notice.addedToOutput` removed). **Rescan to close:** the output tray scanned again is sealed, and the carrier unloaded at the bench is completed with it when every item is scanned off (`outputTrayRescan`). **Typing:** Batch Management's carrier page has a scan-or-type field (`batchDetail.scanPlaceholder`, `scanSubmit`; `scanHintActive` reworded). **Fast scans:** the shared scan field ignored a scan that arrived while the last was still being handled, so a fast scanner lost every other cassette; it now clears at once and takes the next, and `useStationCarrier` handles scans one at a time in order, reading the carrier again before each unload. New keys in all six languages: `stationCarrier.itemsLabel`, `itemArrived`, `itemWaiting`, `outputHintEmbedding`, `outputRescanHint`, `checkOffTitle`, `checkOffPrompt`, `checkOffReasons.*`, `notice.checkedOffByHand`, `notice.blockIntoTray`, `notice.slideIntoRack`, `notice.outputClosed_*`, `notice.outputClosedWithLoaded_*`; `microtomyWorkstation.labelScan.*`; `scanTrail.actions.sectioned`. `docs/architecture/STATION_TRACKING_API.md` lists `sectioned`. User Guide: `docs/user-guide/src/workstations/embedding.md` and `microtomy.md` describe the item list, check-off by hand, the trays and the dual scan. Tests: `slideLabelCheck.test.ts` (new); `stationCarrierRules.test.ts`, `StationScanField.test.tsx`, `useStationCarrier.test.tsx` (added to). Walked in the browser end to end with a new case: basket of 12 in, sealed, moved; at Embedding the list, tray, one block embedded into the tray, one checked off by hand, one typed, the rest scanned, unloading finished, tray sealed; at the Microtome the tray, the rack, four slides printed and confirmed by the dual scan, the rack sealed and the tray completed; at Batch Management the rack's four slides scanned off and the batch completed.

## Batch 756 — A case made on Accession reaches every bench; fixes found recording demo Video 1 (Nov 1, 2026)
Pete (Nov 1, 2026): "Fix the bugs, then record" Video 1, with his own account. **Cases made on Accession:** Accession creates an Orchestration case whose internal id (O26-0031) differs from the accession number on every label (S26-0001). The Grossing queue read only the LIS store and no scan could find the case (it looked the label's number up as an id), so the case stopped at Accession. `services/cases/caseByAccession.ts` (new, `caseByAccessionNumber`) and `CaseRouter.getCase()` falling back to it in both stores when the id finds nothing (access still checked); `GrossingWorkspacePage` lists both stores. Walked in the browser with a new case from import to the report screen: Grossing queue, grossing, processing basket in and out, Embedding, Add-On Orders, Microtome, staining rack in and out, Slide Distribution, header search. The "accessioned" message names the accession number (`AccessionPage.tsx`, one line, 4,162 lines unchanged). **Station scan field** (Pete: "can't the field listen but also receive keyboard data?"): it always did; the keyboard and submit buttons now show only with the touch layout on, and the keyboard button reads "⌨ Keyboard" / "⌨ Hide keyboard" (`stationScan.typeAnIdShort`, `backToScanningShort` changed in all six languages). **Report page "Unsaved Draft Found" with no edits:** the header search wrote its match details onto the case object the case service holds (`CaseSearchBar.tsx`), and the draft autosave wrote a draft on every reload of the case data; after the benches changed the case, the next visit offered a draft no one made. The search keeps its details in the hit; `useDraftCache` writes a draft only once the state differs from the page's first settled state (`utils/draftCacheBaseline.ts`, new). **Simulated prints:** one toast per burst of the same kind to the same place, counted (`simulatedPrint.toastRepeated`, `toastFailedRepeated`, new in six languages); 12 cassettes raised 24 toasts. **Grossing block table:** the piece description field had no style and showed as a white box (`GrossingScreenPage/GrossingBlockTable.css`, new; pathscribe.css unchanged). Tests: `caseByAccession.test.ts`, `draftCacheBaseline.test.ts` (new); `StationScanField.test.tsx`, `useDraftCache.test.ts`, `simulatedPrint.test.ts` (added to).

## Batch 755b (part 2) — Eight more checklists in PathScribe's own wording; unused demo checklists off the case picker (Nov 1, 2026)
Pete's order after part 1: breast DCIS, lung adenocarcinoma, then the six with demo cases (kidney resection, lung resection, skin melanoma biopsy, colorectal local excision and colorectal further investigations in UK layout, prostate resection), then the five no demo case uses hidden from the picker. No locale keys (checklist wording is template data, in English; US spelling, UK for the two colorectal ones). Every placeholder question and answer in `data/templates/generic/breast_dcis_resection.json`, `lung_adeno.json`, `kidney_resection.json`, `lung_resection.json`, `skin_melanoma_bx.json`, `colorectal_local_excision.json`, `colorectal_further_investigations.json` and `prostate_resection.json` reworded; option ids kept; follow-up questions shown only when their answer applies (involved margins, node counts when nodes are positive, pT1 depth and Haggitt/Kikuchi only for pT1, EGFR variant when detected, sequencing methods when done). Stage answers on the lung and kidney checklists in plain words ("pT1c: more than 2 cm, up to 3 cm"). The demo cases agree with the new wording: lung S26-4403, S26-4491, S26-4493, O26-0024 and HFHS26-1004 (stage answers matched to their size and node findings; pM "not applicable" instead of pM1a); kidney S26-4482 (pT1a, no nodes); melanoma S26-4420 (wide local excision, Clark IV, no lymphovascular invasion or neurotropism, matching its report); MFT26-8803 (TEMS, pT1, pNX); MPA26-1003 (margin positive, pN0). Their written findings (S26-4403, S26-4482, HFHS26-1004, S26-4420, MFT26-8803, MPA26-1003) are in real words, and the placeholder-style AI suggestion sources ("Finding 3.2 cm, organ confined") are plain. The older demo cases' written findings are in real words too (S26-4401, S26-4402, S26-4405, S26-4407, S26-4408, S26-4409, S26-4411, S26-4412, MPA26-1001, MPA26-1002, MPA26-1007, S26-4480, S26-4481, S26-4483): no "Marker A", "Primary finding" or "Score total" anywhere in the demo cases (pinned by `checklistWording755b.test.ts`). `services/templates/demoChecklists.ts`: `DEMO_CHECKLISTS_HIDDEN_FROM_CASE_PICKER` (breast surgical excision, kidney biopsy, prostate TURP/enucleation, Wilms resection and biopsy: no demo case, still placeholder wording) and `offeredOnCasePicker()`, used by the case checklist picker in `RightSynopticPanel.tsx` (which also left out the TEST forms; 1,750 lines, unchanged); they stay in the Synoptic Library. `scripts/Setup-PathScribeSlideDemo.ps1`: `-VercelScope` and a warning before `vercel link` would create a new project. Test: `services/templates/checklistWording755b.test.ts` covers all eleven checklists reworded in 755b and the picker.

## Batch 755b (part 1) — Breast invasive and the two UK-layout checklists in PathScribe's own wording; the Manchester demo pathologist made fictional (Nov 1, 2026)
Pete: reword breast invasive first (Video 7's S26-5404), then the two UK-layout checklists (UK is a requirement), and make the Manchester demo pathologist fictional, since Paul Carter is not a physician but a UK workflow expert helping out. No locale keys (checklist wording is template data, in English). **Breast** (`data/templates/generic/breast_invasive.json`, US spelling): every placeholder question and answer reworded (procedure, side, tumor site, 16 tumor types, Nottingham grade, size, foci, DCIS, lymphovascular and dermal invasion, calcifications, response to treatment, margins for invasive carcinoma and DCIS, lymph nodes with macro- and micrometastasis and isolated tumor cells, extranodal extension, stage, ER, PR, HER2, Ki-67); questions that apply only to an answer show only then (involved or closest margins, node counts when nodes are positive, ER/PR detail when positive, residual cancer burden after treatment); option ids kept. The breast demo cases answer "no special type" where they had the meaningless second option, and their placeholder stage and DCIS text is real (`pT2 pN1mi`). **UK layout** (`colorectal_resection_b.json` "Colorectal resection (UK layout)", `prostate_biopsy.json` "Prostate biopsy (UK layout)", UK spelling): every placeholder reworded (specimen types, sites, rectal-only questions, low/high grade, local invasion, response, longitudinal and circumferential margins, apical node, tumour deposits, venous, lymphatic and perineural invasion, stage; systematic right and left cores, targeted cores, totals, tumour type, longest carcinoma, Gleason, percentage of pattern 4, block for further testing). MFT26-8801-CR-RES and MFT26-8805-CR-FIN: written findings in real words (MMR proficient, KRAS, BRAF) and answers that agree with them (moderate response, perineural invasion present, margins clear, `ypT3 ypN1b`, `pT3 pN0`); MFT26-8802-PR-BX's suggested Gleason score now 4+3=7, matching Grade Group 3. **Manchester demo pathologist:** PATH-UK-001 is the fictional **Dr. Imogen Hartley** (MBChB, FRCPath; no licence number; `imogen.hartley@demo.pathscribe.ai`, a new demo sign-in with the shared demo password) in every seed (cases, internal notes, messages, QA activity, discordance, supervision, reconciliation, countersign, cytology reviews); Paul Carter signs in with his own email to his own record **UK-ADV-001**, no credentials and no clinical role (his superadmin sign-in and password unchanged). Fictional patients' `@nhs.net` emails are `@example.org`, and their NHS numbers are in the NHS test range (999…, valid check digits). Seed versions: users 13, cases 73 (unchanged since 755a in this delivery), messages 8, reconciliation 4, cytology reviews 12. Tests: `services/templates/checklistWording755b.test.ts` (new); `nodeCountText.test.ts` follows the new breast wording (the node counts show once the node status is answered). Checked in the browser: S26-5404's checklist, MFT26-8801 and MFT26-8802 signed in as Dr. Imogen Hartley.

## Batch 755a — Plain checklist names, the "Demo wording" tag, no copies of demo checklists, the autopsy checklist on Video 4's cases (Oct 31, 2026)
Pete (after the Oct 31 screen scan of the nine demo video scripts): the 19 demonstration checklists get plain names with a **Demo wording** tag until a pathologist has reviewed their wording, no copy may start from one, A26-4665 and A26-4666 get a checklist, and the placeholder wording in S26-4404's report and the MFT26-8804 and MFT26-8802 findings goes. New keys in all six locales: `demoChecklists.wordingTag`, `wordingTagHint`, `copyRefusedTitle`, `copyRefusedBody`, `copyRefusedBack`, `copyRefusedShort`, `pickerNote`; `demoChecklists.intro` and `capabilities.items.platformDemoChecklistsRemove.description` now name the tag instead of "Generic Template". Non-English text is machine translated. **Names:** the `name` of the 19 files in `data/templates/generic/`, their library entries (`demoChecklistRegistry.ts`) and the `templateName` stored on the demo cases (`mockCaseService.ts`, `mockOrchestratorCaseService.ts`, `demoBaselineCases.ts`, `demoAssistMapCase.ts`, `demoMolecularCases.ts`, `demoSignOutReadyCase.ts`, `demoProstatectomyMapCase.ts`, `mockAmendmentService.ts`; four stored names of checklists that don't exist, such as "Thyroid, malignant", too); nothing looks a checklist up by name (bindings, maps, copies and the removal tool use the id), checked by search. Seed versions bumped (cases 73, amendments 9, orchestrator cases 8). **Tag:** `components/Synoptic/DemoWordingTag.tsx` (new; reuses `.ps-demo-data-badge`, so `pathscribe.css` doesn't grow) on the case checklist header, the case sidebar entry, the checklist picker and the three Synoptic Library lists; decided by `demoChecklists.showsDemoWordingTag()`. **Copy refusal:** `demoChecklists.checklistCopyRefusal()`; `protocolLifecycle.protocolActions()` drops Duplicate and New Version and the new `copySourceCandidates()` leaves them out of Build / Customise (with `demoChecklists.pickerNote`); the editor shows `DemoChecklistCopyRefused.tsx` (new) instead of opening a copy; `templateService.saveDraft` refuses the first save of such a copy (`DEMO_CHECKLIST_COPY`, 976 → 980 lines). Split on touch (PS-497): the checklist picker moved out of `RightSynopticPanel.tsx` (1,853 → 1,750 lines) into `pages/SynopticReportPage/components/TemplatePicker.tsx`; the editor's starting-template loading moved out of `SynopticEditor.tsx` (1,301 → 1,277) into `hooks/useEditorStartingTemplate.ts`. **Seed:** A26-4665 and A26-4666 carry `autopsy_gross_examination` (A26-4666 with its PAD's body weight and length); S26-4404's gross description (one core per container, matching its six-core map) and ancillary studies, MFT26-8802-PR-BX's gross, microscopic and ancillary text, and MFT26-8804-PR-RP's in real words (UK spelling for the Manchester cases). Admin Guide chapter 6 sentence updated in six languages and rebuilt (customer edition published). Test: `services/templates/demoWording.test.ts` (new). Checked in the browser: the tag, the Build / Customise note and list, the refused duplicate, A26-4665 and A26-4666, and the Video 9 cases.

## Batch 754 — The demonstration checklists are kept out of customer areas (Oct 31, 2026)
Pete: a way to remove the 19 "Generic Template" checklists (their question list was inherited from the older CAP/RCPath-derived files) for any customer, both in customer builds and per customer organisation. New keys in all six locales: `demoChecklists.*` (title, intro, inLibrary_one/_other, noneLeft, demoBuildNote, check, remove, confirm_one/_other, confirmYes, cancel, working, wouldRemove, removed_one/_other, failed_one/_other, notPermitted; `_many` in es) and `capabilities.items.platformDemoChecklistsRemove`; removed: `protocolEditor.*` (its screen is deleted). Non-English text is machine translated. Code: `services/templates/demoChecklists.ts`, `demoChecklistLoaders.ts`, `demoChecklistRegistry.ts`, `demoChecklistRemoval.ts`, `demoChecklistRemovalDeps.ts` (new); `templateService.ts` (993 → 976 lines) and `protocolShared.tsx` (866 → 755) include them only when the build mode is not `server`, written literally so the bundler drops their files (checked: a `vite build --mode server` holds none of the 19 files, and `check-production-bundle.mjs` passes; before the literal mode it did not, and the check failed it); `scripts/check-production-bundle.mjs` fails on any of them (`DEMO_CHECKLIST_FILES`); `authorization/demoChecklistCapabilities.ts` (`platform:demo-checklists:remove`, platformOnly, requires `config:protocol:retire`); `hooks/useDemoChecklistRemoval.ts`, `components/Config/Protocols/DemoChecklistRemovalCard.tsx` (on All protocols, support only; checked in the browser: dry run, 19 archived, summary audit entry `DEMO_CHECKLISTS_REMOVED`); `scripts/remove-demo-checklists.mjs` (new; the API endpoint it calls is Planned). Deleted: the unused `src/protocols/` editor with its "CAP …" registry, and `types/ProtocolDefinition.ts` (an earlier README said these were already deleted; corrected), with its 34 `ps-pe-*` style classes (`pathscribe.css` 28,538 → 28,447 lines; baseline lowered) and its explicit-`any` baseline entry. Tests: `templates/demoChecklists.test.ts` (new), `templateService.seeds.test.ts`, `loadSize/loadSize.guard.test.ts`. Docs: `docs/architecture/DEMO_CHECKLISTS.md` (new), `AUTHORIZATION_API.md`, `coverage-ignore.json`, READMEs, `GUIDE_UPDATES.md`, `FEATURE_OVERVIEW.md`, the handover note.

## Batch 753 — Prostate checklists in PathScribe's own wording (Oct 31, 2026)
No new UI keys (checklist wording is template data, in English, as the colon checklist in Batch 738). Pete: real wording for the prostate needle biopsy and radical prostatectomy checklists, without exposing ForMedrixAI to CAP or RCPath copyright. `data/templates/generic/prostate_needle_biopsy.json` (100 placeholder answers and 8 placeholder questions) and `prostate_radical_prostatectomy.json` (49 answers, 16 questions and the section titles): PathScribe-authored wording on standard nomenclature, option ids kept; the needle biopsy's histologic type and overall grade questions became dropdowns, its "cannot be determined" boxes optional tick boxes; the prostatectomy shows dependent questions only when they apply (`visibleWhen`). Demo data: `services/cases/demoProstateBiopsyChecklist.ts` (new; S26-4404's answers and suggestions moved out of `mockCaseService.ts`, 6,047 → 6,019 lines (baseline in `styleRules/fileSizeBaseline.ts` lowered to 6,020), and made to agree with its map), S26-4404's microscopic description, `demoProstatectomyMapCase.ts` (S26-5407 fully answered), MFT26-8804-PR-RP's suggestions, `MOCK_VERSION` 72; `reports/mockAmendmentService.ts` (the amendment's original answers, `AMENDMENT_VERSION` 8). Tests: `services/templates/prostateChecklistWording.test.ts` (new), `organMapping/organMapAssist.test.ts` (S26-5407 compares its map answers with MFT26-8804's). Docs: template, case, report and service READMEs, `DEMO_SEED_DATA.md` (S15 done), `DEMO_GUIDE.md` (Video 9), `FEATURE_OVERVIEW.md`, `GUIDE_UPDATES.md`, the handover note.

## Batch 752 — Handover note brought up to Oct 31; slide images hosted for the demo (Oct 31, 2026)
Documentation and a helper script; no app code and no locale keys. Pete: record the slide image hosting for the development team, and anything else changed since the handover note. `docs/developer/HANDOVER_FIRST_RELEASE.md`: update line, Batch 751 test figures (with the 11 working-copy failures explained), Jira counts marked not re-read, rows marked (Oct 31) in 4.1, 4.2, 4.3, 7 and 8, new section 9 (Batches 699 to 751 by area) and section 10 (slide images in R2). `docs/product/SLIDE_IMAGE_DEMO.md`: "The quick way" (prerequisites, including the AWS CLI installer when `winget` is missing and the `vips-dev-x64-all` build) and section 10 (the set-up as done: bucket `pathscribe-demo-slides`, custom domain `slides-demo.formedrix.ai`, the two Vercel variables in Production only, the `img-src` change still open, the upload token to delete). `scripts/Setup-PathScribeSlideDemo.ps1` (new; Windows PowerShell 5.1+, UTF-8 with BOM): download, libvips conversion at level 3, blurred copy, licence notes, manifest, upload with the AWS CLI to R2 (keys asked for and never stored; content types set for html, css, js, json, dzi, txt), public address check, `vercel env add` for Production; never deploys. READMEs: `scripts/`, `docs/`, `docs/product/`, root. `GUIDE_UPDATES.md` entry. Not run in Claude's workspace (no PowerShell there); Pete ran it on Windows 11 to the upload step.

## Batch 751 — Organ maps on Assist cases, delivery to the laboratory system, seed row S15 (Oct 31, 2026)
Pete's Lab Workflow spec section 12 (Oct 31, 2026). Phase 1: `organMapping/organMapFigures.ts` `lisOwnsReport`: on an Assist case insert and remove are refused (`lisOwnsReport`), the report state is `lisOwnsReport`, and `organMapReportFigures`, `organMapFiguresForVersion` and `organMapAutoFigures.ts` give no figure (Mohs included); `organMapLive.findStaleOrganMapFigures` ignores Assist cases; `components/OrganMap/OrganMapPanel.tsx` shows the note. Phase 2: `organMapping/organMapDeliveryRules.ts` and `organMapDelivery.ts` (new), `Facility.organMapDelivery` with `setOrganMapDelivery` (mock, http, guard; capability `config:organ-map-delivery:manage` in `authorization/organMapDeliveryCapabilities.ts`, CONFIG_SECTIONS 120), `reports/dispatchAssistSynopticResult.ts` (`organMap` in the result, the `organ_map` LIS message, `dispatchOrganMapFile`, `rebuildOrganMapFileMessage`, `isWorkupMessage`), `dispatchAssistSynopticResultDeps.ts` (`drawOrganMapFile`), `documentRendering/imagePdf.ts` (new) and `svgToJpegDataUrl`, `types/case/OutboundLisSyncQueueEntry.ts` (kind `organ_map`, `organMapFile`), `pages/SynopticReportPage/hooks/useOrganMap.ts` (`fileSentAt`), `components/FacilityDictionary/OrganMapDeliverySetting.tsx` and `FacilityOutboundDocumentsSection.tsx` (new; `FacilityEditorModal.tsx` 1,469 lines, was 1,476). Seed S15: `cases/demoAssistMapCase.ts` (S26-5405, S26-5406), `cases/demoProstatectomyMapCase.ts` + `demoProstatectomyMapFigure.json` (S26-5407), S26-4404 and S26-4463 Orchestrator, `MOCK_VERSION` 71; `facilities/mockFacilityService.ts` Desert Valley sends text and a PNG file (`SEED_VERSION` 9); `reports/organMapDeliveryDemoQueue.ts` (new) the mock queue's starting data; patients PAT-B5405..B5407. Locale keys (six languages): `organMap.panel.lisOwnsReport`, `organMap.panel.fileSent`, `organMap.panel.toast.lisOwnsReport`, `organMap.delivery.nothingShown`, `organMapDelivery.*`, `capabilities.items.configOrganMapDeliveryManage`. Tests (new): `organMapping/organMapAssist.test.ts`, `organMapDelivery.test.ts`, `reports/dispatchAssistOrganMap.test.ts`, `documentRendering/imagePdf.test.ts`; updated `authorization.test.ts`, `apiServer/httpStaffAdmin.test.ts`, `organMapping/organMapConfigDraft.test.ts`. Docs: `ORGAN_MAPPING_API.md`, `SYNOPTIC_RESULT_API.md`, `AUTHORIZATION_API.md`, `GUIDE_UPDATES.md`, `FEATURE_OVERVIEW.md`, `DEMO_SEED_DATA.md` (S15), `DEMO_GUIDE.md` (Video 9); User Guide (synoptic reporting), Admin Guide (LIS Integration, six languages).

## Batch 750 — Slide images: reference preview, opening the lab's application, remembered window (seed row S10) (Oct 31, 2026)
Pete, Oct 31, 2026 (09:35): PathScribe has no slide viewer. New: `services/digitalPathology/slideImages.ts` (settings, templates with `{{slideId}}`/`{{accession}}`, which address applies, image states, thumbnail; pure), `slideImageOpen.ts` (`case:slide-image:open`, address, audit event Slide Image Opened), the slide preview service set (`ISlidePreviewService`, mock with no seed, http `POST /api/digital-pathology/slide-previews/get-for-slide`, instance; exported as `slidePreviewService`), `services/windowPlacement/windowPlacement.ts` (a saved window on a missing screen moves to the primary screen), `hooks/useSlideImage.ts`, `components/SlideImage/SlideImagePreview.tsx` (+ `.css`), `components/Config/System/SlideImageSettingsCard.tsx` (in the WSI Viewers section), `pages/WindowPositionPage/` (`/window-position`, open on purpose, Save position), `authorization/slideImageCapabilities.ts`. Changed: `EnterpriseConfig.slideImages`, `permitEnterpriseConfigPatch` (`config:vendor-integrations:manage`), runtime settings `VITE_SLIDE_VIEWER_URL_TEMPLATE` and `VITE_SLIDE_THUMBNAIL_URL_TEMPLATE` (kind text; `vite-env.d.ts`, `runtimeEnv.ts`), `StainOrder.lastScanOutcome` set by `wsiScanQueue.stainUnloaded`, `hooks/useCompanionWindow.ts` (placement check, `saveCompanionGeometry`, `requestScreenPlacement`), `NavBarScanStation.tsx` (Slide image window → Set position…), `BlockStainEditorModal.tsx` and `CytologyScreeningPage.tsx` use the preview (no growth: 1,436 and 1,527 lines), `mockWsiViewerVendorService.ts` (the example.com demo entry removed), `demoReset.ts` (`slide_previews`), `routeGating.guard.test.ts` (open route), `fileSizeBaseline.ts` (CytologyScreeningPage 1,528, `pathscribe.css` 28,539, `Specimen.ts` 1,839). Removed: `WsiViewerLaunchButton.tsx`, `utils/buildWsiViewerLaunchUrl.ts` (+ test), the `.ps-wsi-launch-*` styles (DELETED_FILES.txt). Seed: S26-5404 (`cases/demoSlideImageCases.ts`) slides Scanned and one Failed image quality; S26-5401..5403 slides carry No image yet, Scanning, Queued, Scan failed; `MOCK_VERSION` 70. Kept (parked): `pages/MockWsiViewerPage.tsx` at `/wsi-viewer`, demo tools only, reached from nothing. Locale keys (six languages): `slideImage.*`, `slideImageSettings.*`, `windowPosition.*`, `capabilities.items.caseSlideImageOpen`; removed `wsiViewerLaunch.*`. Tests (new): `digitalPathology/slideImages.test.ts`, `slideImageOpen.test.ts`, `httpSlidePreviewService.test.ts`, `windowPlacement/windowPlacement.test.ts`; `wsiScanQueue.test.ts` (outcome), `authorization.test.ts` (seed). Outside the app: `tools/demo-slide-viewer/` (standalone demonstration page, English only, OpenSeadragon 4.1.0 from cdnjs) with `manifest.example.json`. Docs: `docs/architecture/SLIDE_IMAGES.md`, `docs/product/SLIDE_IMAGE_DEMO.md` (new); `AUTHORIZATION_API.md`, `GUIDE_UPDATES.md`, `FEATURE_OVERVIEW.md`, `CAPABILITY_INVENTORY.md`, `DEMO_SEED_DATA.md` (S10), `DEMO_GUIDE.md` (Video 7 steps 17 and 18); User Guide Slide Images article (`wsi-viewer`, rewritten) and links; Admin Guide digital pathology and WSI Viewers (six languages, published).

## Batch 749 — S5 GYN volume and S4 breast FNA seed (Oct 31, 2026)
Pete's seed rows S5 and S4 (Videos 3 and 2). `services/cases/demoCytologyVolumeCases.ts` (new): S26-5501 to S26-5511 (Priya Desai's My Worklist, Pool, HPV Triage, Recall, Peer Review, and a breast FNA), in `DEMO_BASELINE_CASES`; `MOCK_VERSION` 69. `cytology/mockFacilityCytologyScreeningStrategyOverrideService.ts`: Northside Clinic (c3) primary HPV (`SEED_VERSION` 6). `digitalPathology/mockAiScreeningResultService.ts`: AI reads for S26-5501 and S26-5503; a seed result missing from storage is added. `patients/demoCytologyPatients.ts`: PAT-CYT-032 to 042. No new locale keys. Tests: `cases/demoCytologyVolumeCases.test.ts` (new); `patients/demoCytologyPatients.test.ts` (42). Docs: `DEMO_SEED_DATA.md` (S4 and S5 done), `DEMO_GUIDE.md` (Video 3), `GUIDE_UPDATES.md`.

## Batch 748 — S9 batching and S11 block-type seed (Oct 31, 2026)
Pete's seed rows S9 and S11 (Video 7, Video 1). `services/cases/demoBlockTypeCases.ts` (new): S26-5401 (two multi-piece prostate cassettes with piece maps), S26-5402 (megablock, large-format slides), S26-5403 (exhausted block, Ki-67 add-on waiting for re-embedding), in `DEMO_BASELINE_CASES`; `MOCK_VERSION` 68. `cases/demoBaselineCases.ts`: S26-4630 gains a patient-requested retention hold. `batches/wallDisplayDemoBatches.ts`: a Checkout tray (CONT-CHK-WALL-1), so all ten steps have an open batch. `patients/demoSurgicalPatients.ts`: PAT-B5401 to B5403. No new locale keys. Test: `cases/demoBlockTypeCases.test.ts` (new). Docs: `DEMO_SEED_DATA.md` (S9 and S11 done), `DEMO_GUIDE.md` (Video 7 and block types), `GUIDE_UPDATES.md`.

## Batch 747 — S8 wall display seed; wall views find their facility's work (Oct 31, 2026)
Pete's seed row S8 for Video 6. Fix: `services/facilityOpsDashboard/caseFacility.ts` (new) resolves a case's legacy tenant id (HOSP-001) to its facility; `buildFacilityLookupMaps.ts` (`caseFacilityById`), `computeDiagnosticSignOutSummary.ts`, `computeGrossingIntakeSummary.ts`, `computeStainingIhcSummary.ts` and `batches/computePendingBatchQueue.ts` use it (they compared the profile's Facility id with the raw tenant id, so no case-backed item ever matched). Seed: `cases/demoWallVolumeCases.ts` (new, S26-5301..5341 and MPA26-2101..2106, unassigned), in `DEMO_BASELINE_CASES`, `MOCK_VERSION` 67; `batches/wallDisplayDemoBatches.ts` (new: open batches at every node, and the scanner runs), into `mockBatchService.ts` and `digitalPathology/mockWsiScanBatchService.ts` (seed runs added when missing; the two open September runs now relative to the reset); `facilityOpsDashboard/mockDisplayProfileService.ts`: nine demo profiles (ids in `demoDisplayProfileIds.ts`, new, so the token tool imports no mock), seed profiles added when missing; `patients/demoSurgicalPatients.ts`: PAT-W2101..W2106 and PAT-W5301..W5341. Tool: `demoReset/demoDisplayTokens.ts` (new: `config:demo-data:reset`, then each token through the display access service's own checks; audited without tokens) and `components/Config/System/DemoDisplayTokensCard.tsx` (+ `.css`), on the Demo Reset tab. Locale keys (six languages): `demoResetTab.testingTools.displayTokensTitle`, `displayTokensDescription`, `issueTokensBtn`, `tokens.*`. Tests: `caseFacility.test.ts`, `wallDisplayVolume.test.ts`, `demoReset/demoDisplayTokens.test.ts` (new). Docs: `DEMO_SEED_DATA.md`, `DEMO_GUIDE.md` (Video 6), `GUIDE_UPDATES.md`, `FEATURE_OVERVIEW.md`.

## Batch 746 — S7 molecular seed (Oct 30, 2026)
Pete's seed row S7 for Videos 3 and 5, shipped with Batch 745 in one zip. `services/cases/demoMolecularCases.ts` (new): S26-5201 to 5209 (lung, EGFR) and S26-5211 to 5216 (colorectal, KRAS), each with a block and its DNA curls add-on, in `DEMO_BASELINE_CASES`; `MOCK_VERSION` 66. `services/molecular/molecularRunHistoryDemoSeed.ts` (new): twelve waiting in-house orders and three resulted ones (into `molecularOrders/mockMolecularOrderStore.ts`), three completed runs and a blocked KRAS run superseded by its repeat (into `mockMolecularBatchService.ts`). `mockMolecularAssayControlRuleService.ts`: `rule-746-kras`; each later seed rule reaches a browser once under its own flag; `MOLECULAR_CONTROL_RULE_SEED` exported. `reagentLots/mockReagentLotService.ts`: the molecular kits' master mix lots (one expired, one failed QC), dates relative to today; a seed lot missing from storage is added (`withMissingSeedRecords`) instead of needing a version bump. `patients/demoSurgicalPatients.ts`: PAT-M5201 to M5216. No new locale keys. Tests: `molecular/molecularRunHistoryDemoSeed.test.ts` (new, 6); seed counts in `mockMolecularBatchService.test.ts`, `mockMolecularAssayControlRuleService.test.ts`, `demoReset/demoBaseline456.autopsyMolecular.test.ts`. Docs: `DEMO_SEED_DATA.md` (S7 done, manifest, findings), `DEMO_GUIDE.md` (Video 5), `GUIDE_UPDATES.md`.

## Batch 745 — S6 autopsy seed (Oct 30, 2026)
Pete's seed row S6 for Video 4. `services/cases/demoBaselineCases.ts`: A26-4665 (temporary accession, Medical Examiner's verbal order, written order pending), A26-4666 (PAD signed, body ready for release; brain excluded, retention refused), A26-4667 (PAD and FAD signed); `MOCK_VERSION` 65. `specimenDictionary/mockSpecimenDictionaryService.ts`: `sp-autopsy-complete` "Autopsy, Complete (Body)". `patients/demoSurgicalPatients.ts`: PAT-D665 to D667. `components/Autopsy/AutopsyAuthorizationCompletionForm.tsx`: the verbal order time in the reader's format (`formatDateTime`; it printed the ISO timestamp). Docs: `DEMO_SEED_DATA.md`, `DEMO_GUIDE.md` (Video 4). No new locale keys. Test: `cases/demoAutopsyStages.test.ts`. `demoReset/demoBaseline456.autopsyMolecular.test.ts`: its five fully authorized autopsies are now named (the baseline has eight) and Sarah's autopsy list includes the three new ones (found by the Batch 746 run; Batch 745's own test run missed that folder).

## Batch 744 — S14 fluid and FNA seed; Cytology Worklist names (Oct 30, 2026)
Pete's seed row S14. `services/cases/demoFluidCases.ts` (new): S26-5101 to S26-5108 and `withFluidDemo` (S26-5005's ROSE, and its assignment to CT-001), added to `DEMO_BASELINE_CASES` and the case seed; `MOCK_VERSION` 64. `batches/batchDemoSeeds.ts`: four open cytology batches; `molecularOrders/molecularOrderDemoSeed.ts`: two instrument orders; `patients/demoCytologyPatients.ts`: PAT-CYT-024 to 031; `stains/mockStainTypeService.ts`: TTF-1. `pages/CytologyWorklistPage/CytologyWorklistPage.tsx`: row names through `resolvePatientNameValue` (showed the MRN). Docs: `DEMO_SEED_DATA.md`, `DEMO_GUIDE.md` (Video 8 script changes). No new locale keys. Tests: `cases/demoFluidCases.test.ts` (new); `demoCytologyPatients.test.ts`, `demoBaseline457.test.ts`, `CytologyWorklistPage.rowOpen.test.tsx` updated. `withFluidDemo` takes no explicit `any` (the explicit-any guard caught two).

## Batch 743 — Attachments on an Assist case are references only (Oct 30, 2026)
Pete: in Assist mode the primary LIS writes the report, so the Attachments window keeps references only (attach, link, open, remove; no tick boxes, sections or Insert into Report), and sending images to the LIS is left out. `services/caseAttachments/reportEditState.ts` (`lisOwnsReport` for `reportingMode: 'assist'`), `services/imageAssociation/caseReportImages.ts` (`reportEditProblem` → `assistCase`; `takeOutOfReport` still clears an older placement), `hooks/useCaseAttachments.ts`, `components/CaseAttachments/CaseAttachmentsModal.tsx`. New keys in all six locales: `caseAttachments.assistNote`, `caseAttachments.problems.assistCase`. Docs: `CASE_ATTACHMENTS_API.md` §6a (Assist, and Pete's dev note on LIS-pushed attachment URLs, Planned); Batch 742's Assist-PDF finding withdrawn in `GUIDE_UPDATES.md` and `DEMO_SEED_DATA.md`. Tests added to `reportPlacement.test.ts`, `attachmentCatalog.test.ts`, `CaseAttachmentsModal.test.tsx`.

## Batch 742 — Case attachments, the storage adapter, images inside report sections (Oct 30, 2026)
Pete's "PathScribe Case Image & File Attachments (Release 1)" and his four decisions (inline section placement; PDF, JPG, PNG only; reference-only with pre-signed uploads, unlink only; one window and badge), plus his storage adapter pattern. Services: `services/caseAttachments/` (new: `IAttachmentStorageService` with mock and HTTP versions, `attachmentFiles.ts`, `caseAttachments.ts`, `attachmentCatalog.ts`, `reportEditState.ts`); `services/imageAssociation/caseReportImages.ts` (placements carry a section and origin; `insertIntoReport`, `takeOutOfReport`; signed reports need an amendment or addendum), `reportSectionImages.ts`, `placementLinks.ts`. Types: `types/caseAttachments/CaseAttachment.ts`. UI: `components/CaseAttachments/CaseAttachmentsModal.tsx` (+ `.css`), `PlacedImages.tsx`; `hooks/useCaseAttachments.ts`, `hooks/useReportPlacements.ts`; the report page's and Cytology Workspace's Attachments badge; the report preview. Renderer: `functions/main.py` `sectionImages` (redeploy). Capabilities `case:attachment:upload|link|unlink` (`authorization/caseAttachmentCapabilities.ts`). Demo: S26-4680 has three demo illustrations (`public/demo/attachments/`). Removed: `components/ReportImages/`, `hooks/useCaseReportImages.ts` (in `DELETED_FILES.txt`). New keys in all six locales: `caseAttachments.*`, `bottomActionBar.attachments.*`, `cytologyScreening.attachmentsBtn|attachmentsAddBtn|attachmentsTitle`, `capabilities.items.caseAttachmentUpload|caseAttachmentLink|caseAttachmentUnlink.*`, `surgicalReportPdf.imagesTitle|imageUnavailable|documentAttached|documentAttachedNoCaption`; `capabilities.items.reportCaseImagesAttach.*` reworded. Removed keys: `reportImages.*`, `bottomActionBar.attachImages.*`, `cytologyScreening.attachImagesBtn|attachImagesTitle`. Tests: `caseAttachments/*.test.ts`, `imageAssociation/reportPlacement.test.ts`, `components/CaseAttachments/CaseAttachmentsModal.test.tsx`; Python `test_section_images_print_inside_their_section`. Korean clinical wording needs native review.

## Batch 741 — Divide specimen and aliquot tracking (Oct 30, 2026)
Pete's fluid decisions 2 and 3. Rules: `services/material/specimenDivision.ts` (`divisionTotals`, `divisionProblem`, `prefillRows`, `divideSpecimen`, `changeAliquotStatus`, forward-only statuses, receiving accession at Result back). Types (`types/case/Material.ts`): `ALIQUOT_STATUSES`, `AliquotDestination`, `SpecimenDivision`, `Decant.volumeMl|destination|aliquotStatus|aliquotStatusHistory|receivingAccession`; `Specimen.division`; `Protocol.divisionPurposes`. UI: `components/Material/DivideSpecimenPanel.tsx` (+ `.css`) on the Grossing screen and the Cytology Preparation bench, `hooks/useSpecimenDivision.ts`, `hooks/useProtocolDivisionPurposes.ts`. Capabilities `material:specimen:divide`, `material:aliquot-status:update` (`authorization/cytologyPrepCapabilities.ts`). New keys in all six locales: `divideSpecimen.*`, `capabilities.items.materialSpecimenDivide.*`, `capabilities.items.materialAliquotStatusUpdate.*`. Test: `services/material/specimenDivision.test.ts`.

## Batch 740 — Cytology Preparation bench and the cell block hand-off (Oct 30, 2026)
Pete's fluid decision 1. New page `pages/CytologyPrepStationPage/` (route `/workstations/cytology-prep`, `ScreenGate` `cytologyPrep`, tile in Pathology Workspace) reusing `useMicrotomyWorkstation({ bench: 'cytologyPrep' })` and the Microtome panels; `hooks/useCellBlockHandoff.ts`, `components/CellBlockHandoffPanel.tsx`; `hooks/useStationSlidePrinter.ts`. Rules: `services/cytology/cellBlockHandoff.ts` (`benchTakesBlock`, `benchTakesDecant`, `checkHandoffScans`, `handOffCellBlock`, `newCellBlockFrom`); `Decant.handoff`. Capabilities `screen:cytology-prep:open`, `cytology:cell-block:hand-off` (`authorization/cytologyPrepCapabilities.ts`). Station stage `Cytology Preparation`, seed station `station-cytoprep-1`; S26-5005 D2 seeded as handed off. New keys in all six locales: `cytologyPrep.*`, `microtomyWorkstation.scanErrors.cutAtMicrotome|prepareAtCytology|notHandedOff`, `pathologyWorkspace.cytologyPrepTile.*`, `capabilities.items.screenCytologyPrepOpen.*`, `capabilities.items.cytologyCellBlockHandOff.*`, `scanStationsSection.stages.cytologyPreparation`. User Guide: `workstations/cytology-prep.md` (new). Test: `services/cytology/cellBlockHandoff.test.ts`.

## Batch 739 — Aliquots, liquid-based Pap protocols, vendor-neutral processor, cytospin suggestion (Oct 30, 2026)
Pete's fluid decisions 4, 5 and 6. `DecantType` gains `aliquot`, `Decant.aliquotPurpose` (`types/case/Material.ts`); `ProtocolPathway.decantType` / `aliquotPurpose`; `generateDefaultMaterial` uses them (cell block by default; no cassette colour for an aliquot); `utils/aliquotMigration.ts` retypes legacy HPV aliquots (applied at seeding); `utils/decantTypeText.ts` replaces the English `DECANT_TYPE_LABEL` on screen (BlockStainEditorModal, MaterialTrackingHistoryModal, CytologyMaterialView). Protocols `proto-gyn-pap-thinprep`, `proto-gyn-pap-surepath`, stain `st-pap-surepath`, billing rule PAP-SUREPATH. Equipment kind `lbc_processor` with LBC_PROC_01 and LBC_PROC_02; `Batch.processorEquipmentId`; the instrument order payload names the processor (no `instrumentVendor`); New Container's Processor field. `computeCytologyPrepSuggestions`: two cytospins for a CSF or a fluid of 5 mL or less (`CYTOSPIN_MAX_VOLUME_ML`, `isCsfSpecimen`). New keys in all six locales: `cytologyScreening.materialDrawer.decantType.aliquot`, `decantHeading`, `aliquotType`, `aliquotPurpose.*`, `equipmentKinds.lbc_processor`, `newContainerModal.processor|processorNone|processorOption`. Changed: `batchManagement.nodes.Cytology Processing`, `batchManagement.nodeTileLabel.Cytology Processing`, `scanStationsSection.stages.cytologyProcessing`, `batchDetail.errors.notCytologyProcessing` (Liquid-Based Cytology Processing; the stored value is unchanged). Tests: `services/cytology/fluidDecisions739.test.ts`, `utils/generateDefaultMaterial.test.ts`.

## Batch 738 — Demo seed data part 1 (S1, S2, S3, S12, S13); review window shows answers in words (Oct 30, 2026)
No new UI keys. Seed data: `services/protocols/surgicalDemoProtocols.ts` (seven surgical grossing protocols, linked to starter entries in `mockSpecimenDictionaryService.ts`), `services/cases/demoSignOutReadyCase.ts` (S26-4680, in the baseline; `MOCK_VERSION` 62; its patient PAT-4680 in `services/patients/demoSurgicalPatients.ts`), orders ord-038 and ord-039, ord-019 split by site, crosswalk codes COLRES-T, PROS-NBX, CONSULT-OS (`mockOrderIntakeService.ts`), every histology station prints through `printer-zt411-example` now on the PathScribe agent (`mockScanStationService.ts`, `mockPrinterProfileService.ts`), demo GTIN `DEMO_RESTRICTED_CIRCULATION_GTIN` (`mockPrintSettingsService.ts`), Jordan Ellis ADM-001 (`demoAccounts.ts`, `mockUserService.ts`), home benches for PA-001 and HT-001. `data/templates/generic/colon_resection.json`: PathScribe-authored labels and options, conditional questions (`visibleWhen`), unused stage options removed. Accession's received time uses `localInputValueFromDate` (was UTC). The Review before finalising window: `services/reports/synopticReviewEntries.ts` (moved out of `useSignOutWorkflow.ts`, 1,801 → 1,747 lines; template and option labels instead of stored ids). Status of all seed rows: `docs/product/DEMO_SEED_DATA.md`.

## Batch 737 — Matrix add-ons, megablock cassette label, exhausted and large-format checks in Batch Management (Oct 30, 2026)
Lab Workflow & Batch spec §10.6, §11.1, §11.4, §11.5, Pete's priority list of Oct 30. Add-on orders on a matrix block or some of its parts (`services/addOnOrders/addOnOrderActions.ts`: matrix branch in `placeAddOnOrders`, `targetMatrixParts`, `commitSpecimen`; `saveSpecimens(caseData, specimens, matrixBlocks?)`; new error `matrixExhausted`); the matrix view now carries the parts as pieces and writes back status and `exhaustedAt` (`utils/microtomyOperations.ts`), so the Microtome marks a matrix part used up (`services/material/pieceExhaustion.ts`). Cassette labels carry `blockType` and a megablock prints with `ZPL-CASSETTE-MEGA-V1`. Batch Management: `exhaustedOnScan` (`utils/blockExceptionStates.ts`) adds the block with `warning: 'blockExhausted'` (audited); `slideSizeOnScan` / `slideFitsCarrier` (`utils/blockPieceRules.ts`) refuse a large-format slide on a staining carrier without `largeFormat` (`slide-too-large`); `Batch.largeFormat`, `HardwareContainer.supportsLargeFormat` (update needs `config:equipment:manage`), seed rack RACK-STAIN-LF-01, `components/Config/System/StainingRacksPanel.tsx`. New keys in all six locales: `addOnOrder.errors.matrixExhausted`, `addOnOrder.blockContext.matrixTitle|matrixParts`, `batchDetail.exhaustedWarning`, `batchDetail.scanRejected.slideTooLarge`, `newContainerModal.largeFormat`, `equipmentSection.racks.*`. Tests: `matrixAddOnOrders.test.ts`, `utils/carrierFit.test.ts`, a megablock case in `dispatchNetworkPrintJob.test.ts`.

## Batch 736 — Bench reasons in the Reason Dictionary; header search above the keyboard (Oct 30, 2026)
Pete: labs word the preset reasons differently, so they move into the Reason Dictionary with translated defaults and stable codes. New categories `BENCH_BLOCK_EXHAUSTED`, `BENCH_ADDON_EXHAUSTED`, `BENCH_BATCH_ABORT`, `BENCH_BATCH_OVERRIDE`, `BENCH_BATCH_COLD_CHAIN` (`types/reasons/ReasonDictionaryEntry.ts`, `sortOrder`), 18 seeds and the rules in `services/reasons/benchReasons.ts` (default wording shows `benchReasons.<CODE>`; reworded shows as entered; `benchReasonText` joins reason and note with `quickReasons.withNote`; `withReasonCode` for audit detail), admin rules `benchReasonAdmin.ts`, screen `components/Config/System/BenchReasonsSection.tsx` (section `bench_reasons`), capability `config:bench-reasons:manage` (`authorization/benchReasonCapabilities.ts`; the dictionary service checks by category). `QuickReasonPicks` now takes the dictionary's options (`hooks/useBenchReasons.ts`) and a separate optional note. Codes saved: `AddOnOrderException.reasonCode` / `responseReasonCode`, `ExhaustedBlockChoice.reasonCode`, `Batch.abortReasonCode`, `BatchOverride.reasonCode`, `coldChainExcursion.acknowledgedReasonCode`; batch `abort`, `overrideAndComplete`, `acknowledgeColdChainExcursion` take `reasonCode`; the Reconciliation exceptions report gains `reasonCode`. Header search: 16 px confirmed; results sized to the area above the keyboard (`hooks/useVisibleHeightVar.ts`, `--ps-visible-height`), its overlay no longer capped at 900 px, close button 44 px. Keys moved from `quickReasons.<set>.<key>` to `benchReasons.<CODE>` (same wording); new `quickReasons.withNote`, `benchReasonsSection.*`, `systemTab.sections.benchReasons`, `configSearchIndex.entries.sys-bench-reasons.description`, `capabilities.items.configBenchReasonsManage`, `labWorkflowReports.columns.reasonCode`. Deleted: `services/reasons/quickReasonSets.ts`.

## Batch 735 — Station screens by touch (Station Touch Specification v1, Oct 30, 2026)
T1 `components/Workstation/StationScanField.tsx` (inputmode none, focus kept by `hooks/useScanFieldFocus.ts` and `utils/touch/scanFieldFocus.ts`, ⌨ Type) on Grossing, Embedding, Microtome, Slide Distribution, Add-On Orders and the Batch Management hub; `services/scanner/scanRoutePolicy.ts` stops the app-wide scanner opening a report from a station screen (Grossing opens the grossing screen). T2 and §5 `components/Touch/TouchLayoutScope.tsx` + `touchLayout.css` on the station routes, switched by `hooks/useTouchLayout.ts` / `utils/touch/touchLayout.ts` (Auto on a coarse pointer, or the workstation override in the station menu). T3 `components/Common/QuickReasonPicks.tsx` with `services/reasons/quickReasonSets.ts` (Microtome Block exhausted, batch Abort / Override / cold chain, Add-On exhausted answers; the builder now uses it too). T4 `utils/listOrder.ts`, Move up / Move down at the Microtome. T5 `components/Touch/touchChrome.css` (44 px header buttons, 16 px header search, breadcrumb hit area, windows above the header, compact header below 1280 px), `role="dialog" aria-modal="true"` on the station windows. T6 `hooks/useKeyboardKeepVisible.ts` / `utils/touch/keyboardVisibility.ts` and the Save dock; `interactive-widget=resizes-content` in `index.html`. Tap-to-read tooltips `utils/touch/tapTitle.ts`. Guard: `services/styleRules/touchLayout.guard.test.ts`. Eight unused scan-field classes removed from `pathscribe.css` (baseline 28550). New keys in all six locales: `stationScan.*`, `touchLayout.*`, `quickReasons.*` (the Add-On builder's three reasons moved there from `addOnOrder.exhausted.reasons`), `batchManagement.lookupButton`, `microtomyWorkstation.slideGrid.moveUp|moveDown|moveUpShort|moveDownShort|selectForBatch`.

## Batch 734 — Ad-hoc carriers move silently; direct browser printing per facility (Oct 30, 2026)
Pete's Decisions 3 and 4. An open ad-hoc carrier scanned at another station moves there (`carrierMovesHere` in `services/batches/stationCarrierRules.ts`, `Batch.stationMoves`, event note "Ad-hoc carrier moved here from station …"), with the notice `stationCarrier.notice.movedHere`. Direct browser-to-printer calls (QZ Tray, PathScribe agent, Zebra Browser Print, BarTender) are allowed in the demo and, in a server deployment, only for a facility with `Facility.allowDirectDevicePrinting` on (`services/printing/directDevicePrinting.ts`; checked in `utils/labels/dispatchZplLabel.ts` and the QZ Tray branch of `services/printing/attemptPrintDelivery.ts`; audited). New capability `config:direct-device-printing:manage` (`authorization/printingPolicyCapabilities.ts`), `setDirectDevicePrinting` on the facility service (route `POST /api/facilities/facility/set-direct-device-printing`), and the switch `components/FacilityDictionary/DirectPrintingSetting.tsx` on the Printing tab. New keys in all six locales: `directPrinting.*`, `printLabels.directPrintingOff`, `capabilities.items.configDirectDevicePrintingManage`, `stationCarrier.notice.movedHere`. Tests: `directDevicePrinting.test.ts`, `stationCarrierRules.test.ts`; two printing tests now pass an allowing facility.

## Batch 733 — One flag per exhausted block; destructive cutting only while tissue may remain (Oct 30, 2026)
Pete's decisions of Oct 30, 2026 (items 1 and 2). New keys in all six locales: `addOnOrder.tracking.answerAppliesToAll_*`, `answerThisOnly`, `answerIndividually`, `destructiveWarning`, `destructiveNotOffered`, `answeredCount_*` (plurals with `_many` in es), `addOnOrder.errors.alternativeRefused.needsNewSection|notEnoughSlides|nothingLeft`. Changed: `microtomyWorkstation.exhausted.body` (one flag covers every waiting slide; destructive cutting only while tissue may remain). Non-English text is machine translated and needs native review. Code: `utils/exhaustedBlockRules.ts` (`flagBlockExhaustedOnce`, `waitingSlideIds`, `openExhaustionFlags`, `destructiveCutAllowed`, `unstainedSlidesForGroup`), `services/addOnOrders/addOnOrderActions.ts` (`flagAddOnException`, `respondToAddOnException`), `OrderTrackingDashboard.tsx`, `AddOnOrderPage.tsx`, `useAddOnOrderStation.ts`, `useMicrotomyWorkstation.ts`.

## Batch 732 — Megablocks and multi-piece blocks (Oct 30, 2026)
Lab Workflow & Batch spec §11.1–11.7. New keys in all six locales: `blockPieces.*` (types, slide sizes, the grossing editor, columns, problems, the bench panel, `pieceCount_*`), `addOnOrder.exhausted.otherPiece`, `addOnOrder.exhausted.problem.pieceUnusable`, `exhaustedBlock.piecesTitle`, `addOnOrder.errors.mixedPieces|pieceExhausted`, `addOnOrder.builder.levelCount|levelsPerSlide`, `addOnOrder.summary.levelRange_*`, `microtomyWorkstation.slideGrid.levelsOnSlide_*|forPieces_*`, `slideDistribution.errors.scannerNotLargeFormat`, `equipmentSection.modal.largeFormatLabel` (plurals with `_many` in es). Review fixes: `microtomyWorkstation.exhausted.orderHeld`, `addOnOrder.tracking.alternativeNeedsNote`, `blockPieces.problems.pieceInUse`. Also fixed (no new keys): the station-volume report now leaves research cases out (`labWorkflowReportService.ts`). Piece descriptions, orientation and ink are data, shown as entered. Non-English text is machine translated and needs native review (piece = fragment / Stück / stuk / 조각 / fragmento; megablock = mégabloc / Megablock / megablok / 메가블록 / megabloque). Code: `types/case/blockPieces.ts`, `types/case/addOnOrderException.ts` (moved out of `Specimen.ts`, now 1,840 lines), `utils/blockPieceRules.ts`, `services/material/pieceExhaustion.ts`, `components/Workstation/BlockPieceMapPanel.tsx`, `pages/GrossingScreenPage/components/BlockPieceMapEditor.tsx`, `components/Config/System/EquipmentSection.css` (all new); `addOnOrderOperations.ts`, `exhaustedBlockRules.ts`, `addOnOrderActions.ts`, the Add-On, Grossing, Embedding, Microtome and Slide Distribution screens, `printCassetteSlideLabel.ts`, `dispatchNetworkPrintJob.ts`, `biFeedCatalog.ts`, `IEquipmentService.ts`, `MatrixBlock.ts`.

## Batch 731 — Exhausted-block rule, item end states, lineage (Oct 30, 2026)
Lab Workflow & Batch spec §10.4, §10.5, §10.6 (decided by Pete Oct 29, 2026). New keys in all six locales: `addOnOrder.exhausted.*` (the builder's per-line choices, `problem.*`, `reasons.*`, `controlsNote`), `addOnOrder.errors.exhaustedNeedsChoice_one|_other` (+ `_many` in es), `addOnOrder.errors.exhaustedReasonRequired`, `addOnOrder.tracking.alternative|applyAlternative`, `addOnOrder.tracking.stage.AwaitingRe-embedding`, `exhaustedBlock.*` (the station warning; `awaitingReembed_*`, `released_*` with `_many` in es), `itemEndState.*` (panel, `states.*`, `reasons.<state>.*`, `errors.*`), `scanTrail.cameFrom`, `capabilities.items.materialEndStateRecord|materialReembedRequest|materialReembedComplete`, `biFeed.datasets.item_end_states`. Changed: `addOnOrder.errors.blockExhausted` (now points to the choices) and `microtomyWorkstation.exhausted.body` (names the new answers). A quick-pick reason is stored in the language it was picked in, like typed text. Non-English text is machine translated and needs native review (re-embedding = réinclusion / Wiedereinbettung / opnieuw inbedden / 재포매 / reinclusión). Code: `utils/exhaustedBlockRules.ts`, `services/itemEndStates/`, `services/material/materialLineage.ts`, `authorization/materialLifecycleCapabilities.ts`, `components/Workstation/ExhaustedBlockBanner.tsx`, `ItemEndStatePanel.tsx`, `hooks/useItemEndState.ts`, `pages/AddOnOrderPage/components/ExhaustedBlockChoices.tsx` (all new); `addOnOrderActions.ts`, `addOnOrderOperations.ts`, `blockExceptionStates.ts`, `OrderTrackingDashboard.tsx`, `BlockContextPanel.tsx`, `AddOnOrderPage.tsx`, `useAddOnOrderStation.ts`, the Embedding, Microtome and Slide Distribution hooks and pages, `ScanTrailPanel.tsx`, `IStationScanEventService.ts` (`parentItemId`), `disposeItemByScan.ts`, `mockBatchService.ts`, `biFeedCatalog.ts`; `types/case/Specimen.ts` changed in place (two union lines, no growth).

## Batch 730 — Lab Workflow Reports, reporting-feed datasets, Power BI kit, print labels at, temperature checks (Oct 30, 2026)
Lab Workflow & Batch spec §5, §8, §9, §9.3, §9.3a and the Equipment Log row. New keys in all six locales: `labWorkflowReports.*` (page, tile, `reports.*`, `descriptions.*`, filters, `groupings.*`, `caseTypes.*`, `steps.*`, `columns.*`, `measures.*`, `kinds.*`, `errors.*`, export, footnote), `capabilities.items.report*View|Export` (fourteen), `biFeed.datasets.station_events|batches|add_on_orders`, `addOnOrder.printAt.*` (`printed_one|_other`, `printedSomeFailed_one|_other`, with `_many` in es), `equipmentLog.types.temperature_check`, `equipmentLog.modal.temperatureLabel|range|noRange`, `equipmentLog.errors.temperatureRequired|outcomeMismatch`, `equipmentLog.temperatureReading`, `equipmentSection.modal.temperatureMinLabel|temperatureMaxLabel|temperatureHint`, `equipmentSection.errors.temperatureRangeInvalid`. Report column ids and BI field ids are not translated where they are schema (the CSV headings are). Non-English text is machine translated and needs native review. Code: `services/labWorkflowReports/` (new), `services/labelPrintRoutes/` (new), `services/authorization/labWorkflowReportCapabilities.ts` (new; `capabilityCatalog.ts` 997 lines), `pages/BatchManagement/LabWorkflowReportsPage.tsx` (+ `.css`, `hooks/useLabWorkflowReports.ts`), `biFeedCatalog.ts`, `asyncExportContract.ts`, `equipment/` rules, `EquipmentSection.tsx`, `EquipmentLogModal.tsx`, `AddOnOrderPage.tsx`, `OrderSummaryRoutingPanel.tsx`, `useAddOnOrderStation.ts`, `useMicrotomyWorkstation.ts`, `SignedInApp.tsx`; `docs/product/powerbi/` (new).

## Batch 729 — Station tracking part 2: matrix blocks at the benches, scan history, stopped work (Oct 30, 2026)
Lab Workflow & Batch spec 7.3, 7.4, 7.5, 10.1 and 11.6. New keys in all six locales: `scanTrail.*` (panel, columns, `actions.*` for the eight event actions, `results.*`, `inCarrier`, `byCarrier`), `wrongCaseScan.message|setAside|continue`, `embeddingStation.context.matrixBlockOf`, `microtomyWorkstation.blocksStillWaiting_one|_other` (+ `_many` in es), `facilityOpsDashboard.details.stationRowLoose|lastSeenAt`, `.alertKinds.notScanned`, `.stats.notScanned`, `displayProfiles.staleScanLabel|staleScanHint|staleScanInvalid`. Changed: `embeddingStation.scanErrors.unsupportedTarget` and `slideDistribution.scanErrors.unsupportedTarget` (matrix blocks are now accepted). Non-English text is machine translated and needs native review. Code: `services/stationScans/stationTrailRules.ts`, `wrongCaseScan.ts`, `recordStationScan.ts`, `services/material/incompleteSectioning.ts`, `utils/embeddingMatrixView.ts`, `hooks/useScanTrail.ts`, `hooks/useWrongCaseScanCheck.ts`, `components/Workstation/ScanTrailPanel.tsx` (+ `.css`), `WrongCaseScanBanner.tsx`, `pages/MicrotomyWorkstationPage/MicrotomyWorkstationPage.css` (new); `useEmbeddingStation.ts` (447 lines), `useMicrotomyWorkstation.ts` (582), `useSlideDistributionStation.ts` (398), `GrossingScreenPage.tsx`, `runCaseAction.ts` (`saveCaseChange`), `IStationScanEventService.ts` (`activitySummary`), the Stations view summary, `DisplayProfilesSection.tsx`, `types/case/MatrixBlock.ts`.

## Batch 728 — Research cases and batch purposes (Oct 29, 2026)
Lab Workflow & Batch spec Decision 4 and 4a, and the New Container node default. New keys in all six locales: `researchCases.*` (the Configuration section: cards, fields, what applies, saved/refused text, `problems.*`, `purposeProblems.*`), `batchPurposes.builtIn.*` (routine, research, teaching, clinical-trial, biobank, qa-validation), `batchPurposes.label`, `newContainerModal.chooseStep`, `displayProfiles.purposesLabel|purposesHint`, `systemTab.sections.researchCases`, `configSearchIndex.entries.sys-research-cases.description`, `capabilities.items.configResearchCasesManage|configBatchPurposesManage`. MRN wording follows the terminology decisions (fr IPP, de Patientennummer, nl patiëntnummer, es NHC). A lab's own batch purposes are data and shown as entered. Non-English text is machine translated and needs native review. Code: `services/researchCases/` (new), `services/batches/batchPurposes.ts` (new), `services/retentionPolicy/resolveCaseDisposalDate.ts` (new), `components/Config/System/ResearchCasesSection.tsx` (+ `.css`, new); the research rule applied in `worklist/worklistTileCounts.ts`, `interfaceDispatch/resolveDispatchOrganisation.ts`, `interfaceDispatch/dispatchCharge.ts`, `billing/mockOutboundChargeQueueService.ts`, `reports/dispatchPreliminaryCaseInstances.ts`, `reports/mockReportVersionService.ts`, `delivery/deliverReport.ts`, `cancerRegistry/dispatchCancerRegistryReportIfApplicable.ts`, `screeningRegistry/submitScreeningRegistryResult.ts`, the three disposal paths and the two Contribution dashboards; `NewContainerModal.tsx`, `BatchDetailView.tsx` (652 lines), `DisplayProfilesSection.tsx`, the five carrier wall views. `capabilityCatalog.ts` 996 lines, `mockBatchService.ts` 878.

## Batch 727 — Add-ons on the wall display, time X, Stations view (Oct 29, 2026)
Lab Workflow & Batch spec Decisions 2 and 3, sections 6.4 and 9. New keys in all six locales: `facilityOpsDashboard.stats.*` (30), `.alertKinds.*` (10), `.details.*` (14), `.material.*`, `.wsiStatus.*`, `.transit.*`, `.instrumentStatus.*`, `.addOnTypes.*`, `.addOnPill`, `.pinned`, `.views.stationOverview`, and `displayProfiles.addOnLimitLabel|addOnLimitHint|addOnLimitInvalid`. The wall display's labels, alert kinds and details used to be English text built in the services; every view now carries keys (converted on touch), with the English kept as fallback. Non-English text is machine translated and needs native review. Code: `services/facilityOpsDashboard/openAddOnOrders.ts`, `stationOverviewRules.ts`, `computeStationOverviewSummary.ts`, `displayProfileRules.ts` (new); the five view summaries, `DashboardSummaryView.tsx` (+ `.css`), `viewRegistry.ts`, `FacilityOpsDashboardPage.tsx`, `DisplayProfilesSection.tsx`, `mockDisplayProfileService.ts`.

## Batch 726 — Carriers at the workstations, station scan events (Oct 29, 2026)
Lab Workflow & Batch Management spec (Pete, Oct 29): Decision 1, 5, 8, 9; sections 2, 4, 7.1, 7.2, 7.6, 10.1–10.3. New keys in all six locales: `stationCarrier.*` (the Carriers at this station card, its notices and warnings; `unexpectedCount_one/_other`, plus `_many` in es), `batchCarrier.*` (Batch Detail: closed, sealed, steps, Move to), `batchDetail.errors.batchSealed|alreadySealed|cannotAdvance|stationRequired`, `batchDetail.scanRejected.sealed|notAccepting`, `batchDetail.scanHintSealed`, `grossingBench.carrier.*` (replaces the removed `grossingBench.decal.*`), `scanStationsSection.stages.decal|checkout|externalReferral|cytologyProcessing|cytologyStaining|cytologyImaging|slideDistribution` (the node ones reuse `batchManagement.nodes.*` text), `capabilities.items.batchManifestSeal|batchCarrierAdvance|stationScanMismatchContinue|stationScanHistoryView`. Changed: `grossingBench.hint`, `batchDetail.transferredToast` (the Decal transfer keeps the same batch), `scanStationsSection.subtitle` (no longer says eight stations). Non-English text is machine translated and needs native review (carrier = porteur / Träger / drager / 운반체 / soporte, as in the existing batch strings). Code: `services/stationScans/` (new), `services/batches/stationCarrierRules.ts` (new), `disposableBarcode.ts` (moved out of `mockBatchService.ts`, now 874 lines), `hooks/useStationCarrier.ts`, `components/Workstation/StationCarrierPanel.tsx`, `pages/BatchManagement/BatchCarrierStepPanel.tsx`, `authorization/batchCarrierCapabilities.ts` (`capabilityCatalog.ts` 993 lines).

## Batch 725 — The in-app User Guide scrolls (Oct 29, 2026)
Styles only; no new or changed keys in any locale. `pages/Help/userGuide.css`: `.ps-ug` fills the space under the top bar (`block-size: 100%`, `overflow: hidden`); the contents list (`.ps-ug-side`) and the article (`.ps-ug-main`) each scroll (`overflow-y: auto`, `min-block-size: 0`); at 800 px and narrower the whole page scrolls. Cause: `index.css` locks `html, body, #root` to the screen and `.ps-app-outlet-wrap` clips (`overflow: hidden`), and the page had no scroll area of its own since Batch 657. Test: `userGuide.scroll.test.ts`.

## Batch 724 — "Microtome", not "Microtomy" (Oct 29, 2026)
Pete: "Microtomy is a clear misspelling"; change everywhere. English only: `en.json` values (tile `pathologyWorkspace.microtomyTile.title`, `microtomyWorkstation.pageTitle` and the other bench text, `batchManagement.nodes.*`, the workflow-stage label, the Facility Ops view name, pedal and hotkey labels), mock station, group and location names, the `Add Comment (Microtome)` action labels and the "Slides Engraved at Microtome" audit event, comments, tests and READMEs. Not changed, on purpose: locale keys (`microtomyWorkstation.*`, `microtomyTile`, `screenMicrotomyOpen`), the route `/workstations/microtomy` and the Help slug `workstations/microtomy` (set with `slug:` in the article), the capability `screen:microtomy:open`, the stored workflow stage/node value `Microtomy / Sectioning` (and `Microtomy/Sectioning` in old demo cases), `MICROTOMY` registry categories and barcodes, file and component names. fr, de, nl, ko and es keep their own words and need native review. User Guide and Admin Guide sources updated and both rebuilt. Terminology decision added below.

## Batch 723 — Home screenshot replaced (Oct 29, 2026)
Documentation only; no keys or code. `docs/user-guide/img/home-overview.png` replaced; `scripts/user-guide/build.py` regenerated `public/help/user-guide/`.

## Batch 722 — Home article: PubMed article line and paste box (Oct 29, 2026)
Documentation only; no new or changed keys in any locale and no app code. `docs/user-guide/src/home/index.md` gains the paste box row, the paste messages (from `pubMedTicker.*`), a note that the line is automatic and unreviewed, and the figure `capture:home-pubmed` (`docs/user-guide/img/home-pubmed.png`); `scripts/user-guide/build.py` regenerated `public/help/user-guide/`. Entry in `docs/product/GUIDE_UPDATES.md`.

## Batch 721 — Accession screen in two columns on a wide window (Oct 29, 2026)
Layout only; no new or changed keys in any locale (the headings reuse `accessionPage.tabs.*`). `services/accessioning/resolveAccessionPanels.ts` decides which panels show (tests: `resolveAccessionPanels.test.ts`); `hooks/useAccessionTwoColumn.ts` follows the window width (1,480 CSS px); `pages/AccessionPage/AccessionTabBar.tsx` (moved out of the page) and `AccessionColumnSlot.tsx` draw the tabs/headings and put the Cytology card under the specimens; styles in `pages/AccessionPage/accessionColumns.css` (pathscribe.css is over the size limit and did not grow). `AccessionPage.tsx` 4,165 to 4,163 lines (baseline lowered). New test: `AccessionPage.twoColumn.e2e.test.tsx`.

## Batch 720 — Grossing tile, bench tools, required marks, print on save (Oct 28, 2026)
New keys in all six locales: `pathologyWorkspace.grossingTile`, `pathologyWorkspace.addOnOrdersTile`, `capabilities.items.screenGrossingOpen`, `grossingWorkspace.*`, `grossingBench.*`, `accessionPage.requiredMark.title`, `accessionPage.grossing.defaultsKept`, `printSettingsSection.printOnAccession`. Non-English text is machine translated and needs human review. New actions `GROSSING_PRINT_CASSETTES`, `GROSSING_TAKE_PHOTO`, `GROSSING_ASSIGN_DECAL`, `GROSSING_ADD_ON_ORDER` (phrases in `docs/product/PHRASE_REVIEW_LIST.md`). New capability `screen:grossing:open`. Later the same day: `printLabels.preparing` and `printLabels.preparingTitle` (the label window opens from the click); `accessionPage.specimens.referralClient` and `referralClientId` (and the `specimenEditModal.fields` pair) reworded to Outside Lab Name and Outside Lab Specimen / Accession ID. `qualityComplianceHub.marginExceptionReviewTile` moved to `pathologyWorkspace.marginExceptionReviewTile` in all six locales (Margin Exception Review is back under Pathology Workspace, Pete Oct 28). `worklistPage.outreachLabel` and `outreachTile.*` now read "Orchestration Cases" in all six locales (Pete, Oct 28); "Orchestration/Outreach" shortened to "Orchestration" elsewhere. `AccessionPage.tsx` is 4,164 lines (was 4,183).

## Batch 703 to 716 — Oct 28 feedback round (Worklist, role tiles, stains, no AI percentages, birth date, margin exception, tiles, password reset, downtime, stations, clinical indication, label style, cytology demo data)

- **703:** `services/worklist/worklistContext.ts`; "Go to Worklist" opens `?context=outreach` for `O26-` cases; the Worklist honours `?context=`.
- **704:** Home tiles checked against the Role Dictionary for 15 users; no code change.
- **705:** `stainOrigin()` in `utils/grossingScreenOperations.ts`; stain tags User-added / Auto-generated / Existing. Keys `grossingScreen.stainOrigin.*`, `grossingScreen.confirmRemoveStain.*`. The Existing strings in fr, de, nl, ko, es are machine translations and need human review.
- **706:** AI confidence percentages removed from clinical screens in both profiles; 13 keys deleted and 6 reworded in all six locales; new `aiReviewModal.sourceFound`, `aiReviewModal.sourceNotFoundBanner`, `clinicalMismatch.why.holds` need human translation in five languages. Guard: `services/aiGovernance/noConfidencePercent.test.tsx`.
- **707:** date of birth and last menstrual period saved as plain dates (`utils/plainCalendarDate.ts`).
- **708:** Margin Exception Review tile moved to Quality & Compliance; keys moved to `qualityComplianceHub.marginExceptionReviewTile` in all six locales.
- **710:** Home and hub tile descriptions shortened in six languages (`tileDescriptionLength.test.ts`); badge moved to the card corner. 23 keys per locale need human review.
- **711:** password reset request (`services/staffPasswords/passwordResetRequestService.ts`; keys `login.resetRequest.*`; removed `login.passwordResetUnavailable`).
- **712:** downtime reason blocks Next and Submit (`fieldRequirements.fields.accession.downtimeReason`).
- **713:** station lists filtered by the user's facilities (`navBarScanStation.notAvailable`, `scanStationPrompt.notAvailable`, `stationSwitch.notAuthorized`).
- **714:** Clinical Indication provenance (`accessionPage.clinicalIndication.note.*`, `.sources.*`).
- **715:** letters or numbers for specimens, blocks and slides (`facilityEditorModal.labelStyle.*`; removed `facilityEditorModal.general.specimenLabeling`).
- **716:** cytology demo data (no locale change).
- **718 — Worklist columns stay aligned** (CSS only; no strings). The Physician cells were hidden at 1280px and below while their header stayed, so every column to the right sat one place off.
- **717 — feedback destination and validation category** (`enhancementRequestModal.*`, `feedbackSection.*`: 24 keys, machine-translated, need review).
- **709:** Worklist Case column shows the visible accession number (`services/cases/caseDisplayNumber.ts`).
- Also: the Help article no longer mentions User Guide and Administrator Guide buttons on the profile card; the sign-out guide article no longer states a numeric confidence floor.

## Batch 700 — guides caught up with Batches 653 to 699

Administrator Guide (English only; other languages held for the content freeze): Codes window checked origin, Similar Cases (Demonstration), MFA policy on a server build, permissions added in Batches 654 to 669, consult link masking and view cap, glossary. User Guide: critical-finding window and the confidence floor. Rebuilt with `build.py --langs=en --publish` and the User Guide build. See `docs/product/GUIDE_UPDATES.md`.

## Batch 699 — "Checked origin" wording in the Codes window

Founder decision (Oct 27, 2026) after the Intended Use Statement review: the origin line under an AI-suggested code is worded as a checked origin, never as verified by a person.
- `addCodeModal.origin.from`, `fromSpecimen` and `notStated` reworded and `addCodeModal.origin.checkedHint` added, in en, fr, de, nl, ko and es (machine-translated; native review needed, listed in `docs/quality/TRANSLATION_REVIEW.md`).
- `AiSuggestionMeta.tsx` shows the hint as the line's tooltip; `AiSuggestionMeta.test.tsx` updated.
- Docs: `services/coding/README.md`, `docs/product/REGULATORY_PROFILE.md`, User Guide Report > Synoptic reporting, `GUIDE_UPDATES.md`.

## Batch 698 — handover note for the development team
Documentation only: `docs/developer/HANDOVER_FIRST_RELEASE.md` (status, remaining work by workstream, decisions, outside parties, release steps). No code and no UI text changed. The Jira counts in it were read on Oct 26, 2026.

## Batch 696 — where an AI-suggested code came from
Ten new keys in all six languages under `addCodeModal.origin.*` (from, fromSpecimen, notStated, and five section names) and `addCodeModal.verified.*` (dictionary, code-map). Machine-translated; in the review register (`docs/quality/TRANSLATION_REVIEW.md`).

## Batch 691 — sign-out note reworded
`caseSignOutModal.unreviewedAiFields_one/_many/_other` reworded in all six languages: the unconfirmed AI fields are now left out of the signed report (machine-translated; in the review register).

## Batch 690 — code match labels
Two new keys in all six languages: `addCodeModal.match.strong` and `addCodeModal.match.possible` (machine-translated; in the review register).

## Batches 688 and 689
No locale changes.

## Batch 687 — two unused AI settings removed
Keys `aiTab.advanced.macroSuggestions` and `aiTab.advanced.subspecialtyRouting` removed from all six languages.

## Batch 686 — error screen back button
One new key in all six languages: `errorBoundary.backToPrevious` (machine-translated; in the review register).

## Batch 685 — mismatch quotes in the QA record
One new key in all six languages: `surgicalQaWorklist.mismatch.noEvidence` (machine-translated; in the review register).

## Batch 684 — handover procedure for native-language review (documentation)
No locale or code changes. Procedure added to `docs/quality/HANDOVER_REVIEW_TESTS.md`; Batches 679 to 683 strings added to `docs/quality/TRANSLATION_REVIEW.md`.

## Batch 683 — mismatch evidence quotes
New keys in all six locales: `clinicalMismatch.evidence.{clinical,pathology,notFound}`. Machine translations need native review.

## Batch 682 — AI settings follow the regulatory profile
New key in all six locales: `clinicalMismatchRulesSection.inactiveNote`. Removed from all six: `aiTab.advanced.showConfidenceScores` (the setting was read by nothing). Machine translations need native review.

## Batch 681 — unreviewed AI values: sign-out line
New plural key in all six locales: `caseSignOutModal.unreviewedAiFields` (`_one`, `_many`, `_other`). Machine translations need native review.

## Batch 680 — AI drafts must be accepted before sign-out
New key in all six locales: `useSignOutWorkflow.toast.aiNarrativeNeedsAcceptance`. Machine translations need native review.

## Batch 679 — regulatory profile: confidence figures hidden by default
New keys in all six locales: `clinicalMismatch.alert.titlePlain`, `clinicalMismatch.source.{aiPlain,rulePlain,ruleJurisdictionPlain}`, `rightSynopticPanel.fieldRow.{aiSuggestionBadge,checkSourceBadge,checkSourceTitle}`, `caseCoding.aiDetailPlain`, `addSynopticModal.protocolList.suggestedPlain`. The percentage versions remain for the `clinical_support` profile. Machine translations (fr, de, nl, ko, es) need native review.

## Batch 678 — Regulatory Readiness Matrix (documentation and a generator script)
No locale or code changes.

## Batch 677 — compliance requirements tracker (documentation)
No locale or code changes.

## Batch 676 — Regulatory Compliance Guide (documentation)
No locale or code changes. New `docs/compliance-guide/` (English); translation held.

## Batch 675 — MFA policy on the server (access-14)
No locale changes (the refused-sign-in message reuses the existing `server_unavailable` text). New `IMfaPolicyService`, HTTP and mock versions; `mfaService.loadPolicy`; sign-in fails closed if the policy cannot be read.

## Batch 674 — authentication model (documentation)
No locale or code changes. User Guide sign-in article gains one sentence (English only); Admin Guide update pending in six languages.

## Batch 673 — documentation only
No locale or code changes. Added `docs/architecture/SERVER_DECIDES.md`.

## Batch 672 — wiring step 3
No locale changes. Five new server versions (delivery queue, referral queue, held release, release event log, QC sampling state); the QA activity-type ids, print refusal code and charge-status helper moved out of mock files; the guard baseline fell to 13 files.

## Batch 671 — core data wiring
No locale changes. About 60 service files moved from direct mock imports to the switched instances; the guard baseline fell from 95 files to 32.

## Batch 670 — audit wiring
No locale changes. 80 service and UI files now write audit entries through the switched `auditService`; guard added (`services/apiServer/directMockImports.guard.test.ts`).

## Batch 669j — secure-email audit line
Added `appShell.secureEmailModal.auditRecorded` in six languages (Korean needs native review) and removed the " · Audit logged" tail from `securityNotice`: the claim now shows only after the window has written the audit entry.

## Batch 669i — External Consult
New keys for the link banner, identity preview and tooltips (six languages, Spanish `_many`). **Deliberate exception to "format dates with the user's locale":** on the External Consult page the date of birth is always `DD-MMM-YYYY` with an English capitals month (24-OCT-1980), and masked as `**-***-1980`, in every language, so a laboratory date can never be read as US or international order (Pete's reviewer, Oct 24, 2026).

## Batch 669h — Control Rules, External Consult, footer
Merged staged keys for the three areas in all six languages; removed `home.systemsOperational` and `appShell.secureEmailModal.encryptedNotice`; reworded `home.footerCopyright` and two CAP search descriptions. Korean needs native review.

## Batch 669g — messaging and cytology refinements
Added two keys in all six languages (unrecognised secondary code message; the Mark as unread tooltip). Korean needs native review.

## Batch 669f — new keys for the second findings group
Merged the staged keys for Microtome and Add-On Orders, Molecular, Operations and Messaging/Cytology QC in all six languages (three keys removed for Molecular). Korean needs native review.

## Batch 669e — new keys for the first findings group
Added 20 keys in all six languages (Margin Exception Review history and notices, workstation save and discrepancy messages, STAT flag toasts, the External Consult draft note); removed `auditLog.page.footer` and `auditLog.page.systemsOperational`. Korean needs native review.

## Batch 669d — Help on Configuration
No locale keys changed.

## Batch 669c — About-menu guide items removed
Removed `appShell.aboutModal.userGuide` and `appShell.aboutModal.adminGuide` from all six locale files (the menu items are gone).

## Batch 669b — Guide window layout
No locale keys changed. The User Guide route moved into the shell without the top bar (`SignedInApp.tsx`), with a guard in `userGuide.guard.test.ts`.

## Batch 668 — Help button wording

One text reworded in all six languages: `adminGuide.helpButton.title` no longer says "(opens in a new tab)", because the guide now opens in its own window (a tab only if the browser refuses). The User Guide title is unchanged. The machine-made wording for fr, de, nl, ko and es needs native review like the rest (`docs/quality/TRANSLATION_REVIEW.md`).

## Batch 666 — language review files

No locale keys added. The review workbooks are rebuilt from the live locale files (20,166 keys; 15,898 distinct English texts) for French, German, Dutch, Spanish and, for the first time, Korean (`scripts/translation-review-workbook.py fr,nl,de,es,ko`). `docs/quality/TRANSLATION_REVIEW.md` lists the 112 new and 17 reworded strings since Batch 649; `docs/product/PHRASE_REVIEW_LIST.md` is regenerated from the registry. Nothing has been reviewed by a native speaker; Korean first.

## Batch 665 — new strings

Locale keys added in all six languages: `synopticReportPage.toast.finalisedNoNextCase` and `collaboratorAddedNoMessage`. Machine translated; native review pending. The collaborator message itself is stored data in English (like the review-request message).

## Batch 664 — new strings

Locale keys added in all six languages: `synopticReportPage.toast.collaborator{Added,Already,Ambiguous,Cytotech,NoName,NotFound,NotPermitted,NotSaved}` and `signedOutNoNextCase`; `voiceProvider.status.cancel{Command,Confirm,Discarded,DiscardedKept,Stopped}`; `bottomActionBar.signOut.nextLabel` and `nextTitle`. Voice phrases (registry data) added in the six languages: `ADD_COLLABORATOR`; the "my cases" phrases were removed from `TABLE_CLEAR_FILTER`. All except English are machine translated; Korean needs native-speaker review first (`docs/product/PHRASE_REVIEW_LIST.md`, `docs/quality/TRANSLATION_REVIEW.md`).

## Batch 663 — voice phrases

No locale keys. Voice phrases (registry data, not locale files) added or changed in English, French, German, Dutch, Korean and Spanish: `TABLE_GO_TO_ROW`, `TABLE_OPEN_ACCESSION`, `SHOW_NHS_STATUS` (Batch 662), Collaborating Cases (now collaboration phrases) (Batch 664: the "my cases" phrases were taken off Clear Filter again). All except English are machine translated; Korean needs native-speaker review (`docs/product/PHRASE_REVIEW_LIST.md`).

## Batch 662 — sex at birth and NHS number status

New keys in all six languages: `patientSex.{female,indeterminate,male,notKnown}`, `headerBar.field.nhsNumber`, `nationalIdentifiers.banner.{checkOnly,invalid,statusCode,unchecked,verified}`, `searchPage.genderLabelKey.Indeterminate`, `accessionPage.demographics.sexIndeterminate`. Reworded: `headerBar.field.sex`, `accessionPage.demographics.{sex,sexOther}`, `searchPage.sections.gender`, `searchPage.summaryParts.gender`, `searchPage.csv.sex`, `caseReport.column.sex`, `fieldRequirements.fields.accession.sex` (now "Sex at birth"). Korean needs native-speaker review.

## Batch 661 — sex never defaults

New keys in all six languages: `fieldRequirements.fields.accession.sex`, `accessionPage.demographics.sexUnselected`. Korean needs native-speaker review.

## Batch 660 — Collaborating Cases and the daily accessioning chart

New keys in all six languages: `worklistPage.filterLabel.collaborating`, `benchContributions.accessioning.dailyChartLabel`, `benchContributions.accessioning.dailyBarTitle`. `benchContributions.subtitle` reworded to say which figures are yours and which are laboratory-wide.

## Batch 659 — Fixes from the User Guide findings (6 to 12)

New keys in all six languages: `intraopQueue.specimenCard.{addFrozenLabel,addFrozenSave,addFrozenFailed}`, `intraopQueue.mergeModal.mergeFailed` (intro reworded), `grossingScreen.col.pieceDescription`, `grossingScreen.matrix.title`, `grossingScreen.auditField.pieceDescription`, `a11y.fields.pieceDescription`, `searchPage.summary.reassignPickHint`, `tumorBoard.errors.{batchLocked,presenterNotEligible,notPermitted,saveFailed}`, `capabilities.items.qaManagementReviewSubmit`, `caseActionPermissions.managementReviewSubmit`. Removed: `searchPage.resourcesModal`, `searchPage.resourceSection`, `searchPage.resourceLinks` (replaced by the shared Resources window).

## Batch 658 — Fixes from the User Guide findings

New key in all six languages: `accessionPage.toast.downtimeReasonRequired`. `searchPage.pathologistRole` values corrected (countersigner, delegatedTo, resident, signedOut). `contributionDashboard.subtitleRole` is now only the fallback when the role is unknown.

## Batch 657 — User Guide (context-aware help)

New keys in all six languages under `userGuide.*`: the contents, search, "You are here", Workflow and role labels, previous and next step, related actions, loading and not-found messages, the draft notice and the Help button (`userGuide.helpButton.*`). The guide articles themselves are English only for now; the page says so in the other languages. The Korean, French, German, Dutch and Spanish labels are machine translations and need native-speaker review.

## Batch 656 — Codes window: verified suggestions no longer dropped, unverified count shown

New keys in all six languages: `addCodeModal.aiUnverifiedNote_one` / `_other` (and `_many` in Spanish). Korean wording (and the other machine translations) still need native-speaker review.

## Batch 655 — Decision-list rulings (QA save failure, Delegate result list, intraoperative block, Similar Cases (Demonstration), cookie-only hub, dictionary fingerprint, critical-finding floor)

Locale changes: `delegateModal.partial.*`, `delegateModal.refusals.*`, the Similar Cases (Demonstration) labels, the Intraoperative block labels and the QA "not saved" message, all in the six languages, keys sorted.

## Batch 654 — Release Hold Print Policy (allow, warn, supervisor override, block)

A site setting on System > Release Buffer replaces the on/off "Restrict In-House Hardcopy Printing". Default stays warn and confirm (Pete, Oct 23, 2026). New capability `print:release-hold:override` (high risk; Lab Director, Admin; 339 capabilities, 288 high risk). Both print paths (report view, Orchestration preview) follow the policy; the Assist Print button no longer asks its own confirmation. Keys added in all six locales: `capabilities.items.printReleaseHoldOverride`, `releaseBufferSection.settings.releaseHoldPrintPolicy.*`, `reportPrint.heldBlocked`, `reportPrintPrompt.{supervisorOverrideWarning,overrideReasonLabel,overrideReasonHint}`; removed `releaseBufferSection.settings.restrictHardcopy` and `bottomActionBar.print.confirmRestricted`. Machine translated; native review needed. `importLegacyFile.test.ts` timeouts raised to 120 s (a very slow first import on a loaded machine).

## Batch 653 — A permission check that names a case is judged by the case's own facility

A check that passed only a case id was refused for anyone limited to some facilities ("facility unknown"), even on a case at their own facility. The authorization service now looks up the case's ordering facility (`Case.order.facilityId`) when a check names a case and no facility, and only for a person with a facility assignment. A case that cannot be found, or a failed lookup, still refuses. The change is in `services/authorization/authorizationService.ts` (new `caseFacility` dependency) and `defaultAuthorizationService.ts`; tests in `caseFacility.test.ts`. No screen, string or capability changed. The server is specified to repeat the lookup from its own case record (not built). Appendix A of the patent disclosure and `docs/product/GAP_REGISTER.md` (A.4) are updated.

## Batch 652 — Documentation and consistency audit (labels)

**3 new keys in each of en, fr, de, nl, ko and es** (machine translated; Korean needs native-speaker review): `worklistTable.abnormalDot.codingSuffix`, `worklistTable.abnormalDot.codingSuffixDemo` (TEST- codes on a confirmed finding are labelled "demonstration code"), `governingBodiesSection.versionRow.unverifiedBadge` (retention version whose source note says unverified).

| What | Where |
|---|---|
| Demonstration-code label | `services/abnormalDetection/codingTermText.ts` (+ test), `resolveSyntheticCoding.ts` `isDemonstrationCode`, `WorklistTable.tsx` (2292 to 2290 lines) |
| Unverified retention badge | `services/governingBodies/retentionPlaceholder.ts` (+ test), `GoverningBodiesSection.tsx`, `pathscribe.css` |
| Docs | Superadmin wording, hub token, READMEs, `docs/product/GAP_REGISTER.md` |

**Defect fixes (same batch, Batch 652):** 7 new keys in each of en, fr, de, nl, ko and es (machine translated; Korean needs native-speaker review; rows in `docs/quality/TRANSLATION_REVIEW.md`): `contributionDashboard.peerNotEnoughData`, `delegateModal.refusals.multipleRecipientsNotAllowed`, `delegateModal.refusals.noRecipient`, `externalResourcesSection.errors.insecureUrl`, `externalResourcesSection.insecureLink`, `resourcesModal.insecureLink`, `resourcesModal.insecureLinkTitle`. Code: `pages/contributionDashboardCalculations.ts` (real peer averages), `utils/labels/dispatchScanSlideLabel.ts` and `hooks/useGlobalMaterialScanTracking.ts` (microtome scan prints), `services/delegations/delegateToRecipients.ts` and `pages/Synoptic/Delegate/DelegateModal.tsx` (several recipients), `services/externalResources/externalResourceUrl.ts` (https only), `functions/main.py` (footer barcode solid black). New stylesheets `ExternalResourcesSection.css`, `ResourcesModal.css` (pathscribe.css is over its size baseline, so no lines were added to it). Baselines lowered for `SynopticReportPage.tsx` (7082) and `WorklistPage.tsx` (1312).

**Specimen pipeline (same batch):** no new keys. Two strings reworded in en, fr, de, nl, ko and es (machine translated; Korean needs native-speaker review): `concordanceReviewSettingsSection.autoComparison.label` and `.description` now say "automatic category comparison" and that it is a category match, not an AI result (rows in `docs/quality/TRANSLATION_REVIEW.md`). The pool note on the Grossing screen reuses `useGrossingCompletion.toast.routedToPool`. Code: `services/grossing/triageReleaseGate.ts`, `services/grossing/routeCaseAfterGrossing.ts`, `services/intraop/carryIntraopFindingsToCase.ts`, `services/quality/frozenReconciliationPlan.ts`, `services/cases/poolAssignmentTimeout.ts`, `services/accessioning/linkLockboxReceipt.ts`, `functions/main.py` (repeatable PDF). Details: `docs/product/GUIDE_UPDATES.md`.

**File sizes at the end of Batch 652:** `SynopticReportPage.tsx` 7,081 lines (baseline 7,082), `WorklistTable.tsx` 2,289 (2,290), `mockActionRegistryService.ts` 4,188 (4,189), `mockCaseService.ts` 6,047 (6,048), `AddCodeModal.tsx` 1,190 (1,191). The 7,123 given under Batch 650 was the figure at that batch; later work in the same series lowered it.

## Batch 651 — AI answers checked in code (AI correctness audit)

**4 new keys in each of en, fr, de, nl, ko and es** (machine translated; Korean wording needs native-speaker review): `addCodeModal.opcs4DemoNotApplicable`, `orchestratorSectionEditor.provenance.confidence`, `orchestratorSectionEditor.provenance.unavailable`, `orchestratorSectionEditor.provenance.unverified`. The narrative source line reuses `rightSynopticPanel.fieldRow.aiSourceLabel`. Rows are in `docs/quality/TRANSLATION_REVIEW.md`.

| What | Where |
|---|---|
| One confidence scale (0 to 100), minimum 30, listed options only | `services/aiIntegration/aiSuggestionRules.ts`; used by `PathScribeAIService.suggestSynopticFields`, `generateAiSuggestionsForReport` and the historical extraction |
| AI code suggestions moved out of the modal; real model and provider stored; `CodedEntryAiDetail.confidence` is 0 to 100 | `services/coding/aiCodeSuggestions.ts`, `codedEntry.ts`, `CaseCodingDisplay.tsx` |
| OPCS-4 lookup reads the labelled demonstration list; such codes cannot be applied | `terminologySearch/codeSearchService.ts`, `coding/opcs4Sample.ts` |
| Rule-based mismatch fallback shown (low risk); instruction version on the QA record and audit | `clinical/clinicalMismatchRules.ts`, `clinicalMismatchDecision.ts`, `ClinicalMismatchDecisionForm.tsx` |
| Confidence and verified source quote per narrative section | `orchestrator/narrativeProvenance.ts`, `orchestratorEngine.ts`, `NarrativeProvenanceNote.tsx` |
| Save Draft background template re-check: not built; types and comments corrected (Planned) | `types/case/Case.ts`, `docs/product/KNOWN_GAPS.md` |

File sizes: \`AddCodeModal.tsx\` 1,373 to about 1,190 lines; \`mockCaseService.ts\` 6,049 to 6,047.

## Batch 650 — Voice engine (650a): replace-once dictation, say-it-twice, audit of spoken commands

**4 new keys in each of en, fr, de, nl, ko and es** (all `voiceProvider.status.*`, sorted): `confirmDeclined`, `confirmRepeat`, `confirmTimedOut`, `notAvailableHere`. They are the voice bar's messages when a command that is hard to undo asks to be said twice (`{{text}}` is what was heard, `{{label}}` the command), when it is cancelled or not repeated in time, and when a phrase belongs to another screen. None is in `fr-BE` / `nl-BE`. **Machine translated; fr, de, nl, ko and es need native-speaker review.**

| What | Where |
|---|---|
| Report Draft phrases register (they never did; the registry had no `registerAction`) | `services/voice/reportDraftVoiceActions.ts`, `actionRegistry/transientActions.ts` (`registerTransientActions`), `pages/SynopticReportPage/hooks/useReportDraftVoiceActions.ts`. 20 commands with English, French, German, Dutch, Korean and Castilian Spanish phrases (`docs/product/PHRASE_REVIEW_LIST.md`, Batch 650a) |
| Enter Gross / Micro / Diagnosis reach their section | the hook above + `services/voice/dictationSectionPicker.ts`; `OrchestratorSectionEditor` and `MicroscopicEntryPanel` listen |
| AI refinement replaces, never repeats | `services/voice/dictationSegmentFlow.ts` (one final insert per segment, 2,000 ms budget), `dictationEditorWriter.ts`, `tiptapDictationPort.ts` |
| Correction learning in the report editors | the same writer records on blur through `services/voice/dictationCorrections.ts` (moved out of `VoiceProvider`) |
| Say it twice | `actionRegistry/repeatConfirmationCommands.ts` (6 commands), `services/voice/voiceCommandRunner.ts` |
| One eligibility rule | `actionRegistry/commandEligibility.ts`, used by `getEligibleActions` (keys) and `findActionByTrigger` (voice) |
| Audit | `services/voice/voiceCommandAudit.ts`: events **Voice command executed** / **Voice command refused** (Admin Guide, Audit Log appendix, six languages) |

**Files:** `mockActionRegistryService.ts` 4,197 to 4,188 lines (baseline 4,189 recorded by the guard) and `SynopticReportPage.tsx` 7,171 to 7,123 (baseline 7,124). **Tests:** 59 new in 8 files (`services/voice` 6, `actionRegistry/voiceStationEligibility`, `pages/SynopticReportPage/hooks/useReportDraftVoiceActions`). Type-check clean; the full suite passed at the end of Batches 650 to 652 (see the Batch 652 delivery figures in `docs/quality/evidence/PathScribe-Batch652-xray.json`). Not done: see the Batch 650a rows in `docs/product/KNOWN_GAPS.md`.

## Batch 649 — Safety and access bugs

**60 new keys in each of en, fr, de, nl and ko; 61 in es** (the extra one is the Spanish plural form `useSignOutWorkflow.toast.revisionsNotReleased_many`, equal to `_other`). One key removed in all six (`caseAccessControl.finalize.adminOverride`: the administrative override on signing no longer exists) and one reworded in all six (`caseAccessControl.finalize.notAParticipant`: now "Only an active participant on this case whose participation type can finalize may sign it out."). Keys sorted, same `{{placeholders}}` in every language.

| Group | Keys | What |
|---|---|---|
| `capabilities.items.<id>.label` / `.description` | 34 | The 17 new capabilities (17 labels, 17 descriptions): `surgicalReportSignOut`, `surgicalPreliminaryRelease`, `surgicalAmendmentRelease`, `surgicalCorrectionRelease`, `surgicalAddendumRelease`, `reportReleaseRecall`, `casePoolClaim`, `casePoolPass`, `caseFlagApply`, `caseFlagRemove`, `caseDiagnosisCodeApply`, `caseAccessionCreate`, `caseInformalReviewRequest`, `qaDeficiencyRaise`, `qaDeficiencyEscalate`, `qaDeficiencyContain`, `qaDeficiencyVerify` |
| `caseActionPermissions.*` | 18 | The refusal sentence for each (plus `revisionNone`, added with the Amendment window greying out: shown when the person may release none of an amendment, a correction or an addendum): `signOut`, `preliminaryRelease`, `amendmentRelease`, `correctionRelease`, `addendumRelease`, `recall`, `poolClaim`, `poolPass`, `flagApply`, `flagRemove`, `codeApply`, `accessionCreate`, `reviewRequest`, `deficiencyRaise`, `deficiencyEscalate`, `deficiencyContain`, `deficiencyVerify` |
| `heldReports.refused.notPermitted` | 1 | Recall refused for want of the capability |
| `useSignOutWorkflow.toast.*` | 5 (6 in es) | `countersignFailed`, `signOutNotCompleted`, `signOutNotCompletedStatusKept`, `revisionsNotReleased_one` / `_other` (and `_many` in es) |
| `useAmendmentWorkflow.toast.*` | 2 | `addendumNotSent`, `revisionNotReleased` |

**Belgian French and Belgian Dutch (`fr-BE.json`, `nl-BE.json`) have no entries for any of these and fall back to `fr` and `nl`.** None of the new text uses a word Belgium says differently (no inloggen/uitloggen, achternaam, soixante-dix, quatre-vingt-dix); `localeParity.test.ts` passes.

**fr, de, nl, ko and es are machine translated and need native-speaker review, Belgian French and Belgian Dutch readers included, before a customer sees them.** The sentences a pathologist reads when a sign-out or release is stopped are the priority (`useSignOutWorkflow.toast.*`, `useAmendmentWorkflow.toast.*`, `caseActionPermissions.*`); Korean in particular. The rows are on `docs/quality/TRANSLATION_REVIEW.md` ("Waiting for review: Batch 649"). No voice commands were added (`docs/product/PHRASE_REVIEW_LIST.md` says so).

**What the batch did**
- **Privacy.** Support-ticket screenshots now cover every `[data-phi]` and `[data-pii]` element whatever its value (`services/phiSelectors.ts`, `phi/phiSelectors.guard.test.ts`); the old list of ten per-kind selectors left `diagnosis`, `finding` and `case` visible. The barcode listener ignores keystrokes sent by script (`services/scanner/scanKeyFilter.ts`; `ScannerProvider` prop `acceptUntrustedKeyEvents` is a test seam only).
- **Sign-out.** One gate sequence, `runSignOutReviewGates` (`services/signoutGates/signOutReviewGates.ts`), for Assist Finalize **and** Orchestration Sign Out Case (hold, microscopic documentation, critical findings, required fields, unverified AI; Sign Out Case ran none of the five). Writes in `services/surgicalSignOut/completeSurgicalSignOut.ts`: status first, rolled back if a later step fails. Countersign errors are shown. The signature is linked to the version id, number and PDF SHA-256 for Orchestration, a resident's release and Assist (`completeAssistFinalize.ts`). The amendment release result is checked; the addendum released from the amendment window is now sent (`reports/publishDirectAddendum.ts`); Assist revisions are released before the LIS send (`releaseRevisionsAtSignOut.ts`; a send that fails after an accepted release counts as not transmitted); the cancer registry submission goes with the FINAL after the release delay (`releaseSurgicalFinal.ts`).
- **Permissions.** 17 new capabilities (`services/authorization/workflowCapabilities.ts`, seeds in `capabilitySeeds.ts`), each enforced in its service. The catalog is **338 capabilities, 287 high risk** (321 and 274 before). `admin-override` is removed from `canFinalizeCase`: signing needs the capability **and** being an active participant whose participation type can finalize. **Pete's ruling, Oct 22, 2026: residents do not issue preliminary releases independently; preliminary release is Pathologist and Fellow only, and a hospital's own roles do not get it by default** (`AUTHORIZATION_API.md`).
- **Files split.** `useSignOutWorkflow.ts` 2,377 to 1,813 lines (logic to `signoutGates/` and `surgicalSignOut/`); `QualityAssurancePage.tsx`, `SynopticReportPage.tsx`, `AccessionPage.tsx`, `AddCodeModal.tsx` each a few lines shorter.
- **Docs corrected.** `components/EnhancementRequest/README.md` said the button passes the modal a pre-captured screenshot; the button captures nothing and capture is opt-in inside the modal. `services/phi/README.md` said the redaction was "mostly" `data-phi` attributes. New READMEs: `services/surgicalSignOut/`, `services/scanner/`.

**Disclosed, not fixed** (also in `docs/product/KNOWN_GAPS.md`): other role-name bypasses remain in `macroAccess`, `templatePublishingRules` and `canDraftOrApproveBillingCharge`; most permission checks pass only the case id, so a facility-limited staff member is refused where the case's facility would allow them; corrections released before a later failure are not undone until the server does sign-out in one transaction (planned). The file `AccessionPage.tsx` and the others above remain over 1,000 lines. The header comment in `EnhancementRequestModal.tsx` still repeats the old "pre-captured screenshot" claim (code comment, left alone in this documentation pass).

**Tests.** 14,518 passed, 11 skipped (full suite, 1,723 files plus 4 skipped); type-check clean.

## Batch 648 — Lockbox Drop-Off demonstration seed and product-guide updates

No new UI keys. `services/lockbox/lockboxDemoSeed.ts` and the Lockbox mock store (demo seed, restored by Demo Reset); `docs/product/DEMO_GUIDE.md`, `GUIDE_UPDATES.md` (Batch 645 and 648 entries) and `FEATURE_OVERVIEW.md` (Lockbox Drop-Off section); one sentence added to the Admin Guide's Lockbox Drop-Off section in all six languages (the fr, de, nl, ko and es sentences are machine translated and need native-speaker review).

## Batch 647 — Administrator Guide in six languages, screenshots completed, Help on more screens

No new UI keys. The Administrator Guide is now written in English, French, German, Dutch, Korean and Spanish (`docs/admin-guide/src/<lang>/`, nine chapters and a glossary each). **All five translations are machine made and need native-speaker review before a customer receives them.** On-screen names use the app's own wording from `src/i18n/locales/<lang>.json`; where the app wording was inconsistent, or had no translation, the translator's choice is logged in `docs/admin-guide/open-questions/translation-notes.md`. `scripts/admin-guide/parity.py` refuses a translation that changes a heading id, link, table shape, status word, capability key or placeholder. The screenshots are still of the English interface.

The **Help** button now opens the guide in the user's interface language (`fr-BE` opens French, `nl-BE` opens Dutch, any other language opens English) and also appears, as a floating button, on the screens outside Configuration that have a guide section. All 27 click-opened screenshots are captured by script; none are missing. Rules for translators: `docs/admin-guide/TRANSLATION.md`.

## Batch 646 — Administrator Guide and the Help button

2 new keys in all six languages (en, fr, de, nl, ko, es; sorted; the Belgian files add nothing): `adminGuide.helpButton.label` (Help, Aide, Hilfe, Help, 도움말, Ayuda) and `adminGuide.helpButton.title` ("Open this screen's section of the Administrator Guide (opens in a new tab)"). **All non-English text is machine translated and needs native-speaker review.**

**The guide was English only in this batch.** Batch 647 added fr, de, nl, ko and es, and the Help button now follows the interface language.

## Batch 645 — Lockbox Drop-Off

89 new keys in all six languages (en, fr, de, nl, ko, es; sorted, same `{{placeholders}}`; the Belgian files add nothing because no word differs): `lockboxDropOff.*` (page, tabs, scan, urgent, received, duplicate, placeholder form, `error.<CODE>` for each fixed refusal code, `folder.*` with columns, status, waiting-time formats and the QA `summary.*`), `home.lockboxDropOffTile.{title,description}`, and `capabilities.items.{screenLockboxDropOffOpen,lockboxSpecimenReceive,lockboxFolderReview,lockboxPlaceholderResolve}.{label,description}` (so the four capabilities show in the Role editor under Screens and Case work). Waiting times are messages (`folder.dwell.minutes|hoursMinutes|daysHours`), so each language sets its own unit words; no punctuation is written into the page. Labels sit in `<dt>`/`<dd>` pairs without a colon.

**All non-English text is machine translated and needs native-speaker review** (Korean in particular: 락박스 접수, 접수 번호, 야간 폴더, and the clinical wording). The voice phrases for the five new commands are on `docs/product/PHRASE_REVIEW_LIST.md`; Castilian Spanish phrases are formal (usted).

**Terminology decided for this screen (Pete to confirm):** the product word **Lockbox** stays in every language, with a translated second word for "Drop-Off": Dépôt (fr), Einwurf (de), afgifte (nl), 접수 (ko), Entrega (es). **Overnight folder**: Dossier de nuit, Nachtordner, Nachtmap, 야간 폴더, Carpeta nocturna. **Accession number** follows the existing keys (fr Numéro d'accession, de Eingangsnummer, nl Accessienummer, ko 접수 번호, es Número de acceso); **Ordering facility / client / physician** follow the existing Billing, Clients and Case Report keys. "Placeholder" for the temporary record is Enregistrement provisoire, Platzhalter, tijdelijk record, 임시 기록, Registro provisional (not the text-field "placeholder" wording of the template inspector).

## Batch 615 (part D) — vial and rack labels, CI workflow, right-to-left groundwork (PS-360, PS-471, PS-293)

- **PS-360 vial and rack/batch labels.** `networkPrint.label.vialRack.*` (error reasons, volume, item count, rack kinds) in all five languages. Text printed on a label comes from these keys, in the user's language.
- **PS-293 direction.** `src/i18n/direction.ts` (`directionFor`, `applyDocumentDirection`, `RTL_LANGUAGES`); `config.ts` sets `<html lang dir>` at start-up and on every language change. `SUPPORTED_LANGUAGES` is unchanged: to add a right-to-left language, add its locale file and a menu entry, mark its report-language rules, and have a native speaker review the wording. The stylesheet needs nothing more (logical properties, `logicalCss.guard.test.ts`).
- **PS-471.** `.github/workflows/ci.yml` (see `docs/architecture/DEPLOYMENT_READINESS_REVIEW.md` section 0.5).

## Batch 615 (part C) — Code Manager searches for matched triggers (PS-138)

Two new keys in all five languages: `addCodeModal.triggerHeader` (the label before the matched findings) and `addCodeModal.triggerChipTitle` (the tooltip: "Search SNOMED for “{{query}}”. You choose what is applied."). Native-speaker review of the fr/de/nl/ko text is on `docs/product/PHRASE_REVIEW_LIST.md`.

## Batch 614 (part A) — editor commands, Go to routes

Three new keys in all five languages: `goToPrefix.route` ("Alt+J, then {{key}}", shown under an always-on command's key in Configuration → Actions and beside it in the Role Dictionary action reference), `roleDictionary.cheatsheet.groupAlwaysOn` (the group tag for those commands) and `pathScribeEditor.ruler` (the ruler's accessible name). The 16 text-editor commands' voice phrases (five languages each) are in `mockActionRegistryService.ts`, not in the locale files; fr/de/nl/ko phrases need native review.

## Batch 613 (part A) — case search reporting

157 new keys in all five languages: `searchPage.sections.synopticValues`, `searchPage.synopticValues.*` (the answer filters and their nine conditions), `searchPage.summaryParts.synopticValue.*` (one summary phrase per condition), the `caseReport.*` group (view toggle, group-by names, column names, columns picker, saved reports, export notices, table headings, `schedule.*` including every error code), and two capability labels `capabilities.items.searchCaseReportExport` / `searchReportScheduleManage`. Counts use "Label: {{count}}" wording rather than plural forms. Group names and protocol questions are the organisation's data and are not translated.

## Batch 613 (part B) — related cases and patient summary

51 new keys in all five languages: `relatedCases.errors.*`, `relatedCases.layout.*`, `relatedCases.picker.*`, `relatedCases.signout.*`, `relatedCases.summary.*`, `relatedCases.amended.banner_one/_other`; ten `surgicalReportPdf.*` labels for the report output (`intraopDiagnosis`, `relatedCasesTitle`, `relatedCasesNotice`, `relatedCaseReleased`, `relatedCaseSpecimens`, `relatedCaseDiagnosis`, `relatedCaseSignedBy`, `relatedCaseOrdering`, `relatedCaseCopyTo`, `relatedCaseClient`; these must match `DEFAULT_LABELS` in `functions/main.py`); `capabilities.items.reportRelatedCasesAttach` and `patientSummaryPrint`. Needs native-speaker review in fr, de, nl and ko.

## Batch 613 (part C) — access to a patient's other cases

New keys in all five languages: `patientCaseAccess.*` (the notice, the reason list, approve/decline/revoke, grants, messages, errors, history lines), `accessRequestResponseTab.type.patient_cases`, `accessRequestResponseTab.patientCases.*` (heading, none, revoke dialog), and `capabilities.items.patientOtherCasesRequestAccess` / `patientOtherCasesDecideAccess`. The fr, de, nl and ko text is machine-written and needs native review.

## Batch 613 (part D) — reporting feed

New keys in all five languages: `biFeed.*` (screen, notices, problems, datasets, approval, tokens, form, token panel, pull test, field catalogue), `systemTab.sections.biFeed`, `capabilities.items.configBiFeed*` (three) and `configSearchIndex.entries.sys-bi-feed.description`. Several phrases reuse the Workstations wording. Schema field ids (`case_key`, `mrn`) are not translated.

## Batch 612 (part C) — report font sizes in points (Pete: "7.5 is really too small")

15 new keys in all five languages: `fontUnits.*` (the points and pixel labels, "Prints at", the Convert to points panel and its messages). Changed: `documentStyleSection.fontSizeLabel`, `templateAssemblyPage.fontSizeLabel`, `templateInspector.labelConfig.fontSizeLabel` now say pt; `templateAssemblyPage.styleCategoryDescription` takes a `{{unit}}`.

Font sizes are points. A style or template saved before carries no `units` and is `legacy_px`: it prints as it always did (1 px = 0.75 pt) until an author presses **Convert to points**, which lists each size, keeps the number as points (at least 8) and writes an audit entry. New templates are `fontUnits: 'pt'`; the built-in defaults are body 10, header 11 bold, footer 10 pt. The preview of a template in points is drawn at the paper's real width and side margins in CSS points. The PDF renderers read the same units (`functions/report_layout.py`). New: `services/reportAppearance/{fontUnits,convertToPoints,previewPage}.ts`, `components/Common/{FontSizeField,ConvertToPointsPanel}.tsx`. Shipped test layouts print on the same number of pages at the new defaults as at the old. No new capability: the lab conversion uses `config:report-appearance:manage`.

## Batch 611 (part F) — legacy file import and biometric prompt (#132, #166, #158)

- **Legacy file import:** Migration Jobs gets **Import legacy file** (CSV or JSON, up to 2,000 records, needs `config:migration-mappings:manage`). Each record runs through the saved field mappings and patient matching; a succeeded record becomes a draft case marked *Simulated bulk import*; a second import of the same legacy accession is refused. The file is read in the browser and not kept; the audit entry holds counts and the source system's name only. New strings `migrationImport.*` and `migrationJobs.*` (importButton, simulatedTag, simulatedBanner, allRecords, noRecords, recordOutcome.*, targetCase) in all five languages.
- **Biometric:** the enrolment window and the sign-out panel now say the check is *Simulated*; where the browser has WebAuthn the device's own fingerprint or face prompt is used with a challenge made in the browser (nothing is verified by a server), otherwise the labelled demonstration prompt. A cancelled prompt enrols nothing; a refused check falls back to the password. Audit entries are labelled Simulated and name no one. New strings `profileMenu.biometric.{simulatedBanner,enrolDeclined,promptDevice,promptSimulated}` and `preFinalisationModal.signing.bioSimulated`.

## Batch 611 (part H) — multi-factor sign-in (#157)

54 new keys in all five languages: `login.mfa.*` (the sign-in step: Simulated label and note, enrolment, recovery codes, errors, attempts left), `login.ssoError.mfa_required`, `signerConfirmation.mfaCode/mfaCodePlaceholder/mfaNote` and three `signerConfirmation.error.mfa_*`, `sessionSecurity.mfa.*` (the policy card and the enrolment list), and the capability text `capabilities.items.authMfaEnrolmentReset`. Korean, French, German and Dutch wording needs native-speaker review (rows in `docs/quality/TRANSLATION_REVIEW.md`).

## Batch 611 (part G) — Smart Capture charge suggestions, prototype (#189)

Added `services/smartCapture/` (rules, states, settings, payload, service, wiring), `SmartCaptureLauncher` in the billing review, and `SmartCaptureSection` in Configuration → System. Four capabilities (`billing:smart-capture:review`, `approve`, `send`; `config:smart-capture:manage`; the third is `send`, not `export`, so it is not an export kind under `ASYNC_EXPORT_API.md`). New `smartCapture.*` strings in all five languages (fr/de/nl/ko need native-speaker review before clinical use), `systemTab.sections.smartCapture` and one search-index description. Storage keys `smartCaptureSettings` and `smartCaptureRecords` are reset by the demo reset. See `docs/product/SMART_CAPTURE.md`.

## Batch 611 (part E) — simulated export server, matrix block comments, retention custody history (#194, #10, #59)

10 new keys in all five languages: `materialComments.*` (5), `myExports.simulatedBadge/simulatedNote/longToggle`, `exports.notice.simulatedBadge`, `synopticReportPage.autopsy.retentionDetail.historyTitle`. Korean, French, German and Dutch wording needs native-speaker review.

## Batch 610 (part B) — performance targets, client service levels, jurisdiction overview (#87, #164, #163)

131 new keys in all five languages: `performanceTargetsSection.*`, `clientSlaSection.*`, `jurisdictionOverviewSection.*`, `performanceTargetsTile.*`, `clientSlaPanel.*`, `worklistTable.slaBreach.*`, `systemTab.sections.performanceTargets|clientSla|jurisdictionOverview` and the three `configSearchIndex.entries.sys-*` descriptions. Plurals use `_one`/`_other` (`rolesOffered`, `ai.facilityRules`). Machine translations; Korean clinical wording needs native-speaker review.

## Batch 610 (part D) — tumor board criteria rules, AI discordance, spoken delegation types (#71, #78, #83)

60 new keys in all five languages: `tumorBoardRulesSection.criteria.*` and related (29), the AI Discordance tab (30) and `delegateModal.refusals.presetUnavailable`. Native-speaker review is still outstanding.

## Batch 610 (part A) — autopsy turnaround, dashboards, frozen section targets (#60, #61, #87, #88, #89)

91 new keys in all five languages: `autopsyDashboard.*`, `autopsyTat.*`, `tatConfigSection.types.autopsyPad|autopsyFad`, `tatConfigSection.modal.warningMinutes*` and `errorWarningInvalid`, `tatConfigSection.warnMinutesShort`, `intraopQueue.specimenCard.urgency*`, `qualityComplianceHub.autopsyDashboardsTile`, and the `screen:autopsy-dashboards:open` capability text. Machine translations; Korean clinical wording needs native-speaker review.

## Batch 609 (part A) — report PDF renderer, images in report PDFs (#35, #127, #44)

New keys in all five languages: `reportImages.*` (the Attach images screen: title, link, type, caption, Add, problems, the "PathScribe does not store images" note), `bottomActionBar.attachImages.*` and `cytologyScreening.attachImagesBtn` / `attachImagesTitle` (the buttons). Machine translations; the clinical wording should get native-speaker review.

## Batch 609 (part B) — mismatch check after sign-out, Final Diagnosis rule, template audit, Upload Protocol check (#31, #38, #39)

New keys in all five languages: `clinicalMismatch.alert.releaseNotHeld`, `clinicalMismatchRulesSection.revision.*`, `templateAssemblyPage.finalDiagnosisTooMany`, `partBuilderPage.finalDiagnosisTooMany`, `protocolShared.uploadModal.importButton`, `protocolShared.uploadModal.check.*` (including one sentence per upload finding code). `protocolShared.uploadModal.warningBody` reworded (an imported protocol is a draft). Machine translations; the clinical wording should get native-speaker review.

## Batch 609 (part C) — AI model settings, dictation spelling and languages, German/French/Dutch medical word lists (#173, #177, #179, #180)

- **Model settings:** `modelsTab.overrides.*` (button, badge, window, help text, errors); `configOverrides.maxTokens` and `thresholdOverrides.confidenceThreshold` on the adoption, validated in `services/models/modelOverrides.ts`, read by `callAi` and `resolveConfidenceThresholdForClient`.
- **Voice:** `voiceSection.englishFuzzy.*` and `voiceSection.promptReview.*`; `SystemConfig.voiceEnglishFuzzyFallback` (default on), checked with `config:voice:manage`.
- **Prompts:** `services/voice/dictationRefinementPrompt.ts` builds the AI refinement instructions per language and English spelling. The prompt text itself is an instruction to the AI, shown as data on the Voice page, not translated.
- **Strings:** fr, de, nl, ko are machine translations; Korean needs native-speaker review. The new non-English prompt wording and the German, French and Dutch word lists (`spellcheck-data/{de,fr,nl}/pathology.dic.txt`) need native-speaker review too.

## Batch 603 — Break-glass permission, QA export without MRN, terminology written down, wall displays (Pete and dev review, Oct 17, 2026)

- **Break-glass:** `patient:break-glass:rebind` (high risk, Admin by default) is checked in `patientIndexService.breakGlassRebind()` and gates the Audit Log button. The reason code and written justification rules are unchanged. Text in all five languages.
- **QA export:** the cytology-histology correlation download no longer has a Patient MRN column (`cytologyHistologyCorrelationCsvRows`); the accession numbers pair the cases.
- **Strings:** `capabilities.items.patientBreakGlassRebind.*`. fr, de, nl, ko are machine translations; Korean needs native-speaker review.

## Terminology decisions (as implemented in the code, written down Oct 17, 2026; Pete to confirm)

CLAUDE.md pointed here for these, but the section did not exist. This is what the code and locale files do today, not new rules.

**Microtome (Pete, Oct 29, 2026)**
- English text says **Microtome** (the bench, the tile, the screen, the workflow stage "Microtome / Sectioning"), never "Microtomy". Stored values, routes, capability keys and locale keys keep the old spelling so saved data and links keep working. Other languages keep their own words.

**Medical record number (MRN) label**
- English: "MRN".
- French: **IPP** (Identifiant Permanent du Patient) on the patient-facing label, the search placeholder, the "IPP match" and grid columns (`fr.json`: `mrn` keys, `mrnMatch`, `gridMrn`). A few generic places say "Identifiant patient".
- German: "Patientennr." / "Patientennummer (MRN)". Dutch: "Patiëntnr." / "Patiëntnummer (MRN)". Korean: "MRN", "등록번호(MRN)" or "환자번호". The stored field is `mrn` in every language; only the label changes.

**Percentage-point wording** (`cytologyQaTab.hpvPositivityTable.percentagePoints`, plural keys): English "pp"; French "point(s) de pourcentage"; German "Prozentpunkt(e)"; Dutch "procentpunt(en)"; Korean "퍼센트포인트".

**Titles (honorifics)** (`common.honorifics.*`): the stored value is always the English prefix (Mr., Mrs., Ms., Mx., Dr., Sir, Dame); only the label in the picker is translated.
- **The Ms. qualifier:** where a language has no separate word for Ms., the picker shows the local title with "(Ms.)" so the choice stays visible: French "Mme (Ms)", German "Frau (Ms.)", Dutch "Mevr. (Ms.)", Korean "님 (Ms.)". Mrs. shows the local title alone.

**Korean names** (`utils/personName.ts`, `formatDisplayNameForLanguage`, Batch 514): a Korean screen shows the full name plus **님** (김민준 님), or **선생님** for a doctor or professor (stored prefix Dr or Prof). Western titles are not shown. A Hangul name is written family name first with no space; other names keep given-then-family order. The stored prefix is unchanged, and English documents still print it. Every other language shows "Dr. Juan García López".

**Not found in the code:** any written rule for other terminology choices. Add them here when decided.


## Batch 602 — Screen-wins hotkeys and voice; Go to prefix (Pete, Oct 17, 2026)

New keys `goToPrefix.title` and `goToPrefix.hint` in en, fr, de, nl, ko (fr "Aller à", de "Gehe zu", nl "Ga naar", ko "이동"). Nine duplicate voice phrases removed from fr/de/nl/ko/en. The fr/de/nl/ko text needs native-speaker review.

## Batch 601 — Every voice and hotkey command in the Role Dictionary; hotkey clash guard (Pete, Oct 17, 2026)

- **What changed:** the 89 commands that only open, filter, move, select or cancel are now in the Role Dictionary (six new groups), so all 245 voice and shortcut commands can be granted or withheld by a role. Default grants: case-screen roles get all 89; Admin, Lab Director and QA Reviewer get going-to and searching; Physician, Or Staff and template roles none. Existing sites are offered them once (`Role.seededActions`).
- **Guard (`actionsCoverage.guard.test.ts`):** every voice command is in the roles list; each has a hotkey and phrases in five languages; the 98 permission-only entries are listed; 67 known hotkey clashes are listed and can only shrink.
- **Found, not fixed:** 67 pairs of commands share a hotkey while active on the same screen (mostly always-on intraoperative and System commands). Needs Pete's approval of a rule before default hotkeys change (`docs/product/ACTIONS_COVERAGE.md`).
- **Not changed:** capabilities, text, locale keys. Voice for the 98 permission-only entries needs handlers on their screens first.

## Batch 600 — Role Dictionary: 60 more commands, default grants for every built-in role (Pete, Oct 16, 2026)

- **What changed:** the Role Dictionary gains seven groups (Report Workflow, Case Handling, Orders & Printing, Intraoperative, Cytology Screening, Workstations, Result Dispatch) with the 60 record-changing voice and shortcut commands that had no entry (Batch 599). Each keeps its existing key, and `mockActionRegistryService.ts` now reads it from the roles list (`ACTION_MAP`), so the two lists cannot drift.
- **Default grants:** `constants/defaultActionGrants.ts`. Customers start from these and change them. Pathologist, Fellow, Resident, PA, Accessioner, Histotechnologist, Cytotechnologist, Molecular Technologist, Admin and Lab Director get the commands their job uses; Superadmin gets all; Physician, Or Staff, QA Reviewer and the template roles get none. The matrix is in `docs/product/ACTIONS_COVERAGE.md` and needs Pete's review.
- **Existing sites:** `services/roles/actionSeeds.ts` offers each built-in role the new commands once (`Role.seededActions`); a removal by an administrator sticks; custom roles and copies are not touched.
- **Not changed:** capabilities (what a person may actually do is still decided in the services), text, locale keys. Command labels are catalogue data and stay as the other commands are.
- **Tests:** `actionSeeds.test.ts` (10), `actionsCoverage.guard.test.ts` (now: every command is in the roles list or view-only).

## Batch 599 — Actions list accounting (Pete, Oct 16, 2026)

- **What changed:** no behaviour. New `actionRegistry/actionsCoverage.guard.test.ts` and `docs/product/ACTIONS_COVERAGE.md`. Of 245 voice and shortcut actions, 96 are in the roles list; of the other 149, 89 change nothing and 60 change records and cannot yet be granted by a role.
- **Decision for Pete:** whether, and with what defaults, to add those 60 to the Role Dictionary.
- **Not changed:** roles, defaults, capabilities, text, locale keys.

## Batch 598 — Held-back CSS classes checked (PS-520, Pete, Oct 16, 2026)

- **What changed:** documentation only. The 517 CSS classes that code builds from a name prefix or suffix were checked one by one against the values that build them; all are live, none removed. `KNOWN_GAPS.md` marks PS-520 done.

## Batch 597 — Unused CSS, the rest (PS-520, Pete, Oct 16, 2026)

- **What changed:** all 530 remaining unreferenced classes (608 rules) removed from `pathscribe.css`, plus 4 unused animations; 30,494 → 28,146 lines. Where a selector list had a dead member, only that member went. The audit tool gained suffix detection, library-class exemption and `--remove-all`; the guard now requires zero unreferenced classes.
- **Not changed:** no component, no text, no locale keys.
- **Kept:** 517 classes whose names code builds from a prefix or suffix (not provable dead by text search).
- **Please check by eye:** Case Team window, template request window, Patient History (Batch 596) and a few busy screens (worklist, Config, report editor); a removed class can't be proven harmless by reading code.

## Batch 596 — Unused CSS, first slice (PS-520, Pete, Oct 16, 2026)

- **What changed:** 146 unreferenced classes (167 rules) removed from `pathscribe.css`: the old `ps-team-`, `ps-tmpl-`, `ps-part-`, `ps-osn-` and `ps-hist-` families, and the `rp-spin` animation. The diff only removes lines. New `scripts/css-unused-audit.mjs` (audit and `--remove`) and `styleRules/unusedCss.guard.test.ts` (the unreferenced count can only go down: 718 → 572).
- **Why these:** no class with these prefixes appears anywhere in `src/`, `e2e/` or `index.html`, and each live component was rewritten with a newer prefix (`ps-ctm-`, `trm-`, `ps-plib-`, `ps-ph-`; the Orchestrator panel went in Batch 517).
- **Not changed:** no component, no text, no locale keys. The production build passes.
- **Open (PS-520):** 572 unreferenced classes in other families and 486 held back because code builds their names from a prefix; one family per batch. `PS-294` (duplicate rules) is done (Batches 436, 517).

## Batch 595 — Code Systems setting (Pete, Oct 16, 2026)

- **What changed:** Configuration → System → Code Systems (`CodeSystemsSection.tsx`): per jurisdiction, each code system off / optional / required from a date. New `codeSystemPolicyService` (list, save, reset, policyFor, served), capability `config:code-systems:manage` (Admin and Lab Director; audited `CODE_SYSTEM_POLICY_CHANGED`), search entry repointed, sidebar entry. 36 new tests.
- **Text:** `codeSystemsSection.*`, `systemTab.sections.codeSystems`, the capability text and the search description, in all five languages. **Machine-translated fr / de / nl / ko: needs native-speaker review** (Korean first), with the earlier batches.
- **Not wired in:** nothing reads the policy yet; the screen says so. Next: the Add Code window, sign-out and outbound messages (shared files; wait for the India team's list).
- **Edited shared files (small):** `services/index.ts` (exports), `capabilityCatalog.ts`, `configSectionAccess.ts`, `systemSections.ts`, `System/index.tsx`, `configSearchIndex.ts`, the five locale files.

## Batch 594 — One code shape for ICD-10, ICD-11, ICD-O and SNOMED CT (Pete, Oct 16, 2026)

- **What changed:** new `src/services/coding/`: `CodedEntry` (system, release, code, source, AI detail), a per-jurisdiction policy (role off / optional / required, with start dates), and an adapter that reads and writes a case's older `CaseCoding` fields. 16 tests, plus a purity guard. Design: `docs/architecture/DIAGNOSIS_CODING.md`.
- **Not wired in:** no existing file was edited, so nothing can clash with the India team's changes. No screens, no locale keys.
- **Source:** Pete's ICD-11 transition requirement: both ICD-10 and ICD-11 during the move, and the AI already suggests codes in the Add Code window, so each code records whether it was typed, mapped, AI-suggested or rule-based.
- **Open:** wiring into the Add Code window, sign-out and outbound messages; the Config screen; the terminology server and licences (see `docs/product/KNOWN_GAPS.md`).

## Batch 593 — Jurisdiction setup chapter and known-gaps tracker (PS-334, PS-338, Pete, Oct 16, 2026)

- **What changed:** documentation only: `docs/product/ADMIN_GUIDE_JURISDICTIONS.md` and `docs/product/KNOWN_GAPS.md`, with `GUIDE_UPDATES.md`, `docs/product/README.md` and `GETTING_STARTED.md` updated. No code, no locale keys.
- **Found:** there is no single region screen; a facility gets its Jurisdiction on the General tab of Facility Configuration, and the country rules live on separate System screens. The search entry `sys-jurisdiction` promises a SNOMED CT release / ICD variant setting that has no screen; it is left out of the chapter and listed as a decision.

## Batch 592 — Shared HTTP client for the API server (PS-481, Pete, Oct 16, 2026)

- **What changed:** `services/apiServer/apiHttpClient.ts`: one client for calls to the API server (token, `ServiceResult` results, fixed failure codes, 30-second time-out, no server message text) and `selectByConfiguration` (server version when an address is configured, mock otherwise). 19 tests.
- **Found:** the app already picks mock or server per service from the API address (`apiServerUrl`); `IS_MOCK_BACKEND` is only the demo-tools flag. The remaining work for PS-481 is moving each service onto the client as its HTTP version is written (PS-482 onward).
- **No change to screens or text;** no locale keys.

## Batch 589 — Nine app bugs fixed from the "found and not fixed" list (Pete, Oct 16, 2026)

- **Pete's decisions (spreadsheet, Oct 16):** all nine approved. Print a blank when a label has no patient; the Confirm Field shortcut works inside text fields; the highlight disappears when the flagged words are gone; demo data of 5 cases (3 minor, 2 major) across 3 pathologists; self-signed certificate per customer, with a visible failure message and an IT guide for QZ Tray.
- **PS-344 / PS-477:** audit and error entries get unique ids (`services/auditlog/auditIds.ts`, `crypto.randomUUID` with a fallback), no longer `'al-' + Date.now()`. For the server, the database should also enforce uniqueness with a key (dev team).
- **PS-55:** `dispatchZplLabel.ts` opens the QZ Tray connection before printing (the app never did, so every QZ print failed with "Not connected"). When a label meant for the hardware printer falls back to the browser print window, a warning toast says so (`utils/labels/labelBridgeNotice.ts`, `useLabelBridgeNotice`). IT guide: `docs/product/QZ_TRAY_CERTIFICATE_GUIDE.md`. Signing requests with the certificate waits on the server (phase 2e).
- **PS-478:** `labelPatientName` in `buildRequisitionLabelData.ts` reads `givenNames`/`familyNames` and also `firstName`/`lastName` and `first_name`/`last_name`; a missing patient or name prints blank, never "Patient undefined undefined".
- **PS-66:** the Confirm Field shortcut sent `PATHSCRIBE_CONFIRM_FIELD`, which nothing listened for. `RightSynopticPanel` now confirms the field last clicked or typed in (`utils/synopticConfirmField.ts`). The shortcut already worked inside text fields (modifier keys).
- **PS-262:** `resolveStaffByQuickAuthPin` identifies the OR Staff role by its id (`or-staff`) and also accepts the role name the Staff screen stores (`staffHasRole`). The Staff screen keeps storing role names, as everywhere else in the app; moving every staff record to ids was not done.
- **PS-323:** (1) the critical-finding check also reads the Microscopic Description typed for each specimen (`services/clinical/narrativeForDetection.ts`); (2) Report Draft sections are matched by their stable part id (`std_body_gross`, `std_body_microscopic`, `std_body_ancillary`), not the random section id (`narrativeFieldForSection(id, sourcePartId)`, `orchestratorNarrativeText`); (3) flagged findings are kept per case (`services/clinical/criticalFindingStore.ts`, storage key `critical_findings_by_case_v1`, registered in the demo reset) so the highlight is still there after reopening. The highlight still disappears once the flagged words are gone.
- **PS-245:** the Label Designer canvas border sits outside the label size (`box-sizing: content-box` on `.ps-designer-canvas`), drops are measured from inside the border, and the Inspector number boxes re-sync after a value is clamped back to the same number.
- **PS-472:** the recovery screen on a case report page now shows the nav bar (`ErrorBoundary` `onErrorChange`, `AppShell`). A development build no longer logs a crash twice: the "Uncaught Error:" re-throw is matched to the crash a boundary already logged (`shadowKeyOf`).
- **PS-147:** demo discordance data (`services/quality/demoDiscordanceSeed.ts`): 5 post-sign-out peer reviews (3 minor, 2 major) across Pete Nimmo, Paul Carter and Oliver Pemberton, with the two CAPA recommendations the major ones raise. The QA activity record seed is now 181 records. Five cases are too few to trip the pattern rule (20 reviews, 3 majors), so the pattern tile still shows none; the peer review sign-offs and CAPA queue are what this data shows.
- **Strings:** one new key, `synopticReportPage.toast.labelPrinterNotConnected` (fr, de, nl, ko are machine translations; Korean needs native-speaker review).
- **Tests:** 46 new tests across 13 files; the review specs for PS-55, 66, 245, 262, 323, 344, 472, 477 and 478 no longer mark these bugs as known failures. Specs: 9 of 10 pass; ps-147 keeps one expected failure.
- **Tests (Jira):** PS-749 (automated), PS-750 (verification gap)
- **Not run:** the independent review agent.

## Batch 588 — Deleting a block in process (Pete, Oct 16, 2026)

- **Pete's decisions:** (1) no automatic addendum or amendment after a signed-out delete; (2) each facility chooses which roles may delete, through grants; (3) the billing credit is for billing staff to decide, never automatic; (4) no messages, e-mails or reminders; (5) billing reviews in the **existing Billing deficiencies tab** (Quality Assurance → Financials), not a new queue ("this can't be the first one"). First step: the in-process delete.
- **Built:** `BlockStatus` gains `Deleted` and `HistologyBlock.deletion`. `services/material/blockDeletion.ts` (pure: the reason list, `blockDeletionInputMissing`, `caseBlockDeletionRefusal`, the soft-delete change) and `deleteBlockInProcess.ts` (needs `material:block:delete-in-process` for the case's facility; saves the soft delete through the report page's own version tracking; raises one billing deficiency; audits). New deficiency type `BLOCK_DELETED` (trigger `BLOCK_DELETION`, detail in `BillingDeficiencyRecord.blockDeleted`: block id, specimen id, reason, released codes, who, when). One new capability, `material:block:delete-in-process` (same default roles as material disposal; each facility changes it in its role grants).
- **Screen:** the block and stain editor shows **Delete this block** (new `DeleteBlockControl.tsx`): a reason list with the first reason pre-selected, an optional note (required for Other), Delete block / Never mind. Not shown once the case is signed out. A deleted block shows its record (reason, who, when, codes released).
- **Strings:** `deleted` in the six block-status label groups; `blockDeletion.reasons`, `.control`, `.toast`, `.errors`; the capability's label and description; `qualityAssurance.deficiencyType.blockDeleted`. French, German, Dutch and Korean are machine translations (Korean needs native-speaker review); rows added to `docs/quality/TRANSLATION_REVIEW.md`.
- **Tests:** `deleteBlockInProcess.test.ts` (13) and `DeleteBlockControl.test.tsx` (5). The permission-seed tests list the new capability.
- **Reworked during the batch:** a first version added a separate billing credit queue, a second permission (`billing:block-deletion:review`) and a storage key. Pete pointed out billing is already reviewed in Financials, so all three were removed before delivery.
- **Not built yet:** deleting after sign-out and the amended-report flag (tiers 2 and 3). Server contract: `docs/architecture/BLOCK_DELETION_API.md`.
- **Tests (Jira):** PS-743 (automated) and PS-744 (verification gap).
- **Also:** `e2e/review/ps-100.toast-persistence.spec.ts` now waits up to 90 s for the first report on a cold dev server (it failed for Pete at 15 s).

## Batch 587 — Review tests for the "Can automate" tickets, first six (Pete, Oct 16, 2026)

- **Review tests** (`e2e/review/`): PS-73 (duplicate a facility), PS-89 (code import with one bad date), PS-146 (revision reasons and CAPA), PS-327 (the signing-authority unit tests), PS-341 (country signing rules) and PS-470 (lint settings and the explicit-any ratchet). Chromium against the demo: 7 passed.
- **PS-89 note:** the file needs a Level for each row; the test sets "Level when not in file" to Specimen. PS-73 note: the copy is named "{{name}} (Copy)" (the ticket's "Copy of …" is out of date) and needs an Email and a unique assigning authority.
- **PS-470 step 1 (lint):** the review specs are clean. The full lint still reports 3 errors in `src/services/serverJobs/serverJobsContract.ts` (`{}` used as a type; file dated Oct 13, not touched here). Carried forward.
- **Not done in this batch:** PS-261, PS-273, PS-493 (no spec yet, Batch 588); PS-146 steps 3 to 6, PS-327 steps 1 to 6, PS-341 steps 4 to 7, PS-73 steps 4 to 9, PS-89 steps 5 to 7. The independent review agent was not run (usage).
- **Tests (Jira):** PS-735 (PS-73, 89, 146) and PS-736 (PS-327, 341, 470), both automated and verification gap.



## Batch 586 — Review tests for the "Mixed" tickets, last four (Pete, Oct 16, 2026)

- **Review tests** (`e2e/review/`): PS-63 (Template Review settings and the admin guide), PS-277 (facility and department report-branding settings), PS-283 (the restricted-printing flag) and PS-342 (medical spell check). Chromium against the demo: 6 passed. Every "Mixed" ticket now has a spec; only the steps a computer can check are covered.
- **Left with a person (see PS-734):** PS-63 steps 2 to 5 and 7 to 8 (non-author read-only banner, granting Template Author, Save Draft and Submit, the self-approval refusal message, the 80% SNOMED bar) and the clarity of the admin guide; PS-277 steps 3 to 5 and PS-283 steps 1 to 3 (printed and PDF layout, watermark, barcode, revision flag: needs `render_report`, not deployed); PS-283 steps 4, 6, 7 (apply the flag, print as a Lab Director versus a pathologist, Print Queue permissions); PS-342 step 6 (plain text boxes, Staff spelling language) and step 7 (national dictionaries, native review).
- **PS-277 note:** the ticket says to edit Metro General, but the director, CLIA / ISO number and logo fields appear only for a facility with the Performing Lab role, which Metro General Hospital doesn't have in the demo. The test uses Fenwick General Hospital. The ticket text should say so.
- **Tests (Jira):** PS-733 (automated) and PS-734 (verification gap).

## Batch 585 — Review tests for the "Mixed" tickets, first five (Pete, Oct 16, 2026)

- **Review tests** (`e2e/review/`): PS-60 (sign-in page and SSO), PS-269 (no English screen text in Korean and French), PS-292 (Release as Preliminary and the delivery rules), PS-474 (security headers for every host) and PS-475 (one language file at a time). Chromium against the demo: 13 passed, 1 skipped (PS-60 step 3 needs `PS_DEMO_PASSWORD`, which the workspace doesn't have, so that step is written but has never run).
- **Only the parts a computer can check.** PS-60: the real SSO sign-in, the signing popup and the Sign Out dialog with the demo password stay with a person. PS-269: Scan Stations, the Validation Studies report, Korean physician names and clinical wording stay with a person. PS-292: the autopsy PAD release (step 5) is not covered yet. PS-474: the response headers on real hosts. PS-475: the built app's network and the hospital network.
- **PS-292 note:** the demo's Worklist cases are all LIS "Assist" cases (no Release as Preliminary button); the one native, not-yet-final surgical case is O26-0001, found through the header search. The ticket's example cases S26-4631 and S26-4623 are Assist or absent, so "a closed case has no button" passes for that reason too.
- **Not done in this batch:** PS-63, PS-277, PS-283 and PS-342 (the other four "Mixed" tickets) have no spec yet; they move to Batch 586. The independent review agent was not run (usage).
- **Dev note (Oct 16):** `render_report` is not deployed (HTTP 404) and `VITE_REPORT_PDF_ENDPOINT` is not set in Vercel, so report PDFs print from the screen; the PDF steps of PS-277 and PS-283 wait for that. The dev team added the new Vercel URL to the CORS list and restored the `functions` block in `firebase.json`.
- **Tests (Jira):** PS-731 (automated) and PS-732 (verification gap).

## Batch 584 — Review tests, second ten (Pete, Oct 15, 2026)

- **Review tests** (`e2e/review/`): PS-55 (QZ Tray label printing), PS-58 (model store tenant scoping), PS-87 (Assist: inbound data from the external LIS), PS-262 (OR board sync between windows), PS-278 (print destination routing), PS-279 (print queue dashboard), PS-323 (finding highlight), PS-344 (editor and navigation after the dependency upgrades), PS-473 (HTML sanitising), PS-478 (strict type-check fixes). With Batches 581 to 583, 34 In Review tickets have a review test.
- **PS-473:** the sanitising checks pass: script and img-onerror payloads in case comments, specimen comments and an AI-written report section are inert, with a `dialog` listener that fails the test if any dialog opens; a Label Designer barcode renders as an SVG.
- **Real app bugs the review tests found, left unfixed for Pete's decision** (each test is marked as a known bug, so the run stays green and it flips to a failure the day the bug is fixed):
  1. **Audit entry ids collide** (`mockAuditService.ts`: id is `'al-' + Date.now()`): two entries in the same millisecond share an id, so System Logs logs React duplicate-key errors (36 to 70 per visit; PS-344 step 5; sometimes PS-477).
  2. **QZ Tray is never connected** (`connectToQzTray()` is only called by tests): cassette and matrix labels fail with "Not connected to QZ Tray"; the decant container label hides the failure and opens a browser print window (PS-55 steps 3 to 4b). The QZ messages are English-only.
  3. **Container label reads "Patient undefined undefined"** (`buildRequisitionLabelData` reads `givenNames` / `familyNames`; the demo LIS cases have `firstName` / `lastName`) (PS-478 step 4).
  4. **Confirm Field (Ctrl+Alt+Shift+A) does nothing**: it sends `PATHSCRIBE_CONFIRM_FIELD` and nothing listens (PS-66 step 4).
  5. **An OR PIN set up on the Staff screen is always refused**: the screen stores the role name "Or Staff", the PIN lookup checks the role id `or-staff`, so nobody set up on screen can dismiss a case or log a verbal report (PS-262 step 3).
  6. **Typed narrative isn't checked for critical findings** (PS-323): only the case's LIS narrative is read; Report Draft section ids are random, so they never match; and a highlight is lost on reopening until Finalize is pressed again.
  7. **Label Designer** (PS-245): the Inspector keeps a typed Width that wasn't applied (`MmInput` re-syncs only when the stored value changes), and the canvas is drawn 1 px (0.5 mm) smaller than the label.
  8. **Error boundaries** (PS-472): after a route crash on the case report the nav bar is gone (AppShell hides it there, the page draws its own); in a dev build each route and synoptic-panel crash is logged twice; the panel recovery boxes carry no "unsaved changes may be lost" wording.
  9. **Demo data**: no discordance pattern is seeded, so the Discordance Patterns tile is empty (PS-147 step 4); a saved Report Draft shows "Not yet generated" after a reload because the demo template gives its sections new ids on every load; an O26 case shows no "Someone else saved" notice.
  10. **Smaller**: the QA Configuration Center edit dialog still labels its editable field list "Review Fields (from Duplicate — read-only here)" (PS-125); print-job audit events show the user as "PATH-001"; the Print Queue status filter has no "Sent to printer"; bulk Hold skips printed or cancelled jobs silently (PS-279); with the AI unreachable, Assist's Latest poll still says "AI draft prepared" with zero drafts (PS-87); Manchester Royal Infirmary, Wythenshawe and North Manchester General appear twice in the print routing Test panel's facility lists (PS-278); "Alt+." / "Alt+," / "Alt+V" are also bound to System and Navigation actions (PS-66).
- **Where the demo or the screens differ from the tickets' steps:** PS-55 needs a GS1 GTIN, a Container Label Printer Profile and a picked scan station, none set in the demo (the test sets them); the model screen is "Model Versions" under AI Behavior (PS-58); PS-278's "same facility" is ambiguous (a Location rule isn't tied to a facility), so the test uses Ward 3 at Desert Valley; PS-279's Report type and Delivery mode show raw codes; PS-344: the Audit Log is "System Logs" and case addresses use the support reference; PS-262: the Intraop Queue is "Intraoperative Entries"; the other window cleared in about 110 ms (asserted under 1.5 s); PS-323: no single case offers both Finalize (S26 cases) and a Report Draft (O26 cases).
- **Tests (Jira):** PS-729 (automated) and PS-730 (verification gap), filled in below.

## Batch 583 — Template e-mails are the server's job; three small fixes; review tests, first ten (Pete, Oct 15, 2026)

- **Dev review recorded** (Pete and the dev team): e-mail recipients, delivery and language (`docs/architecture/TEMPLATE_NOTIFICATIONS_API.md`); no single sign-on group mapping in the first release, user accounts sync first, bench roles only when mapping arrives (`docs/architecture/AUTHENTICATION_OIDC.md`); the server holds the sign-in tokens and the browser never carries a JWT; Azure SignalR Service for shared SaaS, a Redis backplane for private cloud (`docs/architecture/LIVE_UPDATES_SIGNALR.md`, a deployment matrix). The group-mapping wording in this file (Batch 579) and in `services/roles/README.md` is corrected: single sign-on has existed since Batches 343 to 345; mapping waits for these decisions and the server.
- **PS-63 e-mails** (`services/communications/`): the browser sends only the event (`POST /api/notifications/template-events`, `templateLifecycleEvent.ts`) and no longer looks up staff e-mail lists (any signed-in browser could read every Admin's address; it also asked for a "clinical_lead" role PathScribe doesn't have) or writes the e-mail text. The server chooses the recipients, writes each e-mail in the recipient's language and sends it. `recipientResolver.ts` and `emailTemplates/synopticEmailTemplates.ts` are deleted (`DELETED_FILES.txt`). Nothing is sent until the server exists (phase 2e).
- **PS-128:** choosing "Discard changes" after a click outside (or Escape) in a Configuration dialog now closes the dialog; it used to forget the edits and leave the dialog open. One shared fix for every Configuration dialog (`configDirtyRegistry.ts`: `pickDismissControl`, `discardDialogEdits`; `useConfigEditTracking.ts`).
- **PS-101:** a case opened from Search shows "Home › Search › Case Report" and Back goes to Search (it said "Worklist"). `utils/search/caseReturnTarget.ts`.
- **Billing after sign-out:** adding, removing or applying a block's code at specimen level on a signed-out case now asks for the same reason as the case-level change and records it in the audit entry (`services/billing/postSignoutBillingReason.ts`, one decision for the case-level save, the report page and the shared billing review). Cancel changes nothing. The reason's comment is required, as at case level (the field requirements lock it); the plan's "optional note" is therefore not met. A removal with no charge on file used to drop the reason from its audit entry; it keeps it now. Not changed: deleting a block-level applied code after sign-out still credits without asking.
- **Strings (4 keys × 5 languages):** `headerBar.breadcrumb.search`, `headerBar.nav.backToSearchTooltip`, `postSignoutBillingChangeModal.summaryCodeAdded`, `postSignoutBillingChangeModal.summaryCodeRemoved`.
- **Review tests, first ten** (`e2e/review/`): PS-66 (action registry), PS-78 (messages drawer styling), PS-124 (FPPE assignments), PS-125 (QA field-schema editor), PS-147 (discordance patterns), PS-245 (Label Designer), PS-472 (error boundaries), PS-476 (PubMed ticker, no key), PS-477 (deployment baseline and Full Reset), PS-494 (node counts). PS-101 and PS-128 now check the fixes.
- **Where the demo or the screens differ from the tickets' steps:** PS-124 step 6 needs "Open Configuration" as well as "Manage FPPE assignments" (the route's screen check); PS-125 can't remove or retype a saved field from the screen (saved fields have no Remove button; the service-side refusal is covered by vitest), and "remove all fields" is possible only before the first save; PS-147 step 6: a pathologist can't open Quality Assurance at all, so there is no tile to hide; PS-66: the labels are "Next Unanswered Field", "Next Required Field", "Mark Block Grossed", the four grossing actions list under Synoptic, and the internal keys appear nowhere on screen (the vitest covers them); PS-494: a published protocol has no Open Editor (New Version opens it); PS-472: the case must be opened from the worklist.
- **The review run:** the machine ran out of memory when five agents shared it, so some earlier runs crashed; the final runs were clean. The specs wait up to 60 to 120 s for a first page load and use their own sign-in that starts from `/login` (the shared `signIn` sometimes lost the page mid-redirect; `helpers.ts` is unchanged, and should get the same fix).
- **Tests (Jira):** PS-727 (automated) and PS-728 (verification gap), filled in below.

## Batch 582 — Review tests: organ maps, staff passwords, cytology nomenclature, facility printing

- **Review tests** (`e2e/review/`), each following its ticket's review steps: PS-479 (organ maps ask before a switch drops unsaved edits), PS-363 to PS-368 (staff passwords: policy, hash only, the capability, sign-in replacing the demo password, forced change, access by staff role), PS-328 (no PALGA CISOE-A in the categories dictionary; SFCC is reference-only), PS-337 (Facility Configuration → Printing: refused settings, values kept, General tab doesn't overwrite them).
- **Helpers** (`e2e/review/helpers.ts`): sign in through the real sign-in page with a password, sign out, the Staff screen's password panel, set and remove a staff password.
- **The demo password:** three steps (PS-366, PS-368) type the built-in demo password, which is deliberately not in the repository; they run when `PS_DEMO_PASSWORD` is set for the run, and are skipped otherwise (`docs/quality/PLAYWRIGHT_REVIEW_GUIDE.md`).
- **Found while writing them** (the app is right; the steps or names differ): the organ-map box is the shared "Discard unsaved changes?"; at Enterprise level a colour needs "Override here" first; a refused password action is a greyed-out button with a tooltip, not a message; every seeded Pathologist + Admin is also a demo account, and no Physician-only record exists, so the PS-368 test sets the roles up itself; the printing tab refuses before saving (the button is disabled with the reason).
- **Tests (Jira):** see Batch 581.

## Batch 581 — Review tests with Playwright (Pete: "Rather than manual testing for the review, can I use Playwright?")

- **The review tests** (`e2e/review/`, new): each spec follows one In Review ticket's "review test plan steps" against the demo, each step a `test.step` named after it, so a pass is that review done; the steps that still need a person are named at the top of each file and in the In Review CSV ("How to review", "Needs a person for"). This batch: PS-102 (Scan Station facility is a list of performing labs, required, follows the group selector), PS-100 (warnings stay until closed, in English and French; short confirmations fade), PS-86 (Audit Log → Outbound Dispatches: columns, filters, payload drawer, and an order accessioned in the test appearing), PS-128 (Configuration asks before any way out with unsaved edits: tab, logo, Escape, backdrop, section, Sign Out, browser close; nothing asked without edits), PS-101 (Case Search: MRN, name, accession, filters, performing lab as two different users, paging restored, export of every match, saved search, header search).
- **Firefox** (Pete, Oct 15: a supported browser): `playwright.config.ts` has a `firefox` project, used when asked for (`npm run test:e2e:firefox`, `--project=firefox`, or CI), so a plain run stays Chromium and never fails where Firefox isn't installed. It can't run in this sandboxed workspace (no browser downloads); it runs on a workstation after `npx playwright install firefox`.
- **Scripts:** `test:a11y` (it was documented but missing from package.json; corrected), `test:review`, `test:e2e`, `test:e2e:firefox`, `test:e2e:ui`; an HTML report (`npx playwright show-report`). Results JSON per run kind (`e2e-results/a11y.json`, `review.json`, `firefox.json`).
- **Guide:** `docs/quality/PLAYWRIGHT_REVIEW_GUIDE.md`, step by step for Windows and PowerShell.
- **Found while writing them (the steps were out of date; the app is right unless said):**
  - PS-101: the demo has 118 cases (the steps said 99), "adenocarcinoma" finds 7 (not 2), "Second Opinion Requested" 5 (not 6); performing-lab counts as Pete are 0 for Manchester and Midwest because their support access needs approval in the demo; as a Manchester user the Trust finds 9 and Wythenshawe 3. Opened from Search, the case report's breadcrumb still says "Worklist" (it returns to Search): worth relabelling.
  - PS-100: the steps' example warning ("narrative before synoptic fields") is no longer a toast (the button is disabled with a tooltip); the test uses a refused AI call instead (answered by the test, so no AI vendor is reached).
  - PS-86: the demo seeds no outbound dispatches; the test seeds three and also accessions a real order, which does appear (the developer's never-run step 6 works).
  - PS-128: choosing "Discard changes" after clicking outside the Add Cassette Color dialog leaves the dialog open (its edits are forgotten, but it doesn't close): a small app bug, carried forward.
  - PS-102: none.
- **Fixed, found by the review tests: dialogs taller than the window lost their top.** Configuration's dialogs (`.ps-conf-backdrop`, 30 screens) were centred with `align-items: center`, so one taller than the window (the Staff editor at a 900-px window) had its title, × and first fields pushed above the screen, where no scrolling could reach them. They now start below the nav bar and scroll down; short dialogs are still centred (auto margins). Found when the review's fix replaced the staff test's synthetic click with a real one.
- **Independent check:** 2 high (the Firefox project made a plain run fail where Firefox isn't installed; the PS-100 warning came from a live AI call), mediums (a fixed pause hiding a load race, a synthetic click that could reach a control a person can't, two filter steps that could be skipped silently, a refusal without a control, the e2e README), lows; all fixed. Making the skipped filter step strict showed Macros has no facility filter (the step was dropped; the filter case is Cassette Colors'); making the click real found the dialog bug above.
- **Tests (Jira):** PS-721 (automated), PS-722 (verification gap) for 581; PS-723 (automated), PS-724 (verification gap) for 582. (PS-719 and PS-720 went to Test Executions.)

## Batch 580 — Styled dropdown list, native widths (PS-62)

- **Pete's decision (PS-62, Oct 15, 2026):** "Add the styled panel plus the width script ... Include Firefox." Where the browser can draw it (`appearance: base-select`: Chrome and Edge 135 and later), every single-choice dropdown's open list is a styled panel: rounded, the current choice marked, a highlight on the row under the pointer or keyboard, in the list's own colours (a light dropdown keeps a light list). One chevron arrow, in the dropdown's text colour, for every dropdown. Multi-selects and list boxes keep the native look (`pathscribe.css`, "Native <select> elements, app-wide").
- **Widths as before:** that kind of list sizes a dropdown to its selected value; `utils/selectAutoWidth.ts` (installed in `startApp.tsx`) measures each dropdown's widest option in its own font, as shown (capitals, letter spacing), and sets `--ps-select-auto-width`, used as its width unless the dropdown sets its own, exactly as a native dropdown's width works. Kept up to date as dropdowns appear, their options or classes change, or fonts finish loading. Checked in the browser: within 3 px of the browser's own width on every dropdown measured.
- **Firefox (Pete, Oct 15: Firefox stays a supported browser, "part of the big 3"):** Firefox can't draw the styled list yet (Mozilla's work isn't shipped or switched on in Nightly; Bugzilla 1944403). It keeps the dark list from Batch 323, and gets the panel with no change here once it ships. No hand-built popup (it would replace the browser's own list on about 400 dropdowns). Safari the same.
- **Independent check:** 3 high in 579/580 together (580: the editor's light-theme font list unreadable on hover; the width rule overriding dropdowns' own width and max-width), mediums (widths missing class and font changes), lows (arrowless dropdowns, the arrow's contrast on white, the browser check one-sided); all fixed.
- **Tests (Jira):** PS-717 (automated), PS-718 (verification gap).

## Batch 579 — Template reviewer screen (PS-63); billing codes and the Sequencer saved at once (PS-539)

- **Reviewer guide (PS-63, "the reviewer screen needs polish"):** a short "How to review this template" above the lifecycle bar: read as the pathologist would, trial answers go into no case, comment and resolve, the SNOMED coverage needed to publish, and who may approve as this site has set it (independent reviewers, or self-approval allowed; how many approvals). Open while the template is In Review; folding it is remembered.
- **Comments:** dark like the rest of the screen (they were white), each box labelled with its question, an Add button as well as Enter. Adding and resolving moved to `services/templates/templateReviewWork.ts` (`addTemplateQuestionComment`, `toggleTemplateQuestionComment`), which saves and audits them; the component used to build the audit entries itself (rule 2). "Resolve" has its own text (it borrowed another screen's; German and Korean were wrong for a comment).
- **Reset:** at the far end of the row, away from Approve, named "Reset to Draft" as its confirmation is, unavailable in Draft (nothing to reset). Its confirmation now says what it clears: the trial answers and any approvals (it said "all reviewer annotations"; comments are kept).
- **PS-63's open items (Pete asked, Oct 15):** lifecycle e-mails still have no recipients until the API server's directory exists (phase 2e); identity-provider group mapping waits for Pete's decisions and the server's directory sync, not for single sign-on (corrected in Batch 583: single sign-on has existed since Batches 343 to 345; this line said it waited for it); the Firestore role stub no longer applies (production is SQL Server, CLAUDE.md), so it is closed rather than built; reviewer-screen polish done here.
- **Billing codes saved at once (carried from 575):** a specimen's base codes (added, removed, corrected) and matrix codes (applied, rejected) were only held on screen: Save Draft doesn't write specimens, so a reload lost them (not only taking up someone else's version, as 575 said; corrected here). They now save the moment they're made, one at a time, all or nothing: unless the code saved, the screen goes back and no charge or credit is recorded; if someone else saved meanwhile, it says so.
- **Sequencer:** the specimen order is saved at once; the reports' order is part of the draft (Save Draft), and the message says which. The reorder moved to `services/reportEditing/reportSequence.ts`, which no longer drops a specimen or report the order leaves out.
- **Synoptic form:** after taking up someone else's version it stays on the section that was open (577 moved it back to the first).
- **Messages:** `templateRenderer.reviewGuide.*`, `lifecycleBar.resetButton`, `modal.reset.bodyPre`; `inlineCommentThread.{addButton,addCommentLabel,authorSeparator,resolveButton}`; `synopticReportPage.toast.{specimenSaveFailed,specimenSaveConflict,sequenceSavedReportsWithDraft,sequenceReportsWithDraft}` (five languages).
- **Independent check:** 579's findings: a charge recorded for a code that wasn't saved (high); two quick clicks meeting each other as "someone else", the Sequencer's message after a failure, the guide claiming independence where self-approval is allowed and promising comment sharing that is only planned, a reversed French sentence (medium); wording and Reset in Draft (low); all fixed.
- **Not done:** specimen-level billing changes on a signed-out case still ask for no reason (block-level ones do); found by the review, carried forward.
- **Tests (Jira):** PS-715 (automated), PS-716 (verification gap).

## Batch 578 — Follow-ups: the cap error beside its field, add pickers without existing overrides, the settings clock (PS-539)

- **Cap errors beside their field (carried from 576):** Configuration → Cytology → Workload cap says a cap that wasn't saved under the field it belongs to (enterprise, facility or staff), and only that field is marked invalid and points to the message (`aria-describedby`). Typing at another tier leaves the message; typing in that field or Cancel clears it (`services/cytology/cytologyWorkloadCapRules.ts` `cytologyWorkloadCapError`).
- **Add pickers (carried from 576):** "+ Add Override" offers only facilities and staff without an override (a second is refused by the service), and is unavailable when nobody is left, with "Every facility already has an override." / "Everyone already has an override." (`withoutCapOverride`). Each list is now set together with its overrides, so the picker never briefly offers someone who has one.
- **The settings clock (carried from 576):** `createMockCytologyWorkloadCapSettingsService(clock)`: the start-of-day history records a change at the service clock's moment, tested at a fixed time. The app's instance is unchanged.
- **Messages:** `cytologyWorkloadCapSettingsSection.allFacilitiesHaveOverride`, `allStaffHaveOverride` (five languages; the Korean wants native-speaker review with the rest).
- **Not done:** `organMapConfigChanged` (configuration screens hearing of another admin's organ-map change) stays proposed in `ORGAN_MAPPING_API.md`; it needs Pete's decision before it is built.
- **Tests (Jira):** PS-711 (automated), PS-712 (verification gap).

## Batch 577 — Follow-ups: "Use their version" in place, lists and form read again, presence in the tab bar (PS-539)

- **Use their version (carried from 575):** the Edit Conflict dialog's "Reload their version" becomes **Use their version**. The saved case is shown in place, exactly as opening it would show it (`services/cases/caseWrite.ts` `takeTheirVersion`), with no reload: the tab and place are kept, and the browser's draft copy and any held changes are dropped, so the discarded work isn't offered back. Every choice in the dialog is disabled while their version is read. The wording says unsaved work here is discarded, also on a finalized report.
- **Read again after taking up their version (carried from 575):** after Show their changes, Use their version or a merge review, the page reads again what it read once at case open: deficiencies, versions, signatures, the change log, the follow-up mark, the LIS amendment notice, the amendment banner, the report's resolved context (preview and PDF) and the **synoptic form's answers**.
- **Correction (rule 6), Batch 575:** Show their changes didn't show their synoptic answers in the form: the form keeps its own copy of the answers and only re-read it when the report or template changed, so the next edit would have written the old answers back over theirs. Found by this batch's independent review; the form now reads its answers again (`RightSynopticPanel` `reloadKey`).
- **What stays open:** a specimen, report or Orchestration section their save removed is replaced as opening the case would choose (`selectionAfterTakeUp`).
- **Presence (carried from 573):** "who else has the case open" moved from its own line above the tab content into the tab bar's row, pinned at the right with the tools, so it appearing no longer moves the page and never scrolls out of view.
- **Messages:** `synopticReportPage.concurrency.useTheirs`, `useTheirsDone`, `useTheirsFailed`; `hint` and `finalizedBlocked` reworded; `reload` removed (five languages).
- **Browser checks:** a second window appearing doesn't move the tab content; Use their version shows their change with no reload and the discarded change is gone from the form; axe clean.
- **Independent check:** 1 high (the synoptic form kept the discarded answers, also after 575's Show their changes), 5 medium (report preview context, what stays open, the finalized wording, the other buttons live during the read, the amendment banner not re-read), lows (chips scrolling under the tools, the browser check, late replies, docs, the cap screen's error clearing and a loading race, the test's shared storage); all fixed.
- **Known limits:** Save Draft still doesn't save two on-screen changes (removing a specimen's base code; the Sequencer's reorder), so taking up a version replaces them (from 575). Re-reading the form moves it back to its first section.
- **Tests (Jira):** PS-709 (automated), PS-710 (verification gap).

## Batch 576 — Follow-ups: caps checked, "editing" when it's the person's edit, theme colours, a test clock

- **Cytology workload cap: 1 to 100 whole slides** (CLIA 42 CFR 493.1274(d)(2)), checked in the enterprise, facility and personal settings services (`cytologyWorkloadCapRules.ts`); the Workload cap screen says so (`aria-invalid`, cleared as you type or cancel) instead of silently not saving. A value saved earlier over 100 is read as 100. Changing a person's own cap now needs `config:cytology-workload-cap:manage`, like the enterprise and facility caps (it had no check). Tests that used facility caps of 120–1000 now use legal ones; the facility-override comment that described "a higher facility-wide cap" is corrected (an override can only lower it).
- **"Editing" in who-else-has-the-case-open** now follows the person's own edits: every change the page marks unsaved except the two its set-up can mark (the synoptic form's prefill, a restored draft), plus typing or choosing in the synoptic form itself. This removes Batch 573's known limit (someone editing right after opening showed as viewing). The page's unsaved-changes warning uses the same signal (`caseEditingSignal.ts` `isPersonsDirtySection`, `isReportEditEvent`).
- **Theme colours:** new `--ps-warning`, `--ps-warning-text`, `--ps-danger`, `--ps-danger-text`; the notices, presence strip, screening-hours panel and workload counter from Batches 572–575 use the theme's variables (contrast checked: AA on every dark surface).
- **A test clock:** `createMockCytologyScreeningHoursService(clock)`, with a test across midnight in the lab's time zone.
- **Messages:** `cytologyWorkloadCapSettingsSection.errors.{capOutOfRange,failed}`, five languages.
- **Independent check:** 1 high (four existing tests used caps over 100), 4 medium (any control in the report counted as editing, including forms that save themselves, which could also raise the unsaved-changes warning; edits in dialogs and buttons were missed; a fragile browser check; docs), lows (cap error placement and clearing, stored values over 100, legal caps in the save tests, the staff cap service unchecked, the clock not reaching the settings history, ref order); fixed except: the settings' start-of-day history still uses the real clock, the cap error shows once at the top of the screen rather than beside each field, and the add pickers still list people and facilities that already have an override.
- **Carried forward:** the presence strip still moves the page down a line when it appears (needs a look at the layout); lists read once when a case opens aren't read again after Show their changes; the Edit Conflict dialog's own Reload.
- **Tests:** Xray PS-705 (automated) and PS-706 (verification gap: the cap screen, a role without the permission, "editing" between two windows, screen readers), both linked to PS-539.

## Batch 575 — "Show their changes" in place, without a reload (carried from 572)

- **"Someone else saved this case"** now offers **Show their changes** (and Later) instead of Reload. The newer case is taken up in place: their changes are shown, and what this page holds unsaved is kept on top: its report text (draft parts) **and** changes held back by an earlier conflict ("Keep working, decide later"), merged field by field like any save (`services/cases/caseWrite.ts` `takeUpNewerCase`). No reload, so nothing is lost with the API server (where the draft copy is memory-only).
- **Overlap:** if they changed the same thing this page holds unsaved, their other changes are shown, this page's stay as typed, nothing of theirs is written over, and the next save opens the Edit Conflict dialog to choose. A lasting note says so (not a toast) until "Got it".
- **Safe edges:** nothing happens if the page's own save got there first (`stale`); text typed while their case is being read is kept (read from refs); double clicks run once; in Orchestration the saved diagnostic is shown (someone's sign-out or recut fields) with only the section-backed text kept from the page (`orchestrationDiagnosticAfterTakeUp`), so it can't be written back over theirs later; a specimen their save removed stops being selected; the notice is dismissed through the version taken up.
- **Correction (rule 6):** the Edit Conflict dialog said unsaved work is "offered back after the reload". That is true in the demo only; with the API server it is lost. It now says unsaved work may be lost (five languages; `services/cases/README.md` corrected).
- **Messages:** `synopticReportPage.caseUpdated.{message,show,shown,overlap,failed,gotIt}` (reload removed), `synopticReportPage.concurrency.hint` corrected; French "cas" and Korean "증례" as in the conflict dialog.
- **Known limits (carried forward):** two on-screen changes that Save Draft doesn't save either (removing a specimen's base code; the Sequencer's reorder) are replaced by their version on take-up; lists read once when the case opens (deficiencies, version history, signatures, the LIS amendment notice) aren't read again; the Edit Conflict dialog's own "Reload their version" still reloads.
- **Browser check:** the Batch 572 block now has another tab change a specimen's description; Show their changes displays it in place with no reload, and the notice doesn't return for that version.
- **Independent check:** 1 high (changes held back by a conflict were left out, so the next save could write over theirs without a dialog), 6 medium (a race with the page's own save; text typed during the read; Orchestration diagnostic; toast promise; no lasting overlap note; tests), lows (selection, double click, dismiss version, wording, the conflict dialog's reload text); fixed except the known limits above.
- **Tests:** Xray PS-703 (automated) and PS-704 (verification gap: two people, unsaved work, overlaps, held changes, Orchestration), both linked to PS-539. Delivered with Batch 576 in one zip (the two were built and tested together).

## Batch 574 — Workload counter; night-shift sign-off; correction reasons; edits counted once (Pete, Oct 15)

- **Correction, cytology workload:** saving an edit of an existing review recorded the slide again in the workload ledger, so editing a review three times counted four slides against the limit (and an edit over the limit could be refused). An edit now adds only an escalation's extra weight (an imager pass becoming a manual rescreen adds 1); the time still counts (`resolveCytologyScuWeightAdded`). Found by this batch's independent review.
- **Workload counter (Pete: "show the number of reviews and remaining reviews"):** on the Cytology worklist and the screening page, for anyone with screening that counts: slides counted of the cap over the rolling 24 hours, reviews, slides left now (the limit grows with hours: cap × hours ÷ 8) and left in a full 8-hour day, a bar marked at the limit so far, and in words "Approaching your limit", "At your limit" (the next review wouldn't fit) or "Over your limit". Worked out exactly as the save-time check (exact hours, the review open now, the chosen mode's weight), rounded down to the half slide, so it never shows room the check would refuse. Read again after each save, every minute and when the window is shown. The worklist (no case open) uses the lab's jurisdiction and the strictest cap that could apply; with no jurisdiction it shows nothing (never assumed US). `services/cytology/cytologyWorkloadSummary.ts`.
- **Night shifts (Pete: "Yesterday + lab start-of-day"):** yesterday's hours can be signed off while they still need it (shown above today's; each panel shows its date; focus moves to today's heading after). A lab setting, **Screening day starts at** (Configuration → Cytology → Workload cap), places a 10 pm–6 am shift on one date; a change applies from then on (history kept, past days never re-dated), needs `config:cytology-workload-cap:manage`, and is audited. Sign-offs only for today or a yesterday that still needs it (`dateNotAllowed`); each stores the start hour in force.
- **Workload report (CYT-QA-05):** the correction's reason, and its note (tagged for redaction); dates in the user's format; recorded hours to two decimals, as the person signed. The note is limited to 200 characters and the screen asks for no patient details.
- **Contract:** `CYTOLOGY_QC_API.md` §5 (Batch 574 part): the start of day and its history, today/yesterday, `dateNotAllowed`, the note limit, the workload-summary endpoint, edits. Wording corrected in the capability text, `AUTHORIZATION_API.md` and comments: the signed-off hours are counted in the supervisor's report; the live limit uses the recorded time.
- **Messages:** new `cytologyWorklist.workload.*`, `cytologyWorklist.screeningHours.{titleYesterday,hintYesterday,hoursLabelYesterday,noteHint,errors.noteTooLong,errors.dateNotAllowed}`, `cytologyWorkloadCapSettingsSection.dayStart.*`, `cytologyQaTab.workloadTable.{correctionReason,correctionNote}`; changed: the panel hint and the capability description, five languages.
- **Also:** the Batch 571 Xray file (`docs/quality/evidence/PathScribe-Batch571-xray.json`) had been left out; added.
- **Independent check:** 4 high (the worklist counter assumed a US lab; its cap could differ from the case's; "left now" could show room the check would refuse; changing the start of day re-dated past days), 9 medium (time zone and user from the caller in the contract; yesterday could be re-signed after it was signed; the setting change unaudited and a failed save silent; the note untagged and unlimited; no dates on the panels; figures going stale; edits counted twice; status and bar inconsistent; docs), lows (rounding between panel and report, focus after yesterday, units and the duplicate "left" line, the report's date format); all fixed except: an injected clock in the demo service, and checking the cap's range (0–100) in the settings service.
- **Not done (carried forward):** taking a newer case up in place without a reload (Batch 572).
- **Tests:** Xray PS-697 (automated) and PS-698 (verification gap: real shifts, the counter against the save-time check, and the server), both linked to PS-539.

## Batch 573 — Who else has the case open (PS-539)

- **Presence (Pete, Oct 14: a live topic for an open case, including presence):** above the case report's tabs, each other person with the same case open, whether they are **editing** (unsaved changes) or **viewing**, and Email / Call links when the staff directory has their work details. The same person in another window shows as "You, in another window". Nothing to click or dismiss; it takes no space when nobody else is there. One polite message for screen readers when someone opens, starts editing or no longer has the case open; nothing for the first list or a dropped connection; the same words again are read again.
- **How:** the hub's `JoinCasePresence` / `SetCasePresenceEditing` / `LeaveCasePresence` and `CasePresenceChanged` (`LIVE_UPDATES_SIGNALR.md` §15, new), keyed by the case's support reference; only for a signed-in (SSO) session. In the demo, this browser's windows tell each other (BroadcastChannel, heartbeat, goodbye on close). The client re-joins after every reconnection, retries a failed join, takes back a join answered after leaving, and sends an editing change made while joining; the server lists each presence under its own id.
- **The support reference now comes from the API server** (`GET /api/cases/{caseId}/support-reference`, `CASE_API.md` §8; `supportReferences/caseSupportReference.ts`), so every user of a case has the same one. This also fixes Batch 572's notice, which with the API server used a reference made in each browser and so would never have matched another user's.
- **"Editing" means the person's own changes:** `services/cases/caseEditingSignal.ts`, the rule the page's unsaved-changes warning already used (moved out of the page), so opening a case never shows as editing. Known limit: a real edit made while the page's set-up mark is still standing shows as viewing until saved.
- **Organ map:** its empty presence slot is gone (presence is shown once, above the tabs).
- **Messages:** new `synopticReportPage.presence.*`, five languages.
- **Browser checks:** "who else has the case open": two windows of one case each show the other, announced politely, axe clean, gone when one closes. The full accessibility run: 73 passed, 5 skipped.
- **Independent check:** 3 high (a leave while the join was on its way left the presence on the server; set-up changes showed as editing; with the API server each browser made its own reference), 9 medium (an editing change lost while joining; join answer and events not ordered; another user could take a presence id; announcements on every reconnect and for people already there; the same words not read twice; a hidden demo tab coming and going; the throttle could drop the last value; no retry; docs), lows (the call link's name, contact details not checked, contract gaps, a decision in the component, wording, the demo's anonymous join, the browser check); all fixed except the strip's appearing above the tabs moving the content down a line, and its colours following the 572 banner's.
- **Tests:** Xray PS-692 (automated) and PS-693 (verification gap: presence between users through the server hub), both linked to PS-539.

## Batch 572 — "Someone else saved this case"; screening hours signed off at the end of the day (PS-539; readiness review F7, option C)

- **Correction, cytology workload limit:** the limit (assigned cap × hours ÷ 8) rose above the person's cap on days longer than 8 hours (10 h gave 125% of the cap). It now stops at the cap (`resolveCytologyWorkloadCapacity.ts`, `CLIA_WORKLOAD_FULL_PERIOD_HOURS`). Found by this batch's independent review.
- **"Someone else saved this case" (Pete, Oct 14: a live topic for an open case):** when another user saves the case you have open, a notice above the tabs says so, with Reload and Later (not a window). Your own saves show nothing; Later hides it until a newer save. With the API server it comes from the hub's new `caseReport` topic, keyed by the case's support reference (never the case number), events only; in the demo, another tab's save stands in (`subscribeCasesChangedElsewhere`). The version check on save stays as the safety net. Two of the page's own saves (the first-open stamp and confirming an abnormal finding) now move its known version on, so they neither show the notice nor get a later save refused. Reload is a full reload: with the API server, unsaved changes are lost (taking the newer case up in place is carried forward).
- **Screening hours (F7, option C):** the server will record screening time with its own clock; the browser's timer is not trusted. On the Cytology worklist, "Today's screening hours" shows once something is recorded: one click confirms; Correct takes the hours, a quick-pick reason (screened at the microscope; a slide left open; other, with a note) and an optional note. Corrections are compared to one decimal, as shown; a confirmation stores the recorded figure itself. A correction more than 0.5 h out, or one that turns an exceeded day into one within the limit, is flagged for the supervisor. A sign-off made before more screening was recorded stops counting until the person confirms again. Days are the lab's (facility time zone). Append-only and audited; capability `cytology:screening-hours:sign-off` (its own seed: Pathologist, Fellow, Resident, Cytotechnologist; not a hospital's own roles). The wording on screen says "the workload limit", not "CLIA", for labs outside the US.
- **Workload report (CYT-QA-05):** by the lab's day, with "Recorded hours", whether the day is signed off (or the sign-off is out of date), and the flag.
- **Contracts:** `LIVE_UPDATES_SIGNALR.md` §14 (`caseReport`: the server issues and resolves the reference, never reveals whether a case exists, and sends to the writer's connections too; the screen row), `ORGAN_MAPPING_API.md` §6, `CYTOLOGY_QC_API.md` §5 (new: server screening events, the sign-off API, the rules above), `DEPLOYMENT_READINESS_REVIEW.md` (F7 decided; the organ-map item decided), `AUTHORIZATION_API.md`.
- **Messages:** new `synopticReportPage.caseUpdated.*`, `cytologyWorklist.screeningHours.*`, `cytologyQaTab.workloadTable.{recordedHours,signedOff,notSignedOff,signOffStale,correctionFlagged}`, `capabilities.items.cytologyScreeningHoursSignOff`, in five languages. Korean uses 스크리닝 for screening in these strings (native-speaker review advised).
- **Browser checks:** "case updates and screening hours": another tab's save shows the notice (polite, takes no focus, axe clean; Later hides it); the panel is hidden at 0.0 h and one click signs the day off. The full accessibility run: 70 passed, 5 skipped, and the two new checks passed after their spec was updated to the review fixes.
- **Independent check:** 3 high (the notice sat inside the Full Report tab; the workload limit rose above the cap past 8 hours, and a correction could clear an exceedance unflagged; a sign-off made before more was recorded kept counting), 7 medium (two own saves not moving the known version; contract precision; the Reload claim; "CLIA" wording outside the US; the seed and the 0.0 h panel; rounding and the input step), lows (live region on the message only, translations, comments, tests); all fixed except "take up in place" (carried forward).
- **Still open:** presence ("also viewing", Batch 573); the server side (phase 2e); a night shift signing off the previous day; showing the correction's reason on the supervisor's report.
- **Tests:** Xray PS-690 (automated) and PS-691 (verification gap: the server hub's `caseReport` events and server-recorded screening time), both linked to PS-539.

## Batch 571 — Live updates: one general event, decided (PS-539)

- **Pete's decision (Oct 14, 2026):** the server tells open screens that something changed with one general event, `DataChanged` with topics, on one hub, `/hubs/live`. It replaces the registry exceptions badge's own `ReceiveExceptionCountUpdate` (which carried the count) and the separate `/hubs/quality-metrics` hub. A screen that needs live updates in future gets a topic, not an event of its own. The event says only what changed (a topic, and a facility or site id for Facility Ops and site agents), never the change itself; each screen re-reads through its normal, permission-checked call.
- **Recorded in:** `REGISTRY_ACKNOWLEDGEMENT_API.md` (the live badge), `LIVE_UPDATES_SIGNALR.md` §14, `DEPLOYMENT_READINESS_REVIEW.md` (sections 0.6 and 5), and the header of `services/liveUpdates/dataTopics.ts`.
- **No change to how PathScribe works:** the browser side was built this way in Batches 559 to 562. The server side is phase 2e.
- **Messages:** none new.
- **Tests:** Xray PS-688 (automated: the live-update, badge and readiness-review tests) and PS-689 (verification gap: the server's hub, when it exists, sends `DataChanged` as §14 says), both linked to PS-539.

## Batch 570 — Focus after deleting a saved search; one shared focus rule; the readiness review brought up to date (WCAG 2.1 AA, 2.4.3)

- **Saved searches (Search) and saved queries (Billing logs):** after a chip's × removes it, from the keyboard or a screen reader, focus goes to the next chip, or to "Save search / query" (its name box when open), not to the page.
- **One rule, shared:** `hooks/useFocusAfterRemoval.ts` (new), used by the inbox and the chips. It follows a screen reader's click in Firefox as well as the keyboard (`utils/a11y/focusAfterRemoval.ts` `isNonPointerClick`: `detail` 0, or `mozInputSource` 0 on a trusted click); every click replaces what is waiting, so a mouse delete never moves focus; focus is moved only from the page or the pressed button, never from where the user has moved on to; the target is the nearest item still in the list (two quick deletes).
- **Billing logs:** the save row's Cancel (✕) has a name.
- **Tests for Batch 568's changes:** the template canvas row (`TemplateCanvas.nodeRow.test.tsx`; `NodeCard` exported) and the screenshot's full-size view (`ScreenshotPreview.lightbox.test.tsx`; `ScreenshotPreview` exported), including focus going back to the picture.
- **Browser check:** "saved-search chips": no serious violation; Enter on × moves focus to the next chip, then to Save search. The full accessibility run: 70 passed, 5 skipped.
- **Deployment readiness review** (`docs/architecture/DEPLOYMENT_READINESS_REVIEW.md`): a new section 0, the status after phases 2a to 2d: every browser-side item done; the six blockers all server work (phase 2e, not started); findings F2, F5, F7, F11 and F12 still open; accessibility readiness; the decisions still open for Pete. Provider facts weren't re-checked (as of Oct 12).
- **Manual screen reader test plan** for the QC team (NVDA on Windows, VoiceOver on Mac): 38 scripts with expected results and a Pass / Fail column per screen reader, tracing to every earlier verification-gap Test. It is a shared document (Xray PS-687 records its run).
- **Still open:** the specimen rail's review dot and the Billing chips have no browser check of their own (the source check covers their markup); the plan's results.
- **Messages:** none new.
- **Independent check:** 2 medium (a screen reader's click in Firefox gave `detail` 1, so focus wasn't moved for it; the chips' fallback did nothing when the save box was open), 6 low (focus could be pulled back after the user moved on; a mouse delete after a refused keyboard one; two quick deletes; thin tests; seeded chips in the browser check; Billing's Cancel had no name); all fixed.
- **Tests:** Xray PS-686 (automated: 70 browser checks and 56 of 56 mapped vitest tests passed) and PS-687 (verification gap: the manual screen reader test plan, run by the QC team), both linked to PS-539.

## Batch 569 — Focus after a keyboard delete; the source check sees hand-made controls and reads comments properly (WCAG 2.1 AA)

- **Inbox (WCAG 2.4.3):** when a message's own Delete, Restore or Delete-forever, pressed from the keyboard, removes it, focus goes to the next message's sender (the one before when it was last; the list when none is left), not to the page (`utils/a11y/focusAfterRemoval.ts`, new). A mouse click leaves focus alone; a delete that didn't happen (cancelled, refused) never moves focus later; focus is never pulled from where the user has moved on to.
- **Source check, "no control inside another":** now also covers a `<button>` and an element given a control's role by hand (`role="button"`, `"checkbox"`, `"switch"`, `"tab"` …). It found three more, fixed:
  - **Saved search / saved query chips (Search, Billing logs):** each was a button holding its × button. The chip is a mouse shortcut now; its name is the button that loads it (current when loaded), × is its own button named "Delete saved search / query …" (`billingLogs.deleteQueryAria`, new, five languages).
  - **Case report, collapsed specimen rail:** the "changes to review" dot was a button inside the specimen's button; it is a named button beside it, same place and size.
- **Source check, comments:** each file is now read by the TypeScript parser to set comments aside, so `//` in on-screen text is no longer taken for a comment. The old pattern had also blanked about 380 lines of `QualityAssurancePage.tsx` (a `/*` inside a `//` comment); those are now checked and pass. The other checks' findings are unchanged (compared over every file). Each file is parsed once for all the checks.
- **Browser checks:** "focus after a delete" (Tab to a message's Delete, Enter, focus on the next message). The full accessibility run: 69 passed, 5 skipped.
- **Still open (Batch 570):** focus after deleting a saved chip (it goes to the page, as before); automated tests for the chips, the rail dot, the template canvas and the screenshot view. Not seen by the source check: a role set by an expression, `<a role="button">`, components such as `<Button>`.
- **Messages:** one new, `billingLogs.deleteQueryAria`.
- **Independent check:** 3 medium (a waiting focus move could fire later, after a cancelled delete or a search; mouse deletes in Chrome also moved focus; the check ran about 30 times slower), 8 low (the rail dot's size, the Billing chip's summary for screen readers, focus after a chip delete, pressed vs current, what the check can't see, `CSS.escape`, tests, docs); fixed, except focus after a chip delete and the chip / rail tests (Batch 570).
- **Tests:** Xray PS-684 (automated: 69 browser checks and 104 of 104 mapped vitest tests passed) and PS-685 (verification gap: the inbox, the chips and the rail dot with a screen reader), both linked to PS-539.

## Batch 568 — No control inside another, app-wide; the Worklist's view tiles' colours (WCAG 2.1 AA, 4.1.2)

- **The last five places**, fixed as in Batch 567 (the row a mouse shortcut, a real button inside):
  - **Terminology alerts (Protocols):** the title is the button that shows or hides the list (`aria-expanded`); Re-check does only its own job. The counts and the field / option references now come from messages (`terminologyAlertBanner.countsBoth`, `fieldRef`, `fieldOptionRef`), so each language sets its own punctuation and quotation marks (they were written into the page).
  - **Protocol upload:** the drop zone's hidden file input sits beside it, not inside it.
  - **Enhancement request:** the screenshot's full-size view was a button holding its Close button. It is a dialog now: focus moves to Close and stays inside (`hooks/useFocusTrap.ts`), Escape or a click closes it, and focus goes back to the screenshot.
  - **Template builder:** a field's name is the button that selects it (as wide as its text, so the rest of the row still starts a drag); keyboard focus in a row shows Remove, now named with the field (`templateCanvas.removeNamed`); the show-contents button says whether it is open (`templateCanvas.childrenToggle`).
  - **Contribution:** the teaching tile opens from its title; Export does only its own job.
- **The source check is app-wide:** "no control inside another" (`nestedInteractive`) runs over every UI file, with no exception list. It covers elements made into controls with `pressable` / `switchable`; Batch 569 extends it to elements made clickable by hand.
- **Worklist:** the LIS and Outreach tiles' on/off colours come from modifier classes in `pathscribe.css` instead of values set in the page; they look exactly as before (checked in the browser).
- **Home:** the cards' keyboard handling comes from `pressable` alone (a second, hand-written copy is gone; same behaviour).
- **Browser checks:** Contribution (axe nested-interactive) and the Worklist tiles' colours. The full accessibility run: 68 passed, 5 skipped. The teaching tile's keyboard step doesn't run for the demo's superadmin (no teaching records); its unit test covers it.
- **Messages:** five new (`terminologyAlertBanner.countsBoth`, `fieldRef`, `fieldOptionRef`; `templateCanvas.childrenToggle`, `removeNamed`), in all five languages.
- **Independent check:** 2 medium (dragging a template field by its name, which Firefox may not start from a button: the name is now only as wide as its text and keeps the grab cursor, and dragging in Firefox is on PS-682; focus in the screenshot view: now trapped and returned), 8 low (the Contribution browser check never reaches the tile: unit test added; little coverage of the template canvas and screenshot view; Remove staying after a mouse click: keyboard focus only now; long names; Remove's name; the tooltip when open; the focus ring colour; what the source check covers: written down); fixed, except that the template canvas and the screenshot view have no automated test of their own.
- **Tests:** Xray PS-681 (automated: 68 browser checks and 67 of 67 mapped vitest tests passed) and PS-682 (verification gap: dragging in Firefox, screen readers on the alerts, the screenshot view and Contribution), both linked to PS-539.

## Batch 567 — No control inside another: the inbox, the worklist and the report editor (WCAG 2.1 AA, 4.1.2)

- **What was wrong:** a row or card made keyboard-usable as a whole (a button) that also held buttons, links or checkboxes of its own. A screen reader can't reach or announce a control inside a button (axe: nested-interactive). Fixed here with the Batch 566 pattern: the row stays a mouse shortcut (`clickableContainer`), and a real button inside does its main action.
  - **Inbox (`AppShell`):** the sender's name opens the message (editing: ticks it), described by the subject. Keyboard focus in a row shows its delete or restore buttons, as hover does; the delete icon has a name.
  - **Add code window:** the icon at the end of each AI suggestion and search result is now an "Apply code" button. Once applied, "✓ ×n" is the button that applies it again; its name keeps the visible text (`addCodeModal.applyAgainLabel`, new, in all five languages). Clicking a row still applies the code.
  - **Delegate window:** a delegation type's name is the button (pressed when chosen); the recipient's ✕ is named "Remove".
  - **Billing review:** a pending code's code is the button (current when selected); the dismiss button has a name.
  - **Sequencer preview:** a report's name is the button that opens it.
  - **Protocol change window:** each proposed change, and "Select all", was a button holding a checkbox; each is now the checkbox's label (click anywhere on it to tick). A change's checkbox is named by the specimen and proposed template, described by the reason.
  - **Worklist digital-pathology cells:** the badge is the one tab stop (it was the cell and the badge), and an empty cell no longer opens the drawer.
- **New look shared by these buttons:** `:where(.ps-row-open-btn)` in `pathscribe.css` clears the browser's button look at zero specificity, so each keeps its old size, weight and colour; a focus ring shows on keyboard focus.
- **New source check:** `nestedInteractive()` (`services/accessibility/a11yAudit.ts`) finds a pressable or switch holding another control. Table rows (`{ role: null }`) aren't counted, and an element it can't read is reported. The guard runs it over the files fixed here; Batch 568 fixes the last five places (Terminology alerts, protocol upload, the enhancement request picture, the template canvas, the Contribution teaching tile) and makes it app-wide.
- **Browser checks (`e2e/a11y.states.spec.ts`):** the inbox (axe; a row isn't a button; Enter on a sender opens the message) and the case report (axe nested-interactive). The full accessibility run: 66 passed, 5 skipped.
- **Not opened by the browser check:** the add code, delegate, billing and protocol-change windows. The source check and unit tests cover them; PS-678 lists what a person should try.
- **Messages:** one new, `addCodeModal.applyAgainLabel`.
- **Independent check:** 2 medium (a focused delete button could vanish when the pointer left the row; the "applied" buttons' names didn't match their text), 8 low (pressed vs current, empty worklist cells, block content and long names in the protocol labels, the reset's text properties and hover underline, gaps in the source check, partial coverage, weak tests, docs); fixed, except that focus isn't moved to the next row after a delete and the source check still can't see a `//` inside JSX text.
- **Tests:** Xray PS-677 (automated: 66 browser checks and 143 of 143 mapped vitest tests passed) and PS-678 (verification gap: keyboard and screen reader in the windows the browser check doesn't open), both linked to PS-539.

## Batch 566 — Rows that hold buttons; view tiles that say which is on (WCAG 2.1 AA, 4.1.2)

- **Cytology worklist rows:** a row on the QC, CSMS QA and other screening tabs holds buttons of its own (Manage flags, Ask a colleague, Claim), so it can't itself be a button (axe: nested-interactive; a screen reader can't reach or announce a button inside a button). The patient's name (or the MRN) is now the button that opens the case: Tab reaches it, Enter or Space opens it. Clicking anywhere else on the row still opens the case, as before. A pool row opens nothing, so its name stays plain text. The buttons inside a row do only their own job (now tested). Closes the item Batch 565 left open.
- **`clickableContainer(handler)`** (`utils/a11y/pressable.ts`): for such a row; a mouse shortcut only (no role, no tab stop). The app-wide accessibility guard now also checks that every element using it holds a real `<button>` (`container-without-button`, `services/accessibility/a11yAudit.ts`), so it can't be used to leave a row unreachable from the keyboard.
- **View tiles say which is on (`aria-pressed`):** the Worklist's LIS and Outreach tiles (the peer-review queue tiles already did) and Batch Management's stage tiles. The Disposal and Disposal report tiles no longer read their emoji aloud; the tiles that lacked `type="button"` have it.
- **Browser checks (`e2e/a11y.states.spec.ts`, Batch 566 block):** one mode tile on at a time on the Worklist; each stage tile on in turn, only one at a time; no nested-interactive violation on any cytology tab; Enter on a row's name opens the case. The full accessibility run: 64 of 64 passed, 5 skipped (Configuration tab numbers past the last tab).
- **Still open:** the same pattern (a clickable element holding buttons or fields) in about 17 other places found by a source scan (`AppShell`, `Home`, `WorklistTable` cells, `TemplateCanvas`, `AddCodeModal`, `DelegateModal`, `BillingReviewPanel`, `SequencerPanel`, the synoptic `Sidebar`, `ProtocolChangeModal`, `protocolShared`, `TerminologyAlertBanner`, `ContributionDashboardPage`, the enhancement request lightbox) and, lower priority, 6 more with no role; axe found none of them serious on the screens it opens. The Worklist mode tiles still pick their colours with on/off values in custom properties, which a modifier class would do better.
- **Messages:** none new.
- **Independent check:** 1 medium (the name button lost the title's size, weight and colour), 1 medium (the guard change didn't check anything: replaced with the new rule), 2 low (browser checks that could pass with nothing checked; the tile helper's second click), 3 low/info (Manage flags not tested, two tiles without `type="button"` and emoji names, the mode tiles' colours); all fixed but the last.
- **Tests:** Xray PS-674 (automated: 64 browser checks and 142 of 142 mapped vitest tests passed) and PS-675 (verification gap: a real screen reader on the cytology rows and the tiles), both linked to PS-539.

## Batch 565 — The rest of the faint text, the screens' other states, and the charts (WCAG 2.1 AA)

- **The stylesheet's remaining faint greys:** 504 rules that wrote out the old greys (#64748b, #6b7280, #4b5563, #475569) for text on dark surfaces now use `--ps-text-dim` (4.8:1 or better). Left as they were: print styles, rules with their own light background, and the light-surface families (the printed report, the template layout and report editor, light panels, inputs and pills), where the old grey passes and the lighter one would not. The independent check compared every changed rule against the light surfaces and found none on one.
- **Other states, checked in the browser (`e2e/a11y.states.spec.ts`):** each Worklist and Quality Assurance filter tile selected, each cytology tile and organ-site pill, a selected worklist case, a batch opened. Fixed:
  - an active tile's label in its own hue on its own tint (indigo the worst, 3.6:1): lightened to 6:1 or better; inactive tiles keep their grey (`--tile-label-mix`);
  - the worklist case id (#0891b2 on a selected row, 4.1:1), in both the table and card views;
  - cytology pool rows were marked as buttons while holding buttons (axe: nested-interactive); a pool row isn't clickable, so it no longer is one. "Manage flags" no longer also opens the case.
- **Selected tiles are announced:** the Worklist, Quality Assurance, cytology QA and cytology worklist tiles now say which is selected (`aria-pressed`, WCAG 4.1.2), which the browser check also uses to confirm each click took effect.
- **Charts and other colours set in code:** chart axis text (SVG, which axe can't check) uses `utils/chartTheme.ts` `CHART_TICK_COLOR`; a few status and chip colours, the inactive priority buttons in the enhancement request window, the empty-section icon and the voice button's standby icon were raised from the old greys.
- **Browser results:** every check (`npm run test:a11y`, all specs) passes; evidence below.
- **Still open:** cytology QC and CSMS rows are buttons that hold buttons (nested-interactive; needs the row's own action moved to a button); colours that are data (status hues, configurable type colours) aren't changed; contrast that axe can't measure on the translucent tiles is reported in the results, not failed.
- **Messages:** none new.
- **Independent check:** 2 problems (inactive tiles brighter than active ones; inactive priority buttons missed) and 5 smaller points; fixed, except the nested-interactive rows above.
- **Tests:** Xray PS-669 (automated: 61 browser checks and 145 of 145 mapped vitest tests passed) and PS-670 (verification gap: contrast axe can't measure, real displays, screen readers), both linked to PS-539.

## Batch 564 — Every screen checked for accessibility in a browser; colour contrast fixed (WCAG 2.1 AA)

- **New browser check, `e2e/a11y.routes.spec.ts` (part of `npm run test:a11y`):** each of 38 top-level screens is opened on the demo, confirmed to be the screen itself (its heading; not refused, not "case unavailable"), and checked with axe-core for serious or critical WCAG 2.1 AA violations. Together with the earlier checks, 46 of 46 pass.
- **What it found:** colour contrast only, on 13 screens (Audit Log, the batch management screens, Grossing, Contribution, the Cytology worklist, Quality Assurance, Registry exceptions, Slide distribution). Fixed in `pathscribe.css`:
  - the "dim" grey (`--ps-text-dim`, and the same grey written out in the rules that failed) is lighter: 4.8:1 or better on every dark surface, from about 3.7:1;
  - the cytology worklist's greys, the teal and blue text in the Audit Log, the white-on-red count badges, the case-mix counts and the active coloured filter tiles' labels;
  - table headings now light up on hover (the dim grey is now close to the hover colour).
- **Also fixed:**
  - an old grossing link (by accession number) opened the synoptic page instead of grossing, because the case loader always redirected to the synoptic view (`loaders/synopticLoader.ts`: `caseViewLoader`, `grossingLoader`). Found because the browser check of Grossing was scanning the synoptic page;
  - printing a batch window printed its title and barcode near-white on white, and its hints too light.
- **Not covered yet (Batch 565):** screens' other states (a tile clicked, a filter, the empty cases), the worklist's and cytology's active tile labels, the charts' axis text (SVG, which axe doesn't check), and the rest of the stylesheet's uses of the old grey.
- **Messages:** none new.
- **Independent check:** 2 high (the Grossing check scanned another page; no check that each screen really opened), 1 medium (only default states scanned: Batch 565), 3 low (hover hierarchy, the print colours, chart ticks: 565); the highs and the two lows fixed here.
- **Tests:** Xray PS-660 (automated: 46 of 46 browser checks and 21 of 21 mapped vitest tests passed) and PS-661 (verification gap: real displays, printing, an old bookmark), both linked to PS-539.

## Batch 563 — The connection banner and waiting states checked in a browser (PS-622; PS-539 phase 2d item 2)

- **Checked in Chromium, automated** (`e2e/a11y.connectivity.spec.ts`, part of `npm run test:a11y`):
  - offline: "Offline" appears after about 2 s, below the top bar, in one polite live region; nothing takes focus; it covers no control; axe passes. Back online: "Reconnected", then it goes by itself;
  - a page whose code is slow: the loader, then "still loading" from 3 s, staying until the page arrives; axe passes;
  - no live region inside another (that would read the text twice);
  - My exports, Audit Log → Server jobs and Interfaces → Engines: no serious or critical WCAG 2.1 AA violation.
  - The existing main-screen checks (Worklist, Accession, Search, the case report and organ map) were run again and pass.
- **Found and fixed:**
  - on a cold start the page's code arrives in two steps, and each page loader started its own clock, so "still loading" vanished and came back 3 s later. The loaders now share one clock (`services/connectivity/pageWaitClock.ts`; `PageLoader`, `useLoadingPhase`). The browser test fails without the fix;
  - the Audit Log's tab buttons failed AA colour contrast (about 3:1); now about 6:1, and the active one about 8:1. The same grey on the "unsaved changes" window's Cancel button too.
- **Still for a person (PS-622):** NVDA and VoiceOver actually speaking each text once; the hub dropping while the network stays up ("Reconnecting"), which needs the API server.
- **Messages:** none new.
- **Independent check:** no bugs; 3 should-fix (a test that could pass without checking, swallowed errors in two checks, the readiness review still listing this as open) and 5 minor (a replacing loader's first render, unrelated waits joining, fixed sleeps, the dev-only route pattern, another failing grey); fixed except the fixed sleeps, which the existing checks also use.
- **Tests:** Xray PS-652 (automated: 18 of 18 mapped vitest tests and 8 of 8 browser checks passed) and PS-653 (verification gap: screen readers, the hub case), both linked to PS-539.

## Batch 562 — The last polling screens on live updates; readiness review §9 items 3 and 8 closed (PS-539 phase 2d)

- **Molecular Order Queue:** re-reads when an order changes elsewhere (results from the instrument or reference lab, another technologist's action), through a new data topic, `molecularQueue` (proposed earlier as `molecularQueueChanged`). It never polled and still doesn't without the hub (`useLiveData` `pollMs: null`, events only). Orders that left the queue drop out of the selection, so an action never names one the user can't see; a re-read never puts back the view from before the user's own action (`services/molecularOrders/molecularQueueSelection.ts`).
- **Print Queue's site agent line:** follows `siteAgents` for every site with an agent it counts (`useLiveData` `dataKeys`), as well as its minute poll.
- **Readiness review §9:** item 3 (push instead of polling) marked done for the browser (Batches 559 to 562). Item 8 (the renderer and receiver in the Content-Security-Policy) was done in Batch 547 but never marked; marked now, with the guard that keeps it.
- **Organ map events:** checked, still proposed. No screen polls for them; an open report page learns of another user's figure change only when it saves (PS-71's version check) or reopens the case. If built, they would be topics keyed by the synoptic instance, never by case number.
- **Messages:** none new.
- **Independent check:** 1 high (a stale selection after a live re-read), 2 medium (an older re-read overwriting the view after an action; the organ-map claim, which first said figures travel with the case's own changes, which isn't so), 3 low (a new site shows at the next minute's read, documented; revoked agents' sites no longer followed; the keys' comparison); all fixed.
- **Tests:** Xray PS-650 (automated, 79 of 79 mapped tests passed) and PS-651 (verification gap: the two screens with a real hub), both linked to PS-539.

## Batch 561 — Items carried from Batches 559 and 560 (PS-539 phase 2d)

- **Timed reads (`hooks/useLiveData.ts`):** the next timed read is due one interval after the last read of any kind, so a connection that keeps dropping and coming back no longer keeps putting it off. A read still running counts as the timed one, so a slow read isn't followed straight away by another; an event read waits until a second has passed since a timed read.
- **Tests added for what Batches 559 and 560 changed without one:**
  - the FINAL and PRELIMINARY dispatchers record the PDF's hash on the queue entry (`reports/oruQueueEntryHash.test.ts`);
  - a retried result is held while its workup version isn't known, and records the hash of the PDF it carries (`interfaceDispatch/outboundResultRetry.test.ts`);
  - the held reports banner clears on a case change and never shows a slow answer for another case (`hooks/useHeldReports.test.tsx`);
  - the registry exceptions badge shows nothing once the capability goes, even with a read on its way (`hooks/useRegistryExceptionCount.test.tsx`).
- **Corrections:**
  - Batch 559 listed "a held result has no limit on how long it waits" as open. It isn't: in the browser it waits on the failed-messages screen for a person. The server rule wasn't written down, so `MESSAGE_BUS_API.md` §5 now says it: a held result is a temporary failure for `interface.dispatch`, retried 8 times then dead-lettered to the same screen, and later messages for the case wait behind it so a correction never overtakes its result.
- **Messages:** none new.
- **Independent check:** 1 bug (a slow read followed straight away by another), 1 weak test, 1 timing gap, 1 misleading test title, 1 half-verified claim; all fixed.
- **Tests:** Xray PS-648 (automated, 40 of 40 mapped tests passed) and PS-649 (verification gap: the server's retries of a held result; live screens on an unstable connection), both linked to PS-539.

## Batch 560 — Screens updated by the live-update hub instead of a timer (PS-539 phase 2d; readiness review §5)

- **One hook, `hooks/useLiveData.ts`,** keeps a screen current from the hub's `DataChanged` events (Batch 559's topics):
  - it re-reads when the screen's topic (and key) changes; events close together become one read, at most one a second, one at a time, after up to a second at random;
  - it reads once after a reconnection, but not for the first connection;
  - it polls only once a minute while the hub has taken the topic on a live connection, and as before otherwise (no hub, the hub unreachable, the topic refused);
  - only SSO sessions subscribe; password and demo sessions and wall boards without a user poll.
- **Switched:** the registry exceptions badge (60 s), the inbox (20 s), Facility Ops (20 s, by facility), the held reports banner (5 s), the Engraver Monitor (30 s), Site agents per site (60 s) and Interfaces → Engines (60 s, not while hidden). The Print Queue's agent line (all sites) keeps its minute poll.
- **Along the way:**
  - Facility Ops: "out of date" allows two minutes while live (a quiet minute is normal); only the latest read is shown; the clock and "last updated" use the user's language.
  - Held reports: an answer for a case no longer shown is dropped, and the list clears when the case changes; Recall's clock keeps moving while something is held.
  - Engraver Monitor: "Refreshing…" only for a read someone asked for; the status counts moved to `services/engravers/engraverStatusCounts.ts`.
- **Messages:** none new.
- **Independent check:** 3 serious, 7 regressions or gaps, 3 rule points.
  - **Serious (fixed):** wall boards and password sessions would have opened hub connections the hub refuses; a refused topic would have slowed a screen to one read a minute; nothing limited how often a screen read.
  - **Fixed:** the held reports banner could show the previous case's reports; a double read on the first connection; the Engraver Monitor flicker; Facility Ops could show another view's figures; the app-wide connection (documented: one per window, by design); the hook's comment; the clock's locale; the engraver counts moved out of the page.
  - **Left:** a flapping connection restarts the poll timer (resync covers it); tests for the switched screens themselves (the hook is tested).
- **Tests:** Xray PS-646 (automated, 112 of 112 mapped tests passed) and PS-647 (verification gap: the screens with a real hub), both linked to PS-539.

## Batch 559 — Data topics for live updates; Batch 558's open items (PS-539 phase 2d; readiness review §5)

- **Push instead of polling, the contract and client (screens switched in Batch 560):** one hub event, `DataChanged { topic, key? }`, and one method, `SetDataTopics`, for the screens that re-read on a timer (`services/liveUpdates/dataTopics.ts`; `LIVE_UPDATES_SIGNALR.md` §14).
  - Topics: `registryExceptions`, `messages`, `facilityOps` (by facility), `heldReleases`, `engravers`, `siteAgents` (by site), `interfaceEngines`.
  - The event carries ids only, never a patient identifier; the screen re-reads through its own authorised call. The server checks each topic against the signed-in user.
  - `subscribeData` on the live-update service: the SignalR client sends the union of its screens' topics after every (re)connection and every change, one call at a time, retrying a failure on the back-off. With no API server, nothing is sent and the screens poll.
  - Proposed in place of `ReceiveExceptionCountUpdate` (`REGISTRY_ACKNOWLEDGEMENT_API.md`); Pete and the developer to confirm.
- **Batch 558's open items, fixed:**
  - A result message's workup version counts the workup's signed versions. When the server's list of versions (or this browser's) can't all be read, the message is now held ("the workup version is not known") and sent when retried, instead of going out with a version too low (`reports/oruWorkupVersion.ts`, `prepareOruR01Dispatch.ts` reason `version_unknown`).
  - A result sent with a signed version's PDF records the PDF's hash on its queue entry, and every result message carries `reportPdfSha256` when the hash is known. A retry records the hash of the PDF it actually sent (`IOutboundResultQueueService.recordPdfSha256`).
- **Messages:** none new on screen. The held result's text is queue text, in English.
- **Independent check:** 3 high, 4 medium and 2 low.
  - **High (fixed):**
    - held reports were keyed by case id, which can be an accession number, so hub messages could have carried one (now unkeyed);
    - a retry didn't record the hash of the PDF it sent;
    - the doc promised combining events within 100 ms, which the client doesn't do (it is the Batch 560 hook's job; the doc says so).
  - **Medium (fixed):**
    - the last data screen leaving didn't always leave its topics;
    - two quick changes could leave the server on the older scope, and a failed send wasn't retried;
    - the scope's comparison key could collide on keys holding separators;
    - no limits on keys (now 100 per topic, 200 characters each).
  - **Low:** a list this browser couldn't read is now marked partial too (fixed). Still open: the tests for the two other dispatchers' hash and the adapter's hold path (the shared code is tested); added in Batch 561. *Batch 561 correction:* this entry also listed "a held result has no limit on how long it waits for the server" as open. It isn't a gap: in the browser a held result waits on the failed-messages screen for a person to retry it, like a result held for its PDF, and on the server it is a temporary failure for the interface dispatch job, retried 8 times and then dead-lettered to the same screen; later messages for that case wait behind it, so a correction never overtakes the result it corrects (`MESSAGE_BUS_API.md` §5, written in Batch 561).
- **Tests:** Xray PS-644 (automated, 121 of 121 mapped tests passed) and PS-645 (verification gap: the hub's side and the end-to-end checks), both linked to PS-539.

## Batch 558 — Report versions through the API (PS-539 phase 2d; BLOB_STORAGE_API.md §11)

- **One reader for a signed version's PDF:** `services/reports/reportVersionPdf.ts` (`reportVersionPdfReader` in the barrel). Version History, the result message (ORU) and the release after the hold period all read through it.
  - A version signed in this browser: its PDF is checked against the version's `pdfSha256` before it is used.
  - A version the API server lists (hash only): its PDF is read through `GET /api/cases/{caseId}/report-versions/{versionNumber}/pdf?purpose=view|send`, and the bytes must match both the `X-Content-SHA256` header and the version's hash.
  - A PDF that fails its check is refused. Version History says so; a result or release is held with the reason, and an older version is never sent instead.
- **The list:** with the API server, `reportVersionService` (`services/reports/reportVersionInstance.ts`) lists the server's versions (`GET /api/cases/{caseId}/report-versions`, records only, each field shape-checked) with this browser's, each once. When the server's list can't be read, Version History says the list may be incomplete.
- **Numbering:** until the server numbers versions (phase 2e), a version signed here is numbered after the server's versions too, and an amendment of an instance the server holds is sent as CORRECTED, not ADDENDUM. If the server's list can't be read at that moment, the version is still saved, numbered from this browser's alone.
- **Held releases:** checked, no browser endpoint needed. Their PDF is read only by the release job when the delay ends, which runs on the server once `VITE_SERVER_JOBS` lists `release.dueSweep`.
- **Version History:** the "View PDF" button shows for any version with a PDF, wherever it is kept; the PDF's memory is released after a minute.
- **Messages:**
  - `versionHistoryModal.pdfProblems.*` (integrity, notFound, notPermitted, unavailable);
  - `versionHistoryModal.versionsPartial`;
  - all in 5 languages. Korean wants native review.
- **Independent check:** 3 high, 3 medium and 2 low.
  - **High (fixed):**
    - a version signed here while the server held earlier ones would have been numbered 1 again;
    - an amendment of an instance the server holds would have been sent as ADDENDUM;
    - a hash failure read as "sent when retried" (the message now says it is not sent and to tell the administrator; a passing outage stays retryable, as for report documents).
  - **Medium:**
    - the server's other version fields were taken unchecked (fixed: each field shape-checked, unknown ones dropped);
    - the ORU's workup version counts only this browser's versions when the server's list can't be read (open, below);
    - a version PDF sent as a result records no `pdfSha256` on the queue entry (open, below; a release stores it as a report document, which does).
  - **Low:** the object URL was never released (fixed); the partial notes now match; the duplicated error mapping now shares report documents'. The audit of opening a version names the case as its id, as since Batch 437 (left as it is).
- **Corrections:** `pdfSha256` on a report version was the hash of the base64 text, not of the PDF's bytes (Batch 461), unlike report documents and the server contract. New versions hash the bytes; the reader accepts both. Corrected in `ReportVersionRecord.ts`, `ORGAN_MAPPING_API.md` and `BLOB_STORAGE_API.md`.
- **Open:** the endpoints themselves (phase 2e); the workup version count and the queue entry's hash above.
- **Tests:** Xray PS-642 (automated, 121 of 121 mapped tests passed) and PS-643 (verification gap: the server's version endpoints and the end-to-end checks), both linked to PS-539.

## Batch 557 — The server's /api/config and hosting regions (PS-539 phase 2d; readiness review §9 items 1 and 7)

- **Start-up:** with an API server, the app reads `GET {api}/api/config` after config.json and before any service is created (`runtimeConfig/loadRuntimeConfig.ts` `withServerConfig`; `RUNTIME_CONFIG.md` §5a). It is public and read with no credentials and no cache.
- **Settings from the server:** only those marked `fromServer`: the AI model, its managed deployment, token limit and region, and voice.
  - Everything else stays with the site: sign-in, the instance role, `VITE_SERVER_JOBS`, the AI provider, the breached-password check, the enhancement address (`NOT_FROM_SERVER`), and every address, because the security policy is made from config.json's (`ADDRESS_NOT_FROM_SERVER`).
  - Which value wins: config.json, then the server, then the build.
  - The build rules are checked on the merged settings.
- **When /api/config isn't there:** a 404, or no complete answer within 5 s (body included), means config.json alone, with a console warning. A malformed one stops the app, and the error screen says the problem is in the server's `/api/config`.
- **Hosting regions:** the database and file storage regions (`hosting`) are shown to administrators in the AI provider settings, under "Where PathScribe keeps data", beside the AI region (`components/Config/AI/HostingRegionsCard.tsx`).
- **Messages:**
  - `hostingRegions.*`;
  - `runtimeConfigError.fromServer`, `.problems.ADDRESS_NOT_FROM_SERVER` and `.problems.NOT_FROM_SERVER`;
  - all in 5 languages. Korean wants native review.
- **Independent check:** 2 medium-high, 3 medium and 5 low; all fixed.
  - **Medium-high:**
    - the time limit didn't cover the reply's body;
    - the server could set sign-in, the instance role and other settings that must stay with the site.
  - **Medium:**
    - `VITE_SERVER_JOBS` from the server would make jobs run twice if `/api/config` were missed;
    - a rule problem caused by a server value was blamed on config.json (moot now that the server can't set those);
    - the docs.
  - **Low:**
    - the build's address checked before use;
    - the hosting note's wording;
    - the hosting block's rules documented;
    - the example address.
- **Corrections:** `deploy/runtime-config/config.example.json` gave `VITE_API_BASE_URL` ending in `/api`; the app adds `/api/...` itself, so the address is the server's root.
- **Tests:** Xray PS-640 (automated, 94 of 94 mapped tests passed) and PS-641 (verification gap: the server's /api/config and the end-to-end checks), both linked to PS-539.


## Batch 556 — Report documents through the API (PS-539 phase 2d; BLOB_STORAGE_API.md §11)

- **With the API server:** released report documents are read through it (`reportDocuments/httpReportDocumentService.ts`):
  - `GET /api/report-documents/{id}?purpose=view|send`, with the SHA-256 checked again against `X-Content-SHA256`; a different id is refused;
  - `GET /api/cases/{caseId}/report-documents`.

  A release made in this browser keeps its document here, in memory, until the release moves to the server. So the store reads this browser's first, then the server's, and lists both.
- **One store for every reader** (`reportDocuments/reportDocumentInstance.ts`, `reportDocumentService` in `@/services`): View as sent, print retries, delivery, the release event, Assist, the ORU resolver, cytology result retries and the cytology case report. In the demo it is the same store as before.
- **What changes on screen and in the channels:**
  - **Version History:** View as sent says when the document can't be fetched or isn't permitted, and notes when the server's list couldn't be read.
  - **Print retries:** a print retry stays retryable when the server doesn't answer.
  - **Cytology Print case report:** it refuses to print rather than print something else when the list is incomplete.
- **Contract additions** (`REPORT_DOCUMENT_STORE_API.md` §2):
  - the record's headers;
  - exposing them to the browser across hosts (CORS);
  - `?purpose=` (view is audited as a rendering, send with the channel);
  - system retries use a service identity on the server.
- **Messages:** `versionHistoryModal.sentDocuments.notPermitted`, `.unavailable` and `.listPartial`, in 5 languages. Korean wants native review.
- **Independent check:** 1 high, 3 medium and 6 low; all fixed except one test that spies on the demo store directly (it is the same object in tests).
  - **High:** without the headers exposed across hosts, every read would have looked tampered with. The contract now requires them, and a missing hash reads as "couldn't be fetched".
  - **Medium:**
    - the cytology case report could print a fresh render when the list was incomplete;
    - a passing outage failed a print for good;
    - the status in `BLOB_STORAGE_API.md` overstated what is done.
  - **Low:**
    - which side audits a read;
    - checking the record's values from headers;
    - hashing the bytes once;
    - the import path;
    - the docs.
- **Tests:** Xray PS-638 (automated, 141 of 141 mapped tests passed) and PS-639 (verification gap: the document endpoints and the end-to-end checks), both linked to PS-539.


## Batch 555 — Browser stand-ins for server jobs (PS-539 phase 2d; readiness review §7 and §9 item 3)

- **What changed:** the browser stops standing in for a server job once the deployment says its API server runs it. `config.json`'s `VITE_SERVER_JOBS` (new setting; `RUNTIME_CONFIG.md`) lists recurring job names from `MESSAGE_BUS_API.md` §5.
  - Until a job is listed, the browser keeps running it while someone is signed in.
  - So a delivery, an alert, an escalation or a release is never done twice, and never left with no runner while its data is still in the browser.
  - A server build today lists none, so nothing changes until phase 2e.
- **The register:** `services/serverJobs/browserStandIns.ts`. Each stand-in calls `browserRunsServerJob('<job>')` where it starts:
  - delivery retries (the app shell; this also stops applying fax transmission reports from the hub);
  - release-delay releases: the app shell's sweep, and the surgical report page's countdown (`reportRelease/releaseCountdown.ts`), which then reads the case every 15 s until the server has released it;
  - consult-link expiry recording;
  - the registry 72-hour escalation;
  - follow-up alerts;
  - support-access expiry;
  - the cytology–histology sweep.
- **The guard** (`browserStandIns.guard.test.ts`) checks that each stand-in checks its own job, and that the work is started only from the listed files. **The behaviour test** checks that each stays off.
- **Support access:** an approval past its time reads Expired before the expiry is recorded (`effectiveSupportStatus`). Revoke and End accept only access still in force.
- **Carried over from Batch 554:** the engine counts and table cells use the user's number format (`{{count, number}}`, `interfaceEngines.number`).
- **Independent check:** 2 high, 2 medium and 5 low. All are fixed.
  - **High:**
    - the surgical report page's countdown released reports too (now a registered stand-in);
    - switching off by "API server configured" would have left every job with no runner until phase 2e. It is now per job, by `VITE_SERVER_JOBS`.
  - **Medium:**
    - a run-out support approval read "Approved";
    - a stale status row in `MESSAGE_BUS_API.md` §9.
  - **Low:**
    - the guard only looked for the name;
    - no check for new callers;
    - the fax-report subscription is now documented;
    - the two definitions of "API server configured" now differ deliberately (an invalid address keeps the browser running jobs and keeps data in memory, the safe side);
    - the docs.
- **Corrections:** `DEPLOYMENT_READINESS_REVIEW.md` §7's first draft in this batch said the browser runs none of the jobs with an API server. It now says the browser stops each job only once the server runs it.
- **Tests:** Xray PS-636 (automated, 113 of 113 mapped tests passed) and PS-637 (verification gap: each server job, once phase 2e ships it), both linked to PS-539.


## Batch 554 — Interface monitoring (PS-539 phase 2d; readiness review §9 item 4)

- **Contract** (`services/interfaceMonitoring/interfaceMonitoringContract.ts`; `INTERFACE_ENGINE_EDGE.md` §9a):
  - `GET /api/interface/engines` returns `{ serverTime, engines }`: each engine's last heartbeat, when it was received, and the server's status.
  - The rules: what is wrong with a channel; an engine's status (the server's, else by the server's clock); worst engines and problem channels first; totals and listeners down; the line's parts (zero counts left out).
  - A malformed row is dropped or made safe (`normaliseEnginesResponse`).
- **Status change** (`engineEdgeContract.ts` `engineStatus`, §8): a stopped channel is degraded (a listener not taking messages), and a time that can't be read is offline, never "recent".
- **Service** (`interfaceMonitoringService` in `@/services`):
  - checks `interface:engine-status:view` first (new, standard, Admin, requires `screen:audit-log:open`; no audit entry per poll);
  - the HTTP client gives up after 15 s;
  - read only;
  - the demo has no engine.
- **Screen:**
  - **Audit Log → Interfaces → Engines** (`pages/InterfaceEnginesSection.tsx`, with the capability): each engine with its facts and channels; Open Outbound for dead letters.
  - **A line above the Interfaces sub-tabs** (`components/Interfaces/EngineStatusLine.tsx`): problems first, one click to Engines, hidden after a failed read.
  - Reads every minute with the API server, not while the browser tab is hidden (`hooks/useInterfaceEngines.ts`). A refusal clears what was shown.
- **Messages:**
  - `interfaceEngines.*` (counts in plural forms, joined with `formatList`);
  - `auditLog.interfacesTab.subTabEngines`;
  - the capability's label;
  - all in 5 languages. Korean wants native review.
- **Independent check:** 3 high, 5 medium and 6 low; all fixed except number formatting in the counts (low).
  - **High:**
    - a stopped listener showed "Online", and the line didn't flag it;
    - a time that couldn't be read showed a stale engine as online;
    - the batch's docs weren't written yet when it was checked.
  - **Medium:**
    - one malformed row could break the Audit Log page;
    - `'constructor'` passed as a status;
    - old counts stayed after a failed read or a refusal;
    - plurals;
    - hook and line tests.
  - **Low:**
    - the 15-minute figure is now taken from the limit;
    - a time limit on the read;
    - no polling while hidden;
    - unknown values made safe;
    - the warning colour's contrast;
    - an unused age field removed.
- **Corrections:** readiness review §5 now lists the 60-second polls of Batches 552 and 554 (Batch 552's were missing).
- **Tests:** Xray PS-634 (automated, 132 of 132 mapped tests passed) and PS-635 (verification gap: the engines' heartbeat, `/api/interface/engines` and the end-to-end check), both linked to PS-539.


## Batch 553 — Site agent printers in routing (PS-539 phase 2d; readiness review §9 item 6)

Carried over from Batch 552: agent printers in routing rules and Redirect, the update window on screen, quick-pick revoke reasons and the hand-over picklist.

- **Destination** (`types/printRouting/PrintDestination.ts`; `SITE_AGENT_API.md` §3): a `PrintDestination` is a site agent printer (`{ agentPrinter: { siteId, destinationId }, displayName? }`) or a printer address (`NetworkPrintDestination`, which the transports take).
- **Rules** (`services/printRouting/printDestinationRules.ts`, pure and tested):
  - the edit draft (new ones are agent printers);
  - the problems, and the list and audit text (the audit always names the printer's id and site);
  - picking the only printer;
  - the site: the facility for a facility-tier rule and the default; the jobs' own lab for Redirect.
- **A report prints at its own lab:**
  - `PrintJob.performingFacilityId` is recorded at release.
  - A rule naming another lab's agent printer is skipped for that lab's releases.
  - Redirect refuses another lab's printer (`PRINT_JOB_WRONG_SITE`).
  - The routing rule service refuses another site's printer on a facility-tier rule, and any site's printer without `config:print-routing:manage` there.
  - The facility service refuses a default on another site.
- **Sending:** an agent-printer job fails at once with "needs the site agent", not retried, outside the API server (`attemptPrintDelivery.ts`).
- **Printer lists:** `siteAgentAdminService.reportPrinters(siteId, purpose)` (`GET /api/sites/{id}/agent-printers`, printers only):
  - routing needs `config:print-routing:manage`;
  - the facility default needs `config:print-settings:manage`;
  - Redirect needs `print:job:redirect`;
  - each at the site;
  - report printers only.

  No new capabilities. `AUTHORIZATION_API.md` notes the three.
- **Screens:**
  - **`components/Printing/PrintDestinationFields.tsx` and `hooks/useAgentPrinters.ts`:** the routing rule window (performing labs as sites; a refused save keeps the window open with the reason; the list names a printer with its lab) and Print Queue Redirect (the jobs' lab, or a printer address with the reason; a refused redirect says how many jobs weren't redirected).
  - **The facility Printing tab:** the facility's own agent printers.
  - **Site agents:**
    - revoke reasons as quick picks (`{ reasonCode, note? }`, a note only for "other", at most 500 characters);
    - the update window (both times or neither; it may cross midnight);
    - a pickup share's import picked from `orders`/`results`, or a channel with the site's channels suggested.
- **Rule 3 on touch:** the routing rule list's scope and criteria separators, and the Print Queue's queued time (`formatDateTime`).
- **Messages:**
  - `printDestination.*`;
  - `printRoutingRulesSection.errors.*`, `.scopeDescription` and `.criteriaDescription.both`;
  - `printQueueDashboard.redirect.notRedirected_*`;
  - `facilityPrintingTab.destination.noDefault` and `.problems.agentPrinterOtherSite`;
  - `siteAgents.revokeReasons.*`, `.updateWindow.*`, `.share.importKinds.*` and others;
  - all in 5 languages. Korean wants native review.
  - 17 keys the old address-only forms used were removed.
- **Independent check:** 5 medium and 13 low.
  - **Fixed:**
    - a client- or location-tier rule could send a lab's report to another lab's printer at release;
    - refusals closed the rule window and Redirect silently;
    - the docs and comments still said `PrintDestination` was address-only;
    - the redirect audit kept only the printer's name;
    - the "missing printer" check was written in two components;
    - per-site checks on saving a rule;
    - an older job's Redirect hint;
    - the facility-tier hint;
    - only performing labs as sites;
    - the site shown in the rule list;
    - a false "unsaved" after clearing the update window;
    - a note length limit;
    - the locale date;
    - picking the only printer;
    - test gaps (the hook, the service's create and update, refusals, a release to another lab).
  - **Not fixed here:** the facility tab doesn't pick the only printer by itself (opening it would make an unsaved change). Checking that a chosen printer is still on the site's list is the server's job (§3, phase 2e).
- **Corrections:**
  - Batch 552 missed the notes in the ancestor READMEs `src/components`, `src/components/Config`, `src/types` and `docs`; they are added now.
  - Batch 552's §11a table had a stray blank line.
- **Tests:** Xray PS-632 (automated, 202 of 202 mapped tests passed) and PS-633 (verification gap: the agent, the server endpoints and Pete's routing check), both linked to PS-539.


## Batch 552 — Site agent screens (PS-539 phase 2d; readiness review §9 item 6)

A site is a performing-lab facility (Pete, Oct 13, 2026), so `siteId` is the facility's id.

- **Contract** (`SITE_AGENT_API.md` §11a, new; §13 updated):
  - listing a site's agents, or all of them;
  - one-time enrolment codes (single use, 24 hours, shown once);
  - revoking with a reason;
  - a site's agent configuration (printers and file shares) read and saved as one document, sent to the agent on its next check-in.
- **Rules** (`services/siteAgent/siteAgentAdmin.ts`, pure and tested):
  - **Status:** the server's own status is used when it gives one.
  - **Printers:** a unique id; IPv4 or a host name, with no IPv6 for now; the port; a label printer is ZPL on Raw 9100. IPPS on 631 is the default.
  - **Shares:**
    - only `\\server\share` paths, not this machine, a device path or an admin share;
    - pickup patterns are file names only, and never PDFs or images (those are documents, which come through the files API);
    - the rejected folder's name.
  - Values are trimmed before saving.
- **Service** (`siteAgentAdminService` in `@/services`):
  - `config:site-agents:enroll` covers codes and revoking (a reason is required).
  - `config:site-agent-config:manage` covers saving. Viewing needs either capability.
  - All are checked at the site's facility. The all-sites list is filtered to the viewer's facilities.
  - It includes the HTTP client and the demo (no agent can enrol; the configuration is kept under `site_agent_config`, which a demo reset clears).
- **Capabilities:** two new ones, in the configuration group, so Admin and Lab Director get them by default. They are in `AUTHORIZATION_API.md`. The section count is 101.
- **Screen:** Configuration → System → **Site agents** (Workstation & Hardware; `SiteAgentsSection.tsx`, `hooks/useSiteAgents.ts`).
  - The site is the facility chosen in the group's picker.
  - Agents are listed with their status, and refresh every minute with the server.
  - Make a code, with Copy.
  - Revoke inline, with a reason.
  - Printers and shares are edited in place and saved together. Unsaved changes are guarded, including when the facility picker changes (now guarded for every section of the group).
- **Print Queue:**
  - A job the agent could only send (Raw 9100, LPR) shows **Sent to printer** (`PrintJob.confirmation`, `printJobStatusKey`).
  - A status line counts the agents online, needing attention and offline, with a link to Site agents (`SiteAgentStatusLine.tsx`).
- **Shared:** `utils/copyText.ts`.
- **Messages:**
  - `siteAgents.*`, `systemTab.sections.siteAgents` and `printQueueDashboard.status.SENT_TO_PRINTER`;
  - the two capability labels;
  - all in 5 languages. Korean wants native review.
- **Independent check:** 3 high, 6 medium and 6 low; all fixed.
  - **High:**
    - a code or configuration from the previous site could show after a site switch;
    - revoking discarded unsaved printer edits;
    - the section had its own site picker beside the group's, with no unsaved-changes guard.
  - **Medium:**
    - host and share path checks let bad values through, and values weren't trimmed;
    - a failed load left the section spinning;
    - status used the workstation's clock and never refreshed;
    - pickup patterns could match folders or documents;
    - the IPPS default port was 443, not 631;
    - a label printer could be set to a protocol it can't use.
  - **Low:**
    - the revoke row closed even when revoking failed;
    - no note when Copy failed;
    - the status line showed with only revoked agents;
    - a literal space in the status line;
    - no warning on the "delete after hand-over" choice;
    - no check of the rejected folder's name.
- **Moved to Batch 553:** choosing an agent printer in routing rules and Redirect (the printer reference becomes site plus printer, which touches about 20 files).
- **Planned:** the update window on screen, instruments (agent v2), quick-pick revoke reasons and a hand-over picklist.
- **Tests:** Xray PS-630 (automated, 134 of 134 mapped tests passed) and PS-631 (verification gap: the real agent and the server endpoints), both linked to PS-539.


## Batch 551 — Server jobs view (PS-539 phase 2d; readiness review §9 item 10)

- **Contract** (`services/serverJobs/serverJobsContract.ts`; `MESSAGE_BUS_API.md` §4a):
  - the job kinds and the recurring jobs, with their intervals;
  - `/api/jobs/health`, `/api/jobs/dead-letters` and `/api/jobs/{id}/requeue`;
  - `REQUEUE_ROUTE`: interface and print jobs keep their own screens and capabilities;
  - `recurringJobOverdue` (judged against the server's time) and `kindNeedsAttention`;
  - `deadLetterContext`, plus handling for `event:{consumer}` and unknown kinds.
- **Service** (`serverJobsService.ts`; `serverJobsService` in `@/services`):
  - `jobs:server-job:view` is checked before any read, and dead letters are filtered to the viewer's facilities.
  - `jobs:server-job:requeue` is checked at the job's facility and case, or every facility when it names neither.
  - Interface, print and unknown kinds are refused (`WRONG_SCREEN`).
  - It includes the HTTP client.
- **Capabilities:** two new ones, seeded for Admin (`SERVER_JOBS`), in `AUTHORIZATION_API.md`.
- **Screen:** System Logs → **Server jobs** (`pages/ServerJobsSection.tsx`, `hooks/useServerJobs.ts`).
  - The tab shows only with the view capability. A link to it without the capability opens the Audit tab.
  - It has the health by kind, the recurring jobs, and the dead letters with a kind filter.
  - Requeue takes one click, with the outcome above the list.
  - Interface and print jobs open Interfaces → Outbound or the Print Queue instead.
  - The demo explains that the browser does this work itself.
- **Shared:** `services/apiServer/apiServerUrl.ts` holds the API address, checked as sign-in checks it. Exports use it too.
- **Carried over from Batch 550:** with exports through the server, the registry transmission audit doesn't read its queues in the browser.
- **Corrections:** `MESSAGE_BUS_API.md` §4 said dead-lettered deliveries show in the delivery exception queue. They are requeued from Server jobs, as readiness review §9 item 10 says, and the delivery exception queue still shows the delivery itself.
- **Messages:** `serverJobs.*`, `auditLog.tabs.serverJobs` and the two capability labels, in 5 languages. Korean wants native review.
- **Independent check:** 1 high, 5 medium and 5 low; all fixed.
  - **High:** a facility-limited user could requeue another facility's job when the job had no facility. Now checked at the job's case, or every facility.
  - **Medium:**
    - dead letters weren't filtered by facility;
    - §4a was missing and §4 contradicted the batch;
    - "overdue" used the workstation clock;
    - the requeue message vanished with its row, and a test passed only because its fake never dropped the job;
    - an unknown kind crashed the tab.
  - **Low:**
    - hook races, and unhandled errors on requeue;
    - the deep link without the capability;
    - an extra click to reach the right Interfaces sub-tab;
    - optional recurring jobs flagged forever;
    - the error text is now tagged for redaction.
- **Checks:**
  - type-check clean;
  - full suite: 9,571 tests passed and 33 skipped, in 1,131 files (only `firestore.rules.test.ts` fails, as it needs the emulator);
  - demo and server builds pass;
  - Chromium smoke test passes.
- **Still open:** the `/api/jobs` endpoints (India team, phase 2e) and a check against them, plus a browser check of the tab with sign-in.
- **Xray:** PS-628 (automated), PS-629 (open points).

## Batch 550 — Exports through the server (PS-539 phase 2d, D7)

- **The export service** (`services/exports/exportTracker.ts`, `httpExportApi.ts`, `runExport.ts`; `exportService` in `@/services`). Every export button calls it.
  - **No API server (the demo):** the browser builds the file, as before.
  - **With one:**
    - It posts `/api/exports` and asks for the status every 0.5 s.
    - Ready within 3 s: downloads with no notice.
    - From 1 s: shows "preparing".
    - Then it waits for the hub's `ExportStatus`, or re-reads every 15 s.
    - Download asks for a fresh link (the capability is checked again on the server).
    - A double click sends one request.
    - Signing out clears the notices (`auth/sessionEndHooks.ts`).
- **The buttons, all 26 export kinds, with the screen's filters:**
  - the QA tabs, through `exportQaReportRows` (now with a `parameters` argument) and `qualityAssurance/runQaExport.ts`;
  - the registry transmission audit;
  - the Audit Log's four logs and the Billing Log (typed filters, with the facility time zone);
  - My Contributions (2);
  - case search;
  - the disposal report;
  - change history.

  Guard: `exports/exportRouting.guard.test.ts`.
- **Hub:** `ExportStatus` (`HUB_EXPORT_STATUS`, `parseExportStatusEvent`) and `subscribeExports` on the live-update service.
- **Screens:**
  - `components/Exports/ExportNotices.tsx`, in the bottom-left feedback column;
  - `pages/MyExportsPage.tsx` at `/my-exports`;
  - a **My exports** button in the top bar with a ready badge (with the API server only).

  CSS: `.ps-export-notice*` and `.ps-myexports-*`.
- **Messages:** `exports.notice.*`, `exports.problem.*` (11 problems), `myExports.*` and `navBar.myExports*`, in 5 languages. Korean wants native review.
- **Contract (`ASYNC_EXPORT_API.md`):**
  - §2a: the parameters each kind sends.
  - §3: response statuses, `ExportErrorBody`, `ExportDownloadLink`.
  - §5: as built.
  - §7: done.
  - §10.
- **Corrections:**
  - §5 said "the bell". PathScribe has none, so My exports is in the top bar.
  - §8 said parameters carry no patient names, but Case Search and the Billing Log filters can. Parameters are now treated as PHI (encrypted, never listed or logged, deleted with the file; the record keeps a hash).
- **Independent check:** 3 high, 5 medium and 5 low. All fixed except the two noted below.
  - **High:**
    - patient data in parameters (doc §8, and typed filters);
    - notices outliving sign-out (reset on sign-out);
    - a routing guard that passed for the wrong reason (now checked per call site, and tried against a probe file).
  - **Medium:**
    - a stale re-read turning ready back into preparing;
    - a refused link reported as downloaded, and `//` links accepted;
    - the API address not validated as sign-in does;
    - no feedback during the 3 s wait (notice from 1 s, and de-duplication);
    - display labels sent instead of filters, and the escalated queue sent as active.
  - **Low:** 401 is shown as "sign in again"; refused-notice ids; the 3 s wait bounded on a slow network; unknown codes; out-of-order reloads.
  - **Left, and noted:**
    - the registry audit still reads the queues in the browser before the server builds the file (harmless, wasted work);
    - the parameters are the screen's filters until the API types them (phase 2e).
- **Checks:**
  - type-check clean;
  - full suite: 9,556 tests passed and 33 skipped, in 1,129 files (only `firestore.rules.test.ts` fails, as it needs the emulator);
  - demo and server builds pass;
  - Chromium smoke test passes.
- **Still open:** the server's export endpoints, job, blob storage and hub method (phase 2e), and a browser check of the server path with sign-in.
- **Xray:** PS-626 (automated), PS-627 (open points).

## Batch 549 — Open items carried over from earlier batches (PS-539 phase 2d)

Pete, Oct 13, 2026: "the open bits get added into the next batch." This batch takes every open item from Batches 537–548 that can be finished in code here. The full inventory, including what can't be finished here and why, is in the PS-539 comment.

- **Loading text (from 548):**
  - `LoadingState` has an inline variant: in the place's own class, or a span inside a line or table cell.
  - The remaining loading texts in 56 files use it.
  - `latency.guard.test.ts` now covers every loading text in the app.
- **Reconnect (from 548):** `retryNow()` on the live-update service, called when the browser comes back online.
  - A restart that is waiting out its back-off starts at once.
  - A connection in SignalR's own reconnect loop is stopped and started again (the independent check found that this case was missed at first).
- **Preload (from 547):** a build plugin (`scripts/vite/preloadAppStart.ts`, `scripts/static-chunk-closure.mjs`) adds `modulepreload` tags for the app's code, so it downloads while `config.json` is read.
- **Links only (from 544):** the https check is shared (`services/links/externalLink.ts`). It applies to:
  - the facility and department letterhead logo;
  - the gross imaging vendor's address.

  It is checked in the editors and in the services (`invalidLink`). Message: `links.invalidHttpsLink`.
- **F1 (from 537):** the unmounted engine-notification hook and the Firestore read only it used are removed (`DELETED_FILES.txt`).
- **`jspdf` (from 539):** removed from `package.json`; nothing imported it.
- **Assist signed time (from 538):**
  - An Assist case release carries the case's sign-out time (`finalizedAt`) when the signer is the pathologist who signed it out.
  - Someone else releasing it keeps the time of release.
  - The stored document's `releasedAt` is the time of release. A rebuild passes the original.
- **Report documents (from 538):** one storage entry per document's bytes, plus a small list of records.
  - Older entries are still read.
  - A record whose bytes are gone says `bytesMissing`, not "integrity".
- **F10 (from 545):** the other two engine webhooks no longer claim before writing.
  - cassette-dispatch-outcome writes its record and the claim in one transaction (`createWithClaim`). A record already there is answered "already processed".
  - engraver-status claims inside its status transaction.
- **F3 (from 546):** the Print Queue shows "needs the site agent" in the user's language (`printing/printJobFailureReason.ts`). Message: `printQueueDashboard.failure.needsSiteAgent`.
- **Docs:**
  - The readiness review is updated for F1, F3 and F10 and §9 items 1 and 2. Two references are corrected: the F4 test number, and F6's cytology template, done in Batch 539.
  - Also updated: `RUNTIME_CONFIG.md`, `BLOB_STORAGE_API.md`, `LIVE_UPDATES_SIGNALR.md`, `INTERFACE_ENGINE_EDGE.md`, `ASYNC_EXPORT_API.md` and `REPORT_DOCUMENT_STORE_API.md`.
- **Tried and taken out:** checking an organisation-scoped QA export against that organisation's facilities (PS-610).
  - The independent check showed why. The organisation's rows are chosen by the case's origin hospital, through the legacy map. The facility tree places some of those cases' ordering facilities outside the organisation.
  - So the check could pass an export that holds rows from facilities the person isn't assigned to.
  - It stays "all facilities", the safe reading, until the Organisation-to-Facility migration.
- **Independent check:**
  - **High (2):** the organisation scope above, and a guard broken by citing deleted files.
  - **Medium (4), all fixed:**
    - the reconnect loop;
    - the document `releasedAt`;
    - a record without a claim;
    - the link check only in the editors.
  - **Low (4):** inline loading text changed some layouts (fixed: with a class it's a block); "bytes missing" told apart (fixed); doc lines (fixed); a status inside the spell-check menu (left; noted).
- **Still open:** see the PS-539 comment. In short, these need something not available here:
  - browser checks with sign-in;
  - the API server and the India team;
  - the staging host;
  - Korean native review;
  - the Organisation-to-Facility migration.

  The remaining phase 2d work (exports through the server, the Server jobs view, the site agent screens, interface monitoring, retiring browser stand-ins) continues from Batch 550.
- **Checks:**
  - type-check clean;
  - full suite: 9,517 tests passed and 33 skipped, in 1,124 files (only `firestore.rules.test.ts` fails, as it needs the emulator);
  - demo and server builds pass the bundle check;
  - Chromium smoke test: the sign-in page renders with no errors.
- **Xray:** PS-624 (automated), PS-625 (open points).

## Batch 548 — Connection banner and waiting states (PS-539 phase 2d item 2)

- **Rules:** `services/connectivity/latencyStates.ts` (new, pure; readiness review §8).
  - Waiting: nothing under 300 ms, a placeholder from 300 ms, "still working" from 3 s.
  - The connection: the browser's network first, then the live-updates hub, only when it's in use. A problem shows after 2 s, and "Connection restored" for 4 s only when the hub is live again. A problem that returns meanwhile shows at once.
- **Hooks:** `hooks/useLoadingPhase.ts` and `hooks/useConnectionBanner.ts` (new).
- **`components/Connectivity/ConnectionBanner.tsx` (new):**
  - mounted once in `SignedInApp.tsx`, below the top bar;
  - it doesn't catch clicks, so it never blocks the case search;
  - announced politely to screen readers; nothing to dismiss.
- **`components/Common/LoadingState.tsx` (new)** replaces the plain `.ps-conf-loading` text on 42 screens: Configuration sections, QA tabs, molecular pages, the intraop queue and others. The old CSS is removed.
- **`components/Common/PageLoader.tsx` (new)** is the route fallback for `App.tsx` and `SignedInApp.tsx`, which each had their own copy. The spinner appears after 300 ms; there's a hidden label for screen readers, and "still loading this page" after 3 s.
- **Guard:** `services/connectivity/latency.guard.test.ts`.
- **Independent check:** found 1 high, 4 medium and 6 low issues, all corrected or listed in PS-622.
  - **High:** the banner covered the case search.
  - **Medium:**
    - it sat inside the print-feedback stack;
    - its text promised polling and catching up that most screens don't do;
    - the hub's "offline" can mean only "not yet reachable";
    - `aria-busy` silenced the announcements.
- **Still open:**
  - about 50 other screens with their own loading text;
  - the hub reconnecting at once when the network returns;
  - a keyboard and screen-reader check in a browser.
- **Messages:** `loadingState.{page,slow,slowPage}` and `connectionBanner.{offline,reconnecting,reconnected}.{title,detail}`, in 5 languages. Korean wants native review.
- **Xray:** PS-621 (automated), PS-622 (open points).

## Batch 547 — Runtime configuration: one build for every deployment (PS-539 phase 2d)

- **`config.json` at start-up.** `src/main.tsx` reads `/config.json` (never cached) before any other part of the app loads, then starts it (`src/startApp.tsx`, what `main.tsx` did before).
  - A deployment sets its 36 settings there, with the same names as the `VITE_*` variables.
  - No file (404, or the host's own page) means the build's values, as before. This is the demo.
- **New `services/runtimeConfig/`:**
  - `runtimeSettings.ts`: the settings, and the check of a config.json (`parseRuntimeConfig`);
  - `loadRuntimeConfig.ts`;
  - `runtimeEnv.ts` (`appEnv()`). Every `import.meta.env.VITE_*` read in 16 files now goes through it, each variable named, never the whole object.
- **The rules:**
  - known names only;
  - server addresses https, as the services take them (plain http only to this computer, in development);
  - proxies may be a path on this site;
  - a server build needs `VITE_API_BASE_URL` and `VITE_AUTH_MODE` = `sso`;
  - a demo build refuses an API server, hub, renderer or interface receiver, and `production`.
- **The error screen.** A broken rule shows `components/RuntimeConfigError/RuntimeConfigErrorScreen.tsx`: each problem by setting name, never the value.
- **Server builds:**
  - `npm run build:server` is `vite build --mode server` (`__DEMO_TOOLS__` false).
  - The demo accounts load only behind `__DEMO_TOOLS__` (`authSessionInstance.ts`, `mockStaffPasswordService.ts`), so a server build has none; `check-production-bundle.mjs` fails if it does.
  - *Correction:* before this batch they were left out only of builds made with `VITE_AUTH_MODE=sso`.
- **CSP:** `generate-security-headers.mjs --runtime-config config.json` adds config.json's addresses to the policy (`originsWithRuntimeConfig`).
- **Deployment:** `deploy/runtime-config/` has `config.example.json` and how to serve the file. The full account is `docs/architecture/RUNTIME_CONFIG.md`.
- **Corrections:**
  - `AUTHENTICATION_OIDC.md` and `LIVE_UPDATES_SIGNALR.md` called these settings build-time;
  - the readiness review §9.1 and §12 item 5 are marked done;
  - `.env.example`.
- **Checked in a browser:** the demo build starts as before. A config.json giving a demo build an API server shows the error screen.
- **Independent check:** found 2 high, 6 medium and 5 low issues, all corrected (or listed in PS-618). The high ones:
  - a server build could have signed in with the demo accounts if config.json left out the sign-in mode;
  - config.json accepted addresses the services then refused.
- **Messages:** `runtimeConfigError.{title,intro,help}` and `runtimeConfigError.problems.*` (12 codes), in 5 languages. Korean wants native review.
- **Xray:** PS-617 (automated), PS-618 (open points).

## Batch 546 — Site agent contract (D3); F3 and F4 fixed (PS-539)

- **`docs/architecture/SITE_AGENT_API.md` (new, phase 2c, decision D3)** is the contract between the site agent (a .NET Worker Service per site) and the API server. Version 1 covers report and label printers and Windows file shares. It specifies:
  - **Enrolment:** a one-time code (128-bit, 24 hours), a CSR and an HSM-held CA. Mutual TLS runs on the agent's own host, revocation is checked per request, and certificates renew 30 days ahead.
  - **A local allow-list set by the hospital:** printer subnets and ports, share roots and download hosts, never changed from PathScribe.
  - **Getting work:** jobs come over an outbound WebSocket (`/hubs/agent`), or a long poll, using claim, a 120 s lease and renewals.
  - **At most once:** the agent saves "started" before sending, and an interrupted job is `IN_DOUBT`, never resent by itself.
  - **Expiry, on the server's clock:** 4 hours for reports, 10 minutes for labels.
  - **"Sent to printer"** (Raw, LPR) versus **"Printed"** (IPP/IPPS), mapped to the Print Queue, `PrintJobStatus` and file drop.
  - **Retries:** labels are never retried by themselves (Pete, Sep 26).
  - **Store and forward,** encrypted with DPAPI at machine scope.
  - **File drop** with a done-log.
  - **File-share pickup:** stable-and-exclusive, a 7-day de-duplication key, data files only (links-only rule), and `processed` and `rejected` folders.
  - **Signed updates:** Authenticode plus Ed25519 over the whole manifest, key rotation, rings and rollback.
  - **Heartbeat and status:** a printer that's off with nothing waiting isn't a fault.
  - **Acceptance tests:** 10, with Pete's D3 check first. The staging machine and the evidence are defined.
- **`src/services/siteAgent/siteAgentContract.ts` (new, pure)** holds the types and rules, with tests.
- **F3 fixed:** a network report print from the browser threw "Buffer is not defined". On release it left the job `QUEUED` with no retry; on a retry it failed after its retries ran out.
  - Now it fails at once with `NEEDS_SITE_AGENT` (`printing/transport/networkPrintRuntime.ts`, `attemptPrintDelivery.ts`).
  - It is not retried: `retriable: false` goes through `dispatchPrintJob` and `publishReportReleasedEvent` to `scheduleDeliveryRetry`, which dead-letters it at once, with the fallback and the alert.
  - A transport that throws now fails the job.
- **F4 fixed:** the Content-Security-Policy allows the workstation agent (`wss://` and `https://127.0.0.1:9100-9102`) and QZ Tray (`wss://localhost` and `wss://localhost.qz.io`, ports 8181 to 8484, plus its `ws://` ports on plain http). These are loopback only, with `workstationBridges: false` to leave them out (`deploy/security-headers/securityHeaders.mjs`). The configs and `vercel.json` are regenerated.
- **Corrections:**
  - `INTERFACE_TRANSACTIONS.md`: `PRINT_JOB` is a report PDF.
  - `REPORT_DELIVERY_API.md`: print confirmation; Windows shares.
  - `MESSAGE_BUS_API.md`: `print.dispatch` (a key that didn't exist, 4 attempts, the label timer).
  - Readiness review: F3 also failed at release, on `Buffer`; stale CSP lines.
  - `printCassetteSlideLabel.ts` header: the workstation agent route.
- **Independent check:** found 3 high, 10 medium and 7 low issues in the first draft, all corrected (or listed in PS-615). The high ones:
  - auto-retrying labels against Pete's rule;
  - at-most-once printing that couldn't be enforced;
  - an agent that could be pointed at any host.
- **Messages:** none new. The F3 reason is plain English in the job, as other print errors are.
- **Xray:** PS-614 (automated), PS-615 (open points).

## Batch 545 — Interface engine edge contract (D6), finding F10 fixed (PS-539)

- **`docs/architecture/INTERFACE_ENGINE_EDGE.md` (new, phase 2c, decision D6)** is the contract between BridgeLink and the API server. The engine runs hosted or on site, from one image. It covers:
  - **Security:** per-tenant system credentials, with the tenant taken from the credential.
  - **Inbound:** a normalised JSON envelope with MSH-10, 11 and 12, and an event time with an offset. An answer table (200, 409, 422, 401) says what the engine does with every status.
    - Each message is applied once, keyed by tenant, sending system and MSH-10, in the same transaction as the change.
    - Messages are kept in order per key, and stale updates are ignored by event time.
    - A retry limit of 24 hours.
    - A test message is refused on production.
  - **ACK:** accept or application mode, following MSH-15/16 when the sender sets them, with a 30-second limit so a hospital's feed doesn't stall.
  - **Outbound:** pushed to a hosted engine, pulled by an on-site one.
    - Settled by the HL7 ACK. AE and CR fail at once; AR, CE and no answer are resent with the same MSH-10 for 24 hours.
    - Dead letters alert Admin and Lab Director. A dead-lettered result holds the later messages for its case.
    - Fax and file drop are exempt.
  - **Running on site:** signed updates, store and forward, local alerts, backups, NTP and logs.
  - **Health:** `/health/live` and `/health/ready` give the same answers everywhere. A heartbeat gives online, attention, degraded or offline, by the server's clock.
  - **Acceptance tests:** nine, with Pete's D6 check first.
- **`src/services/interfaceEngine/engineEdgeContract.ts` (new, pure)** holds the types and rules, with tests.
- **F10 fixed:** the block-exception and material-location webhooks claimed the `messageId` before applying the change. A 404 (case not there yet) or a failure kept the claim, so the engine's redelivery was answered "already processed" and the event was lost. They now claim inside the case update's own transaction (`api/webhooks/engine/_lib/applyEngineCaseUpdate.ts`).
- **Corrections:** readiness review §6.2 items 3, 4, 7 and 8 had described the edge as already working that way (MSH-10 keys, dead-letter alerts for interface queues, outbound ACK checking, normalised JSON only). Findings F11 (outbound posted from the browser with no credential; one shared webhook secret) and F12 (interface queues have no automatic retry or alert) are added. `FEATURE_OVERVIEW.md` no longer says "a standard message broker" (decision D1).
- **Independent check:** found 7 high, 8 medium and 5 low issues in the first draft. All were corrected, or are listed in PS-613. The main ones:
  - on-site engines needed an inbound connection;
  - resends were swallowed;
  - AR was treated as final;
  - enhanced ACK mode was missing;
  - stale checks used the server's clock;
  - one message could block a key for ever;
  - F10 still lost events on a failed update.
- **Messages:** none new.
- **Xray:** PS-612 (automated), PS-613 (open points).

## Batch 544 — Images and attachments are links only; single-facility QA exports (PS-539)

Two decisions from Pete, Oct 13, 2026.

- **Links only:** "Like all images and file attachments, PathScribe should not store photos itself for labs without imaging systems — it should store links only."
  - **`docs/architecture/BLOB_STORAGE_API.md` rewritten.** PathScribe stores only the files it makes itself: report documents, report versions, held releases and exports. The Batch 543 draft had planned containers for photos (`images`), referral PDFs (`attachments`), `signatures`, `branding`, and an upload area with malware scanning. These were never built, and they are removed (**correction**: they went against this rule).
  - **New §6, links:** https only, the hospital's own system, and how the report renderer may fetch a logo or signature (allowed domains, no private addresses, bytes and hash in the PDF).
  - **New §7, no uploads to keep:** a camera photo passes through to the imaging system.
  - **Organ-map PNGs stay:** PathScribe draws them, so they are its own output.
  - **Staff signature (the one image PathScribe did keep):** Configuration → Staff now takes an https link to the signature image (`SignatureLink`), not a file read into a data URL.
    - `staff/staffFormChecks.ts`: `isHttpsLink` refuses `data:`, `http://`, credentials and single-label hosts; problem `invalidLink`; `signatureLinkOnOpen` opens an old image signature empty, with a note, so the record can still be saved.
    - The preview loads only once the field is left.
  - **Guard:** `phase2cContracts.guard.test.ts` fails if any screen takes an image file again, or the contract plans an image or attachment container.
  - **Readiness review** row 21, §11 and the diagram are corrected.
- **Single-facility QA exports:** "QA exports should allow single-facility export instead of forcing 'all facilities'."
  - New `services/qualityAssurance/qaScopeRows.ts`:
    - rows are placed by their own facility, else by their case's ordering facility;
    - a row whose facility can't be told appears only enterprise-wide;
    - `defaultQaScope`: someone assigned to one facility opens on it;
    - `qaScopeFacilityOptions` always offers the facility in force;
    - `qaExportFilename`;
    - `scopeLabel` moved here.
  - New hook `hooks/useQaCaseScope.ts`: holds the scope and loads the cases. A cross-tenant read is audited.
  - The scope picker is added to:
    - Follow-up not received;
    - FPPE (facilities only, as assignments carry no case);
    - Inspection Mode;
    - QA Dashboard;
    - Deficiencies (active and closed, with their tiles);
    - Billing deficiencies (with their tiles).
  - Each export is checked for the one facility chosen (`qaScopeContext`), and the file is named for it.
  - Still "all", with reasons in `ASYNC_EXPORT_API.md` §2: the enterprise rollup, management reviews and patient match review.
  - `asyncExportContract.ts`: the scope comment is updated.
  - `quality/resolveQaEvidenceBinder.ts`: the binder file name names the scope.
- **Independent check:** found 3 high, 7 medium and 5 low issues, corrected (remaining limits in PS-610). The main ones:
  - organisation scope with facility-only rows;
  - a facility-limited user opening on a refused "all";
  - the picker showing a different scope from the list;
  - tiles not matching the scoped lists;
  - an unaudited cross-tenant case read;
  - link checks and renderer fetch rules;
  - old signatures blocking a save;
  - over-stated doc claims.
- **Messages:** `staffTab.signatureLink.{alt,hint,label,placeholder}`, `staffTab.validation.{invalidLink,signatureNeedsLink}` (5 languages; Korean wants native review). `staffTab.signatureUpload.*` removed.
- **Xray:** PS-609 (automated), PS-610 (open points).

## Batch 543 — CSV formula injection fixed (F8), disposal export audited (F9), file storage contract (PS-539)

- **F8 fixed (security):** `utils/csv.ts` gains `neutralizeFormula`, `csvField` (now exported) and `csvQuoted`.
  - A text cell starting with `=`, `+`, `-`, `@`, a tab or a carriage return gets a leading apostrophe, so Excel shows it as text instead of running it (OWASP "CSV injection").
  - Numbers and number-like text ("-5", "+1.5") are unchanged. A value already starting with apostrophes before such a character gets one more.
  - `parseCsvRows` removes one apostrophe again, so an export re-imports exactly.
  - Every CSV writer now uses it: `toCsv`, `csvExport.buildMetaHeader`, `search/caseSearchCsv.ts`, and the Audit Log, Billing Log and Action Registry exports.
  - The Action Registry import now parses each line as CSV (`parseCsvRows`). Before, it stripped every quote, so a label containing a quote was reported as changed.
- **F9 fixed:** the disposal report export is recorded as `DOCUMENT_EXPORTED`, with the file name, row count and facility (`retentionPolicy/exportDisposalReport.ts`).
- **`docs/architecture/BLOB_STORAGE_API.md` (new, phase 2c):** file storage behind `IBlobStore`.
  - Every place a file lives today, organ-map PNGs and staff signatures included, and its server container.
  - Per-blob locks set after the record commits: version-level immutability on Azure; Object Lock in governance mode on S3 and MinIO.
  - Browser uploads go through a staging container with a malware scan.
  - Retention classes per jurisdiction, legal hold and disposal.
  - Read links valid for 15 minutes, integrity checks (`DOCUMENT_INTEGRITY`), and contract tests.
- **Corrections:**
  - `REPORT_DOCUMENT_STORE_API.md` now gives the order of writing: bytes, then record, then lock.
  - Readiness review row 21: photos aren't base64 in the browser; they go to the lab's imaging system.
- **Independent check:** found 3 high, 7 medium and 5 low issues in the draft and the code, all corrected (or kept as noted in PS-605).
- **Messages:** none new. CSV cells may now show a leading apostrophe in Excel (documented in `GUIDE_UPDATES.md`).
- **Xray:** PS-604 (automated), PS-605 (open points).

## Batch 542 — Phase 2c contracts: jobs and events (D1), asynchronous exports (D7) (PS-539)

Two contracts for the India team, from Pete's Oct 13 decisions. Docs and a pure wire-contract module; nothing in the running app changes.

- **`docs/architecture/MESSAGE_BUS_API.md` (new, D1).** The API server's events and jobs in SQL Server tables behind `IMessageBus`:
  - the C# interface;
  - the tables;
  - claiming without blocking (`READ_COMMITTED_SNAPSHOT ON`, `READPAST` on the claim only);
  - leases with fencing;
  - retries with backoff, and dead letters shown where staff already look;
  - cooperative cancellation;
  - job kinds with per-kind ordering keys, and the recurring jobs that replace each browser stand-in (review §7);
  - monitoring;
  - retention.

  The contract tests (§8) are Pete's check: one suite, run against every implementation. It is honest about what a RabbitMQ adapter would really involve.
- **`docs/architecture/ASYNC_EXPORT_API.md` (new, D7)** and **`src/services/exports/asyncExportContract.ts`** (its source of truth):
  - 26 export kinds, one per export capability, each scoped as it is checked today;
  - endpoints;
  - the build job (snapshot, streaming, CSV formula-injection protection, audit);
  - no extra click for a quick export, and a notice for a long one (`ExportStatus` on the hub);
  - blob storage with 7-day retention, and 15-minute user-delegation SAS links;
  - acceptance tests, with Pete's check first.
- **`LIVE_UPDATES_SIGNALR.md`:** `eventId` is the outbox `MessageId`; §13 adds `ExportStatus`.
- **`DEPLOYMENT_READINESS_REVIEW.md`:**
  - D1 and D7 link their contracts;
  - §9 adds two 2d items;
  - new findings, disclosed and not fixed:
    - **F8:** the browser's CSV writer doesn't neutralise formula cells;
    - **F9:** the disposal report export isn't audited.
- **Guards:**
  - `phase2cContracts.guard.test.ts` (new) checks that the contracts cite real files, that every review §7 job has a place, and that the export kinds equal the catalog's export capabilities;
  - the review guard now also keeps F8 and F9 listed.
- **Independent check:** found 3 high, 9 medium and 6 low issues in the drafts, all corrected:
  - a delayed job held up its whole ordering key;
  - the claim query blocked;
  - the disposal export audit was claimed but doesn't exist;
  - the enterprise rollup scope was wrong;
  - running exports couldn't be cancelled;
  - leases had no fencing;
  - the RabbitMQ claim was overstated.
- **Xray:** PS-602 (automated), PS-603 (open points).

## Batch 541 — Hosting decisions recorded (PS-539 phase 2b)

Pete decided the six open hosting decisions on Oct 13 (D2 on Oct 12). `docs/architecture/DEPLOYMENT_READINESS_REVIEW.md` §13 now records each decision and the check Pete asked for before it is relied on:
- **D1:** jobs and events in SQL Server tables behind an interface (`IMessageBus`); RabbitMQ as an adapter if load testing needs it; HL7 in the engine's own store. Check: the interface swaps implementations cleanly.
- **D3:** on-site agent v1 = report and label printers, Windows shares; instruments in v2; BridgeLink on site only on request. Check: staging-machine test of print routing and share pickup.
- **D4:** reviewed scripts applied by the pipeline, never at start-up; tool chosen with the India team, compatible with zero-downtime deployment and API versioning. Check: pipeline log shows scripts ran before the API starts.
- **D5:** hosting chosen by the certifications the first customers need (BAA, HDS, C5). Check: compliance baseline before tenant data.
- **D6:** BridgeLink hosted per region or in the hospital, one container image. Check: identical health checks.
- **D7:** "request it, get notified, download it" export contract now, in 2c. Check: a large mock export job with notification and secure link.

The review's guard test now requires every decision row to say Decided and carry its check. Docs only; no code changes.

**Xray:** PS-600 (automated), PS-601 (Pete's verification points).

## Batch 540 — No correction or addendum during the release delay (PS-539)

Pete, Oct 12, 2026 ("Why not block that flow during the delay period?"), answering the question left open by the Batch 538 review: a revision released while the case was in its sign-out buffer was rendered with the case still `pending-release`, so its PDF carried the release-buffer watermark, and that file went out when the delay ended.

- **`services/reportRelease/revisionDuringDelay.ts` (new).** While a report is in its release delay nothing has been sent, so a correction or addendum is refused; the report is recalled instead. "In its delay": a case in its sign-out buffer, or a held original report (surgical sign-out, cytology case report, finalized early or a late specimen, autopsy). A held revision or preliminary doesn't count.
- **Enforced in the services:** `mockAmendmentService.startDraft` (every surgical and Assist correction, amendment and addendum), `releaseCytologyCorrection` and `releaseCytologyAddendum` (`inReleaseDelay`). The report page also checks before adding an addendum workup to a finalized case.
- **At the source too:** a released PDF (`final-snapshot`) never carries the release-buffer watermark (`resolveReportWatermark.ts`); a print during the delay still does. This also covers an Assist correction, which is released by re-finalizing and can put the case back in its buffer first.
- **Messages (en/fr/de/nl/ko):** `useAmendmentWorkflow.toast.inReleaseDelay`, `cytologyRevision.toasts.inReleaseDelay`.
- **Docs:** `docs/product/REPORT_RELEASE_DELAY.md`, `GUIDE_UPDATES.md`, `FEATURE_OVERVIEW.md`.
- No new clicks; one action that shouldn't be taken is refused with a message.
- **Xray:** PS-591 (automated), PS-592 (open verification points).

## Batch 539 — Cytology report PDFs from the report renderer (PS-539 D2)

Pete, Oct 12, 2026: "PDF that leaves PathScribe, and the browser only shows previews. As long as the preview matches exactly what gets sent out." Batch 538 stored one document per release; this batch moves the last browser-drawn PDF, cytology, to the server.

**Server (`functions/`):**
- `cytology_report.py` (new): `render_report` with `"template": "cytology"` lays out lines the browser composed. A4, 15 mm margins checked against the 0.5 inch minimum; Liberation Sans embedded (moved from the browser as `.ttf`) or Pretendard for Korean, chosen per document; each document on a new page; accession barcode on each report's first page; continuation line with Page X of Y in the document's language; headings kept with their first line; the addendum on its own page when the lab says so; typed line breaks kept; optional watermark; the same bytes for the same request (creation date = signing time, fixed ID).
- Each PDF carries `pathscribe-template:cytology` in its Keywords. Text output is refused for cytology (400).
- `test_main.py`: 7 new test functions; 148 checks pass.

**Browser:**
- `services/cytology/cytologyRenderPayload.ts` (new, pure): every line of a report in its language and date format, in the order the jsPDF renderer printed them; the case report (first page, then each specimen in its own language). One builder for preview and release; only an unsigned preview adds PRELIMINARY — SUBJECT TO CHANGE.
- `services/cytology/renderCytologyPdf.ts` (new): posts to the renderer, fetches a letterhead logo, refuses a PDF without the cytology marker (an older deployment would answer with a blank surgical page), so a release is held instead.
- Now through the renderer: the sign-out snapshot, the preliminary, the consolidated case report (one request, no pdf-lib merge), corrections and addenda, the workspace print and preview, and the retry of a per-specimen message.
- **Print case report** on a released case opens its stored case document byte for byte.
- `services/reports/reportRenderer.ts` (new): the renderer's address, shared by the report page, Assist and cytology.
- Cytology release documents are `producedBy: report-renderer`.
- Workspace print opens its tab at the click (no popup block) and shows a message on failure: `cytologyScreening.printFailed`, `cytologyScreening.printRendererOutdated` (en/fr/de/nl/ko).

**Removed** (`DELETED_FILES.txt`): the jsPDF cytology renderer, its worker, and the browser rendering helpers in `documentRendering/` (continuation headers, deterministic metadata, barcode, header logo, print fonts, embedded fonts, layout governance), with their tests. The `jspdf` package stays in `package.json` until the dependency clean-up.

**Independent review** found 2 high issues (the logo field name differed between browser and server, so logos never printed; typed line breaks were lost) and 1 medium (a mixed-language case report used one font and one page label); all fixed, with tests, including a check that the browser's field names are the ones the server reads.

**Deploy:** `functions/` must be redeployed (India team) before this zip is used. Until then every cytology print says the renderer hasn't been updated and releases are held.

**Open:** embedded images (`imageAssociations`) are not drawn (nothing sets them); small spacing differences from the old layout; signed-specimen print re-renders from the record (same text); native-speaker review of the new messages; F1, F3, F4.

**Xray:** PS-589 (automated), PS-590 (open verification points).

## Batch 538 — One stored report document per release (PS-539 D2)

Pete, Oct 12, 2026: "PDF that leaves PathScribe, and the browser only shows previews. As long as the preview matches exactly what gets sent out."

**New: `services/reportDocuments/`.** A released report is rendered once and stored as a report document with the SHA-256 of its bytes (`sha256HexBytes`). No update or delete; a read rechecks the hash and refuses a mismatch (`integrity`). `captureReleaseDocument` stores once per release; `documentPdf` turns a stored document into a channel's PDF and keeps its id on failure, so no caller substitutes another PDF. Browser store: key `report_documents` (cleared by demo reset). Contract for the API server: `docs/architecture/REPORT_DOCUMENT_STORE_API.md`.

**Every channel sends the stored bytes:**
- `publishReportReleasedEvent`: `releaseDocument(event)` makes and stores the document before any channel; its id goes on the event, the delivery release context, retries and fallbacks. `sendReleaseFallback` sends the release's document; a release from before this batch keeps the old non-storing path.
- Result messages (`resolveOruReportPdf`, `prepareOruR01Dispatch`, the dispatchers): queue entries record `reportDocumentId` and `pdfSha256`; a retry sends that document. An unreadable document is held, never replaced. `savedReportPdf` uses the newest saved version only.
- Cytology case report, correction, addendum and preliminary: the message carries the release's document (before, the case message drew its own PDF). The worker fallback now passes the report's labels (it printed English).
- Assist structured results (LIS sync, case PDF): stored as documents; a retry rebuild reads them.
- Fax and file drop (`deliverReport`): a resend reads `release.documentId`; `REPORT_DELIVERY` carries the id and hash. **Fixes:** a correction's retry sent the pre-correction sign-out; a preliminary's retry was held for good.
- Print: the job records the document and keeps no second copy; reprint reads it.
- Release delay: the bytes stay on the hold and are stored when the delay ends, so a recalled report leaves no document.

**Preview matches release.** Print uses the release's payload builder (`buildReportRenderPayload(format, purpose)`); only the watermark differs (`resolveReportWatermark.ts`: PRELIMINARY before sign-out). The watermark is resolved before the build, so the browser-print fallback keeps it. `performingFacilityId` added to the no-buffer FINAL and Assist events.

**Version History → Released documents:** each document with type, release time, how it was made and its short SHA-256; **View as sent** opens the stored bytes after the print check, audited as `report-document`. Dates now use the user's locale.

**Locale keys (en/fr/de/nl/ko):** `versionHistoryModal.sentDocuments.*` (title, intro, line, hash, viewAsSent, integrity, notFound, types.*, producers.*).

**Docs:** `REPORT_DOCUMENT_STORE_API.md` (new), `REPORT_RENDERING_SERVICE.md` §6, `DEPLOYMENT_READINESS_REVIEW.md` (D2 decided; F6 corrected: surgical PDFs had the same storage gap).

**An independent review** of this batch found three high and six medium issues; all fixed except one question for Pete (below).

**Open, disclosed:**
- Cytology is still drawn in the browser until the server template (next batch; `functions/` redeploy by the India team).
- Server storage and endpoints are a contract only.
- Entries queued before this batch, per-specimen cytology messages and releases whose PDF failed carry no document; their retries behave as before.
- All documents share one browser storage entry (size limit applies).
- The Assist result's signed time is the build time, not the sign-out time.
- Question for Pete: a report released during pending-release stores the release-buffer watermark in its document (existing behaviour).
- F1, F3, F4 from Batch 537 still open.

**Xray:** PS-587 (automated), PS-588 (open verification points).

## Batch 537 — Deployment readiness review (PS-539, phase 2a)

**`docs/architecture/DEPLOYMENT_READINESS_REVIEW.md`** (new). Cloud-agnostic, per Pete's Oct 10 direction. Contents:
- the inventory (no server code exists yet);
- 25 server components, each rated: ready, needs changes, always-on, on-site, or retire;
- the database rules: no auto-pause in production, size by workers, schema changes never at start-up;
- SignalR: hub logic in the API, scaled through Azure SignalR Service (Default mode) or Redis with sticky sessions;
- the interface engine (BridgeLink, a Mirth fork) as the MLLP edge;
- Pete's three MLLP patterns checked against current documentation. The Logic Apps HL7 connector is still in preview and encode/decode only.
- the rules for the edge: ACK after a durable write, ordering, idempotency, dead letter, TLS or VPN, a fixed IP;
- the on-site agent;
- 12 browser stand-ins for server jobs;
- the latency budget: 800 ms general, under 500 ms for OR boards;
- the browser changes for 2d;
- a market and hosting table covering 14 markets;
- cost drivers;
- 11 changes, ranked;
- decisions D1 to D7;
- findings F1 to F7;
- sources and diagrams.

Provider facts were checked against the providers' pages on Oct 12. An independent check found 12 errors, all corrected. Among them: the contract makes Azure SignalR Service the Azure option, not self-hosting.

**Findings disclosed, not fixed:**
- F1: a dead Firestore hook.
- F2: three screens on Firestore with placeholder credentials.
- F3: network printing reaches Node `net` from the browser sweep.
- F4: the CSP omits the local print bridges.
- F5: Assist polling and print-batch aggregation have no scheduler.
- F6: cytology PDFs are browser-only.
- F7: client-measured CLIA screening time.

**Test:** `deploymentReadinessReview.guard.test.ts`. Every file the review cites must exist, and the decisions and findings must stay.

**Docs:** `docs/architecture/README.md`, `REPORT_DELIVERY_API.md` (pointer), `GUIDE_UPDATES.md`, `FEATURE_OVERVIEW.md`, READMEs to the root.

**Xray:** PS-585 (automated) and PS-586 (open points).

**Verified.** Type-check clean; lint clean on the changed file. Full suite: 1,115 files: 1,110 pass, 4 skipped, 1 fails (`firestore.rules.test.ts`, emulator, unrelated); 9,416 tests pass, 32 skipped (+3).

## Batch 612 (workstations and scope reference)

New namespaces `workstationRegistry.*` and `scopeReference.*` in all five languages (en, fr, de, nl, ko), plus `systemTab.sections.workstations` / `scopeReference`, two search descriptions and the two capability labels. Revoke reasons reuse `siteAgents.revokeReasons`. French, German, Dutch and Korean are machine-written and still need native-speaker review.

## Batch 612 (part A) — Interface Dictionary (Message Mapper)

171 new keys in all five languages: `interfaceDictionary.*` (title, subtitle, loading, refusal codes, list, status, versions, editor, types, conversions, problems, test, publish, simulate, notices, scope lists), `vendorFields.*`, `systemTab.sections.interfaceDictionary`, `configSearchIndex.entries.sys-interface-dictionary.description`, and `capabilities.items.platformInterfaceDictionary{Manage,Publish,Simulate}`. Refusal and problem codes map to keys with `codeKey()` (TARGET_CORE_STRUCTURE becomes `targetCoreStructure`); `interfaceDictionaryLocale.test.ts` fails if a code has no text in any language. Simulated: Simulé / Simuliert / Gesimuleerd / 시뮬레이션. French, German, Dutch and Korean wording was written without a native reviewer and needs review before use.

## Batch 613 (part A, follow-up) — recipient access choice

9 new keys under `caseReport.schedule.*` in all five languages: `accessChecking`, `accessCounts`, `accessHint`, `accessLegend`, `accessNarrow`, `accessSkip`, `lastRunAccess`, `error.BAD_RECIPIENT_CHOICE`, `error.RECIPIENT_ACCESS_UNKNOWN`. Needs native-speaker review in fr, de, nl and ko.

## Batch 614 (part B) — Code Systems policy notes

11 new keys in all five languages under `codeSystemsPolicy.*`: `offNote_one`, `offNote_other`, `fallbackNote`, `outsidePolicy`, and `names.{CPT,ICD10,ICD11,ICDO,LOINC,OPCS4,SNOMED}`. Needs native-speaker review (fr, de, nl, ko).

## Batch 616 (part D) — no new strings

The server versions of the quality, digital pathology, image, grossing, dictionary, reagent, cold-chain, label and intraoperative services add no text to the interface. Failures are fixed codes the screens already handle.

## Batch 616 (part E) — no new strings

The server versions of the interface, model, protocol, template, routing, macro, flag, message and AI-policy services, and the two guard tests, add no text to the interface. Failures are fixed codes the screens already handle.

## Batch 616 (part C) — no new strings

The server versions of the billing, cytology, molecular and registry services add no text to the interface. Failures are fixed codes the screens already handle.

## Batch 616 (part B) — no new strings

The server versions of the audit, authorization, staff, role, facility, registry-setting, access-request, session-timeout, biometric and lab-dictionary services add no text to the interface. Failures are fixed codes the screens already handle.

## Batch 616 (part F) — no new strings

The command-based follow-up server version and moving the biometric screens onto the biometric flow add no text to the interface. Refusals are fixed codes the screens already map.

## Batch 616 (part A) — no new strings

The server versions of the report, accessioning, patient and encounter services add no text to the interface. Failures are fixed codes the screens already handle.

## Batch 617 (part R) — no new strings

The route standardization of the server versions changes no text on screen. The shared kit gained `kebabCase` and `methodPath`; `httpRoutes.guard.test.ts` enforces the one route style (`docs/architecture/HTTP_SERVICES_PATTERN.md` §7).

## Batch 617 (part N) — one new string

- `sessionSecurity.biometric.offForDeployment` (all five languages): the note under the biometric policy switch when the deployment has biometric sign-in turned off. The fr/de/nl/ko wording was written by Claude and needs native review.

## Batch 617 (part A) — no new strings

The server versions of 29 services (settings, dictionaries, case workflows, critical results) add no text to the interface. Failures are fixed codes the screens already handle.

## Batch 617 (part C) — no new strings

The server versions of the quality, referral, search, signature, dictionary, tumor board and workstation services add no text to the interface. Failures are fixed codes the screens already handle.

## Batch 617 (part S) — no new strings

Actions sweep: 16 Role Dictionary entries for the actions Batches 613 to 616 added (related cases, case access, search reports, follow-up, flagged-finding code search, biometric). Labels are English literals like the other roles-list entries; no locale keys, no voice phrases.

## Batch 618 (part C) — no new strings

The server version of case material (PS-482) adds no text to the interface. Failures are fixed codes the screens already handle.

## Batch 618 (part B) — no new strings

The partial nephrectomy drawing (PS-492) and the file-size guard (PS-497) add no text to the interface. The drawing shows fewer shapes, not new words.

## Batch 618 (part A) — second facility for the technical component (PS-336)

New keys, all five languages (en/fr/de/nl/ko): `accessionPage.technicalFacility.{label,none,help}` (the optional Accession field) and `surgicalReportPdf.technicalComponentAt` (the report line, with `{{facility}}` filled by the renderer; added to the report label list in `surgicalReportLabels.ts` and to `DEFAULT_LABELS` in `functions/main.py`). The Case team window's existing `technicalComponentFacility.*` keys are unchanged. Native-speaker review of fr/de/nl/ko still wanted.

## Batch 620 (part E) — US ePath (PS-800)

New keys, all five languages (en/fr/de/nl/ko): `usEpathSection.*` (the screen, profile cards, the editor, transports, checks, facility basis, routing hints, problems), `outboundQueue.registryReview.*` for the ePath review codes, `systemTab.sections.usEpath`, and `capabilities.items.configUsEpathManage.{label,description}`. Native-speaker review of fr/de/nl/ko is still needed.

## Batch 620 (part S) — registry batch files (PS-800)

New keys, all five languages (en/fr/de/nl/ko): `batchRegistryFeedSection.*` (the screen, the editor, counts, run statuses, problems, fields, formats, delimiters), `systemTab.sections.batchRegistryFeed`, and `capabilities.items.{configBatchRegistryFeedManage,registryBatchFileGenerate}.{label,description}`. The editor reuses `common.cancel`. Registry names come from the delivery schedules' registry choices. Machine translation of 106 keys: native-speaker review before clinical use, Korean in particular.

## Batch 619 (part S) — delivery schedules (PS-800)

New keys, all five languages (en/fr/de/nl/ko): `deliverySchedulesSection.*` (the screen, the editor, problems, reasons, registry and deadline text), `systemTab.sections.deliverySchedules`, and `capabilities.items.configDeliverySchedulesManage.{label,description}`. Registry names reuse the existing `screeningRegistry.registries.*` and `cancerRegistrySection.registries.*`. Native-speaker review of fr/de/nl/ko still wanted.

## Batch 619 (part B) — billing release rules (PS-800)

New keys, all five languages (en/fr/de/nl/ko): `billingReleaseSection.*` (the screen, the rule editor, problems, reasons, review reasons and the live check), `systemTab.sections.billingRelease`, and `capabilities.items.configBillingReleaseManage.{label,description}`. The editor reuses `deliverySchedulesSection.weekdays.*`, `deliverySchedulesSection.frequencies.*` and the schedule problem texts. Native-speaker review of fr/de/nl/ko still wanted.

## Batch 619 (part Q) — Outbound Queue (PS-800)

New keys, all five languages (en/fr/de/nl/ko): `outboundQueue.*` (the screen: states, feeds, destinations, transports, columns, reason pick-lists for hold, resubmit, not reportable and retract, billing review reasons, summary and refusal lines), `qualityComplianceHub.outboundQueueTile.*`, `outboundInterfaceDlq.outcomes.onHold`, and `capabilities.items.*` for `screen:outbound-queue:open`, `interface:outbound:hold`, `interface:outbound:release`, `interface:outbound:mark-not-reportable`, `interface:outbound:retract` and `interface:outbound:override-release`. Counts use neutral wording ("Changed: {{count}}") so no plural forms are needed. The registry's own message text is never shown, only its fixed error codes. Korean wording needs native review. New files: `services/outboundQueue/`, `pages/OutboundQueuePage/`, `hooks/useOutboundQueue.ts`, `constants/outboundQueueActionGroup.ts` (6 Role Dictionary actions, group F34, Admin), `docs/architecture/OUTBOUND_QUEUE_API.md`.

## Batch 620 (part C) — UK cancer registry (COSD) destination and checks (PS-800)

New keys, all five languages (en/fr/de/nl/ko): `cosdDestinationSection.*` (the screen, the editor and its problems, the transports, the sample check with its findings and the list of rules still to be confirmed against the published specification, and the correction due date), `systemTab.sections.cosdDestination`, and `capabilities.items.configCosdDestinationManage.{label,description}`. Plurals use `_one` / `_other` (working days, non-working dates). The preview is labelled everywhere as PathScribe's simplified model, not the official COSD file, and Korean wording needs native review. New files: `services/cosd/`, `components/Config/System/CosdDestinationSection.tsx`, `docs/architecture/UK_COSD_API.md`.

## Batch 621 — AI extraction of historical reports (advisory only)

New keys, all five languages (en/fr/de/nl/ko): `historyExtraction.*` (the panel beside a historical report: the "AI-extracted, not verified" label, the advisory note, template and service lines, confidence, the flag buttons, and the fixed messages for no text, no template and each failure code), `historyExtractionSection.*` (Configuration > System: the setting, its sources, and the accuracy counts), `systemTab.sections.historyExtraction`, and `capabilities.items.{configHistoryExtractionManage,aiHistoryExtractionRun,aiHistoryExtractionFlag}.{label,description}`. The AI's own instructions (prompts) are not screen text and are not translated. Korean wording needs native review. New files: `services/historyExtraction/`, `components/PatientHistory/HistoryExtractionPanel.tsx`, `components/Config/System/HistoryExtractionSection.tsx`, `docs/architecture/HISTORY_AI_EXTRACTION_API.md`.


## Batch 622 — Spain (es-ES): sixth language, ES jurisdiction, Spanish spell-check (PS-811)

New keys: the whole of `es.json` (20,004 entries, every English key plus the `_many` plural form Spanish needs, set equal to `_other`) and, in all six languages (en/fr/de/nl/ko/es), `language.es`, `jurisdictionNames.ES`, `systemConfig.patientIdStandard.ES.{label,format}`, `spellCheck.locales.es-ES`, `voiceSection.promptReview.lang.es`.

**The standing rule is now six languages: en, fr, de, nl, ko, es.** `localeParity.test.ts` checks `es` like the others.

**Spanish is Castilian (Spain), formal "usted"**, with Iberian wording: *ordenador*, *móvil*, *Anatomía Patológica*, *informe*, *muestra*, *bloque*, *portaobjetos*, *tinción*, *citología*, *validar / firmar informe*, *lista de trabajo*, dates dd/mm/aaaa, *NHC* (número de historia clínica) for MRN, *TRT* (tiempo de respuesta) for TAT. The translation was made by AI in 14 parts and **needs native-speaker clinical review before clinical use** (the translators' doubts: Grossing = *tallado*, accession = *registro*, touch prep = *improntas*, STAT = *URGENTE*, tumour board = *Comité de tumores*, "physician assistant" has no Spanish role, GMC/licence labels read as UK/US concepts). US-only terms (BAA, CPT, RVU, CLIA, CAP) were kept or lightly glossed.

Also in this batch: ES in `Jurisdiction` (CIE-10-ES, `es-ES` dates, 24-hour clock, DNI/NIE pattern), voice profile `ES-ES`, Spanish spoken punctuation, ordinals (3.º), the dictation-refinement prompt for Spanish, report language `es`, the Spanish Hunspell dictionary and a starter pathology list (`spellcheck-data/es/`).

**Not built (held until verified, see `docs/product/SPAIN_RESEARCH.md`):** cervical screening intervals and strategy, regional registry profiles, Veri*Factu / e-invoicing, SNOMED CT Spanish edition, CIE-10-ES code tables, Catalan / Basque / Galician.

## Batch 623 — Licensed terminologies and real codes on abnormal rules (PS-130)

- New keys: `terminologyLicences.*` (the Licensed terminologies card on Configuration > System > Code Systems: title, description, notShipped, system.SNOMED_CT / ICD_O_3, status.none / off / active / expired, the field labels, `problems.*`, save, saved) and `abnormalTriggerRulesSection.modal.licensedCodesLabel`, `licensedCodesHint`, `snomedCodeLabel`, `snomedTermLabel`, `icdo3CodeLabel`, `icdo3TermLabel`, plus `abnormalTriggerRulesSection.errors.snomedCodeInvalid`, `icdo3CodeInvalid`, `snomedDisplayRequired`, `icdo3DisplayRequired`. All 32 in en, fr, de, nl, ko and es.
- Wording: the code system is "ICD-O-3" in en/fr/de/nl/ko and "CIE-O-3" in Spanish (as `addCodeModal.systemLabel.ICDO` already does). The licensing bodies are named only as examples (SNOMED International, a national release centre).
- The screen name in the rule form's hint follows each language's own Code Systems title (fr Systèmes de codage, de Codiersysteme, nl Codesystemen, ko 코드 체계, es Sistemas de codificación).

## Batch 624 — Worklist digital-pathology wording and shipped flag names

- New keys: `worklistDp.readiness.*` (ready, partial, partialScanning, error, errorReason), `worklistDp.triage.*` (reviewRecommended, noFurtherReview, resultAvailable, preScreenedUnremarkable, `flaggedFinding_one/_other/_many`) and `flagNames.*` (34 shipped flag names), in all six languages.
- **Decision (Pete, Oct 19, 2026): scanner and AI wording is never translated.** A scanner failure reason ("Out-of-focus"), an AI vendor's headline ("Malignancy Detected") and biomarker lines did not originate in PathScribe, and a mistranslated clinical finding is a risk. They are shown exactly as received and only ever inserted into a translated sentence as a value (`{{reason}}`). Only wording PathScribe writes itself is translated.
- Flag names are data: the stored name is unchanged and only its display is looked up (`services/flags/shippedFlagNames.ts`). A flag an admin made or renamed shows as typed; names that carry a result or gene (BRAF V600E, PD-L1 CPS 15, VHL Mutation, ER / PR / HER2, HER2 FISH) are left as stored.
- Spanish fix: `requiresDecal` and `requiresDecalLabel` said "Requiere calcomanía" (a sticker). "Decal" here is decalcification; both now read "Requiere descalcificación".
- Not changed: spoken readiness/AI summaries (voice) still use the English text; flag descriptions in the chip tooltip are still English.

## Batch 625 — One shared discordant section; QA review form messages translated (PS-118)

- New keys: `qaReviewCaptureForm.errors.*` (fieldRequired with `{{label}}`, outcomeRequired, deltaRequired, severityRequired, rootCauseRequired, commentsRequired, rootCauseNoteRequired) in all six languages. The generic QA review form's validation messages were English text returned by `validateQaReviewSubmission`; the validator now returns message codes and the form translates them.
- The Discordance window and the generic form render the same `QaDiscordantSection`; the window keeps the frozen-section wording (`discordanceReconciliationModal.*`), the generic form its shorter wording (`qaReviewCaptureForm.*`). Spanish "Otro" is used for the root-cause "Other" option and the matching message.

## Batch 626 — Reactive Changes lab setting (PS-163)

- New keys: `cytologyCategoriesSection.reactive.*` (title, hint, status.cytotechnologist/pathologist/mixed, allowCytotechnologist, requirePathologist, appliesToNew, failed) in all six languages. Wording is the Pete-decided "cytotechnologist" term per language; AI-translated, needs native review.

## Batch 627 — Spanish voice commands

- All 257 voice commands now have Castilian Spanish phrases (formal register, 2-8 variants each, mirroring the French/German/Dutch/Korean sets), in `services/actionRegistry/spanishVoiceTriggers.ts`. They are added to each action when the registry loads, including actions already stored in a browser; phrases an administrator edited are kept. They live in their own file because `mockActionRegistryService.ts` is over the 1000-line limit and may not grow.
- Vocabulary follows the Spanish UI text: caso, lista de trabajo, muestra, casete, portaobjetos, firmar, adenda, marcadores.
- The coverage guard now requires Spanish phrases on every command and checks Spanish for same-screen and always-on clashes; one known screen shadow added (`buscar`: Search vs. message search, as in English "search" and French "rechercher").
- No locale keys added (voice phrases are data). AI-made; needs review by a native Spanish-speaking user before clinical use.

## Batch 628 — Voice matching: best match, not first

No locale keys. Exact-phrase voice matching (`services/actionRegistry/findExactTriggerMatch.ts`) now picks the best match: a phrase equal to everything said, then the longest phrase found inside it, then the earlier (screen) command on a tie. Fixes "open messages / configuration / search" being heard as "open" (Open Selected) on the worklist, in every language.

## Batch 629 — hrHPV result inbound contract (PS-174)

- New key `cytologyWorklist.badges.hpvInvalid` in all six languages: the HPV Triage row for a case whose platform result came back Invalid says to repeat the test, instead of "Awaiting hrHPV Result". (Spanish uses "VPH de alto riesgo", as in `awaitingHpv`.)
- No other UI text. The inbound contract is in `docs/architecture/HPV_RESULT_INBOUND.md`.

## Batch 630 — Manual hrHPV result entry with a Result Source and a second sign-off (PS-174)

- New keys in all six languages: `cytologyWorklist.manualHpv.*` (dialog title, body, Result Source label and the four sources, the second-sign-off notice and button, pending detail, outcome messages, result names), `cytologyWorklist.badges.hpvOverridePending`, `cytologyWorklist.actions.approveOverride` / `rejectOverride`, and the capability text `capabilities.items.cytologyHpvResultRecordManual`.
- Source codes (`MANUAL_PAPER_REPORT` and the rest) are stored; only their display goes through `manualHpv.sources.*`. Audit text stays literal English.
- The fr/de/nl/ko/es wording is AI-translated and needs native review like the rest.

## Batch 644 — Feature Overview in four voices (Pete, Oct 20, 2026)

- `docs/product/FEATURE_OVERVIEW.md`: 108 sections gain practitioner, system administrator, marketing and FormedrixAI-and-partners text above the existing technical detail. No code or strings changed.

## Batch 643 — Guide updates rewritten in four voices (Pete, Oct 20, 2026)

- `docs/product/GUIDE_UPDATES.md`: all 134 earlier entries rewritten as practitioner, system administrator, marketing and FormedrixAI-and-partners text, from their existing wording. No code or strings changed.

## Batch 642 — Sign-out authentication policy (Pete, Oct 20, 2026)

- New keys under `signOutPolicy.*` (button label and tooltips, the session note, the Security card: modes, lengths, summaries, lock, table, deferred-features note) and `signerConfirmation.error.mfa_not_enrolled`, in all six languages. New `signOutPolicy.card.sessionWarning` mentions 21 CFR Part 11 (11.200). All six need native review.
- The Audit Log text (policy changes, authentications, session expiry) and the CSV export headers are literal English.

## Batch 641 — Recall documentation corrected; recall card loading fix (Pete, Oct 20, 2026)

- No new strings. Recall windows and wording need no programme sign-off (Batch 640); the register codes are the interface engine's. The recall card keeps what a person types if the saved settings load late.

## Batch 640 — Recall windows and wording set per country by the lab (Pete, Oct 20, 2026)

- Configuration > Cytology > Screening Strategy > Self-collected HPV recall windows: a Country dropdown (Australia, New Zealand); that country's windows; recall wording per language and kind, with an empty box meaning the built-in text. Audited (`RECALL_SETTINGS_CHANGED`, literal English).
- **New strings (all six languages), under `cytologyScreeningStrategySection.recallWindows`:** jurisdiction, switchHint, wordingTitle, wordingHelp, language, kind.clinician_lbc, kind.repeat_collection, placeholders, wordingProblem.too-long, wordingProblem.unknown-placeholder, discard, savedNote, failedNote; `help` reworded (it no longer says the values are placeholders). The `{{type}}` and `{{next}}` tokens in the help text are shown literally (passed as values). fr/de/nl/ko/es need native review.

## Batch 639 — Hotkey decisions answered: cassette key, Discard confirmation (Pete, Oct 20, 2026)

- Print Current Cassette: Alt+P to Alt+Shift+O (Alt+P stays Previous Case). Migration keeps customised keys.
- Discard Unsaved Changes (Alt+U / voice) asks before it runs. New string `synopticEditor.discardCommandMessage` in all six languages (reuses the Unsaved Changes title and the Discard Changes / Keep Editing buttons). fr/de/nl/ko/es need native review.

## Batch 638 — CSMS gate, Belgian Dutch dictation, prorated reassignment room, surgical demo patients (Pete, Oct 20, 2026)

- **CSMS gate (PS-193):** a CSMS message no longer goes out at sign-out. It is queued and held as "awaiting eligibility", and the f36 flag is raised then. Verified rebuilds it from today's data and sends it; Not eligible closes it with the reason (audited, never sent). Resend on the Registry Exceptions screen cannot release it. The clinical report is never held.
- **Belgian Dutch dictation (PS-347):** `NL-BE` voice profile (nl-BE, Dutch commands) plus a note in Voice Settings that it is untested by a Belgian speaker.
- **Reassignment (PS-189):** a colleague's room is prorated by their logged hours, as the person's own limit is.
- **Demo:** the surgical seed patients are registered in the patient index.
- **New strings (all six languages):** `voiceSettings.nlBeUntested`, `cytologyWorklist.csms.recordedVerified`, `cytologyWorklist.csms.recordedNotEligible` (replaces `cytologyWorklist.csms.recorded`). fr/de/nl/ko/es need native review.

## Batch 637 — Review workbooks for French, Dutch, German and Spanish; roles list names the newer actions (Pete, Oct 20, 2026)

- **What changed:** no app change. New `scripts/translation-review-workbook.py` and `scripts/translation-review-glossary.json` build one Excel review workbook per language from the live locale files, in the layout of the earlier Korean review file (Instructions, 1 Glossary, 2 Clinical, 3 Other). The old Korean file was stale (8,158 texts); the app now has 15,644 distinct English texts in 19,857 places (6,163 clinical, 9,481 other), and the glossary has 166 terms.
- **Counts of texts that look untranslated** (same as the English, mostly names, codes and cognates): fr 499, nl 623, de 528, es 412. Several translations of one English text are listed in each row (fr 470, nl 438, de 407, es 430 texts).
- **Roles list:** 8 more person-facing actions from Batches 620 to 636 are named in the Role Dictionary (group F35), with default grants and classification; the roles list has 385 entries. No voice phrase, hotkey, locale key or capability changed. See `docs/product/ACTIONS_COVERAGE.md`.
- **Not changed:** locale text, keys, capabilities. Korean can be added with the same script.
- Details: `docs/quality/TRANSLATION_REVIEW.md`.

## Batch 636 — CSMS eligibility check (PS-193)

- New keys in all six languages: `cytologyWorklist.csms.*` (Eligibility verified, Record not eligible, reason quick-picks, result messages) and the capability text `capabilities.items.cytologyCsmsEligibilityVerify`. The audit events `CSMS_ELIGIBILITY_VERIFIED` and `CSMS_ELIGIBILITY_NOT_ELIGIBLE` are literal English.

## Batch 635 — Workload reassignment to named colleagues (PS-189)

- New key in all six languages: `cytologyScreening.workload.reassignedSummary` (how many cases went to which colleagues and how many back to the pool). The existing `reassigned` text still shows when nobody had room. Colleague names are data. The audit event `CYTOLOGY_WORKLOAD_REASSIGNED` is literal English.

## Batch 634 — Surgical dispatch lookup and demo cytology patients

- No new strings. The audit events `SURGICAL_DISPATCH_SKIPPED` and `CYTOLOGY_DISPATCH_SKIPPED` are literal English.

## Batch 633 — Cytology result dispatch no longer skips silently (PS-171)

- No new strings. The audit entry `CYTOLOGY_DISPATCH_SKIPPED` is literal English, as audit text always is.

## Batch 632 — Recommendation codes, configurable recall windows, repeat-collection wording (PS-178)

- New keys in all six languages: `cytologyWorklist.recall.codes.*` (the six recommendation descriptions; Australia repeat reads "Repeat Sample Collection Required (Unsatisfactory Result)", New Zealand "… (Invalid / Unsuitable Sample)"), `cytologyWorklist.recall.targetAsap`, and `cytologyScreeningStrategySection.recallWindows.*` (the settings card and its validation messages). `cytologyWorklist.recall.wording.NZ.repeat_collection` now has its own New Zealand text (repeat the HPV test as soon as practicable).
- The codes themselves (`AU_REFER_COLPOSCOPY` and the rest) are stored data, never translated. fr/de/nl/ko/es are AI-translated and need native review.

## Batch 631 — Australia/NZ self-collection recall (after PS-178)

- New keys in all six languages: `cytologyWorklist.recall.*` (priority Urgent/Routine, target window, genotype type and next-step phrases, and the Australian and New Zealand recall wording for a clinician-collected sample and for a repeat collection) and `cytologyWorklist.badges.repeatCollection`.
- The Australian and New Zealand wording is Pete's programme text; it was awaiting sign-off by someone in each programme (Batch 640 superseded that: the laboratory's administrator sets the wording per country), and the fr/de/nl/ko/es versions are AI-translated and need native review.
- Recommendation codes (`AU_RECALL_CLINICIAN_LBC` and the rest) are stored data, never translated.
