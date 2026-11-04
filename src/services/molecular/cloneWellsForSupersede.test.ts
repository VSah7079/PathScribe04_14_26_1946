// Batch 669 (mol-9): the wells a Clone & Supersede carries onto the new plate.
import { describe, it, expect } from 'vitest';
import { cloneWellsForSupersede } from './cloneWellsForSupersede';
import type { MolecularBatch } from './IMolecularBatchService';

const wells: MolecularBatch['wells'] = [
  { wellPosition: 'A01', sampleType: 'CONTROL_NTC', controlInfo: { controlId: 'N', controlLotNumber: 'N', controlExpirationDate: '2027-01-01T00:00:00.000Z', expectedValue: 'NEGATIVE' } },
  { wellPosition: 'A03', sampleType: 'PATIENT_SPECIMEN', accessionNumber: 'S1', specimenUuid: 'u1', containerBarcode: 'C1', orderId: 'MO-1', movementHistory: [{} as never] },
  { wellPosition: 'A04', sampleType: 'PATIENT_SPECIMEN', accessionNumber: 'S2', containerBarcode: 'C2', movementHistory: [{} as never] },
  { wellPosition: 'A05' },
];

describe('cloneWellsForSupersede', () => {
  it('an undispatched draft plate keeps its controls and the wells bound to orders; other patient wells are cleared', () => {
    const out = cloneWellsForSupersede({ wells, status: 'draft' });
    expect(out.find(w => w.wellPosition === 'A01')).toMatchObject({ sampleType: 'CONTROL_NTC', controlInfo: { controlId: 'N' } });
    expect(out.find(w => w.wellPosition === 'A03')).toEqual({ wellPosition: 'A03', sampleType: 'PATIENT_SPECIMEN', orderId: 'MO-1', accessionNumber: 'S1', specimenUuid: 'u1' });
    expect(out.find(w => w.wellPosition === 'A04')?.sampleType).toBeUndefined();
    expect(out.find(w => w.wellPosition === 'A04')?.accessionNumber).toBeUndefined();
  });

  it('no well keeps its container barcode or movement history (each specimen is scanned again)', () => {
    for (const w of cloneWellsForSupersede({ wells, status: 'draft' })) {
      expect(w.movementHistory).toBeUndefined();
      expect(w.containerBarcode).toBeUndefined();
    }
  });

  it('a dispatched or non-draft plate keeps no orders (they are running on it)', () => {
    expect(cloneWellsForSupersede({ wells, status: 'draft', worklistDispatchedAt: 'x' }).find(w => w.wellPosition === 'A03')?.sampleType).toBeUndefined();
    expect(cloneWellsForSupersede({ wells, status: 'active' }).find(w => w.wellPosition === 'A03')?.orderId).toBeUndefined();
  });
});
