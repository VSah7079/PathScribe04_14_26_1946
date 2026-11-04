# services/communications/

Generic email/notification transport plus domain-specific notification builders.

**Pattern:** Barrel-exported (import from services/communications, not individual files).

## Files

- **`index.ts`** — Public API surface — sendEmail, postTemplateLifecycleEvent, sendSynopticNotification, buildTemplateLifecycleEventPayload.
- **`notificationService.ts`** — Generic transport: `sendEmail` and (Batch 583) `postTemplateLifecycleEvent`.
- **`templateLifecycleEvent.ts`** — Batch 583: which template events send an e-mail and the event payload the server receives.
- **`synopticNotificationService.ts`** — Sends a template lifecycle event to the server (the server picks the recipients and writes the e-mail).
- **`emailTemplates/`** — Enhancement-request email builders.

## Notes

- **Real, new consumer (PS-287, Sep 2026):** `sendEmail()` (transport-only, unchanged) is now also how the spec's own "Pathologist Notification Loop" is sent — since Batch 403 from `services/addOnOrders/addOnOrderActions.ts`'s `flagAddOnException`, with `useAddOnOrderStation.ts` passing `sendEmail` in *(corrected in the Batch 496 README audit)* — a real, fire-and-forget alert to the ordering pathologist when a tech flags a block-exhaustion exception. No domain-specific builder file added here (unlike `synopticNotificationService.ts`) since the subject/body are simple enough to build inline; worth promoting to its own builder if a second real caller ever needs the same shape.


## Batch 364 (PS-349, PS-350): support references

`emailTemplates/enhancementEmailTemplates.ts`: support ticket emails show the page type and the case's support reference, never the case number.

## Batch 493 — email attachments (PS-359 follow-up: Tumor Board calendar invites)

`types.ts`'s `EmailPayload` gains an optional `attachments?: EmailAttachment[]` (`{ filename, contentType, contentBase64 }`), passed through `sendEmail()`'s transport unchanged. First real caller: `services/tumorBoard/notifyTumorBoardAssignment.ts`, attaching a `.ics` calendar invite (built by `services/tumorBoard/buildTumorBoardInviteIcs.ts`) when a presenter is assigned to a future-dated Tumor Board meeting. No PHI in the attachment — see `services/tumorBoard/README.md`'s own Batch 493 entry for why.

**Verify-don't-trust correction:** Batch 492's own disclosed-gap note (in the top-level READMEs, not this file) claimed no messaging/notification system existed yet in this app. That was wrong — this folder and `services/messages/` both already existed and were already in real use elsewhere. Corrected everywhere that claim was made.

## Batch 583 (PS-63): template e-mails are the server's job

`recipientResolver.ts` and `emailTemplates/synopticEmailTemplates.ts` are deleted. The browser used to ask the server for staff e-mail lists (any signed-in browser could read every Admin's address; it also asked for a "clinical_lead" role PathScribe doesn't have) and wrote the e-mail text in English. Now it sends only the event (`POST /api/notifications/template-events`); the server chooses recipients, writes each e-mail in the recipient's language and sends it. Contract and the English wording to start from: [`docs/architecture/TEMPLATE_NOTIFICATIONS_API.md`](../../../docs/architecture/TEMPLATE_NOTIFICATIONS_API.md). `sendSynopticNotification` now resolves `true` only when the server accepted the event.

## Batch 604: Simulated mail outbox

`simulatedMailOutbox.ts` keeps, in the browser, each message the server would have sent when there is no mail service: `sendEmail()` and `postTemplateLifecycleEvent()` fall back to it when the request cannot connect or the server answers 404, 405, 501, 502, 503 or 504, and resolve true. A real refusal (for example 403) is still false. Every record carries `simulated: true`; a toast and an audit entry (no subject or address, which can name a patient) are written. `sendEmailDetailed()` also says whether the message was simulated. Read it in Configuration, System, Simulated mail outbox. With the API server running this file is simply not used.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*