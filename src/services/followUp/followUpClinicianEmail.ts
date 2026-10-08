// src/services/followUp/followUpClinicianEmail.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 454 (Pete, Oct 4): "I don't think the ordering physician should be
// automatically notified ... Maybe we can create a mechanism for the user to
// invite a email to the Ordering Clinician?"
//
// So nothing here runs on its own. A lab user with qa:follow-up-clinician:email
// opens a follow-up that is due soon or overdue and chooses "Email ordering
// clinician":
//   1. draftFollowUpClinicianEmail fills the lab's template (or the built-in
//      wording) with the accession, the window and the clinician's name. The
//      address comes from the physician directory (order.orderingPhysicianId).
//   2. The user reads and edits it; nothing is sent until they press Send.
//   3. emailOrderingClinician checks the capability, that the facility has
//      the action turned on, the address, and that no placeholder is left;
//      sends it; and, only when the mail service accepted it, notes the
//      contact on the follow-up and audits it (a refusal is audited too).
// The template has no patient-name or diagnosis placeholder: the minimum
// needed is the accession and the request.
// ─────────────────────────────────────────────────────────────────────────────

import type { EffectiveFollowUpSettings } from './followUpSettings';
import { MAX_FOLLOW_UP_EMAIL_BODY, MAX_FOLLOW_UP_EMAIL_SUBJECT, type FollowUpEmailPlaceholder } from './followUpSettings';
import type { FollowUpActionDeps, FollowUpActionResult, FollowUpUser } from './followUpActions';
import { emptyFollowUpRecord, type FollowUpItem, type FollowUpRecord } from './followUpTypes';

export interface FollowUpClinician {
  namePrefix?: string;
  givenNames?: string;
  familyNames?: string;
  email?: string;
}

export interface FollowUpEmailDraft {
  to: string;
  subject: string;
  body: string;
  clinicianName: string;
}

/** Fills {{placeholder}}s; anything not given is left as it is (and Send refuses it). */
export function fillFollowUpTemplate(template: string, vars: Partial<Record<FollowUpEmailPlaceholder, string>>): string {
  return template.replace(/\{\{\s*([^{}\s]+)\s*\}\}/g, (whole, name: string) => (vars as Record<string, string | undefined>)[name] ?? whole);
}

export const clinicianDisplayName = (c: FollowUpClinician | null | undefined, fallback?: string): string =>
  [c?.namePrefix, c?.givenNames, c?.familyNames].filter(Boolean).join(' ').trim() || fallback?.trim() || '';

/** Whether the action is offered for this follow-up at all. */
export function canOfferClinicianEmail(item: Pick<FollowUpItem, 'status'>, settings: Pick<EffectiveFollowUpSettings, 'clinicianEmailEnabled'>): boolean {
  return settings.clinicianEmailEnabled && (item.status === 'dueSoon' || item.status === 'overdue');
}

/** The email as first shown to the user. */
export function draftFollowUpClinicianEmail(input: {
  item: Pick<FollowUpItem, 'accession' | 'window' | 'dueAt' | 'requestingProvider'>;
  clinician: FollowUpClinician | null;
  settings: Pick<EffectiveFollowUpSettings, 'emailSubject' | 'emailBody'>;
  /** The built-in wording in the user's language (the same placeholders). */
  defaults: { subject: string; body: string };
  labName: string;
  senderName: string;
  formatDate: (iso: string) => string;
}): FollowUpEmailDraft {
  const clinicianName = clinicianDisplayName(input.clinician, input.item.requestingProvider);
  const vars: Record<FollowUpEmailPlaceholder, string> = {
    accession: input.item.accession,
    windowStart: input.formatDate(input.item.window.startsAt),
    dueDate: input.formatDate(input.item.dueAt),
    clinicianName,
    labName: input.labName,
    senderName: input.senderName,
  };
  return {
    to: input.clinician?.email?.trim() ?? '',
    subject: fillFollowUpTemplate(input.settings.emailSubject.trim() || input.defaults.subject, vars),
    body: fillFollowUpTemplate(input.settings.emailBody.trim() || input.defaults.body, vars),
    clinicianName,
  };
}

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/** The first problem with an email about to be sent, or null. */
export function clinicianEmailProblem(draft: Pick<FollowUpEmailDraft, 'to' | 'subject' | 'body'>): string | null {
  if (!EMAIL.test(draft.to.trim())) return 'invalidEmail';
  if (!draft.subject.trim() || !draft.body.trim()) return 'emptyMessage';
  if (draft.subject.length > MAX_FOLLOW_UP_EMAIL_SUBJECT || draft.body.length > MAX_FOLLOW_UP_EMAIL_BODY) return 'tooLong';
  if (/\{\{[^{}]*\}\}/.test(`${draft.subject} ${draft.body}`)) return 'unfilledPlaceholder';
  return null;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));

export interface ClinicianEmailDeps extends FollowUpActionDeps {
  /** True only when the mail service accepted the message. */
  sendEmail: (payload: { to: string[]; subject: string; bodyHtml: string; bodyText: string; metadata?: Record<string, string> }) => Promise<boolean>;
  getSettings: (facilityId: string | undefined) => Promise<Pick<EffectiveFollowUpSettings, 'clinicianEmailEnabled'>>;
}

/** Sends the reviewed email and notes it on the follow-up. */
export async function emailOrderingClinician(
  input: { item: FollowUpItem; to: string; subject: string; body: string; user: FollowUpUser },
  deps: ClinicianEmailDeps,
): Promise<FollowUpActionResult<FollowUpRecord>> {
  const { item, user } = input;
  const decision = await deps.enforce('qa:follow-up-clinician:email', { caseId: item.caseId, facilityId: item.facilityId ?? null });
  if (!decision.allowed) return { ok: false, reason: 'notPermitted' };
  const settings = await deps.getSettings(item.facilityId);
  if (!settings.clinicianEmailEnabled) return { ok: false, reason: 'disabled' };
  if (item.status !== 'dueSoon' && item.status !== 'overdue') return { ok: false, reason: 'notOpen' };
  const problem = clinicianEmailProblem(input);
  if (problem) return { ok: false, reason: problem };

  const to = input.to.trim();
  const accepted = await deps.sendEmail({
    to: [to],
    subject: input.subject.trim(),
    bodyText: input.body,
    bodyHtml: escapeHtml(input.body).replace(/\r?\n/g, '<br>'),
    metadata: { kind: 'follow-up-request', caseId: item.caseId, followUpKey: item.key },
  });
  // Recorded and audited as sent only when the mail service took it.
  if (!accepted) {
    await deps.logAudit({
      type: 'user', event: 'followup.clinician_email_failed',
      detail: `Follow-up request to the ordering clinician at ${to} was not accepted by the mail service`,
      user: user.id, caseId: item.accession, confidence: null, facilityId: item.facilityId ?? null,
    }).catch(() => undefined);
    return { ok: false, reason: 'sendFailed' };
  }
  const sentAt = deps.now().toISOString();
  const current = (await deps.store.getRecords()).find(r => r.key === item.key) ?? emptyFollowUpRecord(item.key);
  const record: FollowUpRecord = { ...current, clinicianContacts: [...current.clinicianContacts, { sentAt, sentBy: user.id, sentByName: user.name, to }] };
  await deps.store.saveRecord(record);
  await deps.logAudit({
    type: 'user', event: 'followup.clinician_emailed',
    detail: `Follow-up request emailed to the ordering clinician at ${to} (${item.kind}, ${item.status})`,
    user: user.id, caseId: item.accession, confidence: null, facilityId: item.facilityId ?? null,
  }).catch(() => undefined);
  return { ok: true, data: record };
}
