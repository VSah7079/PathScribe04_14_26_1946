// src/services/retention/retentionPolicyService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 428: the lab's retention policy (how long AI suggestions, the audit
// log, case snapshots and report archives are kept), Configuration → System →
// Retention. Before, the screen wrote it straight to browser storage with no
// check. Saving it now needs config:retention-policy:manage, checked here.
//
// Nothing applies this policy yet (no purge job reads it); that is server work
// (PS-345). A policy saved before Batch 428 is still read (see legacyPolicy).
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../mockStorage';
import { permitConfigChange } from '../authorization/guardConfigWrites';

export interface RetentionPolicy {
  aiSuggestionDays:   number;
  auditLogDays:       number;
  caseSnapshotYears:  number;
  reportArchiveYears: number;
}

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  aiSuggestionDays:   90,
  auditLogDays:       365,
  caseSnapshotYears:  7,
  reportArchiveYears: 10,
};

const STORAGE_KEY = 'pathscribe_retention_policy';

// Batch 430 (correction): storageGet keeps keys under the mock prefix, so a
// policy saved before Batch 428 (under the bare key) is read from there until
// it is saved again.
function legacyPolicy(): Partial<RetentionPolicy> {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

export function loadRetentionPolicy(): RetentionPolicy {
  return { ...DEFAULT_RETENTION_POLICY, ...storageGet<Partial<RetentionPolicy> | null>(STORAGE_KEY, null) ?? legacyPolicy() };
}

/** Saves the policy. False when refused (nothing saved). */
export async function saveRetentionPolicy(policy: RetentionPolicy): Promise<boolean> {
  const { authorizationService } = await import('../authorization/defaultAuthorizationService');
  if (!(await permitConfigChange(authorizationService.enforce('config:retention-policy:manage'), 'config:retention-policy:manage'))) return false;
  storageSet(STORAGE_KEY, policy);
  return true;
}
