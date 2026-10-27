# Multi-factor sign-in (#157, Batch 611)

> Batch 674: server deployments are single sign-on only and the identity provider owns the second factor; see `AUTHENTICATION_MODEL.md` (its one open gap, the server-held MFA policy, has a contract and browser side since Batch 675: `ACCESS_SESSION_API.md` §5; the server routes are not built).

**Status: Built (Demo).** The browser side is built and tested end to end. The second factor for real people is the hospital identity provider's (Microsoft Entra ID, Okta, Keycloak and so on): PathScribe reads from the provider's ID token that it was used, and refuses the sign-in when the organisation requires it and the token does not say so. The demo accounts get a **Simulated** authenticator so the whole flow can be shown. The API server must repeat the checks on the token it trusts (below).

## What the people see

| Who | What happens |
|---|---|
| Hospital staff, single sign-on | The identity provider asks for the second factor as part of its own sign-in. PathScribe checks the ID token's `amr` / `acr` claims. If the organisation requires MFA and the token does not assert it, the sign-in is refused with a plain message ("Your organisation requires a second factor, and the sign-in service did not report one…"). |
| Demo accounts, password | After the password, if the policy asks for it: **first time**, a screen shows the Simulated secret (to add to any authenticator app), takes the first code, then shows eight recovery codes once; **afterwards**, a code (or a recovery code) is asked for. A "Show demo code (Simulated)" button shows the code, so no phone is needed in a demonstration. Everything is labelled Simulated. |
| Anyone, at a signature (case sign-out, finalisation) | When the last second factor is older than the policy's step-up time (default 30 minutes), the signature asks for a fresh code (password sessions) or sends the person back to the provider for a fresh sign-in whose token must again assert MFA (single sign-on). |
| An administrator | Configuration → System → Session Security → *Second factor*: who is asked (no one / the roles that sign reports / everyone), the step-up minutes, the session hours, and the list of people enrolled in the Simulated authenticator with **Reset enrolment** (a lost device). |

## The policy

Per organisation (the tenant boundary), saved with `config:session-security:manage`, audited.

| Setting | Values | Default |
|---|---|---|
| Who is asked | `off`, `signing_roles` (Pathologist, Pathologist-Admin), `all` | `off` |
| Fresh code at a signature after | 1 to 720 minutes | 30 |
| Second factor expires and the session ends after | 1 to 72 hours | 12 |

## How the provider's second factor is read

`services/auth/mfa/mfaAssurance.ts`. MFA is accepted when any of these holds:

1. `amr` contains `mfa` (Microsoft Entra ID sends `["pwd","mfa"]`).
2. `amr` names methods from at least two different families: knowledge (`pwd`, `pin`, `kba`), possession (`otp`, `hwk`, `swk`, `sc`, `sms`, `tel`), inherence (`face`, `fpt`, `iris`, `retina`, `vbm`). A password alone, or two passwords, is not MFA. Okta sends `["pwd","otp","mfa"]`.
3. `acr` names a multi-factor class (contains `multi-factor`, `multifactor`, `mfa`, `2fa` or `two-factor`, or is `phr` / `phrh`).

A provider that sends none of these must be configured to (Entra: a Conditional Access policy that requires MFA; Okta: an authentication policy with a possession factor; Keycloak: map the authentication level to `acr` and add an `amr` mapper). At a signature the browser asks for a fresh sign-in (`prompt=login`, `max_age=0`); the provider must again assert MFA in that token.

## Acceptance criteria and the tests that prove them

| # | Criterion | Tests |
|---|---|---|
| 1 | A sign-in is refused, with a clear message, when the organisation requires MFA and the provider did not report it | `authSession.test.ts` › multi-factor sign-in (refuses…; accepts… asserts MFA; asks nothing when not required); `mfaService.test.ts` › identity provider sign-in; `mfaAssurance.test.ts` |
| 2 | Demo accounts have a labelled Simulated second factor: enrolment with a secret and recovery codes, challenge, demo code | `mfaService.test.ts` › enrolment, challenge at sign-in, recovery codes, demo helper; `MfaSignInStep.test.tsx` (Simulated label, enrolment, recovery codes shown once, demo code) |
| 3 | A challenge at sign-in, and a step-up before a signature | `AuthContext.mfa.test.tsx` (no session until verified; enrolment finishes after the recovery codes); `signerConfirmation.mfa.test.ts` (code asked first; wrong password does not spend the code; stamp renews the window; biometric does not stand in; single sign-on needs the claim); `SignerConfirmationFields.mfa.test.tsx` |
| 4 | Invalid, replayed and expired codes are rejected | `totp.test.ts` (RFC 6238 vectors, window, replay, malformed); `mfaService.test.ts` › challenge at sign-in |
| 5 | Lockout after repeated failures (5 failures, 15 minutes; nothing is checked while locked) | `mfaService.test.ts` › locks after five failed codes…; `signerConfirmation.mfa.test.ts` › five wrong codes lock it |
| 6 | Session expiry clears the second-factor state: a restored session whose second factor is older than the policy is dropped and the provider signed out | `authSession.test.ts` › a restored session whose second factor has expired…; `mfaService.test.ts` › session expiry; sign-out clears the stamp with the session profile (`endSession`) and Full Reset clears the policy, enrolments and locks (`demoReset.ts`, `DemoResetTab.coverage.test.ts`) |
| 7 | One organisation's second-factor state never satisfies another's | `mfaPolicy.test.ts` › stamps; `mfaService.test.ts` › another organisation's stamp…, organisations are separate |
| 8 | Audit events exist and never contain secrets or codes | `mfaService.test.ts` › the audit trail holds no secret and no code (enrolled, challenge passed / rejected, locked, refused, recovery code used, step-up passed / refused, policy changed, sign-in refused, enrolment reset) |
| 9 | The reset is a protected action in its own capability | `capabilities.guard.test.ts`, `authorization.test.ts`, `capabilityDocs.guard.test.ts` (`auth:mfa-enrolment:reset`); `mfaService.test.ts` › reset |
| 10 | The policy is saved only by someone allowed | `mfaService.test.ts` › policy; `MfaPolicyCard.test.tsx` |

## What is Simulated

- The **authenticator**: a standard time-based one-time code (RFC 6238: HMAC-SHA1, 6 digits, 30-second steps, one step either side accepted) checked in the browser against a documented demo secret derived from the seed `pathscribe-demo-mfa-v1` and the staff id (`demoAccounts.ts`). It is in the demo build only (`__DEMO_TOOLS__`); a server build has no secret and no simulated factor, so a person the policy asks for MFA who is not using single sign-on is told it is unavailable and cannot sign in.
- The **storage**: enrolments (time of enrolment, last step used, SHA-256 hashes of unused recovery codes), the policy and the failed-code counts are kept in the browser's demo data (`ps_mfa_*`), by organisation. Nothing secret is stored.
- The **recovery codes**: shown once at enrolment, ten characters in two groups, stored only as hashes, each good once.

## What the API server must do instead (production)

1. **Verify the ID token** (signature, issuer, audience, expiry) as it already must, then apply the same `amr` / `acr` rule above to the verified claims. The browser's check is a courtesy, not the control.
2. **Hold the policy per organisation** and refuse to create a session for a person the policy covers when the token does not assert MFA.
3. **Hold the session and its second-factor time on the server** (the session cookie), expire it after `sessionMaxHours`, and refuse a signing request whose proof (the fresh ID token from the re-authentication, already sent with signatures) is older than `stepUpMinutes` or does not assert MFA.
4. **Record** the audit events listed above, with the same wording rules (no codes, no secrets).
5. **Offer reset** to administrators of the same organisation only, with `auth:mfa-enrolment:reset`.
6. **For password sign-in in a real deployment** (outside single sign-on), enrol with a server-generated secret kept encrypted server-side; the browser demo's secret derivation must not be used.

## Files

`src/services/auth/mfa/`: `totp.ts`, `mfaAssurance.ts`, `mfaPolicy.ts`, `mfaService.ts`, `mfaStores.ts`, `mfaInstance.ts`. Wiring: `authSession.ts` (single sign-on gate and session expiry), `signerConfirmation.ts` (step-up), `AuthContext.tsx` and `LoginPage.tsx` (the sign-in step), `useSignerConfirmation.ts` and `SignerConfirmationFields.tsx` (the signature field), `MfaPolicyCard.tsx` (Session Security).
