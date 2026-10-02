import { describe, it, expect } from 'vitest';
import { resolveFieldRequirements, FIELD_REQUIREMENT_PAGES, FIELD_GROUP_ORDER } from './fieldRequirementRules';
import { addOnLineMissing, addOnSubmitMissing, addOnExceptionMissing, addOnResponseMissing, validLevelDepth, ADD_ON_ORDER_DEFAULT_REQUIREMENTS } from './addOnOrderChecks';

const defaults = resolveFieldRequirements('addOnOrder', {});

describe('Add-On Orders Field Requirements (Batch 403)', () => {
  it('blocks, lines and the send-out lab are locked (Pete); the rest are switches, off by default', () => {
    const byId = Object.fromEntries(FIELD_REQUIREMENT_PAGES.addOnOrder.map(f => [f.id, f.default]));
    expect(byId).toEqual({ addOnBlocks: 'locked', addOnLines: 'locked', levelDepth: 'optional', cuttingInstructions: 'optional', sendOutLab: 'locked', exceptionNote: 'optional', responseNote: 'optional' });
    expect(ADD_ON_ORDER_DEFAULT_REQUIREMENTS).toEqual(defaults);
    for (const g of ['addOnOrder', 'addOnException', 'addOnResponse'] as const) expect(FIELD_GROUP_ORDER).toContain(g);
  });
  it('a level depth counts only as a number above 0, and only recut lines are asked', () => {
    expect([validLevelDepth(4), validLevelDepth('2.5'), validLevelDepth(''), validLevelDepth(0), validLevelDepth('x')]).toEqual([true, true, false, false, false]);
    const withDepth = resolveFieldRequirements('addOnOrder', { levelDepth: true });
    expect(addOnLineMissing({ orderKind: 'recut' }, withDepth)).toEqual(['levelDepth']);
    expect(addOnLineMissing({ orderKind: 'ihc' }, withDepth)).toEqual([]);
    expect(addOnLineMissing({ orderKind: 'recut' }, defaults)).toEqual([]);
  });
  it('the send-out lab is asked only when the order has a molecular line, and cannot be switched off', () => {
    const tried = resolveFieldRequirements('addOnOrder', { sendOutLab: false });
    expect(addOnSubmitMissing({ blockIds: ['b'], lines: [{ orderKind: 'ihc' }] }, tried)).toEqual([]);
    expect(addOnSubmitMissing({ blockIds: ['b'], lines: [{ orderKind: 'ihc' }, { orderKind: 'molecular' }] }, tried)).toEqual(['sendOutLab']);
    expect(addOnSubmitMissing({ blockIds: ['b'], lines: [{ orderKind: 'molecular', sendOutReferenceLabFacilityId: 'lab' }] }, tried)).toEqual([]);
  });
  it('the exception and response notes follow their switches', () => {
    expect(addOnExceptionMissing('', defaults)).toEqual([]);
    expect(addOnExceptionMissing(' ', resolveFieldRequirements('addOnOrder', { exceptionNote: true }))).toEqual(['exceptionNote']);
    expect(addOnResponseMissing('', resolveFieldRequirements('addOnOrder', { responseNote: true }))).toEqual(['responseNote']);
  });
});
