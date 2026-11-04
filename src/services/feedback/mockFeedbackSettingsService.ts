// src/services/feedback/mockFeedbackSettingsService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 447: the organisation's feedback settings (feedbackSettingsRules.ts).
// Saving needs config:feedback:manage, is validated and audited
// (FEEDBACK_SETTINGS_CHANGED). Production: an organisation setting on the
// API server.
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../mockStorage';
import { guardConfigWrites } from '../authorization/guardConfigWrites';
import { mockAuditService } from '../auditlog/mockAuditService';
import { readSessionProfile } from '../auth/sessionProfile';
import { deploymentInstance } from '../deployment/deploymentInstance';
import {
  DEFAULT_FEEDBACK_SETTINGS, feedbackSettingsChange, feedbackSettingsProblem, qaButtonShown, type FeedbackSettings,
} from './feedbackSettingsRules';

export const FEEDBACK_SETTINGS_STORAGE_KEY = 'pathscribe_feedback_settings';

import type { IFeedbackSettingsService } from './IFeedbackSettingsService';
export type { IFeedbackSettingsService } from './IFeedbackSettingsService';

const load = (): FeedbackSettings => ({ ...DEFAULT_FEEDBACK_SETTINGS, ...storageGet<Partial<FeedbackSettings>>(FEEDBACK_SETTINGS_STORAGE_KEY, {}) });

const unchecked: IFeedbackSettingsService = {
  async get() { return { ok: true, data: load() }; },
  async save(settings) {
    const problem = feedbackSettingsProblem(settings, deploymentInstance.role);
    if (problem) return { ok: false, error: problem };
    const before = load();
    storageSet(FEEDBACK_SETTINGS_STORAGE_KEY, settings);
    const change = feedbackSettingsChange(before, settings);
    if (change) {
      const user = readSessionProfile()?.id ?? 'unknown';
      mockAuditService.logEvent({ type: 'user', event: 'FEEDBACK_SETTINGS_CHANGED', detail: change, user, caseId: null, confidence: null }).catch(() => {});
    }
    return { ok: true, data: settings };
  },
  async qaButtonShown() { return qaButtonShown(load(), deploymentInstance.role); },
};

export const mockFeedbackSettingsService: IFeedbackSettingsService = guardConfigWrites(unchecked, [
  ['config:feedback:manage', ['save']],
]);
