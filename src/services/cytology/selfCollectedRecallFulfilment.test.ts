// Batch 631: a recall is done when the same patient has a later clinician-collected cervical sample.
import { describe, it, expect } from 'vitest';
import { recallIsFulfilled } from './selfCollectedRecallFulfilment';

const DICT = [
  { id: 'sp-pap', specimenCategory: 'GYN_CYTOLOGY' as const },
  { id: 'sp-self', specimenCategory: 'GYN_CYTOLOGY' as const, isSelfCollected: true },
  { id: 'sp-fna', specimenCategory: 'NON_GYN_CYTOLOGY' as const },
];
const RECALL = { id: 'C-1', createdAt: '2026-09-01T00:00:00Z', patient: { id: 'p-1' }, specimens: [{ specimenDictionaryEntryId: 'sp-self' }] };
const later = (over = {}) => ({ id: 'C-2', createdAt: '2026-10-01T00:00:00Z', patient: { id: 'p-1' }, specimens: [{ specimenDictionaryEntryId: 'sp-pap' }], ...over });

describe('recallIsFulfilled', () => {
  it('a later clinician-collected cervical sample for the same patient closes a clinician-LBC recall', () => {
    expect(recallIsFulfilled(RECALL, 'clinician_lbc', [RECALL, later()], DICT)).toBe(true);
  });
  it('a later SELF-collected sample does not (it cannot be reflexed), but does close a repeat-collection recall', () => {
    const selfLater = later({ specimens: [{ specimenDictionaryEntryId: 'sp-self' }] });
    expect(recallIsFulfilled(RECALL, 'clinician_lbc', [RECALL, selfLater], DICT)).toBe(false);
    expect(recallIsFulfilled(RECALL, 'repeat_collection', [RECALL, selfLater], DICT)).toBe(true);
  });
  it('an earlier case, a different patient, a non-GYN specimen, or the case itself does not', () => {
    expect(recallIsFulfilled(RECALL, 'clinician_lbc', [RECALL, later({ createdAt: '2026-08-01T00:00:00Z' })], DICT)).toBe(false);
    expect(recallIsFulfilled(RECALL, 'clinician_lbc', [RECALL, later({ patient: { id: 'p-2' } })], DICT)).toBe(false);
    expect(recallIsFulfilled(RECALL, 'clinician_lbc', [RECALL, later({ specimens: [{ specimenDictionaryEntryId: 'sp-fna' }] })], DICT)).toBe(false);
    expect(recallIsFulfilled(RECALL, 'clinician_lbc', [RECALL], DICT)).toBe(false);
  });
  it('patients are matched by MRN when there is no patient id, and an unknown date never closes a recall', () => {
    const byMrn = { ...RECALL, patient: { mrn: 'M-1' } };
    expect(recallIsFulfilled(byMrn, 'clinician_lbc', [byMrn, later({ patient: { mrn: 'M-1' } })], DICT)).toBe(true);
    expect(recallIsFulfilled({ ...RECALL, createdAt: undefined }, 'clinician_lbc', [later()], DICT)).toBe(false);
    expect(recallIsFulfilled(RECALL, 'clinician_lbc', [later({ createdAt: undefined })], DICT)).toBe(false);
  });
});
