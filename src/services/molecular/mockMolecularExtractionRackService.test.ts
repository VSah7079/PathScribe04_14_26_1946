// src/services/molecular/mockMolecularExtractionRackService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Batch 406: placing a rack reads the assay's control rule, whose service checks permissions.
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce: async () => ({ allowed: true }) } }));
import type { MolecularMovementRecord } from './IMolecularBatchService';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

const MOVEMENT: MolecularMovementRecord = {
  fromLevel: 'primary_vial', toLevel: 'secondary_rack',
  fromBarcode: 'SPEC-20260907-00000009', toBarcode: 'RACK-MOLE-00001:5',
  at: '2026-09-07T10:00:00.000Z', byUserId: 'u1', byUserName: 'Test Tech',
  stationId: 'station-1', stationName: 'Molecular Bench 1',
};

describe('mockMolecularExtractionRackService — real, per direct follow-up (§2.2/§5.1)', () => {
  it('getAll returns the real, seeded rack with its own real, pre-loaded position', async () => {
    const { mockMolecularExtractionRackService } = await import('./mockMolecularExtractionRackService');
    const res = await mockMolecularExtractionRackService.getAll();
    expect(res.ok).toBe(true);
    if (res.ok) {
      // Batch 406: and the demo rack ready to place. Batch 456: and the demo baseline's rack awaiting extraction.
      expect(res.data.map(r => r.rackBarcode)).toEqual(['RACK-MOLE-00001', 'RK-HPV-0417', 'RACK-MOLE-00456']);
      expect(res.data[0].positions).toHaveLength(24);
      expect(res.data[0].positions[0].containerBarcode).toBe('SPEC-20260906-8831');
    }
  });

  it('create correctly builds a real, new rack with the real, correct number of empty positions', async () => {
    const { mockMolecularExtractionRackService } = await import('./mockMolecularExtractionRackService');
    const res = await mockMolecularExtractionRackService.create({ capacity: 12, createdByUserId: 'u1', createdByUserName: 'Test User' });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.rackBarcode).toMatch(/^RACK-MOLE-\d{5}$/);
      expect(res.data.positions).toHaveLength(12);
      expect(res.data.positions.every(p => !p.containerBarcode)).toBe(true);
    }
  });

  it('loadSpecimenIntoPosition correctly places a real specimen at a real, genuinely empty position', async () => {
    const { mockMolecularExtractionRackService } = await import('./mockMolecularExtractionRackService');
    const res = await mockMolecularExtractionRackService.loadSpecimenIntoPosition(
      'rack-001', '5', { specimenUuid: 'new-uuid', accessionNumber: 'PS26-999', containerBarcode: 'SPEC-20260907-00000009' }, MOVEMENT,
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      const pos = res.data.positions.find(p => p.positionLabel === '5')!;
      expect(pos.containerBarcode).toBe('SPEC-20260907-00000009');
      expect(pos.movementHistory).toHaveLength(1);
    }
  });

  it('loadSpecimenIntoPosition correctly refuses to overwrite a real, already-occupied position', async () => {
    const { mockMolecularExtractionRackService } = await import('./mockMolecularExtractionRackService');
    const res = await mockMolecularExtractionRackService.loadSpecimenIntoPosition(
      'rack-001', '1', { accessionNumber: 'PS26-OTHER', containerBarcode: 'SPEC-OTHER' }, MOVEMENT,
    );
    expect(res.ok).toBe(false);
  });

  it('loadSpecimenIntoPosition on a real, non-existent position returns an honest error', async () => {
    const { mockMolecularExtractionRackService } = await import('./mockMolecularExtractionRackService');
    const res = await mockMolecularExtractionRackService.loadSpecimenIntoPosition(
      'rack-001', '999', { containerBarcode: 'SPEC-X' }, MOVEMENT,
    );
    expect(res.ok).toBe(false);
  });

  it('findPositionByContainerBarcode correctly finds a real, already-racked specimen', async () => {
    const { mockMolecularExtractionRackService } = await import('./mockMolecularExtractionRackService');
    const res = await mockMolecularExtractionRackService.findPositionByContainerBarcode('SPEC-20260906-8831');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).not.toBeNull();
      expect(res.data!.position.positionLabel).toBe('1');
      expect(res.data!.rack.rackBarcode).toBe('RACK-MOLE-00001');
    }
  });

  it('findPositionByContainerBarcode correctly returns an honest null for a real specimen that was never racked', async () => {
    const { mockMolecularExtractionRackService } = await import('./mockMolecularExtractionRackService');
    const res = await mockMolecularExtractionRackService.findPositionByContainerBarcode('SPEC-NEVER-RACKED');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBeNull();
  });
});

describe('Batch 406: rack identifier, sample IDs and deck placement (Pete)', () => {
  const load = async () => {
    const svc = (await import('./mockMolecularExtractionRackService')).mockMolecularExtractionRackService;
    const { resolveFieldRequirements } = await import('../fieldRequirements/fieldRequirementRules');
    return { svc, reqs: resolveFieldRequirements('molecularRack') };
  };
  const who = { placedByUserId: 'u1', placedByUserName: 'Tech', via: 'manual' as const };

  it('create keeps the physical rack barcode (upper case), refuses a duplicate or malformed one, and generates one when blank', async () => {
    const { svc } = await load();
    const own = await svc.create({ capacity: 8, rackBarcode: ' rk-new-01 ', createdByUserId: 'u1', createdByUserName: 'Tech' });
    expect(own.ok && own.data.rackBarcode).toBe('RK-NEW-01');
    expect(own.ok && own.data.rackType).toBe('sample_tube_rack');
    expect(await svc.create({ capacity: 8, rackBarcode: 'RK-HPV-0417', createdByUserId: 'u1', createdByUserName: 'Tech' })).toEqual({ ok: false, error: 'duplicateRackBarcode' });
    expect(await svc.create({ capacity: 8, rackBarcode: 'x!', createdByUserId: 'u1', createdByUserName: 'Tech' })).toEqual({ ok: false, error: 'invalidRackBarcode' });
    const generated = await svc.create({ capacity: 8, createdByUserId: 'u1', createdByUserName: 'Tech' });
    expect(generated.ok && generated.data.rackBarcode).toMatch(/^RACK-MOLE-\d{5}$/);
  });

  it('a tube loaded without an accession blocks placement until one is recorded', async () => {
    const { svc, reqs } = await load();
    await svc.loadSpecimenIntoPosition('rack-002', '4', { containerBarcode: 'SPEC-TYPED-1' }, MOVEMENT);
    const place = () => svc.placeOnDeck('rack-002', { ...who, instrumentCode: 'PANTHER_03' }, reqs);
    expect(await place()).toEqual({ ok: false, error: 'placementIncomplete' });
    expect(await svc.setPositionAccession('rack-002', '5', 'PS26-1')).toEqual({ ok: false, error: 'positionEmpty' });
    await svc.setPositionAccession('rack-002', '4', ' PS26-100470 ');
    const res = await place();
    expect(res.ok && res.data.positions[3].accessionNumber).toBe('PS26-100470');
    expect(res.ok && res.data.placement).toMatchObject({ instrumentCode: 'PANTHER_03', deckSlotId: undefined, via: 'manual' });
  });

  it('a multi-slot instrument needs the slot; a single-slot one does not', async () => {
    const { svc, reqs } = await load();
    expect(await svc.placeOnDeck('rack-002', { ...who, instrumentCode: 'PANTHER_01' }, reqs)).toEqual({ ok: false, error: 'placementIncomplete' });
    expect((await svc.placeOnDeck('rack-002', { ...who, instrumentCode: 'panther_03' }, reqs)).ok).toBe(true);
  });

  it('the slot must exist, take a sample rack and, with an assay, be one its rule allows (A1 or A2 for HPV)', async () => {
    const { svc, reqs } = await load();
    const at = (deckSlotId: string, assayCode?: string) => svc.placeOnDeck('rack-002', { ...who, instrumentCode: 'PANTHER_01', deckSlotId, assayCode }, reqs);
    expect(await at('SLOT_Z9')).toEqual({ ok: false, error: 'unknownSlot' });
    expect(await at('SLOT_R1')).toEqual({ ok: false, error: 'wrongRackType' });
    expect(await at('SLOT_A3', 'st-hpv-highrisk-screen')).toEqual({ ok: false, error: 'notForAssay' });
    expect((await at('SLOT_A3')).ok).toBe(true);
    const res = await at('slot_a2', 'st-hpv-highrisk-screen');
    expect(res.ok && res.data.placement?.deckSlotId).toBe('SLOT_A2');
  });

  it('refuses an instrument that is not an active analyser, and an empty rack', async () => {
    const { svc, reqs } = await load();
    expect(await svc.placeOnDeck('rack-002', { ...who, instrumentCode: 'ZEBRA_ZT411_01' }, reqs)).toEqual({ ok: false, error: 'instrumentUnavailable' });
    const empty = await svc.create({ capacity: 4, createdByUserId: 'u1', createdByUserName: 'Tech' });
    if (!empty.ok) throw new Error('create failed');
    expect(await svc.placeOnDeck(empty.data.id, { ...who, instrumentCode: 'PANTHER_03' }, reqs)).toEqual({ ok: false, error: 'placementIncomplete' });
  });
});
