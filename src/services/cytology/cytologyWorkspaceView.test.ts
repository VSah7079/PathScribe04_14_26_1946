// Batch 410 (PS-359): what the Cytology Workspace shows, decided outside the page.
import { describe, it, expect } from 'vitest';
import {
  aiScreeningSummary, cytologyCategoryLabel, cytologyCategoryOptions, cytologyCodeSpecimens, cytologyExistingCodes, cytologyHpvCard,
  cytologySignOutPanel, cytologyWorkloadBanner, displayedReviewerRole, latestCompletedAiResult, onScreenFiveYearLookback,
  openHistologyCorrelationCandidates, showCytologySynopticTrigger, type CytologyGateContext,
} from './cytologyWorkspaceView';
import { draftFromClonedReview, draftFromReview, isDraftDirty, notesWithNarrative, ownReviewForEditing, reviewFieldsFromDraft, EMPTY_DRAFT } from './cytologyReviewDraft';

const categories = [
  { id: 'sat', section: 'adequacy', label: 'Satisfactory' },
  { id: 'nilm', section: 'interpretation_result', usage: 'primary', label: 'NILM', diagnosticRank: 0, requiresPathologistReview: false },
  { id: 'lsil', section: 'interpretation_result', usage: 'both', label: 'LSIL', abbreviation: 'LSIL', diagnosticRank: 2, requiresPathologistReview: false },
  { id: 'hsil', section: 'interpretation_result', usage: 'both', label: 'HSIL', description: 'High-grade squamous intraepithelial lesion', diagnosticRank: 4, requiresPathologistReview: true },
  { id: 'org', section: 'interpretation_result', usage: 'secondary', label: 'Organisms' },
  { id: 'rep', section: 'recommendation', label: 'Repeat' },
] as never[];
const ctx = (isPathologist: boolean): CytologyGateContext => ({
  isGynCytology: true, isFlaggedForQc: false, categories, labJurisdiction: 'US', signingProviderCredentials: [], uiLanguage: 'en', pathologyLexicon: [], isPathologist,
});

describe('category pickers', () => {
  it('splits the dictionary by section and usage; additional excludes the chosen primary', () => {
    const o = cytologyCategoryOptions(categories);
    expect(o.adequacy.map((c: any) => c.id)).toEqual(['sat']);
    expect(o.primary.map((c: any) => c.id)).toEqual(['nilm', 'lsil', 'hsil']);
    expect(o.additionalExcluding('lsil').map((c: any) => c.id)).toEqual(['hsil', 'org']);
    expect(o.recommendation.map((c: any) => c.id)).toEqual(['rep']);
  });
  it('labels: the description first, then "ABBR — Label", then the label, then the id', () => {
    expect(cytologyCategoryLabel(categories, 'hsil')).toBe('High-grade squamous intraepithelial lesion');
    expect(cytologyCategoryLabel(categories, 'lsil')).toBe('LSIL — LSIL');
    expect(cytologyCategoryLabel(categories, 'nilm')).toBe('NILM');
    expect(cytologyCategoryLabel(categories, 'gone')).toBe('gone');
  });
});

describe('sign-out panel', () => {
  const reviews = [{ id: 'r1', primaryInterpretationId: 'hsil', requiresPathologistReview: true, adequacySelections: [] }] as never[];
  it('asks for a final diagnosis first', () => {
    expect(cytologySignOutPanel(undefined, reviews, ctx(true)).needsFinalDiagnosis).toBe(true);
  });
  it('a cytotechnologist can\'t sign a review that needs a pathologist, and is told why', () => {
    expect(cytologySignOutPanel({ reviewRecordId: 'r1' }, reviews, ctx(false))).toEqual({ needsFinalDiagnosis: false, canSign: false, blockedReasons: ['requires_pathologist_review'] });
    expect(cytologySignOutPanel({ reviewRecordId: 'r1' }, reviews, ctx(true)).canSign).toBe(true);
  });
});

describe('cards', () => {
  it('the role shown is the edited review\'s own', () => {
    expect(displayedReviewerRole('r1', [{ id: 'r1', role: 'primary_screen' }] as never[], 'pathologist_review')).toBe('primary_screen');
    expect(displayedReviewerRole(null, [], 'secondary_reviewer')).toBe('secondary_reviewer');
  });
  it('the Synoptic drawer: Non-GYN, a pathologist or advanced CT, never at a CISOE-A facility', () => {
    expect(showCytologySynopticTrigger(false, 'bethesda', true, false)).toBe(true);
    expect(showCytologySynopticTrigger(false, 'bethesda', false, true)).toBe(true);
    expect(showCytologySynopticTrigger(true, 'bethesda', true, false)).toBe(false);
    expect(showCytologySynopticTrigger(false, 'palga_cisoea', true, false)).toBe(false);
  });
  it('the on-screen 5-year lookback lists earlier Paps only for a high-grade diagnosis', () => {
    const history = { priorSurgicalBiopsies: [], priorCytologyResults: [
      { caseId: 'C0', accessionNumber: 'S24-1', date: '2024-01-01T00:00:00Z', reviewRecordId: 'r0', specimenId: 'SP0', diagnosticRank: 0, resultLabel: 'NILM' },
    ] };
    const now = new Date('2026-09-30T00:00:00Z');
    expect(onScreenFiveYearLookback(categories, 'nilm', history, now)).toEqual([]);
    expect(onScreenFiveYearLookback(categories, 'hsil', history, now)).toEqual([
      { reviewId: 'r0', caseId: 'C0', recordedAt: '2024-01-01T00:00:00Z', accessionNumber: 'S24-1', resultLabel: 'NILM' },
    ]);
  });
  it('the HPV card: reason only for reflex or surveillance; genotypes only for a positive result', () => {
    expect(cytologyHpvCard({})).toMatchObject({ hasAny: false, reasonKey: null, genotypeKeys: null });
    expect(cytologyHpvCard({ hpvOrderReason: 'co_test', hpvResult: 'Negative' }).reasonKey).toBeNull();
    expect(cytologyHpvCard({ hpvOrderReason: 'post_treatment_surveillance', hpvResult: 'Positive', hpvGenotypeDetail: { hpv16: true, hpv18Or45: false, otherHighRisk: true } }))
      .toMatchObject({ positive: true, reasonKey: 'reasons.post_treatment', genotypeKeys: ['genotypes.hpv16', 'genotypes.otherHighRisk'] });
  });
  it('the AI summary: slide triage with or without a rank group, else the FOV count', () => {
    expect(aiScreeningSummary({ findings: [1, 2] } as never)).toEqual({ kind: 'fov', count: 2 });
    expect(aiScreeningSummary({ findings: [], slideTriage: { reviewRecommended: true, rankGroup: 1, totalRankGroups: 5 } } as never)).toEqual({ kind: 'triage', reviewRecommended: true, group: 1, total: 5 });
    expect(aiScreeningSummary({ findings: [], slideTriage: { reviewRecommended: false } } as never)).toEqual({ kind: 'triage', reviewRecommended: false });
  });
  it('the latest completed AI result', () => {
    expect(latestCompletedAiResult([
      { id: 'a', status: 'completed', completedAt: '2026-01-01' }, { id: 'b', status: 'completed', completedAt: '2026-02-01' }, { id: 'c', status: 'ordered' },
    ] as never[])?.id).toBe('b');
    expect(latestCompletedAiResult([])).toBeNull();
  });
  it('the workload banner, in the user\'s number format', () => {
    expect(cytologyWorkloadBanner({ status: 'ok' } as never, 'en')).toBeNull();
    expect(cytologyWorkloadBanner({ status: 'exceeded', candidateScu: 101.25, maxAllowedScu: 100, utilizationPercent: 101 }, 'de')).toEqual({ level: 'exceeded', used: '101,3', max: '100,0' });
  });
  it('open correlation candidates: not recorded, not dismissed', () => {
    const specimen = { cytologyScreening: { histologyCorrelationCandidates: [{ candidateCaseId: 'a' }, { candidateCaseId: 'b', recordedActivityRecordId: 'x' }, { candidateCaseId: 'c', dismissedAsNotRelevant: true }] } };
    expect(openHistologyCorrelationCandidates(specimen).map(c => c.candidateCaseId)).toEqual(['a']);
  });
  it('the Code Manager\'s inputs', () => {
    const caseData = { coding: { icd10: ['Z01'] }, specimens: [{ id: 'SP1', label: 'A', description: 'Pap', coding: { cpt: ['88142'], snomed: [{ code: 's1', description: 'NILM' }] } }] } as never;
    expect(cytologyExistingCodes(caseData).map(c => c.id)).toEqual(['case-icd-0', 'snomed-SP1-0', 'cpt-SP1-88142']);
    expect(cytologyCodeSpecimens(caseData)).toEqual({ specimens: [{ index: 0, id: 1, specimenId: 'SP1', label: 'A', description: 'Pap' }], activeSpecimenIndex: 0 });
  });
});

describe('drafts', () => {
  const saved = { id: 'r1', role: 'primary_screen', reviewMode: 'fov_assisted', primaryInterpretationId: 'lsil', primaryInterpretationComment: 'focal', adequacySelections: [{ categoryId: 'sat' }], notes: 'n', recordedAt: '2026-09-01', recordedBy: { userId: 'U1', userName: 'U' } } as never;
  it('your own review opens for editing, with how it was screened', () => {
    expect(ownReviewForEditing([saved], 'U1')).toMatchObject({ reviewId: 'r1', reviewMode: 'fov_assisted', draft: { primaryInterpretationId: 'lsil', primaryInterpretationComment: 'focal', notes: 'n' } });
    expect(ownReviewForEditing([saved], 'U2')).toBeNull();
  });
  it('a copied review keeps the picks, never the comment or notes', () => {
    expect(draftFromClonedReview(saved)).toMatchObject({ primaryInterpretationId: 'lsil', primaryInterpretationComment: '', notes: '', adequacySelections: [{ categoryId: 'sat' }] });
  });
  it('saves only what was filled in', () => {
    expect(reviewFieldsFromDraft({ ...EMPTY_DRAFT, primaryInterpretationId: 'nilm' })).toEqual({
      adequacySelections: undefined, generalCategorizationId: undefined, primaryInterpretationId: 'nilm', primaryInterpretationComment: undefined,
      additionalInterpretations: undefined, recommendations: undefined, notes: undefined, synopticData: undefined,
    });
  });
  it('a narrative is appended after a blank line; dirty means changed since loaded', () => {
    expect(notesWithNarrative('', 'N')).toBe('N');
    expect(notesWithNarrative('mine', 'N')).toBe('mine\n\nN');
    expect(isDraftDirty(draftFromReview(saved), draftFromReview(saved))).toBe(false);
    expect(isDraftDirty(EMPTY_DRAFT, draftFromReview(saved))).toBe(true);
  });
});
