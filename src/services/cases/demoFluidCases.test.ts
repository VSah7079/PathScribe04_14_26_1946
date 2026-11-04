// Batch 744 (Pete's seed row S14): the fluid and FNA cases are at the stages the videos need, and their material follows
// the rules the screens apply (preparation suggestions, Divide specimen totals, hand-off, ROSE, batches, instrument orders).
import { describe, expect, it } from 'vitest';
import { DEMO_FLUID_CASES, DEMO_FLUID_CASE_IDS, withFluidDemo } from './demoFluidCases';
import { computeCytologyPrepSuggestions, isCsfSpecimen } from '../cytology/computeCytologyPrepSuggestions';
import { remainingPrepSuggestions } from '@/utils/microtomyOperations';
import { divisionTotals } from '../material/specimenDivision';
import { resolveCytologyRoseActiveMembership } from '../cytology/resolveCytologyRoseActiveMembership';
import { resolveCytologyDecantPendingMembership } from '../cytology/resolveCytologyDecantPendingMembership';
import { benchTakesDecant } from '../cytology/cellBlockHandoff';
import { batchDemoSeeds, BATCH_DEMO_IDS, LBC_DEMO_BATCH_BARCODES } from '../batches/batchDemoSeeds';
import { molecularOrderDemoEntries } from '../molecularOrders/molecularOrderDemoSeed';
import { DEMO_CYTOLOGY_PATIENTS } from '../patients/demoCytologyPatients';
import { mockSpecimenDictionaryService } from '../specimenDictionary/mockSpecimenDictionaryService';

const byId = (id: string) => DEMO_FLUID_CASES.find(c => c.id === id) as any;
const sp = (id: string) => byId(id).specimens[0];
const decant = (id: string, label: string) => sp(id).decants.find((d: any) => d.label === label);
const suggest = (id: string, label: string) => {
  const d = decant(id, label);
  return computeCytologyPrepSuggestions({ totalVolumeMl: d.totalVolumeMl, yieldPelletSize: d.yieldPelletSize, csf: isCsfSpecimen(sp(id)) });
};

describe('S14 fluid and FNA seed', () => {
  it('eight cases with fictional patients in the patient index and real dictionary entries', async () => {
    expect(DEMO_FLUID_CASES.map(c => c.id).sort()).toEqual(Object.values(DEMO_FLUID_CASE_IDS).sort());
    const all: any = await mockSpecimenDictionaryService.getAll();
    const dict = new Set(((all.data ?? all) as any[]).map(e => e.id));
    for (const c of DEMO_FLUID_CASES as any[]) {
      expect(dict.has(c.specimens[0].specimenDictionaryEntryId), c.id).toBe(true);
      const p = DEMO_CYTOLOGY_PATIENTS.find(x => x.id === c.patient.id);
      expect(p?.mrn, c.id).toBe(c.patient.mrn);
      expect(c.accession.fullAccession).toBe(c.id);
    }
  });

  it('received: the bronchial washing has only the two planned cell blocks', () => {
    const decants = sp(DEMO_FLUID_CASE_IDS.bronchial).decants;
    expect(decants.map((d: any) => [d.label, d.decantType, !!d.handoff])).toEqual([['D1', 'cell_block', false], ['D2', 'cell_block', false]]);
  });

  it('decanted: peritoneal over 20 mL with a high yield shows the extra cell block, none accepted yet', () => {
    const s = suggest(DEMO_FLUID_CASE_IDS.peritoneal, 'D3');
    expect(s).toEqual(expect.arrayContaining([{ preparationMethod: 'Cell Block', count: 2 }, { preparationMethod: 'ThinPrep/Liquid-Based', count: 2 }]));
    expect(remainingPrepSuggestions(decant(DEMO_FLUID_CASE_IDS.peritoneal, 'D3').stains, s)).toEqual(s);
  });

  it('urine (15 mL, low yield) and CSF (cytospins) show the small-volume suggestions, already accepted', () => {
    expect(suggest(DEMO_FLUID_CASE_IDS.urine, 'D3').map(x => x.preparationMethod).sort()).toEqual(['Direct Smear (Air-Dried)', 'ThinPrep/Liquid-Based']);
    expect(remainingPrepSuggestions(decant(DEMO_FLUID_CASE_IDS.urine, 'D3').stains, suggest(DEMO_FLUID_CASE_IDS.urine, 'D3'))).toEqual([]);
    expect(suggest(DEMO_FLUID_CASE_IDS.csf, 'D3')).toEqual([{ preparationMethod: 'Cytospin', count: 2 }]);
    expect(decant(DEMO_FLUID_CASE_IDS.csf, 'D3').stains.map((s: any) => [s.preparationMethod, s.status])).toEqual([['Cytospin', 'Coverslipped'], ['Cytospin', 'Staining']]);
  });

  it('pleural: cell blocks handed off, a ThinPrep Pap and a smear ready, and the division adds up', () => {
    const p = sp(DEMO_FLUID_CASE_IDS.pleural);
    expect(benchTakesDecant('microtome', decant(DEMO_FLUID_CASE_IDS.pleural, 'D1'))).toBeNull();
    const aliquots = p.decants.filter((d: any) => d.decantType === 'aliquot');
    expect(aliquots.map((a: any) => [a.aliquotPurpose, a.destination.name, a.aliquotStatus])).toEqual([
      ['flow_cytometry', 'Flow Cytometry', 'received'], ['microbiology', 'Microbiology', 'result_back'], ['molecular', 'Molecular', 'sent'],
    ]);
    expect(aliquots.find((a: any) => a.aliquotStatus === 'result_back').receivingAccession).toBeTruthy();
    const totals = divisionTotals(p.division.startingVolumeMl, aliquots.map((a: any) => ({ volumeMl: a.volumeMl })));
    expect(totals).toEqual({ splitMl: p.division.splitMl, remainingMl: p.division.remainingMl });
    expect(p.division.aliquotIds).toEqual(aliquots.map((a: any) => a.id));
    expect(resolveCytologyDecantPendingMembership(p.decants)).toBe(false);
  });

  it('urine is ready to sign: Paris synoptic complete and a pathologist assigned', () => {
    const c = byId(DEMO_FLUID_CASE_IDS.urine);
    expect(c.order.assignedTo).toBe('PATH-SJ-001');
    expect(c.synopticReports[0]).toMatchObject({ templateId: 'urine_cytology', answers: { paris_category: 'shguc', adequacy_status: 'satisfactory' } });
  });

  it('EBUS FNA: ROSE adequate on pass 2, cell block at the Microtome with H&E and TTF-1 to cut', () => {
    const p = sp(DEMO_FLUID_CASE_IDS.ebusFna);
    expect(resolveCytologyRoseActiveMembership(p.roseEvaluations)).toBe(true);
    expect(p.roseEvaluations[0].passes.some((x: any) => x.adequacyAssessment === 'adequate')).toBe(true);
    const cb = decant(DEMO_FLUID_CASE_IDS.ebusFna, 'D1');
    expect(benchTakesDecant('microtome', cb)).toBeNull();
    expect(cb.stains.map((s: any) => [s.stainName, s.status])).toEqual([['H&E', 'Pending Cut'], ['TTF-1', 'Pending Cut']]);
    expect(resolveCytologyDecantPendingMembership(p.decants)).toBe(true);
  });

  it('the thyroid FNA S26-5005 gets an inadequate ROSE, once', () => {
    const seeded = withFluidDemo([{ id: 'S26-5005-CYT-001', order: { assignedTo: 'PATH-001' }, specimens: [{ id: 'x' }] } as any]);
    expect((seeded[0] as any).order.assignedTo).toBe('CT-001');
    const rose = (seeded[0] as any).specimens[0].roseEvaluations;
    expect(rose).toHaveLength(1);
    expect(rose[0].passes.every((x: any) => x.adequacyAssessment !== 'adequate')).toBe(true);
    expect((withFluidDemo(seeded)[0] as any).specimens[0].roseEvaluations).toHaveLength(1);
  });

  it('every cytology batch item is seeded material, and each liquid-based batch has its instrument order', () => {
    const material = new Set<string>();
    for (const c of DEMO_FLUID_CASES as any[]) for (const d of c.specimens[0].decants) { material.add(d.displayId); for (const s of d.stains) material.add(s.displayId); }
    material.add('S26-4652-CYT-001-AD1-L1'); // materialDemoSeed.ts
    const batches = batchDemoSeeds().filter(b => b.processingNode.startsWith('Cytology'));
    expect(batches.map(b => b.id).sort()).toEqual([BATCH_DEMO_IDS.cytoImaging, BATCH_DEMO_IDS.cytoProcessingSurePath, BATCH_DEMO_IDS.cytoProcessingThinPrep, BATCH_DEMO_IDS.cytoStaining].sort());
    for (const b of batches) { expect(b.items.length).toBeGreaterThan(0); for (const i of b.items) expect(material.has(i.displayId), i.displayId).toBe(true); }
    const orders = molecularOrderDemoEntries().filter(o => o.eventType === 'order.instrument');
    expect(orders.map(o => (o.payload as any).masterBarcode).sort()).toEqual([LBC_DEMO_BATCH_BARCODES.surePath, LBC_DEMO_BATCH_BARCODES.thinPrep].sort());
    for (const pap of [DEMO_FLUID_CASE_IDS.thinPrepPap, DEMO_FLUID_CASE_IDS.surePathPap]) expect(decant(pap, 'D1').stains).toHaveLength(1);
  });
});
