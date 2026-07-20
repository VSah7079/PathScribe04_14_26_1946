# components/AppShell/

## Files

- **`AppShell.tsx`** (1542 lines, the largest single-file folder in
  components/) — Global layout shell wrapping all authenticated pages:
  logo/home nav, breadcrumb slot, Enhancement Request button, user
  initials badge, Quick Links, logout, `<Outlet />`. Owns
  `INTERNAL_USERS` — the real internal user/messaging directory (17
  entries, `u2`–`u17`), **not currently exported**. **See
  `RequestReview/README.md`** — this is the real directory that
  `RequestReviewModal.tsx`'s separately-maintained `REVIEWERS` list was
  supposed to mirror but has drifted from, with 2 real ID collisions
  (`u3`, `u4` mean different people in each list). Not fixed here — needs
  your input on whether `RequestReviewModal.tsx`'s reviewer pool is meant
  to be the same directory or a deliberately separate one. Uses the
  inline-style modal pattern in places — already logged in the
  modal-consolidation opportunity (`Common/README.md`). Not read
  line-by-line at this size beyond the sections checked above.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
