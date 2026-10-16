// src/services/cytology/resolveCytologyFiveYearRetrospectiveLookbackReport.test.ts
import { describe, it, expect } from 'vitest';
import { resolveCytologyFiveYearRetrospectiveLookbackReport, type CytologyFiveYearLookbackSpecimenInput } from './resolveCytologyFiveYearRetrospectiveLookbackReport';

const flagged = (over: Partial<CytologyFiveYearLookbackSpecimenInput> = {}): CytologyFiveYearLookbackSpecimenInput => ({
  caseId: 'c1', specimenId: 'sp1', triggeredByCaseId: 'c0', triggeredAt: '2026-09-01T00:00:00.000Z', ...over,
});

describe('Batch 483 — resolveCytologyFiveYearRetrospectiveLookbackReport (CYT-QA-03, closing the CYT-QA-04 asymmetry)', () => {
  it('a flagged specimen with no outcome yet resolves to pending', () => {
    const report = resolveCytologyFiveYearRetrospectiveLookbackReport([flagged()]);
    expect(report.rows[0].status).toBe('pending');
    expect(report.pendingCount).toBe(1);
    expect(report.completedCount).toBe(0);
  });

  it('a flagged specimen with a recorded outcome resolves to completed', () => {
    const report = resolveCytologyFiveYearRetrospectiveLookbackReport([flagged({ outcome: 'confirmed_negative' })]);
    expect(report.rows[0].status).toBe('completed');
    expect(report.completedCount).toBe(1);
    expect(report.pendingCount).toBe(0);
  });

  it('completedPercent is a real, honest 0 (not undefined) when nothing is flagged', () => {
    const report = resolveCytologyFiveYearRetrospectiveLookbackReport([]);
    expect(report.totalFlagged).toBe(0);
    expect(report.completedPercent).toBe(0);
  });

  it('correctiveActionRatePercent is undefined when nothing has been completed yet, never a fabricated 0%', () => {
    const report = resolveCytologyFiveYearRetrospectiveLookbackReport([flagged()]);
    expect(report.correctiveActionRatePercent).toBeUndefined();
  });

  it('correctiveActionRatePercent counts only completed rows with a real, non-blank correctiveAction', () => {
    const report = resolveCytologyFiveYearRetrospectiveLookbackReport([
      flagged({ specimenId: 'sp1', outcome: 'screening_error', correctiveAction: 'CT retrained on HSIL morphology' }),
      flagged({ specimenId: 'sp2', outcome: 'confirmed_negative', correctiveAction: '   ' }),
      flagged({ specimenId: 'sp3', outcome: 'confirmed_negative' }),
    ]);
    expect(report.correctiveActionRatePercent).toBeCloseTo(100 / 3, 1);
  });

  it('byOutcome tallies each completed outcome category independently, never mixing them', () => {
    const report = resolveCytologyFiveYearRetrospectiveLookbackReport([
      flagged({ specimenId: 'sp1', outcome: 'confirmed_negative' }),
      flagged({ specimenId: 'sp2', outcome: 'confirmed_negative' }),
      flagged({ specimenId: 'sp3', outcome: 'interpretation_error' }),
      flagged({ specimenId: 'sp4' }), // pending — never counted in byOutcome
    ]);
    expect(report.byOutcome).toEqual({ confirmed_negative: 2, screening_error: 0, interpretation_error: 1, sampling_error: 0 });
  });

  it('real, multiple flagged specimens each resolve their own independent row and roll up correctly', () => {
    const report = resolveCytologyFiveYearRetrospectiveLookbackReport([
      flagged({ specimenId: 'sp1', outcome: 'confirmed_negative' }),
      flagged({ specimenId: 'sp2' }),
      flagged({ specimenId: 'sp3' }),
    ]);
    expect(report.totalFlagged).toBe(3);
    expect(report.completedCount).toBe(1);
    expect(report.pendingCount).toBe(2);
    expect(report.completedPercent).toBeCloseTo(100 / 3, 1);
  });
});
