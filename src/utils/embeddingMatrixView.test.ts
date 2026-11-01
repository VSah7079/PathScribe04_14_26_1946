// Batch 729 (Lab Workflow & Batch spec §11.6): a matrix block is embedded through a one-block view.
import { describe, it, expect } from 'vitest';
import { matrixBlockAsEmbeddingView, matrixBlockFromEmbeddingView, matrixBlocksWithEmbeddingView, isEmbeddingMatrixView } from './embeddingMatrixView';
import { confirmPieceCount, setMoldAndOrientation, flagEmbeddingDiscrepancy, clearEmbeddingDiscrepancy } from './embeddingOperations';
import type { MatrixBlock } from '@/types/case/MatrixBlock';

const mb = { id: 'mb1', label: 'M1', status: 'Grossed', pieceCount: 3, participants: [{ specimenId: 'sp1', positionInBlock: 1 }, { specimenId: 'sp2', positionInBlock: 2 }], slides: [{ id: 's1', stainName: 'H&E', status: 'Pending Cut' }], createdAt: 'x', createdBy: 'u' } as unknown as MatrixBlock;

describe('embedding a matrix block (§11.6)', () => {
  it('the view is one block with the matrix block\'s id, label and piece count', () => {
    const view = matrixBlockAsEmbeddingView(mb);
    expect(isEmbeddingMatrixView(view)).toBe(true);
    expect(view.blocks).toHaveLength(1);
    expect(view.blocks![0]).toMatchObject({ id: 'mb1', label: 'M1', status: 'Grossed', pieceCount: 3 });
  });

  it('Confirm, mold and orientation are written back; participants and slides are untouched', () => {
    let view = matrixBlockAsEmbeddingView(mb);
    const mold = setMoldAndOrientation(view, 'mb1', { moldSize: '24x24mm', orientationInstructions: 'On edge' });
    expect(mold.ok).toBe(true);
    if (mold.ok) view = mold.specimen;
    const confirmed = confirmPieceCount(view, 'mb1', 3);
    expect(confirmed.ok).toBe(true);
    const back = matrixBlockFromEmbeddingView(mb, confirmed.ok ? confirmed.specimen : view);
    expect(back).toMatchObject({ status: 'Embedded', pieceCountAtEmbedding: 3, moldSize: '24x24mm', orientationInstructions: 'On edge' });
    expect(back.participants).toEqual(mb.participants);
    expect(back.slides).toEqual(mb.slides);
  });

  it('a flagged discrepancy is kept, and clearing it removes it', () => {
    const flagged = flagEmbeddingDiscrepancy(matrixBlockAsEmbeddingView(mb), 'mb1', 'Extra Tissue Found', 'u1');
    const withFlag = matrixBlockFromEmbeddingView(mb, flagged.ok ? flagged.specimen : matrixBlockAsEmbeddingView(mb));
    expect(withFlag.lastDiscrepancyReason).toBe('Extra Tissue Found');
    const cleared = clearEmbeddingDiscrepancy(matrixBlockAsEmbeddingView(withFlag), 'mb1');
    expect('lastDiscrepancyReason' in matrixBlockFromEmbeddingView(withFlag, cleared.ok ? cleared.specimen : matrixBlockAsEmbeddingView(withFlag))).toBe(false);
  });

  it('the case\'s matrix blocks with the one changed; null when it is gone', () => {
    const view = matrixBlockAsEmbeddingView(mb);
    expect(matrixBlocksWithEmbeddingView({ matrixBlocks: [mb] }, 'mb1', view)).toHaveLength(1);
    expect(matrixBlocksWithEmbeddingView({ matrixBlocks: [] }, 'mb1', view)).toBeNull();
  });
});
