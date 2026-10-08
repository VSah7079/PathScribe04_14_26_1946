# src/services/worklist

Decisions behind the Worklist page, kept out of the page so they can be tested.

## Batch 450 — test evidence for Priority 1 and 2 tickets (PS-305, PS-307, PS-309)

`worklistTileCounts.ts`: the Worklist tile counts (`computeWorklistTileCounts`) and the list each tile opens (`filterWorklistCases`), moved out of `WorklistPage.tsx` so both follow the same rules. Tested per branch tab, LIS and Outreach.

Fixed on the way: the Finalizing tile's own list held every non-pool case (voice next/previous and the report page's case list went through all of them); it now holds only finalizing cases. **Open:** most tiles leave out cases the viewer can't open while the list shows them blanked, and the LIS pool and Outreach counts include them while All Cases doesn't, so with restricted cases a tile can differ from its row count.

## Batch 452 — Closing the review gaps (PS-131, PS-105, PS-133/PS-323, PS-57), PS-156 correlation window, decant ↔ billing sync, Phase 1 fixes

Tile counts now match the rows their lists show (Pete, Oct 4). A restricted case (pediatric or Orchestration access) appears in the list as a redacted row, so every tile now counts it too. Before, most tiles left restricted cases out, while the LIS pool and Outreach counts kept them. `WorklistCountDeps` no longer has `canViewCase`.

## Batch 454 — Follow-up not received: report, alerts and clinician email

`worklistTileCounts.ts` adds the `followup` filter, the `followUp` stat and the `followUpCaseIds` dependency: the viewer's signed-out cases with a follow-up due soon or overdue. The parity test covers it.
