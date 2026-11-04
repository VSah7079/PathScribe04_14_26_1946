# Wall display access (Display Token device binding)

**Batch 603.** Covers the two public wall-display routes: `/facility-ops-dashboard` (Facility Ops) and `/or-suite-dashboard` (OR Suite board).

**Status.** Browser side: Built (Demo), in `src/services/displayAccess/`, `src/hooks/useDisplayBinding.ts`, `src/components/Common/DisplayTokenPrompt.tsx`. API server side: **Planned**. No server exists in this repository, so the 401 behaviour below is a specification, not running code.

## Why a token (and not a MAC address)

A browser cannot read its computer's MAC address or hardware ID. Binding is therefore to an administrator-issued secret, provisioned to the display once.

## Token

- 32 random bytes from a cryptographically secure source, base64url, prefixed `psd_`.
- Long-lived and revocable. Administrator chooses validity (30, 90, 180, 365 or 730 days; default 365).
- Only the SHA-256 hash is stored, with the last four characters as a hint. The token is shown once, at issue.
- One token per display. Issuing again replaces it; the old token stops working immediately.
- Issue and revoke need `config:display-profiles:manage` (Facility Ops) or `config:or-suite-terminals:manage` (OR Suite). Both are high-risk and audited.

## Registry record

`kind` (`facility-ops` | `or-suite`), `subjectId` (display profile or terminal id), `tokenHash`, `tokenHint`, `issuedAt`, `expiresAt`, `revokedAt?`.

## Server check (Planned)

Every request from a wall display, including the SignalR hub connection, carries the token in `X-Display-Token: <token>` or `Authorization: Bearer <token>`. The server hashes it, finds the record for the display, and answers:

| Condition | Response |
|---|---|
| No header, unknown token, or token for another display | 401 `display_token_invalid` |
| `revokedAt` set | 401 `display_token_revoked` |
| `expiresAt` in the past | 401 `display_token_expired` |
| Otherwise | 200 |

Compare hashes in constant time. Never log the token. Display endpoints return only the masked payloads below, whatever the caller asks for.

## Client behaviour (Built, Demo)

- Binding needs a token the registry accepts. Choosing a display from the list is not enough.
- The bound display re-checks every 60 seconds and whenever the window regains focus. On revoked, expired, unknown or invalid it **blanks**: no facility name, no cases, no patients. An "Enter a new token" button lets an administrator re-provision it.
- The token is kept in this computer's workstation settings (`pathscribe_display_token_<kind>`).

## Payload masking (required of the server)

- **Facility Ops:** aggregate counts, queues by accession or case reference, turnaround, alerts. **No patient identifiers of any kind.**
- **OR Suite:** no patient name and no MRN, full or partial. Each row is identified by the surgical case ID (`orNumber`) and the room. Built in the browser (`maskForWallDisplay`); the server must not send name or MRN to display callers at all. Dismissal re-display shows the case ID, room and diagnosis only.

## Not covered

Physical-hardware attestation (a MAC or TPM check) and mutual TLS are not part of this design. If a customer requires them, that is a separate decision.
