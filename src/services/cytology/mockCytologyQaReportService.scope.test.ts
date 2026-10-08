// Batch 450 (PS-216, PS-217): what two Cytology QA reports actually contain,
// for a chosen scope. The report service reads its stores through modules;
// each is replaced here with a small, known data set so the counts and rates
// can be checked exactly.
import { describe, it, expect, vi, beforeAll } from 'vitest';
import type { CytologyReviewRecord } from '@/types/cytology/CytologyReviewRecord';

const data = vi.hoisted(() => {
  const at = (h: number) => `2026-09-${String(10 + h).padStart(2, '0')}T00:00:00.000Z`;
  const by = (userId: string) => ({ userId, userName: userId });
  const review = (id: string, caseId: string, specimenId: string, role: string, primaryInterpretationId: string, day: number) =>
    ({ id, caseId, specimenId, role, primaryInterpretationId, recordedAt: at(day), recordedBy: by(role === 'pathologist_review' ? 'PATH' : 'CT') });
  const fd = (reviewRecordId: string) => ({ cytologyScreening: { finalDiagnosis: { reviewRecordId, primaryInterpretationId: '' } } });
  const cases = [
    { id: 'C1', order: { facilityId: 'F1' }, specimens: [
      { id: 'S1', ...fd('r1-path') },   // pathologist_review HSIL as the Final Diagnosis; peer review HSIL: exact
      { id: 'S2', ...fd('r2-p') },      // primary ASC-US; peer review LSIL: minor
      { id: 'S5', cytologyScreening: {} }, // a peer review but no Final Diagnosis: no pair
    ] },
    { id: 'C2', order: { facilityId: 'F2' }, specimens: [
      { id: 'S3', ...fd('r3-p') },      // primary NILM; the latest peer review HSIL: major, false negative
      { id: 'S4', ...fd('r4-p') },      // no peer review: no pair
    ] },
  ];
  const reviews = [
    review('r1-p', 'C1', 'S1', 'primary_screen', 'nilm', 1),
    review('r1-path', 'C1', 'S1', 'pathologist_review', 'hsil', 2),
    review('r1-peer', 'C1', 'S1', 'post_signout_peer_review_random', 'hsil', 3),
    review('r2-p', 'C1', 'S2', 'primary_screen', 'ascus', 1),
    review('r2-peer', 'C1', 'S2', 'post_signout_peer_review_targeted', 'lsil', 3),
    review('r5-peer', 'C1', 'S5', 'post_signout_peer_review_random', 'hsil', 3),
    review('r3-p', 'C2', 'S3', 'primary_screen', 'nilm', 1),
    review('r3-peer-old', 'C2', 'S3', 'post_signout_peer_review_random', 'nilm', 2),
    review('r3-peer', 'C2', 'S3', 'post_signout_peer_review_targeted', 'hsil', 4),
    review('r4-p', 'C2', 'S4', 'primary_screen', 'lsil', 1),
  ];
  const cat = (id: string, diagnosticRank: number) => ({ id, label: id.toUpperCase(), section: 'interpretation_result', diagnosticRank, requiresPathologistReview: false, active: true });
  const categories = [cat('nilm', 0), cat('ascus', 1), cat('lsil', 2), cat('hsil', 4)];
  const qaRecord = (id: string, activityTypeId: string, caseId: string, outcome: string) =>
    ({ id, activityTypeId, caseId, specimenId: 'S1', caseType: 'Pap', fieldValues: { trigger: 'qc_random_selection' }, outcome, recordedBy: by('CT'), recordedAt: at(5) });
  const qaRecords = [
    qaRecord('qa-1', 'qa-activity-gyn-cytology-secondary-screening', 'C1', 'discordant'),
    qaRecord('qa-2', 'qa-activity-gyn-cytology-secondary-screening', 'C2', 'concordant'),
    qaRecord('qa-3', 'qa-activity-cyto-histo', 'C1', 'discordant'),
    qaRecord('qa-4', 'qa-activity-frozen-final', 'C2', 'discordant'),
  ];
  return { cases, reviews, categories, qaRecords };
});

vi.mock('./mockCytologyReviewRecordService', () => ({ mockCytologyReviewRecordService: { getAll: async () => ({ ok: true, data: data.reviews }) } }));
vi.mock('./mockCytologyCategoryService', () => ({ mockCytologyCategoryService: { getAll: async () => ({ ok: true, data: data.categories }) } }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getAll: async () => ({ ok: true, data: data.cases }) } }));
vi.mock('@/services/auth/caseAccessControl', () => ({ getSessionUser: () => null, canViewCrossTenantQaData: () => false }));
vi.mock('@/services', () => ({ qaActivityRecordService: { getAll: async () => ({ ok: true, data: data.qaRecords }) } }));

import type { mockCytologyQaReportService as ServiceType } from './mockCytologyQaReportService';
import { resolveCytologyPostSignOutPeerReviewCorrelationReport } from './resolveCytologyQaReports';
let service: typeof ServiceType;

beforeAll(async () => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
  ({ mockCytologyQaReportService: service } = await import('./mockCytologyQaReportService'));
});

describe('Post-Sign-Out Peer Review correlation report contents (PS-216)', () => {
  it('enterprise: each Final Diagnosis paired with its latest peer review, with counts and agreement/discrepancy rates', async () => {
    const res = await service.getPostSignOutPeerReviewCorrelationReport({ level: 'enterprise' });
    if (!res.ok) throw new Error('report failed');
    const r = res.data;
    expect(r).toMatchObject({
      totalCompared: 3, exactCount: 1, minorDiscrepancyCount: 1, majorDiscrepancyCount: 1,
      majorFalseNegativeCount: 1, majorFalsePositiveCount: 0, diagnosticUpgradeCount: 2, diagnosticDowngradeCount: 0,
    });
    expect(r.overallAgreementPercent).toBeCloseTo(100 / 3);
    expect(r.majorConcordancePercent).toBeCloseTo(200 / 3);
    expect(r.falseNegativeRatePercent).toBeCloseTo(100 / 3);
    expect(r.comparisons.map(c => [c.specimenId, c.initialInterpretationId, c.followUpInterpretationId, c.level])).toEqual([
      ['S1', 'hsil', 'hsil', 'exact'],
      ['S2', 'ascus', 'lsil', 'minor_discrepancy'],
      ['S3', 'nilm', 'hsil', 'major_discrepancy'],
    ]);
  });

  it('a client scope counts only that client\'s cases', async () => {
    const f1 = await service.getPostSignOutPeerReviewCorrelationReport({ level: 'client', clientId: 'F1' });
    const f2 = await service.getPostSignOutPeerReviewCorrelationReport({ level: 'client', clientId: 'F2' });
    if (!f1.ok || !f2.ok) throw new Error('report failed');
    expect(f1.data).toMatchObject({ totalCompared: 2, exactCount: 1, minorDiscrepancyCount: 1, majorDiscrepancyCount: 0, overallAgreementPercent: 50, majorConcordancePercent: 100, falseNegativeRatePercent: 0 });
    expect(f2.data).toMatchObject({ totalCompared: 1, majorDiscrepancyCount: 1, majorFalseNegativeCount: 1, overallAgreementPercent: 0, majorConcordancePercent: 0, falseNegativeRatePercent: 100 });
    expect(f2.data.comparisons.map(c => c.caseId)).toEqual(['C2']);
  });

  it('a client with no cases gets an empty report, all rates zero', async () => {
    const res = await service.getPostSignOutPeerReviewCorrelationReport({ level: 'client', clientId: 'F-NONE' });
    if (!res.ok) throw new Error('report failed');
    expect(res.data).toMatchObject({ totalCompared: 0, overallAgreementPercent: 0, majorConcordancePercent: 0, falseNegativeRatePercent: 0, comparisons: [] });
  });

  it('resolveCytologyPostSignOutPeerReviewCorrelationReport: the same report from reviews and Final Diagnosis references directly', () => {
    const report = resolveCytologyPostSignOutPeerReviewCorrelationReport(
      data.reviews as unknown as CytologyReviewRecord[],
      [
        { caseId: 'C1', specimenId: 'S2', finalDiagnosisReviewRecordId: 'r2-p' },
        { caseId: 'C2', specimenId: 'S3', finalDiagnosisReviewRecordId: 'r3-p' },
        { caseId: 'C2', specimenId: 'S4', finalDiagnosisReviewRecordId: 'r4-p' },
        { caseId: 'C9', specimenId: 'S9', finalDiagnosisReviewRecordId: 'missing' },
      ],
      data.categories as never,
    );
    expect(report).toMatchObject({ totalCompared: 2, minorDiscrepancyCount: 1, majorDiscrepancyCount: 1, majorFalseNegativeCount: 1, overallAgreementPercent: 0, majorConcordancePercent: 50, falseNegativeRatePercent: 50 });
    expect(report.comparisons[1]).toMatchObject({ followUpInterpretationLabel: 'HSIL', followUpRecordedAt: '2026-09-14T00:00:00.000Z' });
  });
});

describe('Secondary Screening Audit report (PS-217)', () => {
  it('enterprise: only GYN Cytology Secondary Screening records, from every client', async () => {
    const res = await service.getGynCytologySecondaryScreeningAuditReport({ level: 'enterprise' });
    if (!res.ok) throw new Error('report failed');
    expect(res.data.map(r => r.id)).toEqual(['qa-1', 'qa-2']);
  });

  it('a client scope returns only that client\'s secondary-screening records', async () => {
    const f1 = await service.getGynCytologySecondaryScreeningAuditReport({ level: 'client', clientId: 'F1' });
    const f2 = await service.getGynCytologySecondaryScreeningAuditReport({ level: 'client', clientId: 'F2' });
    const none = await service.getGynCytologySecondaryScreeningAuditReport({ level: 'client', clientId: 'F-NONE' });
    if (!f1.ok || !f2.ok || !none.ok) throw new Error('report failed');
    expect(f1.data.map(r => r.id)).toEqual(['qa-1']);
    expect(f2.data.map(r => r.id)).toEqual(['qa-2']);
    expect(none.data).toEqual([]);
  });
});
