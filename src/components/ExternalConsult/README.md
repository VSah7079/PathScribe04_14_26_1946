# components/ExternalConsult/

**NEW (Sep 2026)** — PS-290. The internal, pathologist-facing half of
External Consult / Second-Opinion Access — issuing and managing links.
The outside consultant's own read/opinion-submission view is a separate,
public route (`pages/ExternalConsultViewPage/`), not this folder.

## Files

- **`ExternalConsultAccessModal.tsx`** — mirrors
  `RequestReview/RequestReviewModal.tsx`'s own real conventions
  (`ps-overlay`/`ps-modal-dark` shell, `ReactDOM.createPortal`) rather
  than inventing a new modal shape. Three views: a list of tokens already
  issued for this case (status badge, revoke), an issuance form
  (consultant identifier/organization/note, Full Case vs. Specific Slides
  scope, a live default-lifespan preview), and a post-issuance screen with
  the copyable link. Wired into `SynopticReportPage/components/
  BottomActionBar.tsx` (a new "🌐 Consult" action, alongside "🔍 Req.
  Review") — receives the same `caseData`/`user` props that modal already
  does, no new data plumbing needed.

## Real, load-bearing disclosure

Every view in `ExternalConsultAccessModal.tsx` carries a visible red
banner stating this is not real, production-secure external access — see
`services/consultAccess/IConsultTokenService.ts`'s own header for why.
Do not remove or soften it without the real backend (PS-291) this domain
is deliberately waiting on.

## Batch 367 (PS-74): no inline CSS

`ExternalConsultAccessModal.tsx`: the remaining inline styles moved into `pathscribe.css` classes. Per-instance values (sizes, positions, a colour) are passed as custom properties, and colours are derived with `color-mix()` from `--ps-hue` instead of hex strings built in JSX. The browser checks are listed in the Batch 367 changelog (`src/i18n/README.md`). The app-wide check is `services/styleRules/inlineCss.guard.test.ts`.

## Batch 439 (PS-148)

`ExternalConsultAccessModal.tsx` lists the opinions consultants sent back, and the pathologist assesses each signed one against the case (agrees / minor difference / major discordance, with a note for a difference). Converted on touch: the status badge and scope buttons are classes (their colours were set from JSX), and dates use the reader's language.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
*When this folder's contents change meaningfully, update THIS file.*

## Batch 515 (PS-290)

"Issue new link" and "Revoke" are `CapabilityButton`s (`case:consult-link:issue` / `:revoke`). A refused issue shows a translated message (`externalConsultAccessModal.notPermitted`).

## Batch 522 (PS-290)

- The created link is `/consult#<token>` (`consultLinkUrl`).
- Revoke passes only the link id; the service takes the signed-in user.
- Refusals are translated from codes (`ISSUE_ERROR_KEY`).
- The banner now says what is true: the token is random and kept as a fingerprint, but no PathScribe server checks it yet, so the link opens only in this browser.

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- Loading text here now goes through `LoadingState` (`components/Common`): nothing for 300 ms, then the screen's own loading text, and "Still working…" from 3 s. Carried over from Batch 548; `services/connectivity/latency.guard.test.ts` now covers every loading text in the app.
