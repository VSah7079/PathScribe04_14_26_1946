**Batch 617 (part R):** the server version(s) in this folder use the one route style `/api/<area>/<service>/<method-kebab>` (GET for plain-value reads, POST otherwise); earlier paths are in `docs/architecture/HTTP_ROUTE_MAPPING.md`.

# services/auditlog/

System-wide audit log — AI actions, user changes, system events.

**Pattern:** Standard interface/mock/firestore pattern.

## Notes

- **Signing-authority facility override events (Sep 2026)** — four new `type: 'user'` event names, written by `components/Config/System/ParticipationTypesSection.tsx` via `services/participationTypes/authorityProvenance.ts`'s `buildFacilityOverrideAuditEntry()`: `Signing-authority facility override added` / `changed` / `removed (reverted to inherited default)` / `justification updated`. Each sets `facilityId`, records the acting admin in `user`, and puts every changed flag (from → to) plus the admin's justification — or an explicit "Justification: none given" — in `detail`. Built for regulatory audits (NATA, RCPath, CPSO, MHW…) of any local override of a jurisdiction's signing-authority default. PHI-free by construction (configuration identifiers only).

- PHI-safe by design — AuditLog.detail is documented as containing no patient names, DOB, MRN, or clinical values.
- **`AuditLog.facilityId`** — added August 2026, per direct specification, building the Post-Sign-Out Release Buffer's own Phase 5 (audit-logging polish). A real, optional, additive field — genuinely absent for the many pre-existing audit calls across this app that don't populate it, not backfilled. See `services/reportRelease/README.md`'s own Phase 5 section for the full story, including two real, app-wide gaps found and fixed in `components/Audit/useAuditLog.ts` and `audit/auditLogger.ts` along the way (a hardcoded `caseId: null` that discarded every real caller's own case id, regardless of what they passed) — not scoped narrowly to this one new field, since the same fix pattern closes the gap for `caseId` too.

## Batch 432

`resolveError` needs `audit:error:resolve` and records `resolvedBy` and `resolvedAt`. Audit Log → Error Log has a Resolve button on open errors.

## Batch 499 — `auditLogLinks.ts`

Deep links into the Audit Log page. `FAILED_CHARGE_DISPATCHES_LINK` (`/audit?tab=financial&view=outbound_dlq`) is what the Quality Assurance page's "Failed Dispatches" tile opens; `financialAuditViewFromParams()` (pure, tested) reads `view=` for the Financial tab. The tile used to point at `/configuration?tab=system&section=outbound_charge_dlq`, a section that stopped existing when the charge dead-letter queue moved to Audit Log → Financial.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 589 — Unique ids (PS-344 / PS-477)

`auditIds.ts` `newAuditId('al' | 'el')` gives every audit and error entry a unique id (`crypto.randomUUID`, with a fallback). The old `'al-' + Date.now()` repeated for two entries in the same millisecond, which gave duplicate React keys. The server's database should also enforce uniqueness with a key.


Batch 616: server version in `httpAuditService.ts` (used when the deployment has an API server address; the demo keeps the mock). Chosen in `auditServiceInstance.ts`. Contract: `docs/architecture/STAFF_ADMIN_API.md`.

## Batch 651 — audit gaps closed

Event names now written (all `type: 'user'`, literal English, PHI-free: ids and counts, never names or free text; each written by the service that does the work, after the change succeeded, and never when it was refused):

| Event | Written by | Detail carries |
|---|---|---|
| `Pool case claimed`, `Pool case passed`, `Pool claim hold taken`, `Pool claim hold released` | `cases/poolCaseActions.ts` | case, facility, pool id; the hold is the 30-second claim lock (released = window closed or lapsed with no decision) |
| `Case delegated` | `delegations/delegationAudit.ts` via `mockDelegationService.delegate` | delegation type id, recipient kind and id, delegation id, whether a note was given (never the note) |
| `Case team changed` | `cases/saveCaseTeam.ts` / `caseTeamAudit.ts` | staff id and participation-type id of each slot added or removed |
| `Case comment added`, `Specimen comment added` | `cases/postCaseComment.ts` | comment id, length, specimen id; **the comment text is never written** |
| `Personal spelling dictionary word added` / `removed` | `spellcheck/mockCustomDictionaryService.ts` | length of the word only (the facility dictionary, an admin list, still records the word) |
| `Screen language changed` | `userSettings/personalLanguage.ts` | from and to language codes |
| `Deficiency raised`, `Deficiency escalated to CAPA`, `Deficiency contained`, `Deficiency effectiveness verified`, `Deficiency reopened as recurred` | `deficiencies/qaDeficiencyActions.ts` | deficiency, type and resolution-type ids, outcome, due date; never the comment, root cause or actions |

Voice-command and learned-voice-phrase audit are the voice engine's (Batch 650a). The general clinical audit log is still **not tamper-evident**: it is append-only by interface only (nothing in the app edits or deletes an entry), and server-side tamper-evidence (hash chain, write-once store) is Planned with the API server.

## Batch 670 — one write path
Every audit write, including `audit/auditLogger.ts` (behind `useAuditLog`), goes through `auditService` from `auditServiceInstance.ts`: the mock in the demo, the API server with an address. `httpAuditService.logEvent` sends `stationId` with the entry. A guard test fails on any direct `mockAuditService` import.

Batch 706 (Pete, Oct 28 2026, Provenance Over Confidence): demo error-log messages for AI suggestions below the review threshold no longer quote a percentage. The audit 'confidence' field stays (compliance data).
