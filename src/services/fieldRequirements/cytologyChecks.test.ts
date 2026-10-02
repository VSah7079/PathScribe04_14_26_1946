import { describe, it, expect } from 'vitest';
import { resolveFieldRequirements } from './fieldRequirementRules';
import { cytologyReviewMissing, cisoeaMissing, retrospectiveMissing, histologyCorrelationMissing, cytologyFieldRequired, cytologyCorrectionMissing, cytologyAddendumMissing, type CytologyReviewValues, type CisoeAValues } from './cytologyChecks';

const defaults = resolveFieldRequirements('cytology', {});
const on = (...ids: string[]) => resolveFieldRequirements('cytology', Object.fromEntries(ids.map(i => [i, true])));

const review: CytologyReviewValues = { generalCategorizationId: '', adequacyCount: 0, primaryInterpretationId: '', primaryInterpretationComment: '', additionalCount: 0, recommendationCount: 0, notes: '', lastMenstrualPeriod: '' };
const cisoea: CisoeAValues = {
  composition: '1', compositionComment: '', inflammation: '1', inflammationComment: '', squamous: '2', squamousComment: '',
  otherEndometrium: '0', otherEndometriumComment: '', endocervical: '1', endocervicalComment: '', adequacy: 'satisfactory', notes: '',
};

describe('cytology field requirements (Batch 386)', () => {
  it('a review by default needs only its primary interpretation, as before', () => {
    expect(cytologyReviewMissing(review, true, defaults)).toEqual(['reviewPrimaryInterpretation']);
    expect(cytologyReviewMissing({ ...review, primaryInterpretationId: 'c1' }, true, defaults)).toEqual([]);
  });
  it('an organisation can also require adequacy, recommendations, notes and the LMP (gynaecologic only)', () => {
    const reqs = on('reviewAdequacy', 'reviewRecommendations', 'reviewNotes', 'reviewLmp', 'reviewPrimaryComment');
    const v = { ...review, primaryInterpretationId: 'c1' };
    expect(cytologyReviewMissing(v, true, reqs)).toEqual(['reviewAdequacy', 'reviewPrimaryComment', 'reviewRecommendations', 'reviewNotes', 'reviewLmp']);
    expect(cytologyReviewMissing(v, false, reqs)).not.toContain('reviewLmp');
    expect(cytologyReviewMissing({ ...v, adequacyCount: 1, primaryInterpretationComment: 'x', recommendationCount: 1, notes: 'n', lastMenstrualPeriod: '2026-09-01' }, true, reqs)).toEqual([]);
  });
  it('the primary comment is only asked for once a primary is chosen', () => {
    expect(cytologyReviewMissing(review, true, on('reviewPrimaryComment'))).toEqual(['reviewPrimaryInterpretation']);
  });
  it('a CISOE-A review needs all six components; comments mean every axis, notes are a switch', () => {
    expect(cisoeaMissing(cisoea, defaults)).toEqual([]);
    expect(cisoeaMissing({ ...cisoea, squamous: ' ', adequacy: '' }, defaults)).toEqual(['cisoeaSquamous', 'cisoeaAdequacy']);
    const reqs = on('cisoeaComments', 'cisoeaNotes');
    expect(cisoeaMissing(cisoea, reqs)).toEqual(['cisoeaComments', 'cisoeaNotes']);
    expect(cisoeaMissing({ ...cisoea, notes: 'n', compositionComment: 'a', inflammationComment: 'a', squamousComment: 'a', otherEndometriumComment: 'a', endocervicalComment: 'a' }, reqs)).toEqual([]);
  });
  it('a retrospective review needs an outcome; a corrective action only when asked, and not for Confirmed Negative', () => {
    expect(retrospectiveMissing('', '', defaults)).toEqual(['retroOutcome']);
    expect(retrospectiveMissing('screening_error', '', defaults)).toEqual([]);
    const reqs = on('retroCorrectiveAction');
    expect(retrospectiveMissing('screening_error', '', reqs)).toEqual(['retroCorrectiveAction']);
    expect(retrospectiveMissing('confirmed_negative', '', reqs)).toEqual([]);
    expect(retrospectiveMissing('', '', reqs)).toEqual(['retroOutcome']);
  });
  it('a manual histology correlation needs the diagnosis and the outcome', () => {
    expect(histologyCorrelationMissing(' ', '', defaults)).toEqual(['histologyDiagnosis', 'histologyOutcome']);
    expect(histologyCorrelationMissing('CIN III', 'concordant', defaults)).toEqual([]);
  });
  it('locked fields cannot be switched off', () => {
    expect(cytologyFieldRequired(resolveFieldRequirements('cytology', { reviewPrimaryInterpretation: false }), 'reviewPrimaryInterpretation')).toBe(true);
  });
});

describe('correction and addendum requirements (Batch 390, PS-340)', () => {
  const draft = { generalCategorizationId: '', adequacySelections: [], primaryInterpretationId: 'c1', primaryInterpretationComment: '', additionalInterpretations: [], recommendations: [] };

  it('a correction always needs its reason, and the primary interpretation', () => {
    expect(cytologyCorrectionMissing(draft, '', defaults)).toEqual(['revisionReason']);
    expect(cytologyCorrectionMissing(draft, '  ', defaults)).toEqual(['revisionReason']);
    expect(cytologyCorrectionMissing({ ...draft, primaryInterpretationId: '' }, 'why', defaults)).toEqual(['reviewPrimaryInterpretation']);
    expect(cytologyCorrectionMissing(draft, 'why', defaults)).toEqual([]);
  });
  it('a correction follows the organisation\'s review switches, but never asks for notes or the LMP', () => {
    const reqs = on('reviewAdequacy', 'reviewNotes', 'reviewLmp');
    expect(cytologyCorrectionMissing(draft, 'why', reqs)).toEqual(['reviewAdequacy']);
  });
  it('an addendum needs its text and its reason', () => {
    expect(cytologyAddendumMissing('', '', defaults)).toEqual(expect.arrayContaining(['revisionReason', 'revisionAddendumText']));
    expect(cytologyAddendumMissing('HPV 16 positive.', '', defaults)).toEqual(['revisionReason']);
    expect(cytologyAddendumMissing('', 'why', defaults)).toEqual(['revisionAddendumText']);
    expect(cytologyAddendumMissing('HPV 16 positive.', 'why', defaults)).toEqual([]);
  });
  it('both are locked: an organisation cannot switch them off', () => {
    const rev = resolveFieldRequirements('cytology', { revisionReason: false, revisionAddendumText: false }).filter(f => f.group === 'cytologyRevision');
    expect(rev.map(f => f.id)).toEqual(['revisionReason', 'revisionAddendumText']);
    expect(rev.every(f => f.required && f.locked)).toBe(true);
  });
});
