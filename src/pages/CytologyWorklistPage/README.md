**Batch 760:** `CytologyScreeningPage.tsx` and `CytologyWorklistPage.tsx` show no patient name, date of birth or MRN: the accession, vial type and slide ids instead; Ask a Colleague names the case by its accession (Cytology Workspace spec §2.1).

**Batch 744:** `CytologyWorklistPage.tsx`: the row shows the patient's name from either name shape (`resolvePatientNameValue`); it showed the MRN for the seeded patients.

**Batch 742:** `CytologyScreeningPage.tsx`: the Attachments badge opens the Attachments window with no section offered (the cytology report prints images after its pages). 1,539 lines to 1,536.

**Batch 739:** `components/CytologyMaterialView.tsx`: decant heading by template key, aliquots named by purpose (`utils/decantTypeText.ts`).

**Batch 649:** pool Claim and Pass show a refusal for want of `case:pool:claim` / `case:pool:pass` (`isPoolActionNotPermitted`).

# pages/CytologyWorklistPage

The Cytology worklist and the screening page (`CytologyScreeningPage.tsx`), where a screener, secondary reviewer or pathologist records a review of a cytology case.

- `cytologyDrafts.ts`: the Bethesda review's in-progress draft (`Draft`, `EMPTY_DRAFT`).
- `components/`: the forms and banners on the screening page. See its README.

## Batch 609 (part A)

- `CytologyScreeningPage` has an Attach images button and window for the report being screened.

## Batch 386

The five forms on the screening page take what they need from Field Requirements (page `cytology`, Configuration → System → Field Requirements) and are components with tests. The page still owns the save handlers, workload checks and state; the forms only render, check what is still required and dispatch. `CytologyScreeningPage.tsx` is still on the deployment baseline (about 50 direct mock-service imports) and about 3,000 lines; the rest of its text is translated in Batch 387.

## Batch 387

The rest of `CytologyScreeningPage.tsx`'s text is translated (role and review-mode cards, workload banners, Mandatory QC, HPV co-testing, review history, AI concordance prompt, unsaved-changes prompts, toasts), and its dates follow the user's locale. `CytologyScreeningPage.i18n.guard.test.ts` fails if English UI text, a literal toast or confirm, or `toLocaleDateString()` comes back. Still English on purpose, because it is stored data: the patient name and specimen type on the printed and signed report content, the resident name in a release record, QA record field values, an audit-style error, and the message body sent to another user when a case is released.

## Batch 390 (PS-340)

A signed-out case now offers **Correct diagnosis** and **Add addendum** under the "signed out" banner (`components/CytologyRevisionActions.tsx`, `CytologyRevisionPanel.tsx`; the hook `hooks/useCytologyRevision.ts` runs them). Each needs a reason, is confirmed with the signer's signature, and calls `releaseCytologyCorrection` / `releaseCytologyAddendum`, which check their own permission, store the reason on the new sign-out record, print it on the PDF and send the report through the same released-report event as the original. A correction also makes the corrected review the specimen's Final Diagnosis, so the screen shows what was last reported. The page only mounts the pieces; the page's `additionalOptionsExcluding(primaryId)` replaces the inline filter so the correction form can use it too. `CytologyRevision.guard.test.ts` guards the standing rules for these files.

## Batch 391

Sign-out and the draft preview stamp the performing lab's report language and date format on the report content; printing a signed report uses its stored language (and Pretendard for Korean).

## Batch 409 (PS-359): Cytology Workspace closed out

- **Sign-out:**
  - The whole sequence moved out of `CytologyScreeningPage.tsx` into `services/cytology/signOutCytologyCase.ts`: gate, signature, signing authority, countersign release and email, translation audit, 5-year lookback, ROSE discrepancy QC, post-sign-out peer review, correlation candidates, record, release event, and registry dispatch with the CSMS flag. The page went from 2,773 to 2,262 lines, including its three helpers and the imports they needed.
  - The page passes what it has loaded and shows the outcome.
  - The order of steps is unchanged. A new permission check comes first.
- **Permission:** Sign Out needs `cytology:report:sign-out` (Pete: keep today's users: Pathologist, Fellow, Resident, Cytotechnologist and hospital roles with case access). The button is greyed without it, and the service checks it again. Signing authority, the CT gate and countersign rules still apply on top.
- **Translated:** why a cytotechnologist can't sign out. The status line and review badges showed raw codes (`non_gyn_specimen, flagged_for_qc`); they're now `cytologySignOut.blockReasons.*`, joined for the user's language.
- **Deployment baseline:** `CytologyScreeningPage.tsx`, `CytologyWorklistPage.tsx` and `components/CytologySynopticFormView.tsx` take their services from `@/services` (22 cytology and registry services newly exported there, plus the pool-claim actions). No file in this folder is on the baseline now.
- `CytologyScreeningPage.i18n.guard.test.ts`: the English stored-data literals that moved to the service are gone from its list.
- **Browser:** signing out S26-5006-CYT-001 went through the service and showed the signed-out banner.

**Still open (a 2,262-line page):**
- Saving reviews, setting the final diagnosis, the high-risk QC flag, workload and SCU accounting, and the secondary-screening QA record still run in the page.
- They follow the same move as sign-out when this page is next touched.

## Batch 410 (PS-359): Cytology Workspace cleaned out

`CytologyScreeningPage.tsx` now renders and dispatches only (2,262 → 1,148 lines). What it did itself moved into services, each tested:

| Was in the page | Now |
|---|---|
| Loading: the cytology specimen, nomenclature and categories, reviews, sign-outs, AI result, jurisdiction, credentials, instrumentation modality, lexicon, patient history (seven effects) | `services/cytology/loadCytologyWorkspace.ts` |
| Both save paths (Bethesda-style and CISOE-A): CLIA workload check and reassignment, requiresPathologistReview, create or update, high-risk and random QC selection, the secondary-screening QA record, the workload ledger | `saveCytologyReview.ts` |
| Final diagnosis, QC flag and unflag, 5-year lookback outcome, cyto-histo correlation (the automatic lookup, recording, dismissing), decants and stains, ROSE, Code Manager changes and their audit, LMP, the print preview | `cytologyCaseActions.ts` |
| Pick lists, category labels, synoptic translation check, each review's sign-out eligibility, the Sign Out panel, the on-screen lookback card, HPV card, AI summary, workload banner, Code Manager inputs | `cytologyWorkspaceView.ts` |
| Draft ↔ review conversions, your own review opened for editing, the dirty check | `cytologyReviewDraft.ts` (`cytologyDrafts.ts` here re-exports the draft) |

**Permissions (Pete: each its own, today's users keep them):**
- Save a review needs `cytology:review:record`.
- Set as Final needs `cytology:final-diagnosis:select`. The button is a `CapabilityButton`, and the CT/pathologist gate still applies.
- Remove Flag needs `cytology:qc-flag:remove`. Each removal is now audited. Adding a flag needs none.
- The 5-year lookback outcome needs `cytology:retrospective-review:record`.
- Recording or dismissing a cyto-histo correlation needs `cytology:histology-correlation:record`.

All five are seeded to Pathologist, Fellow, Resident and Cytotechnologist (the roles with this screen), and offered to hospital roles with case access. Each refusal has a translated message.

**Translated on touch:**
- Review history's "label (comment); …" is `history.selectionWithComment` / `selectionSeparator`.
- Quoted notes are `history.quotedNotes`, with each language's quotation marks.
- The Code Manager's specimen names are `codes.specimenName`.
- Workload SCU figures follow the user's number format.
- Patient names use `utils/personName.ts`.

`CytologyScreeningPage.i18n.guard.test.ts` keeps only `'Unknown'` (a review request's fallback sender) as stored English.

**Agreement stored on each later review (Pete):**
- A QC rescreen, secondary, pathologist or peer review now stores its agreement with the initial screen when it's saved (`agreementWithInitial`). That covers:
  - the level: exact, minor discrepancy, or major discrepancy with false negative or false positive;
  - adequacy differing, as its own flag;
  - the interpretations (primary and secondary) and recommendations added or missed;
  - which initial screen and which version of it was compared, and who assessed it and when.
- An edit re-assesses the review and keeps the earlier assessment in `priorAgreements`.
- Review history shows it under each review: green for exact, amber for minor, red for major.

**Still open:**
- The workspace handles one cytology specimen per case: it loads the first Cytology or FNA specimen, and signing that one out finalizes the case. A case with two cytology specimens (an FNA of two sites) can't review or sign out the second here.

## Batch 411 (PS-359): multi-specimen cytology cases

Pete: multi-site FNAs and concurrent Non-GYN and FNA specimens under one accession are common. Stopping at the first specimen, and finalizing the whole case when it was signed out, blocked the rest.

- **Specimen tabs** (`components/CytologySpecimenTabs.tsx`). They show when a case has more than one cytology or FNA specimen:
  - Each tab is labelled "Specimen A", "Specimen B" and so on, with its description and a Draft or Signed out status.
  - Switching tabs asks first about unsaved changes. The new specimen opens with its own reviews and drafts, QC, HPV, final diagnosis and sign-out.
  - The case opens on the first specimen not yet signed out, and reloads after an action stay on the same specimen.
- **Case progress.** A line such as "1 of 3 specimens signed out". Signing out a specimen that isn't the last says how many are left. The case becomes Final when its last cytology specimen is signed out.
- **Finalize case now.** This needs `cytology:case:finalize` (Pathologist by default; the button is greyed without it):
  - It's offered part-way through (at least one specimen signed out, at least one not, and the case not yet final), and asks for a reason.
  - The case records who finalized it, when, why and which specimens were unsigned, and shows that under the tabs. The action is audited.
  - Unsigned specimens can still be signed out afterwards.
- The Batch 410 "one specimen per case" open item is resolved here.

**Still open:**
- The Cytology Worklist's own tiles (QC pending, 5-year lookback) still read the case's first cytology specimen. *(Since closed: Batch 483 — `cytologySpecimensOf` and `aggregateCytologySpecimenFacts` in `services/cytology/cytologyWorklist.ts` look at every cytology specimen — checked in the Batch 496 README audit.)*
- Countersign release is still case-level: a resident releasing one specimen puts the whole case in pending-countersign.
- Each specimen's report is its own. There's no combined multi-specimen report PDF yet.
- Next piece of work (Pete, agreed): pre-sign-out revision workflow. That means review version history with restore, reviewer notes attached to a part of someone's review, and Pending Author Revision. That status blocks choosing the final diagnosis and sign-out, and only the author clears it. *(Since closed: built in Batch 412, below — checked in the Batch 496 README audit.)*

## Batch 412 (PS-359): pre-sign-out review without delays

Pete's aim: no "review ping-pong", and never stop the clinical clock for a pathologist. His answers set these rules:
- a revision request blocks a cytotechnologist only;
- pathologists get "Revise and sign out";
- nobody edits someone else's review.

**Notes on part of a review** (`components/CytologyReviewNotes.tsx`, under each review in the history):
- Anyone other than the author can leave a note before sign-out, about adequacy, general categorization, the primary or secondary interpretations, recommendations or notes.
- Plain notes are advisory and never block anyone.
- Ticking "Requires revision" needs `cytology:revision:request`, is audited, and puts the specimen tab in "Revision requested". A cytotechnologist then can't choose the final diagnosis or sign out (gate reason `pending_author_revision`) until one of these happens:
  - the author acknowledges the note and saves a revised review (only the author can acknowledge);
  - a pathologist records their own review of the specimen, which marks it "Resolved by pathologist".
- A pathologist is never blocked.

**Revise and sign out.** Shown to a pathologist on another reviewer's review, before sign-out; Bethesda-style form only.
- It copies that review into the pathologist's own. The CT's review is never edited, so what they called stays on record for CLIA and the agreement statistics.
- A banner says what's happening. Saving:
  - makes the pathologist's review the final diagnosis;
  - stores its agreement with the initial screen;
  - resolves any open revision requests;
  - audits "Pathologist revised cytology screen before sign-out" when the diagnosis changed;
  - then opens the signature.

**Version history.**
- Every edit keeps the review as it stood.
- The author sees "N earlier versions" under their review and can load one back into the form. Saving it is a new edit, so nothing is lost.

## Batch 419

After a correction or addendum is released, `hooks/useCytologyRevision.ts` sends the new version to the screening registry (`services/screeningRegistry/submitCytologyRevisionToRegistry.ts`) as CORRECTION or AMENDMENT; the release stands whatever the registry step does. `CytologyScreeningPage` passes `isGynCytology` to the hook. `components/cytologyRevision.test.tsx` checks the registry call.

## Batch 425

The Cytology Workspace's patient line shows the registry opt-out badge (`RegistryOptOutBadge`) when the patient has opted out.

## Batch 440

- **QC / Rescreen is a shared queue** (`loadQcRescreenQueue`). Whoever is on the QC bench sees every QC-flagged GYN specimen waiting for a rescreen, not only cases assigned to them. A case the viewer did the primary screen on shows a "Your primary screen — needs another screener" badge and an **Ask a colleague** button, which opens the message drawer with the case in the subject (`utils/openComposeTo.ts`, unaddressed so they pick the colleague).
- `CytologyScreeningPage.tsx`: opening such a case shows the same note under "Your role for this review", and a save of the rescreen is refused (`cytologyScreening.errors.qcByPrimaryScreener`).
- **Translated.** The worklist's title, tiles, empty texts, badges and buttons now go through `t()` (`cytologyWorklist.*`). Before this batch they were hard-coded English.
- Still in the page and not moved in this batch: the routing, screening-strategy and membership filtering in `load` (it calls the `resolve…` services, but the per-facility loop that combines them lives in the component).

## Batch 441

The page renders and dispatches only. Loading, per-facility routing and screening strategy, list membership, each tab's contents and counts, the organ-site chips and the simulated HPV event moved to `services/cytology/cytologyWorklist.ts` and `cytologyWorklistLive.ts`. This was the open item from Batch 440.

## Batch 446

Case pages are opened with `useOpenCase` (`hooks/useOpenCase.ts`), which addresses them by the case's support reference (`/case/SR-7K2Q-9MXD/synoptic`), never its accession number. See `services/caseAddresses/`.

## Batch 451 — screen-level test evidence for Priority 2 tickets

The review eligibility badge moved into `components/CytologyReviewEligibilityBadge.tsx` and tested for each gate condition (PS-163). `CytologyWorklistPage.hpvResult.test.tsx`: Record Positive/Negative sends the result through the interface-engine processor (PS-175).

## Batch 453 — The Batch 452 open items, and the native-speaker review register

`CytologyScreeningPage.tsx`: when a decant can't be saved (another session changed the material, or the save was refused), the page shows `cytologyScreening.materialDrawer.decantConflict` and, on a conflict, reloads the workspace so the next change is made against the current material and version. The decision and the save are in `services/cytology/cytologyCaseActions.ts`.

## Batch 454 — Follow-up not received: report, alerts and clinician email

A "Follow-up Due" QA tile: abnormal results whose histology follow-up is due soon or overdue.

## Batch 458 — PS-71: every case save carries its version

PS-71 (Pete's optimistic-locking spec, Oct 4): a save made from an old copy of a case no longer overwrites someone else's newer save. See `services/cases/caseWrite.ts` and `docs/architecture/CASE_API.md`.

Losing a pool claim to someone else shows a message. Screening-page saves go through the versioned Workspace service.

## Batch 460 — Billing drawer (Pete: full review)

`CytologyScreeningPage.tsx` has a "$ Billing" button next to "# Codes".
- It opens Billing review in a wide drawer, using `components/Billing/CaseBillingReview` and `hooks/useCaseBillingReview`.
- Changes are saved through `saveCytologyUnitCoding` / `saveCytologySpecimenBilling`, then charged or credited.
- The User and Admin Guide is in `services/billing/README.md` (Batch 460).
- This closes the Batch 453 open item "No screen shows billing in the Cytology Workspace" (superseded).

**Batch 460, after independent review:**
- Billing saves read the case as saved and adopt its version, so "Approve all" across decants works.
- Only an orchestration case is charged, as on the report page.
- A failed block save has its own message.

## Batch 511 (PS-478): full strict type-checking

`useCytologyRevision` accepts a `null` specimen id, which it already handled.

## Batch 514 (PS-269)

Patient names on the worklist and the screening page show in the screen's language (Korean: full name + 님).

## Batch 519 (PS-273)

`CytologyScreeningPage.tsx` reads the Synoptic Library's cytology templates when it opens, so the sign-out checks use the published versions. The synoptic drawer's picker lists them.

## Batch 523

`CytologyScreeningPage.tsx`: on the pathologist track, Sign out first runs the clinical-pathologic mismatch check (`services/cytology/cytologyClinicalMismatch.ts`). A suggestion is decided in the shared mismatch window, then the signature step follows (PS-145, decision 15).

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 530 (PS-554)

`CytologyScreeningPage.tsx`: specimen sign-out uses `clinicalMismatchService.atSignOut`: only a high-risk mismatch opens the window; a low-risk one is logged for QA. No inline alert in the workspace yet.

`CaseClinicalHistoryBar` above sign-out: the clinical history line and "Mismatch check deferred" notice, the same as on the report page.

## Batch 531

The inline mismatch alert (`ClinicalMismatchAlert` via `hooks/useClinicalMismatchCheck.ts`) above the clinical history line, per specimen, once the final diagnosis is chosen (pathologist track).

## Batch 532

One case report per accession (Pete, Oct 12). `CytologyScreeningPage.tsx`: **Print case report** (`cytology/cytologyCaseReportForPrint.ts`) once a multi-specimen case is released; **Finalize case early** now releases the case report (`releaseFinalizedCytologyCase`). `hooks/useCytologyRevision.ts`: a correction or addendum goes to the registry only when the case report was reissued (the case is released). The sign-out message says the case report is released when the last specimen is signed. Details: `services/cytology/README.md`, Batch 532.

## Batch 533

**Send urgent preliminary** (`components/CytologyPreliminaryPanel.tsx`, `hooks/useCytologyPreliminary.ts`): before a specimen is signed out, once its final diagnosis is chosen. It opens inline, not in a window: one click on a reason, an optional note, then Send (or "Sign and send", opening the signature window when the laboratory requires it). The preliminaries already sent are listed under it. The button greys out without `cytology:preliminary:release`; the service checks it again. Details: `services/cytology/README.md`, Batch 533.

## Batch 534

`HeldReportsBanner` above the preliminary panel lists the reports waiting out the release delay: the case report, revisions and preliminaries. Recall is there for the person who released them, and the page reloads with what was reopened. `hooks/useCytologyRevision.ts` passes the registry details to the release (it no longer submits them itself). A recalled preliminary is listed as recalled.

## Batch 539

`CytologyScreeningPage.tsx`: Print and Print case report open the report renderer's PDF (a preview before sign-out carries the PRELIMINARY — SUBJECT TO CHANGE watermark; a released case report is its stored document). The tab opens at the click so the browser doesn't block it; a failure closes it with a message (`cytologyScreening.printFailed`, or `printRendererOutdated` when the renderer hasn't been redeployed). The blob URL is released after a minute.

## Batch 540

`hooks/useCytologyRevision.ts`: a correction or addendum refused during the release delay shows `cytologyRevision.toasts.inReleaseDelay`.

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- Loading text here now goes through `LoadingState` (`components/Common`): nothing for 300 ms, then the screen's own loading text, and "Still working…" from 3 s. Carried over from Batch 548; `services/connectivity/latency.guard.test.ts` now covers every loading text in the app.

## Batch 565 (WCAG 2.1 AA)

- Contrast of colours set in code raised from the old greys; filter tiles say which is selected (`aria-pressed`) where this folder has them.

## Batch 566 (WCAG 2.1 AA, 4.1.2)

- The screening rows hold buttons of their own, so a row is no longer a button: `clickableContainer` (`utils/a11y/pressable.ts`) keeps the click anywhere on the row, and the patient's name (or MRN), still tagged `data-phi="name"`, is a real button that opens the case (`.ps-cytoworklist-row-open`, same look as before plus a hover underline and a focus ring). Pool rows are unchanged (not clickable). The tab tiles have `type="button"`.
- `CytologyWorklistPage.rowOpen.test.tsx` (new): the name button opens the case once; the row has no role or tab stop; clicking elsewhere on the row opens it; a pool row doesn't; Manage flags doesn't also open the case.

## Batch 572 (readiness review F7, option C)

- "Today's screening hours": `components/ScreeningHoursPanel.tsx` and `hooks/useScreeningHoursSignOff.ts`, shown once something is recorded that day, with the facility time zone.

## Batch 574

- The workload counter (`components/CytologyWorkloadCounter.tsx`, `hooks/useCytologyWorkloadSummary.ts`) on the worklist and the screening page (with the review open now and the chosen mode); yesterday's screening hours panel above today's.

- Batch 608: the screening page shows `ReturnToTraineeBar`, the suggested-severity badge and `CytologyScreeningDetailsCard`.

## Batch 630 (PS-174)

HPV Triage: Record Negative / Record Positive are now `CapabilityButton`s (`cytology:hpv-result:record-manual`) that open `components/ManualHpvResultModal.tsx` (required Result Source; a notice when the entry would replace an interface result). `hooks/useManualHpvResult.ts` calls `services/cytology/recordManualHpvResult.ts`. A row with an entry waiting for a second sign-off shows Approve / Reject instead.

## Batch 631

Recall needed: in Australia and New Zealand each row shows `components/SelfCollectedRecallDetail.tsx` (Urgent/Routine, target window, programme wording); an Invalid self-collected result shows "repeat collection needed". The jurisdiction is the case's performing lab's, then the institution setting.


## Batch 635

`CytologyScreeningPage.tsx`: after a CLIA workload block the message names the colleagues the pending cases went to and how many went back to the pool (`workloadReassignmentNotice`, services/cytology); no line added to the page.

## Batch 636

`components/CsmsEligibilityActions.tsx` (+ `.css`, test): on the CSMS QA tab, Eligibility verified (one click) and Record not eligible (quick-pick reason), through `verifyCsmsEligibility`; Manage flags is kept. `CytologyWorklistPage.tsx` gains one component line.

## Batch 638

The CSMS QA confirmation now says whether the CSMS message is being sent (Verified) or was not sent (Not eligible).

## Batch 640

The Recall needed detail uses the lab administrator's wording for the case's country and the screen language when one is saved, and the country's own windows (Batch 640).

## Batch 750

`CytologyScreeningPage.tsx`: in whole-slide-image mode the bar shows the slide's reference preview (`SlideImagePreview`) instead of the launch button; 1,527 lines (was 1,536).
