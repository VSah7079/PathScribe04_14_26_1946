

> **Batch 711: "Ask my administrator to reset my password"** (Pete: "Need a mechanism, when not SSO, to notify Admin to reset the Password"). `passwordResetRequestService.ts` (interface, logic, factory with injected services), `mockPasswordResetRequestService.ts` (demo wiring), `passwordResetRequestRules.ts` (pure: email shape, 10-minute per-email window, Staff record link) and `passwordSignInAvailable.ts` (demo password sign-in only). `request(email)` runs before sign-in: audits `PASSWORD_RESET_REQUESTED`, sends an urgent message to every other active staff member holding `config:staff-password:manage`, and answers the same whether or not the email matches (no account enumeration). `set()` here calls `markHandled`, which replies "Handled" on each message and audits `PASSWORD_RESET_REQUEST_HANDLED`. Pre-sign-in by design, no capability checked, exposes nothing. Not built: a handled flag on the message, an open-requests list in Staff, email/SMS to administrators, server rate limiting. See `docs/architecture/PASSWORD_RESET_REQUEST_API.md`. Tests: `passwordResetRequestService.test.ts`.

# services/staffPasswords

> **Batch 674: demo only.** Staff passwords exist in the **demo build**. A server deployment signs in through the customer's identity provider (single sign-on) and has **no password store and no password service**: `runtimeSettings.ts` refuses a server build that is not `VITE_AUTH_MODE=sso`, and the Staff screen then shows that passwords are managed by the identity provider. The statements below about "a site without single sign-on" and about the API server storing hashes in SQL Server were plans that are no longer the design; read them as describing the demo. See `docs/architecture/AUTHENTICATION_MODEL.md`.

## Batch 448: passwords set from the Staff screen

Pete: "In most cases I've simply defined the password in the Staff configurations." Now PathScribe does too, in the demo build, where it signs people in with a password. A site on single sign-on signs in at the hospital's identity provider, and the Staff screen says so.

- **`staffPasswordRules.ts`** (pure, tested):
  - `passwordPolicyProblem`: 12 to 128 characters, not blank, not the person's email. Length over composition rules, per NIST SP 800-63B.
  - `passwordConfirmProblem`: the two entries must match.
  - `staffPasswordState`: what the Staff screen shows (own / own-must-change / built-in demo default / none).
- **`mockStaffPasswordService.ts`** (tested):
  - `set` and `clear` need `config:staff-password:manage` (Admin).
  - The password is hashed with PBKDF2-SHA256 (600,000 iterations, a fresh salt) and stored only as the hash.
  - Changes are audited (`STAFF_PASSWORD_SET`, `STAFF_PASSWORD_CLEARED`). The audit says who set it and whether a change is required, never the password.
  - `verify(email, password)` gives `match` / `wrong` / `none`. Only `none` (no password set here) lets sign-in fall back to the built-in demo accounts; once one is set here, the built-in one stops working for that account.
  - `changeAtSignIn`: the person's own change when they must choose a new password; they prove the current one first.
- **Storage:** this build keeps the hashes in browser storage, so a password set here works in that browser, and Full Reset returns to the built-in demo passwords. In production there is no password store: sign-in is the identity provider's (Batch 674).

## Batch 456 — Sign-in lockout, password screening, demo seeds

**Password screening** (Pete: "a common/breached-password block"), `passwordScreening.ts`. After the length rules, a new password set on the Staff screen or chosen at sign-in is refused when it is:
- `predictable`: one short pattern repeated, or a straight run (`abcabcabcabc`, `123456789012`);
- `contextWord`: contains PathScribe, ForMedrixAI, the person's email or the part before the @;
- `common`: on `commonPasswords.txt` (the UK NCSC's 100,000 most-used passwords from breach data, lower-cased: the top 20,000 of 8+ characters and every entry of 12+; 9,365 entries), or is one once digits and symbols are trimmed from its ends. Loaded only when a password is set;
- `breached`: in Have I Been Pwned's Pwned Passwords. Only the first 5 characters of the SHA-1 hash are sent (range search, with padding). If the service can't be reached, the save goes ahead and the audit says only the local checks ran. `VITE_PWNED_CHECK=off` turns it off; the tests run with it off (`vitest.config.ts`).

`createMockStaffPasswordService({ screening, signInLocks })` takes both as dependencies. Setting a password from the Staff screen also clears any sign-in lock on the person's emails (staff email and built-in demo account email), noted in the audit.

The Staff screen and the change-at-sign-in form show the new errors in all five languages, and both hints mention the rules.

Tests: `passwordScreening.test.ts` and the Batch 456 block in `mockStaffPasswordService.test.ts`.

## Batch 526

Test files here no longer set their own time limit below the suite's 60 s (`vitest.config.ts`); on a busy Windows machine those shorter limits caused false timeouts.

## Batch 547

Password sign-in, and the demo accounts it falls back to, exist only in the demo build (`__DEMO_TOOLS__`). A server build signs in by SSO only.
