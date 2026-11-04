import { describe, it, expect } from 'vitest';
import { passwordPolicyProblem, passwordConfirmProblem, staffPasswordState } from './staffPasswordRules';

describe('staff password rules (Batch 448)', () => {
  it('needs at least 12 characters, at most 128, not blank, not the email', () => {
    expect(passwordPolicyProblem('correct horse battery')).toBeNull();
    expect(passwordPolicyProblem('short')).toBe('tooShort');
    expect(passwordPolicyProblem('x'.repeat(129))).toBe('tooLong');
    expect(passwordPolicyProblem('            ')).toBe('blank');
    expect(passwordPolicyProblem('Sarah.Chen@hospital.org', 'sarah.chen@hospital.org')).toBe('sameAsEmail');
  });
  it('checks the confirmation', () => {
    expect(passwordConfirmProblem('abc', 'abc')).toBeNull();
    expect(passwordConfirmProblem('abc', 'abd')).toBe('mismatch');
  });
  it('describes the password on the Staff screen', () => {
    expect(staffPasswordState({ hasOwn: true, mustChange: false, builtInDefault: true })).toBe('own');
    expect(staffPasswordState({ hasOwn: true, mustChange: true, builtInDefault: false })).toBe('ownMustChange');
    expect(staffPasswordState({ hasOwn: false, mustChange: false, builtInDefault: true })).toBe('builtInDefault');
    expect(staffPasswordState({ hasOwn: false, mustChange: false, builtInDefault: false })).toBe('none');
  });
});
