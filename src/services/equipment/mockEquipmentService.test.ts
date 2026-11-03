// @vitest-environment happy-dom
// Batch 358: the demo equipment register.
import { beforeEach, describe, expect, it, vi } from 'vitest';
// Batch 428: these tests are about the service, not who may use it, so Configuration
// changes are allowed here (the check itself: authorization/guardConfigWrites.test.ts).
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
import { mockEquipmentService } from './mockEquipmentService';

describe('mockEquipmentService', () => {
  beforeEach(() => localStorage.clear());

  it('seeds the three Panther analysers the demo batches use, (Batch 467) the EGFR PCR instrument, (Batch 359) the Zebra printer and (Batch 434) the slide scanners', async () => {
    const res = await mockEquipmentService.getAll();
    expect(res.ok && res.data.map(i => `${i.code}:${i.kind}`)).toEqual(['PANTHER_01:analyser', 'PANTHER_02:analyser', 'PANTHER_03:analyser', 'PCR_01:analyser', 'ZEBRA_ZT411_01:label_printer', 'APERIO_GT450_01:slide_scanner', 'APERIO_GT450_02:slide_scanner', 'VENTANA_HE600_01:stainer', 'LEICA_ST5020_01:stainer', 'GENIUS_01:slide_scanner', 'LBC_PROC_01:lbc_processor', 'LBC_PROC_02:lbc_processor']); // Batch 739: the liquid-based processors; Batch 763: two stainers with their QC sign-off
    const byCode = await mockEquipmentService.getByCode('panther_02');
    expect(byCode.ok && byCode.data.scanStationId).toBe('station-molecular-1');
  });

  it('brings a Batch 356 instrument list across once, as analysers, keeping admin-added ones', async () => {
    localStorage.setItem('pathscribe_mock_instruments', JSON.stringify([
      { id: 'inst-panther-01', code: 'PANTHER_01', name: 'Panther 1 (renamed)', model: 'Hologic Panther', facilityId: 'c-fenwick-general', status: 'Active' },
      { id: 'inst-123', code: 'COBAS_1', name: 'Cobas 1', facilityId: 'c-fenwick-general', status: 'Active' },
    ]));
    const res = await mockEquipmentService.getAll();
    const byId = new Map((res.ok ? res.data : []).map(e => [e.id, e]));
    expect(byId.get('inst-panther-01')?.name).toBe('Panther 1 (renamed)');
    expect(byId.get('inst-123')).toMatchObject({ code: 'COBAS_1', kind: 'analyser' });
    expect(byId.has('inst-panther-02')).toBe(true); // missing seed records added
    expect(localStorage.getItem('pathscribe_mock_equipment')).not.toBeNull();
  });

  it('creates with a normalised code and a kind; refuses a duplicate or an invalid draft', async () => {
    const created = await mockEquipmentService.create({ code: ' cam_1 ', name: 'Macro camera', kind: 'camera', facilityId: 'c-fenwick-general', serialNumber: ' SN1 ', status: 'Active' });
    expect(created.ok && [created.data.code, created.data.serialNumber]).toEqual(['CAM_1', 'SN1']);
    expect(await mockEquipmentService.create({ code: 'CAM_1', name: 'Again', kind: 'camera', facilityId: 'c-fenwick-general', status: 'Active' })).toEqual({ ok: false, error: 'duplicateCode' });
    expect(await mockEquipmentService.create({ code: 'X', name: '', kind: 'camera', facilityId: 'c-fenwick-general', status: 'Active' })).toEqual({ ok: false, error: 'invalid' });
    const analysers = await mockEquipmentService.getActive('analyser');
    expect(analysers.ok && analysers.data.map(e => e.code)).toEqual(['PANTHER_01', 'PANTHER_02', 'PANTHER_03', 'PCR_01']); // Batch 467: PCR_01
  });

  it('update keeps the code; deactivate hides it from getActive; a station in another lab is refused', async () => {
    const res = await mockEquipmentService.update('inst-panther-03', { name: 'Panther 3 (bay 2)', code: 'CHANGED' } as never);
    expect(res.ok && [res.data.name, res.data.code]).toEqual(['Panther 3 (bay 2)', 'PANTHER_03']);
    await mockEquipmentService.deactivate('inst-panther-03');
    const active = await mockEquipmentService.getActive('analyser');
    expect(active.ok && active.data.map(i => i.code)).toEqual(['PANTHER_01', 'PANTHER_02', 'PCR_01']);
    expect(await mockEquipmentService.update('inst-panther-01', { facilityId: 'c-ent-mpa' })).toEqual({ ok: false, error: 'invalid' });
    expect(await mockEquipmentService.update('nope', { name: 'x' })).toEqual({ ok: false, error: 'notFound' });
  });
});

describe('deck layouts (Batch 406)', () => {
  beforeEach(() => localStorage.clear());

  it('Panthers 1 and 2 have four sample-rack slots (A4 also takes the plate) and a reagent bay; Panther 3 has one slot', async () => {
    const res = await mockEquipmentService.getAll();
    const deck = (code: string) => (res.ok ? res.data : []).find(e => e.code === code)?.deckSlots;
    expect(deck('PANTHER_01')?.map(sl => sl.id)).toEqual(['SLOT_A1', 'SLOT_A2', 'SLOT_A3', 'SLOT_A4', 'SLOT_R1']);
    expect(deck('PANTHER_01')?.find(sl => sl.id === 'SLOT_A4')?.rackTypes).toEqual(['sample_tube_rack', 'extraction_plate']);
    expect(deck('PANTHER_03')?.map(sl => sl.id)).toEqual(['SLOT_A1']);
  });

  it('a saved layout is tidied: slot ids upper case, a blank deck name dropped', async () => {
    const res = await mockEquipmentService.getAll();
    const p3 = (res.ok ? res.data : []).find(e => e.code === 'PANTHER_03')!;
    const saved = await mockEquipmentService.update(p3.id, { deckSlots: [{ id: ' slot_b1 ', deck: ' ', rackTypes: ['sample_tube_rack'] }] });
    expect(saved.ok && saved.data.deckSlots).toEqual([{ id: 'SLOT_B1', deck: undefined, rackTypes: ['sample_tube_rack'] }]);
  });
});
