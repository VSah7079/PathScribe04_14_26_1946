/**
 * services/communications/notificationService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Generic email dispatcher. Transport-only — no domain knowledge.
 * All domain-specific subjects, bodies, and recipient logic lives in the
 * feature-specific services (synopticNotificationService, etc.)
 *
 * Any feature in pathscribe that needs to send email imports sendEmail()
 * from here. The backend routes POST /api/notifications/email to
 * SendGrid / SES / SMTP per system config.
 *
 * Batch 604: with no mail service (cannot connect, or 404/405/501/502/503/504) the
 * message is kept in the Simulated mail outbox (simulatedMailOutbox.ts) and the
 * call resolves true; a real refusal from a real server is still false.
 *
 * Batch 493: EmailPayload.attachments (e.g. a Tumor Board meeting's .ics
 * calendar invite, base64) passes through this transport unchanged — no
 * logic here cares about an attachment's content, only the backend
 * endpoint does.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { EmailPayload } from './types';
import type { TemplateLifecycleEventPayload } from './templateLifecycleEvent';
import { isNoMailServerStatus, recordSimulatedEmail, recordSimulatedTemplateEvent } from './simulatedMailOutbox';

const API_BASE = '/api';

/** fetch rejects with a TypeError when it cannot connect (no server, offline). */
const isConnectionFailure = (err: unknown): boolean => err instanceof TypeError;

/**
 * Dispatches an email via the pathscribe notification endpoint.
 * Fire-and-forget safe — logs errors but never throws.
 * Batch 454: resolves true only when the endpoint accepted the message, so a
 * caller that records a send (the follow-up clinician email) can tell. The
 * fire-and-forget callers ignore it, as before.
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  return (await sendEmailDetailed(payload)).accepted;
}

/** Batch 604: like sendEmail, and says whether the message went to the Simulated outbox instead of a mail service. */
export async function sendEmailDetailed(payload: EmailPayload): Promise<{ accepted: boolean; simulated: boolean }> {
  const yes = { accepted: true, simulated: false }, simulated = { accepted: true, simulated: true }, no = { accepted: false, simulated: false };
  try {
    if (payload.to.length === 0) {
      console.warn('[NotificationService] No recipients — email skipped');
      return no;
    }

    const res = await fetch(`${API_BASE}/notifications/email`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      // Batch 604: no mail service here (demo): keep the message in the labelled Simulated outbox.
      if (isNoMailServerStatus(res.status)) { recordSimulatedEmail(payload); return simulated; }
      console.error('[NotificationService] Dispatch failed:', res.status, await res.text());
      return no;
    }
    console.info(`[NotificationService] "${payload.subject}" → ${payload.to.length} recipient(s)`);
    return yes;
  } catch (err) {
    // Batch 604: the request could not connect at all (no server): simulated, never lost.
    if (isConnectionFailure(err)) { recordSimulatedEmail(payload); return simulated; }
    console.error('[NotificationService] Unexpected error:', err);
    return no;
  }
}

/**
 * Batch 583 (PS-63): sends a template lifecycle event; the server chooses the
 * recipients and writes the e-mail. Resolves true only when the server accepted
 * it. Never throws.
 */
export async function postTemplateLifecycleEvent(payload: TemplateLifecycleEventPayload): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/notifications/template-events`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    if (!res.ok) {
      if (isNoMailServerStatus(res.status)) { recordSimulatedTemplateEvent(payload); return true; }
      console.error('[NotificationService] Template event refused:', res.status);
      return false;
    }
    return true;
  } catch (err) {
    if (isConnectionFailure(err)) { recordSimulatedTemplateEvent(payload); return true; }
    console.error('[NotificationService] Template event failed:', err);
    return false;
  }
}
