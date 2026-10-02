# pages/CytologyWorklistPage

The Cytology worklist and the screening page (`CytologyScreeningPage.tsx`), where a screener, secondary reviewer or pathologist records a review of a cytology case.

- `cytologyDrafts.ts`: the Bethesda review's in-progress draft (`Draft`, `EMPTY_DRAFT`).
- `components/`: the forms and banners on the screening page. See its README.

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
- The Cytology Worklist's own tiles (QC pending, 5-year lookback) still read the case's first cytology specimen.
- Countersign release is still case-level: a resident releasing one specimen puts the whole case in pending-countersign.
- Each specimen's report is its own. There's no combined multi-specimen report PDF yet.
- Next piece of work (Pete, agreed): pre-sign-out revision workflow. That means review version history with restore, reviewer notes attached to a part of someone's review, and Pending Author Revision. That status blocks choosing the final diagnosis and sign-out, and only the author clears it.

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
