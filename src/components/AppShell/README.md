# components/AppShell/

## Files

- **`AppShell.tsx`** (~1,860 lines, the largest single-file folder in
  components/) — Global layout shell wrapping all authenticated pages:
  logo/home nav, breadcrumb slot, Enhancement Request button, user
  initials badge, Quick Links, logout, the messages drawer, `<Outlet />`.
  It no longer owns a user directory: the old `INTERNAL_USERS` list is
  gone (Batch 385 — the drawer loads recipients with
  `messageService.listRecipients()`), and `RequestReviewModal.tsx` builds
  its reviewer list from `userService` (see `RequestReview/README.md`).
  *(Corrected in the Batch 496 README audit (Oct 9, 2026): was "1542
  lines" and "owns `INTERNAL_USERS`" with an open ID-collision question.)*

  **Real, per direct UI-review follow-up ("Fix the root" — background
  inconsistency across pages): the root `<div className="ps-app-root"
  style={{...}}>` had an inline style silently overriding its own,
  already-correct, already-existing `.ps-app-root` CSS class.** Found
  while investigating why several pages' own background colors
  (`var(--ps-navy-base)`, `var(--ps-bg)`) didn't visually match
  Configuration/Quality Assurance's real, plain background — the CSS
  class already defined the right value (`var(--ps-navy-base)`,
  `#0b1120`) but this inline style silently overrode it with a
  different, hardcoded `#020617`, so those other pages' own attempts
  to *match* the app's real background were matching the CSS class's
  intended value, not what the inline style actually rendered.
  Same inline style also overrode `color` (`#f1f5f9` vs. the CSS
  class's own `var(--ps-text-primary)`, `#e2e8f0`) and, most
  consequentially, `font-family` — the inline version dropped
  `'Inter'` from the stack entirely, meaning every AppShell-wrapped
  page had been silently rendering in system fonts instead of this
  app's own intended typeface. Inline style removed entirely; the
  real CSS class (which already had every property correctly,
  including `position`/`width`/`height`, absent from the inline style
  altogether) now genuinely takes effect. Five other pages' own
  competing background overrides/images were also removed in the same
  pass, now correctly falling through to this single, real source —
  see `pages/README.md`'s own entries for `SearchPage.tsx`/
  `AuditLogPage.tsx`, and `pages/WorklistPage/README.md` for
  `WorklistPage.tsx`. `Home.tsx` deliberately kept its own, distinct
  background — not part of this consistency pass, per explicit
  direction.

  **Complete — messaging drawer inline-style extraction + real mobile
  support (Aug 2026).** Requested directly: the messaging feature
  ("Messages" in the nav) was flagged as generally useful but genuinely
  unusable on a phone. Root cause confirmed: `.ps-msg-drawer` was
  hardcoded to `width: 850px` — both in its own CSS class *and*
  redundantly duplicated inline in the JSX — more than double any real
  phone's viewport width, the dominant cause.

  Every inline `style={{...}}` and JS-based `onMouseEnter`/`onMouseLeave`
  hover handler across the entire feature — the outer drawer/top bar,
  `ComposePanel`, `MessageListPanel`, `ThreadPanel`, `SecureEmailModal`,
  and the secure-email toast — replaced with real, named CSS classes and
  proper `:hover`/`:focus-within` rules. `ComposePanel` needed no changes
  at all, already fully class-based. The rest did.

  **Real, worthwhile discovery along the way:** two entire, well-built
  CSS class systems already existed in `pathscribe.css` — one for message
  rows (`.ps-msg-row`, selected/unread/urgent variants, avatars) and one
  for chat bubbles/reply bar (`.ps-msg-bubble`, `.ps-msg-reply-bar`,
  etc.) — both with zero usage anywhere in the app. Genuine dead code.
  Rather than delete either or build new ones, both were wired into
  `MessageListPanel`/`ThreadPanel` respectively, resolving the dead-code
  question by finally connecting what had already been built for this
  exact purpose.

  **Correction (Sep 2026, PS-78):** only the message-row system is still
  wired in. `ThreadPanel` was later moved onto its own `ps-thread-*`
  classes (and the compose and user-search views onto `ps-compose-*` /
  `ps-user-*`), so the `.ps-msg-bubble`/`.ps-msg-reply-bar` system above
  went back to being dead code. It was deleted in Batch 319; see the
  PS-78 entry in `docs/ARCHIVE.md`.

  **One real bug caught during the refactor itself, not after:**
  converting `ThreadPanel`'s outer container from an inline style to a
  class silently dropped `position: relative` along with everything else
  — which the "⋯" menu's absolute positioning depends on to anchor
  correctly. Caught by checking, not assumed; verified the fix directly
  (menu measured at exactly `0,0` relative to its container) before
  moving on.

  A real `ps-msg-drawer--detail-active` class + mobile media query
  collapses the two-column desktop layout (list | thread) into the
  standard mobile "list, then tap into a message" pattern, with a new
  back button. Verified working via real device-independent Playwright
  checks (see the testing-methodology note below) — both computed styles
  and rendered screenshots confirmed correct in both states.

  **Also investigated, confirmed not an issue:** a leftover
  `.ps-secure-email-modal { z-index: 25000 !important }` rule exists but
  is never applied to the actual component — checked whether this masked
  a real stacking bug; it doesn't, since `.ps-overlay`'s own `z-index:
  9000` (from the earlier modal-consolidation pass) is already well
  above the messages drawer's `1200`. Left as harmless, vestigial CSS
  rather than wiring in an unnecessary `!important` override.

  **Real, important correction to this session's own testing method,**
  worth recording here since it could affect how future mobile-CSS work
  in this file gets verified: `chromium.launch()` combined with
  Playwright's packaged `devices['iPhone 13']` profile reports the wrong
  `window.innerWidth` in this sandbox (980px instead of 390px), meaning
  CSS `@media` queries never actually fired in early verification
  attempts, despite screenshots looking visually narrow. Isolated
  precisely: a plain, manually-specified viewport (`{ width: 390, height:
  844 }`, no device-profile spreading) works correctly. All verification
  in this pass used the corrected method.


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

## PS-78: dead `ps-msg-*` CSS removed (Batch 319)

The live message drawer (this component) uses 63 `ps-msg-*` classes, plus `ps-thread-*`, `ps-compose-*` and `ps-user-*`. The other 70 `ps-msg-*` classes in `pathscribe.css`, 130 rules in all, came from a pasted copy of an earlier Messages UI spec and matched nothing. They were removed.

A computed-style comparison of every element in the drawer, in its list, thread and compose states (653 elements), found no difference between the old and new stylesheet. Full account in `docs/ARCHIVE.md`.

Two classes this component uses have no CSS rule of their own, and never had one:
- `ps-msg-row-meta`: a layout wrapper;
- `ps-msg-search-input`: also used as a `querySelector` hook for focusing the search box.

## Batch 340 (PS-344): safe config links in messages

A message's **config link** (`IMessageService` `configLink`) comes from stored message data, so the thread view only follows it when `utils/safeInternalPath.ts` confirms it is a PathScribe path. React Router 6 would otherwise treat `/\evil.example` as an external site (GHSA-wrjc-x8rr-h8h6). The app moved to React Router 7 in Batch 341, which fixes that; the check stays as a second line of defence. Case links are built from case numbers (`/report/<ref>`) and are unaffected. The file still uses `sessionStorage` (`ps_reopen_messages`) and stays on the deployment baseline for that.

**Batch 350:** the breadcrumb's "returning to Search" mark goes through `utils/search/searchSession.ts → markReturnToSearch()`. The file still uses session storage for the messages drawer, so it stays on the deployment baseline.


## Batch 363 (PS-72): patient data tagged for screenshot redaction

`AppShell.tsx`: the case links in the messages drawer (the message's case and case numbers detected in its text) carry `data-phi="accession"`.

## Batch 384 (PS-359): Field Requirements for messaging

- **`AppShell.tsx`:** the New message drawer, the reply box and the Secure email window take what they require from Field Requirements (new `messaging` page): the recipient and the text are locked, the subject is a switch (required by default). Each shows "Still required: …" and stars the required labels. `ComposePanel` and `SecureEmailModal` are now exported so they can be tested.
- **Voice/keyboard:** "submit secure email" (`SECURE_EMAIL_SUBMIT`, Ctrl+Alt+Shift+7) sends the secure email with the same checks. The drawer's own Send by voice (`MSG_SEND`) already existed; it now applies the same subject check as the button, which it skipped before.
- A message without a subject shows a translated "(No subject)" in the list.
- The file uses the action registry through `@/services` and is off the mock-import baseline. It still uses session storage for the drawer, so it stays on the browser-storage baseline.
- **Still in this file (not moved):** the hard-coded internal recipient list (`INTERNAL_USERS`), the simulated secure-email send, and the drawer's own state handling (the file is 1,700+ lines).

## Batch 385: recipients, the send, and permissions

- **`AppShell.tsx`:** the recipient list is no longer in the file: the drawer loads it with `messageService.listRecipients()` and searches with `searchRecipients` / `findRecipientByName`. The Secure email window's send is `messageService.sendSecureEmail`, not a timer in the component.
- **Permissions:** Send, Secure email and Reply need `message:internal:send` / `message:secure-email:send` (greyed out with a reason; the service checks again). A refused or failed send now keeps the draft and shows why (before, the draft was cleared either way).
- **Still in this file:** the drawer's own state handling (the file is 1,700+ lines) and the session storage for the open drawer. *(Since Batch 431 the drawer flags go through `utils/uiPreferences.ts` (`setSessionFlag`), and `AppShell.tsx` is no longer on the deployment baseline — checked in the Batch 496 README audit.)*

## Batch 431

Applies the signed-in person's language (`usePersonalLanguage`); the messages drawer and "back to messages" use the session flags.

## Batch 432

The profile menu (About panel) has "My dictionary" and "My voice commands" (`components/Profile/`).

## Batch 433

The profile menu has **Biometric signing** when the lab's biometric policy is on, and AppShell shows the enrolment invitation after sign-in when the lab asks for it (`components/Profile/BiometricSigningModal.tsx`).

## Batch 446

Case pages are opened with `useOpenCase` (`hooks/useOpenCase.ts`), which addresses them by the case's support reference (`/case/SR-7K2Q-9MXD/synoptic`), never its accession number. See `services/caseAddresses/`.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*

## Batch 502 (PS-472)

The page `<Outlet />` sits inside `RouteErrorBoundary` (components/ErrorBoundary/): a page that crashes shows a recovery screen while the nav bar, drawers and messaging keep working. It clears when the address changes.

## Batch 505 (PS-475)

The User Guide and Admin Guide items in the About menu load the guide PDFs when the menu opens (`hooks/useGuideAssets.ts`). Until they arrive the two items are disabled and `aria-busy` (`.ps-about-menu-item:disabled` in `pathscribe.css`). Checked in a browser: the guide chunk is fetched only after the menu opens.

## Batch 511 (PS-478): full strict type-checking

The message drawer's "open case" click checks the message still names a case before opening it. No visible change.

## Batch 513 (PS-269): the UI translation sweep is complete

Every visible string here now goes through `t()`, in all five languages, and `src/i18n/uiText.guard.test.ts` keeps it that way. The breadcrumb's "Home" was always English; it is now translated.

## Batch 517 — SecureEmailModal moved out (PS-143)

`SecureEmailModal` now lives in `components/SecureEmail/SecureEmailModal.tsx`; AppShell imports it.
- It sends through the lab's gateways, with gateway branding instead of a fixed NHSMail.
- Patient data can go only through a gateway with an agreement in force.

`messagingRequirements.test.tsx` imports it from the new place and adds 3 gateway tests.

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 534

`AppShell.tsx` starts the background release of held reports (`useReleaseBackgroundWork`), next to the delivery retries.

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- Loading text here now goes through `LoadingState` (`components/Common`): nothing for 300 ms, then the screen's own loading text, and "Still working…" from 3 s. Carried over from Batch 548; `services/connectivity/latency.guard.test.ts` now covers every loading text in the app.

## Batch 567 (WCAG 2.1 AA, 4.1.2)

- `MessageListPanel` (now exported, for its tests): a message row holds buttons (delete, restore), so it is no longer a button. The sender's name is the button that opens the message (editing: ticks it, with `aria-pressed`), described by the subject; clicking elsewhere on the row still opens it (`clickableContainer`). Keyboard focus inside a row shows its actions, as hover does, in its own state, so the pointer leaving the row doesn't remove a button that has focus. The delete icon has a name. Tests: `messageListRow.test.tsx`.

## Batch 569 (WCAG 2.1 AA, 2.4.3)

- `MessageListPanel`: when a message's own Delete, Restore or Delete-forever, pressed from the keyboard, removes it, focus goes to the next message's sender (the one before when it was last; the list when none is left), not to the page. A mouse click leaves focus alone; a delete that didn't happen (cancelled, refused) never moves focus later, and focus is never pulled from where the user has moved on to. Tests: `messageListRow.test.tsx`.

## Batch 570

- `MessageListPanel`: the focus move after a delete now comes from `hooks/useFocusAfterRemoval.ts` (shared with the saved-search chips); it also follows a screen reader's click in Firefox, and moves focus only from the page or the pressed button.
