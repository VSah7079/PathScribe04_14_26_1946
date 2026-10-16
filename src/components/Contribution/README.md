# components/Contribution/

The "My Contribution" dashboard tabs — AI acceptance/override metrics,
productivity (case/RVU tracking), and quality (discordance/amendment/TAT
metrics).

**Pattern:** Each tab is a large, self-contained component with its own
charts (recharts) and date-range filtering.

## Files

- **`AIContributionTab.tsx`** (~470 lines) — AI acceptance/override
  breakdown by workflow (synoptic/narrative). Own comment documents a real
  near-miss worth knowing about generally: it was migrated off a dead
  service after confirming zero real callers — except a case-sensitive
  grep had missed this file itself as the one real caller, caught before
  the migration broke it. Correctly imports `SpecimenEntry` from its new
  home (`services/specimenDictionary/specimenTypes.ts`, relocated earlier
  this session) — confirms that fix propagated cleanly. No issues.
- **`ProductivityTab.tsx`** (~530 lines) — Case/RVU tracking chart. **Real fix, from a direct product review flagged by Pete:** case counts were entirely hardcoded (`mockMonthly`) — every pathologist saw identical fake numbers regardless of their own actual work, with zero disclosure this was demo data. Case counts are now genuinely real, computed from actual finalized cases via the new `productivityCalculations.ts` (`computeMonthlyCaseCounts`, `wasFinalizedByUser` — the real signal is `Case.diagnostic.finalizedBy` matching the current user, not just "assigned to me," which includes in-progress work). RVU values and peer comparison (`demoPeerData`/`demoRvuTile`, renamed from `mockPeerData`/`mockRvuTile` for clarity) remain demo-only, unchanged, per a scoping decision: no real RVU data source exists anywhere in the app (no CPT-to-RVU mapping, no per-case RVU field), and peer comparison needs an admin-configurable visibility toggle plus a real aggregated-peer backend — both explicitly deferred as the next piece of work, not this one. **Peer visibility toggle now built** (same pass as this note's update): `canSeePeerComparison()` in `productivityCalculations.ts` gates the `PeerComparison` component on the new `SystemConfig.showPeerAveragesToPathologists` flag (admin UI: `Config/System/ContributionSettingsSection.tsx`) — every role except plain `pathologist` always sees it; `pathologist` only sees it when the org has explicitly turned it on. `RvuTile` is not gated by this — it shows only the user's own total, not a comparison, so it stays visible (still carrying its own `DemoDataBadge` for the separate, still-open concern that the RVU number itself isn't real). Both now carry a visible `DemoDataBadge` so they stay honestly disclosed in the meantime rather than silently presented as real. *(Since closed: RVU totals, the monthly RVU chart and peer comparison are now computed from real cases and the RVU Code Map (`computeRvuSummary`, `computeMonthlyRvu`, `computePeerRvuStats` in `productivityCalculations.ts`), and `ProductivityTab.tsx` no longer shows a demo badge — checked in the Batch 496 README audit.)*
- **`productivityCalculations.ts`** — New. Pure, extracted, tested real-data logic for the fix above.
- **`productivityCalculations.test.ts`** — New. 11 real tests: correct-user vs wrong-user finalization, missing/incomplete data handled without crashing, correct month bucketing, no future months, cross-year exclusion, multi-case accumulation, and the all-zero case for a user with no finalized work.
- **`QualityTab.tsx`** (~940 lines, the largest here) — Discordance/
  amendment/TAT metrics. (It no longer imports `mockActionRegistryService`;
  corrected in the Batch 496 README audit.) **Real fix, from a direct product review:** discordant-case
  and amended-case lists were entirely hardcoded (`mockDiscordant`,
  `mockAmended`) — detailed, realistic-looking fake clinical data shown
  to every pathologist identically, zero disclosure it was demo data.
  Both now come from real, already-built systems this app has elsewhere:
  discordant cases from `services/quality/mockQaActivityRecordService.ts`'s
  real `QaActivityRecord` data (the Frozen-to-Permanent Reconciliation
  Gate — migrated from the old `mockReconciliationService.ts`/
  `ReconciliationRecord` in PS-113, Stage 4), amended cases from
  `services/reports/mockAmendmentService.ts`'s
  real `AmendmentRecord` data (the Amendment/Correction/Addendum system)
  — the latter needed a genuinely new `getAll()` method added to
  `IAmendmentService`, which didn't exist before (only
  `getByCaseId`/`getOpenDraftsForPathologist`). See
  `qualityCalculations.ts` for the real transform logic. Caught and fixed
  a real mistake of my own mid-build: an early version used the raw
  `caseId` as the displayed "case type," which would've shown a case ID
  where a real specimen description belongs — fixed by having the
  transform accept a real case-type lookup built from actual `Case`
  records. Also fixed the delta-rendering logic, which only ever checked
  for `"Concordant"` (the old fake data's only two values) — real
  `ReconciliationRecord.delta` has a third genuine value
  (`minor_variance`) that was silently falling into the "upgraded"
  styling bucket. Separately noted, not fixed: the `ps-delta--*` CSS
  classes appear to have no matching rules anywhere in `pathscribe.css`
  — a pre-existing, unrelated styling gap.
  **`TOTAL_CASE` TAT is now real too**, the one out of eight TAT-outlier
  types that had genuinely complete real data available
  (`receivedDate`/`issuedDate` on `Case`, plus a real resolver against
  `TATConfigSection.tsx`'s actual configured entries — that admin UI's
  own `specificityScore()` was only ever a display-sort helper, not a
  callable "resolve the real target" function, which didn't exist
  anywhere before `resolveTatTargetHours()`). Found and fixed a real bug
  while wiring this: an early version read TAT entries via `storageGet()`
  (this app's usual localStorage helper, which adds its own key prefix),
  but `TATConfigSection.tsx` actually writes via raw
  `localStorage.getItem/setItem` directly — using `storageGet` would have
  silently looked in the wrong key and never found real admin-configured
  targets at all, silently falling back to system defaults regardless of
  what an admin had actually configured. Fixed to match the real
  mechanism exactly, and exported `SYSTEM_DEFAULTS` from
  `TATConfigSection.tsx` (previously private) so the same real 24h-
  routine/4h-STAT fallback applies here too.
  **All eight TAT-outlier types are now real** — `TOTAL_CASE`,
  `FIRST_TOUCH`, `GROSSING`, `SIGN_OUT`, `FROZEN_SECTION`,
  `COLD_ISCHEMIA`, `CONSULTATION_RESPONSE`, and `CONSULTATION_AWAITING`.
  `FROZEN_SECTION` needed its own approach: real data lives in a separate
  intraoperative-session store (`services/intraop/`), cross-referenced
  via `IntraoperativeEntry.mergedIntoCaseId` — and the one seed entry
  with genuine frozen-section data pointed at a case ID that didn't
  exist anywhere, meaning it could never have matched a real case
  regardless of any timestamp fix; retargeted to a real one (see
  `services/intraop/README.md`). `COLD_ISCHEMIA` corrected an earlier,
  wrong assessment of mine that no real data existed for it —
  `Specimen.collectedAt`/`processing.processedAt` were already there,
  already purpose-built for this exact CAP/ASCO metric, just never wired
  up; deliberately excludes any value flagged `processedAtIsEstimated`.
  Also caught along the way: `grossingBreaches`/`signOutBreaches`
  summary tiles had been silently reading stale hardcoded numbers since
  an earlier pass made those two sections real — fixed alongside the
  rest.
  The final two, `CONSULTATION_RESPONSE`/`CONSULTATION_AWAITING`, needed
  a genuinely different foundation, per a direct correction from Pete:
  these track *informal* reviews specifically, and this app already has
  a real, formal delegation system (`services/cases/mockCaseService.ts`'s
  `DelegationRecord`/`delegateCase`/`getDelegations`) with an
  already-configured `'CASUAL_REVIEW'` ("Informal Review") type, distinct
  from the more formal `'SECOND_OPINION'` path
  (`services/delegationTypes/mockDelegationTypeService.ts`) — so both
  functions are scoped to `CASUAL_REVIEW` only, not invented data.
  Closed a real, separate gap to make this possible at all:
  `DelegationRecord.status` included `'completed'` as a valid value, but
  nothing anywhere in this codebase ever actually transitioned a
  delegation there — every one ever created stayed `'pending'` forever,
  which had already been silently breaking `WorklistPage.tsx`'s own
  existing "Delegated to Me" count (it could only ever grow). New, real
  `completeDelegation()` function and `completedAt` timestamp close that
  gap; new `InformalReviewBanner.tsx`
  (`pages/SynopticReportPage/components/`; deleted in Batch 355, PS-346,
  after informal reviews moved to their own service) was the real, minimal UI that
  triggered it — modeled directly on the existing `AmendmentStatusBanner`
  pattern. Caught two real mistakes of my own while building it: an
  early version invented CSS classes (`ps-banner`, `ps-btn--secondary`)
  that don't exist anywhere in `pathscribe.css` — checked directly and
  fixed to the real, verified `ps-btn-secondary`; and an early version
  would have shown a raw user ID instead of a resolved name — fixed via
  `userService.getById()`. `CONSULTATION_AWAITING` is genuinely
  different in shape from every other TAT function here: it measures an
  ongoing wait (request → now), not a completed interval, since a
  still-pending request has no real end timestamp yet.
  `DemoDataBadge` removed entirely — with all eight types real, there's
  no longer any demo data in this component left to disclose.
  **Critical bug found and fixed while investigating Pete's "is there a
  mock data issue" question**: `receivedDate` genuinely lives under
  `Case.order` (`OrderMetadata`), not as a top-level `Case` field — and
  `issuedDate` genuinely lives under `Case.diagnostic`
  (`DiagnosticMetadata`), not top-level either. `qualityCalculations.ts`
  had been reading both from the wrong, top-level location since the
  `TOTAL_CASE` work — meaning `computeTotalCaseTatOutliers`,
  `computeFirstTouchOutliers`, `computeGrossingOutliers`, and
  `computeSignOutOutliers` would all have silently found zero real cases
  against actual `Case` data, regardless of seed data quality, because
  the fields they read never existed at the paths they checked. The
  `as any` cast at the `QualityTab.tsx` call site hid this from `tsc`
  entirely — removing that cast (now genuinely type-clean, no casts) is
  what surfaced a second, related bug: `caseRouter.getAll()` returns
  `ServiceResult<Case[]>`, not `Case[]` directly, and the code had been
  passing the whole wrapper object where an array was expected — which
  would have thrown a real runtime "not iterable" error, not just
  returned empty. All of this was caught and fixed together: the field
  paths corrected throughout `qualityCalculations.ts` and its tests, the
  `ServiceResult` properly unwrapped at the call site. Separately,
  `grossCompletedAt`/`firstOpenedAt` (added earlier for this same TAT
  work) had themselves been mistakenly placed inside `OrderMetadata`
  rather than the top-level `Case` interface — moved to match where
  every real read/write of them already, consistently expected them to
  be.
  **Also found, same investigation:** seed data had zero cases anywhere
  with `diagnostic.finalizedBy`/`issuedDate` set — meaning even with the
  bugs above fixed, `ProductivityTab.tsx`'s real case-count dashboard and
  all four TAT sections would still show empty for a fresh demo, since
  there was nothing to calculate from. Fixed in
  `services/cases/mockCaseService.ts` — a real, idempotent enrichment
  step gives ten existing seed cases (already assigned to the primary
  demo pathologist) realistic, chronologically consistent lifecycle
  timestamps, deliberately mixing in-target and genuine outliers rather
  than an artificially clean or artificially broken demo.
 Two new,
  real timestamp fields added to `Case` specifically for this:
  `grossCompletedAt` (set once, on genuine first grossing completion, in
  `SynopticReportPage.tsx`'s `handleGrossComplete` — deliberately NOT
  updated on a later correction/re-finalize, so it stays a stable
  milestone) and `firstOpenedAt` (set once, idempotently, in the case-
  load effect — the real "when did anyone first genuinely open this
  case" moment). `GROSSING` and `SIGN_OUT` both depend on
  `grossCompletedAt`; `FIRST_TOUCH` depends on `firstOpenedAt`;
  `TOTAL_CASE` uses the pre-existing `receivedDate`/`issuedDate`. All
  four share one extracted resolver (`computeGenericTatOutliers` in
  `qualityCalculations.ts`) rather than four near-identical copies of the
  same elapsed-time/target-resolution/outlier-gating logic.
  All eight types are now real, closing out this thread entirely.
  **Real addition ("a TAT time could have two components... the
  Performing lab and the other is the Ordering Client"), per direct
  guidance:** this is where each case's own real performing lab now
  gets pre-resolved, once, before any TAT calculation function runs —
  reusing `clientRes.data` (already loaded here for `clientNameById`,
  no second fetch) plus `resolvePerformingLabFacilityId()`. See
  `qualityCalculations.ts`'s own entry below for the full account of
  why this had to happen here rather than inside the calculation
  functions themselves (they're synchronous and pure; resolving a
  performing lab needs a real, async facility lookup).
- **`qualityCalculations.ts`** — New. Pure, extracted, tested transform
  logic for the fixes above (`reconciliationRecordsToDiscordantCases`,
  `amendmentRecordsToAmendedCases`, `resolveTatTargetHours`,
  `computeTotalCaseTatOutliers`, `computeFirstTouchOutliers`,
  `computeGrossingOutliers`, `computeSignOutOutliers`,
  `computeFrozenSectionOutliers`, `computeColdIschemiaOutliers`,
  `computeConsultResponseOutliers`, `computeConsultAwaitingOutliers`).
  **Real, current status (PS-113, Stage 4):**
  `reconciliationRecordsToDiscordantCases` migrated to accept
  `QaActivityRecord[]` instead of `ReconciliationRecord[]` — reads
  `frozenDx`/`finalDx` from the real `fieldValues` schema now, not
  fixed top-level properties. Its one real caller (`QualityTab.tsx`,
  below) migrated alongside it in the same stage — both read from the
  new, generic `qaActivityRecordService`, filtered to the real Frozen
  vs Final activity type.
  **Real addition ("a TAT time could have two components... the
  Performing lab and the other is the Ordering Client"), per direct
  guidance:** `TatEntryForResolution`/`TatResolutionContext`/
  `CaseForTatCalc` all gained `performingLabFacilityId` as a genuine
  second dimension alongside `clientId` — not a replacement, a real
  bug I nearly built by conflating them until directly corrected. A
  performing lab's own general TAT policy and a specific ordering
  client's own contractual agreement can both apply independently, so
  `resolveTatTargetHours()`'s matching and `specificityScore()`'s
  weighting both treat the two as peer dimensions (equal weight, 4
  each — an entry specifying both naturally outranks one specifying
  either alone). `specificityScore()` is now exported here as the
  single, shared implementation — `TATConfigSection.tsx` used to carry
  its own duplicate copy of the identical weighting logic, confirmed
  directly, which is exactly the kind of thing that would have
  silently drifted the moment only one of the two got the new
  dimension. New `resolveTatEntry()` extracts the actual winning-entry
  resolution (not just its `targetHours`) — `TATConfigSection.tsx`'s
  own Resolution Simulator used to run a **third**, independent,
  hand-maintained 7-case priority list that was already stale relative
  to the real resolver before this pass (it never covered every
  combination the real specificity scoring handles); it now calls
  `resolveTatEntry()` directly, guaranteeing the simulator shows
  exactly what the real, live resolver computes. Every real per-case
  call site (`computeTotalCaseTatOutliers`, `computeGenericTatOutliers`,
  the merged/frozen-section outlier function, `computeColdIschemiaOutliers`,
  `resolveConsultTarget`) now resolves and passes the case's real
  performing lab alongside its existing `order.clientId` read — pre-
  resolved once by the real caller (`QualityTab.tsx`, below), since
  these are synchronous, pure functions and resolving a performing lab
  needs a real, async facility lookup. Real, deliberate, documented
  scope boundary: `computeTatByClient`'s own per-ordering-client
  dashboard breakdown stays client-only — a user's cases for one
  client can span more than one real performing lab, so there's no
  single, well-defined lab to resolve for that aggregate row the way
  there is for one specific case.
- **`qualityCalculations.test.ts`** — 17 real tests: discordant-only
  filtering (a concordant record is real evidence a check happened, not
  itself a discordant case), all three real delta values mapped
  correctly, real day-count math, draft-vs-released filtering, severity
  derived from the real amendment-type semantics, the real case-type
  lookup and its honest fallback, and explanationOfChange/addendumTitle
  precedence.
- **`tatCalculations.test.ts`** — 41 real tests: most-specific-wins
  resolution, real system-default fallback, role-scoped entries
  correctly excluded from case-level resolution, inactive/urgency-
  mismatched entries excluded, genuine outliers flagged correctly,
  in-target cases correctly not flagged, unresolvable-target cases
  excluded rather than defaulted (no false breach risk), missing-
  timestamp cases excluded, real client-name resolution, Rush→Routine
  urgency-tier mapping, and the same missing-real-timestamp exclusion
  behavior verified for each newly-real TAT type individually (first
  touch, grossing, sign-out, frozen section, cold ischemia) — including
  frozen section's real cross-reference-to-a-real-case exclusion (the
  exact shape of bug caught in real seed data) and cold ischemia's
  never-trust-an-estimate exclusion. Plus the final two: CASUAL_REVIEW
  scoping (a formal SECOND_OPINION delegation correctly excluded),
  correct user-direction filtering (response vs. awaiting), and the
  genuine ongoing-wait-vs-completed-interval distinction between the two.
  **Real addition ("a TAT time could have two components... the
  Performing lab and the other is the Ordering Client"), per direct
  guidance:** 8 new tests covering the two dimensions resolving
  independently (a lab's own policy and a different client's own
  agreement both real and both correctly selected depending on which
  one the context actually matches), compounding specificity (an entry
  with both set beats one with either alone), a lab-scoped entry never
  firing for a different real lab, and the Enterprise-wide fallback
  still applying when both a real lab and a real client are present in
  context but neither has its own override. Also covers the newly
  extracted `resolveTatEntry()` directly — including a real test
  proving `resolveTatTargetHours` is a genuine thin wrapper over it
  (same context in, same entry's `targetHours` out), so the two can
  never disagree by construction.
- **`MentorTab.tsx`** — the supervisor's view of their supervisees (see Batch 486).
- **`aiContributionCalculations.ts`**, **`caseMixCalculations.ts`** — the pure, tested logic behind the AI and case-mix views (with `*.test.ts`).

*Corrected in the Batch 496 README audit (Oct 9, 2026): files missing from this list added; line counts updated.*
- **`FlagRow.tsx`** — **MOVED HERE this pass** (was
  `components/Dashboards/FlagRow.tsx` — a folder that existed only for
  this file and `CaseMixTile.tsx`, both exclusively serving
  `ContributionDashboardPage.tsx`; "Dashboards," plural and generic, gave
  no signal which dashboard, when `Contribution/` already existed and
  already meant exactly that). Single quality-flag row for the Quality
  Flags panel. No issues.
- **`CaseMixTile.tsx`** — **MOVED HERE this pass**, same reasoning as
  `FlagRow.tsx` above. Case-mix breakdown tile (breast/GI/GU/derm/other).
  No issues.

## Notes

- `ProductivityTab.tsx`'s case counts are now real — resolved, see its entry
  above. RVU and peer comparison are now real too (see its entry), and
  the admin visibility toggle exists (`ContributionSettingsSection.tsx`).
  *(Corrected in the Batch 496 README audit: it said RVU/peer comparison
  were demo-only.)*
- **`QualityTab.tsx`'s discordant/amended data is now real — resolved,
  see its entry above.** Corrects an earlier undercount here too: the
  original review only surfaced six hardcoded mock arrays
  (`mockDiscordant`, `mockAmended`, `mockFirstTouchOutliers`,
  `mockTotalTATOutliers`, `mockFrozenSectionOutliers`,
  `mockGrossingOutliers`) — there are actually eight; `mockSignOutOutliers`,
  `mockColdIschemiaOutliers`, `mockConsultResponseOutliers`, and
  `mockConsultAwaitingOutliers` weren't visible in that earlier, partial
  pass. All eight TAT-outlier arrays remain demo data, now honestly
  badged rather than silently left unaddressed with no visible
  indication — real fix needs the TAT Configuration system's target
  resolution cross-referenced against real per-milestone case
  timestamps, genuinely more investigation than this pass covered.
  *(Since closed: all eight TAT-outlier types are real and the badge is
  gone — see `QualityTab.tsx`'s entry above. Checked in the Batch 496
  README audit.)*
- `AIContributionTab.tsx` is a genuinely mixed state, not fully real or
  fully fake as the earlier "no issues" note implied: per-user AI
  feedback and department breakdowns are real and live, but the
  AI-override examples, comparison numbers, and monthly trend shape are
  still hardcoded (`synopticDataset`/`narrativeDataset`). Not touched
  this pass either. *(Since changed: `narrativeDataset` and the hardcoded
  monthly shape were removed — the trend is built from real data
  (`aiContributionCalculations.ts`); `synopticDataset` and a
  `DemoDataBadge` remain. Checked in the Batch 496 README audit.)*
- `FlagRow.tsx`/`CaseMixTile.tsx` were previously in their own
  `components/Dashboards/` folder — folded in here since both exclusively
  serve `ContributionDashboardPage.tsx`, same as everything else in this
  folder. `pages/WorklistPage/AmendedAddendaTriageTile.tsx` was checked as
  a possible fourth "Tile" candidate for consolidation and correctly
  ruled out — it's genuinely worklist-specific, not a contribution
  dashboard widget.

## Batch 353

**`QualityTab.tsx`:**
- It gets delegations from `delegationService` and TAT targets from `tatTargetService`. It used to import the demo case service and read the TAT screen's storage.
- Its joins (performing lab per case, facility names, delegations plus informal reviews) moved to `services/quality/qualityTatInputs.ts`.
- Amendments now come through `amendmentService`.
- Inline styles converted: the trend pill is `--ps-hue` with a `--hue` class, and the client bars use `--bar-pct` / `--peer-pct`.
- It is off both deployment baselines.

**`qualityCalculations.ts`:** the TAT target resolver moved to `services/tatConfig/tatTargetResolution.ts`. This file re-exports it.

## Batch 367 (PS-74): no inline CSS

`AIContributionTab.tsx`, `FlagRow.tsx`, `MentorTab.tsx`, `ProductivityTab.tsx`: the remaining inline styles moved into `pathscribe.css` classes. Per-instance values (sizes, positions, a colour) are passed as custom properties, and colours are derived with `color-mix()` from `--ps-hue` instead of hex strings built in JSX. The browser checks are listed in the Batch 367 changelog (`src/i18n/README.md`). The app-wide check is `services/styleRules/inlineCss.guard.test.ts`.

`ProductivityTab.tsx`: the theme tokens it uses are set once as `--prod-*` custom properties on `.ps-prodtab-main` (from `pathscribeTheme.ts`), and the `ps-prodtab-*` rules read them.

## Batch 368

`AIContributionTab`, `MentorTab` and `ProductivityTab` take their service or constant from `@/services`, and are off the deployment baseline.

## Batch 437

Printing the productivity report is audited (PS-282).

## Batch 486 — MentorTab's case-mix breakdown now covers cytology (PS-359 tracker follow-up)

A Cytotech Competency Assessment supervisor's own supervisees were always showing an empty case-mix breakdown — `buildSubspecialtyBreakdown`'s input is `QaActivityRecord`, and cytology sign-out never creates one (confirmed directly: only `CountersignRecord` is created there, and only completes correctly as of Batch 485). `caseMixCalculations.ts` gains `buildCytologyCountersignBreakdown(records, subspecialties)`, built from `CountersignRecord` instead — cytology's real resident/CT-trainee sign-out record, already carrying a real `subspecialtyId` (derived from `Case.subspecialtyId` at release). `MentorTab.tsx` now branches on `assignment.activityTypeId === CYTOTECH_COMPETENCY_ACTIVITY_TYPE_ID` (newly exported from `services/index.ts`) to use it instead of the frozen-section breakdown, and shows a distinct caption/empty-state (`mentorTab.cleanCountersignRateLabel` / `noCytologyCountersignRecords`) rather than implying diagnostic concordance — "clean" here means the attending countersigned with no field changes, a different, honest signal from `buildSubspecialtyBreakdown`'s own concordant/discordant outcome. "Returned" records count as non-clean too; still-`pending` ones are excluded (no real outcome yet).

**Considered and reverted in the same batch:** granting the four bench roles (Accessioner, Histotechnologist, Cytotechnologist, Molecular Technologist) screen access to My Contribution, so a Cytotechnologist could see their own trainee status. Pete decided the bench roles don't need this page at all — a dedicated bench-contribution page (real accessioning-rate and batch-throughput/queue-aging metrics; see `pages/README.md`) is the right next step instead of grafting bench content onto a page whose other four tabs (Overview/Productivity/Quality/AI) are built entirely around a signing pathologist's own diagnostic/RVU activity. The Mentor-tab fix above stands on its own — it's the supervisor's screen (already seeded to Pathologist/Fellow/Resident), not the trainee's.

## Batch 504

`ProductivityTab` recomputes its charts when the facility time zone setting changes (it kept the old one until the page reloaded).

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
*When this folder's contents change meaningfully, update THIS file.*

## Batch 506 (PS-477)

Files here that imported a mock service directly now import it from `@/services` (see `services/deploymentReadiness/README.md`). No change in behaviour.

## Batch 511 (PS-478): full strict type-checking

Chart tooltip and formatter callbacks use recharts' own types. `qualityCalculations.ts` passes `undefined` instead of `null` where the resolver treats them the same. No visible change.

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- Loading text here now goes through `LoadingState` (`components/Common`): nothing for 300 ms, then the screen's own loading text, and "Still working…" from 3 s. Carried over from Batch 548; `services/connectivity/latency.guard.test.ts` now covers every loading text in the app.
