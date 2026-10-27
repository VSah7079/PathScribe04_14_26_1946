# Outside consult links — API contract and requirements

**Status:** Batch 522 (PS-290); Batch 669 adds the masked identity (CA-25 to CA-27). Requirements for the PathScribe API server (ASP.NET Core, SQL Server), to be built by the India team. The browser side is built and tested against a mock (`src/services/consultAccess/`). The mock keeps links in the issuing browser, so a link opens only where it was issued. This document is what the server must do so a link works for a real outside party.

Each requirement is numbered (CA-n) for traceability. The browser's tests that show the expected behaviour are named against each one. The server's own acceptance tests must cover every CA-n.

## What it is

A pathologist sends a case to an outside consultant for a second opinion. PathScribe issues a **consult link**: a web address carrying a bearer token. The consultant has no PathScribe account. The token alone lets them:
- see the case's accession, a **masked** patient identity (initials and birth year; the full name and date of birth only when the issuer opted in, CA-25), and the specimens and slides the link covers;
- send back an opinion (drafts, then one signed opinion).

The link expires on its own, and can be revoked at any time. Every step is audited.

Staff side: Case → External consult (issue, list, revoke, assess opinions), and Audit Log → Consult links (every link on every case).

Consultant side: `/consult#<token>` (public page, `ExternalConsultViewPage`).

## 1. Tokens

- **CA-1. Generation.** 32 bytes from a cryptographically secure generator (`RandomNumberGenerator.GetBytes(32)`), base64url without padding, prefixed `ct_`. The result is 46 characters, matching `^ct_[A-Za-z0-9_-]{43}$`.
  *Browser:* `consultTokenCrypto.ts`; `consultLinkRules.test.ts` › "the token".
- **CA-2. Shown once.** The token is returned only in the issue response. It is never stored, logged or returned again. Lost token: revoke the link and issue a new one.
- **CA-3. Stored as a fingerprint.** Store `SHA-256(token)` as lowercase hex, 64 characters, in a unique index. Look tokens up by fingerprint.
  *Browser:* `mockConsultTokenService.test.ts` › "issues a 256-bit random token and stores only its SHA-256 fingerprint".
- **CA-4. Never logged.** No log line, trace, exception message or audit record may contain a token. Use the first 8 hex characters of the fingerprint to correlate.
- **CA-5. Carried after `#`.** The link is `https://<host>/consult#<token>`. The part after `#` is never sent to a server, so it stays out of web-server, proxy, CDN and WAF logs.
  - The page reads the token from the address, then removes it from the address bar.
  - The page sends it to the API in a header (CA-14), never in a URL.
  - The old form `/consult/<token>` is still read, for links issued before Batch 522. The server must not log request paths under `/consult/`.
  
  *Browser:* `useConsultLinkToken.ts`; `ExternalConsultViewPage.test.tsx` › "reads the token from after #…".

## 2. Lifespan and revocation

- **CA-6. Default lifespan.** 24 hours from issue, or 72 hours if the 24-hour window touches a Saturday or Sunday. Weekends are judged in the issuing lab's time zone.
  *Browser:* `computeDefaultConsultTokenExpiry.ts` and its test.
- **CA-7. Maximum lifespan.** A caller-supplied expiry is accepted only up to a maximum lifespan set per organisation. **Open: Pete to set the default maximum.** Anything longer: 422.
- **CA-8. Checked on every request.** Every consultant request re-reads the link's state from the database. Do not cache "valid" between requests. A revoked or expired link fails at once.
- **CA-9. Revoke.**
  - Needs `case:consult-link:revoke`, checked with the case.
  - Sets `is_active = 0`, `revoked_at`, `revoked_by_user_id` and `revoked_by_name`, taken from the **authenticated session**, never from the request body.
  - Revoking a link that is already revoked or expired: 409 `CONSULT_LINK_NOT_ACTIVE`.
  
  *Browser:* `mockConsultTokenService.test.ts` › "records the revoker from the session…".
- **CA-10. Expiry is recorded.** A scheduled job, at least every 5 minutes, writes one `consult.link.expired` audit event per link that passed its expiry while still active. Mark the link (`expiry_recorded_at`) so the event is written once.
  - On a serverless host this is a timer trigger: one short run, never a wait inside a call.
  - *Browser:* the mock records expiries when links are read; `mockConsultTokenService.test.ts` › "records an expiry once…".

## 3. Staff endpoints

Staff endpoints need a signed-in session (`AUTHENTICATION_OIDC.md`) and the capability shown. Each capability is checked in the server, with the case as context where a case is involved.

| Method and path | Capability | Body / answer |
|---|---|---|
| `POST /api/cases/{caseId}/consult-links` | `case:consult-link:issue` | Body: `{ consultantIdentifier, consultantOrganization?, note?, slideIds?, expiresAt?, revealIdentity? }`. `revealIdentity` is `true` only when the issuer ticked the opt-in (CA-25); absent or `false` is the default. Answer: **201** with the link record **plus `token`** (only here). |
| `GET /api/cases/{caseId}/consult-links` | case read access | The case's links, newest first, **without** token or fingerprint. |
| `GET /api/consult-links?status=active\|all` | `audit:consult-links:view` | Every link on every case the caller's tenant holds, newest first. |
| `POST /api/consult-links/{id}/revoke` | `case:consult-link:revoke` | **200** with the updated link, or **409** `CONSULT_LINK_NOT_ACTIVE`. |
| `GET /api/cases/{caseId}/consult-opinions` | case read access | The case's opinions, newest first. |
| `POST /api/consult-opinions/{id}/assessment` | `case:outside-consult:assess` | As built in Batch 439 (PS-148): `{ assessment, note? }`. |

- **CA-11. Issue validation.** Refuse with 422 when:
  - the case doesn't exist in the caller's tenant;
  - `consultantIdentifier` is blank after trimming (`CONSULTANT_REQUIRED`);
  - a `slideIds` entry isn't a slide of that case.
  
  Without the capability: 403 `CONSULT_LINK_NOT_PERMITTED`. The issuer is taken from the session.
  `revealIdentity: true` without `case:consult-link:reveal-identity`: 403 `CONSULT_REVEAL_NOT_PERMITTED`, and no link is created (CA-25).
- **CA-12. Who holds the capabilities.**
  - `case:consult-link:issue` and `:revoke`: every role with case access, for now. **Open: Pete's decision 14**; the proposal is Pathologist and Admin.
  - `case:consult-link:reveal-identity` (Batch 669): Pathologist and Lab Director. Checked only when `revealIdentity` is `true`.
  - `audit:consult-links:view`: Admin, Lab Director, QA Reviewer.
  
  See `AUTHORIZATION_API.md`.

## 4. Consultant endpoints (public)

- **CA-13. No PathScribe session.** These endpoints take no cookie and no staff session. The token is the whole authorization, and only for the one case and scope on its link. Never route them through the internal case-access check: an outside consultant has no tenant membership.
- **CA-14. The token travels in a header.** It is sent as `Authorization: ConsultLink <token>`, never in the query string or path.

| Method and path | Answer |
|---|---|
| `POST /api/consult/open` | **200** with the consult view (CA-15). It records one view (CA-17). |
| `POST /api/consult/opinions` | Body: `{ signedStatus: 'Draft' \| 'Signed', opinionText, diagnosticCategory? }`. **201** with the opinion, or **422** with `OPINION_REQUIRED` / `OPINION_ALREADY_SIGNED`. |

- **CA-15. Minimum necessary.** The consult view is exactly `ConsultCaseView` (`consultLinkRules.ts`). **Batch 669 (access-11): the patient is masked by default.**
  ```json
  { "linkId": "…", "accessionNumber": "S26-0001",
    "patient": { "identity": "masked", "maskedName": "J*** S****", "birthYearMasked": "**-***-1980" },
    "specimens": [{ "id": "…", "label": "A", "description": "Skin, left arm" }],
    "slides": [{ "id": "…", "label": "A-1 · H&E" }],
    "scopedSlideCount": 0, "expiresAt": "…", "opinionSigned": false,
      "lifetime": null }
  ```
  With the issuer's opt-in (CA-25) `patient` is instead `{ "identity": "full", "lastName": "…", "firstName": "…", "dateOfBirth": "02-JAN-1970" }`. `lifetime` is `null` until a Signed opinion is in, then `{ "remainingViews": 2, "hoursRemaining": 46 }` (CA-28). The date of birth is always `DD-MMM-YYYY` with an English capital month (CA-29).
  - A slide-scoped link returns only its slides, and only the specimens they belong to.
  - Nothing else from the case: no MRN, address, diagnosis, report text, staff notes or the issuer's internal note.
  - *Browser:* `consultLinkRules.test.ts` › "what the consultant sees".
- **CA-16. One uniform refusal.** An unknown, expired or revoked token, or a link whose case is gone, all answer **401** `{ "error": "CONSULT_LINK_INVALID" }`: same body, same headers, and about the same time (look up by fingerprint, then compare with a constant-time comparison). The audit record says which it was (CA-20).
  *Browser:* `mockConsultTokenService.test.ts` › resolve() denials.
- **CA-17. Views.** Each successful `open` adds 1 to `access_count`, sets `last_accessed_at` and writes `consult.link.accessed`. A check that doesn't show the case records nothing. After a Signed opinion each `open` also adds 1 to `views_after_signature` (CA-28).
- **CA-18. Opinions.**
  - A Signed opinion sets `signed_at` (once); a Draft never does. Submitting is **not** a view (CA-28).
  - The case, the link and the consultant come from the token, never from the request body.
  - Drafts may be sent until a signed opinion is in; after that, `OPINION_ALREADY_SIGNED`.
  - A blank opinion: `OPINION_REQUIRED`.
  - The token is checked again on submission, so a link revoked meanwhile takes nothing (401).
  
  *Browser:* `mockConsultTokenService.test.ts` › "refuses an opinion on a revoked link, and a second opinion after a signed one".
- **CA-19. Abuse limits.**
  - Per client address, at most 20 failed `CONSULT_LINK_INVALID` answers in 10 minutes, then 429 for 15 minutes.
  - Per link, at most 60 requests a minute.
  - An opinion is at most 20,000 characters.

## 5. Audit

- **CA-20. Events.** `consult.link.created`, `consult.link.accessed`, `consult.link.access_denied` (unknown or revoked; the detail says which), `consult.link.access_attempt_expired`, `consult.link.access_attempt_exhausted` (no views left after the signed opinion), `consult.link.expired` (also written when the post-signature window or views end the link), `consult.link.identity_previewed` (CA-30), `consult.link.revoked`, `consult.opinion.submitted` and `consult.opinion.assessed`.
  - `detail` is PHI-safe: the case accession and the consultant's identifier, never patient details.
  - `consult.link.created` records whether the identity opt-in was used (literal English, no PHI): "Identity opt-in used: the consultant sees the full patient name and date of birth." or "Patient identity masked (default)." `consult.link.accessed` says "full patient identity shown" or "patient identity masked". (The reviewer's brief called the creation event CONSULT_LINK_ISSUED; the event name in use is `consult.link.created`, kept so the Audit Log filters and reports do not change.)
  - The audit record has the client address and the fingerprint prefix, never the token.

## 5a. Patient identity on the consult page (Batch 669, access-11)

Pete's reviewer ruled (Oct 24, 2026): minimise PHI by default. The consultant needs the accession, specimens, slides and expiry to give an opinion; they do not need to know who the patient is. Today the link is the only protection (anyone holding it can open it), so the page must not carry identity unless the issuer deliberately chose it.

- **CA-25. Masked by default; full identity is an audited opt-in.**
  - The server builds the patient part of the consult view; the page never decides. A masked view is built **from scratch** and contains no part of the surname, no full first name and no full date of birth. It is not a full record with fields hidden by the page, and the browser must never receive the unmasked values in a masked response (view source, the network tab and a screen reader all see the same data).
  - **Masked projection** (`consultIdentityMask.ts`): each word of the first and last name keeps its first letter and the rest becomes `*`, first name first (`John Smith` becomes `J*** S****`); the date of birth becomes `**-***-` plus the four-digit year (`**-***-1980`, the same style as the revealed form, CA-29); no year recorded means no date is sent. The name length is not hidden (accepted: the aim is that a forwarded or screenshot link does not identify the patient). A missing patient record gives an empty `maskedName`.
  - **Opt-in.** The issuer ticks "Show the patient's full name and date of birth to the consultant" on the issue form (default off, per link, decided at issue time and never changed afterwards; to change it, revoke and issue a new link). The request carries `revealIdentity: true`. The server stores it on the link (`reveal_identity bit not null default 0`) and applies it to every later open of that link. Links that exist without the column are masked.
  - **Permission.** `case:consult-link:reveal-identity` (Pathologist and Lab Director by default), checked in addition to `case:consult-link:issue` and only when `revealIdentity` is `true`. Refusal: 403 `CONSULT_REVEAL_NOT_PERMITTED`, nothing is created.
  - **Audit.** `consult.link.created` says whether the opt-in was used, and `consult.link.accessed` says which projection was served (CA-20). No patient detail goes in either.
  - *Browser:* `consultIdentityMask.test.ts`; `consultLinkRules.test.ts` › "what the consultant sees"; `mockConsultTokenService.test.ts` › "Batch 669"; `ExternalConsultViewPage.test.tsx`; `ExternalConsultAccessModal.test.tsx`.
- **CA-26. Identity verification by passcode: PLANNED, not built.** To defend against a forwarded link, the server would e-mail a one-time passcode to the consultant's address (recorded at issue time) and require it before `open` returns anything; five wrong tries lock the link. This needs a mail sender, a place to keep the passcode hash and its attempt counter, and a consultant address on the link, none of which the browser mock has. It is not built, not in the browser and not in the mock; the page and the issue form have no passcode field. Until then the link is a bearer secret protected by CA-1 to CA-9 and, since Batch 669, by showing a masked identity.
- **CA-27. Expiry is enforced on every request (verified Batch 669).** `activeLinkFor` re-reads the link and applies `resolveConsultTokenStatus` on every open and every opinion, so an expired link is refused even if nothing else has touched it (`mockConsultTokenService.test.ts` › "resolve() denies an expired token" and › "links expire"). Default lifespan 24 h (72 h across a weekend); there is no way to issue a link that never expires (the maximum is still open, CA-7).
- **CA-28. A Signed opinion starts a short second life (reviewer's ruling, Oct 24, 2026; replaces "a Signed opinion closes the link").** One policy, `consultLinkLifetime.ts` (constants `CONSULT_POST_SIGNATURE_MAX_VIEWS = 3`, `CONSULT_POST_SIGNATURE_HOURS = 48`); the server must implement exactly this, and **the count and the clock are the server's**, never the browser's.
  - Before a Signed opinion the link's own `expires_at` applies. A Draft does not start a clock and does not count a view.
  - A Signed opinion sets `signed_at`. From then on the link stops working at the first of: 3 `open` calls after `signed_at` (`views_after_signature` reaches 3: the 3rd opens, the 4th is refused), 48 hours after `signed_at` (at exactly 48 h it is refused), or the link's own `expires_at` (signing never lengthens a link: decision for Pete). Revocation still ends it at once.
  - The Signed submit itself is **not** a view. Every `open` after it is, and writes `consult.link.accessed` (the detail says the view number of 3).
  - The refusal is the usual uniform 401 `CONSULT_LINK_INVALID` (CA-16); the audit says which: `consult.link.access_attempt_expired` or `consult.link.access_attempt_exhausted`. Submissions are refused the same way.
  - The `open` answer carries `lifetime: { remainingViews, hoursRemaining }` once signed (null before): views left after this open counted, and whole hours left rounded up (at least 1 while open). The page shows "This secure link will expire in X views or Y hours, whichever comes first." from these two numbers; it computes nothing.
  - The issuer lists show a signed link's remaining views and hours, and read it as Expired once either is used up.
  - *Browser:* `consultLinkLifetime.test.ts`; `mockConsultTokenService.test.ts` › "Batch 669: views and hours after a signed opinion".
- **CA-29. Date of birth format.** When shown in full it is always `DD-MMM-YYYY` with an English three-letter capital month (`24-OCT-1980`), in every language and locale, read from the stored calendar date with no time-zone conversion; masked it is `**-***-YYYY`. The one deliberate exception to "format dates in the user's locale": laboratory dates must not be ambiguous. The server builds the string (`formatConsultDateOfBirth`). A date not stored year-first is sent as stored, never guessed.
  - *Browser:* `consultIdentityMask.test.ts` › "fixed date-of-birth format".
- **CA-30. Identity preview (reveal without issue).** `POST /api/consult-links/{id}/preview-identity`, capability `case:consult-link:reveal-identity` only (not `:issue`). Answer: the `full` patient projection for that link's case, for display to the staff member only; nothing is sent to the consultant. 403 `CONSULT_REVEAL_NOT_PERMITTED` without the capability; 404 for an unknown link. Always writes `consult.link.identity_previewed` (literal English, no PHI: "Patient identity revealed on screen for review (identity preview of a consult link); nothing was sent to the consultant.") with the signed-in user. The browser calls it from Audit Log → Consult links; the browser's route name is `/api/consult-access/consult-token/preview-identity` (CASE_WORKFLOWS_API.md).
  - *Browser:* `mockConsultTokenService.test.ts` › "identity preview".
- **Single-use links: not done, a decision for Pete.** A link that works once is not a small, safe change here: the consultant legitimately opens the page again (a reload, a second look at the slides), may send a Draft and then a Signed opinion on the same link (CA-18), and a single-use rule would lock them out after the first view or force an unfriendly "view then opinion in one go". If wanted, the safer form is "expires when the Signed opinion is accepted", which held in effect until Batch 669. **Superseded by the reviewer's ruling (CA-28):** a Signed opinion now allows 3 more views / 48 hours instead of closing the link. A passcode (CA-26) would be the next step.

## 6. Pages and headers

- **CA-21. The consultant page** (`/consult`) is served with:
  - `Referrer-Policy: no-referrer` (the page also sets it in a `<meta>` tag);
  - `Cache-Control: no-store`;
  - `X-Robots-Tag: noindex, nofollow`;
  - the app's Content-Security-Policy.
  
  API answers to consultant endpoints carry `Cache-Control: no-store`.
- **CA-22. Slide images.**
  - Images are served through a PathScribe proxy that checks the token and that the slide is in scope on every tile request: `GET /api/consult/slides/{slideId}/…`, with the token in the header.
  - A vendor viewer that needs a URL gets a signed URL that expires within 5 minutes and covers one slide.
  - **Not built in the browser yet:** the consult page lists slides by name only.

## 7. Storage (SQL Server)

```sql
consult_link (
  id                  uniqueidentifier primary key,
  tenant_id           uniqueidentifier not null,
  case_id             nvarchar(64) not null,
  case_accession      nvarchar(64) not null,
  slide_ids           nvarchar(max) null,           -- JSON array; null = whole case
  token_hash          char(64) not null unique,     -- SHA-256 hex (CA-3)
  consultant_identifier nvarchar(200) not null,
  consultant_organization nvarchar(200) null,
  reveal_identity     bit not null default 0,       -- CA-25: 1 = full name and date of birth shown
  note                nvarchar(2000) null,          -- internal; never sent to the consultant
  issued_by_user_id   nvarchar(64) not null,
  issued_by_name      nvarchar(200) not null,
  issued_at           datetime2 not null,
  expires_at          datetime2 not null,
  is_active           bit not null,
  revoked_at          datetime2 null,
  revoked_by_user_id  nvarchar(64) null,
  revoked_by_name     nvarchar(200) null,
  expiry_recorded_at  datetime2 null,
  signed_at           datetime2 null,               -- CA-28: when the Signed opinion was accepted; null until then
  views_after_signature int not null default 0,     -- CA-28: opens counted since signed_at
  access_count        int not null default 0,
  last_accessed_at    datetime2 null,
  row_version         rowversion
)
consult_opinion (
  id, consult_link_id (fk), case_id, consultant_identifier, diagnostic_category null,
  signed_status ('Draft'|'Signed'), opinion_text nvarchar(max), submitted_at,
  assessment null, assessment_note null, assessed_by_user_id null, assessed_by_name null,
  assessed_at null, assessed_after_release bit null, qa_record_id null
)
-- At most one signed opinion per link: a filtered unique index.
create unique index ux_consult_opinion_signed on consult_opinion(consult_link_id) where signed_status = 'Signed';
```

- **CA-23. Residency.** Links and opinions live in the tenant's own database, in its hosting region. The same rule applies as for case data (PS-539).
- **CA-24. Cloud-agnostic.** Nothing here depends on a particular cloud. The scheduled expiry job (CA-10) and the rate limits (CA-19) use the platform's timer and a store the API already uses; no provider-specific service is required.

## Open decisions (Pete)

0. **Single-use links** (Batch 669): not built; see the note after CA-27.

1. **Who issues and revokes links:** decision 14. The proposal is Pathologist and Admin.
2. **Maximum lifespan** (CA-7).
3. **Phase 2: diagnostic categories mapped to the concordance engine.** Proposed: defer. The pathologist's own assessment (Batch 439, PS-148) already records agreement and recommends a CAPA on a major discordance after release.
4. **Notify the issuing pathologist when a signed opinion arrives.** Recommended: an internal message, the same way delivery exceptions are sent.

## Browser side, as built

- **Services** (`src/services/consultAccess/`):
  - `consultTokenCrypto.ts`: the token and its fingerprint;
  - `consultLinkRules.ts`: the address, the consult view, opinion rules, expiry and the list filter;
  - `mockConsultTokenService.ts`: the stand-in for this API.
- **Screens:**
  - `components/ExternalConsult/ExternalConsultAccessModal.tsx`: issue, list, revoke, assess;
  - `pages/ConsultLinksAuditSection.tsx`: Audit Log → Consult links;
  - `pages/ExternalConsultViewPage/`: the consultant's page;
  - `hooks/useConsultLinkToken.ts`.
- **Tests:**
  - `consultLinkRules.test.ts`;
  - `mockConsultTokenService.test.ts`;
  - `ExternalConsultViewPage.test.tsx`;
  - `ExternalConsultAccessModal.test.tsx`;
  - `ConsultLinksAuditSection.test.tsx`;
  - `demoBaseline456.decantSupport.test.ts`.
