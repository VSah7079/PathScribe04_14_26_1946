// src/services/molecular/deckSlots.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 406 (Pete). How PathScribe knows and checks a rack's deck slot:
//   1. Instrument profile: an analyser's deck layout (Equipment.deckSlots),
//      each slot with the rack types it takes.
//   2. Assay mapping: the slots an assay's sample rack may use
//      (MolecularAssayControlRule.allowedSampleRackSlotIds).
//   3. Rack Loading: the slot picker offers only slots that fit both, and a
//      scanned deck-location barcode (LOC-INST-<instrument>-<slot>) fills the
//      slot, with a warning when it isn't one of them. An instrument
//      interface reporting where a rack was placed would go through the same
//      check (placeRackOnDeck, mockMolecularExtractionRackService).
// A slot is required only on an instrument with more than one slot that takes
// a sample rack.
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { DeckSlot, DeckRackType } from '../equipment/IEquipmentService';

export type DeckSlotProblem = 'unknownSlot' | 'wrongRackType' | 'notForAssay';

/** The slots on this instrument that take this rack type, narrowed to the assay's allowed slots when it names any. */
export function slotsForRack(
  instrument: { deckSlots?: readonly DeckSlot[] } | undefined,
  rackType: DeckRackType,
  allowedSlotIds?: readonly string[],
): DeckSlot[] {
  const fits = (instrument?.deckSlots ?? []).filter(sl => sl.rackTypes.includes(rackType));
  return allowedSlotIds?.length ? fits.filter(sl => allowedSlotIds.includes(sl.id)) : fits;
}

/** Whether a rack's slot must be recorded: the instrument has more than one slot that takes this rack type. */
export function deckSlotRequired(instrument: { deckSlots?: readonly DeckSlot[] } | undefined, rackType: DeckRackType): boolean {
  return slotsForRack(instrument, rackType).length > 1;
}

/** Why this slot can't hold the rack, or null when it can. */
export function checkDeckSlot(
  instrument: { deckSlots?: readonly DeckSlot[] } | undefined,
  slotId: string,
  rackType: DeckRackType,
  allowedSlotIds?: readonly string[],
): DeckSlotProblem | null {
  const slot = (instrument?.deckSlots ?? []).find(sl => sl.id === slotId);
  if (!slot) return 'unknownSlot';
  if (!slot.rackTypes.includes(rackType)) return 'wrongRackType';
  if (allowedSlotIds?.length && !allowedSlotIds.includes(slotId)) return 'notForAssay';
  return null;
}

/** A deck-location barcode (LOC-INST-<instrument code>-<slot id>) as its parts, or null. */
export function parseDeckLocationBarcode(raw: string): { instrumentCode: string; slotId: string } | null {
  const m = /^LOC-INST-(.+)-([A-Z0-9_]+)$/i.exec(raw.trim());
  return m ? { instrumentCode: m[1].toUpperCase(), slotId: m[2].toUpperCase() } : null;
}

/** What scanning a deck position's barcode means for the rack being placed. */
export interface DeckScanResult {
  /** The instrument the barcode names (Equipment.code), when it is a deck-location barcode. */
  instrumentCode?: string;
  /** The slot it names. */
  slotId?: string;
  /**
   * Why the scan can't be used as it stands, or null:
   *   notDeckBarcode       not a LOC-INST-… barcode (a tube or rack was scanned)
   *   unknownInstrument    names no active analyser
   *   otherInstrument      names a different analyser from the one already chosen
   *   plus the slot's own problems (checkDeckSlot).
   */
  problem: DeckSlotProblem | 'notDeckBarcode' | 'unknownInstrument' | 'otherInstrument' | null;
}

/**
 * Batch 406 (Pete: "scanning a deck position … auto-populating the deck slot
 * and flagging a visual warning if placed in an invalid slot"). With no
 * instrument chosen yet, the scan chooses it.
 */
export function resolveDeckScan(
  raw: string,
  instruments: readonly { code: string; deckSlots?: readonly DeckSlot[] }[],
  chosenInstrumentCode: string | undefined,
  rackType: DeckRackType,
  allowedSlotIds?: readonly string[],
): DeckScanResult {
  const parsed = parseDeckLocationBarcode(raw);
  if (!parsed) return { problem: 'notDeckBarcode' };
  const { instrumentCode, slotId } = parsed;
  const instrument = instruments.find(i => i.code.toUpperCase() === instrumentCode);
  if (!instrument) return { instrumentCode, slotId, problem: 'unknownInstrument' };
  if (chosenInstrumentCode && chosenInstrumentCode.toUpperCase() !== instrumentCode) return { instrumentCode, slotId, problem: 'otherInstrument' };
  return { instrumentCode: instrument.code, slotId, problem: checkDeckSlot(instrument, slotId, rackType, allowedSlotIds) };
}
