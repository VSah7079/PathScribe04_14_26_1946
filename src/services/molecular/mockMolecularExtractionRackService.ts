// src/services/molecular/mockMolecularExtractionRackService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct follow-up: "Implement the load into extraction
// rack workflow step (§5.1's secondary_rack stage)."
//
// Batch 406 (Pete's Rack Loading requirements): a rack takes the physical
// rack's own barcode (or generates one), each tube names its accession, and
// placeOnDeck records the instrument and deck slot, refusing a placement that
// lacks a locked Field Requirement or puts the rack in a slot that doesn't take
// it (services/molecular/deckSlots.ts). Errors are codes (MOLECULAR_RACK_ERRORS).
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../mockStorage';
import { withMissingSeedRecords } from '../mockSeedMerge';
import { generateExtractionRackBarcode } from './resolveMolecularBarcodes';
import type {
  IMolecularExtractionRackService, MolecularExtractionRack, NewMolecularExtractionRack, MolecularRackPosition,
} from './IMolecularExtractionRackService';
import type { MolecularMovementRecord } from './IMolecularBatchService';
import { MOLECULAR_RACK_ERRORS as E } from './IMolecularExtractionRackService';
import { mockEquipmentService } from '../equipment/mockEquipmentService';
import { normaliseDeckSlotId } from '../equipment/equipmentRules';
import { mockMolecularAssayControlRuleService } from './mockMolecularAssayControlRuleService';
import { checkDeckSlot } from './deckSlots';
import { molecularRackPlacementMissing, rackTypeOf } from '../fieldRequirements/molecularRackChecks';

const STORE_KEY = 'molecular_extraction_racks';
const ok = <T>(data: T) => ({ ok: true as const, data });
const err = (message: string) => ({ ok: false as const, error: message });
const delay = () => new Promise(res => setTimeout(res, 30));

function emptyPositions(capacity: number): MolecularRackPosition[] {
  return Array.from({ length: capacity }, (_, i) => ({ positionLabel: String(i + 1) }));
}

// Real, seeded rack — one real specimen already loaded at position 1,
// so the "already racked" lookup path (findPositionByContainerBarcode)
// has a real, non-empty case to demonstrate against out of the box.
const SEED: MolecularExtractionRack[] = [
  {
    id: 'rack-001',
    rackBarcode: 'RACK-MOLE-00001',
    rackUuid: 'a3f5c8e1-2b4d-4f6a-9c1e-7d8b3a2f5e6c',
    capacity: 24,
    positions: [
      { positionLabel: '1', specimenUuid: 'a1b2c3d4-e5f6-7890-1234-56789abcdef0', accessionNumber: 'PS26-100452', containerBarcode: 'SPEC-20260906-8831' },
      ...emptyPositions(24).slice(1),
    ],
    createdAt: '2026-09-06T15:00:00.000Z',
    createdByUserId: 'seed-user',
    createdByUserName: 'Demo Lab Tech',
    rackType: 'sample_tube_rack',
  },
  // Batch 406 demo: a rack with its physical barcode and every tube named,
  // ready to place on a Panther (Rack Loading → Place on instrument). Panther
  // 1 or 2 need a slot (A1–A4 take sample racks; the HPV assay allows A1 or
  // A2); Panther 3 has one slot, so none is asked for.
  {
    id: 'rack-002',
    rackBarcode: 'RK-HPV-0417',
    rackUuid: 'c7d1e0a2-5f3b-4a8e-b6c9-2d4f8e1a7b30',
    capacity: 12,
    positions: [
      { positionLabel: '1', accessionNumber: 'PS26-100460', containerBarcode: 'SPEC-20260929-1101' },
      { positionLabel: '2', accessionNumber: 'PS26-100461', containerBarcode: 'SPEC-20260929-1102' },
      { positionLabel: '3', accessionNumber: 'PS26-100463', containerBarcode: 'SPEC-20260929-1104' },
      ...emptyPositions(12).slice(3),
    ],
    createdAt: '2026-09-29T14:20:00.000Z',
    createdByUserId: 'seed-user',
    createdByUserName: 'Demo Lab Tech',
    rackType: 'sample_tube_rack',
  },
];

// Batch 406: the demo rack reaches browsers that stored the racks earlier.
const load = (): MolecularExtractionRack[] => {
  const stored = storageGet(STORE_KEY, SEED);
  const { records, added } = withMissingSeedRecords(stored, SEED);
  if (added > 0) storageSet(STORE_KEY, records);
  return records;
};

/** A physical rack barcode as stored: trimmed, upper case. */
export const normaliseRackBarcode = (raw: string): string => raw.trim().toUpperCase();
const RACK_BARCODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,39}$/;
const persist = (data: MolecularExtractionRack[]) => storageSet(STORE_KEY, data);

export const mockMolecularExtractionRackService: IMolecularExtractionRackService = {
  async getAll() {
    await delay();
    return ok(load());
  },

  async getById(id) {
    await delay();
    const found = load().find(r => r.id === id);
    if (!found) return err(E.notFound);
    return ok(found);
  },

  async create(rack: NewMolecularExtractionRack) {
    await delay();
    const all = load();
    const taken = new Set(all.map(r => normaliseRackBarcode(r.rackBarcode)));
    const given = normaliseRackBarcode(rack.rackBarcode ?? '');
    if (given && !RACK_BARCODE_PATTERN.test(given)) return err(E.invalidBarcode);
    if (given && taken.has(given)) return err(E.duplicateBarcode);
    // Blank: the next generated RACK-MOLE number not already used.
    let sequence = all.length + 1;
    while (taken.has(generateExtractionRackBarcode(sequence))) sequence += 1;
    const { rackBarcode: _given, ...rest } = rack;
    const created: MolecularExtractionRack = {
      ...rest,
      id: 'rack-' + Date.now(),
      rackBarcode: given || generateExtractionRackBarcode(sequence),
      rackUuid: crypto.randomUUID(),
      positions: emptyPositions(rack.capacity),
      createdAt: new Date().toISOString(),
      rackType: 'sample_tube_rack',
    };
    persist([...all, created]);
    return ok(created);
  },

  async loadSpecimenIntoPosition(rackId, positionLabel, specimen, movement: MolecularMovementRecord) {
    await delay();
    const all = load();
    const rackIdx = all.findIndex(r => r.id === rackId);
    if (rackIdx === -1) return err(E.notFound);

    const rack = all[rackIdx];
    const posIdx = rack.positions.findIndex(p => p.positionLabel === positionLabel);
    if (posIdx === -1) return err(E.positionNotFound);

    // A rack position holds exactly one tube at a time.
    const existing = rack.positions[posIdx];
    if (existing.containerBarcode) return err(E.positionOccupied);

    const updatedPositions = [...rack.positions];
    updatedPositions[posIdx] = {
      ...existing, ...specimen,
      accessionNumber: specimen.accessionNumber?.trim() || undefined,
      movementHistory: [...(existing.movementHistory ?? []), movement],
    };
    const updatedRack: MolecularExtractionRack = { ...rack, positions: updatedPositions };
    const next = [...all];
    next[rackIdx] = updatedRack;
    persist(next);
    return ok(updatedRack);
  },

  async setPositionAccession(rackId, positionLabel, accessionNumber) {
    await delay();
    const all = load();
    const rackIdx = all.findIndex(r => r.id === rackId);
    if (rackIdx === -1) return err(E.notFound);
    const rack = all[rackIdx];
    const posIdx = rack.positions.findIndex(p => p.positionLabel === positionLabel);
    if (posIdx === -1) return err(E.positionNotFound);
    if (!rack.positions[posIdx].containerBarcode) return err(E.positionEmpty);
    const accession = accessionNumber.trim();
    if (!accession) return err(E.incomplete);
    const positions = [...rack.positions];
    positions[posIdx] = { ...positions[posIdx], accessionNumber: accession };
    const updated: MolecularExtractionRack = { ...rack, positions };
    const next = [...all];
    next[rackIdx] = updated;
    persist(next);
    return ok(updated);
  },

  async placeOnDeck(rackId, placement, requirements) {
    await delay();
    const all = load();
    const rackIdx = all.findIndex(r => r.id === rackId);
    if (rackIdx === -1) return err(E.notFound);
    const rack = all[rackIdx];

    const equipment = await mockEquipmentService.getAll();
    const code = placement.instrumentCode.trim().toUpperCase();
    const instrument = code
      ? (equipment.ok ? equipment.data : []).find(e => e.code === code && e.kind === 'analyser' && e.status === 'Active')
      : undefined;
    if (code && !instrument) return err(E.instrumentUnavailable);

    const assayCode = placement.assayCode?.trim() || undefined;
    const deckSlotId = placement.deckSlotId ? normaliseDeckSlotId(placement.deckSlotId) || undefined : undefined;
    const missing = molecularRackPlacementMissing({ rack, instrument, assayCode, deckSlotId }, requirements);
    if (missing.length > 0) return err(E.incomplete);

    if (deckSlotId) {
      const rule = assayCode ? await mockMolecularAssayControlRuleService.getByAssayCode(assayCode) : undefined;
      const allowed = rule?.ok ? rule.data?.allowedSampleRackSlotIds : undefined;
      const problem = checkDeckSlot(instrument, deckSlotId, rackTypeOf(rack), allowed);
      if (problem) return err(problem);
    }

    const updated: MolecularExtractionRack = {
      ...rack,
      placement: { ...placement, instrumentCode: code, assayCode, deckSlotId, placedAt: new Date().toISOString() },
    };
    const next = [...all];
    next[rackIdx] = updated;
    persist(next);
    return ok(updated);
  },

  async findPositionByContainerBarcode(containerBarcode) {
    await delay();
    for (const rack of load()) {
      const position = rack.positions.find(p => p.containerBarcode === containerBarcode);
      if (position) return ok({ rack, position });
    }
    return ok(null);
  },
};
