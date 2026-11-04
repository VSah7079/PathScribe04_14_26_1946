// Batch 739 (Pete's fluid decisions 4, 5 and 6): aliquots as their own decant type, liquid-based Pap protocols for
// ThinPrep and SurePath, the processor chosen from Equipment, and cytospins for a CSF or a small fluid.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeCytologyPrepSuggestions, isCsfSpecimen } from './computeCytologyPrepSuggestions';
import { isLegacyHpvAliquot, migrateLegacyHpvAliquots } from '@/utils/aliquotMigration';
import { decantTypeText } from '@/utils/decantTypeText';
import { CYTOLOGY_DEMO_PROTOCOLS, CYTOLOGY_DEMO_PROTOCOL_IDS } from '../protocols/cytologyDemoProtocols';

vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce: async () => ({ allowed: true }) } }));

describe('cytospin for a CSF or a small fluid (decision 5)', () => {
  it('suggests two cytospins for a CSF, never a cell block', () => {
    expect(computeCytologyPrepSuggestions({ yieldPelletSize: 'High', totalVolumeMl: 8, csf: true })).toEqual([{ preparationMethod: 'Cytospin', count: 2 }]);
  });
  it('a 5 mL fluid gets cytospins, and a cell block only with a high yield; a larger fluid is unchanged', () => {
    expect(computeCytologyPrepSuggestions({ yieldPelletSize: 'Low', totalVolumeMl: 4 })).toEqual([{ preparationMethod: 'Cytospin', count: 2 }]);
    expect(computeCytologyPrepSuggestions({ yieldPelletSize: 'High', totalVolumeMl: 5 })).toEqual([{ preparationMethod: 'Cytospin', count: 2 }, { preparationMethod: 'Cell Block', count: 1 }]);
    expect(computeCytologyPrepSuggestions({ yieldPelletSize: 'High', totalVolumeMl: 35 }).map(s => s.preparationMethod)).toEqual(['ThinPrep/Liquid-Based', 'Cell Block', 'Direct Smear (Air-Dried)']);
    expect(computeCytologyPrepSuggestions({ totalVolumeMl: 3, csf: true })).toEqual([]);
  });
  it('knows a CSF by its dictionary entry or its description', () => {
    expect(isCsfSpecimen({ specimenDictionaryEntryId: 'sp-cyto-csf' })).toBe(true);
    expect(isCsfSpecimen({ description: 'Cerebrospinal fluid, lumbar puncture' })).toBe(true);
    expect(isCsfSpecimen({ description: 'Pleural fluid' })).toBe(false);
  });
});

describe('aliquots (decision 6)', () => {
  it('the HPV tracks make aliquots for HPV testing; the Pap tracks make the vial with its slide', () => {
    const byId = Object.fromEntries(CYTOLOGY_DEMO_PROTOCOLS.map(p => [p.id, p.pathways[0]]));
    expect([byId[CYTOLOGY_DEMO_PROTOCOL_IDS.gynThinPrepHpv].decantType, byId[CYTOLOGY_DEMO_PROTOCOL_IDS.gynThinPrepHpv].aliquotPurpose]).toEqual(['aliquot', 'hpv']);
    expect([byId[CYTOLOGY_DEMO_PROTOCOL_IDS.hpvOnly].decantType, byId[CYTOLOGY_DEMO_PROTOCOL_IDS.hpvOnly].aliquotPurpose]).toEqual(['aliquot', 'hpv']);
    expect(byId[CYTOLOGY_DEMO_PROTOCOL_IDS.gynThinPrep].tasks[0].stainTypeIds).toEqual(['st-pap-thinprep']);
    expect(byId[CYTOLOGY_DEMO_PROTOCOL_IDS.gynSurePath].tasks[0].stainTypeIds).toEqual(['st-pap-surepath']);
    expect(byId[CYTOLOGY_DEMO_PROTOCOL_IDS.fluidCellBlock].decantType).toBeUndefined(); // a cell block, as before
  });
  it('retypes a cell-block decant holding only HPV tests as an HPV aliquot, and nothing else', () => {
    const hpv = { id: 'd1', label: 'D1', decantType: 'cell_block' as const, cassetteColorId: 'c', stains: [{ id: 's', stainName: 'HPV High-Risk Screening with Reflex Genotyping', status: 'Pending Cut' }] };
    const cb = { id: 'd2', label: 'D2', decantType: 'cell_block' as const, stains: [{ id: 's2', stainName: 'H&E', status: 'Pending Cut' }] };
    expect([isLegacyHpvAliquot(hpv as never), isLegacyHpvAliquot(cb as never)]).toEqual([true, false]);
    const c = { specimens: [{ id: 'sp', decants: [hpv, cb] }] } as never;
    const out = migrateLegacyHpvAliquots(c) as { specimens: { decants: { decantType: string; aliquotPurpose?: string; cassetteColorId?: string }[] }[] };
    expect(out.specimens[0].decants.map(d => [d.decantType, d.aliquotPurpose, d.cassetteColorId])).toEqual([['aliquot', 'hpv', undefined], ['cell_block', undefined, undefined]]);
    const none = { specimens: [{ id: 'sp', decants: [cb] }] } as never;
    expect(migrateLegacyHpvAliquots(none)).toBe(none);
  });
  it('names an aliquot by its purpose', () => {
    const t = ((k: string, o?: Record<string, string>) => (o ? `${k}(${Object.values(o).join(',')})` : k)) as never;
    expect(decantTypeText(t, { decantType: 'aliquot', aliquotPurpose: 'flow_cytometry' })).toBe('cytologyScreening.materialDrawer.aliquotType(cytologyScreening.materialDrawer.aliquotPurpose.flow_cytometry)');
    expect(decantTypeText(t, { decantType: 'cell_block' })).toBe('cytologyScreening.materialDrawer.decantType.cell_block');
  });
});

describe('the liquid-based processor on the instrument order (decision 4)', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; }, clear: () => {}, key: () => null, length: 0 });
  });
  it('sends the chosen processor from Equipment, and no vendor when none is chosen', async () => {
    const { mockBatchService } = await import('../batches/mockBatchService');
    const { mockMolecularOrderOutboundQueueService: queue } = await import('../molecularOrders/mockMolecularOrderOutboundQueueService');
    const draft = { processingNode: 'Cytology Processing', protocol: 'Pap', priority: 'Routine', createdByUserId: 'u', createdByUserName: 'Tech' };
    const made = await mockBatchService.create({ ...draft, processorEquipmentId: 'eq-lbc-proc-02' } as never);
    await mockBatchService.create(draft as never);
    await new Promise(r => setTimeout(r, 50));
    const all = await queue.getAll();
    const payloads = (all.ok ? all.data : []).filter(e => e.eventType === 'order.instrument').map(e => e.payload as unknown as Record<string, string>);
    expect(made.ok && made.data.processorEquipmentId).toBe('eq-lbc-proc-02');
    expect(payloads.some(p => p.processorCode === 'LBC_PROC_02' && p.processorMake === 'BD' && p.processorModel === 'PrepStain')).toBe(true);
    expect(payloads.some(p => !('processorCode' in p))).toBe(true);
    expect(payloads.some(p => 'instrumentVendor' in p)).toBe(false);
  });
});
