import { describe, it, expect } from 'vitest';
import { csmsEligibilityAuditDetail, csmsEligibilityEventName, csmsEligibilityProblem, openCsmsEligibilityFlags } from './csmsEligibility';

describe('csmsEligibility rules', () => {
  it('finds only open f36 flags', () => {
    const flags = [{ id: 'a', flagDefinitionId: 'f36' }, { id: 'b', flagDefinitionId: 'f36', deletedAt: '2026-10-01' }, { id: 'c', flagDefinitionId: 'f01' }];
    expect(openCsmsEligibilityFlags(flags).map(f => f.id)).toEqual(['a']);
    expect(openCsmsEligibilityFlags(undefined)).toEqual([]);
  });
  it('not eligible needs one of the quick-pick reasons', () => {
    expect(csmsEligibilityProblem({ kind: 'verified' })).toBeNull();
    expect(csmsEligibilityProblem({ kind: 'not_eligible', reason: 'ceased' })).toBeNull();
    expect(csmsEligibilityProblem({ kind: 'not_eligible', reason: '' as never })).toBe('reason-required');
  });
  it('event names and audit text, with no patient data', () => {
    expect(csmsEligibilityEventName({ kind: 'verified' })).toBe('CSMS_ELIGIBILITY_VERIFIED');
    expect(csmsEligibilityEventName({ kind: 'not_eligible', reason: 'other' })).toBe('CSMS_ELIGIBILITY_NOT_ELIGIBLE');
    expect(csmsEligibilityAuditDetail({ kind: 'not_eligible', reason: 'suspended' }, 'Pat QA')).toContain('suspended from the programme');
    expect(csmsEligibilityAuditDetail({ kind: 'verified' }, 'Pat QA')).toContain('verified by Pat QA');
  });
});
