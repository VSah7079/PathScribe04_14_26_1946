/**
 * hooks/useSynopticAudit.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps logEvent() + sendSynopticNotification() into a single hook so
 * TemplateRenderer and SynopticEditor don't need to call both separately.
 *
 * Drop-in path: src/hooks/useSynopticAudit.ts
<<<<<<< HEAD
 *
 * Usage in TemplateRenderer.tsx — replace existing logEvent calls:
 *
 *   // Before
 *   logEvent({ user: DEFAULT_USER, category: 'user', action: 'state_transition',
 *              templateId: template.id, stateFrom: prev, stateTo: confirmAction.target });
 *
 *   // After
 *   const { auditAndNotify, auditOnly } = useSynopticAudit();
 *
 *   await auditAndNotify({                       // logs + emails
 *     category:     'user',
 *     action:       'template.approved',
 *     templateId:   template.id,
 *     templateName: template.name,
 *     stateFrom:    'in_review',
 *     stateTo:      'approved',
 *     note:         confirmNote,
 *   });
 *
 *   auditOnly({                                  // logs only — no email
 *     category:  'user',
 *     action:    'template.field_updated',
 *     templateId: template.id,
 *     fieldId:   field.id,
 *     oldValue:  oldLabel,
 *     newValue:  newLabel,
 *   });
 *
 * The hook resolves the current user from AuthContext automatically,
 * matching how TemplateRenderer uses DEFAULT_USER today. Once AuthContext
 * returns a real user object, replace DEFAULT_USER references with this hook.
=======
>>>>>>> upstream/main
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback } from 'react';
import { logEvent } from '../audit/auditLogger';
<<<<<<< HEAD
import { SynopticAuditEvent } from '../types/SynopticAuditEvents';
import { sendSynopticNotification } from '../services/synopticNotificationService';
=======
import type { AuditEvent } from '../types/AuditEvent';
import { SynopticAuditEvent } from '../types/SynopticAuditEvents';
import { sendSynopticNotification } from '../services/communications';
>>>>>>> upstream/main

// Omit user — hook resolves it. Callers can override by passing user explicitly.
type AuditInput = Omit<SynopticAuditEvent, 'user'> & { user?: string };

<<<<<<< HEAD
=======
// logEvent() expects Omit<AuditEvent, 'id' | 'timestamp'> which requires
// 'detail: string'. SynopticAuditEvent has 'detail?: string'. This adapter
// always provides a non-empty detail string derived from the event.
type LogEventInput = Omit<AuditEvent, 'id' | 'timestamp'>;

function toLogEvent(event: SynopticAuditEvent): LogEventInput {
  const detail: string = event.detail
    ?? (event.templateName
      ? `${event.action} — ${event.templateName}`
      : event.action);
  return { ...event, detail } as LogEventInput;
}

>>>>>>> upstream/main
// Fallback until AuthContext provides a real user — matches TemplateRenderer pattern
const DEFAULT_USER = 'Dr. Reviewer';

export function useSynopticAudit() {

  /**
   * auditAndNotify — use for lifecycle transitions and sync events.
   * Writes to audit log AND sends email if action is in NOTIFY_ON_ACTIONS.
   */
  const auditAndNotify = useCallback(async (input: AuditInput): Promise<void> => {
    const event: SynopticAuditEvent = {
      ...input,
      user: input.user ?? DEFAULT_USER,
    };

<<<<<<< HEAD
    // 1. Audit log — existing infrastructure, same as TemplateRenderer
    logEvent(event);

    // 2. Email notification — fire-and-forget, never blocks UI
    try {
      await sendSynopticNotification(event);
=======
    // 1. Audit log — bridge to existing AuditEvent shape
    logEvent(toLogEvent(event));

    // 2. Email notification — fire-and-forget, never blocks UI
    try {
      await sendSynopticNotification(event as any);
>>>>>>> upstream/main
    } catch (err) {
      console.error('[useSynopticAudit] Notification failed silently:', err);
    }
  }, []);

  /**
   * auditOnly — use for high-frequency editor actions (field edits, coding).
   * Writes to audit log only. No email sent.
   */
  const auditOnly = useCallback((input: AuditInput): void => {
<<<<<<< HEAD
    logEvent({
      ...input,
      user: input.user ?? DEFAULT_USER,
    });
=======
    const event: SynopticAuditEvent = {
      ...input,
      user: input.user ?? DEFAULT_USER,
    };
    logEvent(toLogEvent(event));
>>>>>>> upstream/main
  }, []);

  return { auditAndNotify, auditOnly };
}
