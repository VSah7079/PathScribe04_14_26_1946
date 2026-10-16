// src/services/aiIntegration/mockAiVendorPolicyService.ts
// Batch 536 (PS-558): the browser's AI vendor policy service. The policy is
// configuration, kept through mockStorage until the API server holds it.
import { storageGet, storageSet } from '../mockStorage';
import { mockAuditService } from '../auditlog/mockAuditService';
import { readSessionProfile } from '../auth/sessionProfile';
import { notifyConfigRefused } from '../authorization/guardConfigWrites';
import { getCurrentJurisdiction } from '../retentionPolicy/RetentionPolicy';
import type { AiVendorRule } from './aiVendorPolicy';
import { AI_VENDOR_POLICY_STORAGE_KEY, createAiVendorPolicyService } from './aiVendorPolicyService';

export const mockAiVendorPolicyService = createAiVendorPolicyService({
  read: () => storageGet<AiVendorRule[] | null>(AI_VENDOR_POLICY_STORAGE_KEY, null),
  write: rules => storageSet(AI_VENDOR_POLICY_STORAGE_KEY, rules),
  enforce: async capability => {
    const { authorizationService } = await import('../authorization/defaultAuthorizationService');
    return authorizationService.enforce(capability);
  },
  audit: entry => mockAuditService.logEvent(entry),
  actorName: () => { const p = readSessionProfile(); return p?.name || p?.id || 'unknown'; },
  now: () => new Date(),
  facilities: async () => {
    const { mockFacilityService } = await import('../facilities/mockFacilityService');
    const res = await mockFacilityService.getAll();
    return res.ok ? res.data.filter(f => f.status !== 'Inactive' && f.jurisdiction).map(f => ({ id: f.id, name: f.name, jurisdiction: f.jurisdiction })) : [];
  },
  defaultJurisdiction: getCurrentJurisdiction,
  refused: notifyConfigRefused,
});
