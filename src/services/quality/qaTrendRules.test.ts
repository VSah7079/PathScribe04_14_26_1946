// PS-147 (Batch 442): discordance patterns against each site's own policy.
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_QA_TREND_POLICY, DEFAULT_QA_TREND_POLICY_SETTINGS, applyQaTrendDecision, effectiveQaTrendPolicy, newQaTrendRecommendations,
  qaTrendCandidates, qaTrendDecisionProblem, qaTrendPolicyChange, qaTrendPolicyProblem, qaTrendQueueOrder, toggledMajorSeverity,
  trendTrigger, withLabQaTrendPolicy, type TrendRecord,
} from './qaTrendRules';
import type { QaTrendPolicySettings, QaTrendRecommendation } from '@/types/quality/QaTrend';
import { reviewedPathologistOf } from './surgicalQaReview';

const NOW = new Date('2026-10-02T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();
let seq = 0;
const rec = (o: { who?: string; outcome?: 'concordant' | 'discordant'; sev?: 'low' | 'medium' | 'high'; at?: number; lab?: string; type?: string }): TrendRecord => ({
  record: {
    id: `r${++seq}`, outcome: o.outcome ?? 'concordant', severity: o.sev, recordedAt: daysAgo(o.at ?? 10),
    ...(o.who ? { reviewedPathologist: { userId: o.who, userName: `Dr ${o.who}` } } : {}),
  },
  performingLabId: o.lab,
  specimenType: o.type ? { id: o.type, name: o.type } : undefined,
});
const many = (n: number, o: Parameters<typeof rec>[0]) => Array.from({ length: n }, () => rec(o));
const settings = (over: Partial<typeof DEFAULT_QA_TREND_POLICY> = {}, labs: QaTrendPolicySettings['performingLabs'] = {}): QaTrendPolicySettings =>
  ({ orgDefault: { ...DEFAULT_QA_TREND_POLICY, ...over }, performingLabs: labs });

describe('the developer\'s proposal as the starting policy (all editable)', () => {
  it('3 months, 20 reviews, 3 majors or 10%, major = high, a decision for the Lab Director', () => {
    expect(DEFAULT_QA_TREND_POLICY).toMatchObject({ rollingWindowMonths: 3, minSampleSize: 20, countThreshold: 3, rateThresholdPercent: 10, majorSeverities: ['high'], action: 'review-task' });
  });
  it('the verification matrix from the ticket', () => {
    const p = DEFAULT_QA_TREND_POLICY;
    expect(trendTrigger(12, 2, p)).toBeNull();           // low volume: floor not met
    expect(trendTrigger(25, 3, p)).toBe('both');         // 3 in 25 = 12%
    expect(trendTrigger(20, 2, p)).toBe('rate');         // 2 in 20 = 10%
    expect(trendTrigger(40, 3, p)).toBe('count');        // 3 in 40 = 7.5%
    expect(trendTrigger(40, 2, p)).toBeNull();
  });
  it('a test set to 0 is off', () => {
    expect(trendTrigger(20, 2, { ...DEFAULT_QA_TREND_POLICY, rateThresholdPercent: 0 })).toBeNull();
    expect(trendTrigger(40, 3, { ...DEFAULT_QA_TREND_POLICY, countThreshold: 0 })).toBeNull();
  });
});

describe('the site\'s policy', () => {
  it('a performing lab\'s own policy wins; others use the organisation\'s', () => {
    const own = { ...DEFAULT_QA_TREND_POLICY, minSampleSize: 50 };
    const s = settings({}, { L2: own });
    expect(effectiveQaTrendPolicy(s, 'L2')).toBe(own);
    expect(effectiveQaTrendPolicy(s, 'L1')).toBe(s.orgDefault);
    expect(effectiveQaTrendPolicy(withLabQaTrendPolicy(s, 'L2', null), 'L2')).toBe(s.orgDefault);
  });
  it('refuses a policy that can\'t work', () => {
    expect(qaTrendPolicyProblem(DEFAULT_QA_TREND_POLICY)).toBeNull();
    expect(qaTrendPolicyProblem({ ...DEFAULT_QA_TREND_POLICY, rollingWindowMonths: 0 })).toBe('windowOutOfRange');
    expect(qaTrendPolicyProblem({ ...DEFAULT_QA_TREND_POLICY, minSampleSize: 0 })).toBe('sampleOutOfRange');
    expect(qaTrendPolicyProblem({ ...DEFAULT_QA_TREND_POLICY, rateThresholdPercent: 120 })).toBe('rateOutOfRange');
    expect(qaTrendPolicyProblem({ ...DEFAULT_QA_TREND_POLICY, majorSeverities: [] })).toBe('noMajorSeverity');
    expect(qaTrendPolicyProblem({ ...DEFAULT_QA_TREND_POLICY, countThreshold: 0, rateThresholdPercent: 0 })).toBe('noTest');
  });
  it('severities stay in order when toggled', () => {
    expect(toggledMajorSeverity(DEFAULT_QA_TREND_POLICY, 'medium').majorSeverities).toEqual(['medium', 'high']);
    expect(toggledMajorSeverity(DEFAULT_QA_TREND_POLICY, 'high').majorSeverities).toEqual([]);
  });
  it('the audit text names what changed, in English', () => {
    const after = withLabQaTrendPolicy(settings(), 'L2', { ...DEFAULT_QA_TREND_POLICY, minSampleSize: 50 });
    expect(qaTrendPolicyChange(DEFAULT_QA_TREND_POLICY_SETTINGS, after, id => `Lab ${id}`)).toContain('Lab L2: pathologist on, specimen type on, 3 months, at least 50 reviews');
    expect(qaTrendPolicyChange(after, after, id => id)).toBeNull();
  });
});

describe('the patterns', () => {
  it('a pathologist: only reviewed work, in the window, completed reviews; majors are discordant at a major severity', () => {
    const records = [
      ...many(35, { who: 'P1' }),
      ...many(3, { who: 'P1', outcome: 'discordant', sev: 'high' }),
      ...many(2, { who: 'P1', outcome: 'discordant', sev: 'low' }),   // minor variance: reviewed, not major
      ...many(5, { who: 'P1', outcome: 'discordant', sev: 'high', at: 120 }), // outside 3 months
    ];
    const [c] = qaTrendCandidates(records, settings(), NOW);
    expect(c).toMatchObject({ kind: 'pathologist', subjectId: 'P1', totalReviewed: 40, majorCount: 3, ratePercent: 7.5, trigger: 'count' });
  });
  it('the specimen-type pattern counts every reader; each lab is judged by its own policy', () => {
    const records = [
      ...many(10, { who: 'P1', type: 'Breast', outcome: 'discordant', sev: 'high', lab: 'L1' }),
      ...many(10, { who: 'P2', type: 'Breast', lab: 'L1' }),
    ];
    const strict = settings({}, { L1: { ...DEFAULT_QA_TREND_POLICY, minSampleSize: 50 } });
    expect(qaTrendCandidates(records, settings(), NOW).find(c => c.kind === 'specimen-type')?.trigger).toBe('both');
    expect(qaTrendCandidates(records, strict, NOW).find(c => c.kind === 'specimen-type')?.trigger).toBeNull();
  });
  it('either pattern can be switched off', () => {
    const records = many(20, { who: 'P1', type: 'Breast', outcome: 'discordant', sev: 'high' });
    expect(qaTrendCandidates(records, settings({ pathologistTrendEnabled: false }), NOW).map(c => c.kind)).toEqual(['specimen-type']);
    expect(qaTrendCandidates(records, settings({ specimenTypeTrendEnabled: false }), NOW).map(c => c.kind)).toEqual(['pathologist']);
  });
});

describe('recommendations', () => {
  const crossed = () => qaTrendCandidates(many(20, { who: 'P1', outcome: 'discordant', sev: 'high' }), settings({ specimenTypeTrendEnabled: false }), NOW);
  it('one per crossed group, none while one is open; "notify-only" makes a note, not a request', () => {
    let n = 0;
    const cands = crossed();
    const [first] = newQaTrendRecommendations(cands, [], NOW, () => `t${++n}`);
    expect(first).toMatchObject({ kind: 'pathologist', subjectId: 'P1', status: 'recommended', trigger: 'both' });
    expect(newQaTrendRecommendations(cands, [first], NOW, () => 'x')).toEqual([]);
    // Concluded: not raised again on the same majors (found in the browser, Batch 442)…
    expect(newQaTrendRecommendations(cands, [{ ...first, status: 'dismissed' }], NOW, () => 'again')).toEqual([]);
    expect(newQaTrendRecommendations(cands, [{ ...first, status: 'capa-opened' }], NOW, () => 'again')).toEqual([]);
    // …but raised again when a new major discordance arrives.
    expect(newQaTrendRecommendations(cands, [{ ...first, status: 'dismissed', qualifyingRecordIds: first.qualifyingRecordIds.slice(1) }], NOW, () => 'again')).toHaveLength(1);
    const notify = qaTrendCandidates(many(20, { who: 'P1', outcome: 'discordant', sev: 'high' }), settings({ action: 'notify-only' }), NOW);
    expect(newQaTrendRecommendations(notify, [], NOW, () => 'y')[0].status).toBe('noted');
  });
  it('a CAPA only after a review was started, with a note; dismissal needs a reason; never a second decision', () => {
    const r = { status: 'recommended' } as QaTrendRecommendation;
    expect(qaTrendDecisionProblem(r, { kind: 'open-capa', note: 'x' })).toBe('notUnderReview');
    expect(qaTrendDecisionProblem(r, { kind: 'dismiss', note: ' ' })).toBe('noteRequired');
    expect(qaTrendDecisionProblem(r, { kind: 'start-review' })).toBeNull();
    expect(qaTrendDecisionProblem({ status: 'under-review' } as QaTrendRecommendation, { kind: 'open-capa', note: 'Focused review agreed' })).toBeNull();
    expect(qaTrendDecisionProblem({ status: 'dismissed' } as QaTrendRecommendation, { kind: 'start-review' })).toBe('notOpen');
    const decided = applyQaTrendDecision({ ...r, id: 'a' } as QaTrendRecommendation, { kind: 'dismiss', note: ' Explained by case mix ' }, { userId: 'D', userName: 'Dir' }, 't');
    expect(decided).toMatchObject({ status: 'dismissed', note: 'Explained by case mix', decidedBy: { userId: 'D' } });
  });
  it('the list: waiting ones first, closed ones only when asked', () => {
    const r = (id: string, status: QaTrendRecommendation['status'], createdAt: string) => ({ id, status, createdAt }) as QaTrendRecommendation;
    const list = [r('a', 'noted', '3'), r('b', 'dismissed', '9'), r('c', 'recommended', '1'), r('d', 'under-review', '2')];
    expect(qaTrendQueueOrder(list, false).map(x => x.id)).toEqual(['c', 'd', 'a']);
    expect(qaTrendQueueOrder(list, true).map(x => x.id)).toEqual(['c', 'd', 'a', 'b']);
  });
});

describe('retrospective surgical peer review names whose work it reviewed', () => {
  it('the active primary, else the assignee', () => {
    const p = (staffId: string, types: string[], status: 'active' | 'removed' = 'active') => ({ staffId, staffName: `Dr ${staffId}`, participationTypeIds: types, status }) as never;
    expect(reviewedPathologistOf({ participants: [p('P1', ['primary'])], order: { assignedTo: 'P9' } } as never)).toEqual({ userId: 'P1', userName: 'Dr P1' });
    expect(reviewedPathologistOf({ participants: [p('P1', ['primary'], 'removed')], order: { assignedTo: 'P9' } } as never)).toEqual({ userId: 'P9', userName: 'P9' });
    expect(reviewedPathologistOf({ participants: [], order: {} } as never)).toBeUndefined();
  });
});
