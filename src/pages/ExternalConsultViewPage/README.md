# pages/ExternalConsultViewPage/

**NEW (Sep 2026)** — PS-290. The outside half of External Consult /
Second-Opinion Access: a public, unauthenticated route (`/consult/:token`)
an external consultant opens directly, with no PathScribe login of their
own. Same "public route" posture as `OrSuiteDashboardPage.tsx`/
`FacilityOpsDashboard/`, added to `App.tsx` for a genuinely different
reason — there is no internal session to gate this behind at all, not a
kiosk/device-identity substitute for one.

## Files

- **`ExternalConsultViewPage.tsx`** — resolves the URL token
  (`consultTokenService.resolve()`), then fetches the case directly via
  `caseService.getCase()` (from `@/services`) — **deliberately not** `caseRouter.getCase()`,
  since `caseRouter`'s own `resolveCaseAccess()` enforces PathScribe's
  internal session/tenant model, which has no concept of an external,
  token-bearing guest. A valid, Active, unexpired `ConsultToken` is this
  route's entire authorization; see this file's own header and
  `services/consultAccess/IConsultTokenService.ts`'s for the full caveat
  on what that is and is not. Renders the case scoped to the token
  (`scope.slideIds` narrows the shown slides; unset shows the full case),
  and a Phase 1 Hybrid opinion-submission form (diagnostic category,
  Draft/Signed status, free-text opinion) that calls
  `consultTokenService.submitOpinion()`. Records exactly one real access
  event per page view (`recordAccess()`), separate from the validity
  check itself.

*Corrected in the Batch 496 README audit (Oct 9, 2026): the page calls `caseService.getCase()` from `@/services`, not `mockCaseService` (`ExternalConsultViewPage.tsx:35,92`; changed in Batch 363).*

## Deliberate scope cuts

- **No clinical-history rendering** — `Specimen.clinicalHistory` entries
  carry a coded `historyCode`/`unmappedTextFallback` shape, not a plain
  display string; resolving that honestly needs the same crosswalk
  machinery other real display surfaces in this app use, which was out
  of scope for this pass. Left out entirely rather than showing a raw
  code or guessing at a label.
- **No real identity check on the consultant submitting an opinion** —
  whoever holds the link can submit as the token's own
  `consultantIdentifier`; there is no separate consultant-side login.


## Batch 363 (PS-72): patient data tagged for screenshot redaction

`ExternalConsultViewPage.tsx`: the patient line (name, date of birth) is tagged. The page reads the case through `@/services` (`caseService`), so it came off the mock-import baseline; its test mocks `@/services` accordingly.

---
*See [pages/README.md](../README.md) for how this folder fits the whole pages/ layer.*
*When this folder's contents change meaningfully, update THIS file.*

## Batch 522 (PS-290)

- **The token is read from after `#`** (`hooks/useConsultLinkToken.ts`), or from the path for older links. It is then removed from the address bar, and the page sends no Referer.
- **The page reads no case itself.** `consultTokenService.openConsult` returns only what the link covers (`ConsultCaseView`). The slide filtering moved to the service.
- **Opinions go with the token.**
  - A link revoked meanwhile refuses them, with a translated reason.
  - Once a signed opinion is in, the form is replaced by a note, and a small banner (`consultLifetime.banner`, class `ps-extconsult-lifetime-banner` in `externalConsultLifetime.css`) says how many views and hours the link has left; both numbers come from `ConsultCaseView.lifetime` (the service), the page computes nothing. Dates of birth are written DD-MMM-YYYY by the service (24-OCT-1980) in every language, the one deliberate exception to locale date formats.
- **Dates** use the reader's locale (`formatDateTime`).
- **Route:** `/consult`, plus `/consult/:token` for links issued before Batch 522.

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- Loading text here now goes through `LoadingState` (`components/Common`): nothing for 300 ms, then the screen's own loading text, and "Still working…" from 3 s. Carried over from Batch 548; `services/connectivity/latency.guard.test.ts` now covers every loading text in the app.

## Batch 669 (access-11)

A Draft no longer shows the "recorded and returned" confirmation. It shows `externalConsultViewPage.draftSavedConfirmation` (saved as a draft, not yet returned to the requester) in an amber box and keeps the form so the consultant can choose Signed and send. The text comes from `consultSubmitConfirmationKey()` in `services/consultAccess/consultLinkRules.ts`. 
**Patient identity (second half of access-11):** the page shows a **masked** patient by default (initials with the rest starred, `J*** S****`, and the date of birth as the year only, `**-***-1980`, with `externalConsultViewPage.identityMaskedNote`). The full name and date of birth appear only when the link was issued with the audited opt-in (`ConsultCaseView.patient.identity === 'full'`). The page only renders what the service returned: the choice is made in `services/consultAccess/consultIdentityMask.ts` before the data reaches the page, so a masked page never holds the surname or the full date (not hidden with CSS). The line stays tagged `data-phi`. A passcode check by e-mail is Planned (needs the server): `docs/architecture/CONSULT_ACCESS_API.md` CA-26.
