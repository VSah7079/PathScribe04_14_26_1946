// src/services/templates/nodeCountText.test.ts
// Batch 519 (PS-494): free-text node counts in the CAP-derived templates accept a count, "cannot be
// determined" and "at least N" (in all five UI languages); anything else blocks. Positive can't exceed
// examined; Breast's total examined can't be below the three positive categories.
import { describe, expect, it } from 'vitest';
import breast from '@/data/templates/generic/breast_invasive.json';
import breastDcis from '@/data/templates/generic/breast_dcis_resection.json';
import colon from '@/data/templates/generic/colon_resection.json';
import crLocal from '@/data/templates/generic/colorectal_local_excision.json';
import crB from '@/data/templates/generic/colorectal_resection_b.json';
import lung from '@/data/templates/generic/lung_adeno.json';
import prostate from '@/data/templates/generic/prostate_radical_prostatectomy.json';
import { isTextNodeCount, nodeCountBelowSum, parseNodeCount, textNodeCountExceeds, textNodeCountProblem, type NodeCountField } from './nodeCountText';
import { synopticEntryChecksFor, countBlockMessage } from './synopticEntryChecks';
import { synopticFieldComplete, synopticFieldMissing } from './partGrid';
import { withNodeCount, withSumPartToggled } from './templateCountRules';

const t = (k: string, o: Record<string, unknown> = {}) => `${k}${JSON.stringify(o)}`;
type Tpl = { sections: { fields?: NodeCountField[] }[] };
const fieldsOf = (tpl: unknown) => (tpl as Tpl).sections.flatMap(s => s.fields ?? []);
const field = (tpl: unknown, id: string) => fieldsOf(tpl).find(f => f.id === id)!;

describe('parseNodeCount', () => {
  it('reads exact counts, "at least N" and "cannot be determined"', () => {
    expect(parseNodeCount('12')).toEqual({ kind: 'exact', value: 12 });
    expect(parseNodeCount(' 0 ')).toEqual({ kind: 'exact', value: 0 });
    expect(parseNodeCount(7)).toEqual({ kind: 'exact', value: 7 });
    expect(parseNodeCount('At least 3')).toEqual({ kind: 'atLeast', value: 3 });
    expect(parseNodeCount('≥ 4')).toEqual({ kind: 'atLeast', value: 4 });
    expect(parseNodeCount('>=5')).toEqual({ kind: 'atLeast', value: 5 });
    expect(parseNodeCount('Cannot be determined')).toEqual({ kind: 'indeterminate' });
    expect(parseNodeCount("can't be assessed")).toEqual({ kind: 'indeterminate' });
    expect(parseNodeCount('Indeterminate')).toEqual({ kind: 'indeterminate' });
  });
  it('accepts the same phrases in French, German, Dutch and Korean', () => {
    for (const s of ['au moins 2', 'mindestens 2', 'minstens 2', 'ten minste 2', '최소 2']) expect(parseNodeCount(s)).toEqual({ kind: 'atLeast', value: 2 });
    for (const s of ['ne peut pas être déterminé', 'indéterminable', 'nicht bestimmbar', 'nicht beurteilbar', 'niet te bepalen', 'niet bepaalbaar', '판정 불가', '평가불가'])
      expect(parseNodeCount(s)).toEqual({ kind: 'indeterminate' });
  });
  it('blank is empty; anything else is invalid and keeps what was entered', () => {
    expect([parseNodeCount(undefined), parseNodeCount(''), parseNodeCount('  '), parseNodeCount(['1'])].map(c => c.kind)).toEqual(['empty', 'empty', 'empty', 'empty']);
    for (const s of ['-1', '2.5', 'twelve', 'about 10', '12 nodes', 'at least']) expect(parseNodeCount(s).kind).toBe('invalid');
    expect(parseNodeCount('  about   10 ')).toEqual({ kind: 'invalid', entered: 'about 10' });
  });
});

describe('the checks', () => {
  const positive: NodeCountField = { id: 'pos', type: 'text', nodeCount: true, notMoreThan: 'ex' };
  const examined: NodeCountField = { id: 'ex', type: 'text', nodeCount: true, atLeastSumOf: ['a', 'b', 'c'] };
  it('only text questions marked nodeCount are checked', () => {
    expect([isTextNodeCount(positive), isTextNodeCount({ type: 'text' }), isTextNodeCount({ type: 'numeric', nodeCount: true })]).toEqual([true, false, false]);
    expect(textNodeCountProblem({ id: 'x', type: 'text' }, { x: 'whatever' })).toBeUndefined();
    expect(textNodeCountProblem(positive, { pos: 'lots' })).toBe('lots');
    expect(textNodeCountProblem(positive, { pos: 'at least 2' })).toBeUndefined();
  });
  it('positive above examined: exact and "at least N" compared; an indeterminate or "at least" limit is not', () => {
    expect(textNodeCountExceeds(positive, { pos: '13', ex: '12' })).toEqual({ value: 13, limit: 12 });
    expect(textNodeCountExceeds(positive, { pos: 'at least 13', ex: '12' })).toEqual({ value: 13, limit: 12 });
    expect(textNodeCountExceeds(positive, { pos: '12', ex: '12' })).toBeUndefined();
    expect(textNodeCountExceeds(positive, { pos: '13', ex: 'cannot be determined' })).toBeUndefined();
    expect(textNodeCountExceeds(positive, { pos: '13', ex: 'at least 2' })).toBeUndefined();
    expect(textNodeCountExceeds(positive, { pos: 'cannot be determined', ex: '2' })).toBeUndefined();
  });
  it('a total below the sum of its parts; skipped when a part is indeterminate or invalid; "at least N" adds N', () => {
    expect(nodeCountBelowSum(examined, { ex: '5', a: '3', b: '2', c: '1' })).toEqual({ value: 5, sum: 6 });
    expect(nodeCountBelowSum(examined, { ex: '6', a: '3', b: '2', c: '1' })).toBeUndefined();
    expect(nodeCountBelowSum(examined, { ex: '5', a: 'at least 4', b: '2' })).toEqual({ value: 5, sum: 6 });
    expect(nodeCountBelowSum(examined, { ex: '5', a: '9', b: 'cannot be determined' })).toBeUndefined();
    expect(nodeCountBelowSum(examined, { ex: '5', a: '9', b: 'x' })).toBeUndefined();
    expect(nodeCountBelowSum(examined, { ex: 'at least 1', a: '9' })).toBeUndefined();
    expect(nodeCountBelowSum(examined, { ex: '5' })).toBeUndefined();
  });
  it('a problem leaves the question incomplete and stops sign-out, required or not', () => {
    expect([synopticFieldComplete(positive as never, { pos: 'lots' }), synopticFieldMissing(positive as never, { pos: 'lots' })]).toEqual([false, true]);
    expect([synopticFieldComplete(positive as never, { pos: '2', ex: '1' }), synopticFieldMissing(positive as never, { pos: '2', ex: '1' })]).toEqual([false, true]);
    expect([synopticFieldComplete(examined as never, { ex: '1', a: '2' }), synopticFieldMissing(examined as never, { ex: '1', a: '2' })]).toEqual([false, true]);
    expect([synopticFieldComplete(positive as never, { pos: 'at least 1', ex: '3' }), synopticFieldMissing(positive as never, { pos: 'at least 1', ex: '3' })]).toEqual([true, false]);
  });
});

describe('the seven templates (Breast, Breast DCIS, Colon, Colorectal ×2, Lung, Prostate)', () => {
  const marked: [string, unknown, string[], [string, string][]][] = [
    ['breast_invasive', breast, ['number_ln_macrometastases', 'number_ln_micrometastases', 'number_ln_itc', 'total_ln_examined', 'sentinel_ln_examined'],
      [['number_ln_macrometastases', 'total_ln_examined'], ['number_ln_micrometastases', 'total_ln_examined'], ['number_ln_itc', 'total_ln_examined'], ['sentinel_ln_examined', 'total_ln_examined']]],
    ['breast_dcis_resection', breastDcis, ['total_ln_examined'], []],
    ['colon_resection', colon, ['ln_with_tumor', 'ln_examined'], [['ln_with_tumor', 'ln_examined']]],
    ['colorectal_local_excision', crLocal, ['total_lymph_nodes_examined', 'total_lymph_nodes_involved'], [['total_lymph_nodes_involved', 'total_lymph_nodes_examined']]],
    ['colorectal_resection_b', crB, ['total_lymph_nodes_examined', 'total_lymph_nodes_involved'], [['total_lymph_nodes_involved', 'total_lymph_nodes_examined']]],
    ['lung_adeno', lung, ['ln_with_tumor_count', 'ln_examined_count'], [['ln_with_tumor_count', 'ln_examined_count']]],
    ['prostate_radical_prostatectomy', prostate, ['number_lymph_nodes_examined', 'number_positive_lymph_nodes'], [['number_positive_lymph_nodes', 'number_lymph_nodes_examined']]],
  ];
  it.each(marked)('%s marks exactly its node counts, with their limits pointing at questions it has', (_n, tpl, ids, limits) => {
    const all = fieldsOf(tpl);
    expect(all.filter(f => f.nodeCount).map(f => f.id).sort()).toEqual([...ids].sort());
    for (const f of all.filter(f => f.nodeCount)) expect(f.type).toBe('text');
    expect(all.filter(f => f.notMoreThan).map(f => [f.id, f.notMoreThan])).toEqual(limits);
    for (const [, lim] of limits) expect(all.some(f => f.id === lim)).toBe(true);
    // No placeholder label on a marked question: the block message names it.
    for (const f of all.filter(f => f.nodeCount)) expect(f.label).not.toMatch(/^Field \d+$/);
  });
  it('Breast: total examined covers the three positive categories', () => {
    expect(field(breast, 'total_ln_examined').atLeastSumOf).toEqual(['number_ln_macrometastases', 'number_ln_micrometastases', 'number_ln_itc']);
    const all = fieldsOf(breast);
    for (const id of field(breast, 'total_ln_examined').atLeastSumOf!) expect(all.some(f => f.id === id)).toBe(true);
  });
  it('Breast: the entry checks block, with readable messages, when the counts disagree', () => {
    const sections = (breast as unknown as { sections: never[] }).sections;
    const answers = { total_ln_examined: '3', number_ln_macrometastases: '2', number_ln_micrometastases: '2', number_ln_itc: 'some', sentinel_ln_examined: '4' };
    const { blocking } = synopticEntryChecksFor('i1', sections, answers);
    const kinds = blocking.filter(b => ['fieldNotCount', 'fieldExceeds', 'fieldBelowSum'].includes(b.kind)).map(b => [b.kind, b.fieldId]);
    // ITC "some" isn't a count, so the sum is skipped (it can't be added up); the sentinel subset exceeds the total.
    expect(kinds).toEqual([['fieldNotCount', 'number_ln_itc'], ['fieldExceeds', 'sentinel_ln_examined']]);
    const msg = blocking.map(b => countBlockMessage(t, b));
    expect(msg).toContain('synopticChecks.fieldNotCount{"field":"Number Positive (Category C)","value":"some"}');

    const fixed = synopticEntryChecksFor('i1', sections, { ...answers, number_ln_itc: '1', sentinel_ln_examined: '2' }).blocking;
    const below = fixed.find(b => b.kind === 'fieldBelowSum')!;
    expect([below.fieldId, below.value, below.limit, below.limitLabel]).toEqual(['total_ln_examined', 3, 5, 'Number Positive (Category A) + Number Positive (Category B) + Number Positive (Category C)']);
    expect(countBlockMessage(t, below)).toBe('synopticChecks.fieldBelowSum{"field":"Total Number Examined","value":3,"parts":"Number Positive (Category A) + Number Positive (Category B) + Number Positive (Category C)","sum":5}');

    const good = { total_ln_examined: '12', number_ln_macrometastases: '2', number_ln_micrometastases: 'at least 1', number_ln_itc: '0', sentinel_ln_examined: '3' };
    expect(synopticEntryChecksFor('i1', sections, good).blocking.filter(b => ['fieldNotCount', 'fieldExceeds', 'fieldBelowSum'].includes(b.kind))).toEqual([]);
  });
  it('Lung: "cannot be determined" examined lets any positive count through', () => {
    const sections = (lung as unknown as { sections: never[] }).sections;
    const r = synopticEntryChecksFor('i1', sections, { ln_examined_count: 'Cannot be determined', ln_with_tumor_count: '4' }).blocking;
    expect(r.filter(b => b.fieldId.startsWith('ln_'))).toEqual([]);
  });
});

describe('Synoptic Editor helpers', () => {
  it('withNodeCount turns the check on, and off with its limits', () => {
    const f = { id: 'x', label: 'X', type: 'text' };
    expect(withNodeCount(f, true)).toEqual({ ...f, nodeCount: true });
    expect(withNodeCount({ ...f, nodeCount: true, notMoreThan: 'y', atLeastSumOf: ['a'] }, false)).toEqual(f);
  });
  it('withSumPartToggled adds and removes parts, dropping the property when empty', () => {
    const f: { id: string; label: string; type: string; nodeCount?: boolean; atLeastSumOf?: string[] } = { id: 'x', label: 'X', type: 'text', nodeCount: true };
    const one = withSumPartToggled(f, 'a');
    expect(one.atLeastSumOf).toEqual(['a']);
    expect(withSumPartToggled(one, 'b').atLeastSumOf).toEqual(['a', 'b']);
    expect(withSumPartToggled(one, 'a')).toEqual(f);
  });
});
