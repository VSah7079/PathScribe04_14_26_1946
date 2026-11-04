// src/services/fieldRequirements/molecularRackChecks.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-359, Batch 406. What a molecular extraction rack needs before it is
// placed on an instrument, per the organisation's Field Requirements (page
// "molecularRack"). Pete's list:
//   - Rack identifier / barcode (generated when left blank)
//   - the sample ID of every occupied position: each tube on the rack names
//     its accession, so the result can be traced back to the patient (a tube
//     scanned or typed without one is flagged until it is given one)
//   - the instrument, and the deck slot when the instrument has more than one
//     slot that takes this kind of rack
// The assay is a switch. All but the assay are locked, and enforced again in
// services/molecular/mockMolecularExtractionRackService.ts (placeOnDeck).
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import {
  missingRequiredFields, resolveFieldRequirements, isFieldRequired,
  type ResolvedFieldRequirement,
} from './fieldRequirementRules';
import { deckSlotRequired } from '../molecular/deckSlots';
import type { DeckSlot, DeckRackType } from '../equipment/IEquipmentService';
import type { MolecularExtractionRack, MolecularRackPosition } from '../molecular/IMolecularExtractionRackService';

export const MOLECULAR_RACK_DEFAULT_REQUIREMENTS: readonly ResolvedFieldRequirement[] = resolveFieldRequirements('molecularRack');

const filled = (v: string | undefined | null): string => (v ?? '').trim();

export function molecularRackFieldRequired(requirements: readonly ResolvedFieldRequirement[], fieldId: string): boolean {
  return isFieldRequired(requirements, fieldId);
}

/** A rack's kind; older racks, stored before it was recorded, are sample tube racks. */
export const rackTypeOf = (rack: Pick<MolecularExtractionRack, 'rackType'>): DeckRackType => rack.rackType ?? 'sample_tube_rack';

const occupied = (p: MolecularRackPosition) => !!filled(p.containerBarcode);

/** The occupied positions (labels) whose tube doesn't name its accession. */
export function rackPositionsMissingSampleId(positions: readonly MolecularRackPosition[]): string[] {
  return positions.filter(p => occupied(p) && !filled(p.accessionNumber)).map(p => p.positionLabel);
}

export interface MolecularRackPlacementValues {
  rack: Pick<MolecularExtractionRack, 'rackBarcode' | 'positions' | 'rackType'>;
  /** The chosen instrument's deck, or undefined when none is chosen. */
  instrument?: { code: string; deckSlots?: readonly DeckSlot[] };
  assayCode?: string;
  deckSlotId?: string;
}

/** Whether this rack's slot must be named on this instrument (Pete: "if the platform utilizes multi-slot loading"). */
export function rackDeckSlotNeeded(v: Pick<MolecularRackPlacementValues, 'rack' | 'instrument'>): boolean {
  return !!v.instrument && deckSlotRequired(v.instrument, rackTypeOf(v.rack));
}

/** Placing the rack on the instrument: the Field Requirements still missing (ids). */
export function molecularRackPlacementMissing(v: MolecularRackPlacementValues, requirements: readonly ResolvedFieldRequirement[]): string[] {
  const ok = 'yes';
  const tubes = v.rack.positions.filter(occupied);
  return missingRequiredFields(requirements, {
    rackBarcode: filled(v.rack.rackBarcode),
    sampleMapping: tubes.length > 0 && rackPositionsMissingSampleId(v.rack.positions).length === 0 ? ok : '',
    instrument: filled(v.instrument?.code),
    // A single-slot instrument (or one with no deck layout) needs no slot.
    deckSlot: rackDeckSlotNeeded(v) ? filled(v.deckSlotId) : ok,
    assay: filled(v.assayCode),
  }).map(f => f.id);
}
