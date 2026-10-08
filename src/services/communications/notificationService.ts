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
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { EmailPayload } from './types';

const API_BASE = '/api';

/**
 * Dispatches an email via the pathscribe notification endpoint.
 * Fire-and-forget safe — logs errors but never throws.
 * Batch 454: resolves true only when the endpoint accepted the message, so a
 * caller that records a send (the follow-up clinician email) can tell. The
 * fire-and-forget callers ignore it, as before.
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  try {
    if (payload.to.length === 0) {
      console.warn('[NotificationService] No recipients — email skipped');
      return false;
    }

    const res = await fetch(`${API_BASE}/notifications/email`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error('[NotificationService] Dispatch failed:', res.status, await res.text());
      return false;
    }
    console.info(`[NotificationService] "${payload.subject}" → ${payload.to.length} recipient(s)`);
    return true;
  } catch (err) {
    console.error('[NotificationService] Unexpected error:', err);
    return false;
  }
}
