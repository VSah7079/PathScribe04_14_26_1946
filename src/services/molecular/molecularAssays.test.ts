// Batch 406: the assays offered on the molecular screens.
import { describe, it, expect } from 'vitest';
import { molecularAssayTypes } from './molecularAssays';
import type { StainType } from '../stains/IStainService';

describe('molecularAssayTypes', () => {
  it('active Molecular catalog entries only, by name', () => {
    const list = [
      { id: 'b', name: 'KRAS', category: 'Molecular', active: true },
      { id: 'a', name: 'HPV', category: 'Molecular', active: true },
      { id: 'c', name: 'Old PCR', category: 'Molecular', active: false },
      { id: 'd', name: 'H&E', category: 'Routine', active: true },
    ] as StainType[];
    expect(molecularAssayTypes(list).map(s => s.id)).toEqual(['a', 'b']);
  });
});
