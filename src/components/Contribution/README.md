# components/Contribution/

The "My Contribution" dashboard tabs — AI acceptance/override metrics,
productivity (case/RVU tracking), and quality (discordance/amendment/TAT
metrics).

**Pattern:** Each tab is a large, self-contained component with its own
charts (recharts) and date-range filtering.

## Files

- **`AIContributionTab.tsx`** (505 lines) — AI acceptance/override
  breakdown by workflow (synoptic/narrative). Own comment documents a real
  near-miss worth knowing about generally: it was migrated off a dead
  service after confirming zero real callers — except a case-sensitive
  grep had missed this file itself as the one real caller, caught before
  the migration broke it. Correctly imports `SpecimenEntry` from its new
  home (`services/specimenDictionary/specimenTypes.ts`, relocated earlier
  this session) — confirms that fix propagated cleanly. No issues.
- **`ProductivityTab.tsx`** (369 lines) — Case/RVU tracking chart. **Real fix, from a direct product review flagged by Pete:** case counts were entirely hardcoded (`mockMonthly`) — every pathologist saw identical fake numbers regardless of their own actual work, with zero disclosure this was demo data. Case counts are now genuinely real, computed from actual finalized cases via the new `productivityCalculations.ts` (`computeMonthlyCaseCounts`, `wasFinalizedByUser` — the real signal is `Case.diagnostic.finalizedBy` matching the current user, not just "assigned to me," which includes in-progress work). RVU values and peer comparison (`demoPeerData`/`demoRvuTile`, renamed from `mockPeerData`/`mockRvuTile` for clarity) remain demo-only, unchanged, per a scoping decision: no real RVU data source exists anywhere in the app (no CPT-to-RVU mapping, no per-case RVU field), and peer comparison needs an admin-configurable visibility toggle plus a real aggregated-peer backend — both explicitly deferred as the next piece of work, not this one. **Peer visibility toggle now built** (same pass as this note's update): `canSeePeerComparison()` in `productivityCalculations.ts` gates the `PeerComparison` component on the new `SystemConfig.showPeerAveragesToPathologists` flag (admin UI: `Config/System/ContributionSettingsSection.tsx`) — admin/pathologist-admin/superadmin roles always see it, the plain `pathologist` role only sees it when the org has explicitly turned it on. `RvuTile` is not gated by this — it shows only the user's own total, not a comparison, so it stays visible (still carrying its own `DemoDataBadge` for the separate, still-open concern that the RVU number itself isn't real). Both now carry a visible `DemoDataBadge` so they stay honestly disclosed in the meantime rather than silently presented as real.
- **`productivityCalculations.ts`** — New. Pure, extracted, tested real-data logic for the fix above.
- **`productivityCalculations.test.ts`** — New. 11 real tests: correct-user vs wrong-user finalization, missing/incomplete data handled without crashing, correct month bucketing, no future months, cross-year exclusion, multi-case accumulation, and the all-zero case for a user with no finalized work.
- **`QualityTab.tsx`** (830+ lines, the largest here) — Discordance/
  amendment/TAT metrics, wired to `mockActionRegistryService` for voice
  context. **Real fix, from a direct product review:** discordant-case
  and amended-case lists were entirely hardcoded (`mockDiscordant`,
  `mockAmended`) — detailed, realistic-looking fake clinical data shown
  to every pathologist identically, zero disclosure it was demo data.
  Both now come from real, already-built systems this app has elsewhere:
  discordant cases from `services/quality/mockReconciliationService.ts`'s
  real `ReconciliationRecord` data (the Frozen-to-Permanent Reconciliation
  Gate), amended cases from `services/reports/mockAmendmentService.ts`'s
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
  (`pages/SynopticReportPage/components/`) is the real, minimal UI that
  triggers it — modeled directly on the existing `AmendmentStatusBanner`
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
- **`qualityCalculations.ts`** — New. Pure, extracted, tested transform
  logic for the fixes above (`reconciliationRecordsToDiscordantCases`,
  `amendmentRecordsToAmendedCases`, `resolveTatTargetHours`,
  `computeTotalCaseTatOutliers`, `computeFirstTouchOutliers`,
  `computeGrossingOutliers`, `computeSignOutOutliers`,
  `computeFrozenSectionOutliers`, `computeColdIschemiaOutliers`,
  `computeConsultResponseOutliers`, `computeConsultAwaitingOutliers`).
- **`qualityCalculations.test.ts`** — New. 11 real tests: discordant-only
  filtering (a concordant record is real evidence a check happened, not
  itself a discordant case), all three real delta values mapped
  correctly, real day-count math, draft-vs-released filtering, severity
  derived from the real amendment-type semantics, the real case-type
  lookup and its honest fallback, and explanationOfChange/addendumTitle
  precedence.
- **`tatCalculations.test.ts`** — New. 33 real tests: most-specific-wins
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
  above. RVU/peer comparison remain deliberately demo-only, pending a
  scoped, later piece of work (admin visibility toggle + real peer
  aggregation backend).
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
- `AIContributionTab.tsx` is a genuinely mixed state, not fully real or
  fully fake as the earlier "no issues" note implied: per-user AI
  feedback and specimen-category breakdowns are real and live, but the
  AI-override examples, comparison numbers, and monthly trend shape are
  still hardcoded (`synopticDataset`/`narrativeDataset`). Not touched
  this pass either.
- `FlagRow.tsx`/`CaseMixTile.tsx` were previously in their own
  `components/Dashboards/` folder — folded in here since both exclusively
  serve `ContributionDashboardPage.tsx`, same as everything else in this
  folder. `pages/WorklistPage/AmendedAddendaTriageTile.tsx` was checked as
  a possible fourth "Tile" candidate for consolidation and correctly
  ruled out — it's genuinely worklist-specific, not a contribution
  dashboard widget.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
*When this folder's contents change meaningfully, update THIS file.*
