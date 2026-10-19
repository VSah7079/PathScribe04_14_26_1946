// src/services/communications/templateLifecycleEvent.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 583 (PS-63, Pete and the dev team, Oct 15, 2026). A template lifecycle
// event (submitted, changes requested, approved, published, or a protocol sync
// event) is sent to the server as the event alone. The SERVER picks who gets the
// e-mail (rules below), writes it in each recipient's language, and sends it
// from no-reply@<host>. The browser no longer asks for staff e-mail lists
// (`GET /api/users?roles=`, which let any signed-in browser read every
// Admin's address) and no longer builds the e-mail text.
//
// Who receives each event (Pete, Oct 15), applied by the server:
//   - template.submitted_for_review → Template Approvers and Lab Directors
//   - template.needs_changes, template.approved, template.published
//                                   → everyone who saved the template
//   - sync.*                        → Admins
// The contract is docs/architecture/TEMPLATE_NOTIFICATIONS_API.md.
// ─────────────────────────────────────────────────────────────────────────────

import { NOTIFY_ON_ACTIONS, type SynopticAuditAction, type SynopticAuditEvent } from '../../types/SynopticAuditEvents';

export interface TemplateLifecycleEventPayload {
  action: SynopticAuditAction;
  templateId: string;
  templateName?: string;
  source?: SynopticAuditEvent['source'];
  version?: string;
  previousVersion?: string;
  /** The reviewer's reason on "changes requested". */
  note?: string;
  /** Display name for the e-mail text only; the server uses the signed-in caller, not this. */
  triggeredByName: string;
  occurredAt: string;
  /** The app's address, for the e-mail's link. A server with its own configured address ignores it. */
  appBaseUrl: string;
}

/** Whether this event sends an e-mail. */
export function isNotifiableTemplateEvent(action: SynopticAuditAction): boolean {
  return NOTIFY_ON_ACTIONS.includes(action);
}

/** The event as the server receives it, or null when the action sends no e-mail. */
export function buildTemplateLifecycleEventPayload(
  event: SynopticAuditEvent,
  context: { now: Date; appBaseUrl: string },
): TemplateLifecycleEventPayload | null {
  if (!isNotifiableTemplateEvent(event.action)) return null;
  const payload: TemplateLifecycleEventPayload = {
    action: event.action,
    templateId: event.templateId,
    triggeredByName: event.user,
    occurredAt: context.now.toISOString(),
    appBaseUrl: context.appBaseUrl,
  };
  if (event.templateName) payload.templateName = event.templateName;
  if (event.source) payload.source = event.source;
  if (event.version) payload.version = event.version;
  if (event.prevVersion) payload.previousVersion = event.prevVersion;
  if (event.note) payload.note = event.note;
  return payload;
}
