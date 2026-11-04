// src/services/clinicalHistory/clinicalHistoryAfterAccessionService.ts
// Batch 530: the browser's wiring for recordClinicalHistoryAfterAccession.
import type { RecordedClinicalHistoryEntry } from '@/types/clinicalHistory/RecordedClinicalHistoryEntry';
import { caseRouter } from '../cases/CaseRouter';
import { auditService } from '../auditlog/auditServiceInstance';
import { readSessionProfile } from '../auth/sessionProfile';
import { recordClinicalHistoryAfterAccession } from './recordClinicalHistoryAfterAccession';

export const clinicalHistoryAfterAccessionService = {
  record: (caseId: string, entries: readonly RecordedClinicalHistoryEntry[]) => recordClinicalHistoryAfterAccession(caseId, entries, {
    getCase: id => caseRouter.getCase(id),
    updateCase: (id, updates, version) => caseRouter.updateCase(id, updates, version),
    enforce: async (capability, context) => {
      const { authorizationService } = await import('../authorization/defaultAuthorizationService');
      return authorizationService.enforce(capability, context);
    },
    audit: entry => auditService.logEvent(entry),
    actorName: () => { const p = readSessionProfile(); return p?.name || p?.id || 'unknown'; },
  }),
};
