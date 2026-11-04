// Batch 732 (spec §11.5): marking a piece used up needs material:end-state:record, is audited, and the last piece
// records the block's "exhausted" end state.
import { describe, it, expect, vi } from 'vitest';
import type { Case } from '@/types/case/Case';
import { markBlockPieceExhausted } from './pieceExhaustion';

const caseData = () => ({
  id: 'S26-5', accession: { fullAccession: 'S26-5' },
  specimens: [{ id: 'sp1', label: 'A', blocks: [{ id: 'b1', label: '1', status: 'Embedded', stains: [], blockType: 'multi_piece',
    pieces: [{ id: 'p1', position: 1, partLabel: 'A' }, { id: 'p2', position: 2, partLabel: 'A', exhaustedAt: 'x' }] }] }],
} as unknown as Case);
const deps = (allowed = true) => ({ enforce: vi.fn(async () => ({ allowed })), saveSpecimens: vi.fn(async () => {}), audit: vi.fn(async () => ({})), recordEndState: vi.fn() });
const actor = { id: 'u1', name: 'Tech' };

describe('markBlockPieceExhausted', () => {
  it('needs material:end-state:record', async () => {
    const d = deps(false);
    expect(await markBlockPieceExhausted({ caseData: caseData(), blockId: 'b1', pieceId: 'p1', actor }, d)).toEqual({ ok: false, notPermitted: true });
    expect(d.enforce).toHaveBeenCalledWith('material:end-state:record', { caseId: 'S26-5' });
    expect(d.saveSpecimens).not.toHaveBeenCalled();
  });
  it('the last piece makes the block Exhausted and records its end state; audited', async () => {
    const d = deps();
    const r = await markBlockPieceExhausted({ caseData: caseData(), blockId: 'b1', pieceId: 'p1', actor }, d);
    expect(r).toMatchObject({ ok: true, blockExhausted: true });
    expect(d.audit).toHaveBeenCalledTimes(1);
    expect(d.recordEndState).toHaveBeenCalledWith(expect.objectContaining({ itemId: 'S26-5-A1', state: 'exhausted' }));
    expect(await markBlockPieceExhausted({ caseData: caseData(), blockId: 'b1', pieceId: 'p2', actor }, deps())).toEqual({ ok: false, failed: true });
  });
});
