// Batch 460: grossing never reuses a removed slide's level (and barcode).
import { describe, it, expect } from 'vitest';
import { addGrossingStain } from './grossingScreenOperations';
import type { Specimen } from '@/types/case/Specimen';
import type { StainType } from '@/services/stains/IStainService';

const sp = {
  id: 'sp', label: 'A',
  blocks: [{ id: 'b1', label: '1', status: 'Grossed', stains: [
    { id: 's1', stainName: 'H&E', status: 'Pending Cut', displayId: 'S26-1-A1-L1' },
    { id: 's3', stainName: 'PAS', status: 'Cut & Placed', displayId: 'S26-1-A1-L3' },
  ] }],
} as unknown as Specimen;

describe('slide levels when adding stains', () => {
  it('a grossing stain takes the next unused level', () => {
    const r = addGrossingStain(sp, 'b1', { id: 'ki', name: 'Ki-67', category: 'IHC' } as StainType, 'u', 'S26-1');
    expect(r.ok && r.specimen.blocks![0].stains[2].displayId).toBe('S26-1-A1-L4');
  });
});
