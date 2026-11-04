// Batch 651: the minimum confidence (30), the listed-options rule and the one confidence scale are enforced in code.
import { describe, it, expect } from 'vitest';
import { AI_MIN_CONFIDENCE, normaliseAiConfidence, checkSuggestedAnswer, cleanSuggestedAnswers } from './aiSuggestionRules';

const FIELDS = [
  { id: 'type', label: 'Type', options: [{ id: 'idc', label: 'Ductal' }, { id: 'ilc', label: 'Lobular' }] },
  { id: 'size', label: 'Size' },
];

describe('normaliseAiConfidence', () => {
  it('keeps 0-100 values and converts 0-1 fractions', () => {
    expect(normaliseAiConfidence(85)).toBe(85);
    expect(normaliseAiConfidence(0.85)).toBe(85);
    expect(normaliseAiConfidence('0.9')).toBe(90);
    expect(normaliseAiConfidence('72%')).toBe(72);
    expect(normaliseAiConfidence(1)).toBe(100);
    expect(normaliseAiConfidence(250)).toBe(100);
    expect(normaliseAiConfidence(-4)).toBe(0);
  });
  it('rejects what is not a number', () => {
    for (const v of [undefined, null, 'high', NaN, {}]) expect(normaliseAiConfidence(v)).toBeUndefined();
  });
});

describe('checkSuggestedAnswer', () => {
  it('drops an answer below the minimum confidence, keeps one at it', () => {
    expect(checkSuggestedAnswer(FIELDS[1], { value: '2 cm', confidence: AI_MIN_CONFIDENCE - 1 })).toEqual({ ok: false, reason: 'belowMinimum' });
    expect(checkSuggestedAnswer(FIELDS[1], { value: '2 cm', confidence: AI_MIN_CONFIDENCE }).ok).toBe(true);
  });
  it('rejects a value that is not one of the listed options (a label, a guess)', () => {
    expect(checkSuggestedAnswer(FIELDS[0], { value: 'Ductal', confidence: 90 })).toEqual({ ok: false, reason: 'notAnOption' });
    expect(checkSuggestedAnswer(FIELDS[0], { value: ['idc', 'zzz'], confidence: 90 })).toEqual({ ok: false, reason: 'notAnOption' });
    expect(checkSuggestedAnswer(FIELDS[0], { value: 'idc', confidence: 90 })).toMatchObject({ ok: true, value: 'idc' });
    expect(checkSuggestedAnswer(FIELDS[0], { value: ['idc', 'ilc'], confidence: 90 })).toMatchObject({ ok: true, value: ['idc', 'ilc'] });
  });
  it('needs a confidence only when asked to', () => {
    expect(checkSuggestedAnswer(FIELDS[1], { value: 'x' }).ok).toBe(true);
    expect(checkSuggestedAnswer(FIELDS[1], { value: 'x' }, { requireConfidence: true })).toEqual({ ok: false, reason: 'noConfidence' });
  });
  it('rejects an empty or malformed answer', () => {
    expect(checkSuggestedAnswer(FIELDS[1], { value: '  ', confidence: 90 })).toEqual({ ok: false, reason: 'noValue' });
    expect(checkSuggestedAnswer(FIELDS[1], 'text')).toEqual({ ok: false, reason: 'notAnObject' });
  });
});

describe('cleanSuggestedAnswers (live cases)', () => {
  it('keeps the good answers on the 0-100 scale and reports why the others went', () => {
    const { accepted, rejected } = cleanSuggestedAnswers({
      type: { value: 'idc', confidence: 0.8, source: 'ductal carcinoma' },
      size: { value: '2 cm', confidence: 12, source: 'x' },
      nope: { value: 'a', confidence: 90 },
    }, FIELDS);
    expect(accepted).toEqual({ type: { value: 'idc', confidence: 80, source: 'ductal carcinoma' } });
    expect(rejected).toEqual([{ fieldId: 'size', reason: 'belowMinimum' }, { fieldId: 'nope', reason: 'unknownField' }]);
  });
  it('returns nothing for a reply that is not an object', () => {
    expect(cleanSuggestedAnswers([], FIELDS).accepted).toEqual({});
    expect(cleanSuggestedAnswers(null, FIELDS).accepted).toEqual({});
  });
});
