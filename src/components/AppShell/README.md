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
  to be the same directory or a deliberately separate one.

  **FIXED this pass — modal-consolidation (PRIORITY_FIXES.md #8) plus one
  real bug found along the way.** Three hand-rolled overlay shells
  converted to shared `ps-overlay`/`ps-modal-dark`/`ps-drawer-backdrop`
  classes: the NHSMail Secure Message compose modal, the account-menu
  drawer's backdrop, and the "About" popup. Found and fixed a genuine
  out-of-range z-index bug in the process — the About popup was hardcoded
  to `zIndex: 3000`, well outside this app's established tiers; now
  correctly `9000` via the shared class. The other two already had
  correct z-index values (`9000`, `1199`) and only needed the class
  conversion for consistency. Two other overlay-looking patterns in this
  file were deliberately left untouched, confirmed to be a different UI
  concept entirely: small invisible "click outside to close a dropdown"
  backdrops (transparent, local z-index, not a modal at all) and a
  bottom-center toast notification.

## Notes

- Naming drift worth knowing: `pages/SynopticReportPage/modals/` also
  had its own `LogoutWarningModal.tsx` — a genuine second implementation
  of the same dialog with a different prop interface, since consolidated
  into `components/Common/LogoutWarningModal.tsx`. Not this folder's
  concern directly, but the same "same-named component, different files"
  risk pattern worth being aware of anywhere in the app.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
