// src/services/coding/mockCodeSystemPolicyService.ts
// Batch 595: the browser's code-system policy service. The policy is
// configuration, kept through mockStorage until the API server holds it.
import { storageGet, storageSet } from '../mockStorage';
import { mockAuditService } from '../auditlog/mockAuditService';
import { readSessionProfile } from '../auth/sessionProfile';
import { notifyConfigRefused } from '../authorization/guardConfigWrites';
import { getCurrentJurisdiction } from '../retentionPolicy/RetentionPolicy';
import type { CodeSystemPolicyRecord } from './codeSystemPolicyRules';
import { CODE_SYSTEM_POLICY_STORAGE_KEY, createCodeSystemPolicyService } from './codeSystemPolicyService';

export const mockCodeSystemPolicyService = createCodeSystemPolicyService({
  read: () => storageGet<CodeSystemPolicyRecord[] | null>(CODE_SYSTEM_POLICY_STORAGE_KEY, null),
  write: records => storageSet(CODE_SYSTEM_POLICY_STORAGE_KEY, records),
  enforce: async capability => {
    const { authorizationService } = await import('../authorization/defaultAuthorizationService');
    return authorizationService.enforce(capability);
  },
  audit: entry => mockAuditService.logEvent(entry),
  actorName: () => { const p = readSessionProfile(); return p?.name || p?.id || 'unknown'; },
  now: () => new Date(),
  facilityJurisdictions: async () => {
    const { mockFacilityService } = await import('../facilities/mockFacilityService');
    const res = await mockFacilityService.getAll();
    return res.ok ? res.data.filter(f => f.status !== 'Inactive' && f.jurisdiction).map(f => f.jurisdiction) : [];
  },
  defaultJurisdiction: getCurrentJurisdiction,
  refused: notifyConfigRefused,
});
