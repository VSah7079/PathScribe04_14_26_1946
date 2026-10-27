# Authentication model: server deployments are single sign-on only (Batch 674)

**Decision (Pete, Oct 25, 2026; resolves dev note access-13).** A server deployment signs people in through the customer's identity provider (OAuth 2.0 / OpenID Connect) and nothing else. Email-and-password sign-in, the staff sign-in password, the demo accounts and the simulated authenticator belong to the **demo build only**. PathScribe does not store passwords in a server deployment.

The code already worked this way. What disagreed was documentation: `services/staffPasswords/README.md` described password sign-in "at a site without single sign-on" with the hash stored by the API server in SQL Server. That text is corrected in this batch. If a customer without single sign-on appears, treat it as a new requirement and a new design (set, clear, verify, change at sign-in, reset, expiry, lockout, audit), not as something half-built.

## What enforces it (verified Oct 25)

| Rule | Where |
|---|---|
| A server build must have an API address and `VITE_AUTH_MODE=sso`, or it reports `SSO_REQUIRED` and does not start | `services/runtimeConfig/runtimeSettings.ts`, `buildRuleProblems` |
| Demo accounts and the browser password check are loaded only in the demo build, and only when the mode is not `sso` | `services/auth/authSessionInstance.ts` |
| The Staff screen shows "This site signs in with single sign-on, so passwords are managed by your organisation's identity provider" instead of the password controls | `components/Config/Staff/StaffSignInPassword.tsx` |
| A person the policy asks to use a second factor, who is not on single sign-on, is told it is unavailable and cannot sign in | `services/auth/mfa/mfaInstance.ts`, `docs/architecture/MFA.md` |

## Second factor (the TOTP question)

Already decided in Batch 611 (#157), now stated plainly: **in a server deployment the identity provider owns the second factor.** PathScribe does not run its own.

- The browser reads the ID token's `amr` and `acr` claims (`mfaAssurance.ts`) and refuses to create a session when the organisation's policy requires MFA and the token does not assert it. The API server repeats the check on the bearer token (`MFA.md`, "What the API server must do").
- At a signature (sign-out, finalisation) after the step-up time, the browser sends the person back to the provider for a fresh sign-in whose token must again assert MFA.
- The TOTP code (`totp.ts`), the Simulated authenticator and the recovery-code flow exist for **demo password accounts only**. A server build has no secret and no simulated factor.

**Gap closed in Batch 675 (access-14) on the browser side; the server routes still have to be built** (contract: `ACCESS_SESSION_API.md` §5). The text below is the gap as it stood.

**The gap.** The organisation's MFA policy (required or not, step-up minutes), the enrolments and the failed-code counts are held through `browserMfaStores`, which keeps them in memory on a server deployment. So in a live deployment the policy a Lab Director sets on Session Security would not survive a reload, and the server would have no policy to enforce. `MFA.md` lists "hold the policy per organisation" as a server obligation, but there is no server version of the policy store and no contract section for it. Needed: a contract for `get-policy` / `save-policy` per organisation (capability `config:session-security:manage`), and an HTTP version of the store. Enrolments and lock counts are demo-only and can stay out of a server build.

## Identity providers

Say only what has been tested. The code reads standard OIDC claims, and `MFA.md` gives provider notes for Microsoft Entra ID (Conditional Access), Okta (authentication policy) and Keycloak (`acr` and `amr` mappers). Ping, Auth0 and NHS Identity appear in the dev note as examples; none is documented here as validated.

## Documents changed or still to change

| Document | State |
|---|---|
| `services/staffPasswords/README.md` | Corrected (this batch): demo only |
| `docs/architecture/SERVER_DECIDES.md` | Corrected (this batch) |
| `docs/user-guide/src/sign-in/index.md` | Added a note that live installations use single sign-on only (this batch) |
| Admin Guide (`docs/admin-guide/src/*.md`, six languages) | **Not changed.** The sign-in and Staff password text needs the same note in all six languages, with the parity check at zero. Proposed wording is in the Batch 674 entry of `GUIDE_UPDATES.md`. |
| `docs/architecture/MFA.md` | Pointer to this document added |
