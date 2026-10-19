// src/services/quality/peerReviewStatusLive.ts
// Batch 439 (PS-144): loadPeerReviewStatus with the browser's services.

import { peerReviewService } from './peerReviewServiceInstance';
import { peerReviewSettingsService } from './peerReviewSettingsServiceInstance';
import { loadPeerReviewStatus, type CaseForPeerReview, type PeerReviewStatus } from './peerReviewStatus';
import type { PriorCaseForMalignancy } from './peerReviewRules';

async function priorCases(patientId: string, excludeCaseId: string): Promise<PriorCaseForMalignancy[]> {
  const { mockPatientIndexService } = await import('../patients/mockPatientIndexService');
  const { caseRouter } = await import('../cases/CaseRouter');
  const [linked, casesRes] = await Promise.all([
    mockPatientIndexService.getLinkedPatientIds(patientId, 'same_person').catch(() => [patientId]),
    caseRouter.getAll(undefined, { includeOrchestration: true, bypassAccessControl: true }),
  ]);
  const ids = new Set([patientId, ...linked]);
  return casesRes.ok
    ? (casesRes.data as Array<PriorCaseForMalignancy & { patient?: { id?: string } }>).filter(c => c.id !== excludeCaseId && !!c.patient?.id && ids.has(c.patient.id))
    : [];
}

export function peerReviewStatusFor(caseData: CaseForPeerReview, findings: ReadonlyArray<{ severity: string }> = []): Promise<PeerReviewStatus> {
  return loadPeerReviewStatus(caseData, findings, {
    getForCase: async caseId => {
      const res = await peerReviewService.getForCase(caseId);
      return res.ok ? res.data : { requests: [], overrides: [] };
    },
    gateOnFor: (facilityId, subspecialtyId) => peerReviewSettingsService.gateOnFor(facilityId, subspecialtyId),
    // The ordering facility's performing lab; failing that, the enterprise
    // facility that lists the case's tenant (resolveTenantFacility).
    performingLabFor: async (orderingFacilityId, tenantId) => {
      const { mockFacilityService } = await import('../facilities/mockFacilityService');
      const { resolvePerformingLabFacilityId } = await import('../facilities/IFacilityService');
      const { resolveTenantFacility } = await import('../auth/resolveTenantFacility');
      if (orderingFacilityId) {
        const res = await mockFacilityService.getById(orderingFacilityId).catch(() => null);
        const lab = res?.ok ? resolvePerformingLabFacilityId(res.data) : undefined;
        if (lab) return lab;
      }
      const all = await mockFacilityService.getAll().catch(() => null);
      return all?.ok ? resolveTenantFacility(tenantId, all.data)?.id : undefined;
    },
    priorCases,
  });
}
