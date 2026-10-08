// Batch 467: synoptic questions answered by an in-house molecular result.
import { describe, it, expect } from 'vitest';
import { boundFieldFor, decideHydration, molecularBindingProblem, molecularFieldNotice, molecularResultDeltas, withMolecularAssay, withMolecularValue } from './molecularResultBinding';

const field = { id: 'egfr', type: 'dropdown', options: [{ id: 'det', label: 'Detected' }, { id: 'not', label: 'Not detected' }], molecularResult: { assayCodes: ['st-egfr'], values: { POSITIVE: 'det', NEGATIVE: 'not' } } };
const multi = { ...field, id: 'multi', type: 'checkboxes', molecularResult: { assayCodes: ['st-kras'], values: { POSITIVE: 'det' } } };
const template = { sections: [{ fields: [{ id: 'other', type: 'text' }, field, multi] }] };
const src = { egfr: { orderId: 'MO-1', assayName: 'EGFR PCR', call: 'POSITIVE' } };

describe('boundFieldFor / decideHydration', () => {
  it('finds the question bound to a test', () => {
    expect(boundFieldFor(template, 'st-egfr')?.id).toBe('egfr');
    expect(boundFieldFor(template, 'st-none')).toBeUndefined();
  });
  it('answers an empty question, keeps a matching one, suggests beside a different one', () => {
    expect(decideHydration(field, 'POSITIVE', {})).toEqual({ kind: 'answer', fieldId: 'egfr', value: 'det' });
    expect(decideHydration(multi, 'POSITIVE', { multi: [] })).toEqual({ kind: 'answer', fieldId: 'multi', value: ['det'] });
    expect(decideHydration(field, 'POSITIVE', { egfr: 'det' })).toEqual({ kind: 'same', fieldId: 'egfr' });
    expect(decideHydration(field, 'POSITIVE', { egfr: 'not' })).toEqual({ kind: 'suggest', fieldId: 'egfr', value: 'det' });
  });
  it('changes nothing for an unmapped call or a value that is not one of the answers', () => {
    expect(decideHydration(multi, 'NEGATIVE', {})).toEqual({ kind: 'none' });
    expect(decideHydration(field, 'INDETERMINATE', {})).toEqual({ kind: 'none' });
    expect(decideHydration({ ...field, options: [] }, 'POSITIVE', {})).toEqual({ kind: 'none' });
  });
});

describe('deltas and notices (Engine Delta tag)', () => {
  it('reports a delta only when the answer differs from the recorded result', () => {
    expect(molecularResultDeltas(template, { egfr: 'det' }, src)).toEqual([]);
    expect(molecularResultDeltas(template, { egfr: 'not' }, src)).toEqual([{ fieldId: 'egfr', resultValue: 'det', orderId: 'MO-1', assayName: 'EGFR PCR', call: 'POSITIVE' }]);
  });
  it('a notice names the source, with the result to accept when it differs', () => {
    expect(molecularFieldNotice(template, { egfr: 'det' }, src, 'egfr')).toEqual({ assayName: 'EGFR PCR', orderId: 'MO-1' });
    expect(molecularFieldNotice(template, { egfr: 'not' }, src, 'egfr')?.delta).toEqual({ resultValue: 'det', resultLabel: 'Detected', answer: 'det' });
    // A checkbox question takes the result as a list.
    expect(molecularFieldNotice(template, { multi: ['not'] }, { multi: { orderId: 'MO-2', assayName: 'KRAS', call: 'POSITIVE' } }, 'multi')?.delta?.answer).toEqual(['det']);
    expect(molecularFieldNotice(template, {}, src, 'other')).toBeUndefined();
  });
});

describe('editor helpers', () => {
  it('choosing a test keeps the meanings; no test removes the binding', () => {
    expect(withMolecularAssay(field.molecularResult, 'st-x')).toEqual({ molecularResult: { assayCodes: ['st-x'], values: field.molecularResult.values } });
    expect(withMolecularAssay(undefined, 'st-x')).toEqual({ molecularResult: { assayCodes: ['st-x'], values: {} } });
    expect(withMolecularAssay(field.molecularResult, '')).toEqual({ molecularResult: undefined });
  });
  it('sets or clears what a call means', () => {
    expect(withMolecularValue(field.molecularResult, 'NEGATIVE', '').molecularResult?.values).toEqual({ POSITIVE: 'det' });
    expect(withMolecularValue(undefined, 'NEGATIVE', 'not')).toEqual({});
  });
  it('flags a binding the engine cannot use', () => {
    expect(molecularBindingProblem(field)).toBeUndefined();
    expect(molecularBindingProblem({ ...field, molecularResult: { assayCodes: [], values: {} } })).toBe('noAssay');
    expect(molecularBindingProblem({ ...field, molecularResult: { assayCodes: ['a'], values: { POSITIVE: 'gone' } } })).toBe('noValues');
    expect(molecularBindingProblem({ id: 'x', type: 'text' })).toBeUndefined();
  });
});

describe('Batch 467b: bound templates', () => {
  it('the colorectal molecular questions and breast HER2 ISH take their tests\' results, keeping the seeded answers\' meaning', async () => {
    const crc = (await import('@/data/templates/generic/colorectal_further_investigations.json')).default as never;
    const breast = (await import('@/data/templates/generic/breast_invasive.json')).default as never;
    const lung = (await import('@/data/templates/generic/lung_adeno.json')).default as never;
    for (const [tpl, assay, field] of [[crc, 'st-kras-pcr', 'kras_status'], [crc, 'st-nras-pcr', 'nras_status'], [crc, 'st-braf-v600e-pcr', 'braf_v600e_status'], [crc, 'st-msi-pcr', 'msi_status'], [breast, 'st-her2-fish', 'her2_ish_status'], [lung, 'st-egfr-pcr', 'egfr_status']] as const) {
      const f = boundFieldFor(tpl, assay);
      expect(f?.id, assay).toBe(field);
      expect(molecularBindingProblem(f!), assay).toBeUndefined();
    }
    const msi = boundFieldFor(crc, 'st-msi-pcr')!;
    expect(msi.options!.find(o => o.id === msi.molecularResult!.values.NEGATIVE)!.label).toBe('Microsatellite stable (MSS)');
    const kras = boundFieldFor(crc, 'st-kras-pcr')!;
    expect(kras.options!.find(o => o.id === 'kras_status_opt_1')!.label).toBe('Mutation detected'); // the seeded KRAS answer
  });
});
