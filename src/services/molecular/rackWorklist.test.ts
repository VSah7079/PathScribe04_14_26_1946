// Batch 406: the Extraction Racks list's rows.
import { describe, it, expect } from 'vitest';
import { rackWorklistRows } from './rackWorklist';
import type { MolecularExtractionRack } from './IMolecularExtractionRackService';

const rack = (id: string, createdAt: string, over: Partial<MolecularExtractionRack> = {}): MolecularExtractionRack => ({
  id, rackBarcode: id.toUpperCase(), rackUuid: id, capacity: 4, createdAt, createdByUserId: 'u', createdByUserName: 'U',
  positions: [{ positionLabel: '1', containerBarcode: 'T1', accessionNumber: 'A1' }, { positionLabel: '2' }], ...over,
});

describe('rackWorklistRows', () => {
  it('newest first, with how full each rack is and where it stands', () => {
    const rows = rackWorklistRows([
      rack('a', '2026-09-01'),
      rack('b', '2026-09-03', { positions: [{ positionLabel: '1', containerBarcode: 'T9' }] }),
      rack('c', '2026-09-02', { placement: { instrumentCode: 'PANTHER_01', deckSlotId: 'SLOT_A1', via: 'deckScan', placedAt: 'x', placedByUserId: 'u', placedByUserName: 'U' } }),
    ]);
    expect(rows.map(r => [r.id, r.status, r.occupied])).toEqual([['b', 'needsSampleIds', 1], ['c', 'placed', 1], ['a', 'loading', 1]]);
    expect(rows[1]).toMatchObject({ instrumentCode: 'PANTHER_01', deckSlotId: 'SLOT_A1' });
  });
});
