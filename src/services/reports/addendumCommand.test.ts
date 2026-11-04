import { describe, it, expect } from 'vitest';
import { addendumCommandAllowed } from './addendumCommand';

describe('Add Addendum command', () => {
  const ok = { caseStatus: 'finalized', modalOpen: false, revisionAny: true };
  it('opens only on a finalized case with nothing in front and revision permission', () => {
    expect(addendumCommandAllowed(ok)).toBe(true);
    expect(addendumCommandAllowed({ ...ok, caseStatus: 'in-progress' })).toBe(false);
    expect(addendumCommandAllowed({ ...ok, caseStatus: 'pending-release' })).toBe(false);
    expect(addendumCommandAllowed({ ...ok, modalOpen: true })).toBe(false);
    expect(addendumCommandAllowed({ ...ok, revisionAny: false })).toBe(false);
  });
});
