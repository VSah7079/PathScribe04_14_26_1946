// PS-329 (Batch 437): the AI badge counts Must Have fields only.
import { describe, it, expect } from 'vitest';
import { computeAiSynthesisStatus, countsTowardBadge, mustHaveFields } from './aiSynthesisStatus';
import { isVisible } from './fieldVisibility';

const template = {
  sections: [
    { fields: [
      { id: 'histologic_type', required: true },
      { id: 'comment' },
      { id: 'lvi', required: true, visibleWhen: { fieldId: 'histologic_type', answerId: 'adeno' } },
    ] },
    { visibleWhen: { fieldId: 'procedure', answerId: 'resection' }, fields: [{ id: 'margins', required: true }] },
  ],
};
const sug = (confidence: number, verification: 'unverified' | 'verified' | 'disputed' = 'unverified') => ({ confidence, verification });

describe('mustHaveFields', () => {
  it('required and shown; a condition makes it Must Have once its answer is given', () => {
    const none = mustHaveFields(template, {})!;
    expect([...none.mustHave]).toEqual(['histologic_type']);
    expect(none.known.has('margins')).toBe(true);
    const later = mustHaveFields(template, { histologic_type: 'adeno', procedure: 'resection' })!;
    expect([...later.mustHave].sort()).toEqual(['histologic_type', 'lvi', 'margins']);
  });
  it('no template: null (every field counts)', () => {
    expect(mustHaveFields(null, {})).toBeNull();
    expect(countsTowardBadge('anything', null)).toBe(true);
  });
});

describe('computeAiSynthesisStatus', () => {
  const fields = mustHaveFields(template, {});
  it('none without suggestions', () => {
    expect(computeAiSynthesisStatus({}, 75, fields)).toEqual({ state: 'none' });
  });
  it('a low optional field no longer trips the badge (it did before PS-329)', () => {
    const s = computeAiSynthesisStatus({ comment: sug(40), histologic_type: sug(90) }, 75, fields);
    expect(s).toMatchObject({ state: 'draft-ready', flaggedFieldId: 'histologic_type', overallConfidence: 65 });
  });
  it('a low required field does', () => {
    expect(computeAiSynthesisStatus({ histologic_type: sug(60), comment: sug(20) }, 75, fields))
      .toMatchObject({ state: 'review-required', flaggedFieldId: 'histologic_type', flaggedFieldConfidence: 60 });
  });
  it('a hidden required field does not; a reviewed one never does', () => {
    expect(computeAiSynthesisStatus({ lvi: sug(30) }, 75, fields).state).toBe('draft-ready');
    expect(computeAiSynthesisStatus({ histologic_type: sug(30, 'verified') }, 75, fields).state).toBe('draft-ready');
  });
  it('a field the template does not list, or no template at all: counts (the safe side)', () => {
    expect(computeAiSynthesisStatus({ unknown_field: sug(30) }, 75, fields).state).toBe('review-required');
    expect(computeAiSynthesisStatus({ comment: sug(30) }, 75, null).state).toBe('review-required');
  });
});

describe('isVisible (moved to a service)', () => {
  it('single and multi-answer conditions', () => {
    expect(isVisible(undefined, {})).toBe(true);
    expect(isVisible({ fieldId: 'a', answerId: 'x' }, { a: 'x' })).toBe(true);
    expect(isVisible({ fieldId: 'a', answerId: 'x', answerIds: ['y', 'z'] }, { a: ['z'] })).toBe(true);
    expect(isVisible({ fieldId: 'a', answerId: 'x' }, {})).toBe(false);
  });
});
