// Batch 669 (mol-9): a refused batch change reads through a translated key, never an English service sentence.
import { describe, it, expect } from 'vitest';
import { molecularBatchErrorKey, MOLECULAR_BATCH_ERROR_KEYS } from './molecularBatchErrors';

describe('molecularBatchErrorKey', () => {
  it('passes the service codes through', () => {
    for (const code of ['notPermitted', 'batchNotFound', 'alreadySuperseded', 'reasonRequired', 'lotGatingFailed', 'controlsNotSatisfied', 'instrumentUnavailable', 'wellSpecimenMissing', 'deckSlotInvalid']) {
      expect(molecularBatchErrorKey(code)).toBe(code);
    }
  });
  it('maps the API server codes onto the same messages', () => {
    expect(molecularBatchErrorKey('NOT_PERMITTED')).toBe('notPermitted');
    expect(molecularBatchErrorKey('NOT_FOUND')).toBe('batchNotFound');
    expect(molecularBatchErrorKey('CONFLICT')).toBe('alreadySuperseded');
  });
  it('anything else, including an old English sentence or nothing, is the generic message', () => {
    expect(molecularBatchErrorKey('Batch rejected — one or more reagent/control lots failed gating')).toBe('generic');
    expect(molecularBatchErrorKey(undefined)).toBe('generic');
    expect(MOLECULAR_BATCH_ERROR_KEYS).toContain('generic');
  });
});
