import { describe, it, expect } from 'vitest';
import { resolveSurgicalBiopsyToResectionCorrelationCandidates, type SurgicalBiopsySpecimenInfo } from './resolveSurgicalBiopsyToResectionCorrelationCandidates';

function spec(overrides: Partial<SurgicalBiopsySpecimenInfo> & Pick<SurgicalBiopsySpecimenInfo, 'caseId' | 'specimenId' | 'receivedAt'>): SurgicalBiopsySpecimenInfo {
  return { ...overrides };
}

describe('resolveSurgicalBiopsyToResectionCorrelationCandidates - time window + patient scoping', () => {
  it('flags a same-patient pair within the window as a candidate', () => {
    const specimens = [
      spec({ caseId: 'case-1', specimenId: 'spec-1', receivedAt: '2026-01-01T00:00:00.000Z' }),
      spec({ caseId: 'case-2', specimenId: 'spec-2', receivedAt: '2026-02-01T00:00:00.000Z' }),
    ];
    const result = resolveSurgicalBiopsyToResectionCorrelationCandidates(specimens, 180);
    expect(result).toEqual([{ earlierCaseId: 'case-1', earlierSpecimenId: 'spec-1', laterCaseId: 'case-2', laterSpecimenId: 'spec-2', siteMatchStatus: 'unknown' }]);
  });

  it('never flags a pair outside the configured window', () => {
    const specimens = [
      spec({ caseId: 'case-1', specimenId: 'spec-1', receivedAt: '2026-01-01T00:00:00.000Z' }),
      spec({ caseId: 'case-2', specimenId: 'spec-2', receivedAt: '2026-12-01T00:00:00.000Z' }),
    ];
    expect(resolveSurgicalBiopsyToResectionCorrelationCandidates(specimens, 180)).toEqual([]);
  });

  it('never flags two specimens belonging to the same case against each other', () => {
    const specimens = [
      spec({ caseId: 'case-1', specimenId: 'spec-1', receivedAt: '2026-01-01T00:00:00.000Z' }),
      spec({ caseId: 'case-1', specimenId: 'spec-2', receivedAt: '2026-01-02T00:00:00.000Z' }),
    ];
    expect(resolveSurgicalBiopsyToResectionCorrelationCandidates(specimens, 180)).toEqual([]);
  });

  it('pairs every eligible combination when more than two specimens fall in the window', () => {
    const specimens = [
      spec({ caseId: 'case-1', specimenId: 'spec-1', receivedAt: '2026-01-01T00:00:00.000Z' }),
      spec({ caseId: 'case-2', specimenId: 'spec-2', receivedAt: '2026-01-15T00:00:00.000Z' }),
      spec({ caseId: 'case-3', specimenId: 'spec-3', receivedAt: '2026-02-01T00:00:00.000Z' }),
    ];
    const result = resolveSurgicalBiopsyToResectionCorrelationCandidates(specimens, 180);
    expect(result).toHaveLength(3); // (1,2) (1,3) (2,3)
  });
});

describe('resolveSurgicalBiopsyToResectionCorrelationCandidates - anatomic site/laterality false-positive prevention', () => {
  it('excludes a pair with a real, recorded site mismatch — the real false-positive-prevention case this ticket exists for', () => {
    const specimens = [
      spec({ caseId: 'case-1', specimenId: 'spec-1', receivedAt: '2026-01-01T00:00:00.000Z', bodySite: 'Breast' }),
      spec({ caseId: 'case-2', specimenId: 'spec-2', receivedAt: '2026-02-01T00:00:00.000Z', bodySite: 'Colon' }),
    ];
    expect(resolveSurgicalBiopsyToResectionCorrelationCandidates(specimens, 180)).toEqual([]);
  });

  it('includes a pair with matching site, marked "matched"', () => {
    const specimens = [
      spec({ caseId: 'case-1', specimenId: 'spec-1', receivedAt: '2026-01-01T00:00:00.000Z', bodySite: 'Breast' }),
      spec({ caseId: 'case-2', specimenId: 'spec-2', receivedAt: '2026-02-01T00:00:00.000Z', bodySite: 'breast' }),
    ];
    const result = resolveSurgicalBiopsyToResectionCorrelationCandidates(specimens, 180);
    expect(result[0].siteMatchStatus).toBe('matched');
  });

  it('excludes a pair with matching site but a real laterality mismatch', () => {
    const specimens = [
      spec({ caseId: 'case-1', specimenId: 'spec-1', receivedAt: '2026-01-01T00:00:00.000Z', bodySite: 'Breast', laterality: 'Left' }),
      spec({ caseId: 'case-2', specimenId: 'spec-2', receivedAt: '2026-02-01T00:00:00.000Z', bodySite: 'Breast', laterality: 'Right' }),
    ];
    expect(resolveSurgicalBiopsyToResectionCorrelationCandidates(specimens, 180)).toEqual([]);
  });

  it('never excludes a pair just because one specimen has no site recorded — missing data is not evidence of a mismatch', () => {
    const specimens = [
      spec({ caseId: 'case-1', specimenId: 'spec-1', receivedAt: '2026-01-01T00:00:00.000Z', bodySite: 'Breast' }),
      spec({ caseId: 'case-2', specimenId: 'spec-2', receivedAt: '2026-02-01T00:00:00.000Z' }),
    ];
    const result = resolveSurgicalBiopsyToResectionCorrelationCandidates(specimens, 180);
    expect(result).toHaveLength(1);
    expect(result[0].siteMatchStatus).toBe('unknown');
  });

  it('a matching site but only one specimen carrying laterality is still "matched", not penalized for the missing side', () => {
    const specimens = [
      spec({ caseId: 'case-1', specimenId: 'spec-1', receivedAt: '2026-01-01T00:00:00.000Z', bodySite: 'Breast', laterality: 'Left' }),
      spec({ caseId: 'case-2', specimenId: 'spec-2', receivedAt: '2026-02-01T00:00:00.000Z', bodySite: 'Breast' }),
    ];
    const result = resolveSurgicalBiopsyToResectionCorrelationCandidates(specimens, 180);
    expect(result[0].siteMatchStatus).toBe('matched');
  });
});

// Batch 453: the window is the configured rule, from collection by default.
import { DEFAULT_BIOPSY_RESECTION_RULE } from './resolveSurgicalBiopsyToResectionCorrelationCandidates';

describe('resolveSurgicalBiopsyToResectionCorrelationCandidates - configured window (Batch 453)', () => {
  const DAY = 86_400_000;
  const t0 = '2026-01-01T00:00:00.000Z';
  const at = (d: number) => new Date(Date.parse(t0) + d * DAY).toISOString();

  it('by default runs 180 days from the biopsy\'s collection, so a resection 175 days after collection matches even if the biopsy was received 10 days late', () => {
    const specimens = [
      spec({ caseId: 'bx', specimenId: 'b1', collectedAt: t0, receivedAt: at(10) }),
      spec({ caseId: 'rx', specimenId: 'r1', collectedAt: at(175), receivedAt: at(186) }),
    ];
    expect(DEFAULT_BIOPSY_RESECTION_RULE).toMatchObject({ windowDays: 180, anchor: 'collection' });
    expect(resolveSurgicalBiopsyToResectionCorrelationCandidates(specimens)).toHaveLength(1);
    // A resection collected on day 195 is outside the window:
    expect(resolveSurgicalBiopsyToResectionCorrelationCandidates([specimens[0], spec({ caseId: 'rx', specimenId: 'r1', collectedAt: at(195), receivedAt: at(196) })])).toEqual([]);
  });

  it('follows a facility rule: a shorter window, or one anchored on the earlier case\'s sign-out', () => {
    const specimens = [
      spec({ caseId: 'bx', specimenId: 'b1', collectedAt: t0, receivedAt: at(1), signedOutAt: at(20) }),
      spec({ caseId: 'rx', specimenId: 'r1', collectedAt: at(100), receivedAt: at(101) }),
    ];
    expect(resolveSurgicalBiopsyToResectionCorrelationCandidates(specimens, { windowDays: 90, anchor: 'collection', source: 'facility' })).toEqual([]);
    expect(resolveSurgicalBiopsyToResectionCorrelationCandidates(specimens, { windowDays: 90, anchor: 'signOut', source: 'facility' })).toHaveLength(1);
  });

  it('a specimen with no usable date is skipped, not treated as day zero', () => {
    const specimens = [spec({ caseId: 'bx', specimenId: 'b1' } as never), spec({ caseId: 'rx', specimenId: 'r1', collectedAt: t0 })];
    expect(resolveSurgicalBiopsyToResectionCorrelationCandidates(specimens)).toEqual([]);
  });
});
