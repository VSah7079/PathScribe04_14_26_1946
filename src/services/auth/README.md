# services/auth/

Two jobs:
- **Case-level access control** and institution/session resolution (the files listed first below).
- **Since Batch 343 (PS-60): signing in and out.** That means demo password accounts and single sign-on with the hospital's identity provider. See the Batch 343 section and [`docs/architecture/AUTHENTICATION_OIDC.md`](../../../docs/architecture/AUTHENTICATION_OIDC.md).

**Pattern:** mostly pure decision modules, not the interface/mock/firestore pattern. `authSession.ts` is created with its dependencies; `authSessionInstance.ts` wires the real ones and is exported from `@/services` as `authSession` and `authConfig`.

## Files

- **`caseAccessControl.ts`** — Real enforcement of who can see which cases (org boundary, pediatric access gating, Orchestration/Outreach visibility). **Real addition:** `SessionUser` now carries `canAccessCrossTenantQa?: boolean`, and a new `canViewCrossTenantQaData(session)` function checks it (or `role: 'superadmin'`) — a genuinely separate, more granular permission from the existing `superadmin` case-access bypass, matching the established least-privilege pattern (`canViewPediatric`/`canViewOrchestration` on `StaffUser`): someone who legitimately needs cross-tenant QA/compliance reports shouldn't also need full platform-admin case-access privileges as a side effect of that. Built specifically because all four QA tabs in `components/QualityAssurance/` were found calling `bypassAccessControl: true` unconditionally on their case fetch — real, unscoped multi-tenant PHI reaching the browser before any client-side filter ran (a real CWE-602 exposure, not hypothetical). Now gated behind this real permission check instead. **`canFinalizeCase()` / `resolveFinalizeEligibleTypeIds()` / `deriveEligibleFinalizerIds()`** — Dimension 4 (case relationship) write guard for the finalize/sign-out transition. `resolveFinalizeEligibleTypeIds()` resolves which participation-type ids actually confer sign-out authority per real `ParticipationTypeRecord.canFinalize`, resolved per-performing-lab via `resolveParticipationTypeAuthority()` (`services/participationTypes/IParticipationTypeService.ts`) so a lab's own `authorityOverrides` genuinely take effect — replacing what used to be a hardcoded `'primary'`/`'attending'` literal, now kept only as `FINALIZE_ELIGIBLE_PARTICIPATION_TYPES_FALLBACK` for callers that haven't supplied real data yet. `canFinalizeCase()` itself is fully lab-scoped; `deriveEligibleFinalizerIds()` (the flat-array denormalization `Case.eligibleFinalizerIds` needs for a future Firestore-rules mirror — see `services/cases/README.md`'s own account) deliberately is NOT, a disclosed cost tradeoff at `CaseRouter.ts`'s own write chokepoint, moot today since the repo-root `firestore.rules` has no rule that reads it (corrected: an earlier note said no rules file existed at all — one does, covering version checks and finalized-case immutability, but not finalize eligibility). **New (PS-327): `resolveCountersignRequiredTypeIds()`** — the `requiresCountersign` counterpart to `resolveFinalizeEligibleTypeIds()` above, same real per-lab `authorityOverrides` resolution, no fallback constant (there's no pre-existing hardcoded literal this replaces). Consumed by `resolveResidentCountersignRequired()` (`services/cases/README.md`) via `useSignOutWorkflow.ts` — see that hook's own README entry for the full real gap this closes (an admin-configured participation type's "Requires Countersign" checkbox previously drove nothing but a cosmetic badge). **Jurisdiction-bound authority (Sep 2026, per Pete's own per-country role data):** `canFinalizeCase()`, `resolveFinalizeEligibleTypeIds()`, and `resolveCountersignRequiredTypeIds()` each take an optional `jurisdiction` (the performing lab's own `Facility.jurisdiction`) alongside `performingLabFacilityId`, passed straight to `resolveParticipationTypeAuthority()`'s three-tier resolution — lab-level exception, then the country's own regulatory profile, then the platform default. Omitting it reproduces the prior lab-only behavior exactly. See `services/participationTypes/README.md` for the full model and seeded AU/NZ/EU/UK/IE/CA/KR data.
- **`institutionService.ts`** — Session/institution resolution — explicitly documents consolidating a prior duplication with caseAccessControl.ts's own session logic (good example of the codebase catching and fixing its own drift).

## Notes

- `services/authorization/` exists again since Batch 369 (PS-355) and is the home for capabilities and `authorizationService.enforce`. This folder keeps sign-in, session roles, case-level access control and signer confirmation. (An earlier, empty `authorization/` folder was deleted in the July 2026 review.)
- **This module's own documented caveat still applies to the cross-tenant QA fix above**: it's a real, correctly-shaped decision, but it's still a client-side check — a modified client can bypass it. The actual security boundary needs server-side query enforcement (the API server's job: `docs/architecture/CASE_PRIVACY_MODEL.md`, PS-345; the backend-requirements document once cited here was never written, PS-40) — what's built here models the correct shape for the backend team to match, same as every other access decision in this file.

*Corrected in the Batch 496 README audit (Oct 9, 2026): `services/authorization/` is no longer an empty, deleted folder; it holds the capability checks (Batch 369).*

## Batch 328 (PS-63), reverted in Batch 329

Batch 328 added `SessionUser.staffRoles`; Batch 329 removed it. Template rights are read live from the staff record and role catalog by role id (see `services/templates/README.md`), not from the session.

## Batch 331 (PS-327)

**`resolveFinalizeAuthorityContext.ts`** (+ `.test.ts`, new) gathers what a sign-out needs before calling `canFinalizeCase` / `resolveCountersignRequiredTypeIds`:
- the participation-type catalog;
- the case's performing lab;
- the jurisdiction whose country profile applies. That is the lab's country, or the caller's `jurisdictionOverride`; Autopsy passes the coroner jurisdiction.

It moved here from `useSignOutWorkflow.ts` so Surgical Pathology, Autopsy and (next) Cytology share one copy. It never rejects.

## Batch 343 (PS-60): sign-in

**Before this batch:**
- `AuthContext.tsx` held eleven hard-coded accounts with plain-text passwords, ten of them `superadmin`, and they shipped in every production bundle.
- The Google and Microsoft buttons were disabled.

**Now:**

| File | What it does |
|---|---|
| `sessionProfile.ts` | `SessionProfile` (AuthContext's `User`), and reading and writing it under the same key as before (`pathscribe-user`). `staffSessionFields` (was `resolveStaffFields` inside AuthContext). `getSessionUser()` and `utils/effectiveScanStation.ts` read through it now. |
| `authConfig.ts` | `resolveAuthConfig(env, isProduction)`: the mode (`demo`/`sso`) and the providers, from `VITE_AUTH_*`. https only; Microsoft must name a tenant; Google refused (it needs the server); an unknown mode fails closed. |
| `externalIdentity.ts` | `checkIdTokenClaims` (issuer, audience, expiry), `identityFromClaims` (Entra `oid`, otherwise `sub`), `matchStaffToIdentity`: pre-provisioned active staff only, linked by issuer + subject, first sign-in by trusted email, refusals `not_provisioned` / `inactive` / `ambiguous` / `already_linked`. |
| `sessionRole.ts` | `deriveSessionRole`: case/config access from the role catalogue gives pathologist, admin, pathologist-admin or none; never superadmin. `buildSsoSessionProfile`. `resolvePostSignInPath`: back to the page the user wanted, via `safeInternalPath`. |
| `sso/ssoClient.ts` | `oidc-client-ts`: authorization code + PKCE, no secret. Tokens in sessionStorage; the return path is kept in local state, not sent to the provider; one completion per callback URL; refresh-token renewal; sign-out forgets tokens only. |
| `sso/resolveSsoProfile.ts` | Who signed in: `GET /api/me` on the API server, or locally against the demo directory (stores the link and audits it). |
| `authSession.ts` | Password and SSO sign-in, the same-browser conflict check, sign-out (drafts kept on idle timeout), restore on load, the access token. |
| `authSessionInstance.ts` | The wired instance. The demo accounts are loaded only when `VITE_AUTH_MODE` isn't `sso`, so an `sso` build leaves them out entirely (checked by building). |
| `accessTokenSource.ts` | Where the live-update hub (and later API calls) get the token, without importing the sign-in code. |
| `demo/demoAccounts.ts`, `demo/passwordHash.ts` | The demo accounts, with PBKDF2-SHA256 hashes (600,000 iterations) checked with Web Crypto. An unknown email takes as long as a wrong password. Make new hashes with `scripts/auth/hash-demo-password.mjs`. |
| `testing/fakeOidcProvider.ts` | **Test only:** a local OpenID Connect provider (PKCE checked, secret refused) for the integration test and the browser check. |

**Also fixed:** a reload used to release this tab's claim on the active-session marker for good, so after one reload a sign-in in another tab was no longer reported as a conflict. `restoreSession` now takes the marker back if no other tab holds it.

**Audit:** *Signed in* (password and SSO), *SSO account linked*, *SSO sign-in refused*.

**Tests:**
- `authConfig`, `externalIdentity`, `sessionRole`, `authSession`, `demo/demoAccounts`: unit tests.
- `sso/ssoClient.integration.test.ts`: the real library against the local provider.

**Still open:** the API server's part, an admin screen for linked accounts, OR terminal device tokens, runtime configuration (`AUTHENTICATION_OIDC.md` §8). *(Since closed in part: linked accounts are shown and unlinked in Staff → edit, `components/Config/Staff/LinkedSignInAccounts.tsx`, Batch 345 — checked in the Batch 496 README audit.)*

## Batch 344: confirming who signs

**What was wrong:** a signature proved nothing about who signed. The sign-out and finalize screens asked for a username and password and never checked them; the pre-finalisation panel accepted any three characters; cytology sign-out and the autopsy PAD/FAD asked for nothing.

**`signerConfirmation.ts`** (created in `authSessionInstance.ts`, exported from `@/services` as `signerConfirmation`):
- **Method:**
  - `password` for demo password sessions;
  - `sso` for SSO sessions that know their account (the profile now stores `ssoIssuer` / `ssoSubject` at sign-in);
  - otherwise `unavailable`.
- **Password:** checked against the demo account. The username is also required on the first signature of a sign-in session, the two-component rule of 21 CFR 11.200(a)(1).
- **SSO:** `ssoClient.reauthenticate` opens the provider in a popup with `prompt=login`, `max_age=0` and `login_hint`. The answer must be:
  - the same account (issuer + subject);
  - freshly authenticated (`auth_time`, else `iat`, no earlier than the request);
  - a valid token for this app.
  The popup uses its own throwaway token store, so it never replaces the session's tokens. It returns to `/auth/signing/<provider>`; `main.tsx` handles that page without starting the app, so the popup can't disturb the session markers.
- **Biometric:** demo builds only (the WebAuthn check is simulated).
- **Lockout:** five failed confirmations lock signing for that user for 15 minutes. A cancelled or blocked popup doesn't count.
- **Audit:** *Signature confirmed*, *Signature confirmation failed*, *Signing locked*, each with the case.

**Screens:** `components/Signing/`, `hooks/useSignerConfirmation.ts`; the sign-out, countersign, finalize, pre-finalisation, cytology and autopsy screens all go through it.

**Tests:**
- `signerConfirmation.test.ts`;
- `sso/ssoClient.reauth.test.ts`;
- `signingScreens.guard.test.ts`;
- `testing/fakeOidcProvider.ts` now records `auth_time` and each `/authorize` request.

**Still open:**
- **The server must verify each signature itself.** Today the client doesn't send the popup's ID token with the signing request (`AUTHENTICATION_OIDC.md` §5.4). *(Since closed on the client side: Batch 345 carries the ID token as `SignatureConfirmation.proof` and `signatureEvidence.ts` checks it; cryptographic verification is still the API server's job — checked in the Batch 496 README audit.)*
- **Real WebAuthn** for biometric signing.

## Batch 345: the signature checked when it is saved, and stored

**`signatureEvidence.ts`** (`signatureGate`, exported from `@/services`):
- **Before the change: `accept(confirmation, { caseId, caseRef, actions })`.** It checks the confirmation the way the API server will (`AUTHENTICATION_OIDC.md` §5.4):
  - the signed-in user, for this action and this case;
  - at most 5 minutes old;
  - never used before, by confirmation id and by ID-token hash;
  - for SSO: the provider's ID token for this app, for the session's own account, authenticated after the request.

  It then holds the confirmation for the case. `accept(undefined, …)` resumes a paused signing with the held one for up to 15 minutes.
- **After the change is saved: `commit(caseId, outcome, link)`** writes the signature record (`services/signatures/`) and audits it.
- **Refusals** are audited too.
- **What it can't do:** check the token's cryptographic signature, which is the server's job. Evidence says `verifiedBy: 'browser'`.

**Other changes:**
- **`SignatureConfirmation`** gained `confirmationId` and `proof`, the ID token from the SSO popup; `ssoClient.reauthenticate` now returns it.
- **`ExternalIdentityLink.linkedBy`** gained `'scim'`.
- **`linkedAccounts.ts`:** `describeLinkedAccounts` (for Staff → edit) and `unlinkExternalIdentity` (audited).

**Tests:** `signatureEvidence.test.ts`, `linkedAccounts.test.ts`, and the guard test's new save-time check.

## Batch 369 (PS-355)

`sessionRole.deriveSessionRole` ignores a role that can't be assigned to staff (`assignable: false`, i.e. Superadmin). A staff record naming it never produces an app role. Superadmin comes only from the support sign-in.

## Batch 371 (Pete: Superadmin is reserved for ForMedrixAI support)

- **Demo accounts.** These stay `superadmin`: Pete Nimmo (both emails), System Admin, Paul Carter, Amber Fehrs-Battey, Bronwyn Prior and Rossana Babakhani. Dr. Sarah Johnson, Dr. Oliver Pemberton and Dr. J. Mark Tuthill now sign in as `pathologist`, so they see the product as their own staff would. Sarah Johnson gained a staff record (Pathologist, ORG-DVMC) in `users/mockUserService.ts`, which bumps the seed version.
- **`caseAccessControl.isCrossTenantSupportAccess`** (new, pure): whether a granted case open relies on support access, i.e. a superadmin session and another organisation's case. `CaseRouter.getCase` then checks `platform:cross-tenant-cases:view`, which writes the audit entry. The tenant-check bypass in `resolveCaseAccess` itself is unchanged.

## Batch 374

Five more demo sign-ins, all with the same password as `demo@pathscribe.ai`, so the per-role Home page can be demoed:
- Maria Lopez (Accessioner);
- Kevin Brooks (Histotechnologist);
- Priya Desai (Cytotechnologist);
- Daniel Kim (Molecular Technologist);
- Connor Whitlock (PA; the staff record already existed).

They sign in with the app role `pathologist`, the same coarse role an SSO sign-in with case access gets. What they can open comes from their roles' capabilities.

## Batch 423

The new signing action `registry-go-live` (audit text "registry live register approval") is the credential re-confirmation for approving a registry's switch to its live register. It is checked through `signatureGate.accept` in `services/registryGoLive/registryGoLiveDeps.ts`, with the same one-time use, freshness and lockout as report sign-out.

## Batch 428: Configuration permissions

Unlinking a sign-in account (`linkedAccounts.ts`) needs `config:staff-access:assign`, like the rest of a staff member's access (it used to skip the staff check).

## Batch 444

`authSessionInstance.ts` passes `resolveAuthConfig` an explicit object of the 16 `VITE_AUTH_*` settings, each read by name. It used to pass `import.meta.env` itself, which made Vite copy every `VITE_` variable in `.env` (the demo passwords included) into the production bundle.

## Batch 448

`authSession.signInWithPassword` checks a password set from the Staff screen first (`verifyStaffPassword`).
- **A built-in demo account** keeps its own profile and app role.
- **Anyone else** (the demo Lab Director, a site without single sign-on) gets the app role their staff roles give, as single sign-on does (`deriveSessionRole`). No role means no access.
- **Must-change passwords:** the result is `'password_change_required'` and no session starts.
- **Wiring:** `authSessionInstance.ts` adds `verifyStaffPassword` and `demoAccountFor`.

`demo/demoAccounts.ts`: the built-in passwords are only the starting ones.

## Batch 455 — Demo baseline: people, pools, cases and the reset

`demo/demoAccounts.ts` has seven new built-in sign-ins:

| Name | Role | Staff id |
|---|---|---|
| Dr. Rachel Okafor | Lab Director | LD-001 |
| Dr. James Okafor | Resident | 2 |
| Dr. Lucas Moreau | Fellow | FEL-001 |
| Nadia Rahman | Cytotechnologist | CT-002 |
| Hannah Price | Template Author | TA-001 |
| Dr. Samuel Osei | Template Approver | TAP-001 |
| Grace Liu | QA Reviewer | QA-001 |

Each has its own salt and the demo@pathscribe.ai password. The hashes were made with `scripts/auth/hash-demo-password.mjs` logic on the command line; the password itself is in no file.

## Batch 456 — Sign-in lockout, password screening, demo seeds

**Sign-in lockout** (Pete: "Add the sign-in lockout"), `signInLockout.ts`:
- 5 failed password sign-ins in a row for one email lock it for 15 minutes (`SIGN_IN_LOCK_POLICY`, the same numbers and counting as `SIGNING_LOCK_POLICY`).
- Counted per email typed, whether or not it is an account. While locked the password isn't checked. A correct password clears the count.
- `authSession.signInWithPassword` now returns a `SignInRefusal` (`invalid` with the attempts left, or `locked` with the time) when it has a lock store; `authSessionInstance.ts` wires the browser store (`pathscribe_sign_in_locks`, under the mock prefix, so Full Reset clears it).
- Audited: "Sign-in failed", "Sign-in locked", "Sign-in refused" (attempt while locked). The audit names the account (`accountNameFor`) or says "Unknown email"; it never records what was typed.
- `signInRefusalNotice` picks the sign-in screen's message: plain "incorrect" until the last try, then a warning, then the minutes left.
- Server contract: `docs/architecture/AUTHENTICATION_OIDC.md` §4a. The browser lock holds only in that browser.

**Correction:** Batch 455 said a password set on the Staff screen for Grace Liu (QA Reviewer only) would not sign her in. That was wrong: `profileForStaffSignIn` uses her built-in demo account's role first. Tested in `authSession.test.ts`. Only someone with no built-in account whose only role is QA Reviewer gets no app role.

Tests: `signInLockout.test.ts`, and the lockout block in `authSession.test.ts`.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 533

`signerConfirmation.ts`: signing action `cytology-preliminary` (an urgent cytology preliminary, when the laboratory requires the signature).

## Batch 547

The sign-in mode and providers come from the deployment's `config.json` at start-up (`appEnv()`, `services/runtimeConfig/`). Because of that, the demo accounts are loaded only in the demo build (`__DEMO_TOOLS__`), and a server build never has them. A server build must be set to `sso` (`SSO_REQUIRED`). *(Before, an `sso` build left them out by the build-time setting.)*

## Batch 550 (PS-539 phase 2d: exports through the server)

- `sessionEndHooks.ts` (new): things held in this window for the signed-in user that must go at sign-out (`onSessionEnd`, `runSessionEndHooks`). `authSession.endSession` calls them through the new `onSessionEnded` dependency; the export service registers its reset, so the next person at a shared workstation never sees the last one's export notices.

## Batch 611 (#157) — multi-factor sign-in (`mfa/`)

- **`mfa/totp.ts`**: RFC 6238 codes (HMAC-SHA1, 6 digits, 30 s, one step either side), base32, `verifyTotp` with replay rejection. Tests: `totp.test.ts` (the RFC vectors).
- **`mfa/mfaAssurance.ts`**: reads the provider's `amr` / `acr` claims. Test: `mfaAssurance.test.ts`.
- **`mfa/mfaPolicy.ts`**: the per-organisation policy (off / signing roles / everyone, step-up minutes, session hours) and the session stamp that belongs to one person in one organisation. Test: `mfaPolicy.test.ts`.
- **`mfa/mfaService.ts`**: policy save (needs `config:session-security:manage`), status at sign-in, Simulated enrolment with recovery codes (hashes only), challenge and step-up with lockout (5 failures, 15 minutes), single sign-on evaluation, session validity, reset (`auth:mfa-enrolment:reset`), audit with no codes or secrets. Test: `mfaService.test.ts`.
- **`mfa/mfaStores.ts`, `mfa/mfaInstance.ts`**: the browser stores (`ps_mfa_policy_v1`, `ps_mfa_enrolments_v1`, `ps_mfa_locks_v1`, cleared by Full Reset) and the app's instance.
- **Wired in:** `authSession.ts` (a single sign-on the provider did not back with a second factor is refused with `mfa_required`; a restored session whose second factor expired is dropped), `signerConfirmation.ts` (a signature asks for a fresh code, or for the provider's fresh proof; tests in `signerConfirmation.mfa.test.ts`), `sessionProfile.ts` (`mfa` stamp), `demo/demoAccounts.ts` (`demoMfaSecretFor`). Full account: `docs/architecture/MFA.md`.
