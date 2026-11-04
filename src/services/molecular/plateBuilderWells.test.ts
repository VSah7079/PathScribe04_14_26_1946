// src/services/molecular/plateBuilderWells.test.ts
import { describe, it, expect } from 'vitest';
import type { MolecularWell } from './IMolecularBatchService';
import { emptyPlateWells, autoPopulatePlateWells, plateGridWells } from './plateBuilderWells';

describe('plateBuilderWells (PS-229) — the plate builder\'s auto-fill', () => {
  it('a new plate starts with every well of its layout empty, in row-major order', () => {
    const wells = emptyPlateWells('6_well');
    expect(wells).toEqual(['A01', 'A02', 'A03', 'B01', 'B02', 'B03'].map(wellPosition => ({ wellPosition })));
    expect(emptyPlateWells('96_well')).toHaveLength(96);
  });

  it('row-major auto-fill marks every still-empty well as a patient specimen well, walking each row in turn', () => {
    const start: MolecularWell[] = emptyPlateWells('6_well').map(w => (w.wellPosition === 'A01' ? { ...w, sampleType: 'CONTROL_NTC' } : w));
    const filled = autoPopulatePlateWells(start, '6_well', 'row_major');
    expect(filled.map(w => w.wellPosition)).toEqual(['A01', 'A02', 'A03', 'B01', 'B02', 'B03']);
    expect(filled.map(w => w.sampleType)).toEqual(['CONTROL_NTC', 'PATIENT_SPECIMEN', 'PATIENT_SPECIMEN', 'PATIENT_SPECIMEN', 'PATIENT_SPECIMEN', 'PATIENT_SPECIMEN']);
  });

  it('column-major auto-fill walks down each column, so the next empty well after A01 is B01', () => {
    const start: MolecularWell[] = emptyPlateWells('6_well').map(w => (w.wellPosition === 'A01' ? { ...w, sampleType: 'CONTROL_NTC' } : w));
    const filled = autoPopulatePlateWells(start, '6_well', 'column_major');
    expect(filled.map(w => w.wellPosition)).toEqual(['A01', 'B01', 'A02', 'B02', 'A03', 'B03']);
    const firstPatient = filled.find(w => w.sampleType === 'PATIENT_SPECIMEN');
    expect(firstPatient?.wellPosition).toBe('B01');
  });

  it('never overwrites a well that already has a sample type, its control lot or its scanned specimen, and invents no specimen data', () => {
    const start: MolecularWell[] = emptyPlateWells('6_well').map(w => {
      if (w.wellPosition === 'A02') return { ...w, sampleType: 'CONTROL_PTC_HIGH', controlInfo: { controlId: 'c1', controlLotNumber: 'L1', controlExpirationDate: '2030-01-01', expectedValue: 'POSITIVE' } };
      if (w.wellPosition === 'B03') return { ...w, sampleType: 'PATIENT_SPECIMEN', containerBarcode: 'SPEC-9', accessionNumber: 'PS26-9' };
      return w;
    });
    const filled = autoPopulatePlateWells(start, '6_well', 'row_major');
    expect(filled.find(w => w.wellPosition === 'A02')).toEqual(start.find(w => w.wellPosition === 'A02'));
    expect(filled.find(w => w.wellPosition === 'B03')).toEqual(start.find(w => w.wellPosition === 'B03'));
    for (const w of filled.filter(x => !['A02', 'B03'].includes(x.wellPosition))) {
      expect(w).toEqual({ wellPosition: w.wellPosition, sampleType: 'PATIENT_SPECIMEN' });
    }
  });

  it('does not change the list it was given', () => {
    const start = emptyPlateWells('6_well');
    autoPopulatePlateWells(start, '6_well', 'row_major');
    expect(start.every(w => w.sampleType === undefined)).toBe(true);
  });
});

// Batch 451: the grid draws wells by position, whatever order the list is in.
describe('plateGridWells — the grid shows each well in its own position', () => {
  const row = (wells: { wellPosition: string }[], r: number, cols = 12) => wells.slice(r * cols, (r + 1) * cols).map(w => w.wellPosition);

  it('after a column-major auto-fill, the first grid row is still A01…A12', () => {
    const filled = autoPopulatePlateWells(emptyPlateWells('96_well'), '96_well', 'column_major');
    expect(filled[1].wellPosition).toBe('B01'); // the list itself is in fill order
    const grid = plateGridWells(filled, '96_well');
    expect(grid).toHaveLength(96);
    expect(row(grid, 0)).toEqual(['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12']);
    expect(grid.every(w => w.sampleType === 'PATIENT_SPECIMEN')).toBe(true);
  });

  it('an existing batch that stored only its assigned wells shows them in place, with empty wells between', () => {
    const grid = plateGridWells([{ wellPosition: 'A01', sampleType: 'PATIENT_SPECIMEN' }, { wellPosition: 'B01', sampleType: 'NEGATIVE_CONTROL' }] as never, '96_well');
    expect(grid[0]).toMatchObject({ wellPosition: 'A01', sampleType: 'PATIENT_SPECIMEN' });
    expect(grid[1]).toEqual({ wellPosition: 'A02' });
    expect(grid[12]).toMatchObject({ wellPosition: 'B01', sampleType: 'NEGATIVE_CONTROL' });
  });
});
