// Batch 630: the rules for entering an hrHPV result by hand (manualHpvResult.ts).
import { describe, it, expect } from 'vitest';
import {
  applyManualEntry, buildManualEntryRecord, decideOverride, holdsInterfaceResult, isHpvManualSource, manualEntryAuditDetail,
  manualEntryProblem, manualEntryRoute, overrideDecisionAuditDetail, overrideDecisionProblem, previousState, proposeOverride,
} from './manualHpvResult';
import { HPV_MANUAL_SOURCES } from '@/types/case/HpvManualEntry';

const AT = '2026-10-19T20:00:00.000Z';
const input = (over = {}) => ({ result: 'Positive' as const, source: 'MANUAL_PAPER_REPORT' as const, userId: 'u-1', userName: 'Ann Lead', at: AT, ...over });
const FROM_INTERFACE = { hpvResult: 'Invalid' as const, hpvResultSource: 'INTERFACE' as const, hpvAbnormalFlag: 'A' as const, hpvReferenceRange: '<1', hpvGenotypeDetail: { hpv16: true, hpv18Or45: false, otherHighRisk: false } };

describe('manual hrHPV result sources', () => {
  it('are exactly the four Pete listed', () => {
    expect([...HPV_MANUAL_SOURCES]).toEqual(['MANUAL_PAPER_REPORT', 'MANUAL_DOWNTIME_OVERRIDE', 'MANUAL_PHONE_VERIFICATION', 'MANUAL_RETROSPECTIVE_ENTRY']);
    expect(isHpvManualSource('MANUAL_PAPER_REPORT')).toBe(true);
    expect(isHpvManualSource('INTERFACE')).toBe(false);
    expect(isHpvManualSource('')).toBe(false);
    expect(isHpvManualSource(undefined)).toBe(false);
  });
});

describe('which entries need a second sign-off', () => {
  it('replacing an interface result does (a result with no source counts as the interface)', () => {
    expect(manualEntryRoute(FROM_INTERFACE)).toBe('second_signoff');
    expect(manualEntryRoute({ hpvResult: 'Negative' })).toBe('second_signoff');
    expect(holdsInterfaceResult({ hpvResult: 'Negative' })).toBe(true);
  });
  it('a specimen with no result, a pending or not-performed one, or a manual one does not', () => {
    expect(manualEntryRoute(undefined)).toBe('direct');
    expect(manualEntryRoute({})).toBe('direct');
    expect(manualEntryRoute({ hpvResult: 'Pending' })).toBe('direct');
    expect(manualEntryRoute({ hpvResult: 'Not Performed' })).toBe('direct');
    expect(manualEntryRoute({ hpvResult: 'Positive', hpvResultSource: 'MANUAL_DOWNTIME_OVERRIDE' })).toBe('direct');
  });
});

describe('refusing a bad entry', () => {
  it('needs a Positive or Negative result and a manual source', () => {
    expect(manualEntryProblem({}, 'Invalid', 'MANUAL_PAPER_REPORT')).toBe('result-invalid');
    expect(manualEntryProblem({}, 'Positive', undefined)).toBe('source-required');
    expect(manualEntryProblem({}, 'Positive', '')).toBe('source-required');
    expect(manualEntryProblem({}, 'Positive', 'INTERFACE')).toBe('source-required');
    expect(manualEntryProblem({}, 'Positive', 'MANUAL_PHONE_VERIFICATION')).toBeNull();
  });
  it('refuses a second entry while one waits for approval', () => {
    const waiting = proposeOverride(FROM_INTERFACE, buildManualEntryRecord(FROM_INTERFACE, input()));
    expect(manualEntryProblem(waiting, 'Negative', 'MANUAL_PAPER_REPORT')).toBe('already-pending');
  });
});

describe('what is recorded', () => {
  it('names who, when, the source and the result and source it replaced', () => {
    expect(buildManualEntryRecord(FROM_INTERFACE, input())).toEqual({
      result: 'Positive', source: 'MANUAL_PAPER_REPORT', enteredById: 'u-1', enteredByName: 'Ann Lead', enteredAt: AT,
      previousResult: 'Invalid', previousSource: 'INTERFACE',
    });
    expect(previousState(undefined)).toEqual({ previousResult: 'none', previousSource: 'none' });
    expect(previousState({ hpvResult: 'Pending' })).toEqual({ previousResult: 'Pending', previousSource: 'none' });
  });
  it('a direct entry sets the result and source, keeps history, and drops the platform\'s flag, range and genotype', () => {
    const rec = buildManualEntryRecord({}, input({ result: 'Negative' }));
    const next = applyManualEntry({ ...FROM_INTERFACE, hpvResultSource: 'MANUAL_PAPER_REPORT' }, rec);
    expect(next).toMatchObject({ hpvResult: 'Negative', hpvResultSource: 'MANUAL_PAPER_REPORT', hpvAbnormalFlag: undefined, hpvReferenceRange: undefined, hpvGenotypeDetail: undefined });
    expect(next.hpvManualEntries).toEqual([rec]);
    expect(next.hpvPendingOverride).toBeUndefined();
  });
  it('the audit line has the user id, time, source and earlier state, and no patient identifier', () => {
    const rec = buildManualEntryRecord(FROM_INTERFACE, input());
    const d = manualEntryAuditDetail(rec, 'A', 'second_signoff');
    expect(d).toContain('u-1'); expect(d).toContain(AT); expect(d).toContain('MANUAL_PAPER_REPORT');
    expect(d).toContain('previously Invalid (INTERFACE)'); expect(d).toContain('awaiting second sign-off');
    expect(manualEntryAuditDetail(rec, 'A', 'direct')).toContain('recorded');
  });
});

describe('the second sign-off', () => {
  const rec = buildManualEntryRecord(FROM_INTERFACE, input());
  const waiting = proposeOverride(FROM_INTERFACE, rec);

  it('proposing leaves the interface result exactly as it was', () => {
    expect(waiting.hpvResult).toBe('Invalid');
    expect(waiting.hpvResultSource).toBe('INTERFACE');
    expect(waiting.hpvPendingOverride).toEqual(rec);
    expect(waiting.hpvManualEntries).toBeUndefined();
  });
  it('the person who entered it cannot approve it; someone else can; nothing waiting is refused', () => {
    expect(overrideDecisionProblem(waiting, 'u-1')).toBe('same-user');
    expect(overrideDecisionProblem(waiting, 'u-2')).toBeNull();
    expect(overrideDecisionProblem(FROM_INTERFACE, 'u-2')).toBe('no-pending');
    expect(overrideDecisionProblem(undefined, 'u-2')).toBe('no-pending');
  });
  it('approving applies the entry and keeps who approved', () => {
    const next = decideOverride(waiting, 'approved', { userId: 'u-2', userName: 'Bo Path', at: AT });
    expect(next).toMatchObject({ hpvResult: 'Positive', hpvResultSource: 'MANUAL_PAPER_REPORT' });
    expect(next.hpvPendingOverride).toBeUndefined();
    expect(next.hpvManualEntries).toEqual([rec]);
    expect(next.hpvOverrideDecisions).toEqual([{ decidedById: 'u-2', decidedByName: 'Bo Path', decidedAt: AT, decision: 'approved' }]);
  });
  it('rejecting drops the entry and keeps the interface result', () => {
    const next = decideOverride(waiting, 'rejected', { userId: 'u-2', userName: 'Bo Path', at: AT });
    expect(next).toMatchObject({ hpvResult: 'Invalid', hpvResultSource: 'INTERFACE', hpvGenotypeDetail: FROM_INTERFACE.hpvGenotypeDetail });
    expect(next.hpvPendingOverride).toBeUndefined();
    expect(next.hpvManualEntries).toBeUndefined();
    expect(next.hpvOverrideDecisions?.[0].decision).toBe('rejected');
  });
  it('the decision audit line names the entry, both people and the earlier state', () => {
    const d = overrideDecisionAuditDetail(rec, { decidedById: 'u-2', decidedByName: 'Bo Path', decidedAt: AT, decision: 'approved' }, 'A');
    expect(d).toContain('entered by u-1'); expect(d).toContain('approved by u-2'); expect(d).toContain('previously Invalid (INTERFACE)');
  });
});
