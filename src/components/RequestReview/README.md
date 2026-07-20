# components/RequestReview/

## Files

- **`RequestReviewModal.tsx`** — "Request Informal Review" — sends an
  internal message to a colleague with the case attached (explicitly NOT
  the same as Delegate — no ownership transfer, own comment is clear on
  this). Uses the shared `ps-modal-dark`/`ps-overlay` CSS pattern — good.
  **See Notes — real ID collision found, not fixed.**

## Notes — real bug, needs your input before fixing

`REVIEWERS` here is a hardcoded 6-entry list, whose own comment says it
"mirrors AppShell INTERNAL_USERS." It doesn't — it's a second,
independently-maintained list that has already drifted, and two of its
IDs collide with genuinely different people in the real directory:

| ID | `AppShell.tsx` (real directory) | `RequestReviewModal.tsx` |
|---|---|---|
| `u3` | System Admin | Dr. James Chen |
| `u4` | Dr. Sarah Li Chen | Dr. Maria Santos |

The 4 `uk-*` prefixed reviewers (Okafor, Marsden, Patel, Thornton) don't
exist in `AppShell.tsx`'s list at all — possibly deliberate (a UK-specific
reviewer pool, matching this app's UK/RCPath support elsewhere), but
worth confirming rather than assuming.

**Why this isn't visibly broken today:** the modal calls
`mockMessageService.send()` with both `recipientId: selected.id` AND
`recipientName: selected.name` explicitly — so the message inbox almost
certainly displays the correct name from what was passed at send time,
not a re-lookup of `recipientId` against `AppShell.tsx`'s directory. The
bug is latent, not active — but `u3`/`u4` are landmines: the moment
anything does an ID-based lookup instead of trusting the passed name
(a future feature, a different display surface, a real backend where IDs
become the actual source of truth), this breaks and could misattribute a
review request to the wrong person.

**Not fixed this pass — needs a product decision, not a mechanical fix:**
is the UK reviewer pool intentionally separate from `AppShell.tsx`'s
directory? If yes, the fix is just giving all 6 reviewers IDs that don't
collide with the real directory's `u`-prefixed range. If no — if this is
supposed to be the same internal directory — the fix is importing from
`AppShell.tsx`'s real list (which isn't currently exported) instead of
maintaining a second copy at all.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
