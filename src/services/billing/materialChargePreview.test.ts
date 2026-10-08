// Batch 460: the read-only charges at the Microtomy bench.
import { describe, it, expect } from 'vitest';
import { materialChargePreview } from './materialChargePreview';
import type { StainType } from '../stains/IStainService';

const types = [
  { id: 'he', name: 'H&E', category: 'Routine', active: true },
  { id: 'ki', name: 'Ki-67', category: 'IHC', active: true },
  { id: 'pas', name: 'PAS', category: 'Special Stain', defaultBillingCode: 'SPECIAL-STAIN', active: true },
] as unknown as StainType[];

const caseData = {
  specimens: [
    { id: 'A', label: 'A', blocks: [{ id: 'b1', label: '1', stains: [
      { id: 's-he', stainName: 'H&E' }, { id: 's-ki', stainName: 'Ki-67' }, { id: 's-pas', stainName: 'PAS' },
    ], coding: { cpt: [{ code: 'SPECIAL-STAIN', stainOrderId: 's-pas' }], rejectedCpt: [] } }] },
    { id: 'D', label: 'D', matrixBlockIds: ['mb'] }, { id: 'E', label: 'E', matrixBlockIds: ['mb'] },
  ],
  matrixBlocks: [{ id: 'mb', label: 'M1', participants: [{ specimenId: 'D', positionInBlock: 1 }, { specimenId: 'E', positionInBlock: 2 }],
    slides: [{ id: 'm-ki', stainName: 'Ki-67', targetSpecimenIds: ['D', 'E'] }, { id: 'm-he', stainName: 'H&E' }] }],
};

describe('materialChargePreview', () => {
  it('one row per slide, with the code and its state; the ledger status of an applied code', () => {
    const charges = [{ id: 'c1', transactionType: 'charge', specimenId: 'A', blockId: 'b1', billingCode: 'SPECIAL-STAIN', resolvedAt: '2026-10-01', approvalStatus: 'PENDING_APPROVAL' }] as any;
    const p = materialChargePreview({ caseData, target: { kind: 'unit', specimenId: 'A', unitId: 'b1' }, stainTypes: types, charges });
    const byLabel = Object.fromEntries(p.rows.map(r => [r.label, r]));
    expect(byLabel['H&E'].state).toBe('noCode');
    expect(byLabel['Ki-67']).toMatchObject({ state: 'pending' });
    expect(byLabel['Ki-67'].codes.length).toBe(1);
    expect(byLabel.PAS).toMatchObject({ state: 'applied', codes: ['SPECIAL-STAIN'], ledger: 'awaitingApproval' });
    expect(p.warnings).toEqual([{ kind: 'awaitingApproval', count: 1 }]);
  });
  it('a credited charge is not shown as charged', () => {
    const charges = [
      { id: 'c1', transactionType: 'charge', specimenId: 'A', blockId: 'b1', billingCode: 'SPECIAL-STAIN', resolvedAt: '2026-10-01' },
      { id: 'crd-c1', transactionType: 'credit', reversesTransactionId: 'c1', specimenId: 'A', blockId: 'b1', billingCode: 'SPECIAL-STAIN', resolvedAt: '2026-10-02' },
    ] as any;
    const p = materialChargePreview({ caseData, target: { kind: 'unit', specimenId: 'A', unitId: 'b1' }, stainTypes: types, charges });
    expect(p.rows.find(r => r.label === 'PAS')!.ledger).toBeUndefined();
  });
  it('a matrix block: one row per specimen; a billable slide awaiting evaluated cores is flagged, H&E is not', () => {
    const p = materialChargePreview({ caseData, target: { kind: 'matrix', matrixBlockId: 'mb' }, stainTypes: types });
    expect(p.rows.map(r => r.label)).toEqual(['D', 'E']);
    expect(p.rows.every(r => r.state === 'noCode')).toBe(true);
    expect(p.warnings).toEqual([{ kind: 'coresNotEvaluated', slideLabel: 'Ki-67' }]);
  });
  it('once cores are evaluated, each specimen has its own pending code', () => {
    const evaluated = { ...caseData, matrixBlocks: [{ ...caseData.matrixBlocks[0], slides: [{ ...caseData.matrixBlocks[0].slides[0], evaluatedSpecimenIds: ['D', 'E'] }] }] };
    const p = materialChargePreview({ caseData: evaluated, target: { kind: 'matrix', matrixBlockId: 'mb' }, stainTypes: types });
    expect(p.rows.map(r => [r.label, r.state, r.codes])).toEqual([['D', 'pending', ['IHC-FIRST']], ['E', 'pending', ['IHC-ADDL']]]);
    expect(p.warnings).toEqual([]);
  });
});
