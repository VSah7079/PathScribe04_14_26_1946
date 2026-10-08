// Batch 459 (PS-152): primary screen vs the review chosen as Final Diagnosis.
import { describe, it, expect } from 'vitest';
import { resolveCytologyFinalDiagnosisDiscordancePairs } from './resolveCytologyFinalDiagnosisDiscordancePairs';
import { resolveCytologyPrimaryVsFinalDiagnosisReport } from './resolveCytologyQaReports';
import type { CytologyCategoryEntry } from './ICytologyCategoryService';
import type { CytologyReviewRecord } from '@/types/cytology/CytologyReviewRecord';

const rank = (id: string, diagnosticRank: number): CytologyCategoryEntry => ({
  id, section: 'interpretation_result', nomenclatureSystem: 'bethesda', label: id, requiresPathologistReview: false,
  active: true, isSystem: true, sortOrder: 1, diagnosticRank,
});
const CATEGORIES: CytologyCategoryEntry[] = [rank('nilm', 0), rank('ascus', 1), rank('lsil', 2), rank('hsil', 4)];

const review = (o: Partial<CytologyReviewRecord>): CytologyReviewRecord => ({
  id: 'r', specimenId: 'S1', caseId: 'C1', role: 'primary_screen', primaryInterpretationId: 'nilm',
  recordedAt: '2026-01-01T00:00:00.000Z', recordedBy: { userId: 'u1', userName: 'Test User' }, ...o,
} as CytologyReviewRecord);

describe('resolveCytologyFinalDiagnosisDiscordancePairs', () => {
  it('pairs the first primary screen with the Final Diagnosis review, whatever its role', () => {
    const reviews = [
      review({ id: 'p2', recordedAt: '2026-01-03T00:00:00Z', primaryInterpretationId: 'ascus' }),
      review({ id: 'p1', recordedAt: '2026-01-02T00:00:00Z', primaryInterpretationId: 'nilm' }),
      review({ id: 'path', role: 'pathologist_review' as CytologyReviewRecord['role'], primaryInterpretationId: 'hsil' }),
    ];
    const pairs = resolveCytologyFinalDiagnosisDiscordancePairs(reviews, [{ specimenId: 'S1', caseId: 'C1', finalDiagnosisReviewRecordId: 'path' }]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].initial.id).toBe('p1');
    expect(pairs[0].followUp.id).toBe('path');
  });
  it('a primary screen chosen as Final Diagnosis counts as agreement', () => {
    const reviews = [review({ id: 'p1', primaryInterpretationId: 'lsil' })];
    const report = resolveCytologyPrimaryVsFinalDiagnosisReport(reviews, [{ specimenId: 'S1', caseId: 'C1', finalDiagnosisReviewRecordId: 'p1' }], CATEGORIES);
    expect(report.totalCompared).toBe(1);
    expect(report.exactCount).toBe(1);
  });
  it('leaves out a specimen with no primary screen, or a Final Diagnosis review that is missing', () => {
    const reviews = [
      review({ id: 'q', specimenId: 'S2', role: 'qc_random_selection', primaryInterpretationId: 'nilm' }),
      review({ id: 'p3', specimenId: 'S3' }),
    ];
    const pairs = resolveCytologyFinalDiagnosisDiscordancePairs(reviews, [
      { specimenId: 'S2', caseId: 'C2', finalDiagnosisReviewRecordId: 'q' },
      { specimenId: 'S3', caseId: 'C3', finalDiagnosisReviewRecordId: 'gone' },
    ]);
    expect(pairs).toEqual([]);
  });
  it('flags a major discrepancy between the screen and the Final Diagnosis', () => {
    const reviews = [
      review({ id: 'p1', primaryInterpretationId: 'nilm' }),
      review({ id: 'qc', role: 'qc_targeted_high_risk', primaryInterpretationId: 'hsil' }),
    ];
    const report = resolveCytologyPrimaryVsFinalDiagnosisReport(reviews, [{ specimenId: 'S1', caseId: 'C1', finalDiagnosisReviewRecordId: 'qc' }], CATEGORIES);
    expect(report.majorDiscrepancyCount).toBe(1);
  });
});
