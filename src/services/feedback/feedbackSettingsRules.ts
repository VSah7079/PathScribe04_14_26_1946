// src/services/feedback/feedbackSettingsRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 447: the QA feedback button is a Configuration setting, not a build
// setting (VITE_QA_ENABLED, VITE_QA_EMAIL, VITE_QA_ADMIN_CC are gone).
// Configuration → System → Feedback. Pure.
//   • qaButton: 'default' follows the instance: shown on a validation
//     instance, hidden in production (services/deployment/deploymentInstance).
//     'on' / 'off' override that.
//   • qaRecipients / qaAdminCc: where QA feedback is emailed.
//   • validationRecipients: where QA feedback in the 'AI / Template validation' category is emailed
//     (empty: the QA recipients get it, and the sender is told).
//   • enhancementUrl: where enhancement requests are delivered (the website's address). Empty
//     means the deployment's own default (VITE_ENHANCEMENT_REQUEST_URL in config.json), and
//     with neither, enhancement requests are emailed as before. No address is written in code.
// ─────────────────────────────────────────────────────────────────────────────

import type { InstanceRole } from '../deployment/deploymentInstance';

export const QA_BUTTON_MODES = ['default', 'on', 'off'] as const;
export type QaButtonMode = (typeof QA_BUTTON_MODES)[number];

export interface FeedbackSettings {
  qaButton: QaButtonMode;
  qaRecipients: string[];
  qaAdminCc: string[];
  validationRecipients: string[];
  enhancementUrl: string;
}

export const DEFAULT_FEEDBACK_SETTINGS: FeedbackSettings = { qaButton: 'default', qaRecipients: [], qaAdminCc: [], validationRecipients: [], enhancementUrl: '' };

/** Whether the top bar shows the QA feedback button. */
export function qaButtonShown(settings: FeedbackSettings, role: InstanceRole): boolean {
  if (settings.qaButton === 'on') return true;
  if (settings.qaButton === 'off') return false;
  return role === 'validation';
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Splits a typed list ("a@x.org, b@y.org") into addresses, dropping blanks and repeats. */
export function parseEmailList(text: string): string[] {
  return [...new Set(text.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean))];
}

export type FeedbackSettingsProblem = 'invalidRecipient' | 'invalidCc' | 'invalidValidationRecipient' | 'invalidEnhancementUrl' | 'invalidMode' | 'noRecipients';

/**
 * What is wrong with a destination address, or null: https only (plain http is refused, even to
 * this computer, because the request leaves the building), no user name or password in it, and no
 * fragment. A query string is allowed (a form id). Pure.
 */
export function enhancementUrlProblem(value: string): 'invalidEnhancementUrl' | null {
  if (!value) return null;
  let u: URL;
  try { u = new URL(value); } catch { return 'invalidEnhancementUrl'; }
  if (u.protocol !== 'https:' || u.username || u.password || u.hash || !u.hostname.includes('.')) return 'invalidEnhancementUrl';
  return null;
}

/** The first reason these settings can't be saved, or null. */
export function feedbackSettingsProblem(s: FeedbackSettings, role: InstanceRole): FeedbackSettingsProblem | null {
  if (!QA_BUTTON_MODES.includes(s.qaButton)) return 'invalidMode';
  if (s.qaRecipients.some(e => !EMAIL.test(e))) return 'invalidRecipient';
  if (s.qaAdminCc.some(e => !EMAIL.test(e))) return 'invalidCc';
  if ((s.validationRecipients ?? []).some(e => !EMAIL.test(e))) return 'invalidValidationRecipient';
  const urlProblem = enhancementUrlProblem(s.enhancementUrl ?? '');
  if (urlProblem) return urlProblem;
  if (qaButtonShown(s, role) && s.qaRecipients.length === 0) return 'noRecipients';
  return null;
}

/** English audit text for a change, or null when nothing changed. */
export function feedbackSettingsChange(before: FeedbackSettings, after: FeedbackSettings): string | null {
  const parts: string[] = [];
  if (before.qaButton !== after.qaButton) parts.push(`QA feedback button: ${before.qaButton} → ${after.qaButton}`);
  const list = (l: string[]) => (l.length ? l.join(', ') : '(none)');
  if (list(before.qaRecipients) !== list(after.qaRecipients)) parts.push(`QA recipients: ${list(before.qaRecipients)} → ${list(after.qaRecipients)}`);
  if (list(before.qaAdminCc) !== list(after.qaAdminCc)) parts.push(`QA admin cc: ${list(before.qaAdminCc)} → ${list(after.qaAdminCc)}`);
  const beforeV = before.validationRecipients ?? [];
  const afterV = after.validationRecipients ?? [];
  if (list(beforeV) !== list(afterV)) parts.push(`Validation recipients: ${list(beforeV)} → ${list(afterV)}`);
  const url = (v: string | undefined) => (v ? v : '(deployment default)');
  if (url(before.enhancementUrl) !== url(after.enhancementUrl)) parts.push(`Enhancement request destination: ${url(before.enhancementUrl)} → ${url(after.enhancementUrl)}`);
  return parts.length ? `Feedback settings changed. ${parts.join('; ')}.` : null;
}
