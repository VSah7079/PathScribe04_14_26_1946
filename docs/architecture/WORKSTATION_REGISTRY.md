# Workstation registry: server contract (Batch 612)

The browser side is complete against `services/workstationRegistry` (browser storage). This is what the API server must do. The site agent program is the backend team's; the browser's token check is Simulated.

1. **Register.** Create a workstation (name unique per facility among active ones, facility, optional room, discipline, functional area, point of care, report and label printer ids). Generate 24 random bytes, token = `pswt_` + 48 lower-case hex characters. Return the token once. Store only its SHA-256 hex, the last four characters, issued and expiry time (365 days).
2. **Present.** The agent sends the token on each check-in. The server hashes it and compares with the current hash, or the previous hash while `previousValidUntil` has not passed. Answers: ok, unknown, revoked, expired. Record `lastSeenAt` on ok. Audit every refusal. Reject anything not matching the token shape before hashing.
3. **Rotate.** Issue a new token; keep the old hash as `previousTokenHash` valid for 24 hours so the agent can be updated without an outage. Return the new token once.
4. **Revoke.** Needs a reason (code and optional note). Immediate and final: clears the previous hash, keeps the record. A revoked workstation accepts nothing.
5. **Print routing.** The registered id is the workstation tier of the routing rules; its facility and point of care come from the binding. A revoked workstation contributes nothing.
6. **Audit.** Registered, Changed, Token Rotated, Revoked, Check-In Refused. No token, hash or PHI in any entry.
7. **Permissions.** `config:workstations:manage` for register and change; `config:workstation-tokens:manage` for rotate, revoke and check-in.
