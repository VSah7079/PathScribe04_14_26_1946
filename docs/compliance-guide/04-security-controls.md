# 4. Security controls

## Authentication

| Control | What PathScribe does | Status |
|---|---|---|
| Single sign-on | Server deployments sign in only through the organisation's identity provider (`VITE_AUTH_MODE=sso`; a server build refuses to start otherwise). Microsoft Entra ID and generic OpenID Connect providers (Okta, Keycloak) are built; setup notes exist for Entra ID, Okta and Keycloak only. Ping, Auth0 and NHS Identity are **not validated**. Google sign-in is not offered. | Live (browser) |
| Passwords | PathScribe stores none on a server deployment. Passwords, resets and lockout are the identity provider's. Demo accounts and the Staff screen's password exist in the demonstration only. | Live |
| Multi-factor | The identity provider asks for the second factor; its token says so (`amr` / `acr`). PathScribe refuses sign-in when the organisation's policy requires MFA and the token does not report it. The policy (nobody, signing roles, everyone; signature step-up minutes; session hours) is set under Session Security. The simulated authenticator and recovery codes are demo only. | Browser side built; the server must hold the policy and repeat the claim check (contract written, routes not built) |
| Step-up at signature | A signature needs a second factor no older than the policy allows; with single sign-on the person is sent back to the provider for a fresh sign-in. | Built |
| Fail closed | If the policy cannot be read, sign-in is refused; it is never treated as "no policy". | Built |
| Group-to-role mapping, account sync | Roles are assigned in PathScribe. Directory sync (SCIM) and group mapping are not available. | **Planned** (after first release) |
| Biometric confirmation | Optional device (WebAuthn) confirmation, off by deployment switch. | Live |

## Session controls

Idle sign-out with a warning window, organisation default with a per-lab override; only one active session per person (a second sign-in asks before taking over); unsaved work is kept for review after a timeout or takeover. Source: Session Security and the User Guide sign-in article. Status: Built (Demo); server-held sessions follow the identity provider's tokens, not a separate session store.

## Audit logging

Sign-in and sign-out, case actions, pool claims, hand-offs, comments, quality deficiency actions, configuration changes, AI calls, voice commands, MFA policy changes and secure-email sends are written through one audit service. Entries hold identifiers only, never comment text or free text, and are literal English. Gaps stated plainly:

- The clinical audit log is **not tamper-evident**. It is append-only by interface only (the app never edits or deletes an entry). Hash chain or write-once storage comes with the API server (**Planned**).
- In a server deployment the audit entry for a protected action must be written by the server in the same transaction as the change. This rule is specified (`SERVER_DECIDES.md`); the server routes are **not built**.
- Voice commands and some timeouts are audited from the browser only.

## Data protection

- With an API server, patient data is never written to browser storage; old copies are cleared at start-up (Live for server installations).
- Identifiers on screen are tagged for redaction in support screenshots.
- Encryption in transit and at rest, backups and disaster recovery are properties of the hosting platform and the SQL Server deployment, not of the browser application (**Customer / Host**, see chapter 8). A cloud-agnostic package and installation qualification checklist are **Planned**.
- AI calls go through the server's AI proxy; no vendor key is in the browser; vendor and region can be restricted by jurisdiction.

## Permission management

Every protected action has a named capability in a catalogue (domain:object:verb), checked in the service that does the work, with no administrator override, Superadmin included. Superadmin is reserved for ForMedrixAI support staff and cannot be assigned by a hospital. Built-in roles follow least privilege. Source: `AUTHORIZATION_API.md`. Status: Built (Demo); the server must repeat every check.
