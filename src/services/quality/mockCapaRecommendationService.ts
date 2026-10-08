// src/services/quality/mockCapaRecommendationService.ts
// Batch 438: the browser's CAPA recommendation service (see capaRecommendationService.ts).
// Two demo recommendations are seeded so the QA lead's queue isn't empty in
// a fresh demo; both reference seeded cases.

import { storageGet, storageSet } from '../mockStorage';
import { mockSpecimenDeficiencyService } from '../deficiencies/mockSpecimenDeficiencyService';
import { mockAuditService } from '../auditlog/mockAuditService';
import { readSessionProfile } from '../auth/sessionProfile';
import type { CapaRecommendation } from '@/types/quality/CapaRecommendation';
import { createCapaRecommendationService } from './capaRecommendationService';

export const CAPA_RECOMMENDATIONS_STORAGE_KEY = 'pathscribe_capa_recommendations';

const SEED: CapaRecommendation[] = [
  {
    id: 'capa-rec-demo-001', caseId: 'S26-4402-COLON-RES', source: 'post-signout-discordance',
    deficiencyTypeId: 'def-peer-review-discordance', sourceRecordId: 'qa-rec-demo',
    summary: 'Post-sign-out peer review "Surgical Peer Review" found a high-severity discordance: margin status reported negative, focally positive on re-review.',
    severity: 'high', rootCause: 'Interpretation error', status: 'pending', createdBy: 'system',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'capa-rec-demo-002', caseId: 'S26-4403', source: 'clinical-correction',
    deficiencyTypeId: 'def-clinically-significant-revision', sourceRecordId: 'amend-demo',
    summary: 'Released amendment for reason "Pathologic Staging Change", marked clinically significant.',
    status: 'pending', createdBy: 'system', createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
];

const load = () => storageGet<CapaRecommendation[]>(CAPA_RECOMMENDATIONS_STORAGE_KEY, SEED);
const persist = (all: CapaRecommendation[]) => storageSet(CAPA_RECOMMENDATIONS_STORAGE_KEY, all);

export const mockCapaRecommendationService = createCapaRecommendationService({
  load,
  persist,
  deficiencies: mockSpecimenDeficiencyService,
  audit: entry => mockAuditService.logEvent(entry),
  enforce: async (context) => {
    const { authorizationService } = await import('../authorization/defaultAuthorizationService');
    return authorizationService.enforce('qa:capa-recommendation:decide', context);
  },
  actor: () => {
    const p = readSessionProfile();
    return { id: p?.id ?? 'unknown', name: p?.name || p?.id || 'unknown' };
  },
});
