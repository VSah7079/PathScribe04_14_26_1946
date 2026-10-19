# ACCESS_SESSION_API.md: access requests, session time-out and biometric sign

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

Batch 616 (PS-512). The browser side is `services/access/httpAccessRequestService.ts`, `session/httpSessionTimeoutService.ts` and `biometric/httpBiometricService.ts`. Rules for every call (token is the caller, fixed error codes, `{ "items": [...] }` lists, `204` for nothing to return, no patient data) are those of `STAFF_ADMIN_API.md` §0.

## 1. Access to a patient's other cases (`IAccessRequestService`)

The workflow is the one in `PATIENT_CASE_ACCESS` (Batch 613): a pathologist asks, the assigned pathologist or an admin grants, it stays open until revoked.

| Method | Call | Permission |
|---|---|---|
| `getPending()` | `GET /api/access-requests?status=pending` | the assigned pathologist or an admin sees their own queue |
| `getAllForUser(userId)` | `GET /api/access/access-request/get-all-for-user` | the user themselves, or an admin |
| `getAll()` | `GET /api/access-requests` | `patient:other-cases:decide-access` (the admin view of every request) |
| `create(request)` | `POST /api/access/access-request/create` | `patient:other-cases:request-access`; the requester is the token's user |
| `grant(id, ...)` | `POST /api/access/access-request/grant` | the case's assigned pathologist or an admin with `patient:other-cases:decide-access`; never the requester |
| `deny(id, ..., reason)` | `POST /api/access/access-request/deny` with `{ reason }` | as grant |
| `revoke(id, ..., reason)` | `POST /api/access/access-request/revoke` with `{ reason }` | as grant, or the admin |

**The browser sends the reason only.** The interface carries the resolver's id and name for the mock; with a server those are ignored and the server uses the token's user, so a request cannot be resolved "as" someone else. Every grant, denial and revoke is audited. A grant notifies the requester through the message bus (`MESSAGE_BUS_API.md`).

## 2. Session time-out (`ISessionTimeoutService`)

| Method | Call | Reply | Permission |
|---|---|---|---|
| `getOrgDefault()` | `GET /api/session/session-timeout/get-org-default` | `{ "minutes": 15 }` | any signed-in user |
| `setOrgDefault(minutes)` | `POST /api/session/session-timeout/set-org-default` with `{ minutes }` | `204` | `config:session-security:manage`; out-of-range is `INVALID` |
| `resolveEffectiveMinutes(facilityId?)` | `GET /api/settings/session-timeout/effective?facilityId=` | `{ "minutes": 10 }` | any signed-in user; the server applies the facility override |

The idle timer itself stays in the browser (a sign-out after the minutes); the server also ends a session whose token has expired, so a browser that is closed or frozen cannot keep it open.

## 3. Biometric sign (`IBiometricService`)

This replaces the Firestore plan in `firestoreBiometricService.ts`. The device (WebAuthn) holds the private key; the server holds the public key and decides.

| Method | Call | Reply |
|---|---|---|
| `getPolicy()` | `GET /api/biometric/biometric/get-policy` | the policy (`enabled`, cadence) |
| `savePolicy(policy)` | `POST /api/biometric/biometric/save-policy` | the saved policy; `config:session-security:manage` |
| `getCredential(userId)` | `GET /api/users/{userId}/biometric/credential` | the credential record (no key material); `404` = none enrolled, treated as a successful "none" |
| `getEnrolmentChallenge(userId, userName)` | `POST .../enrolment-challenge` with `{ userName }` | a random challenge, valid 5 minutes |
| `completeEnrolment(userId, attestation, deviceName)` | `POST .../enrolment` with `{ attestation, deviceName }` | the credential record; the server checks the attestation against the challenge |
| `revokeCredential(userId)` | `DELETE .../credential` | `204`; the user, or an admin with `auth:mfa-enrolment:reset` |
| `getVerificationChallenge(userId)` | `POST .../verification-challenge` | a challenge |
| `completeVerification(userId, assertion)` | `POST .../verification` with `{ assertion }` | `{ "verified": true }` |
| `isBiometricCurrentForUser(userId)` | `GET .../current` | `{ "current": true }` |
| `shouldShowWizard(userId)` | `GET .../wizard` | `{ "show": true }` |
| `dismissWizard(userId)` | `POST .../wizard/dismiss` | `204` |

(`...` is `/api/users/{userId}/biometric`.) Only the caller can enrol or verify their own device. The browser never stores an attestation, assertion or key.

**Not wired yet:** the screens still call the browser-side functions in `biometric/mockBiometricService.ts` directly (the sign-in flow takes them as plain functions), so a server build does not yet choose this service. The server version is built and tested; moving the screens onto `IBiometricService` is the follow-up.

## 3a. How the browser uses the biometric calls (Batch 616 part F, PS-512)

Screens and the sign-in flow use `biometricFlow` (`IBiometricFlow`), never the mock. With an API server it is `serverBiometricFlow.ts` over the calls in section 3:

- **Enrol:** `getEnrolmentChallenge` → the device (WebAuthn `create`, platform authenticator, user verification required, the server's `rpId`, challenge and time-out) → `completeEnrolment` with the attestation (`id`, `rawId`, `clientDataJSON`, `attestationObject`, base64url) and the device name. The browser asks for attestation `none`; tell the browser team if the server needs `direct`.
- **Verify:** `getVerificationChallenge` → the device (`get`, allowing only the credential id the server named) → `completeVerification` with the assertion (`clientDataJSON`, `authenticatorData`, `signature`, optional `userHandle`). `{ verified: false }` is treated as a refusal (`DECLINED`).
- **No simulated fallback.** A browser without WebAuthn gets `UNAVAILABLE`; at sign-out the person confirms with their password. A cancelled prompt is `DECLINED`.
- The sign-in flow asks `shouldShowWizard` after sign-in (so the invitation to enrol follows the server's policy and the person's enrolment).
- Nothing is kept in browser storage in a server deployment.
