// src/services/equipment/mockEquipmentService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 358: this build's equipment register, kept in the browser (key
// 'equipment').
//   - Seeded with the three Panther analysers the demo molecular batches use
//     (same ids and codes as Batch 356's instrument list), and (Batch 359) the
//     Zebra ZT411 behind the seeded printer profile.
//   - A browser that stored Batch 356's instrument list (key 'instruments')
//     brings those records across once, as analysers, so an instrument an
//     admin added isn't lost.
//   - Seed records added later reach browsers that already stored the
//     register (mockSeedMerge.ts, Batch 357).
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import { withMissingSeedRecords, withSeedFieldBackfill } from '../mockSeedMerge';
import type { Equipment, EquipmentError, IEquipmentService , DeckSlot } from './IEquipmentService';
import { normaliseEquipmentCode, validateEquipmentDraft , normaliseDeckSlotId } from './equipmentRules';
import { mockScanStationService } from '../scanStations/mockScanStationService';
import { guardConfigWrites } from '../authorization/guardConfigWrites';

// Batch 406 (Pete): instrument profiles for the demo analysers. Panther 1 and
// 2 take sample racks in four slots on Deck 1 and a reagent cartridge in the
// reagent bay, so a rack's slot must be recorded; Panther 3 is set up with a
// single sample slot, so it needn't be.
const PANTHER_DECK: DeckSlot[] = [
  { id: 'SLOT_A1', deck: 'Deck 1', rackTypes: ['sample_tube_rack'] },
  { id: 'SLOT_A2', deck: 'Deck 1', rackTypes: ['sample_tube_rack'] },
  { id: 'SLOT_A3', deck: 'Deck 1', rackTypes: ['sample_tube_rack'] },
  { id: 'SLOT_A4', deck: 'Deck 1', rackTypes: ['sample_tube_rack', 'extraction_plate'] },
  { id: 'SLOT_R1', deck: 'Reagent bay', rackTypes: ['reagent_cartridge'] },
];
const SINGLE_SLOT_DECK: DeckSlot[] = [{ id: 'SLOT_A1', deck: 'Deck 1', rackTypes: ['sample_tube_rack'] }];

export const SEED_EQUIPMENT: readonly Equipment[] = [
  { id: 'inst-panther-01', code: 'PANTHER_01', name: 'Panther 1', kind: 'analyser', make: 'Hologic', model: 'Panther', maintenanceIntervalDays: 30, calibrationIntervalDays: 180, facilityId: 'c-fenwick-general', scanStationId: 'station-molecular-1', status: 'Active', deckSlots: PANTHER_DECK },
  { id: 'inst-panther-02', code: 'PANTHER_02', name: 'Panther 2', kind: 'analyser', make: 'Hologic', model: 'Panther', maintenanceIntervalDays: 30, calibrationIntervalDays: 180, facilityId: 'c-fenwick-general', scanStationId: 'station-molecular-1', status: 'Active', deckSlots: PANTHER_DECK },
  { id: 'inst-panther-03', code: 'PANTHER_03', name: 'Panther 3', kind: 'analyser', make: 'Hologic', model: 'Panther', maintenanceIntervalDays: 30, calibrationIntervalDays: 180, facilityId: 'c-fenwick-general', status: 'Active', deckSlots: SINGLE_SLOT_DECK },
  // Batch 467: the in-house real-time PCR analyser at Desert Valley (runs EGFR mutation PCR, services/molecularOrders/).
  { id: 'inst-pcr-01', code: 'PCR_01', name: 'Real-time PCR 1', kind: 'analyser', make: 'Thermo Fisher', model: 'QuantStudio 5', maintenanceIntervalDays: 30, calibrationIntervalDays: 180, facilityId: 'c-ent-dvmc', status: 'Active' },
  // Batch 359: the physical printer behind the seeded Zebra printer profile
  // (printer-zt411-example), shared by Grossing Station 1 and Microtomy Bench 1.
  { id: 'eq-zebra-zt411-01', code: 'ZEBRA_ZT411_01', name: 'Zebra ZT411 label printer', kind: 'label_printer', make: 'Zebra', model: 'ZT411', facilityId: 'c-fenwick-general', status: 'Active' },
  // Batch 434: the slide scanners WSI scan batches are loaded on (their code is
  // WsiScanBatch.scannerInstrumentId and StainOrder.scannerAssignment.scannerInstrumentId).
  { id: 'eq-aperio-gt450-01', code: 'APERIO_GT450_01', name: 'Leica Aperio GT450 #1', kind: 'slide_scanner', make: 'Leica', model: 'Aperio GT450', facilityId: 'c-ent-dvmc', status: 'Active' },
  { id: 'eq-aperio-gt450-02', code: 'APERIO_GT450_02', name: 'Leica Aperio GT450 #2', kind: 'slide_scanner', make: 'Leica', model: 'Aperio GT450', facilityId: 'c-ent-dvmc', status: 'Active' },
  { id: 'eq-genius-01', code: 'GENIUS_01', name: 'Hologic Genius Digital Diagnostics System', kind: 'slide_scanner', make: 'Hologic', model: 'Genius', facilityId: 'c-ent-dvmc', status: 'Active' },
];

export const EQUIPMENT_STORAGE_KEY = 'equipment';
/** Batch 356's instrument list, read once to bring its records across. */
export const LEGACY_INSTRUMENT_STORAGE_KEY = 'instruments';

type LegacyInstrument = Omit<Equipment, 'kind' | 'make' | 'serialNumber'>;

function load(): Equipment[] {
  let stored = storageGet<Equipment[] | null>(EQUIPMENT_STORAGE_KEY, null);
  let changed = false;
  if (!stored) {
    const legacy = storageGet<LegacyInstrument[] | null>(LEGACY_INSTRUMENT_STORAGE_KEY, null);
    if (legacy?.length) { stored = legacy.map(i => ({ ...i, kind: 'analyser' as const })); changed = true; }
  }
  const merged = withMissingSeedRecords(stored, SEED_EQUIPMENT);
  // Batch 360: schedules added to the seeded Panthers reach browsers that stored them earlier.
  const maint = withSeedFieldBackfill(merged.records, SEED_EQUIPMENT, 'maintenanceIntervalDays');
  const calib = withSeedFieldBackfill(maint.records, SEED_EQUIPMENT, 'calibrationIntervalDays');
  // Batch 406: the seeded analysers' deck layouts reach browsers that stored them earlier.
  const decks = withSeedFieldBackfill(calib.records, SEED_EQUIPMENT, 'deckSlots');
  if (changed || merged.added > 0 || maint.filled > 0 || calib.filled > 0 || decks.filled > 0) storageSet(EQUIPMENT_STORAGE_KEY, decks.records);
  return decks.records;
}
const save = (all: Equipment[]) => storageSet(EQUIPMENT_STORAGE_KEY, all);
const fail = (error: EquipmentError) => ({ ok: false as const, error });

async function stations() {
  const res = await mockScanStationService.getAll();
  return res.ok ? res.data : [];
}

const tidy = (e: Equipment): Equipment => ({
  ...e,
  name: e.name.trim(),
  make: e.make?.trim() || undefined,
  model: e.model?.trim() || undefined,
  serialNumber: e.serialNumber?.trim() || undefined,
  scanStationId: e.scanStationId || undefined,
  deckSlots: e.deckSlots?.length ? e.deckSlots.map(sl => ({ ...sl, id: normaliseDeckSlotId(sl.id), deck: sl.deck?.trim() || undefined })) : undefined,
});

function setStatus(id: ID, status: Equipment['status']): ServiceResult<Equipment> {
  const all = load();
  const idx = all.findIndex(i => i.id === id);
  if (idx < 0) return fail('notFound');
  all[idx] = { ...all[idx], status };
  save(all);
  return { ok: true, data: all[idx] };
}

const equipmentServiceUnchecked: IEquipmentService = {
  async getAll() {
    return { ok: true, data: load() };
  },

  async getActive(kind) {
    return { ok: true, data: load().filter(e => e.status === 'Active' && (!kind || e.kind === kind)) };
  },

  async getById(id) {
    const found = load().find(i => i.id === id);
    return found ? { ok: true, data: found } : fail('notFound');
  },

  async getByCode(code) {
    const wanted = normaliseEquipmentCode(code);
    const found = load().find(i => normaliseEquipmentCode(i.code) === wanted);
    return found ? { ok: true, data: found } : fail('notFound');
  },

  async create(draft) {
    const all = load();
    const errors = validateEquipmentDraft(draft, { existing: all, stations: await stations() });
    if (errors.code === 'codeTaken') return fail('duplicateCode');
    if (Object.keys(errors).length > 0) return fail('invalid');
    const created = tidy({ ...draft, id: 'eq-' + Date.now(), code: normaliseEquipmentCode(draft.code) });
    save([...all, created]);
    return { ok: true, data: created };
  },

  async update(id, changes) {
    const all = load();
    const idx = all.findIndex(i => i.id === id);
    if (idx < 0) return fail('notFound');
    const { code: _ignoredCode, ...allowed } = changes as Partial<Equipment>;
    const next: Equipment = { ...all[idx], ...allowed, id, code: all[idx].code };
    const errors = validateEquipmentDraft(next, { existing: all, stations: await stations(), editingId: id });
    if (Object.keys(errors).length > 0) return fail('invalid');
    all[idx] = tidy(next);
    save(all);
    return { ok: true, data: all[idx] };
  },

  async deactivate(id) { return setStatus(id, 'Inactive'); },
  async reactivate(id) { return setStatus(id, 'Active'); },
};

/** Batch 428: every change needs its Configuration capability (guardConfigWrites). */
export const mockEquipmentService: IEquipmentService = guardConfigWrites(equipmentServiceUnchecked, [
  ['config:equipment:manage', ['create', 'update', 'deactivate', 'reactivate']],
]);
