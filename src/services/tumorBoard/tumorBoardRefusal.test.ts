import { describe, it, expect } from 'vitest';
import { tumorBoardRefusalKey } from './tumorBoardRefusal';

describe('tumorBoardRefusalKey (Batch 659)', () => {
  it('names the reason for a known refusal', () => {
    expect(tumorBoardRefusalKey('batchLocked')).toBe('batchLocked');
    expect(tumorBoardRefusalKey('presenterNotEligible')).toBe('presenterNotEligible');
    expect(tumorBoardRefusalKey('notPermitted')).toBe('notPermitted');
  });
  it('anything else is a plain "could not be saved"', () => {
    expect(tumorBoardRefusalKey('listingNotFound')).toBe('saveFailed');
    expect(tumorBoardRefusalKey(undefined)).toBe('saveFailed');
  });
});
