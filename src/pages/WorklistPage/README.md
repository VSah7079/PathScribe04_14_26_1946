# pages/WorklistPage/

**Batch 650:** `WorklistPage.tsx` chooses the Pool and Awaiting countersign tiles for their voice and key commands (Alt+Shift+P, Alt+A). File size baseline lowered to 1315.

The main case worklist — filter tiles, the case table (rendered via
`components/Worklist/WorklistTable.tsx`, documented separately in
`components/Worklist/README.md`), and the supporting modals/tiles
specific to this page.

## Files

- **`WorklistPage.tsx`** (about 1,300 lines) — the page itself: LIS/Outreach
  context switching, the filter-tile strip, stats computation, and the
  page title above the table. Since Batch 375 it also holds the Cytology QC
  Peer Review and Surgical Post-Sign-Out QA queues as views beside the case
  list (`?view=cytologyQc`, `?view=surgicalQa`), shown to whoever may open
  them; the old `/cytology-qc-queue` and `/surgical-qa-worklist` addresses
  redirect there.

  **Real bugs found and fixed in a review pass** (`PRIORITY_FIXES.md`
  item #54 — that file is no longer in the repo): page title and tile label were two completely independent
  hardcoded strings (`FILTER_TITLES` map vs. each tile's own inline
  label) that had already drifted apart in several places — most
  visibly, selecting "Amendment & Addenda" showed "Amended Cases" as
  the page title. Also found: `countersign` wasn't in the title map at
  all, silently falling back to the generic "Active Cases" title, and
  `grosscomplete`/`urgent`/`draft` each had a different string in the
  title than on their own tile. Fixed properly, not patched: replaced
  both hardcoded copies with one shared `FILTER_LABELS` map that both
  the title and every tile's label read from (now `FILTER_LABEL_KEY`, a map of
  translation keys) — the specific class of
  drift that caused this is now structurally impossible, not just
  fixed for the one reported case.

  Also fixed in the same pass: the Urgent tile showed a bare count with
  no indication that pool-status (unassigned) urgent cases existed
  separately — added a "2 Restricted" sublabel, using an existing
  `sublabel` field already wired into the tile rendering but never
  populated by any tile before this. And a real colorblind-accessibility
  gap — `delegated` and `accessioned` tiles used the literal same color
  (`#38bdf8` vs `#38BDF8`, differing only in letter casing), plus two
  near-duplicate pairs (the two violets, the two oranges) that would be
  hard to distinguish. Reassigned three tile colors to resolve both;
  left the other nine alone since they were already reasonably distinct
  and semantically sensible (red/green/gray for urgent/completed/draft
  in particular).

  **Extended further** (`PRIORITY_FIXES.md` item #55, in
  `WorklistTable.tsx`/`poolGrouping.ts` rather than this file directly
  — see `components/Worklist/README.md`): unassigned-and-urgent cases
  now sort to the very top of the whole list, and the Urgent/All Cases
  divider bars inside the table also show their own restricted-count
  breakdown, mirroring the tile fix above.

  **Real, per direct UI-review follow-up ("Fix the root" — background
  inconsistency across pages): this page's own, fully inline-styled
  background-image/gradient (and the `backgroundColor`/`color` pairing
  that went with them) removed entirely.** This was the most involved
  of the five pages fixed in that pass — the only one with no CSS
  class behind its background at all, just raw `style={{...}}`. Falls
  through to `AppShell.tsx`'s own, real `.ps-app-root` background now
  (see that folder's own README for the fuller account of the
  inline-style bug this whole pass traced back to) — matching
  Configuration/Quality Assurance/Intraop Queue/Contribution. The rest
  of this page's inline style block (position/width/height/font-
  family/display/flex-direction) deliberately left as-is — a full
  inline-style-to-CSS-class conversion for this page is separate,
  larger, pre-existing work, not part of this pass. *(Since closed: Batch 353
  moved the layout styles into `.ps-wl-page*` classes; the only `style={{...}}`
  left set per-tile CSS custom properties — checked in the Batch 496 README audit.)*

- **`AmendedAddendaTriageTile.tsx`** (113 lines) — the "Amendment &
  Addenda Triage" summary tile, built to an explicit spec documented in
  its own header: inbound LIS amendment notices awaiting review, open
  (draft) amendment records, and open (draft) addendum records. Two
  named exit conditions (clerical review-marked elsewhere; clinical —
  only leaves once the draft is actually released/re-finalized), both
  documented directly in the file rather than left implicit. Not
  reviewed in depth this session beyond confirming it's real, wired-up,
  and not dead code.

- **`PendingGrossingTriageTile.tsx`** — **New (Sep 2026)**, Protocol-
  Driven Workflow Infrastructure story Part 2c: "cases with pending
  triage show a distinct indicator so they don't sit silently." A
  deliberately separate tile from `AmendedAddendaTriageTile.tsx` above
  — that one's own "triage" is an editorial amendment/addendum review
  queue; this one is a genuinely different real concept, a bench-tech
  grossing checklist gate (`Specimen.triage`, `types/case/Specimen.ts`,
  gated by `useSpecimenBlockManagement.ts`'s own
  `handleReleaseGrossingBlocks`). Takes `WorklistPage.tsx`'s own
  already-loaded `realCases` as a prop and filters client-side
  (`isTriagePending`, exported and unit-tested) rather than issuing a
  second, redundant fetch.

- **`ResourcesModal.tsx`** (48 lines) — the shared quick-links modal
  (protocols/references/internal systems), opened via the global
  `PATHSCRIBE_PAGE_OPEN_RESOURCES` window event — see
  `pages/README.md`'s `AuditLogPage.tsx` entry for a real bug found
  elsewhere where a page rendered this same modal but never listened
  for that event at all. This page's own listener was confirmed
  correctly wired. Not reviewed in further depth this session.

*Corrected in the Batch 496 README audit (Oct 9, 2026): line counts updated (`wc -l`); the shared label map is `FILTER_LABEL_KEY`; added the Batch 375 review-queue views (`WorklistPage.tsx` lines 132-146, `App.tsx` redirects); `PRIORITY_FIXES.md` no longer exists.*

## Notes

- This folder previously had no README at all, despite
  `pages/README.md`'s own header already listing `WorklistPage/`
  alongside `AccessionPage/` as one of the subfolder pages — a real
  documentation gap, closed here rather than left for later.
- The case table itself, its pool-grouping/sorting logic, and the
  claim-workflow modal all live in `components/Worklist/`, documented
  there rather than duplicated here — this page owns filtering/tiles/
  context, that folder owns the table and its row-level behavior.
- **Real, per direct guidance ("Yes we should scope 'Return to
  Trainee'/'Reject with Notes'... one unified tile instead of two" →
  "let's not display tiles with 0 entries"): a new "Needs Revision"
  tile**, deliberately one, role-neutral tile rather than two
  permanently-visible ones — `needsRevisionCount` counts BOTH real
  sides of the same real event (cases returned TO this user as the
  resident, OR returned BY this user as the attending, still awaiting
  the resident's revision), since a given viewer is usually only ever
  on one side for any real case but the same real filter correctly
  serves both. **The first tile in this row with real, conditional
  visibility** — filtered out entirely when its count is 0, deliberately
  scoped to just this new tile rather than retrofitted onto the other
  14 tiles above, all of which keep their own established "always
  visible, count included" behavior unchanged, per direct guidance. The
  tile's own real filter still works correctly if a viewer had it
  active and its count later drops to 0 — the table below just shows
  its own real "no cases" state, it doesn't reset or silently break.
  Deep brown (`#78350F`), deliberately not amber/orange — see
  `services/cases/README.md`'s own fuller account of the color
  decision and the "Return to Trainee" feature this tile surfaces.

## Batch 353

- **"Delegated to me"** comes from `delegationService` and `pendingDelegationsTo` (it imported the demo case service).
- **Layout:** the page's inline styles are now the `.ps-wl-page`, `-content`, `-main` and `-main-inner` classes, plus `.ps-wl-header--page`.


## Batch 363 (PS-72): patient data tagged for screenshot redaction

`AmendedAddendaTriageTile.tsx`: each item's case number is tagged.

## Batch 395

The case table now always reaches the bottom of the window (`hooks/useFillViewportHeight`). It used to measure its height once, 50 ms after the page opened, so when the banners and tiles above finished loading and got shorter it kept the smaller height and left empty space below (Pete's screenshot).

Also Batch 395: the peer-review queue tiles wrap their labels inside the tile (at most three lines, full text as a tooltip) instead of running past the edge.

## Batch 416: the table fills the screen

Pete: "too much dead space in the worklist". Two causes, both fixed:

- **The page was taller than its space.** `.ps-wl-page` was the full window height (`var(--app-height, 100vh)`), but it sits under the 105 px nav bar, in an outlet that clips. Its bottom 105 px were always out of sight. It's now `height: 100%` of the outlet, the fix other pages already had.
- **The table's height was measured in script and stuck.** `useFillViewportHeight` re-measures when the page body changes size, but this page is exactly window-height, so the body never changes and the height could stay at its 400 px starting value. The table wrapper (`.ps-table-scroll-wrap--fill`) is now a flex item that takes all the height left below the tiles. No measurement, no `tableHeight` prop.

Checked in a browser at 1920×945: the table ends 12 px (the page padding) above the window's bottom edge. `worklistLayout.guard.test.ts` keeps both rules in place.

## Batch 431

The "access requested" marker upkeep is gone (the badges come from request records); the context and branch filters use session flags.

## Batch 439 (PS-144)

A **Peer Review** tile: cases with a peer review waiting on this pathologist (their read, or a consensus they are part of). Shown only when there are some; those cases are added to the list even when the reviewer isn't on the case.

## Batch 440: Cytology Review tile

Positive GYN cytology waiting for a pathologist (`loadCytologyReviewTray`), shown only to holders of `cytology:pathologist-review:take` and only when there are some. It lists cases with no pathologist yet, plus the viewer's own. The open cases are kept apart from `realCases`, so they don't join the viewer's All list. Clicking an open case asks to **Take and open**: `takeCytologyReview` makes the viewer the case's pathologist and opens it in the Cytology Workspace. A case already the viewer's opens directly. `WorklistTable` gains `interceptOpen`, which runs after the pediatric and Outreach access checks, so a case the viewer can't open still goes to the request-access flow first.

## Batch 446

Case pages are opened with `useOpenCase` (`hooks/useOpenCase.ts`), which addresses them by the case's support reference (`/case/SR-7K2Q-9MXD/synoptic`), never its accession number. See `services/caseAddresses/`.

## Batch 450 — test evidence for Priority 1 and 2 tickets (PS-305, PS-307, PS-309)

The tile counts and tile lists now come from `services/worklist/worklistTileCounts.ts`. The Finalizing tile's list now holds only finalizing cases.

## Batch 452 — Closing the review gaps (PS-131, PS-105, PS-133/PS-323, PS-57), PS-156 correlation window, decant ↔ billing sync, Phase 1 fixes

The tile counts no longer take an access check, so they match the redacted rows the list shows. The page's pediatric-threshold loading, which only fed that check, was removed.

## Batch 454 — Follow-up not received: report, alerts and clinician email

A "Follow-up due" tile, shown when the count isn't 0. It lists the viewer's signed-out cases with a follow-up due soon or overdue (`loadFollowUpCaseIdsForUser`), and those cases are merged into the list like delegated and peer-review cases.

## Batch 477 — Autopsy worklist badges (PS-261 follow-up, Module 5)

The Autopsy branch tab's rows now show real autopsy state — case authority, an active ancillary hold, PAD/FAD signed, and a TAT/SLA tooltip — via `components/Worklist/AutopsyWorklistBadges.tsx`. No change to this page itself; `WorklistTable.tsx` renders the badges. See `components/Worklist/README.md` for the full reasoning, including why this extends the existing branch tab + grouping rather than adding a separate screen.

---
*When this folder's contents change meaningfully, update THIS file.*

## Batch 504

- The voice commands' listeners now update when the flag definitions arrive. "Read flags" could say a case had no flags when the definitions loaded after the listeners were set up.
- `openCytologyReviewCase` lists `openCasePage`, the function it actually uses.

## Batch 565 (WCAG 2.1 AA)

- Contrast of colours set in code raised from the old greys; filter tiles say which is selected (`aria-pressed`) where this folder has them.

## Batch 566 (WCAG 2.1 AA)

- The LIS and Outreach tiles say which is on (`aria-pressed`, `type="button"`), as the peer-review queue tiles already did.

## Batch 568

- The LIS and Outreach tiles' on/off colours come from modifier classes in `pathscribe.css` (`.ps-wl-mode-tile--lis`, `--outreach`, `--active`), not values set in the page; they look exactly as before.

## Batch 652 — Specimen pipeline gaps

- `isTriagePending` now lives in `services/grossing/triageReleaseGate.ts`; the tile re-exports it.
- `hooks/usePoolAssignmentTimeout.ts` starts the Assignment Timeout sweep (`services/cases/poolAssignmentTimeout.ts`) with the page and marks cases it routed as pool cases.

## Batch 652 (defect fixes)

`ResourcesModal.tsx` (+ `ResourcesModal.css`): a stored http link is shown as text with an "Insecure link" tag and never opened. `WorklistPage.tsx` maps links through `toQuickLinks`.
