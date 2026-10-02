# Case privacy model

Decided by Pete Nimmo, Sep 29, 2026. Built in Batch 396. These rules apply to every feature that names, links to, or opens a case: messaging, consults, search, delegation, and whatever comes next.

## The rules

1. **The sender can open the case.** When a staff member the sender picks can't open the case, the sender may be told so by name: "Dr. X does not have access to Case S25-4412." An access request may be offered.
2. **The sender can't open the case.** The sender is told only "The selected staff member does not have access rights." Any access request reads "An access request will be sent to the case's administrator if the case exists." Nothing confirms that the case exists.
3. **A typed accession number proves nothing.** Knowing or guessing a number doesn't count as knowing that the case exists. The answer is the same however the number arrived: typed, pasted, linked or bookmarked.
4. **Auto-linking must not leak existence.** A message turns a number into a link only when the reader can open that case. Opening a case the reader can't see shows the same neutral message as a case that doesn't exist.

Pete declined the staff-access UI and the send-time recipient check (rules 1 and 2 on the compose screen) as rare and not worth the effort. So today those two rules constrain any future work that tells a sender about a recipient's access.

## Where it's enforced

| Rule | Where | What |
|---|---|---|
| 3, 4 | `src/services/cases/openCaseForView.ts` | The one decision for `/report/:caseId` and `/synoptic/:caseId`. A missing case, another organisation's case, a pool restriction, an Orchestration or pediatric restriction, and an error all return `{ caseData: null }`. |
| 3, 4 | `src/components/CaseUnavailable/` | The one screen for all of them: "You do not have access rights to case …". |
| 4 | `CaseRouter.listLinkableAccessions()` and `src/services/messages/linkableCaseAccessions.ts` | The numbers a message may link: only cases the reader can open. A superadmin gets only their own organisation's cases here. Support reaches another organisation's case deliberately, through the support access gate, never from a message link. |
| — | `src/contexts/MessagingContext.tsx`, `AppShell.tsx` | The inbox belongs to whoever is signed in now. It's cleared on sign-out or account switch, and a reply for an earlier account is dropped. |

The real reason a case is unavailable is written to the support log (`openCaseForView` → `logUnavailable`) and to the case audit (`CaseRouter.getCase`), never to the screen.

**Enforced by** `src/services/privacy/casePrivacy.guard.test.ts`.

## For the API server

The server must give the same answer for "no such case" and "you may not see it", for example `404` for both, with no difference in body, headers or timing that a client could tell apart. Link candidates for a message are computed for the reader, never for the sender.
