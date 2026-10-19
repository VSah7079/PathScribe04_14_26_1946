/**
 * services/communications/synopticNotificationService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Sends a synoptic template lifecycle event to the server, which chooses the
 * recipients and writes and sends the e-mail (Batch 583, PS-63; see
 * templateLifecycleEvent.ts and docs/architecture/TEMPLATE_NOTIFICATIONS_API.md).
 *
 * Usage (after every logEvent() call for a notifiable action):
 *   logEvent(event);
 *   await sendSynopticNotification(event);
 *
 * Or use the useSynopticAudit hook which wraps both calls together.
 * Fire-and-forget safe: never throws; resolves false when nothing was accepted.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { SynopticAuditEvent } from '../../types/SynopticAuditEvents';
import { postTemplateLifecycleEvent } from './notificationService';
import { buildTemplateLifecycleEventPayload } from './templateLifecycleEvent';

export async function sendSynopticNotification(
  event: SynopticAuditEvent,
  deps: { post: typeof postTemplateLifecycleEvent; now: () => Date; appBaseUrl: string } = {
    post: postTemplateLifecycleEvent, now: () => new Date(), appBaseUrl: window.location.origin,
  },
): Promise<boolean> {
  const payload = buildTemplateLifecycleEventPayload(event, { now: deps.now(), appBaseUrl: deps.appBaseUrl });
  if (!payload) return false;
  return deps.post(payload);
}
