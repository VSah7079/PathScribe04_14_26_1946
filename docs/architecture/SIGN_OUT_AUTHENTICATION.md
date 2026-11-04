# Sign-out authentication policy (Batch 642)

**Status: Built (Demo) in the browser. The API server repeats every rule below; remote sign-out restriction and workstation lock are phase 2e and mandatory there.**

How a person proves who they are when signing a case out, set by an administrator per performing facility.

## The policy

| Setting | Values |
|---|---|
| Mode | `strict`: password at every sign-out (default). `session`: password once, then none until the session ends |
| Session length (session mode) | 15, 30, 60 or 240 minutes |
| Second factor at sign-out | on / off. Asked after the password; a failed or missing second factor blocks the sign-out |
| Enterprise default | one per enterprise |
| Facility override | per performing facility; shown clearly as an override |
| Override lock | an enterprise administrator can lock overrides: they are kept but not used |

A case follows the policy of its **performing** facility (the ordering facility's `performingLabFacilityId`, or itself when it is a performing lab). With no facility the enterprise default applies.

Governed actions: `case-sign-out`, `countersign`, `cytology-sign-out`.

## The sign-out session

Session mode only. Started by a successful authentication (password, single sign-on re-authentication or biometric, plus the second factor when asked). It is for one person, one role and one facility, and ends on:

| Reason | How |
|---|---|
| timeout | older than the policy's session length |
| logout | the sign-in ends (session end hook) |
| privilege elevation | the person's role differs from the one authenticated |
| workstation lock | **phase 2e**: the server or a trusted-device signal calls `expireSession(..., 'workstation_lock')` |

Switching the policy to strict stops reuse at once. Each expiry is audited once with its reason.

## What the browser sends and the server must check

A sign-out inside a session carries a confirmation with `sessionReuse.sessionId` and no fresh proof. **The server must** (1) find that session for the signed-in user, (2) check it is within the current policy's length, the same facility and role, (3) refuse it when the facility's policy is strict, and (4) treat a missing or expired session as a request for fresh authentication. For a policy that asks for a second factor the server checks the second factor's stamp, and for single sign-on the `amr`/`acr` claims (see `MFA.md`). The browser checks are a convenience, not the control.

## Remote sign-out restriction (phase 2e, mandatory with the server)

A facility can allow or forbid sign-out from outside its trusted networks. The browser cannot tell a network from another, so the **server classifies the client address** against the facility's trusted ranges, returns the classification with the request context, refuses the sign-out when it is outside and remote sign-out is off, and audits each attempt. The Sign Out button is unavailable outside trusted networks when remote sign-out is disabled. Until then the audit records the network as "not classified (browser build)".

## Audit

Every change to the policy: who, when, old value, new value (enterprise, each facility override, the lock). Every authentication, in-session sign-out and expiry carries: user, facility, enterprise policy, facility override (and whether the lock ignored it), session id, authentication method (password, single sign-on, biometric, plus second factor), time, case id, a device hint (a hash of browser properties; the server records the real device) and the network classification.

## Regulatory note

21 CFR Part 11 (11.200(a)(1)) expects, for signings after the first in one continuous session, at least one credential component. Session mode with no prompt departs from that, so strict stays the default and the card warns. The customer's quality system decides.

## Not built

Remote sign-out restriction, workstation lock, SMS and hardware-key second factors (the existing authenticator app and the provider's second factor are used), a server-side policy store.
