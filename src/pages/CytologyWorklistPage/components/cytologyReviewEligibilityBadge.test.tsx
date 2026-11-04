// @vitest-environment happy-dom
// Batch 451 (PS-163): each review in the Cytology Workspace's history shows
// "CT-eligible" or "Pathologist required" from the CLIA sign-out gate
// (resolveCytologySignOutGate, through cytologyReviewEligibility). The decision
// is tested on the service; the badge is rendered with the gate it produces.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

import { cytologyReviewEligibility, type CytologyGateContext } from '@/services/cytology/cytologyWorkspaceView';
import { CytologyReviewEligibilityBadge } from './CytologyReviewEligibilityBadge';

afterEach(cleanup);

const categories = [
  { id: 'nilm', label: 'NILM', section: 'interpretation_result', diagnosticRank: 0, requiresPathologistReview: false },
  { id: 'hsil', label: 'HSIL', section: 'interpretation_result', diagnosticRank: 4, requiresPathologistReview: true },
  { id: 'sat', label: 'Satisfactory', section: 'adequacy', diagnosticRank: 0, requiresPathologistReview: false },
  { id: 'unsat', label: 'Unsatisfactory', section: 'adequacy', diagnosticRank: 0, requiresPathologistReview: false, isUnsatisfactory: true },
] as never[];
const ctx = (over: Partial<CytologyGateContext> = {}): CytologyGateContext => ({
  isGynCytology: true, isFlaggedForQc: false, categories, labJurisdiction: 'US', signingProviderCredentials: [], uiLanguage: 'en', pathologyLexicon: [], isPathologist: false, ...over,
});
const review = (interp: string, needsPathologist: boolean, adequacy = 'sat') =>
  ({ id: 'r1', role: 'primary_screen', primaryInterpretationId: interp, requiresPathologistReview: needsPathologist,
     adequacySelections: [{ categoryId: adequacy }], recordedAt: '2026-10-01T00:00:00Z', recordedBy: { userId: 'CT1', userName: 'CT One' } }) as never;

function renderBadge(r: never, c: CytologyGateContext) {
  const { gate } = cytologyReviewEligibility(r, c);
  render(<CytologyReviewEligibilityBadge gate={gate} reasonsText={gate.blockedReasons.join(', ')} />);
  return { gate, badge: document.querySelector('.ps-cytoscreen-review-eligibility') as HTMLElement };
}

describe('Review history CT-eligible / pathologist-required badge (PS-163)', () => {
  describe('the decision (cytologyReviewEligibility gate)', () => {
    it('a negative, satisfactory GYN review not flagged for QC is CT-eligible', () => {
      expect(cytologyReviewEligibility(review('nilm', false), ctx()).gate).toEqual({ allowed: true, blockedReasons: [] });
    });

    it('each gate condition on its own makes the review pathologist-required, with that reason', () => {
      expect(cytologyReviewEligibility(review('hsil', true), ctx()).gate).toMatchObject({ allowed: false, blockedReasons: expect.arrayContaining(['requires_pathologist_review']) });
      expect(cytologyReviewEligibility(review('nilm', false, 'unsat'), ctx()).gate).toMatchObject({ allowed: false, blockedReasons: expect.arrayContaining(['unsatisfactory_adequacy']) });
      expect(cytologyReviewEligibility(review('nilm', false), ctx({ isFlaggedForQc: true })).gate).toMatchObject({ allowed: false, blockedReasons: expect.arrayContaining(['flagged_for_qc']) });
      expect(cytologyReviewEligibility(review('nilm', false), ctx({ isGynCytology: false })).gate.allowed).toBe(false);
    });

    it('the badge follows the review, not the viewer: a pathologist viewing an HSIL review still sees "pathologist required"', () => {
      const asPathologist = cytologyReviewEligibility(review('hsil', true), ctx({ isPathologist: true }));
      expect(asPathologist.gate.allowed).toBe(false);
      expect(asPathologist.authorized).toBe(true);
    });
  });

  describe('the rendered badge', () => {
    it('shows CT-ELIGIBLE, in the allowed style, for a CT-eligible review', () => {
      const { badge } = renderBadge(review('nilm', false), ctx());
      expect(screen.getByText('CYTOLOGYSCREENING.HISTORY.CTELIGIBLE')).toBe(badge);
      expect(badge.className).toContain('ps-cytoscreen-review-eligibility--allowed');
      expect(screen.queryByText('CYTOLOGYSCREENING.HISTORY.PATHREQUIRED')).toBeNull();
    });

    it('shows PATH REQUIRED, in the blocked style, with every block reason in its tooltip', () => {
      const { badge } = renderBadge(review('hsil', true, 'unsat'), ctx({ isFlaggedForQc: true }));
      expect(screen.getByText('CYTOLOGYSCREENING.HISTORY.PATHREQUIRED')).toBe(badge);
      expect(badge.className).toContain('ps-cytoscreen-review-eligibility--blocked');
      for (const reason of ['requires_pathologist_review', 'unsatisfactory_adequacy', 'flagged_for_qc']) expect(badge.title).toContain(reason);
    });
  });
});
