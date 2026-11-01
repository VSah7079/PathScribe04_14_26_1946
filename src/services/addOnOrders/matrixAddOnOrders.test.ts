// Batch 737 (Lab Workflow & Batch spec §11.4, §11.5): add-on orders on a matrix block (one cassette shared by several
// parts), for the whole block or some of its parts; answering and tracking them; a matrix part marked used up.
import { describe, it, expect, vi } from 'vitest';
import type { Case } from '@/types/case/Case';
import type { MatrixBlock } from '@/types/case/MatrixBlock';
import type { StainType } from '@/services/stains/IStainService';
import { resolveFieldRequirements } from '../fieldRequirements/fieldRequirementRules';
import { placeAddOnOrders, findAddOnOrder, markAddOnBlockRetrieved } from './addOnOrderActions';
import { markBlockPieceExhausted } from '../material/pieceExhaustion';

const reqs = () => resolveFieldRequirements('addOnOrder', {});
const actor = { id: 'path-1', name: 'Dr. Chen' };
const pas = { id: 'st-pas', name: 'PAS', category: 'Special Stains', active: true } as unknown as StainType;
const submission = { priority: 'Routine Sign-Out' as const, slideMediaType: 'Standard Charged' as const };

const matrix = (over: Partial<MatrixBlock> = {}): MatrixBlock => ({
  id: 'm1', label: 'M1', status: 'Embedded', slides: [],
  participants: [{ specimenId: 'spA', positionInBlock: 1 }, { specimenId: 'spB', positionInBlock: 2 }, { specimenId: 'spC', positionInBlock: 3 }],
  ...over,
} as MatrixBlock);
const theCase = (mb: MatrixBlock = matrix()): Case => ({
  id: 'S26-7', accession: { fullAccession: 'S26-7' },
  specimens: [{ id: 'spA', label: 'A', blocks: [] }, { id: 'spB', label: 'B', blocks: [] }, { id: 'spC', label: 'C', blocks: [] }],
  matrixBlocks: [mb],
} as unknown as Case);

function deps() {
  return { enforce: vi.fn(async () => ({ allowed: true })), saveSpecimens: vi.fn(async (_c: Case, _s: unknown[], _m?: MatrixBlock[]) => {}), audit: vi.fn(async () => ({})), recordEndState: vi.fn() };
}
const savedMatrix = (d: ReturnType<typeof deps>) => d.saveSpecimens.mock.calls[0][2]![0];

describe('add-on orders on a matrix block', () => {
  it('orders for the whole block: the new slide is cut through every part and saved on the matrix block', async () => {
    const d = deps();
    const r = await placeAddOnOrders({ caseData: theCase(), blockIds: ['m1'], lines: [{ stainType: pas, orderKind: 'special_stain' }], submission, actor, requirements: reqs(), performingLabFacilityId: 'lab-1' }, d);
    expect(r.ok).toBe(true);
    const slide = savedMatrix(d).slides[0];
    expect(slide).toMatchObject({ stainName: 'PAS', status: 'Pending Cut', performingLabFacilityId: 'lab-1', targetSpecimenIds: ['spA', 'spB', 'spC'] });
    expect(slide.displayId).toBe('S26-7-M1-L1');
  });

  it('orders for some parts only: the slide names those parts', async () => {
    const d = deps();
    await placeAddOnOrders({ caseData: theCase(), blockIds: ['m1'], lines: [{ stainType: pas, orderKind: 'special_stain' }], submission, actor, requirements: reqs(), pieceIdsByBlock: { m1: ['spB'] } }, d);
    expect(savedMatrix(d).slides[0].targetSpecimenIds).toEqual(['spB']);
  });

  it('refuses parts that are used up, and an exhausted matrix block, with its own message', async () => {
    const used = matrix({ participants: [{ specimenId: 'spA', positionInBlock: 1, exhaustedAt: 'x' }, { specimenId: 'spB', positionInBlock: 2 }] } as Partial<MatrixBlock>);
    const d = deps();
    const r = await placeAddOnOrders({ caseData: theCase(used), blockIds: ['m1'], lines: [{ stainType: pas, orderKind: 'special_stain' }], submission, actor, requirements: reqs(), pieceIdsByBlock: { m1: ['spA'] } }, d);
    expect(r.refused).toEqual([{ block: 'M1', code: 'matrixExhausted' }]);
    const r2 = await placeAddOnOrders({ caseData: theCase(matrix({ status: 'Exhausted' })), blockIds: ['m1'], lines: [{ stainType: pas, orderKind: 'special_stain' }], submission, actor, requirements: reqs() }, d);
    expect(r2.refused).toEqual([{ block: 'M1', code: 'matrixExhausted' }]);
    expect(d.saveSpecimens).not.toHaveBeenCalled();
  });

  it('an order on a matrix block is found and answered like any other, and saved back on the matrix block', async () => {
    const d = deps();
    await placeAddOnOrders({ caseData: theCase(), blockIds: ['m1'], lines: [{ stainType: pas, orderKind: 'special_stain' }], submission, actor, requirements: reqs() }, d);
    const withOrder = theCase(savedMatrix(d));
    const id = withOrder.matrixBlocks![0].slides[0].id;
    expect(findAddOnOrder(withOrder, id)?.block.id).toBe('m1');
    const d2 = deps();
    const r = await markAddOnBlockRetrieved({ caseData: withOrder, stainOrderId: id, actor }, d2);
    expect(r.ok).toBe(true);
    expect(d2.saveSpecimens.mock.calls[0][2]![0].slides[0].blockRetrievedAt).toBeTruthy();
  });

  it('a matrix part can be marked used up at the Microtome; the last one makes the block Exhausted', async () => {
    const d = deps();
    const r = await markBlockPieceExhausted({ caseData: theCase(), blockId: 'm1', pieceId: 'spB', actor }, { ...d, saveSpecimens: d.saveSpecimens });
    expect(r.ok && r.blockExhausted).toBe(false);
    expect(d.audit).toHaveBeenCalledWith(expect.objectContaining({ event: 'Block Piece Exhausted', detail: 'S26-7-M1 piece 2 (part B) used up' }));
  });
});
