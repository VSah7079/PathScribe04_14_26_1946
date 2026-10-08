// src/services/feedback/feedbackSettingsRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 447: the QA feedback button is a Configuration setting, not a build
// setting (VITE_QA_ENABLED, VITE_QA_EMAIL, VITE_QA_ADMIN_CC are gone).
// Configuration → System → Feedback. Pure.
//   • qaButton: 'default' follows the instance: shown on a validation
//     instance, hidden in production (services/deployment/deploymentInstance).
//     'on' / 'off' override that.
//   • qaRecipients / qaAdminCc: where QA feedback is emailed.
// ─────────────────────────────────────────────────────────────────────────────

import type { InstanceRole } from '../deployment/deploymentInstance';

export const QA_BUTTON_MODES = ['default', 'on', 'off'] as const;
export type QaButtonMode = (typeof QA_BUTTON_MODES)[number];

export interface FeedbackSettings {
  qaButton: QaButtonMode;
  qaRecipients: string[];
  qaAdminCc: string[];
}

export const DEFAULT_FEEDBACK_SETTINGS: FeedbackSettings = { qaButton: 'default', qaRecipients: [], qaAdminCc: [] };

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

export type FeedbackSettingsProblem = 'invalidRecipient' | 'invalidCc' | 'invalidMode' | 'noRecipients';

/** The first reason these settings can't be saved, or null. */
export function feedbackSettingsProblem(s: FeedbackSettings, role: InstanceRole): FeedbackSettingsProblem | null {
  if (!QA_BUTTON_MODES.includes(s.qaButton)) return 'invalidMode';
  if (s.qaRecipients.some(e => !EMAIL.test(e))) return 'invalidRecipient';
  if (s.qaAdminCc.some(e => !EMAIL.test(e))) return 'invalidCc';
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
  return parts.length ? `Feedback settings changed. ${parts.join('; ')}.` : null;
}
