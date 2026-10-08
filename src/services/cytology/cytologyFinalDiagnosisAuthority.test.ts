// Batch 450 (PS-207): choosing the Final Diagnosis needs the same authority as
// signing out. selectCytologyFinalDiagnosis (cytologyCaseActions.ts) enforces it;
// cytologyReviewEligibility (cytologyWorkspaceView.ts) is what greys out the
// screen's "Set as Final" button, so both are checked here, per condition.
import { describe, expect, it } from 'vitest';
import { selectCytologyFinalDiagnosis } from './cytologyCaseActions';
import { cytologyReviewEligibility, type CytologyGateContext } from './cytologyWorkspaceView';
import { makeWorkspaceDeps } from './cytologyWorkspaceTestDeps';

const categories = [
  { id: 'nilm', label: 'NILM', section: 'interpretation_result', diagnosticRank: 0, requiresPathologistReview: false },
  { id: 'hsil', label: 'HSIL', section: 'interpretation_result', diagnosticRank: 4, requiresPathologistReview: true },
  { id: 'sat', label: 'Satisfactory', section: 'adequacy', diagnosticRank: 0, requiresPathologistReview: false },
  { id: 'unsat', label: 'Unsatisfactory', section: 'adequacy', diagnosticRank: 0, requiresPathologistReview: false, isUnsatisfactory: true },
] as never[];
const specimen = { id: 'SP1', label: 'A', description: 'Pap', cytologyScreening: {}, decants: [] };
const caseData = { id: 'C1', accession: { fullAccession: 'S26-1' }, order: { facilityId: 'F1' }, specimens: [specimen] } as never;
const user = { id: 'U1', name: 'Reviewer' };
const ctx = (over: Partial<CytologyGateContext> = {}): CytologyGateContext => ({
  isGynCytology: true, isFlaggedForQc: false, categories, labJurisdiction: 'US', signingProviderCredentials: [], uiLanguage: 'en', pathologyLexicon: [], isPathologist: false, ...over,
});
const review = (interp: string, needsPathologist: boolean, adequacy = 'sat') =>
  ({ id: 'r1', role: 'primary_screen', primaryInterpretationId: interp, requiresPathologistReview: needsPathologist,
     adequacySelections: [{ categoryId: adequacy }], recordedAt: '2026-10-01T00:00:00Z', recordedBy: { userId: 'CT1', userName: 'CT One' } }) as never;

async function select(r: never, c: CytologyGateContext) {
  const { deps, updates } = makeWorkspaceDeps();
  const outcome = await selectCytologyFinalDiagnosis({ caseData, specimenId: 'SP1', review: r, user, gate: c }, deps);
  return { outcome, saved: updates.length > 0, button: cytologyReviewEligibility(r, c).authorized };
}

describe('Final Diagnosis selection authority (PS-207)', () => {
  it('a cytotechnologist may choose a negative GYN review with satisfactory adequacy, not flagged for QC', async () => {
    expect(await select(review('nilm', false), ctx())).toEqual({ outcome: 'selected', saved: true, button: true });
  });

  it('a cytotechnologist may not choose a review that requires pathologist review; the button is disabled', async () => {
    expect(await select(review('hsil', true), ctx())).toEqual({ outcome: 'pathologistOnly', saved: false, button: false });
  });

  it('a cytotechnologist may not choose a review with unsatisfactory adequacy', async () => {
    expect(await select(review('nilm', false, 'unsat'), ctx())).toEqual({ outcome: 'pathologistOnly', saved: false, button: false });
  });

  it('a cytotechnologist may not choose a review on a case flagged for QC', async () => {
    expect(await select(review('nilm', false), ctx({ isFlaggedForQc: true }))).toEqual({ outcome: 'pathologistOnly', saved: false, button: false });
  });

  it('a cytotechnologist may not choose a review on a non-GYN specimen', async () => {
    expect(await select(review('nilm', false), ctx({ isGynCytology: false }))).toEqual({ outcome: 'pathologistOnly', saved: false, button: false });
  });

  it('a pathologist may choose any review, in every one of those situations', async () => {
    for (const [r, c] of [
      [review('hsil', true), ctx({ isPathologist: true })],
      [review('nilm', false, 'unsat'), ctx({ isPathologist: true })],
      [review('nilm', false), ctx({ isPathologist: true, isFlaggedForQc: true })],
      [review('nilm', false), ctx({ isPathologist: true, isGynCytology: false })],
    ] as const) {
      expect(await select(r, c)).toEqual({ outcome: 'selected', saved: true, button: true });
    }
  });

  it('the gate explains every reason a cytotechnologist is blocked, not just the first', () => {
    const { gate } = cytologyReviewEligibility(review('hsil', true, 'unsat'), ctx({ isFlaggedForQc: true }));
    expect(gate.blockedReasons).toEqual(expect.arrayContaining(['requires_pathologist_review', 'unsatisfactory_adequacy', 'flagged_for_qc']));
  });
});
