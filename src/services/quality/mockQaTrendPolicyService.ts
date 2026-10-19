// src/services/quality/mockQaTrendPolicyService.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-147 (Batch 442): each site's discordance-trend policy (QaTrendPolicy):
// the organisation default and any performing lab's own. Changing it needs
// config:qa-trend-policy:manage (Admin and Lab Director to start); every
// change is audited (QA_TREND_POLICY_CHANGED) and validated
// (qaTrendRules.qaTrendPolicyProblem).
// ─────────────────────────────────────────────────────────────────────────────

import type { QaTrendPolicySettings } from '@/types/quality/QaTrend';
import { storageGet, storageSet } from '../mockStorage';
import { guardConfigWrites } from '../authorization/guardConfigWrites';
import { mockAuditService } from '../auditlog/mockAuditService';
import { readSessionProfile } from '../auth/sessionProfile';
import { DEFAULT_QA_TREND_POLICY_SETTINGS, qaTrendPolicyChange, qaTrendPolicyProblem } from './qaTrendRules';
import type { IQaTrendPolicyService } from './IQaTrendPolicyService';
export type { IQaTrendPolicyService } from './IQaTrendPolicyService';

export const QA_TREND_POLICY_STORAGE_KEY = 'pathscribe_qa_trend_policy';


const load = (): QaTrendPolicySettings => {
  const stored = storageGet<Partial<QaTrendPolicySettings>>(QA_TREND_POLICY_STORAGE_KEY, {});
  return {
    orgDefault: { ...DEFAULT_QA_TREND_POLICY_SETTINGS.orgDefault, ...(stored.orgDefault ?? {}) },
    performingLabs: stored.performingLabs ?? {},
  };
};

const unchecked: IQaTrendPolicyService = {
  async get() { return { ok: true, data: load() }; },
  async save(settings, labName = id => id) {
    for (const p of [settings.orgDefault, ...Object.values(settings.performingLabs)]) {
      const problem = qaTrendPolicyProblem(p);
      if (problem) return { ok: false, error: problem };
    }
    const before = load();
    storageSet(QA_TREND_POLICY_STORAGE_KEY, settings);
    const change = qaTrendPolicyChange(before, settings, labName);
    if (change) {
      const user = readSessionProfile()?.id ?? 'unknown';
      mockAuditService.logEvent({ type: 'user', event: 'QA_TREND_POLICY_CHANGED', detail: change, user, caseId: null, confidence: null }).catch(() => {});
    }
    return { ok: true, data: settings };
  },
};

export const mockQaTrendPolicyService: IQaTrendPolicyService = guardConfigWrites(unchecked, [
  ['config:qa-trend-policy:manage', ['save']],
]);
