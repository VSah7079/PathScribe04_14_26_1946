// src/services/cases/caseUpdateNoticeDeps.ts
// Batch 572: what hooks/useCaseUpdateNotice.ts reads with: the case (through the case router), its support
// reference (the hub key), and, in the demo, another tab's saves. Batch 573: also what hooks/useCasePresence.ts
// uses; the reference comes from the API server when there is one, so every user has the same one.
import { caseRouter } from './CaseRouter';
import { mockSupportReferenceService } from '../supportReferences/mockSupportReferenceService';
import { createCaseSupportReferenceLookup } from '../supportReferences/caseSupportReference';
import { apiServerUrl } from '../apiServer/apiServerUrl';
import { getAccessToken } from '../auth/accessTokenSource';
import { subscribeCasesChangedElsewhere } from './mockCaseService';
import type { CaseUpdateNoticeDeps } from './caseUpdateNotice';

const caseSupportReference = createCaseSupportReferenceLookup({
  baseUrl: apiServerUrl('case support reference'),
  fetch: (url, init) => fetch(url, init),
  accessToken: getAccessToken,
  fallback: async caseId => {
    const r = await mockSupportReferenceService.forRecord('case', caseId);
    return r.ok ? r.data.ref : null;
  },
});

export const caseUpdateNoticeDeps: CaseUpdateNoticeDeps = {
  getCase: caseId => caseRouter.getCase(caseId),
  getSupportRef: caseSupportReference,
  subscribeElsewhere: subscribeCasesChangedElsewhere,
};
