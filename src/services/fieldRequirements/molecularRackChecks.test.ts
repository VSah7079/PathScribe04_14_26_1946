// Batch 406 (PS-359): what a molecular rack needs before it goes on an instrument (Pete's list).
import { describe, it, expect } from 'vitest';
import { resolveFieldRequirements } from './fieldRequirementRules';
import { molecularRackPlacementMissing, rackPositionsMissingSampleId, rackDeckSlotNeeded, rackTypeOf } from './molecularRackChecks';
import type { DeckSlot } from '../equipment/IEquipmentService';

const reqs = (over: Record<string, boolean> = {}) => resolveFieldRequirements('molecularRack', over);
const multi = { code: 'P1', deckSlots: [{ id: 'SLOT_A1', rackTypes: ['sample_tube_rack'] }, { id: 'SLOT_A2', rackTypes: ['sample_tube_rack'] }] as DeckSlot[] };
const single = { code: 'P3', deckSlots: [{ id: 'SLOT_A1', rackTypes: ['sample_tube_rack'] }] as DeckSlot[] };
const rack = (positions: { positionLabel: string; containerBarcode?: string; accessionNumber?: string }[]) => ({ rackBarcode: 'RK-1', positions });
const full = rack([{ positionLabel: '1', containerBarcode: 'T1', accessionNumber: 'A1' }, { positionLabel: '2' }]);

describe('molecularRack Field Requirements', () => {
  it('locks the identifier, sample mapping, instrument and deck slot; the assay is a switch; the barcode fills itself', () => {
    const r = reqs({ rackBarcode: false, instrument: false });
    expect(r.filter(f => f.locked).map(f => f.id)).toEqual(['rackBarcode', 'sampleMapping', 'instrument', 'deckSlot']);
    expect(r.find(f => f.id === 'rackBarcode')?.autoFilled).toBe(true);
    expect(r.find(f => f.id === 'assay')?.required).toBe(false);
  });

  it('an occupied position without an accession is missing its sample ID; empty positions are not', () => {
    expect(rackPositionsMissingSampleId([{ positionLabel: '1', containerBarcode: 'T1' }, { positionLabel: '2' }, { positionLabel: '3', containerBarcode: 'T3', accessionNumber: ' ' }])).toEqual(['1', '3']);
  });

  it('needs a tube with its sample ID and the instrument; the slot only on a multi-slot instrument', () => {
    expect(molecularRackPlacementMissing({ rack: rack([{ positionLabel: '1' }]) }, reqs())).toEqual(['sampleMapping', 'instrument']);
    expect(molecularRackPlacementMissing({ rack: full, instrument: multi }, reqs())).toEqual(['deckSlot']);
    expect(molecularRackPlacementMissing({ rack: full, instrument: multi, deckSlotId: 'SLOT_A1' }, reqs())).toEqual([]);
    expect(molecularRackPlacementMissing({ rack: full, instrument: single }, reqs())).toEqual([]);
    expect(rackDeckSlotNeeded({ rack: full, instrument: single })).toBe(false);
    expect(rackDeckSlotNeeded({ rack: full, instrument: { code: 'X' } })).toBe(false);
  });

  it('asks for the assay when the organisation requires it; an older rack is a sample tube rack', () => {
    expect(molecularRackPlacementMissing({ rack: full, instrument: single }, reqs({ assay: true }))).toEqual(['assay']);
    expect(rackTypeOf({})).toBe('sample_tube_rack');
  });
});
