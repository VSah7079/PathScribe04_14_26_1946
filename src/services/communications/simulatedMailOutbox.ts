// src/services/communications/simulatedMailOutbox.ts
// ─────────────────────────────────────────────────
// Batch 604: the demo stand-in for the server mail service. When there is no
// API server (the request cannot connect, or the server answers "not found",
// "not allowed", "not implemented" or "unavailable"), the message the server
// would have sent is kept here instead, clearly labelled Simulated, and an
// audit entry is written. Nothing leaves the browser. A real refusal from a
// real server (for example 400 or 403) is NOT simulated.
// The server contract is docs/architecture/TEMPLATE_NOTIFICATIONS_API.md and
// POST /api/notifications/email; with a server, this file is simply not used.
// ─────────────────────────────────────────────────
import { storageGet, storageSet } from '../mockStorage';
import { mockAuditService as auditService } from '../auditlog/mockAuditService';
import i18n from 'i18next';
import { toast } from 'react-toastify';
import type { EmailPayload } from './types';
import type { TemplateLifecycleEventPayload } from './templateLifecycleEvent';

export const SIMULATED_MAIL_STORAGE_KEY = 'simulatedMailOutbox';
export const SIMULATED_MAIL_LIMIT = 200;
/** What the server would do with recipients for a template lifecycle event. */
export const SERVER_CHOOSES_RECIPIENTS = '(chosen by the server)';

export type SimulatedMailKind = 'email' | 'template-event';

export interface SimulatedEmail {
  id: string;
  kind: SimulatedMailKind;
  /** Always true; carried on the record so no export can drop the label. */
  simulated: true;
  recordedAt: string;
  to: string[];
  cc: string[];
  subject: string;
  bodyText: string;
  bodyHtml: string;
  attachmentNames: string[];
  metadata: Record<string, string>;
}

/** Statuses that mean "there is no mail service here", as opposed to a real refusal. */
const NO_SERVER_STATUSES = new Set([404, 405, 501, 502, 503, 504]);
export const isNoMailServerStatus = (status: number): boolean => NO_SERVER_STATUSES.has(status);

let _cache: SimulatedEmail[] = storageGet<SimulatedEmail[]>(SIMULATED_MAIL_STORAGE_KEY, []);
const persist = () => storageSet(SIMULATED_MAIL_STORAGE_KEY, _cache);
let _seq = 0;
const newId = () => `sim-mail-${Date.now().toString(36)}-${(_seq++).toString(36)}`;

const listeners = new Set<() => void>();
export function subscribeSimulatedMail(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn); }; }
const notify = () => listeners.forEach(fn => fn());

function add(entry: Omit<SimulatedEmail, 'id' | 'simulated' | 'recordedAt'>, user: string): SimulatedEmail {
  const record: SimulatedEmail = { ...entry, id: newId(), simulated: true, recordedAt: new Date().toISOString() };
  _cache = [record, ..._cache].slice(0, SIMULATED_MAIL_LIMIT);
  persist();
  notify();
  // Visible notice (react-toastify is app-wide); skipped outside a browser.
  if (typeof window !== 'undefined') {
    try { toast.info(i18n.t('simulatedMail.toast')); } catch { /* no toast host */ }
  }
  auditService.logEvent({
    type: 'system', event: 'Simulated E-mail Recorded',
    // No subject or address in the audit detail: a subject can name a patient.
    detail: `SIMULATED (no mail service): ${record.kind === 'email' ? 'e-mail' : 'template event e-mail'} to ${record.to.length || 'server-chosen'} recipient(s)${record.metadata.source ? ` from ${record.metadata.source}` : ''}. Nothing was sent.`,
    user, caseId: null, confidence: null,
  }).catch(() => {});
  return record;
}

/** Keeps an e-mail the demo would have sent. */
export function recordSimulatedEmail(payload: EmailPayload, user = 'system'): SimulatedEmail {
  return add({
    kind: 'email', to: [...payload.to], cc: [...(payload.cc ?? [])], subject: payload.subject,
    bodyText: payload.bodyText, bodyHtml: payload.bodyHtml,
    attachmentNames: (payload.attachments ?? []).map(a => a.filename), metadata: { ...(payload.metadata ?? {}) },
  }, user);
}

/** Keeps the e-mail a template lifecycle event would have caused. */
export function recordSimulatedTemplateEvent(payload: TemplateLifecycleEventPayload): SimulatedEmail {
  const name = payload.templateName || payload.templateId;
  const lines = [
    `Template "${name}": ${payload.action}${payload.version ? ` (version ${payload.version})` : ''}.`,
    `By ${payload.triggeredByName} at ${payload.occurredAt}.`,
    ...(payload.note ? [`Reviewer note: ${payload.note}`] : []),
    `Open: ${payload.appBaseUrl}`,
  ];
  return add({
    kind: 'template-event', to: [], cc: [], subject: `Template ${payload.action}: ${name}`,
    bodyText: lines.join('\n'), bodyHtml: lines.map(l => `<p>${l.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`).join(''),
    attachmentNames: [], metadata: { action: payload.action, templateId: payload.templateId },
  }, payload.triggeredByName);
}

export function listSimulatedEmails(): readonly SimulatedEmail[] { return _cache; }

export function clearSimulatedEmails(user = 'system'): void {
  const n = _cache.length;
  _cache = [];
  persist();
  notify();
  auditService.logEvent({
    type: 'system', event: 'Simulated Mail Outbox Cleared', detail: `${n} simulated e-mail${n === 1 ? '' : 's'} removed from the demo outbox.`,
    user, caseId: null, confidence: null,
  }).catch(() => {});
}

/** Test seam: forgets everything without writing an audit entry. */
export function resetSimulatedMailForTests(): void { _cache = []; persist(); }
