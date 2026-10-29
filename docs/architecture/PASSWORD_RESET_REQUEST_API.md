# Password reset request ("Ask my administrator to reset my password")

Batch 711 (Pete, Oct 28, 2026: "Need a mechanism, when not SSO, to notify Admin to reset the Password").

## 1. Scope: demonstration only

- **SSO deployments do not use this.** A server build signs in through the customer's identity provider (`AUTHENTICATION_MODEL.md`, Batch 674). There is no PathScribe password, so no reset request: the sign-in page does not show the action, and the service answers `unavailable`. The identity provider owns password reset.
- **Password sign-in is demo only.** The action exists in the demo build (`__DEMO_TOOLS__` and `VITE_AUTH_MODE` not `sso`) so that demonstrations show a complete forgot-password path.
- The rest of this page is what a server version would need **if** a customer ever ran password sign-in against the API server. It is a contract, not a plan to build.

## 2. What the demo does (`src/services/staffPasswords/passwordResetRequestService.ts`)

1. `request(email)` from the sign-in screen, before anyone is signed in.
2. A repeat for the same email inside 10 minutes is dropped and answered the same way.
3. Audit `PASSWORD_RESET_REQUESTED` (literal English detail, no password involved).
4. If the email belongs to an active staff record (the staff email, or a built-in demo sign-in email), an **urgent internal message** goes to every other active staff member who holds `config:staff-password:manage`, naming the person and email, with `configLink` to `/configuration?tab=staff&section=members&staff=<id>` (Staff opens that record).
5. The caller always gets `accepted`, whether or not the email matched. Only a malformed address is refused (`invalidEmail`), which says nothing about accounts.
6. When an administrator sets the password (`IStaffPasswordService.set`), the open request is marked handled: a reply "Handled: a new sign-in password was set in Staff at <time>" joins each administrator's message thread, and audit `PASSWORD_RESET_REQUEST_HANDLED` is written.

## 3. Pre-sign-in by design

Nobody is signed in, so no capability can be enforced on `request`. This is deliberate. The action **exposes nothing**: it returns no data about any account (same answer for known, unknown, inactive and rate-limited emails), and its only effects are one message per administrator and one audit entry, both limited by the per-email rate limit. The protected steps stay protected: only holders of `config:staff-password:manage` are notified and only they can set the password. It is deliberately not in the capability catalog.

Known weaknesses of the demo: the known-email path does more work (sends messages) than the unknown one, so response timing differs slightly; a server must equalise it (queue the work and return at once). The rate limit is per email and kept in the browser, so it limits nothing against someone who clears storage or varies emails.

## 4. Server contract

| Item | Contract |
|---|---|
| Endpoint | `POST /api/auth/password-reset-requests/request` (anonymous). Body `{ "email": "..." }`. Always `202 Accepted` with an empty body for a well-formed address, whether or not it matches an account; `400` only for a malformed address. |
| Throttling | Per email (one per 10 minutes) **and** per source address and globally (for example 20 per hour per address). Keyed on the normalised email; answer a throttled call exactly like an accepted one. `429` only for the per-address limit, which reveals nothing about accounts. |
| Work | Do it after responding: look up the active staff record, find the active holders of `config:staff-password:manage` (same capability evaluation as `AUTHORIZATION_API.md`), send one urgent message to each through the messaging service (`FLAGS_AND_MESSAGES_API.md`), publish the live update to their inbox (SignalR), write the audit entry. |
| Audit | `PASSWORD_RESET_REQUESTED` (also for unknown emails, so administrators can see attempts), `PASSWORD_RESET_REQUEST_HANDLED`. Detail is literal English. Server-stamped time, source address recorded in the audit store. |
| Handled | The server sets the request handled in the same transaction that stores the new password, and updates or replies to the messages. A handled flag on the message and an "open requests" list for administrators are recommended. |
| Not exposed | No account existence, no staff id, no administrator names, no timing difference. |
| Email/SMS | Optional second channel for administrators who are not signed in; not built in the demo. |

## 5. Tests

`src/services/staffPasswords/passwordResetRequestService.test.ts`: unknown email stays neutral, rate limit, message to administrators (urgent, link, not to the requester or inactive staff), audit written, handled when an administrator sets the password, unavailable under SSO.
