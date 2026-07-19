# services/communications/

Generic email/notification transport plus domain-specific notification builders.

**Pattern:** Barrel-exported (import from services/communications, not individual files).

## Files

- **`index.ts`** — Public API surface — sendEmail, resolveByRoles/resolveTemplateOwner/mergeRecipients, sendSynopticNotification.
- **`notificationService.ts`** — Generic transport.
- **`recipientResolver.ts`** — Role-based recipient resolution.
- **`synopticNotificationService.ts`** — Domain-specific: high-stakes synoptic audit event notifications.
- **`emailTemplates/`** — HTML/text email template builders.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*