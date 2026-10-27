// @vitest-environment happy-dom
// Batch 609 (#31): the sign-out helper uses the revision rules for a report unlocked for an amendment, and an addendum is checked.
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';

vi.mock('@/services/aiIntegration/aiProviderService', () => ({ callAi: vi.fn() }));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));

import { callAi } from '@/services/aiIntegration/aiProviderService';
import { clinicalMismatchService, clinicalMismatchRuleService } from '@/services';
import { checkAddendumMismatch, checkClinicalMismatch } from '../checkPeerReviewAndMismatch';
import type { Case } from '@/types/case/Case';

const ai = (confidence: number) =>
  vi.mocked(callAi).mockResolvedValue({ text: JSON.stringify({ mismatch: true, kind: 'unexpected-malignancy', explanation: 'x', confidence }), provider: 'p', model: 'm' } as never);
const make = (pending: boolean, id: string) => ({
  id, order: { clinicalIndication: 'Routine screening colonoscopy, polyp' },
  diagnostic: { primaryDiagnosis: 'Invasive adenocarcinoma', microscopicDescription: 'Invasive adenocarcinoma' },
  specimens: [], synopticReports: [{ instanceId: 'i1', ...(pending ? { pendingAmendmentId: 'a1' } : {}) }],
}) as unknown as Case;

// Batch 679: these tests cover the score-driven thresholds and Block rules, which belong to the clinical_support profile.
beforeAll(() => { vi.stubEnv('VITE_REGULATORY_PROFILE', 'clinical_support'); });
afterAll(() => { vi.unstubAllEnvs(); });

describe('checks after first sign-out', () => {
  beforeEach(() => { localStorage.clear(); vi.mocked(callAi).mockReset(); clinicalMismatchService.forgetAnswers(); });

  it('re-sign-out of an amended report: a high-risk mismatch is decided first by default', async () => {
    ai(85);
    expect((await checkClinicalMismatch(make(true, 'k1')))?.outcome.holdsSignOut).toBe(true);
  });
  it('re-sign-out with the lab setting off: not held (logged instead)', async () => {
    await clinicalMismatchRuleService.saveRevisionHoldsRelease(false);
    ai(85);
    expect(await checkClinicalMismatch(make(true, 'k2'))).toBeNull();
  });
  it('first sign-out ignores the amendment setting', async () => {
    await clinicalMismatchRuleService.saveRevisionHoldsRelease(false);
    ai(85);
    expect((await checkClinicalMismatch(make(false, 'k3')))?.outcome.holdsSignOut).toBe(true);
  });
  it('an addendum with a new finding is checked; an empty one is not', async () => {
    ai(85);
    expect(await checkAddendumMismatch(make(false, 'k4'), '')).toBeNull();
    expect(callAi).not.toHaveBeenCalled();
    expect((await checkAddendumMismatch(make(false, 'k4'), 'Deeper levels show invasive carcinoma.'))?.outcome.holdsSignOut).toBe(true);
  });
});
