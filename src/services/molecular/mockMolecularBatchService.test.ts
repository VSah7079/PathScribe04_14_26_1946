// src/services/molecular/mockMolecularBatchService.test.ts
import { describe, it, expect, beforeEach , vi } from 'vitest';

// Batch 405: cloneAndSupersede checks molecular:batch:supersede; these tests are about the clone itself.
const { enforce } = vi.hoisted(() => ({ enforce: vi.fn(async (_key: string) => ({ allowed: true })) }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce: (k: string) => enforce(k) } }));
import { storageSet, storageGet } from '../mockStorage';
import type { MolecularBatch } from './IMolecularBatchService';
import { MOLECULAR_DEMO_BATCHES } from './molecularDemoSeed';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

describe('mockMolecularBatchService — real, per direct specification', () => {
  it('getAll returns the real, seeded worked example from the given specification\'s own §4.1', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const res = await mockMolecularBatchService.getAll();
    expect(res.ok).toBe(true);
    if (res.ok) {
      // Batch 456: plus the demo baseline's batches (molecularDemoSeed.ts).
      expect(res.data).toHaveLength(1 + MOLECULAR_DEMO_BATCHES.length);
      expect(res.data[0].batchBarcode).toBe('BATCH-20260906-0042');
    }
  });

  it('getById correctly returns the real, matching batch', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const res = await mockMolecularBatchService.getById('mb-001');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.assayCode).toBe('st-hpv-highrisk-screen');
  });

  it('getById on a real, non-existent id returns an honest error', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const res = await mockMolecularBatchService.getById('does-not-exist');
    expect(res.ok).toBe(false);
  });

  it('create correctly rejects a real batch with an expired reagent lot, never creating it', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const res = await mockMolecularBatchService.create({
      assayCode: 'CT_NG_PCR', assayName: 'CT/NG PCR', targetInstrumentId: 'PANTHER_01', plateLayout: '96_well',
      reagentLots: [{ componentType: 'MASTER_MIX', lotNumber: 'MM-OLD', expirationDate: '2020-01-01T00:00:00.000Z', qcStatus: 'signed_off' }],
      wells: [], createdByUserId: 'u1', createdByUserName: 'Test User',
    });
    expect(res.ok).toBe(false);
    const all = await mockMolecularBatchService.getAll();
    if (all.ok) expect(all.data).toHaveLength(1 + MOLECULAR_DEMO_BATCHES.length); // still just the seed — nothing created
  });

  it('create refuses a target instrument that is not an active instrument in the list (Batch 356, PS-326)', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const { MOLECULAR_BATCH_INSTRUMENT_UNAVAILABLE } = await import('./IMolecularBatchService');
    const res = await mockMolecularBatchService.create({
      assayCode: 'RESP_PCR', assayName: 'Respiratory PCR Panel', targetInstrumentId: 'PANTHR_03', plateLayout: '96_well',
      reagentLots: [{ componentType: 'MASTER_MIX', lotNumber: 'MM-NEW', expirationDate: '2027-01-01T00:00:00.000Z', qcStatus: 'signed_off' }],
      wells: [], createdByUserId: 'u1', createdByUserName: 'Test User',
    });
    expect(res).toEqual({ ok: false, error: MOLECULAR_BATCH_INSTRUMENT_UNAVAILABLE });
  });

  it('create correctly accepts a real, fully-valid batch and generates real, correctly-formatted identifiers', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const res = await mockMolecularBatchService.create({
      assayCode: 'RESP_PCR', assayName: 'Respiratory PCR Panel', targetInstrumentId: 'PANTHER_03', plateLayout: '96_well',
      reagentLots: [{ componentType: 'MASTER_MIX', lotNumber: 'MM-NEW', expirationDate: '2027-01-01T00:00:00.000Z', qcStatus: 'signed_off' }],
      wells: [], createdByUserId: 'u1', createdByUserName: 'Test User',
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.batchBarcode).toMatch(/^BATCH-\d{8}-\d{4}$/);
      expect(res.data.plateBarcode).toMatch(/^PLT-RESP_PCR-\d{8}-\d{3}$/);
      expect(res.data.status).toBe('draft');
    }
  });

  it('updateByUuid correctly applies real changes to the real, matching batch, looked up by batchUuid', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const res = await mockMolecularBatchService.updateByUuid('e3b0c442-98fc-4c14-963b-944882006122', { status: 'completed', controlsPassed: true });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.status).toBe('completed');
      expect(res.data.controlsPassed).toBe(true);
    }
  });

  it('updateByUuid on a real, non-existent batchUuid returns an honest error', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const res = await mockMolecularBatchService.updateByUuid('does-not-exist', { status: 'completed' });
    expect(res.ok).toBe(false);
  });

  it('real, per §3.2 Dynamic Control Rules: create correctly rejects a real batch for an assay with a defined rule when a required control is missing entirely', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const res = await mockMolecularBatchService.create({
      assayCode: 'st-hpv-highrisk-screen', assayName: 'High-Risk HPV Real-Time PCR', targetInstrumentId: 'PANTHER_02', plateLayout: '96_well',
      reagentLots: [], wells: [], createdByUserId: 'u1', createdByUserName: 'Test User',
    });
    expect(res.ok).toBe(false);
  });

  it('real, per §3.2 Position Enforcements: create correctly rejects a real batch where a required control is present but at the WRONG fixed well', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const res = await mockMolecularBatchService.create({
      assayCode: 'st-hpv-highrisk-screen', assayName: 'High-Risk HPV Real-Time PCR', targetInstrumentId: 'PANTHER_02', plateLayout: '96_well',
      reagentLots: [],
      wells: [
        { wellPosition: 'B01', sampleType: 'CONTROL_NTC', controlInfo: { controlId: 'NTC-1', controlLotNumber: 'NTC-LOT-1', controlExpirationDate: '2027-01-01T00:00:00.000Z', expectedValue: 'NEGATIVE' } },
        { wellPosition: 'A02', sampleType: 'CONTROL_PTC_HIGH', controlInfo: { controlId: 'PTC-1', controlLotNumber: 'PTC-LOT-1', controlExpirationDate: '2027-01-01T00:00:00.000Z', expectedValue: 'POSITIVE' } },
      ],
      createdByUserId: 'u1', createdByUserName: 'Test User',
    });
    expect(res.ok).toBe(false);
  });

  it('real, per §3.2: create correctly accepts a real batch for an assay with a defined rule when every required control is present at its own real, correct fixed position', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const res = await mockMolecularBatchService.create({
      assayCode: 'st-hpv-highrisk-screen', assayName: 'High-Risk HPV Real-Time PCR', targetInstrumentId: 'PANTHER_02', plateLayout: '96_well',
      reagentLots: [],
      wells: [
        { wellPosition: 'A01', sampleType: 'CONTROL_NTC', controlInfo: { controlId: 'NTC-1', controlLotNumber: 'NTC-LOT-1', controlExpirationDate: '2027-01-01T00:00:00.000Z', expectedValue: 'NEGATIVE' } },
        { wellPosition: 'A02', sampleType: 'CONTROL_PTC_HIGH', controlInfo: { controlId: 'PTC-1', controlLotNumber: 'PTC-LOT-1', controlExpirationDate: '2027-01-01T00:00:00.000Z', expectedValue: 'POSITIVE' } },
      ],
      createdByUserId: 'u1', createdByUserName: 'Test User',
    });
    expect(res.ok).toBe(true);
  });
});

describe('cloneAndSupersede — real, per direct guidance: Clone & Supersede over live-editing an already-created batch', () => {
  it('real, direct correction: refuses outright with no real reason given, never an unexplained status flip', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const res = await mockMolecularBatchService.cloneAndSupersede('mb-001', '   ', 'u1', 'Test User');
    expect(res.ok).toBe(false);
    expect('error' in res && res.error).toBe('reasonRequired'); // Batch 669: a code the screen translates, not an English sentence
    const original = await mockMolecularBatchService.getById('mb-001');
    if (original.ok) expect(original.data.status).toBe('active'); // real, genuinely untouched
  });

  it('real, honest error for a real, non-existent original batch', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const res = await mockMolecularBatchService.cloneAndSupersede('does-not-exist', 'Well A03 was mis-scanned', 'u1', 'Test User');
    expect(res.ok).toBe(false);
    expect('error' in res && res.error).toBe('batchNotFound');
  });

  it('real, per direct guidance\'s own regulatory/audit-integrity reasoning: a successful clone creates a genuinely new, separate real batch record, distinct from the original', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const res = await mockMolecularBatchService.cloneAndSupersede('mb-001', 'Well A03 specimen was mis-scanned; re-running with corrected accession', 'u2', 'Second Tech');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.id).not.toBe('mb-001');
      expect(res.data.status).toBe('draft'); // real, fresh batch, same as any other real create()
      expect(res.data.clonedFromBatchId).toBe('mb-001');
    }
  });

  it('real, per direct guidance\'s own defensive-architecture reasoning: the real, original batch becomes a real, terminal "superseded" record rather than being mutated in place', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const res = await mockMolecularBatchService.cloneAndSupersede('mb-001', 'Well A03 specimen was mis-scanned', 'u2', 'Second Tech');
    expect(res.ok).toBe(true);
    const original = await mockMolecularBatchService.getById('mb-001');
    expect(original.ok).toBe(true);
    if (original.ok && res.ok) {
      expect(original.data.status).toBe('superseded');
      expect(original.data.supersededByBatchId).toBe(res.data.id);
      expect(original.data.supersededReason).toBe('Well A03 specimen was mis-scanned');
      expect(original.data.supersededByUserId).toBe('u2');
      // Real, per this file's own header — the original's own real
      // well data is never touched; it remains the accurate, historical
      // record of what was actually requested/executed at the time.
      expect(original.data.wells.find(w => w.wellPosition === 'A03')?.accessionNumber).toBe('PS26-100452');
    }
  });

  it('real, per direct guidance\'s own carry-over rule: control/calibrator wells (real reagent-lot metadata) carry over onto the real clone', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const res = await mockMolecularBatchService.cloneAndSupersede('mb-001', 'Correcting a mis-scanned specimen', 'u2', 'Second Tech');
    expect(res.ok).toBe(true);
    if (res.ok) {
      const ntc = res.data.wells.find(w => w.wellPosition === 'A01');
      const ptc = res.data.wells.find(w => w.wellPosition === 'A02');
      expect(ntc?.sampleType).toBe('CONTROL_NTC');
      expect(ntc?.controlInfo?.controlLotNumber).toBe('NTC-LOT-441');
      expect(ptc?.sampleType).toBe('CONTROL_PTC_HIGH');
    }
  });

  it('real, direct correction, the core of the whole real audit-integrity reasoning: every real patient-specimen assignment resets to genuinely empty on the clone, requiring a real re-scan', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const res = await mockMolecularBatchService.cloneAndSupersede('mb-001', 'Correcting a mis-scanned specimen', 'u2', 'Second Tech');
    expect(res.ok).toBe(true);
    if (res.ok) {
      const clonedA03 = res.data.wells.find(w => w.wellPosition === 'A03');
      expect(clonedA03?.sampleType).toBeUndefined();
      expect(clonedA03?.specimenUuid).toBeUndefined();
      expect(clonedA03?.accessionNumber).toBeUndefined();
      expect(clonedA03?.containerBarcode).toBeUndefined();
    }
  });

  it('real, direct correction: every real well\'s own movementHistory resets to genuinely empty on the clone, even a control well — a past scan is a real fact about the original batch\'s own run, not the new one', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const res = await mockMolecularBatchService.cloneAndSupersede('mb-001', 'Correcting a mis-scanned specimen', 'u2', 'Second Tech');
    expect(res.ok).toBe(true);
    if (res.ok) {
      for (const w of res.data.wells) expect(w.movementHistory).toBeUndefined();
    }
  });

  it('real, one-shot enforcement, per direct guidance\'s own "explicit user action" reasoning: refuses to supersede a batch that has already been superseded — no branching chains', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    await mockMolecularBatchService.cloneAndSupersede('mb-001', 'First correction', 'u2', 'Second Tech');
    const secondAttempt = await mockMolecularBatchService.cloneAndSupersede('mb-001', 'Trying again', 'u3', 'Third Tech');
    expect(secondAttempt.ok).toBe(false);
    expect('error' in secondAttempt && secondAttempt.error).toBe('alreadySuperseded');
  });

  it('real, honest refusal, never a partial state: if the real create() gating rejects the clone, the original is left completely untouched', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    // Real, direct setup: create a real batch with a reagent lot that
    // will have genuinely expired by clone time, so create()'s own
    // real gating rejects the clone attempt.
    const created = await mockMolecularBatchService.create({
      assayCode: 'RESP_PCR', assayName: 'Respiratory PCR Panel', targetInstrumentId: 'PANTHER_03', plateLayout: '96_well',
      reagentLots: [{ componentType: 'MASTER_MIX', lotNumber: 'MM-SOON-EXPIRED', expirationDate: '2099-01-01T00:00:00.000Z', qcStatus: 'signed_off' }],
      wells: [], createdByUserId: 'u1', createdByUserName: 'Test User',
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    // Real, direct manipulation of the underlying store to simulate a
    // real lot that has genuinely expired since the batch was made —
    // exercising the real refusal path, not just asserting it exists.
    // Uses this app's own real storageGet/storageSet (which apply a
    // real key prefix) rather than a raw localStorage call, so this
    // actually reaches the same real store the service itself reads.
    const stored = storageGet<MolecularBatch[]>('molecular_batches', []);
    const idx = stored.findIndex(b => b.id === created.data.id);
    stored[idx].reagentLots[0].expirationDate = '2020-01-01T00:00:00.000Z';
    storageSet('molecular_batches', stored);
    const cloneAttempt = await mockMolecularBatchService.cloneAndSupersede(created.data.id, 'Trying to clone an expired-lot batch', 'u1', 'Test User');
    expect(cloneAttempt.ok).toBe(false);
    expect('error' in cloneAttempt && cloneAttempt.error).toBe('lotGatingFailed'); // Batch 669: a code, not the English summary
    const originalAfter = await mockMolecularBatchService.getById(created.data.id);
    if (originalAfter.ok) expect(originalAfter.data.status).toBe('draft'); // real, genuinely untouched, not superseded
  });
});

describe('Batch 405: supersede permission and patient-well specimens', () => {
  it('superseding checks molecular:batch:supersede and stops on a refusal', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    enforce.mockImplementationOnce(async () => ({ allowed: false }));
    const res = await mockMolecularBatchService.cloneAndSupersede('mb-001', 'Mis-scanned specimen', 'u2', 'Second Tech');
    expect(enforce).toHaveBeenCalledWith('molecular:batch:supersede');
    expect(res.ok).toBe(false);
    expect('error' in res && res.error).toBe('notPermitted');
  });
});

describe('Batch 405: create refuses a patient well with no specimen', () => {
  it('returns wellSpecimenMissing before anything is saved', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const res = await mockMolecularBatchService.create({
      assayCode: 'st-hpv-highrisk-screen', assayName: 'HPV', targetInstrumentId: 'PANTHER_01', plateLayout: '96_well', reagentLots: [],
      wells: [{ wellPosition: 'A03', sampleType: 'PATIENT_SPECIMEN' }], createdByUserId: 'u1', createdByUserName: 'Tech',
    } as never);
    expect(res.ok).toBe(false);
    expect('error' in res && res.error).toBe('wellSpecimenMissing');
    const all = await mockMolecularBatchService.getAll();
    expect(all.ok && all.data).toHaveLength(1 + MOLECULAR_DEMO_BATCHES.length);
  });
});


describe('Batch 406: the plate goes in a deck slot that takes an extraction plate', () => {
  const base = {
    assayCode: 'RESP_PCR', assayName: 'Respiratory PCR Panel', targetInstrumentId: 'PANTHER_01', plateLayout: '96_well' as const,
    reagentLots: [{ componentType: 'MASTER_MIX' as const, lotNumber: 'MM-NEW', expirationDate: '2027-01-01T00:00:00.000Z', qcStatus: 'signed_off' as const }],
    wells: [], createdByUserId: 'u1', createdByUserName: 'Test User',
  };

  it('refuses a sample-rack slot or a slot the deck lacks, and accepts the plate slot (stored in upper case)', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    for (const deckSlot of ['SLOT_A1', 'SLOT_Z9']) {
      expect(await mockMolecularBatchService.create({ ...base, deckSlot })).toEqual({ ok: false, error: 'deckSlotInvalid' });
    }
    const res = await mockMolecularBatchService.create({ ...base, deckSlot: 'slot_a4' });
    expect(res.ok && res.data.deckSlot).toBe('SLOT_A4');
  });

  it('superseding a run whose slot the deck no longer takes a plate in leaves the slot for the tech', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const created = await mockMolecularBatchService.create({ ...base, deckSlot: 'SLOT_A4' });
    if (!created.ok) throw new Error('create failed');
    await mockMolecularBatchService.updateByUuid(created.data.batchUuid, { deckSlot: 'SLOT_A1' });
    const res = await mockMolecularBatchService.cloneAndSupersede(created.data.id, 'Instrument fault', 'u1', 'Test User');
    expect(res.ok).toBe(true);
    expect(res.ok && res.data.deckSlot).toBeUndefined();
  });
});

describe('Batch 669 (mol-9): a plate with in-house orders on it keeps them through Clone & Supersede', () => {
  it('the wells bound to orders carry onto the clone with their order, accession and specimen, but not a scan', async () => {
    const { mockMolecularBatchService } = await import('./mockMolecularBatchService');
    const draft = await mockMolecularBatchService.getById('mb-demo-467-egfr');
    if (!draft.ok) throw new Error('demo plate missing');
    // An order on the draft EGFR plate (the demo baseline's draft), as the Order Queue binds it.
    await mockMolecularBatchService.updateByUuid(draft.data.batchUuid, { wells: [...draft.data.wells, { wellPosition: 'A03', sampleType: 'PATIENT_SPECIMEN', orderId: 'MO-9', accessionNumber: 'S26-9', specimenUuid: 'sp-9' }] });
    const res = await mockMolecularBatchService.cloneAndSupersede('mb-demo-467-egfr', 'Instrument fault', 'u1', 'Tech');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const well = res.data.wells.find(w => w.wellPosition === 'A03');
    expect(well).toMatchObject({ sampleType: 'PATIENT_SPECIMEN', orderId: 'MO-9', accessionNumber: 'S26-9', specimenUuid: 'sp-9' });
    expect(well?.containerBarcode).toBeUndefined();
    expect(res.data.status).toBe('draft');
  });
});
