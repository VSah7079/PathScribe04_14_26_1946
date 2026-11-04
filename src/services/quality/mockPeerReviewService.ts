// src/services/quality/mockPeerReviewService.ts
// Batch 439 (PS-144): the browser's peer review service (see peerReviewService.ts).

import { storageGet, storageSet } from '../mockStorage';
import { mockAuditService } from '../auditlog/mockAuditService';
import { readSessionProfile } from '../auth/sessionProfile';
import type { PeerReviewOverride, PeerReviewRequest } from '@/types/quality/PeerReview';
import { createPeerReviewService } from './peerReviewService';

export const PEER_REVIEW_STORAGE_KEY = 'pathscribe_peer_reviews';
export const PEER_REVIEW_OVERRIDE_STORAGE_KEY = 'pathscribe_peer_review_overrides';

export const mockPeerReviewService = createPeerReviewService({
  loadRequests: () => storageGet<PeerReviewRequest[]>(PEER_REVIEW_STORAGE_KEY, []),
  persistRequests: all => storageSet(PEER_REVIEW_STORAGE_KEY, all),
  loadOverrides: () => storageGet<PeerReviewOverride[]>(PEER_REVIEW_OVERRIDE_STORAGE_KEY, []),
  persistOverrides: all => storageSet(PEER_REVIEW_OVERRIDE_STORAGE_KEY, all),
  caseMeta: async caseId => {
    const { caseRouter } = await import('../cases/CaseRouter');
    const c = await caseRouter.getCase(caseId).catch(() => undefined);
    return {
      caseType: c?.specimens?.[0]?.description || caseId,
      subspecialtyId: c?.subspecialtyId,
      primaryDiagnosis: c?.diagnostic?.primaryDiagnosis,
    };
  },
  qaRecords: {
    create: async record => {
      const { mockQaActivityRecordService } = await import('./mockQaActivityRecordService');
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
});
