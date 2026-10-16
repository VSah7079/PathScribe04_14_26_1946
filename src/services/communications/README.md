# services/communications/

Generic email/notification transport plus domain-specific notification builders.

**Pattern:** Barrel-exported (import from services/communications, not individual files).

## Files

- **`index.ts`** — Public API surface — sendEmail, resolveByRoles/resolveTemplateOwner/mergeRecipients, sendSynopticNotification.
- **`notificationService.ts`** — Generic transport.
- **`recipientResolver.ts`** — Role-based recipient resolution.
- **`synopticNotificationService.ts`** — Domain-specific: high-stakes synoptic audit event notifications.
- **`emailTemplates/`** — HTML/text email template builders.

## Notes

- **Real, new consumer (PS-287, Sep 2026):** `sendEmail()` (transport-only, unchanged) is now also how the spec's own "Pathologist Notification Loop" is sent — since Batch 403 from `services/addOnOrders/addOnOrderActions.ts`'s `flagAddOnException`, with `useAddOnOrderStation.ts` passing `sendEmail` in *(corrected in the Batch 496 README audit)* — a real, fire-and-forget alert to the ordering pathologist when a tech flags a block-exhaustion exception. No domain-specific builder file added here (unlike `synopticNotificationService.ts`) since the subject/body are simple enough to build inline; worth promoting to its own builder if a second real caller ever needs the same shape.


## Batch 364 (PS-349, PS-350): support references

`emailTemplates/enhancementEmailTemplates.ts`: support ticket emails show the page type and the case's support reference, never the case number.

## Batch 493 — email attachments (PS-359 follow-up: Tumor Board calendar invites)

`types.ts`'s `EmailPayload` gains an optional `attachments?: EmailAttachment[]` (`{ filename, contentType, contentBase64 }`), passed through `sendEmail()`'s transport unchanged. First real caller: `services/tumorBoard/notifyTumorBoardAssignment.ts`, attaching a `.ics` calendar invite (built by `services/tumorBoard/buildTumorBoardInviteIcs.ts`) when a presenter is assigned to a future-dated Tumor Board meeting. No PHI in the attachment — see `services/tumorBoard/README.md`'s own Batch 493 entry for why.

**Verify-don't-trust correction:** Batch 492's own disclosed-gap note (in the top-level READMEs, not this file) claimed no messaging/notification system existed yet in this app. That was wrong — this folder and `services/messages/` both already existed and were already in real use elsewhere. Corrected everywhere that claim was made.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*