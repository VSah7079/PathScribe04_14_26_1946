**Batch 617 (part R):** the server version(s) in this folder use the one route style `/api/<area>/<service>/<method-kebab>` (GET for plain-value reads, POST otherwise); earlier paths are in `docs/architecture/HTTP_ROUTE_MAPPING.md`.

# services/messages/

Internal secure messaging between staff.

**Pattern:** Standard interface/mock pattern (no firestore stub currently).

## Batch 385 (PS-359 follow-up)

- **Recipients:** `listRecipients()` returns who a message can go to (the mock returns the demo directory in `messageRecipients.ts`; it was hard-coded in `AppShell.tsx`). `searchRecipients` and `findRecipientByName` are the drawer's "To" search, now pure and tested.
- **Secure email:** `sendSecureEmail(input)` is the send the Secure email window used to simulate itself (a demo delay standing in for NHSMail). The real send is still open: PS-143 and PS-332.
- **Permissions:** `send`/`reply` (when `composedByPerson`) need `message:internal:send`; `sendSecureEmail` needs `message:secure-email:send`. A refusal returns the error `MESSAGE_NOT_PERMITTED`.
- Tests: `messageRecipients.test.ts`, `mockMessageService.test.ts`.

## Batch 396: message links

`linkableCaseAccessions.ts` (`selectLinkableAccessions`) drops, from the reader's accessible cases, those reached only through support access and the Orchestration or pediatric cases they can't open. The drawer used to link numbers from every case in every organisation (`caseService.getAll()`), which confirmed that cases existed (privacy model rule 4, `docs/architecture/CASE_PRIVACY_MODEL.md`).

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 517 — secure messages go through the lab's gateways (PS-143)

`sendSecureEmail` now takes `organisationId`, `gatewayId` and `containsPatientData`. After the `message:secure-email:send` check, it refuses with one of the problems from `secureMessaging/secureGatewayRules.ts`:
- `noGatewayConfigured`: the lab has no gateway set up;
- `gatewayNotAvailable`: the chosen gateway is not one of the lab's;
- `noAgreementForPatientData`: the message has patient data and the gateway has no BAA or data processing agreement in force.

Tests: `mockMessageService.test.ts`, including the case of one gateway covered and one not.

## Batch 526

Test files here no longer set their own time limit below the suite's 60 s (`vitest.config.ts`); on a busy Windows machine those shorter limits caused false timeouts.

## Batch 616 (part E) — server version

API-server version of `Message` (`httpMessageService.ts`, contract `FLAGS_AND_MESSAGES_API.md`), picked by `messageServiceInstance.ts` (and the others beside it) when an API address is configured; the mock stays the default in the demo. See `docs/architecture/HTTP_SERVICES_PATTERN.md`.
