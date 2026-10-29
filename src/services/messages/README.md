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

## Batch 669f — unread is per person, a reply keeps the preview (everyday-1, everyday-3)

- `messageUnread.ts`: `isUnreadFor(message, userId)` and `lastWriterId`. A message holds one shared read flag, so who it is unread for is decided by who wrote last: the writer of the latest thread entry never has it unread; the other participant does until they open it. The inbox badge (`contexts/MessagingContext.tsx`) and the list rows (`components/AppShell/AppShell.tsx`) use it, so a person's own sent messages and replies no longer count.
- `mockMessageService.reply` no longer overwrites the message `body` (the list preview keeps the opening text) and sets `isRead` back to false. Reviewer refinements: unread is decided ONLY through `isUnreadFor(message, currentUserId)` (the SQL Server per-recipient version changes only its inside; per-recipient state needs the server messages table, never browser storage); `messageUnread.guard.test.ts` fails if a component, context, hook or page reads `.isRead`. `compareMessageListOrder` / `lastActivityTime` sort the list by the thread's latest message (a reply moves it to the top); `canMarkUnread(message, userId)` is false when you wrote last, and the menu item is greyed with a tooltip. Tests: `messageUnread.test.ts`, `mockMessageService.test.ts`, `components/AppShell/messageListRow.test.tsx`.
- Not done: the flag is still one per message, not one per participant (a real per-recipient read state needs the SQL Server messages table, see `FLAGS_AND_MESSAGES_API.md`); a reply does not move the conversation up the list (sorted by the first message's time).

Batch 706 (Pete, Oct 28 2026, Provenance Over Confidence): the demo low-confidence message names the field and the missing source, not a percentage.
