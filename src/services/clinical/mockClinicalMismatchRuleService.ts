// src/services/clinical/mockClinicalMismatchRuleService.ts
// Batch 529 (PS-554): the browser's mismatch rules service. The rules are
// configuration, kept through mockStorage until the API server holds them.
import { storageGet, storageSet } from '../mockStorage';
import { mockAuditService } from '../auditlog/mockAuditService';
import { readSessionProfile } from '../auth/sessionProfile';
import { notifyConfigRefused } from '../authorization/guardConfigWrites';
import type { ClinicalMismatchRule } from './clinicalMismatchRules';
import { CLINICAL_MISMATCH_RULES_STORAGE_KEY, createClinicalMismatchRuleService } from './clinicalMismatchRuleService';

export const mockClinicalMismatchRuleService = createClinicalMismatchRuleService({
  read: () => storageGet<ClinicalMismatchRule[] | null>(CLINICAL_MISMATCH_RULES_STORAGE_KEY, null),
  write: rules => storageSet(CLINICAL_MISMATCH_RULES_STORAGE_KEY, rules),
  enforce: async capability => {
    const { authorizationService } = await import('../authorization/defaultAuthorizationService');
    return authorizationService.enforce(capability);
  },
  audit: entry => mockAuditService.logEvent(entry),
  actorName: () => { const p = readSessionProfile(); return p?.name || p?.id || 'unknown'; },
  specimenName: async id => {
    const { mockSpecimenDictionaryService } = await import('../specimenDictionary/mockSpecimenDictionaryService');
    const res = await mockSpecimenDictionaryService.getAll();
    return res.ok ? res.data.find(e => e.id === id)?.name ?? null : null;
  },
  refused: notifyConfigRefused,
});
