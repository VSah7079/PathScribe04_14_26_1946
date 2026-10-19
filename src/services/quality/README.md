**Batch 617 (part R):** the server version(s) in this folder use the one route style `/api/<area>/<service>/<method-kebab>` (GET for plain-value reads, POST otherwise); earlier paths are in `docs/architecture/HTTP_ROUTE_MAPPING.md`.

# services/quality/

Generic services for PS-108's real QA Activity Framework.

**Pattern:** Standard interface/mock pattern (no firestore stub currently).

## Files

- **`IQaActivityTypeService.ts`** / **`mockQaActivityTypeService.ts`** — Real CRUD for `QaActivityType` definitions (`types/quality/QaActivityType.ts`) — mirrors `IDeficiencyTypeService`'s own established shape (`services/deficiencies/`) exactly, the same real, proven pattern this app already uses for an admin-curated dictionary. Seeded with two entries: the real "Frozen vs Final Correlation" definition (the activity Discordance now runs on exclusively) and one genuinely different second example (Cytology-Histology Correlation), proving the model accepts a new activity type with zero changes to the model itself — PS-113's own real acceptance criteria. Also exports `FROZEN_FINAL_ACTIVITY_TYPE_ID` — the real, stable id every real reader/writer of Frozen vs Final data filters or tags against, moved here in Stage 5 from the now-deleted `reconciliationRecordMapping.ts` (its own natural home — right next to the activity type it identifies).
- **`IQaActivityRecordService.ts`** / **`mockQaActivityRecordService.ts`** — Real create/list for `QaActivityRecord` instances (`types/quality/QaActivityRecord.ts`) — deliberately simple (`getAll`/`create` only, no update/delete). **Real, current status (PS-113, Stage 5):** the sole system for this data. Seed data is 175 real, migrated Frozen-to-Permanent records (10 discordant, 165 concordant) as **frozen, static data** — generated once via a real, throwaway script that captured the exact output of the real migration transform Stage 3 already verified, confirmed byte-identical to Stage 3's own passing tests before being written in. No longer a live computation, since there's no longer an old service to compute it from. Plus the one Cytology-Histology illustrative record, proving genuine cross-activity-type use — 176 real seed records total.
- **`IQaSupervisionAssignmentService.ts`** / **`mockQaSupervisionAssignmentService.ts`** — Real CRUD + real in-place mutations for `QaSupervisionAssignment` instances (`types/quality/QaSupervisionAssignment.ts`) — mirrors the old `IFppeAssignmentService`'s own real, richer 5-method shape exactly (`getAll`/`getActiveAssignmentForUser`/`create`/`recordCaseReviewed`/`graduate`), including the real `endConditionMet`/`completionReason` auto-completion logic, carried forward unchanged from `mockFppeAssignmentService.ts`. Real, deliberate design addition: `getActiveAssignmentForUser` now takes `activityTypeId` as a required, explicit parameter — the old, FPPE-only service never needed this, but the new, generic service could in principle serve more than one supervision-style activity. Also exports `FPPE_ACTIVITY_TYPE_ID`. Seeded with 3 illustrative examples (active mid-progress, completed-by-threshold, completed-by-manual-graduation) — unlike PS-113's own Stage 2, there's no real historical seed data to account for later: confirmed directly, the old `mockFppeAssignmentService.ts`'s own real seed was an empty array. `create()` accepts a real, optional explicit `id` — used by the real shadow-write from `FppeAssignmentsSection.tsx`, so the same logical assignment shares one real id across both the old and new systems. **Gate-check itself cut over in PS-114, Stage 4** — see this file's own "## Notes" section below for the full account; this is the *instance* service, not the type-definition one below. **Real fix (FPPE Facility organization):** `create()` gained an optional `facilityId`, carried through unchanged from `FppeAssignment`'s own now-required field via the shadow-write — optional here (not required, unlike the FPPE-specific old system) since this archetype is deliberately generic enough to serve a future, genuinely different supervision-style activity that might not be facility-scoped at all.
- **`IQaSupervisionAssignmentTypeService.ts`** / **`mockQaSupervisionAssignmentTypeService.ts`** — **New (PS-115).** Real CRUD for `QaSupervisionAssignmentType` *definitions* (`types/quality/QaSupervisionAssignmentType.ts`) — a genuine gap found while scoping the Configuration Center, not a deliberate PS-114 omission: PS-114 built the real, working assignment *instance* service above, but never a CRUD service for the definition type itself, since nothing needed to create/edit one until this ticket. Mirrors `IQaActivityTypeService`'s own exact shape. Seeded with one real entry — FPPE/Credentialing Review — sharing the exact same id (`FPPE_ACTIVITY_TYPE_ID`, imported directly from `mockQaSupervisionAssignmentService.ts` above, never redefined) every real assignment instance already carries as its own `activityTypeId`, so the real FK relationship between definition and instances can't drift out of sync.

## Notes

- Recent, actively-developed feature (part of the intraop/reconciliation work, and now PS-108's own QA Activity Framework).
- **Real, per direct guidance (PS-134, Sign-Out Guardrails + Secondary Review Routing): `capaTriggerRule` is now actually consumed.** Confirmed directly before building this: the field existed on `QaActivityType` and was configurable in the admin UI (`QAConfigurationCenterSection.tsx`), but nothing anywhere ever read it — a real, pre-existing gap, not something specific to PS-134. `mockQaActivityRecordService.ts`'s own `create()` now checks every new discordant record's severity against its own activity type's `capaTriggerRule` and auto-raises a real `SpecimenDeficiency` (`services/deficiencies/`) when it matches — the real, generic mechanism this field was always meant to drive, now benefiting *any* activity type with a rule configured, not just the one new activity built for PS-134. Fails closed on a raise error (logged, never thrown) — the real QA record itself has already persisted by that point, so a CAPA side-effect failure never rolls that back.
- **New activity type, per direct guidance**: `ABNORMAL_FINDING_CONFIRMATION_ACTIVITY_TYPE_ID` ("Abnormal/Critical Finding Confirmation") — real, honest audit-trail log of the PRIMARY pathologist's own confirmation of a Critical/Malignant abnormal-detection finding (PS-129/PS-131), created with `outcome: 'concordant'` and no `severity` (QaActivityRecord's own contract: severity is only meaningful on a discordant record). Wired from `useSignOutWorkflow.ts`'s `handleRecordCriticalNotification`, fire-and-forget, same posture as the existing PS-137 signal capture in that same function. **Real, corrected design, per direct follow-up ("when would a CAPA be needed?"): deliberately carries NO `capaTriggerRule`.** An earlier version of this code incorrectly fired a CAPA on every confirmed finding — a real design error, since a primary pathologist confirming their own correct diagnosis is not a nonconformity (ISO 15189:2022 Clause 8.7's real trigger), and in a department diagnosing cancer routinely this would have flooded the CAPA queue with hundreds of records for correct, unremarkable diagnoses. The real, three genuine CAPA triggers instead — none of which are "a primary read was confirmed" — are tracked as their own, separate tickets, each reusing this same generic trigger-consumption mechanism: PS-144 (a real, independent second-pathologist peer-review disagreement — no such workflow exists in this app yet), PS-145 (PS-131's own missing pre-op/clinical-indication discrepancy check), PS-146 (a clinically-significant post-sign-out correction).
- **New activity type, Cytology & Cervical Screening module Phase 3 (Sep 2026), corrected**: `GYN_CYTOLOGY_SECONDARY_SCREENING_ACTIVITY_TYPE_ID` ("GYN Cytology Secondary Screening") — records one real secondary screening event (renamed from an original, QC-only name once direct follow-up corrected the model: the underlying role is always Cytotechnologist, but a case can have multiple secondary screening events for different real reasons — the standard random-sample or targeted-high-risk QC rescreen, or a senior/lead cytotechnologist's own Secondary Reviewer look — captured on the event's own `trigger` field). One `QaActivityRecord` per event, via this same, existing framework, exactly as Frozen/Final and Cytology-Histology Correlation already do, rather than a third, parallel tracking system. `services/cytology/resolveCytologySecondaryScreeningConcordance.ts` computes the real, structured comparison (`addedByEvent`/`missedByEvent`) between the primary screen and one secondary screening event. Same corrected, deliberate posture as Abnormal/Critical Finding Confirmation above: **no `capaTriggerRule`** — a single discordant event is real, valuable audit trail, not an automatic CAPA trigger. A genuinely recurring discordance pattern for one screener is PS-147's own, real, later scope.
- **`components/Contribution/QualityTab.tsx`'s discordant-case list** reads from here via `getAll()` and `qualityCalculations.ts`'s `reconciliationRecordsToDiscordantCases`.
- **Real migration history (PS-113):** this app used to have a separate `mockReconciliationService.ts`/`ReconciliationRecord.ts`/`IReconciliationService.ts` system — Discordance's original, real implementation. Migrated in stages: the generic model was built and validated (Stage 3, including a real dual-write so nothing broke mid-migration), all 5 real readers moved over (Stage 4), then the old system — genuinely dead at that point, confirmed via a comprehensive, fresh search before deleting anything — was retired and deleted outright (Stage 5; first release, no real production history to preserve). `reconciliationRecordMapping.ts`, the shared function that made the migration itself possible, was deleted alongside it once its last real callers (the seed computation and the modal's dual-write) were gone.
- **Real, higher-stakes migration for PS-114 (Stage 4, done — gate-check cutover complete):** unlike PS-113's own real consumers (all reporting/dashboard reads), the old FPPE system's real consumers include `useSignOutWorkflow.ts` — a real gate-check and a real mutation firing during actual sign-out, not just displaying data afterward. Given the real risk of a naive migration (dual-writing independent, unsynchronized ids for a record that gets mutated repeatedly over an assignment's real, ongoing lifetime — unlike PS-113's simple, append-only writes), Stage 3 deliberately kept the old system as the sole, authoritative source for every real read and every real gate-check decision, adding only a real, id-synchronized shadow-write. **Stage 4 cuts the actual gate-check over**: the provisional-hire redirect (release-for-countersign, reviewer resolved from `supervisorUserId`) and the case-count increment now both read from `qaSupervisionAssignmentService` first — the increment's own write to the new system is properly awaited and its failure surfaced (`console.error`), not silently swallowed, since the gate now depends on that system staying accurate. A real, deliberate, temporary safety net runs alongside every gate evaluation: the old system's own answer is still fetched in parallel and compared, logging (never blocking or altering behavior on) any disagreement — meant to catch a real drift immediately during the transition, not left running once the old system is fully retired. **What's still NOT migrated, on purpose:** `FppeAssignmentsSection.tsx`'s own list view still reads `fppeAssignmentService.getAll()` as its source of truth (confirmed directly before this change) — old-system writes (`create`/`graduate`/`recordCaseReviewed`) stay alive as the now-secondary shadow specifically to keep that screen accurate. Migrating that screen's own reads, then retiring the old system outright, is a real, separate, later piece of work. *(Batch 515, PS-124: the last stage is done. Every FPPE screen reads this service, and the old system, its shadow writes and the drift check are gone.)*

## Batch 353

- **`qualityTatInputs.ts`** (+ `.test.ts`): the joins the Quality tab made before its TAT outlier calculations, moved out of `QualityTab.tsx`.
  - `withPerformingLabs`: each case gets the lab its ordering facility sends to.
  - `facilityNamesById`.
  - `consultationRecords`: delegations plus informal review requests.

## Batch 382

- **`discordanceRecord.ts`** (+ `.test.ts`): builds the QA activity record the frozen-versus-final reconciliation modal saves (`buildDiscordanceRecord`), from the organisation's Field Requirements. It returns nothing while a required field is missing. A concordant call stores the categories and diagnoses; a discordant one adds the delta, impact, root cause and comment, and a high impact needs escalation. The modal used to build this itself.

## Batch 396: surgical post-sign-out QA from the report page

- `surgicalQaReview.ts`: listing the items waiting on cases (`buildSurgicalQaRows`), recording a review (the QA activity record, then linking it on the specimen) and dismissing a correlation candidate. These decisions used to be inline in `SurgicalQaWorklistPage.tsx`; the report page now uses them too (`components/QualityAssurance/SurgicalQaCaseBar.tsx`).
- Recording or dismissing checks **`surgical:qa-review:record`** (high risk), seeded to Pathologist and Fellow, the roles that had the queue.
- `reviewQueueCounts.ts`: the item counts on the Worklist's two queue tiles (Pete).

## Batch 428: Configuration permissions

- `mockQaSupervisionAssignmentService`: `create`, `graduate` need `config:cytotech-competency:manage`.
- `mockQaActivityTypeService`: `add`, `update`, `deactivate`, `reactivate` need `config:qa-types:manage`.
- `mockQaSupervisionAssignmentTypeService`: `add`, `update`, `deactivate`, `reactivate` need `config:qa-types:manage`.

Before, anyone who could open Configuration could change this; now each change is checked in the service (`authorization/guardConfigWrites.ts`, audited) and a refusal changes nothing. Reads are unchanged. Seeds: Admin and Lab Director; see `docs/architecture/AUTHORIZATION_API.md`.

`standardQaTypeRules.ts` (new): a standard QA activity or supervision type can't be switched off or made custom. The services refuse it now; before, only the screen hid the control. FPPE and cytotechnologist competency assignments: `config:fppe:manage` / `config:cytotech-competency:manage`.

## Batch 432

Surgical peer review risk weights can now be set: QA Configuration Center → Surgical Post-Sign-Out Peer Review → "Risk weight by subspecialty". Setting or removing one needs `config:qa-types:manage` (the service is guarded). Blank = 1×; a weight is above 0 and up to 10 (`riskWeightInput.ts`).

## Batch 438 (PS-144 to PS-148): the CAPA recommendation engine

Pete (Oct 2): PathScribe recommends a CAPA; a QA lead confirms it (which opens and assigns the CAPA) or dismisses it with a reason. Nothing opens a CAPA by itself any more.

- `capaRecommendationRules.ts` (pure) decides:
  - `qaRecordRecommendation`: what a QA review with an outcome recommends. Consensus reached → nothing. Reviewers unresolved → always. Otherwise the activity type's severities, as before. A discordance from the after-sign-out peer review is its own source (`post-signout-discordance`, PS-148).
  - `findLinkTarget`: a new event that belongs to a live recommendation (pending, or confirmed with its CAPA still open) is linked to it, not added. A clinically significant correction links to a discordance on the same case; the same deficiency type on the same specimen links to the earlier one. A dismissed one never absorbs a new event.
  - `decisionProblem`, `capaComment`, `capaOwnerOptions`, `capaQueueOrder`.
- `capaRecommendationService.ts`: `recommend`, `confirm` (owner required; raises an open deficiency with `assignedTo` and `capaRecommendationId`), `dismiss` (reason required). Confirm and dismiss check `qa:capa-recommendation:decide`. Audit events `CAPA_RECOMMENDED`, `CAPA_RECOMMENDATION_LINKED`, `CAPA_RECOMMENDATION_CONFIRMED`, `CAPA_RECOMMENDATION_DISMISSED`.
- `mockCapaRecommendationService.ts`: the browser's copy (`pathscribe_capa_recommendations`), with two demo recommendations.
- `mockQaActivityRecordService.ts`: the PS-134 auto-raise is gone; a qualifying review now recommends. It no longer imports the deficiency service.
- Tests: `capaRecommendationService.test.ts`, including a regression guard (Pete's watch-item 1): no file but the engine raises a deficiency of a recommend-only type, and the QA record service can't import the deficiency service.

## Batch 439 (PS-144, PS-145, PS-148)

**Peer review before sign-out (PS-144).** Pete (Oct 2): triggered by a first-time malignancy judged from the patient's prior cases; a different pathologist reviews; consensus reached recommends no CAPA, unresolved recommends one; the sign-out gate is configurable and off by default.
- `peerReviewRules.ts` (pure, `peerReviewRules.test.ts`):
  - `firstTimeMalignancy`: malignant now (the pathologist's confirmed finding), no prior case of the patient (or a confirmed same-person identity) malignant, and no known malignancy in the order's clinical history (`MAL_STAGE`) or indication. `statesMalignancy` ignores negated and tentative mentions ("negative for carcinoma", "rule out lymphoma").
  - `peerReviewerOptions`: active staff holding the Pathologist role (matched by name to the role catalog), never the signer.
  - The request, read, resolution, withdraw and override checks; `peerReviewState` / `peerReviewBlocksSignOut`; `peerReviewGateOn` (department, then performing lab, then organisation; off by default); `qaRecordForCompletedReview`.
- `peerReviewService.ts` / `mockPeerReviewService.ts`: request, the reviewer's read, the consensus step, withdraw, and the urgent-care override (owed within 24 hours). Checks `case:peer-review:request`, `case:peer-review:record`, `case:peer-review:override`; audited. A completed review writes a "Pre-Sign-Out Peer Review" QA record (the reviewer records it; the signer is `reviewedPathologist`), and the CAPA engine recommends from an unresolved one.
- `mockPeerReviewSettingsService.ts`: where the gate is on; `config:peer-review:manage`; every change audited (`PEER_REVIEW_GATE_CHANGED`).
- `peerReviewStatus.ts` / `peerReviewStatusLive.ts`: one case's state, read by both the report page's banner and the sign-out gate. The gate's facility is the performing lab, from the ordering facility (or the enterprise facility that lists the case's tenant).

**Recommendations (PS-145, PS-148).** `capaRecommendationRules.qaRecordRecommendation` now also:
- recommends source `clinical-mismatch` for an unresolved "Clinical-Pathologic Correlation" record;
- treats any record made after release (`postSignOut`) as `post-signout-discordance`, and honours a rule's `postSignOutOnly` (the outside-consult type).

**Activity types.** Three new standard types: Pre-Sign-Out Peer Review, Clinical-Pathologic Correlation, Outside Consult Correlation. `mockQaActivityTypeService` now adds standard types missing from a browser's stored list (`withMissingSeedRecords`).

**Correction to this README's Notes (stale since Batch 438):** `capaTriggerRule` no longer auto-raises a deficiency. Since Batch 438 every trigger recommends a CAPA, which the QA lead confirms (opening it) or dismisses with a reason. The Notes paragraph above that says "auto-raises a real SpecimenDeficiency" describes the PS-134 behaviour Batch 438 replaced.

## Batch 441

`capaTriggerSummary.ts` (`capaTriggerSummary.test.ts`) gives the QA Configuration Center's CAPA Trigger column its content: severities, deficiency type, and "after release only". The screen now has the checkbox for `capaTriggerRule.postSignOutOnly` (PS-148, an earlier open item), and shows severities and jurisdictions translated.

## Batch 442: discordance patterns over time, set per site (PS-147)

Pete (Oct 2): "Hardcoding a global numeric threshold or fixed time window … is an anti-pattern for enterprise laboratory software." Every threshold is a site setting.

- **`qaTrendRules.ts`** (pure, `qaTrendRules.test.ts`):
  - **Policy.** `DEFAULT_QA_TREND_POLICY` uses the developer's numbers as editable defaults: 3 months, 20 reviews, 3 majors or 10%, major = high. `effectiveQaTrendPolicy` (a lab's own, else the organisation's); `qaTrendPolicyProblem` (validation); `withLabQaTrendPolicy` and `toggledMajorSeverity` (screen helpers); `qaTrendPolicyChange` (English audit text).
  - **Patterns.** `qaTrendCandidates` groups completed reviews per pathologist (records naming `reviewedPathologist`) and per specimen type (whoever read it), per performing lab, judged by that lab's policy; `trendTrigger` checks the minimum, then count or rate. `newQaTrendRecommendations`: one open recommendation per subject and lab. A concluded one isn't raised again on the same majors, only when a new major discordance arrives (a bug found in the browser check).
  - **Decisions.** `qaTrendDecisionProblem` and `applyQaTrendDecision`: start a review; conclude with a CAPA only after a review, with a note; dismiss with a reason. `qaTrendQueueOrder` and `qaTrendPendingCount` for the list.
- **`mockQaTrendPolicyService.ts`**: the settings. Checks `config:qa-trend-policy:manage`, validates, and audits (`QA_TREND_POLICY_CHANGED`).
- **`qaTrendService.ts`** (`createQaTrendService`, `qaTrendService.test.ts`): `list` and `evaluate` need `qa:pathologist-trend:view`; `decide` needs `qa:pathologist-trend:decide`. Audited as `QA_TREND_RECOMMENDED` and `QA_TREND_DECIDED`. `qaTrendServiceLive.ts` resolves each record's performing lab and specimen type.
- **`surgicalQaReview.ts`**: a retrospective peer review now records `reviewedPathologist` (the case's primary, else its assignee; `reviewedPathologistOf`), so it counts toward the pathologist pattern. Correlations don't.

## Batch 444

`capaRecommendationService.test.ts`: the "only the engine raises these" guard compared paths with `/deficiencies/`, so on Windows (backslashes) it flagged `mockDeficiencyTypeService.ts`. Paths are now normalised to forward slashes. Found by Pete running the suite on Windows; a test fault, not a product one.

## Batch 451 — screen-level test evidence for Priority 2 tickets

`qaEvidenceBinderCsvRows` / `qaEvidenceBinderExportFilename` in `resolveQaEvidenceBinder.ts`; no patient columns (PS-121).

## Batch 453 — The Batch 452 open items, and the native-speaker review register

- `biopsyResectionCorrelationSettings.ts` (new): the surgical biopsy-to-resection window, set per enterprise, jurisdiction and facility (`config:biopsy-resection-correlation:manage`). `getEffectiveBiopsyResectionRule(facilityId)` resolves it.
- `resolveSurgicalBiopsyToResectionCorrelationCandidates.ts`: the window is a rule, not a fixed 180 days. `DEFAULT_BIOPSY_RESECTION_RULE` is 180 days from collection, falling back to receipt and then sign-out. A plain number still works and means days from receipt.
- `applySurgicalPostSignOutQa.ts` passes the collected, received and sign-out dates and the facility's rule.

## Batch 454 — Follow-up not received: report, alerts and clinician email

`resolveSurgicalBiopsyToResectionCorrelationCandidates.ts` exports `resolveSiteMatchStatus`, so follow-up tracking (`services/followUp/`) applies the same site rule when deciding whether a resection arrived.

## Batch 456 — Sign-in lockout, password screening, demo seeds

The FPPE seed `qa-supervision-seed-003` made Oliver Pemberton (Manchester) Pete's supervisor. It is now Michelle Nimmo, supervised by Pete, both at Desert Valley. `demoBaseline.test.ts` checks Pete is nobody's FPPE supervisee and each seeded name matches its id.

## Batch 458 — PS-71: every case save carries its version

PS-71 (Pete's optimistic-locking spec, Oct 4): a save made from an old copy of a case no longer overwrites someone else's newer save. See `services/cases/caseWrite.ts` and `docs/architecture/CASE_API.md`.

Surgical post-sign-out QA and QA review saves are versioned (`applySurgicalQaAdditions`). A lasting conflict is logged and never blocks sign-out.

## Batch 504 — QA trends by the facility's calendar month

New `facilityMonthlyTrend.ts` (pure, tested): the "last 6 months" behind the QA trend charts, bucketed with `utils/facilityTime.ts`. Six copies of the same loop bucketed stored events by the viewing device's time zone, so an event near midnight at a month boundary landed in the wrong month for anyone reviewing from another time zone. The copies were on the Quality Assurance page and in the Reconciliation, Countersign turnaround, Intra-op linkage, Access requests and QA dashboard views. `resolveQaActivityDashboardReport` takes the facility time zone. `facilityTime.ts` had helpers written for exactly these files; they had never been wired in. `qaTrendRules.windowStart` and `resolveQaEvidenceBinder` move their windows with UTC arithmetic.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 515 (PS-124, PS-147)

- **FPPE moved fully onto the supervision service.** `FppeAssignmentsSection.tsx`, `FppeTrackingTab.tsx` and the Audit Log's FPPE log now read `qaSupervisionAssignmentService` (FPPE activity only). The legacy `fppeAssignmentService` and its type are deleted, and so are the sign-out shadow write and drift check. The legacy browser store is cleared at start-up (`browserCleanup/retiredBrowserKeys.ts`).
- **New `fppeAssignmentForm.ts`** (+ test): the FPPE screen's decisions — can-create, end condition, FPPE-only split, progress percent, overdue, tracking CSV rows.
- **Permission per activity (bug fix).** `mockQaSupervisionAssignmentService` checked `config:cytotech-competency:manage` for every create and graduate. FPPE needs `config:fppe:manage`, so the FPPE screen's copies were refused for anyone with FPPE rights alone. The refusal was silent because the shadow write swallowed it. Each activity now checks its own permission; an activity with none is refused. The end-condition check now uses `computeFppeProgress`, the same helper the screens use.
- **`qaTrendService.pendingCount()`:** the trend-review tile on the QA page shows its count when the page opens (PS-147).

## Batch 516 (PS-125): QA review-field editor

- `qaFieldSchemaRules.ts` (+ test) encodes Pete's schema-evolution rules: a saved field or option can be relabelled or made optional, never removed or retyped; new ones can be added freely.
- It also checks completeness: labels, unique ids, and options on choice fields.
- `mockQaActivityTypeService` refuses an `add` or `update` that breaks them, so no screen can break past QA records.

## Batch 518: generic QA activity board (PS-120)

`qaActivityBoard.ts` (+ test) builds one tile and one table per QA activity.
- **What gets a tile:** every active Standard and Custom activity type. Countersign is added through an adapter over `countersignService` (Pete's accepted default: an adapter, not a data migration).
- **Table columns** come from the activity's own review fields, with option labels shown instead of ids.
- **Each tile shows:**
  - pending work;
  - work completed in the last 30 days;
  - turnaround compliance, against the activity's TAT target (the TAT entry whose type is the activity's id, PS-116);
  - the discrepancy rate.
- **What a tile can't know shows as "—", never 0:**
  - pending, for review activities, because nothing selects cases for them yet;
  - turnaround, for review records, which store when the review was recorded but not when it started.

Screen: Quality Assurance → Activities (`components/QualityAssurance/QaActivityBoardTab.tsx`).

## Batch 530 (PS-554)

- The Clinical-Pathologic Correlation activity type gains Resolution Status, Risk and Reason fields, and the missing "Cause of death" kind. `withSeedFieldsAdded` adds new seed fields and options to a stored copy without changing what's stored.
- `qaActivityBoard.ts`: that tile's "pending" is the deferred mismatches awaiting secondary review.
- `reviewQueueCounts.ts`: the Worklist's Surgical QA count includes them.

## Batch 544

`resolveQaEvidenceBinder.ts`: `qaEvidenceBinderExportFilename` takes the scope and names the facility or organisation exported (enterprise-wide keeps the old name).

## Batch 589 — Demo discordance data (PS-147)

`demoDiscordanceSeed.ts`: five post-sign-out peer reviews (3 minor, 2 major) across three pathologists, and the two CAPA recommendations the major ones raise. The QA activity record seed is now 181 records. Five cases do not trip the pattern rule (20 reviews, 3 majors), so no pattern tile shows.

Batch 616 (part D, PS-501): server versions of QaActivityRecordService, QaActivityTypeService, QaSupervisionAssignmentService, QaSupervisionAssignmentTypeService, ReconciliationService, SurgicalPeerReviewRiskWeightService (`http<Name>Service.ts`, instance file `<name>ServiceInstance.ts`; mock in the demo, API server when an address is configured). Calls: `docs/architecture/QUALITY_API.md`.

## Batch 617 (part C): server versions (PS-514)

The peer review, peer-review settings, CAPA recommendation and QA trend policy services here now have an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are listed in `docs/architecture/QUALITY_SETTINGS_API.md`. The mocks are unchanged.
