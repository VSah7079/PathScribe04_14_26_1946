import { describe, it, expect } from 'vitest';
import { slotsForRack, deckSlotRequired, checkDeckSlot, parseDeckLocationBarcode, resolveDeckScan } from './deckSlots';
import type { DeckSlot } from '../equipment/IEquipmentService';
import { generateDeckLocationLabel } from './resolveMolecularBarcodes';

const panther = { deckSlots: [
  { id: 'SLOT_A1', rackTypes: ['sample_tube_rack'] },
  { id: 'SLOT_A2', rackTypes: ['sample_tube_rack'] },
  { id: 'SLOT_A4', rackTypes: ['sample_tube_rack', 'extraction_plate'] },
  { id: 'SLOT_R1', rackTypes: ['reagent_cartridge'] },
] as DeckSlot[] };
const single = { deckSlots: [{ id: 'SLOT_A1', rackTypes: ['sample_tube_rack'] }] as DeckSlot[] };

describe('deck slots (Batch 406)', () => {
  it('offers only slots that take the rack, narrowed to the assay\'s slots', () => {
    expect(slotsForRack(panther, 'sample_tube_rack').map(s => s.id)).toEqual(['SLOT_A1', 'SLOT_A2', 'SLOT_A4']);
    expect(slotsForRack(panther, 'sample_tube_rack', ['SLOT_A1', 'SLOT_A2']).map(s => s.id)).toEqual(['SLOT_A1', 'SLOT_A2']);
    expect(slotsForRack(panther, 'reagent_cartridge').map(s => s.id)).toEqual(['SLOT_R1']);
    expect(slotsForRack(undefined, 'sample_tube_rack')).toEqual([]);
  });
  it('a slot is required only on a multi-slot instrument', () => {
    expect(deckSlotRequired(panther, 'sample_tube_rack')).toBe(true);
    expect(deckSlotRequired(single, 'sample_tube_rack')).toBe(false);
    expect(deckSlotRequired({}, 'sample_tube_rack')).toBe(false);
  });
  it('says why a slot can\'t hold the rack', () => {
    expect(checkDeckSlot(panther, 'SLOT_A1', 'sample_tube_rack', ['SLOT_A1'])).toBeNull();
    expect(checkDeckSlot(panther, 'SLOT_Z9', 'sample_tube_rack')).toBe('unknownSlot');
    expect(checkDeckSlot(panther, 'SLOT_R1', 'sample_tube_rack')).toBe('wrongRackType');
    expect(checkDeckSlot(panther, 'SLOT_A4', 'sample_tube_rack', ['SLOT_A1', 'SLOT_A2'])).toBe('notForAssay');
  });
  it('reads the deck-location barcodes the plate builder prints', () => {
    expect(parseDeckLocationBarcode(generateDeckLocationLabel('PANTHER_01', 'SLOT_A2'))).toEqual({ instrumentCode: 'PANTHER_01', slotId: 'SLOT_A2' });
    expect(parseDeckLocationBarcode('loc-inst-cobas-4800-slot_b1')).toEqual({ instrumentCode: 'COBAS-4800', slotId: 'SLOT_B1' });
    expect(parseDeckLocationBarcode('SPEC-20260906-8831')).toBeNull();
  });
});

describe('resolveDeckScan (Batch 406)', () => {
  const p1 = { code: 'PANTHER_01', deckSlots: [
    { id: 'SLOT_A1', rackTypes: ['sample_tube_rack'] }, { id: 'SLOT_A3', rackTypes: ['sample_tube_rack'] }, { id: 'SLOT_R1', rackTypes: ['reagent_cartridge'] },
  ] as DeckSlot[] };
  const list = [p1, { code: 'PANTHER_03' }];

  it('fills the instrument and slot from the deck barcode, choosing the instrument when none is chosen', () => {
    expect(resolveDeckScan('loc-inst-panther_01-slot_a1', list, undefined, 'sample_tube_rack')).toEqual({ instrumentCode: 'PANTHER_01', slotId: 'SLOT_A1', problem: null });
  });

  it('warns about a slot that is wrong for the rack or the assay, and still says which it was', () => {
    expect(resolveDeckScan('LOC-INST-PANTHER_01-SLOT_R1', list, 'PANTHER_01', 'sample_tube_rack')).toMatchObject({ slotId: 'SLOT_R1', problem: 'wrongRackType' });
    expect(resolveDeckScan('LOC-INST-PANTHER_01-SLOT_A3', list, 'PANTHER_01', 'sample_tube_rack', ['SLOT_A1'])).toMatchObject({ slotId: 'SLOT_A3', problem: 'notForAssay' });
    expect(resolveDeckScan('LOC-INST-PANTHER_01-SLOT_Q7', list, 'PANTHER_01', 'sample_tube_rack')).toMatchObject({ problem: 'unknownSlot' });
  });

  it('refuses a tube barcode, an unknown analyser, and another analyser than the one chosen', () => {
    expect(resolveDeckScan('SPEC-20260929-1101', list, undefined, 'sample_tube_rack')).toEqual({ problem: 'notDeckBarcode' });
    expect(resolveDeckScan('LOC-INST-NOPE_9-SLOT_A1', list, undefined, 'sample_tube_rack')).toMatchObject({ problem: 'unknownInstrument' });
    expect(resolveDeckScan('LOC-INST-PANTHER_03-SLOT_A1', list, 'PANTHER_01', 'sample_tube_rack')).toMatchObject({ instrumentCode: 'PANTHER_03', problem: 'otherInstrument' });
  });
});
