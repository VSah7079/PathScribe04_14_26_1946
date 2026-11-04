// src/services/printing/directDevicePrintingDeps.ts
// Batch 734: the app's services behind the direct-printing check (directDevicePrinting.ts).
import { dataMayPersistInBrowser } from '../browserData/browserDataPolicy';
import { facilityService } from '../facilities/facilityServiceInstance';
import { auditService } from '../auditlog/auditServiceInstance';
import { readSessionProfile } from '../auth/sessionProfile';
import type { DirectPrintDeps } from './directDevicePrinting';

export const directDevicePrintingDeps: DirectPrintDeps = {
  demo: () => dataMayPersistInBrowser(),
  facilityAllows: async facilityId => {
    if (!facilityId) return false;
    const r = await facilityService.getById(facilityId);
    return r.ok ? r.data.allowDirectDevicePrinting === true : false;
  },
  audit: (event, detail) => {
    const who = readSessionProfile();
    void auditService.logEvent({ type: 'system', event, detail, user: who?.name ?? who?.id ?? 'unknown', caseId: null, confidence: null }).catch(() => undefined);
  },
};
