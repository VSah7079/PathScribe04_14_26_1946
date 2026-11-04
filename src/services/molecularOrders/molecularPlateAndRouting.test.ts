// Batch 467: molecular routing choices and the plate orchestrator (spec wellBindingContract).
import { describe, it, expect } from 'vitest';
import { molecularRoutingChoices, resolveMolecularRouting } from './molecularRouting';
import { bindOrdersToPlate, freeSampleWells, unbindOrderFromPlate, wellBindingOf } from './molecularPlateOrchestrator';
import type { MolecularBatch } from '../molecular/IMolecularBatchService';
import type { MolecularAssayControlRule } from '../molecular/IMolecularAssayControlRuleService';
import type { MolecularOrder } from './molecularOrderTypes';

const test = { category: 'Molecular' as const, inHouseFacilityIds: ['lab-a'] };

describe('molecularRoutingChoices / resolveMolecularRouting', () => {
  it('offers in-house first only at a lab that runs the test', () => {
    expect(molecularRoutingChoices(test, 'lab-a')).toEqual({ choices: ['IN_HOUSE', 'SEND_OUT'], defaultRouting: 'IN_HOUSE' });
    expect(molecularRoutingChoices(test, 'lab-b')).toEqual({ choices: ['SEND_OUT'], defaultRouting: 'SEND_OUT' });
    expect(molecularRoutingChoices(test, undefined).defaultRouting).toBe('SEND_OUT');
    expect(molecularRoutingChoices({ category: 'IHC' as never, inHouseFacilityIds: ['lab-a'] }, 'lab-a').choices).toEqual(['SEND_OUT']);
  });
  it('takes the requested routing when allowed, the default when none, else refuses', () => {
    expect(resolveMolecularRouting(test, 'lab-a', 'SEND_OUT')).toBe('SEND_OUT');
    expect(resolveMolecularRouting(test, 'lab-a', undefined)).toBe('IN_HOUSE');
    expect(resolveMolecularRouting(test, 'lab-b', 'IN_HOUSE')).toBeUndefined();
  });
});

const RULES = [{ id: 'r', assayCode: 'egfr', createdAt: '', requiredControls: [
  { sampleType: 'CONTROL_NTC', positionMode: 'fixed', fixedWellPosition: 'A01' },
  { sampleType: 'CONTROL_PTC_HIGH', positionMode: 'fixed', fixedWellPosition: 'B03' },
  { sampleType: 'CONTROL_PTC_LOW', positionMode: 'any' },
] }] as unknown as MolecularAssayControlRule[];

const batch = (over: Partial<MolecularBatch> = {}) => ({
  id: 'mb', batchUuid: 'u', assayCode: 'egfr', plateBarcode: 'PLT', plateLayout: '6_well', status: 'draft',
  wells: [{ wellPosition: 'A01', sampleType: 'CONTROL_NTC', controlInfo: { controlId: 'NTC', expectedValue: 'NEGATIVE' } }],
  ...over,
} as unknown as MolecularBatch);

const order = (id: string, over: Partial<MolecularOrder> = {}) => ({ orderId: id, accession: 'S26-1', specimenId: 'sp', assayTarget: 'egfr', routing: 'IN_HOUSE', status: 'QUEUED', ...over } as MolecularOrder);

describe('freeSampleWells', () => {
  it('lists free wells in row order, skipping taken wells and fixed control positions (assay rule payload)', () => {
    expect(freeSampleWells(batch(), RULES)).toEqual(['A02', 'A03', 'B01', 'B02']);
  });
});

describe('bindOrdersToPlate / unbindOrderFromPlate', () => {
  it('binds all orders or none', () => {
    const r = bindOrdersToPlate(batch(), [order('o1'), order('o2')], RULES);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.positions).toEqual({ o1: 'A02', o2: 'A03' });
    expect(r.wells.filter(w => w.orderId).map(w => w.wellPosition)).toEqual(['A02', 'A03']);
    expect(bindOrdersToPlate(batch(), ['1', '2', '3', '4', '5'].map(i => order(i)), RULES)).toEqual({ ok: false, refused: 'plateFull' });
  });
  it('refuses send-out, non-queued, wrong-assay orders and non-draft plates', () => {
    expect(bindOrdersToPlate(batch(), [order('o', { routing: 'SEND_OUT' })], RULES)).toEqual({ ok: false, refused: 'sendOut' });
    expect(bindOrdersToPlate(batch(), [order('o', { status: 'IN_RUN' })], RULES)).toEqual({ ok: false, refused: 'wrongStatus' });
    expect(bindOrdersToPlate(batch(), [order('o', { assayTarget: 'kras' })], RULES)).toEqual({ ok: false, refused: 'assayMismatch' });
    expect(bindOrdersToPlate(batch({ status: 'active' }), [order('o')], RULES)).toEqual({ ok: false, refused: 'plateNotDraft' });
  });
  it('replaces an empty well record at the bound position', () => {
    const r = bindOrdersToPlate(batch({ wells: [{ wellPosition: 'A02' } as never] }), [order('o1')], RULES);
    expect(r.ok && r.wells).toEqual([expect.objectContaining({ wellPosition: 'A02', orderId: 'o1', sampleType: 'PATIENT_SPECIMEN' })]);
  });
  it('unbinding removes only that order\'s well, and only on a draft plate', () => {
    const bound = bindOrdersToPlate(batch(), [order('o1'), order('o2')], RULES);
    const b = batch({ wells: bound.ok ? bound.wells : [] });
    const r = unbindOrderFromPlate(b, 'o1');
    expect(r.ok && r.wells.map(w => w.orderId ?? w.wellPosition)).toEqual(['A01', 'o2']);
    expect(unbindOrderFromPlate(batch({ worklistDispatchedAt: 'x' }), 'o1')).toEqual({ ok: false, refused: 'plateNotDraft' });
  });
});

describe('wellBindingOf (spec wellBindingContract)', () => {
  it('reads a sample well with its order and a control well with its control', () => {
    expect(wellBindingOf({ wellPosition: 'A02', sampleType: 'PATIENT_SPECIMEN', orderId: 'o1' } as never)).toEqual({ wellPosition: 'A02', wellType: 'SAMPLE', orderId: 'o1', controlId: null });
    expect(wellBindingOf({ wellPosition: 'A01', sampleType: 'CONTROL_NTC', controlInfo: { controlId: 'NTC' } } as never)).toEqual({ wellPosition: 'A01', wellType: 'CONTROL', orderId: null, controlId: 'NTC' });
    expect(wellBindingOf({ wellPosition: 'A03' } as never)).toBeNull();
  });
});
