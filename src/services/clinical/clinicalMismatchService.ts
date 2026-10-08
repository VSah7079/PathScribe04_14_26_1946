// src/services/clinical/clinicalMismatchService.ts
// Batch 439 (PS-145): the browser's wiring for the clinical-pathologic
// mismatch check (detection + the pathologist's decision).

import { mockAuditService } from '../auditlog/mockAuditService';
import { readSessionProfile } from '../auth/sessionProfile';
import { detectClinicalPathologicMismatch } from './detectClinicalPathologicMismatch';
import { recordClinicalMismatchDecision, type ClinicalMismatchDecisionInput } from './clinicalMismatchDecision';

export const clinicalMismatchService = {
  detect: detectClinicalPathologicMismatch,
  record: (input: ClinicalMismatchDecisionInput) => recordClinicalMismatchDecision(input, {
    qaRecords: {
      create: async record => {
        const { mockQaActivityRecordService } = await import('../quality/mockQaActivityRecordService');
        return mockQaActivityRecordService.create(record);
      },
    },
    audit: entry => mockAuditService.logEvent(entry),
    enforce: async (capability, context) => {
      const { authorizationService } = await import('../authorization/defaultAuthorizationService');
      return authorizationService.enforce(capability, context);
    },
    actor: () => {
      const p = readSessionProfile();
      return { userId: p?.id ?? 'unknown', userName: p?.name || p?.id || 'unknown' };
    },
  }),
};
