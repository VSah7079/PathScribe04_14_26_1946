// src/services/templates/conditionEdits.test.ts
// Batch 466c (Pete): the Synoptic Editor builds "shown unless …" and "or also when …" visibility conditions, and
// a hand-entered total checked against a grid. The edits are pure; the engine (isVisible) reads what they build.
import { describe, expect, it } from 'vitest';
import kidneyTpl from '@/data/templates/generic/kidney_resection.json';
import { isVisible, type VisibilityCondition } from './fieldVisibility';
import {
  conditionAnswer, conditionAnswers, conditionMode, conditionTooComplex, isConditionComplete, withAlternative, withAlternativeAdded,
  withAlternativeRemoved, withConditionAnswer, withConditionAnswers, withConditionAnswerToggled, withConditionField, withConditionMode,
} from './conditionEdits';
import { valueSourceOf, withSumColumn, withValueSource } from './templateCountRules';

describe('building a visibility condition', () => {
  it('"shown when": question, then answer; the engine shows it only for that answer', () => {
    let c: VisibilityCondition = { fieldId: '', answerId: '' };
    expect(isConditionComplete(c)).toBe(false);
    c = withConditionAnswer(withConditionField(c, 'proc'), 'radical');
    expect(c).toEqual({ fieldId: 'proc', answerId: 'radical' });
    expect([conditionMode(c), conditionAnswer(c), isConditionComplete(c)]).toEqual(['is', 'radical', true]);
    expect([isVisible(c, { proc: 'radical' }), isVisible(c, { proc: 'partial' }), isVisible(c, {})]).toEqual([true, false, false]);
  });
  it('"shown unless": the answer carries over between modes; shown while blank or any other answer', () => {
    const c = withConditionMode({ fieldId: 'proc', answerId: 'partial' }, 'isNot');
    expect(c).toEqual({ fieldId: 'proc', answerId: '', notAnswerIds: ['partial'] });
    expect([conditionMode(c), conditionAnswer(c)]).toEqual(['isNot', 'partial']);
    expect([isVisible(c, { proc: 'radical' }), isVisible(c, { proc: 'partial' }), isVisible(c, {})]).toEqual([true, false, true]);
    expect(withConditionMode(c, 'is')).toEqual({ fieldId: 'proc', answerId: 'partial' });
    expect(withConditionAnswer(c, 'radical')).toEqual({ fieldId: 'proc', answerId: '', notAnswerIds: ['radical'] });
    // Another question: the answer starts again, the mode stays.
    expect(withConditionField(c, 'side')).toEqual({ fieldId: 'side', answerId: '', notAnswerIds: [] });
  });
  it('review fixes: the mode holds before an answer is chosen and across a question change; one answerIds entry is the answer', () => {
    const unless = withConditionMode({ fieldId: 'proc', answerId: '' }, 'isNot');
    expect([conditionMode(unless), conditionAnswer(unless)]).toEqual(['isNot', '']);
    const moved = withConditionField(withConditionMode({ fieldId: 'proc', answerId: 'partial' }, 'isNot'), 'side');
    expect(conditionMode(moved)).toBe('isNot');
    expect(withConditionAnswer(moved, 'left')).toEqual({ fieldId: 'side', answerId: '', notAnswerIds: ['left'] });
    const single: VisibilityCondition = { fieldId: 'b', answerId: '', answerIds: ['y'] };
    expect([conditionAnswer(single), isConditionComplete(single), conditionTooComplex(single)]).toEqual(['y', true, false]);
    expect(withConditionAnswer(single, 'z')).toEqual({ fieldId: 'b', answerId: 'z' });
    expect(withConditionMode(single, 'isNot')).toEqual({ fieldId: 'b', answerId: '', notAnswerIds: ['y'] });
    expect(conditionTooComplex({ fieldId: 'b', answerId: 'x', answerIds: ['y'] })).toBe(true);
  });
  it('a condition still being built never hides its question for good', () => {
    expect(isVisible({ fieldId: '', answerId: '' }, {})).toBe(true);
    expect(isVisible({ fieldId: 'proc', answerId: '' }, { proc: 'radical' })).toBe(true);
    expect(isVisible({ fieldId: 'proc', answerId: '', notAnswerIds: [] }, { proc: 'partial' })).toBe(true);
    // An unfinished alternative never shows it; an unfinished main condition leaves it to the finished alternatives.
    expect(isVisible({ fieldId: 'proc', answerId: 'radical', or: [{ fieldId: '', answerId: '' }] }, { proc: 'partial' })).toBe(false);
    const alt: VisibilityCondition = { fieldId: 'proc', answerId: '', or: [{ fieldId: 'extra', answerId: 'vein' }] };
    expect([isVisible(alt, { extra: ['vein'] }), isVisible(alt, {})]).toEqual([true, false]);
  });
  it('"or also when": added, set, removed; the key goes when none is left', () => {
    let c: VisibilityCondition = withConditionMode({ fieldId: 'proc', answerId: 'partial' }, 'isNot');
    c = withAlternativeAdded(c);
    expect(isConditionComplete(c.or![0])).toBe(false);
    c = withAlternative(c, 0, { fieldId: 'extra', answerId: 'vein' });
    expect(isVisible(c, { proc: 'partial', extra: ['vein'] })).toBe(true);
    expect(isVisible(c, { proc: 'partial', extra: [] })).toBe(false);
    expect(withAlternativeRemoved(c, 0)).toEqual({ fieldId: 'proc', answerId: '', notAnswerIds: ['partial'] });
  });
  it('the shipped renal vein margin condition is editable; only nested alternatives and mixed answer keys stay read-only (Batch 519)', () => {
    const vein = kidneyTpl.sections.flatMap(s => s.fields as { id: string; visibleWhen?: VisibilityCondition }[]).find(f => f.id === 'psmap_ren_veinMargin')!;
    expect(conditionTooComplex(vein.visibleWhen)).toBe(false);
    expect(conditionMode(vein.visibleWhen)).toBe('isNot');
    // PS-493: several answers, and an "unless" alternative, are editable now.
    expect(conditionTooComplex({ fieldId: 'a', answerId: '', answerIds: ['x', 'y'] })).toBe(false);
    expect(conditionTooComplex({ fieldId: 'a', answerId: '', notAnswerIds: ['x', 'y'] })).toBe(false);
    expect(conditionTooComplex({ fieldId: 'a', answerId: 'x', or: [{ fieldId: 'b', answerId: '', notAnswerIds: ['y'] }] })).toBe(false);
    // Nested alternatives stay read-only (Pete's accepted default); so do answer keys that disagree.
    expect(conditionTooComplex({ fieldId: 'a', answerId: 'x', or: [{ fieldId: 'b', answerId: 'y', or: [{ fieldId: 'c', answerId: 'z' }] }] })).toBe(true);
    expect(conditionTooComplex({ fieldId: 'a', answerId: 'x', notAnswerIds: ['y'] })).toBe(true);
    expect(conditionTooComplex(undefined)).toBe(false);
  });
});

describe('several answers per question, and "unless" on an alternative (Batch 519, PS-493)', () => {
  const answersFor = (c: VisibilityCondition, v: string | string[]) => isVisible(c, { proc: v });
  it('ticking answers builds "is any of"; one answer stays answerId; unticking the last empties it', () => {
    let c: VisibilityCondition = withConditionField({ fieldId: '', answerId: '' }, 'proc');
    c = withConditionAnswerToggled(c, 'radical');
    expect(c).toEqual({ fieldId: 'proc', answerId: 'radical' });
    c = withConditionAnswerToggled(c, 'partial');
    expect(c).toEqual({ fieldId: 'proc', answerId: '', answerIds: ['radical', 'partial'] });
    expect(conditionAnswers(c)).toEqual(['radical', 'partial']);
    expect([answersFor(c, 'radical'), answersFor(c, 'partial'), answersFor(c, 'other'), isVisible(c, {})]).toEqual([true, true, false, false]);
    expect(answersFor(c, ['other', 'partial'])).toBe(true);
    c = withConditionAnswerToggled(withConditionAnswerToggled(c, 'radical'), 'partial');
    expect([c, isConditionComplete(c)]).toEqual([{ fieldId: 'proc', answerId: '' }, false]);
  });
  it('"unless any of": hidden for any named answer, shown otherwise and while blank; the answers carry across modes', () => {
    const c = withConditionMode(withConditionAnswers({ fieldId: 'proc', answerId: '' }, ['partial', 'wedge', 'partial']), 'isNot');
    expect(c).toEqual({ fieldId: 'proc', answerId: '', notAnswerIds: ['partial', 'wedge'] });
    expect([answersFor(c, 'partial'), answersFor(c, 'wedge'), answersFor(c, 'radical'), isVisible(c, {})]).toEqual([false, false, true, true]);
    expect(withConditionMode(c, 'is')).toEqual({ fieldId: 'proc', answerId: '', answerIds: ['partial', 'wedge'] });
  });
  it('an alternative can be "unless", with several answers; what the editor builds is what the engine shows', () => {
    let c: VisibilityCondition = withConditionAnswer({ fieldId: 'proc', answerId: '' }, 'radical');
    c = withAlternativeAdded(c);
    let alt = withConditionField(c.or![0], 'extra');
    alt = withConditionMode(withConditionAnswers(alt, ['vein', 'fat']), 'isNot');
    c = withAlternative(c, 0, alt);
    expect(c).toEqual({ fieldId: 'proc', answerId: 'radical', or: [{ fieldId: 'extra', answerId: '', notAnswerIds: ['vein', 'fat'] }] });
    expect(conditionTooComplex(c)).toBe(false);
    // Shown when proc is radical, OR unless extra is vein or fat.
    expect(isVisible(c, { proc: 'radical', extra: ['vein'] })).toBe(true);
    expect(isVisible(c, { proc: 'partial', extra: ['margin'] })).toBe(true);
    expect(isVisible(c, { proc: 'partial', extra: ['fat'] })).toBe(false);
  });
});

describe('a total entered by hand, checked against a grid', () => {
  const tpl = { sections: [{ fields: [
    { id: 'grid', label: 'Levels', type: 'partGrid', columns: [{ id: 'label', label: 'Level', type: 'text' }, { id: 'pos', label: 'Positive', type: 'numeric' }, { id: 'ex', label: 'Examined', type: 'numeric' }] },
    { id: 'total', label: 'Total positive', type: 'numeric' },
  ] }] } as never;
  const total = { id: 'total', label: 'Total positive', type: 'numeric' };
  it('by hand → calculated → checked keeps the grid and column; back to by hand removes the total', () => {
    expect(valueSourceOf(total)).toBe('manual');
    const calc = withValueSource(total, 'gridSum', tpl);
    expect(calc).toEqual({ sumOf: { fieldId: 'grid', columnId: 'pos' } });
    const withEx = { ...total, ...withSumColumn({ ...total, ...calc }, 'ex') };
    const checked = withValueSource(withEx, 'gridSumChecked', tpl);
    expect(checked).toEqual({ sumOf: { fieldId: 'grid', columnId: 'ex', override: true } });
    expect(valueSourceOf({ ...total, ...checked })).toBe('gridSumChecked');
    expect(withValueSource({ ...total, ...checked }, 'gridSum', tpl)).toEqual({ sumOf: { fieldId: 'grid', columnId: 'ex' } });
    expect(withValueSource({ ...total, ...checked }, 'manual', tpl)).toEqual({ sumOf: undefined });
  });
  it('no grid with a number column: nothing to total', () => {
    expect(withValueSource(total, 'gridSumChecked', { sections: [{ fields: [total] }] } as never)).toEqual({});
  });
});
