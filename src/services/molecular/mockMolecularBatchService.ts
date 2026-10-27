// src/services/molecular/mockMolecularBatchService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct specification. Seeded with the exact worked example
// from the given specification's own §4.1 (batch_uuid, plate_uuid,
// plate_barcode, assay_code, reagent lot numbers) — reusing the
// specification's own real example rather than inventing a second,
// competing one for the same demonstration.
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../mockStorage';
import { resolveMolecularReagentLotGating } from './resolveMolecularReagentLotGating';
import { resolveMolecularControlRequirementValidation } from './resolveMolecularControlRequirementValidation';
import { mockMolecularAssayControlRuleService } from './mockMolecularAssayControlRuleService';
import { generateMolecularBatchBarcode, generateMolecularPlateBarcode } from './resolveMolecularBarcodes';
import type { IMolecularBatchService, MolecularBatch, NewMolecularBatch } from './IMolecularBatchService';
import { MOLECULAR_BATCH_INSTRUMENT_UNAVAILABLE, MOLECULAR_BATCH_WELL_SPECIMEN_MISSING, MOLECULAR_BATCH_NOT_PERMITTED, MOLECULAR_BATCH_DECK_SLOT_INVALID,
  MOLECULAR_BATCH_REASON_REQUIRED, MOLECULAR_BATCH_NOT_FOUND, MOLECULAR_BATCH_ALREADY_SUPERSEDED, MOLECULAR_BATCH_LOT_GATING_FAILED, MOLECULAR_BATCH_CONTROLS_NOT_SATISFIED } from './IMolecularBatchService';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { mockEquipmentService } from '../equipment/mockEquipmentService';
import { checkBatchInstrument, normaliseDeckSlotId } from '../equipment/equipmentRules';
import { checkDeckSlot } from './deckSlots';
import { cloneWellsForSupersede } from './cloneWellsForSupersede';
import { withMissingSeedRecords } from '../mockSeedMerge';
import { MOLECULAR_DEMO_BATCHES } from './molecularDemoSeed';

const STORE_KEY = 'molecular_batches';
const ok = <T>(data: T) => ({ ok: true as const, data });
const err = (message: string) => ({ ok: false as const, error: message });
const delay = () => new Promise(res => setTimeout(res, 30));

// Real, per the given specification's own §4.1 worked JSON example —
// the exact same batch/plate/reagent-lot values it uses to illustrate
// the outbound worklist payload shape.
const SEED: MolecularBatch[] = [
  {
    id: 'mb-001',
    batchBarcode: 'BATCH-20260906-0042',
    batchUuid: 'e3b0c442-98fc-4c14-963b-944882006122',
    // Real, per direct follow-up ("wouldn't we use the existing
    // process catalog to define the assays?") — assayCode is now a
    // real reference to StainType.id (the "Diagnostic Catalog," this
    // app's own existing, admin-managed catalog of orderable tests
    // under category: 'Molecular'), never a free-typed string. This
    // real seed value is 'st-hpv-highrisk-screen' — mockStainTypeService's
    // own real, existing "HPV High-Risk Screening" entry — not a
    // second, disconnected 'HPV_HR_PCR' string with no real link to it.
    assayCode: 'st-hpv-highrisk-screen',
    assayName: 'High-Risk HPV Real-Time PCR',
    targetInstrumentId: 'PANTHER_02',
    // Batch 406: the Panther deck's plate slot (was SLOT_A1, which now takes sample racks).
    deckSlot: 'SLOT_A4',
    plateUuid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    plateBarcode: 'PLT-HPV-20260906-012',
    plateLayout: '96_well',
    reagentLots: [
      { componentType: 'MASTER_MIX', lotNumber: 'MM-2026-8812', expirationDate: '2027-01-15T00:00:00.000Z', qcStatus: 'signed_off' },
      { componentType: 'EXTRACTION_BUFFER', lotNumber: 'EX-2026-0034', expirationDate: '2026-11-30T00:00:00.000Z', qcStatus: 'signed_off' },
    ],
    wells: [
      { wellPosition: 'A01', sampleType: 'CONTROL_NTC', controlInfo: { controlId: 'NTC-LOT-441', controlLotNumber: 'NTC-LOT-441', controlExpirationDate: '2027-01-15T00:00:00.000Z', expectedValue: 'NEGATIVE' } },
      { wellPosition: 'A02', sampleType: 'CONTROL_PTC_HIGH', controlInfo: { controlId: 'PTC-LOT-902', controlLotNumber: 'PTC-LOT-902', controlExpirationDate: '2027-01-15T00:00:00.000Z', expectedValue: 'POSITIVE' } },
      { wellPosition: 'A03', sampleType: 'PATIENT_SPECIMEN', specimenUuid: 'a1b2c3d4-e5f6-7890-1234-56789abcdef0', accessionNumber: 'PS26-100452', containerBarcode: 'SPEC-20260906-8831', aliquotVolumeUl: 200 },
    ],
    status: 'active',
    createdAt: '2026-09-06T16:47:35.000Z',
    createdByUserId: 'seed-user',
    createdByUserName: 'Demo Lab Tech',
  },
];

// Batch 456: the demo baseline's batches (molecularDemoSeed.ts) join the
// spec's worked example. Batches are never deleted (superseded instead), so a
// seed id missing from storage means it was added since: append it.
const SEED_WITH_DEMO: MolecularBatch[] = [...SEED, ...MOLECULAR_DEMO_BATCHES];
const load = (): MolecularBatch[] => {
  const { records, added } = withMissingSeedRecords(storageGet<MolecularBatch[] | null>(STORE_KEY, null), SEED_WITH_DEMO);
  if (added > 0) storageSet(STORE_KEY, records);
  return records;
};
const persist = (data: MolecularBatch[]) => storageSet(STORE_KEY, data);

export const mockMolecularBatchService: IMolecularBatchService = {
  async getAll() {
    await delay();
    return ok(load());
  },

  async getById(id) {
    await delay();
    const found = load().find(b => b.id === id);
    if (!found) return err(`No molecular batch found with id "${id}".`);
    return ok(found);
  },

  async create(batch: NewMolecularBatch) {
    await delay();
    // Batch 356 (PS-326): the target instrument must be an active analyser in
    // the equipment register (Batch 358). It used to be any typed text.
    const equipmentRes = await mockEquipmentService.getAll();
    const instrumentCheck = checkBatchInstrument(batch.targetInstrumentId, equipmentRes.ok ? equipmentRes.data : []);
    if (!instrumentCheck.ok) return err(MOLECULAR_BATCH_INSTRUMENT_UNAVAILABLE);
    batch = { ...batch, targetInstrumentId: instrumentCheck.equipment.code };
    // Batch 406: an instrument with a deck layout takes the plate only in a
    // slot that holds an extraction plate (services/molecular/deckSlots.ts).
    if (batch.deckSlot?.trim() && instrumentCheck.equipment.deckSlots?.length) {
      const slot = normaliseDeckSlotId(batch.deckSlot);
      if (checkDeckSlot(instrumentCheck.equipment, slot, 'extraction_plate')) return err(MOLECULAR_BATCH_DECK_SLOT_INVALID);
      batch = { ...batch, deckSlot: slot };
    }
    // Batch 405 (Pete): every patient well names its specimen, so the result
    // can be traced back to it (Field Requirements "patientSpecimen", locked).
    if (batch.wells.some(w => w.sampleType === 'PATIENT_SPECIMEN' && !((w.containerBarcode ?? '').trim() || (w.accessionNumber ?? '').trim()))) {
      return err(MOLECULAR_BATCH_WELL_SPECIMEN_MISSING);
    }
    const gating = resolveMolecularReagentLotGating(batch.reagentLots, batch.wells);
    if (!gating.allowed) return err(MOLECULAR_BATCH_LOT_GATING_FAILED);

    // Real, per the given specification's own §3.2 "Dynamic Control
    // Rules"/"Position Enforcements" — a real, separate check from lot
    // gating above: even a batch with perfectly valid lots can still
    // be missing a real, required control entirely, or have one in
    // the wrong real, fixed well.
    const rulesRes = await mockMolecularAssayControlRuleService.getAll();
    const rules = rulesRes.ok ? rulesRes.data : [];
    const controlCheck = resolveMolecularControlRequirementValidation(batch.assayCode, batch.wells, rules);
    if (!controlCheck.satisfied) return err(MOLECULAR_BATCH_CONTROLS_NOT_SATISFIED);

    const all = load();
    const now = new Date();
    const sequence = all.length + 1;
    const created: MolecularBatch = {
      ...batch,
      id: 'mb-' + Date.now(),
      batchBarcode: generateMolecularBatchBarcode(now, sequence),
      batchUuid: crypto.randomUUID(),
      plateUuid: crypto.randomUUID(),
      plateBarcode: generateMolecularPlateBarcode(batch.assayCode, now, sequence),
      status: 'draft',
      createdAt: now.toISOString(),
    };
    persist([...all, created]);
    return ok(created);
  },

  async updateByUuid(batchUuid, changes) {
    await delay();
    const all = load();
    const idx = all.findIndex(b => b.batchUuid === batchUuid);
    if (idx === -1) return err(`No molecular batch found with batchUuid "${batchUuid}".`);
    const updated = { ...all[idx], ...changes };
    const next = [...all];
    next[idx] = updated;
    persist(next);
    return ok(updated);
  },

  async cloneAndSupersede(originalBatchId, reason, byUserId, byUserName) {
    await delay();
    if (!reason.trim()) return err(MOLECULAR_BATCH_REASON_REQUIRED);
    // Batch 405 (Pete: "Permission, keep users").
    if (!(await authorizationService.enforce('molecular:batch:supersede')).allowed) return err(MOLECULAR_BATCH_NOT_PERMITTED);
    const all = load();
    const original = all.find(b => b.id === originalBatchId);
    if (!original) return err(MOLECULAR_BATCH_NOT_FOUND);
    if (original.status === 'superseded') return err(MOLECULAR_BATCH_ALREADY_SUPERSEDED);

    // Real, per this service's own IMolecularBatchService.ts header —
    // control/calibrator well assignments (real reagent-lot metadata)
    // carry over; every patient-specimen assignment and every well's
    // own movementHistory resets to genuinely empty, since a past
    // scan event is a real fact about the original batch's own run.
    const clonedWells = cloneWellsForSupersede(original);

    // Batch 406: a slot the instrument's deck no longer takes a plate in (its
    // layout was set after this run) is left for the tech to choose again.
    const decks = await mockEquipmentService.getAll();
    const instrument = decks.ok ? decks.data.find(e => e.code === original.targetInstrumentId) : undefined;
    const keepSlot = !original.deckSlot || !instrument?.deckSlots?.length || !checkDeckSlot(instrument, original.deckSlot, 'extraction_plate');

    const cloneResult = await mockMolecularBatchService.create({
      assayCode: original.assayCode,
      assayName: original.assayName,
      targetInstrumentId: original.targetInstrumentId,
      deckSlot: keepSlot ? original.deckSlot : undefined,
      plateLayout: original.plateLayout,
      reagentLots: original.reagentLots,
      wells: clonedWells,
      createdByUserId: byUserId,
      createdByUserName: byUserName,
    });
    // Real, honest refusal, never a partial state — if the real
    // create() gating rejects the clone (e.g. a reagent lot has since
    // expired), the original is left completely untouched.
    if (!cloneResult.ok) return cloneResult;

    const supersededAt = new Date().toISOString();
    const afterClone = load(); // real, freshly re-read — create() above already persisted the new batch
    const originalIdx = afterClone.findIndex(b => b.id === originalBatchId);
    const cloneIdx = afterClone.findIndex(b => b.id === cloneResult.data.id);
    const next = [...afterClone];
    next[originalIdx] = {
      ...afterClone[originalIdx],
      status: 'superseded',
      supersededByBatchId: cloneResult.data.id,
      supersededAt,
      supersededByUserId: byUserId,
      supersededByUserName: byUserName,
      supersededReason: reason.trim(),
    };
    // Real, direct fix caught before shipping: clonedFromBatchId must
    // be written to the clone's own persisted record too, not just
    // attached to this one response — otherwise a later real
    // getById() on the clone would never see it.
    const clonedBatch: MolecularBatch = { ...afterClone[cloneIdx], clonedFromBatchId: original.id };
    next[cloneIdx] = clonedBatch;
    persist(next);

    return ok(clonedBatch);
  },
};
