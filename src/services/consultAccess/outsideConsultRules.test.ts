// PS-148 (Batch 439): assessing an outside consultant's opinion.
import { describe, it, expect } from 'vitest';
import { assessmentProblem, outsideConsultQaRecord, reportReleased, OUTSIDE_CONSULT_CORRELATION_ACTIVITY_TYPE_ID } from './outsideConsultRules';
import { qaRecordRecommendation } from '../quality/capaRecommendationRules';

const rule = { capaTriggerRule: { triggerSeverities: ['high' as const], deficiencyTypeId: 'def-outside-consult-discordance', postSignOutOnly: true } };
const base = {
  caseId: 'c1', caseType: 'Breast', consultant: 'Dr Outside', opinionText: 'Favour DCIS, no invasion.',
  actor: { userId: 'u-a', userName: 'Dr A' },
};

describe('outside consult assessment', () => {
  it('released means signed out and past the release buffer', () => {
    expect(reportReleased('finalized')).toBe(true);
    expect(reportReleased('closed')).toBe(true);
    expect(reportReleased('pending-release')).toBe(false);
    expect(reportReleased('in-progress')).toBe(false);
  });
  it('only a signed opinion, once; a difference needs a note', () => {
    expect(assessmentProblem({ signedStatus: 'Draft' }, 'agrees', undefined)).toBe('NOT_SIGNED');
    expect(assessmentProblem({ signedStatus: 'Signed', assessment: 'agrees' }, 'agrees', undefined)).toBe('ALREADY_ASSESSED');
    expect(assessmentProblem({ signedStatus: 'Signed' }, undefined, undefined)).toBe('ASSESSMENT_REQUIRED');
    expect(assessmentProblem({ signedStatus: 'Signed' }, 'major-discordance', '')).toBe('NOTE_REQUIRED');
    expect(assessmentProblem({ signedStatus: 'Signed' }, 'agrees', undefined)).toBeNull();
  });
  it('a major discordance on a released report recommends a CAPA (PS-148); before release it does not', () => {
    const after = outsideConsultQaRecord({ ...base, assessment: 'major-discordance', note: 'Invasion not confirmed', released: true });
    const before = outsideConsultQaRecord({ ...base, assessment: 'major-discordance', note: 'Invasion not confirmed', released: false });
    expect(after).toMatchObject({ activityTypeId: OUTSIDE_CONSULT_CORRELATION_ACTIVITY_TYPE_ID, outcome: 'discordant', severity: 'high', postSignOut: true });
    expect(qaRecordRecommendation(after, rule)).toEqual({ source: 'post-signout-discordance', deficiencyTypeId: 'def-outside-consult-discordance' });
    expect(qaRecordRecommendation(before, rule)).toBeNull();
  });
  it('a minor difference or agreement never recommends', () => {
    expect(qaRecordRecommendation(outsideConsultQaRecord({ ...base, assessment: 'minor-difference', note: 'Grade 2 vs 3', released: true }), rule)).toBeNull();
    expect(outsideConsultQaRecord({ ...base, assessment: 'agrees', released: true }).outcome).toBe('concordant');
  });
});
