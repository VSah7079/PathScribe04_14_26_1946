// Batch 412 (Pete): a pathologist revises a CT's review into their own, makes it the final diagnosis, and signs.
import { describe, it, expect, vi } from 'vitest';
import { reviseCytologyReviewForSignOut } from './reviseCytologyReviewForSignOut';
import { makeWorkspaceDeps } from './cytologyWorkspaceTestDeps';
import { EMPTY_DRAFT } from './cytologyReviewDraft';
import type { CytologyReviewRecord } from '@/types/cytology/CytologyReviewRecord';

const categories = [
  { id: 'nilm', diagnosticRank: 0, requiresPathologistReview: false },
  { id: 'hsil', diagnosticRank: 4, requiresPathologistReview: true },
] as never[];
const ctReview = { id: 'rv-ct', caseId: 'C1', specimenId: 'SP1', role: 'primary_screen', primaryInterpretationId: 'nilm', requiresPathologistReview: false, adequacySelections: [], recordedAt: '2026-09-29T10:00:00Z', recordedBy: { userId: 'CT1', userName: 'CT One' } } as CytologyReviewRecord;
const caseData = { id: 'C1', accession: { fullAccession: 'S26-1' }, specimens: [{ id: 'SP1', cytologyScreening: {} }] } as never;
const gate = { isGynCytology: true, isFlaggedForQc: false, categories, labJurisdiction: 'US' as never, signingProviderCredentials: [], uiLanguage: 'en', pathologyLexicon: [], isPathologist: true };
const input = (isPathologist = true) => ({
  form: { kind: 'standard' as const, draft: { ...EMPTY_DRAFT, primaryInterpretationId: 'hsil' } },
  caseData, specimenId: 'SP1', specimen: { id: 'SP1', cytologyScreening: {} }, user: { id: 'P1', name: 'Dr P' }, isPathologist,
  reviewMode: 'primary_manual' as const, editingReviewId: null, reviews: [ctReview], resolvedRole: 'pathologist_review' as const, categories,
  activeScreeningSeconds: 60, sourceReview: ctReview, gate,
});

describe('reviseCytologyReviewForSignOut', () => {
  it('pathologists only', async () => {
    const { deps } = makeWorkspaceDeps();
    expect((await reviseCytologyReviewForSignOut(input(false), deps)).outcome).toBe('notPathologist');
    expect(deps.createReview).not.toHaveBeenCalled();
  });
  it('saves the pathologist\'s own review (the CT\'s stays untouched), makes it the final diagnosis, and audits the change', async () => {
    const saved = { ...ctReview, id: 'rv-new', role: 'pathologist_review', primaryInterpretationId: 'hsil', requiresPathologistReview: true, recordedBy: { userId: 'P1', userName: 'Dr P' } };
    const { deps, updates, audit } = makeWorkspaceDeps({ getReviewsForSpecimen: async () => ({ ok: true, data: [ctReview, saved] as never }), getCase: async () => caseData });
    const result = await reviseCytologyReviewForSignOut(input(), deps);
    expect(result.outcome).toBe('readyToSign');
    expect(deps.updateReview).not.toHaveBeenCalled();
    expect(deps.createReview).toHaveBeenCalledWith(expect.objectContaining({ role: 'pathologist_review', primaryInterpretationId: 'hsil', recordedBy: { userId: 'P1', userName: 'Dr P' } }));
    expect(updates[updates.length - 1].patch.specimens[0].cytologyScreening.finalDiagnosis).toMatchObject({ reviewRecordId: 'rv-new', selectedBy: 'P1' });
    expect(audit.find(a => a.event === 'Pathologist revised cytology screen before sign-out')?.detail).toContain('major_discrepancy (false_negative)');
  });
  it('a refused final-diagnosis choice stops before signing', async () => {
    const saved = { ...ctReview, id: 'rv-new', recordedBy: { userId: 'P1', userName: 'Dr P' } };
    const enforce = vi.fn(async (cap: string) => ({ allowed: cap !== 'cytology:final-diagnosis:select' }));
    const { deps } = makeWorkspaceDeps({ enforce, getReviewsForSpecimen: async () => ({ ok: true, data: [saved] as never }) });
    expect(await reviseCytologyReviewForSignOut(input(), deps)).toMatchObject({ outcome: 'selectionRefused', selection: 'notPermitted' });
  });
});
