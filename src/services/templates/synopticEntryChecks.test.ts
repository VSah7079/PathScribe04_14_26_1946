// src/services/templates/synopticEntryChecks.test.ts
// Batch 465b (Pete): grid counts that can't exceed another column (nodes positive ≤ examined) stop the draft
// save and sign-out; totals calculated from their grid; hand-entered totals that differ from it warn.
import { describe, expect, it } from 'vitest';
import neckTpl from '@/data/templates/generic/neck_dissection.json';
import { computedSumPatch, notWholeCount, partGridColumnTotal, partGridCountProblems, sumFieldState, synopticFieldComplete, synopticFieldMissing, sumMismatches, wholeNumberFieldProblem, fieldExceedsProblem } from './partGrid';
import { gridSumChoices, numericColumns, numericFieldChoices, valueSourceOf, withColumnRule, withSumColumn, withValueSource } from './templateCountRules';
import { countBlockMessage, findSynopticEntryChecks, synopticEntryChecksFor, totalWarningsMessage } from './synopticEntryChecks';

const fields = neckTpl.sections.flatMap(s => s.fields) as never[];
const grid = (neckTpl.sections.flatMap(s => s.fields) as { id: string }[]).find(f => f.id === 'psmap_nd_levels') as never;
const G = 'psmap_nd_levels';
const cell = (row: string, col: string) => `${G}__${row}__${col}`;
const t = (k: string, o: Record<string, unknown> = {}) => `${k}${JSON.stringify(o)}`;

describe('counts that can’t exceed another column', () => {
  it('positive above examined at a level is a problem, named by row and columns; equal or missing is not', () => {
    const a = { [cell('R_IIa', 'positive')]: '3', [cell('R_IIa', 'examined')]: '2', [cell('R_III', 'positive')]: '2', [cell('R_III', 'examined')]: '2', [cell('R_IV', 'positive')]: '1' };
    expect(partGridCountProblems(grid, a)).toEqual([{ kind: 'exceeds', rowId: 'R_IIa', rowLabel: 'Right level IIa', columnId: 'positive', columnLabel: 'Nodes positive', limitColumnId: 'examined', limitLabel: 'Nodes examined', value: 3, limit: 2 }]);
  });
  it('a stored cell on a row the grid no longer has is neither checked nor counted (it can’t be seen or corrected)', () => {
    const a = { [cell('R_XI', 'positive')]: '5', [cell('R_XI', 'examined')]: '1', [cell('R_Ia', 'examined')]: '2' };
    expect(partGridCountProblems(grid, a)).toEqual([]);
    expect(partGridColumnTotal(grid, 'examined', a)).toBe(2);
  });
  it('a grid with a row per part checks the case’s parts, named by their labels', () => {
    const parts = { id: 'g', label: 'Nodes', type: 'partGrid', columns: [{ id: 'p', label: 'Positive', type: 'numeric', notMoreThan: 'e' }, { id: 'e', label: 'Examined', type: 'numeric' }] } as never;
    const a = { 'g__S-SP-1__p': '3', 'g__S-SP-1__e': '1', 'g__S-SP-9__p': '3', 'g__S-SP-9__e': '1' };
    expect(partGridCountProblems(parts, a, [{ id: 'S-SP-1', label: 'A' }]).map(p => p.rowLabel)).toEqual(['A']);
    // Without the parts, the rows its cells name (the id as label).
    expect(partGridCountProblems(parts, a).map(p => p.rowLabel)).toEqual(['S-SP-1', 'S-SP-9']);
  });
  it('the grid is then incomplete and stops sign-out, required or not', () => {
    const a = { [cell('R_IIa', 'positive')]: '3', [cell('R_IIa', 'examined')]: '2' };
    expect([synopticFieldComplete(grid, a), synopticFieldMissing(grid, a)]).toEqual([false, true]);
    const ok = { [cell('R_IIa', 'positive')]: '1', [cell('R_IIa', 'examined')]: '2' };
    expect([synopticFieldComplete(grid, ok), synopticFieldMissing(grid, ok)]).toEqual([true, false]);
  });
});

describe('totals from the grid (Pete: read-only, calculated by default)', () => {
  it('the neck’s totals are the grid’s columns summed', () => {
    const a = { [cell('R_IIa', 'positive')]: '2', [cell('R_IIa', 'examined')]: '6', [cell('R_III', 'examined')]: '5', [cell('R_IV', 'examined')]: 'x' };
    expect(partGridColumnTotal(grid, 'examined', a)).toBe(11);
    expect(computedSumPatch(fields, a)).toEqual({ nd_total_positive: '2', nd_total_examined: '11' });
    // Already right: nothing to change. No counts in the grid: the totals are left as entered (totals reported
    // without levels), and the question stays open; with counts it is calculated and read-only.
    expect(computedSumPatch(fields, { ...a, nd_total_positive: '2', nd_total_examined: '11' })).toEqual({});
    expect(computedSumPatch(fields, { nd_total_positive: '2' })).toEqual({});
    const total = (fields as { id: string }[]).find(f => f.id === 'nd_total_positive') as never;
    expect([sumFieldState(total, undefined), sumFieldState(total, 2), sumFieldState({ id: 'x', type: 'numeric' }, 2)]).toEqual(['open', 'calculated', null]);
  });
  it('a hand-entered total (override) is left alone and warns when it differs from the grid', () => {
    const own = fields.map((f: { id: string; sumOf?: object }) => (f.sumOf ? { ...f, sumOf: { ...f.sumOf, override: true } } : f)) as never[];
    const a = { [cell('R_IIa', 'positive')]: '2', [cell('R_IIa', 'examined')]: '6', nd_total_positive: '2', nd_total_examined: '9' };
    expect(computedSumPatch(own, a)).toEqual({});
    expect(sumMismatches(own, a)).toEqual([{ fieldId: 'nd_total_examined', fieldLabel: 'Total nodes examined', entered: 9, gridTotal: 6 }]);
    // A calculated total stored out of step with its grid (e.g. from an AI suggestion) warns too.
    expect(sumMismatches(fields, a)).toEqual([{ fieldId: 'nd_total_examined', fieldLabel: 'Total nodes examined', entered: 9, gridTotal: 6 }]);
    expect(sumFieldState({ id: 'x', type: 'numeric', sumOf: { fieldId: G, columnId: 'positive', override: true } }, 3)).toBe('override');
  });
});

describe('the checks over a case', () => {
  it('blocking problems and warnings per synoptic; a hidden question doesn’t count', () => {
    const r = synopticEntryChecksFor('i1', neckTpl.sections as never, { [cell('L_Ib', 'positive')]: '4', [cell('L_Ib', 'examined')]: '1' });
    expect(r.blocking.map(b => [b.instanceId, b.fieldId, b.rowId])).toEqual([['i1', G, 'L_Ib']]);
    expect(countBlockMessage(t, r.blocking[0])).toBe('synopticChecks.countExceeds{"field":"Nodes by level","row":"Left level Ib","column":"Nodes positive","value":4,"limit":"Nodes examined","limitValue":1}');
    const hidden = [{ visibleWhen: { fieldId: 'q', answerId: 'yes' }, fields: neckTpl.sections[1].fields }];
    expect(synopticEntryChecksFor('i1', hidden as never, { [cell('L_Ib', 'positive')]: '4', [cell('L_Ib', 'examined')]: '1' }).blocking).toEqual([]);
    expect(totalWarningsMessage(t, [{ instanceId: 'i', fieldId: 'f', fieldLabel: 'Total', entered: 9, gridTotal: 6 }]))
      .toBe('synopticChecks.totalMismatch{"field":"Total","entered":9,"total":6}\nsynopticChecks.totalsPrompt{}');
  });
  it('loads the template of every synoptic with answers (Batch 466b: a count can exceed another question’s); an unloadable one is skipped', async () => {
    const loaded: string[] = [];
    const load = async (id: string) => { loaded.push(id); return id === 'neck_dissection' ? { template: neckTpl } : null; };
    const r = await findSynopticEntryChecks({ synopticReports: [
      { instanceId: 'a', templateId: 'other', answers: { q: '1', r: 'text' } },
      { instanceId: 'b', templateId: 'neck_dissection', answers: { [cell('R_Ia', 'positive')]: '2', [cell('R_Ia', 'examined')]: '1' } },
      { instanceId: 'c', templateId: 'gone', answers: { x__r__c: '1' } },
      { instanceId: 'd', templateId: 'neck_dissection', answers: { nd_total_examined: '2.5' } },
      { instanceId: 'e', templateId: 'neck_dissection', answers: { nd_total_positive: '1,5' } },
      { instanceId: 'f', templateId: 'neck_dissection', answers: { nd_total_positive: 2.5 as never } },
    ] } as never, load);
    expect(loaded).toEqual(['other', 'neck_dissection', 'gone', 'neck_dissection', 'neck_dissection', 'neck_dissection']);
    expect(r.blocking.map(b => b.instanceId)).toEqual(['b', 'd', 'e', 'f']);
  });
});

describe('Batch 466 (Pete): node counts are whole numbers, 0 or more', () => {
  it('a negative, decimal or non-numeric count is refused; blank and whole numbers are fine', () => {
    expect(['-2', '1.5', '3x', ' 4 ', '', undefined, '0', '12'].map(v => notWholeCount(v as never))).toEqual(['-2', '1.5', '3x', undefined, undefined, undefined, undefined, undefined]);
  });
  it('in the levels grid: flagged per cell, the grid incomplete and sign-out stopped; the "can’t exceed" check waits for whole numbers', () => {
    const a = { [cell('R_IIa', 'positive')]: '1.5', [cell('R_IIa', 'examined')]: '1', [cell('R_III', 'examined')]: '-3' };
    expect(partGridCountProblems(grid, a).map(p => [p.kind, p.rowId, p.columnId, p.entered])).toEqual([['notWhole', 'R_IIa', 'positive', '1.5'], ['notWhole', 'R_III', 'examined', '-3']]);
    expect([synopticFieldComplete(grid, a), synopticFieldMissing(grid, a)]).toEqual([false, true]);
  });
  it('a node-count question of its own (the totals; the kidney’s lymph node counts) is checked too', () => {
    const total = (fields as { id: string }[]).find(f => f.id === 'nd_total_examined') as never;
    expect(wholeNumberFieldProblem(total, { nd_total_examined: '2.5' })).toBe('2.5');
    expect([synopticFieldComplete(total, { nd_total_examined: '2.5' }), synopticFieldMissing(total, { nd_total_examined: '2.5' })]).toEqual([false, true]);
    expect(wholeNumberFieldProblem(total, { nd_total_examined: '7' })).toBeUndefined();
    expect(wholeNumberFieldProblem({ id: 'x', type: 'numeric' }, { x: '-1' })).toBeUndefined();
    const r = synopticEntryChecksFor('i1', neckTpl.sections as never, { nd_total_examined: '-1' });
    expect(r.blocking.map(b => [b.kind, b.fieldId])).toEqual([['fieldNotWhole', 'nd_total_examined']]);
    expect(countBlockMessage(t, r.blocking[0])).toBe('synopticChecks.fieldNotWhole{"field":"Total nodes examined","value":"-1"}');
    const g = synopticEntryChecksFor('i1', neckTpl.sections as never, { [cell('L_Ia', 'positive')]: '0.5' });
    expect(countBlockMessage(t, g.blocking[0])).toBe('synopticChecks.cellNotWhole{"field":"Nodes by level","row":"Left level Ia","column":"Nodes positive","value":"0.5"}');
  });
});

describe('Batch 466b (Pete: Max_Value_Ref): a count question that can’t exceed another', () => {
  it('nodes positive above nodes examined (both whole numbers) blocks; equal or one missing doesn’t', () => {
    const pos = (fields as { id: string }[]).find(f => f.id === 'nd_total_positive') as never;
    expect(fieldExceedsProblem(pos, { nd_total_positive: '5', nd_total_examined: '3' })).toEqual({ value: 5, limit: 3 });
    expect(fieldExceedsProblem(pos, { nd_total_positive: '3', nd_total_examined: '3' })).toBeUndefined();
    expect(fieldExceedsProblem(pos, { nd_total_positive: '3' })).toBeUndefined();
    expect([synopticFieldComplete(pos, { nd_total_positive: '5', nd_total_examined: '3' }), synopticFieldMissing(pos, { nd_total_positive: '5', nd_total_examined: '3' })]).toEqual([false, true]);
    const r = synopticEntryChecksFor('i1', neckTpl.sections as never, { nd_total_positive: '5', nd_total_examined: '3' });
    expect(r.blocking.map(b => [b.kind, b.fieldId])).toEqual([['fieldExceeds', 'nd_total_positive']]);
    expect(countBlockMessage(t, r.blocking[0])).toBe('synopticChecks.fieldExceeds{"field":"Total nodes positive","value":5,"limit":"Total nodes examined","limitValue":3}');
  });
});

describe('Batch 466b: the editor’s count settings', () => {
  const tpl = { sections: [{ fields: [
    { id: 'g', label: 'Nodes', type: 'partGrid', columns: [{ id: 'p', label: 'Positive', type: 'numeric' }, { id: 'e', label: 'Examined', type: 'numeric' }, { id: 'x', label: 'ENE', type: 'dropdown' }] },
    { id: 'tp', label: 'Total positive', type: 'numeric' }, { id: 'te', label: 'Total examined', type: 'numeric' }, { id: 'c', label: 'Comment', type: 'text' },
  ] }] };
  it('choices, value source, grid column rules', () => {
    const f = tpl.sections[0].fields;
    expect(numericFieldChoices(tpl as never, 'tp')).toEqual([{ id: 'te', label: 'Total examined' }]);
    expect(gridSumChoices(tpl as never)).toEqual([{ id: 'g', label: 'Nodes', columns: [{ id: 'p', label: 'Positive' }, { id: 'e', label: 'Examined' }] }]);
    expect([valueSourceOf(f[1] as never), withValueSource(f[1] as never, 'gridSum', tpl as never), withValueSource(f[1] as never, 'manual', tpl as never)])
      .toEqual(['manual', { sumOf: { fieldId: 'g', columnId: 'p' } }, { sumOf: undefined }]);
    expect(withSumColumn({ ...f[1], sumOf: { fieldId: 'g', columnId: 'p' } } as never, 'e')).toEqual({ sumOf: { fieldId: 'g', columnId: 'e' } });
    expect(numericColumns(f[0] as never).map(c => c.id)).toEqual(['p', 'e']);
    const ruled = withColumnRule(f[0] as never, 'p', { wholeNumber: true, notMoreThan: 'e' }).columns!;
    expect(ruled[0]).toEqual({ id: 'p', label: 'Positive', type: 'numeric', wholeNumber: true, notMoreThan: 'e' });
    // A column can't be limited by itself; clearing removes the rule.
    expect(withColumnRule({ ...f[0], columns: ruled } as never, 'p', { notMoreThan: 'p', wholeNumber: false }).columns![0]).toEqual({ id: 'p', label: 'Positive', type: 'numeric' });
  });
});
