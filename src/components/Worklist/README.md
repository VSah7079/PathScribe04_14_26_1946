# components/Worklist/

The case worklist table and its pool-claim workflow.

## Files

- **`WorklistTable.tsx`** (1834 lines, one of the largest single
  components in the app) — The core case list: sorting, filtering,
  responsive card/table switching, divider rows, virtualization. Cleanly
  self-organized into clear internal sections (Types/Constants/Color
  Palettes/Date Helpers/Sorting/Status Styles/Sub-components/main
  component). Own comment documents a real, already-fixed bug worth
  knowing about: `formatDate()` used to be a bespoke local function
  hardcoded to MM/DD/YYYY regardless of jurisdiction — every date in the
  worklist rendered US-format even for UK clients. Fixed by switching to
  the real jurisdiction-aware `utils/formatDate.ts`, which already existed
  fully built but had zero callers anywhere in the app before this. No
  local modal-overlay duplication (checked, per the newly-broadened
  review standard) and no open TODO/FIXME markers at that time.
  **Real fix, found via a direct product review since then:** pool cases used to be
  lumped into one flat "Pool"/"Pool — Urgent" pair regardless of which
  specific pool (GI, Breast, General Pathology, etc.) each case actually
  belonged to — a pathologist had no way to see which pool a case was in
  without opening it. Now sub-groups by real pool name via
  `buildPoolGroupRows()`, extracted to `poolGrouping.ts` specifically so
  this non-trivial sort/group logic is directly testable. Pools the
  viewing pathologist can't claim from (membership restriction on, not a
  member) default collapsed, click-to-expand — sticky, via
  `storageGet`/`storageSet`, keyed per-user, so a manually-expanded pool
  survives a reload instead of silently re-collapsing. Fetches all
  `Subspecialty` records once per worklist load, not per-pool, for the
  restriction check itself.
- **`poolGrouping.ts`** — Pure, extracted pool sub-grouping logic (see above). Groups pool cases by `poolName`, sorts pools containing any urgent case first, alphabetical within each urgency tier, same urgent-then-normal two-tier divider structure as the rest of the worklist, just applied per-pool instead of globally. **Real fix, from direct product feedback:** the worklist previously showed every pool identically regardless of whether the viewing pathologist could actually claim from it — claim-time membership enforcement existed (`services/cases/mockCaseService.ts`), but the display had no awareness of it at all. Divider rows now carry an explicit `restrictedForMe` flag (via new `computeRestrictedPoolKeys()`), and `WorklistTable.tsx` defaults those groups collapsed on first sight — reduces visual clutter without hiding the information, and genuinely skips rendering the case rows underneath (not just CSS-hiding them) for a real DOM-size win, not just a UX one. Same pass also fixed a real regression this file's own earlier version introduced: divider styling used to match on exact label text (`row.label === 'Pool'`), which silently broke the moment labels became dynamic per-pool names — now uses explicit `isPool`/`isUrgent` booleans instead.

  **Grew a new function in a later session** (`PRIORITY_FIXES.md` item
  #55): `splitPoolRowsByUrgency()` — takes `buildPoolGroupRows()`'s own
  output and partitions it into the urgent-tier divider+case groups vs.
  everything else, so `WorklistTable.tsx` can move unassigned-and-urgent
  cases to the top of the whole list. Deliberately built as a separate,
  additive function rather than a change to `buildPoolGroupRows()`
  itself, which already had 19 tests covering its exact current
  ordering/counting/flagging behavior — modifying that function directly
  would have meant either breaking those tests or rewriting a lot of
  already-correct coverage for no real reason. The new function just
  reads the `isUrgent` flag each divider already carries; genuinely
  nothing about how `buildPoolGroupRows()` itself groups, sorts, or
  counts pools needed to change.
- **`poolGrouping.test.ts`** — 19 real tests (grew from 8): the original grouping/sorting/counting coverage, plus the new explicit-flag regression fix, and `computeRestrictedPoolKeys`'s real membership logic (restricted when not a member and restriction is on, unrestricted when a member, unrestricted when restriction is off, matches by both Subspecialty name and id). Re-run and confirmed still passing, unmodified, after `splitPoolRowsByUrgency()` was added above — the additive-function approach was specifically chosen to keep this coverage untouched, and re-running confirmed that held rather than just assuming it.
- **`PoolClaimModal.tsx`** — Accept/Pass workflow when a pathologist
  clicks a pool case, case status-locked to `'claimed'` while open. Real,
  clean, wired to `mockCaseService`. Claim-time subspecialty-membership
  enforcement now lives in `mockCaseService.ts`'s `claimPoolCase`/
  `acceptPoolCase` (see `services/cases/README.md`) — this modal itself
  didn't need to change, since it already just calls through to those
  and surfaces whatever error comes back.

## Notes

- Good example of a large file that stays maintainable through clear
  internal section organization rather than being split into many
  smaller files — a reasonable choice given how interdependent the
  sort/filter/responsive-layout logic is.
- One real gap did surface in a later, deeper product review (see
  `WorklistTable.tsx`'s entry above): pool cases weren't sub-grouped by
  their actual pool, and claim-time access had no membership enforcement
  at all (fixed in `services/cases/mockCaseService.ts`, not this folder).
  Worth remembering that "no issues found" from an earlier pass reflects
  what that specific review was checking for, not a permanent guarantee.
- **Three more real bugs found in a systematic bad-data/bad-query audit
  (Aug 2026), all fixed:**
  1. Both "Request Pediatric Access" and "Request Orchestration Access"
     buttons sent their message to a hardcoded `recipientId: 'u3'`,
     `recipientName: 'System Admin'` — but no user with id `'u3'` exists
     anywhere in the real `services/users/mockUserService.ts` directory
     (confirmed directly). `'u3'` was only ever a stand-in id from
     `AppShell.tsx`'s own separate, hand-maintained `INTERNAL_USERS`
     messaging directory — the exact same real ID-collision pattern
     `RequestReviewModal.tsx`'s own header comment documents and fixed in
     July 2026 (`'u3'`/`'u4'` meaning different people in different,
     disconnected lists). These access-request messages were silently
     going nowhere. Fixed by sourcing real, active Admin-role users from
     the canonical `userService`, org-scoped first with an honest
     fallback — see the `sendAccessRequestToAdmins()` helper in
     `WorklistTable.tsx`.
  2. `WorklistTable.tsx`'s own `isUrgentCase` checked `priority === 'STAT'
     || 'Rush'`, while `WorklistPage.tsx` independently, repeatedly
     checked `'STAT'` only, across 7 separate occurrences (the Urgent
     filter tile, its count badge, pool-urgent detection). Confirmed with
     Pete directly: merging Rush and STAT into one "urgent" bucket is the
     correct, deliberate clinical/product decision, not just an
     engineering convenience — see `utils/caseUrgency.ts`'s own header
     comment for the full rationale and the SOP caveat worth knowing
     about. Extracted to that single, shared function so the two files
     can't diverge again.
  3. `WorklistPage.tsx`'s own `filteredCases` used
     `config.facilityTimezone` for its "completed today" check but was
     missing it from that `useMemo`'s dependency array — same bug class
     as the facility-timezone work elsewhere in the app; an admin
     changing the facility timezone while this filter was active wouldn't
     have triggered a recompute.
  Also documented, not fixed (deliberate, not a bug): `WorklistTable.tsx`'s
  own `filteredCases` has no branch for `'accessioned'`/`'grosscomplete'`/
  `'physician'`/`'countersign'` — same intentional pass-through pattern
  already commented for `'amended'`, since `WorklistPage.tsx` (the only
  real caller passing non-`'all'` values) resolves those upstream before
  this component ever sees the cases.

**Real fix in a later session, from a direct product request**
(`PRIORITY_FIXES.md` item #55): unassigned + urgent cases — someone
needs to both notice AND claim them — were still sorting to the very
bottom of the whole worklist, after both the regular Urgent and All
Cases sections, buried under every other pool group regardless of
urgency. The per-pool urgent/normal split described above was already
solid; the gap was one level up, in `displayRows`' own top-level
ordering. Fixed by pulling each pool's own urgent sub-group (already
correctly identified via each divider's `isUrgent` flag) out to the
very top of the list — see `poolGrouping.ts`'s entry below for how
this was done without touching the existing, tested grouping function.
Same request also added a `restrictedCount` to the non-pool Urgent/All
Cases dividers — how many additional cases of that same tier are
sitting unassigned in the pool, shown as "2 Restricted" next to the
divider's own count. One real TypeScript narrowing quirk hit while
building this: `!row.isPool` didn't reliably narrow the `DividerRow`
union when accessing `row.restrictedCount` afterward in this specific
JSX context; extracting `row.isPool === false ? row.restrictedCount :
undefined` into its own `const` right where the divider type is first
narrowed (same place `isCollapsible`/`isCollapsed` already live)
resolved it cleanly and matches this file's own established pattern of
keeping that kind of per-row logic out of the JSX itself.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
*When this folder's contents change meaningfully, update THIS file.*
