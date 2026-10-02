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
