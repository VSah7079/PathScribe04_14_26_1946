// Batch 746 (Pete's seed row S7, Videos 3 and 5): the molecular seed is consistent end to end — orders on real cases and
// blocks, plates that satisfy their control rules, runs whose review status follows their controls, results that match
// the orders and the reports, and the lots a plate must not use.
import { describe, expect, it } from 'vitest';
import { MOLECULAR_RUN_HISTORY_BATCHES, MOLECULAR_RUN_HISTORY_ORDERS, MOLECULAR_DEMO_LOT_NUMBERS } from './molecularRunHistoryDemoSeed';
import { MOLECULAR_DEMO_BATCHES } from './molecularDemoSeed';
import { MOLECULAR_CONTROL_RULE_SEED } from './mockMolecularAssayControlRuleService';
import { resolveMolecularControlRequirementValidation } from './resolveMolecularControlRequirementValidation';
import { resolveMolecularRunValidationGating } from './resolveMolecularRunValidationGating';
import { resolveMolecularReagentLotGating } from './resolveMolecularReagentLotGating';
import { resolveMolecularHistoricalTrace } from './resolveMolecularHistoricalTrace';
import { MOLECULAR_ORDER_SEED } from '../molecularOrders/mockMolecularOrderStore';
import { bindOrdersToPlate } from '../molecularOrders/molecularPlateOrchestrator';
import { DEMO_MOLECULAR_CASES } from '../cases/demoMolecularCases';
import { DEMO_BASELINE_CASES } from '../cases/demoBaselineCases';
import { DEMO_SURGICAL_PATIENTS } from '../patients/demoSurgicalPatients';
import { mockReagentLotService } from '../reagentLots/mockReagentLotService';
import { boundFieldFor, decideHydration } from '../templates/molecularResultBinding';
import lungAdeno from '@/data/templates/generic/lung_adeno.json';

const caseById = (id: string) => (DEMO_BASELINE_CASES as any[]).find(c => c.id === id);

describe('S7 molecular seed', () => {
  it('twelve in-house orders wait for a plate across two assays, each on its case, block and add-on; a send-out order stays', () => {
    const waiting = MOLECULAR_RUN_HISTORY_ORDERS.filter(o => o.status === 'QUEUED');
    expect(waiting).toHaveLength(12);
    expect(new Set(waiting.map(o => o.assayTarget))).toEqual(new Set(['st-egfr-pcr', 'st-kras-pcr']));
    for (const o of waiting) {
      expect(o.routing).toBe('IN_HOUSE');
      const c = caseById(o.caseId);
      expect(c, o.caseId).toBeTruthy();
      const block = c.specimens.find((s: any) => s.id === o.specimenId).blocks.find((b: any) => b.id === o.blockId);
      expect(block.label).toBe(o.blockLabel);
      expect(block.stains.find((s: any) => s.id === o.stainOrderId).stainTypeId).toBe(o.assayTarget);
      expect(c.order.assignedTo).toBe(o.orderedBy);
    }
    expect(MOLECULAR_ORDER_SEED.some(o => o.routing === 'SEND_OUT')).toBe(true);
    expect(new Set(MOLECULAR_ORDER_SEED.map(o => o.orderId)).size).toBe(MOLECULAR_ORDER_SEED.length);
  });

  it('both in-house assays have a control rule, and every seeded plate satisfies its rule', () => {
    expect(MOLECULAR_CONTROL_RULE_SEED.map(r => r.assayCode)).toEqual(expect.arrayContaining(['st-egfr-pcr', 'st-kras-pcr', 'st-hpv-highrisk-screen']));
    for (const b of [...MOLECULAR_DEMO_BATCHES, ...MOLECULAR_RUN_HISTORY_BATCHES]) {
      expect(resolveMolecularControlRequirementValidation(b.assayCode, b.wells, [...MOLECULAR_CONTROL_RULE_SEED]).satisfied, b.id).toBe(true);
    }
  });

  it('three completed runs with a readout for every well; the KRAS run with a failed control is blocked and superseded by its repeat', () => {
    const completed = MOLECULAR_RUN_HISTORY_BATCHES.filter(b => b.status === 'completed');
    expect(completed.length).toBeGreaterThanOrEqual(3);
    for (const b of MOLECULAR_RUN_HISTORY_BATCHES) {
      expect(b.results!.map(r => r.well_position).sort(), b.id).toEqual(b.wells.map(w => w.wellPosition).sort());
      expect(b.reviewStatus, b.id).toBe(resolveMolecularRunValidationGating(b.controlsPassed!));
      expect(resolveMolecularReagentLotGating(b.reagentLots, b.wells, new Date()).allowed, b.id).toBe(true);
      for (const w of b.wells.filter(x => x.sampleType === 'PATIENT_SPECIMEN')) expect(resolveMolecularHistoricalTrace([b], { accessionNumber: w.accessionNumber }), w.accessionNumber).not.toBeNull();
    }
    const failed = MOLECULAR_RUN_HISTORY_BATCHES.find(b => b.id === 'mb-demo-746-kras-fail')!;
    expect(failed).toMatchObject({ status: 'superseded', controlsPassed: false, reviewStatus: 'BLOCKED', supersededByBatchId: 'mb-demo-746-kras-repeat' });
    expect(failed.results!.find(r => r.well_position === 'A01')!.interpretation).toBe('POSITIVE'); // the no-template control amplified
    expect(MOLECULAR_RUN_HISTORY_BATCHES.find(b => b.id === 'mb-demo-746-kras-repeat')!.clonedFromBatchId).toBe(failed.id);
  });

  it('each resulted order matches its well on the run, and a lung report shows the EGFR result the binding gives', () => {
    const resulted = MOLECULAR_RUN_HISTORY_ORDERS.filter(o => o.status === 'RESULTED');
    expect(resulted.map(o => o.caseId).sort()).toEqual(['S26-5208', 'S26-5209', 'S26-5216']);
    for (const o of resulted) {
      const run = MOLECULAR_RUN_HISTORY_BATCHES.find(b => b.id === o.plate!.batchId)!;
      expect(run.status).toBe('completed');
      const row = run.results!.find(r => r.well_position === o.plate!.wellPosition)!;
      expect([row.accession_number, row.order_id, row.interpretation]).toEqual([o.accession, o.orderId, o.result!.interpretation]);
    }
    const field = boundFieldFor(lungAdeno as any, 'st-egfr-pcr')!;
    for (const id of ['S26-5208', 'S26-5209']) {
      const o = resulted.find(x => x.caseId === id)!;
      const report = caseById(id).synopticReports[0];
      expect(o.hydration).toMatchObject({ outcome: 'hydrated', instanceId: report.instanceId, fieldId: field.id });
      expect(decideHydration(field, o.result!.interpretation, report.answers).kind, id).toBe('same');
    }
  });

  it('the registry has the runs’ lots, one expired and one failed QC, and a plate with either is blocked', async () => {
    const res: any = await mockReagentLotService.getAll();
    const byNumber = new Map((res.data as any[]).map(l => [l.lotNumber, l]));
    // The assay kits' master mix lots are registry entries (a lot names its test); the shared extraction buffer is recorded on each run only.
    for (const [k, n] of Object.entries(MOLECULAR_DEMO_LOT_NUMBERS)) if (k !== 'extraction') expect(byNumber.has(n), n).toBe(true);
    const expired = byNumber.get(MOLECULAR_DEMO_LOT_NUMBERS.egfrMasterMixExpired);
    expect(new Date(expired.expirationDate).getTime()).toBeLessThan(Date.now());
    expect(byNumber.get(MOLECULAR_DEMO_LOT_NUMBERS.krasMasterMixFailedQc).qcStatus).toBe('Failed');
    const wells = MOLECULAR_RUN_HISTORY_BATCHES[1].wells;
    const gate = (lotNumber: string, expirationDate: string, qcStatus: 'signed_off' | 'failed') =>
      resolveMolecularReagentLotGating([{ componentType: 'MASTER_MIX', lotNumber, expirationDate, qcStatus }], wells, new Date()).allowed;
    expect(gate(expired.lotNumber, new Date(expired.expirationDate).toISOString(), 'signed_off')).toBe(false);
    expect(gate(MOLECULAR_DEMO_LOT_NUMBERS.krasMasterMixFailedQc, new Date(Date.now() + 86_400_000 * 30).toISOString(), 'failed')).toBe(false);
  });

  it('the waiting EGFR orders go onto the draft EGFR plate, and the patients are in the index', () => {
    const egfrPlate = MOLECULAR_DEMO_BATCHES.find(b => b.id === 'mb-demo-467-egfr')!;
    const waitingEgfr = MOLECULAR_RUN_HISTORY_ORDERS.filter(o => o.status === 'QUEUED' && o.assayTarget === 'st-egfr-pcr');
    const bound = bindOrdersToPlate(egfrPlate, waitingEgfr, [...MOLECULAR_CONTROL_RULE_SEED]);
    expect(bound.ok).toBe(true);
    for (const c of DEMO_MOLECULAR_CASES as any[]) expect(DEMO_SURGICAL_PATIENTS.find(p => p.id === c.patient.id)?.mrn, c.id).toBe(c.patient.mrn);
  });
});
