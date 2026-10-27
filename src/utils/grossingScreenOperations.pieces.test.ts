import { describe, it, expect } from 'vitest';
import { updateGrossingPieceDescription, updateMatrixBlockPieces } from './grossingScreenOperations';
import type { Specimen } from '@/types/case/Specimen';

const specimen = { id: 'sp1', label: 'A', blocks: [{ id: 'b1', label: '1', status: 'Pending', stains: [] }] } as unknown as Specimen;

describe('Batch 659: piece description and matrix block pieces', () => {
  it('records a block piece description and logs the change', () => {
    const r = updateGrossingPieceDescription(specimen, 'b1', '  3 tan fragments ', 'u1');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.specimen.blocks?.[0].pieceDescription).toBe('3 tan fragments');
      expect(r.specimen.grossingOverrides?.[0]).toMatchObject({ field: 'pieceDescription', newValue: '3 tan fragments' });
    }
    expect(updateGrossingPieceDescription(specimen, 'nope', 'x', 'u1').ok).toBe(false);
  });
  it('updates only the chosen matrix block, and refuses an unknown one', () => {
    const blocks = [{ id: 'm1', label: 'M1' }, { id: 'm2', label: 'M2' }];
    const next = updateMatrixBlockPieces(blocks, 'm1', { pieceCount: 4, pieceDescription: ' two cores ' });
    expect(next?.[0]).toMatchObject({ pieceCount: 4, pieceDescription: 'two cores' });
    expect(next?.[1]).toEqual(blocks[1]);
    expect(updateMatrixBlockPieces(blocks, 'zz', { pieceCount: 1 })).toBeNull();
  });
});
