# services/consultAccess/

**NEW (Sep 2026)** — PS-290, External Consult / Second-Opinion Access.
Before treating anything in this folder as production-ready, read
`IConsultTokenService.ts`'s own header in full — this is not real token
security, and this README does not repeat that caveat in full here.

Scoped this pass deliberately, per direct confirmation before building:
follow this app's own established mock-first pattern (interface/mock/real
triplet), but disclose loudly, everywhere, that "signing" here is an
opaque client-generated string with no real cryptographic issuance or
server-side validation — real infrastructure for that depends on PS-291's
own, still-unbuilt Interface Engine backend.

## Files

- **`IConsultTokenService.ts`** — `ConsultToken`/`ConsultTokenScope`
  (case-level default, optional `slideIds` narrowing per spec §4),
  `ConsultOpinion` (Phase 1 Hybrid payload — free-text opinion + structured
  metadata, per spec §3), `resolveConsultTokenStatus()` (Active/Expired/
  Revoked, derived — never a separately stored status field to drift).
- **`mockConsultTokenService.ts`** (+ `.test.ts`, 9 tests) — issue/resolve/
  revoke/recordAccess/submitOpinion. Every real state change funnels
  through one real audit choke point (`logConsultAuditEvent()`, wrapping
  `mockAuditService.logEvent()`) — same "single enforcement point"
  discipline `services/auth/caseAccessControl.ts`'s own header documents.
  `resolve()` gives one deliberately uniform denial message whether a
  token is unknown, expired, or revoked (OWASP-aligned, same posture as
  that file's own "not found, not forbidden" choice) — but the audit
  entry underneath still records which one, really happened.
- **`computeDefaultConsultTokenExpiry.ts`** (+ `.test.ts`, 5 tests) — pure,
  spec §2's own "24-hour default window, 72 hours if spanning a weekend"
  rule, kept out of the service so it's independently testable.

## Real audit events this domain writes

`consult.link.created`, `consult.link.accessed`, `consult.link.access_denied`,
`consult.link.access_attempt_expired`, `consult.link.revoked`,
`consult.opinion.submitted` — directly satisfies spec §2's own compliance
requirement ("audit logging must capture when a consult link was created,
accessed, expired, or manually revoked"). All `detail` text is PHI-safe
(case accession number only, never patient name/DOB/clinical values),
matching `AuditLog.detail`'s own doc comment.

## Deliberate scope cuts

- **No real JWT/cryptographic token issuance or server-side validation**
  — the whole reason this domain is disclosed this loudly. See
  `IConsultTokenService.ts`.
- **No media-proxy layer** (spec §1's fallback for vendor viewers that
  can't validate an external JWT) — moot until real JWTs exist.
- **Phase 2 (concordance-engine integration)** — mapping a submitted
  `diagnosticCategory` into the real concordance engine
  (`recordAiHumanConcordance.ts`'s own shape) is explicitly Phase 2 in the
  spec itself; not built this pass.
- **No real external-identity directory** — `consultantIdentifier` is
  free text, confirmed by direct search before building this: there is no
  "external consultant" or "guest reviewer" concept anywhere else in this
  app's user/staff model to attach it to instead.

## Batch 439 (PS-148): assessing outside opinions

Opinions came back but were never shown to the pathologist. Now:
- `outsideConsultRules.ts` (pure): the assessment (agrees / minor difference / major discordance; a difference needs a note; only a signed opinion; once), whether the report was released (`finalized` or `closed`), and the "Outside Consult Correlation" QA record.
- `assessOpinion` on the service: checks `case:outside-consult:assess`, writes the QA record and keeps the assessment on the opinion; audited (`consult.opinion.assessed`). A major discordance on a released report recommends a CAPA (`post-signout-discordance`, type "Outside Consult Major Discordance"); before release it recommends nothing.

## Batch 456 — Sign-in lockout, password screening, demo seeds

`consultDemoSeed.ts`: an active consult link on S26-4602, issued by Dr. Sarah Johnson to Dr. Miguel Ortega (Sonoran Dermatopathology Associates, fictional), 72 hours, viewed once. This service stores the token itself, so the seed makes a random one when first read; nothing is in source. The link address is shown only when a link is created, so the seeded one can't be opened; issue a new link to show the consultant's view.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file.*
