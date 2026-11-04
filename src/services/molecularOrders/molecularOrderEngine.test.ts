// Batch 467: the molecular order engine (Pete's spec v1.1.0) with in-memory dependencies.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMolecularOrderEngine, type MolecularOrderEngineDeps } from './molecularOrderEngine';
import type { MolecularOrder, MolecularOrderIngest } from './molecularOrderTypes';
import type { MolecularBatch } from '../molecular/IMolecularBatchService';
import type { MolecularAssayControlRule } from '../molecular/IMolecularAssayControlRuleService';
import type { StainType } from '../stains/IStainService';
import type { Case } from '@/types/case/Case';
import type { NewAuditLog } from '../auditlog/IAuditService';

const EGFR = { id: 'st-egfr', name: 'EGFR PCR', category: 'Molecular', active: true, inHouseFacilityIds: ['lab-a'], referenceLabFacilityIds: ['ref-1'], defaultReferenceLabFacilityId: 'ref-1' } as unknown as StainType;
const RULES = [{ id: 'r1', assayCode: 'st-egfr', requiredControls: [
  { sampleType: 'CONTROL_NTC', positionMode: 'fixed', fixedWellPosition: 'A01' },
  { sampleType: 'CONTROL_PTC_HIGH', positionMode: 'fixed', fixedWellPosition: 'A02' },
], createdAt: '' }] as unknown as MolecularAssayControlRule[];

const plate = (over: Partial<MolecularBatch> = {}): MolecularBatch => ({
  id: 'mb-1', batchBarcode: 'B1', batchUuid: 'uuid-1', assayCode: 'st-egfr', assayName: 'EGFR PCR', targetInstrumentId: 'PCR_01',
  plateUuid: 'p', plateBarcode: 'PLT-1', plateLayout: '6_well', reagentLots: [], status: 'draft', createdAt: '', createdByUserId: 'u', createdByUserName: 'U',
  wells: [
    { wellPosition: 'A01', sampleType: 'CONTROL_NTC', controlInfo: { controlId: 'NTC', expectedValue: 'NEGATIVE' } },
    { wellPosition: 'A02', sampleType: 'CONTROL_PTC_HIGH', controlInfo: { controlId: 'PTC', expectedValue: 'POSITIVE' } },
  ],
  ...over,
} as MolecularBatch);

const TEMPLATE = { sections: [{ fields: [{ id: 'egfr_status', type: 'dropdown', options: [{ id: 'det' }, { id: 'notdet' }], molecularResult: { assayCodes: ['st-egfr'], values: { POSITIVE: 'det', NEGATIVE: 'notdet' } } }] }] };

const request = (over: Partial<MolecularOrderIngest> = {}): MolecularOrderIngest => ({
  caseId: 'c1', accession: 'S26-1', specimenId: 'sp1', specimenLabel: 'A', blockId: 'b1', blockLabel: '1', assayTarget: 'st-egfr',
  routing: 'IN_HOUSE', performingLabFacilityId: 'lab-a', stainOrderId: 'so-1', orderedBy: 'p1', orderedByName: 'Dr P', ...over,
});

let orders: MolecularOrder[];
let batches: MolecularBatch[];
let tests: StainType[];
let caseData: Case;
let audits: NewAuditLog[];
let allowed: boolean;
let addenda: unknown[];
let n: number;

const deps = (): MolecularOrderEngineDeps => ({
  loadOrders: () => orders,
  saveOrders: o => { orders = o; },
  enforce: async () => ({ allowed }),
  getStainTypes: async () => tests,
  getBatches: async () => batches,
  updateBatchWells: async (uuid, wells) => { batches = batches.map(b => (b.batchUuid === uuid ? { ...b, wells } : b)); return true; },
  getControlRules: async () => RULES,
  getCase: async () => caseData,
  changeCase: async (_id, change) => { const p = change(caseData); if (p) caseData = { ...caseData, ...p }; return true; },
  getTemplate: async () => TEMPLATE,
  labName: id => (id === 'ref-1' ? 'Ref Lab' : id),
  getReferenceLabs: async () => [{ id: 'ref-1', name: 'Ref Lab' }, { id: 'ref-2', name: 'Other Lab' }],
  logAudit: async e => { audits.push(e); },
  startAddendum: async input => { addenda.push(input); return 'add-1'; },
  now: () => '2026-10-06T12:00:00.000Z',
  newOrderId: () => `MO-${++n}`,
  actorName: () => 'Tech T',
});

const events = () => audits.map(a => a.event);

beforeEach(() => {
  orders = []; batches = [plate()]; tests = [EGFR]; audits = []; allowed = true; addenda = []; n = 0;
  caseData = {
    id: 'c1', status: 'in-progress', order: { assignedTo: 'p1' }, participants: [{ staffId: 'p1', staffName: 'Dr P' }],
    specimens: [{ id: 'sp1', blocks: [{ id: 'b1', stains: [{ id: 'so-1', status: 'Ordered' }] }] }],
    synopticReports: [{ instanceId: 'i1', specimenId: 'sp1', templateId: 'lung', status: 'draft', answers: {} }],
  } as unknown as Case;
});

async function queuedAndAssigned(engine = createMolecularOrderEngine(deps())) {
  await engine.ingest([request()]);
  expect((await engine.dispatchAction({ type: 'ASSIGN_TO_PLATE', orderIds: ['MO-1'], batchId: 'mb-1' })).ok).toBe(true);
  return engine;
}

async function runResult(engine: ReturnType<typeof createMolecularOrderEngine>, interpretation: string, extra: Partial<MolecularBatch> = {}) {
  await engine.onWorklistDispatched('uuid-1');
  batches = batches.map(b => ({ ...b, worklistDispatchedAt: 'x', results: [{ well_position: 'A03', specimen_uuid: 'sp1', raw_data: {}, interpretation, flag: 'NONE' }], controlsPassed: true, ...extra } as MolecularBatch));
  await engine.onRunResults('uuid-1');
}

describe('ingest', () => {
  it('queues an in-house order and audits created + queued', async () => {
    const engine = createMolecularOrderEngine(deps());
    const r = await engine.ingest([request()]);
    expect(r.created).toHaveLength(1);
    expect(orders[0]).toMatchObject({ orderId: 'MO-1', status: 'QUEUED', routing: 'IN_HOUSE', assayName: 'EGFR PCR' });
    expect(events()).toEqual(['MOLECULAR_ORDER_CREATED', 'MOLECULAR_ORDER_QUEUED']);
  });

  it('refuses in-house at a lab that does not run the test, and unknown tests', async () => {
    const engine = createMolecularOrderEngine(deps());
    const r = await engine.ingest([request({ performingLabFacilityId: 'lab-b' }), request({ assayTarget: 'nope' })]);
    expect(r.created).toHaveLength(0);
    expect(r.refused.map(x => x.refused)).toEqual(['routingNotAvailable', 'testNotFound']);
    expect(audits).toHaveLength(0);
  });

  it('keeps the send-out lab only on send-out orders', async () => {
    const engine = createMolecularOrderEngine(deps());
    await engine.ingest([request({ routing: 'SEND_OUT', sendOutLabId: 'ref-1', sendOutLabName: 'Ref Lab' })]);
    expect(orders[0]).toMatchObject({ routing: 'SEND_OUT', sendOutLabName: 'Ref Lab' });
    const view = await engine.queueView();
    expect(view.rows[0].actions).toEqual(['SET_SEND_OUT_LAB', 'CANCEL']);
    expect(view.plates).toHaveLength(0);
  });
});

describe('queue view and plate assignment', () => {
  it('offers draft plates of the queued assay with their free wells (controls excluded)', async () => {
    const engine = createMolecularOrderEngine(deps());
    await engine.ingest([request()]);
    const view = await engine.queueView();
    expect(view.rows[0].actions).toEqual(['ASSIGN_TO_PLATE', 'CANCEL']);
    expect(view.plates).toEqual([{ batchId: 'mb-1', plateBarcode: 'PLT-1', instrument: 'PCR_01', assayTarget: 'st-egfr', freeWells: 4 }]);
  });

  it('binds the order to the first free well and audits PLATE_ASSIGNED', async () => {
    await queuedAndAssigned();
    expect(orders[0]).toMatchObject({ status: 'PLATE_ASSIGNED', plate: { batchId: 'mb-1', wellPosition: 'A03' } });
    expect(batches[0].wells.find(w => w.wellPosition === 'A03')).toMatchObject({ orderId: 'MO-1', sampleType: 'PATIENT_SPECIMEN' });
    expect(events()).toContain('PLATE_ASSIGNED');
  });

  it('refuses without the capability, and leaves everything unchanged', async () => {
    const engine = createMolecularOrderEngine(deps());
    await engine.ingest([request()]);
    allowed = false;
    expect(await engine.dispatchAction({ type: 'ASSIGN_TO_PLATE', orderIds: ['MO-1'], batchId: 'mb-1' })).toEqual({ ok: false, refused: 'notPermitted' });
    expect(orders[0].status).toBe('QUEUED');
  });

  it('refuses a dispatched plate and a full plate', async () => {
    const engine = createMolecularOrderEngine(deps());
    await engine.ingest([request(), request(), request(), request(), request()]);
    expect((await engine.dispatchAction({ type: 'ASSIGN_TO_PLATE', orderIds: ['MO-1', 'MO-2', 'MO-3', 'MO-4', 'MO-5'], batchId: 'mb-1' })).refused).toBe('plateFull');
    batches = [plate({ worklistDispatchedAt: 'x' })];
    expect((await engine.dispatchAction({ type: 'ASSIGN_TO_PLATE', orderIds: ['MO-1'], batchId: 'mb-1' })).refused).toBe('plateNotDraft');
  });

  it('removes an order from its plate back to the queue', async () => {
    const engine = await queuedAndAssigned();
    expect((await engine.dispatchAction({ type: 'REMOVE_FROM_PLATE', orderId: 'MO-1' })).ok).toBe(true);
    expect(orders[0].status).toBe('QUEUED');
    expect(orders[0].plate).toBeUndefined();
    expect(batches[0].wells.some(w => w.orderId === 'MO-1')).toBe(false);
  });
});

describe('re-validation against the facility matrix (Pete)', () => {
  it('a lab that stops running the test leaves the order asking to be re-routed, not assignable', async () => {
    const engine = createMolecularOrderEngine(deps());
    await engine.ingest([request()]);
    tests = [{ ...EGFR, inHouseFacilityIds: [] } as StainType];
    const view = await engine.queueView();
    expect(view.rows[0]).toMatchObject({ needsReroute: 'reroute', actions: ['REROUTE_TO_SEND_OUT', 'CANCEL'] });
    expect(view.plates).toHaveLength(0);
    expect((await engine.dispatchAction({ type: 'ASSIGN_TO_PLATE', orderIds: ['MO-1'], batchId: 'mb-1' })).refused).toBe('routingNotAvailable');
    expect((await engine.dispatchAction({ type: 'REROUTE_TO_SEND_OUT', orderId: 'MO-1' })).ok).toBe(true);
    expect(orders[0]).toMatchObject({ routing: 'SEND_OUT', sendOutLabId: 'ref-1', sendOutLabName: 'Ref Lab', status: 'QUEUED' });
  });

  it('re-routing is refused while the test still runs in-house', async () => {
    const engine = createMolecularOrderEngine(deps());
    await engine.ingest([request()]);
    expect((await engine.dispatchAction({ type: 'REROUTE_TO_SEND_OUT', orderId: 'MO-1' })).refused).toBe('wrongStatus');
  });
});

describe('cancel', () => {
  it('cancels an assigned order, frees its well and cancels the add-on slide order', async () => {
    const engine = await queuedAndAssigned();
    expect((await engine.dispatchAction({ type: 'CANCEL', orderId: 'MO-1' })).ok).toBe(true);
    expect(orders[0]).toMatchObject({ status: 'CANCELLED', cancelledBy: 'Tech T' });
    expect(batches[0].wells.some(w => w.orderId === 'MO-1')).toBe(false);
    expect(caseData.specimens![0].blocks![0].stains[0].status).toBe('Cancelled');
    expect(events()).toContain('MOLECULAR_ORDER_CANCELLED');
  });
});

describe('dispatch and results', () => {
  it('a partial plate goes IN_RUN on dispatch (WORKLIST_DISPATCHED)', async () => {
    const engine = await queuedAndAssigned();
    await engine.onWorklistDispatched('uuid-1');
    expect(orders[0].status).toBe('IN_RUN');
    expect(events()).toContain('WORKLIST_DISPATCHED');
  });

  it('a positive result answers the empty bound question (RUN_RESULTS_RECEIVED, REPORT_FIELD_HYDRATED)', async () => {
    const engine = await queuedAndAssigned();
    await runResult(engine, 'POSITIVE');
    expect(orders[0]).toMatchObject({ status: 'RESULTED', result: { interpretation: 'POSITIVE' }, hydration: { outcome: 'hydrated', fieldId: 'egfr_status' } });
    const inst = caseData.synopticReports![0];
    expect(inst.answers.egfr_status).toBe('det');
    expect(inst.resultSources?.egfr_status).toMatchObject({ orderId: 'MO-1', call: 'POSITIVE' });
    expect(events()).toEqual(expect.arrayContaining(['RUN_RESULTS_RECEIVED', 'REPORT_FIELD_HYDRATED']));
  });

  it('all six spec audit events are emitted by the engine across one order', async () => {
    const engine = await queuedAndAssigned();
    await runResult(engine, 'NEGATIVE');
    expect(new Set(events())).toEqual(new Set(['MOLECULAR_ORDER_CREATED', 'MOLECULAR_ORDER_QUEUED', 'PLATE_ASSIGNED', 'WORKLIST_DISPATCHED', 'RUN_RESULTS_RECEIVED', 'REPORT_FIELD_HYDRATED']));
  });

  it('a different existing answer is kept; the result is recorded beside it as a delta', async () => {
    caseData.synopticReports![0].answers = { egfr_status: 'notdet' };
    const engine = await queuedAndAssigned();
    await runResult(engine, 'POSITIVE');
    expect(orders[0].hydration?.outcome).toBe('suggested');
    expect(caseData.synopticReports![0].answers.egfr_status).toBe('notdet');
    expect(caseData.synopticReports![0].resultSources?.egfr_status.call).toBe('POSITIVE');
  });

  it('a signed-out case is never changed: an addendum draft is opened instead', async () => {
    caseData = { ...caseData, status: 'finalized' } as Case;
    const engine = await queuedAndAssigned();
    await runResult(engine, 'POSITIVE');
    expect(orders[0].hydration).toMatchObject({ outcome: 'addendumQueued', addendumId: 'add-1' });
    expect(caseData.synopticReports![0].answers.egfr_status).toBeUndefined();
    expect(addenda).toEqual([expect.objectContaining({ caseId: 'c1', reportInstanceId: 'i1', pathologist: { userId: 'p1', userName: 'Dr P' } })]);
    expect(events()).toContain('MOLECULAR_RESULT_ADDENDUM_QUEUED');
    expect(events()).not.toContain('REPORT_FIELD_HYDRATED');
  });

  it('failed controls, indeterminate calls and repeat flags change nothing in the report', async () => {
    const engine = await queuedAndAssigned();
    await runResult(engine, 'POSITIVE', { controlsPassed: false });
    expect(orders[0]).toMatchObject({ status: 'RESULTED', hydration: { outcome: 'notReportable' } });
    expect(caseData.synopticReports![0].answers.egfr_status).toBeUndefined();
  });
});

describe('Batch 467 review fixes', () => {
  it('a result naming another specimen is never applied; the order stays running', async () => {
    const engine = await queuedAndAssigned();
    await engine.onWorklistDispatched('uuid-1');
    batches = batches.map(b => ({ ...b, results: [{ well_position: 'A03', specimen_uuid: 'other-sp', accession_number: 'S26-9', raw_data: {}, interpretation: 'POSITIVE', flag: 'NONE' }], controlsPassed: true } as MolecularBatch));
    await engine.onRunResults('uuid-1');
    expect(orders[0]).toMatchObject({ status: 'IN_RUN', hydration: { outcome: 'resultMismatch' } });
    expect(caseData.synopticReports![0].answers.egfr_status).toBeUndefined();
    expect(events()).toContain('MOLECULAR_RESULT_MISMATCH');
    expect(events()).not.toContain('RUN_RESULTS_RECEIVED');
  });

  it('a well that no longer holds the order is a mismatch, even at the same position', async () => {
    const engine = await queuedAndAssigned();
    batches = batches.map(b => ({ ...b, wells: b.wells.map(w => (w.orderId ? { ...w, orderId: undefined } : w)) }));
    await runResult(engine, 'POSITIVE');
    expect(orders[0].hydration?.outcome).toBe('resultMismatch');
  });

  it('an answer typed while the run was processing is kept (decided inside the write)', async () => {
    const engine = await queuedAndAssigned();
    const d = deps();
    const typing = createMolecularOrderEngine({
      ...d,
      // The engine read the case before the pathologist answered; the write sees their answer.
      getCase: async () => ({ ...caseData, synopticReports: [{ ...caseData.synopticReports![0], answers: {} }] } as Case),
    });
    caseData.synopticReports![0].answers = { egfr_status: 'notdet' };
    void engine;
    await runResult(typing, 'POSITIVE');
    expect(caseData.synopticReports![0].answers.egfr_status).toBe('notdet');
    expect(orders[0].hydration?.outcome).toBe('suggested');
  });

  it('a report signed while the run was processing is not touched', async () => {
    const engine = await queuedAndAssigned();
    const d = deps();
    const signing = createMolecularOrderEngine({ ...d, getCase: async () => caseData, changeCase: async (_id, change) => change({ ...caseData, status: 'finalized' } as Case) !== null });
    void engine;
    await runResult(signing, 'POSITIVE');
    expect(orders[0].hydration?.outcome).toBe('addendumQueued');
    expect(caseData.synopticReports![0].answers.egfr_status).toBeUndefined();
  });

  it('a signed-out case with no assigned pathologist says no addendum was opened', async () => {
    caseData = { ...caseData, status: 'finalized', order: {} } as unknown as Case;
    const engine = await queuedAndAssigned();
    await runResult(engine, 'POSITIVE');
    expect(orders[0].hydration?.outcome).toBe('addendumNotOpened');
    expect(addenda).toHaveLength(0);
  });

  it('a low-signal call is not reportable', async () => {
    const engine = await queuedAndAssigned();
    await engine.onWorklistDispatched('uuid-1');
    batches = batches.map(b => ({ ...b, results: [{ well_position: 'A03', specimen_uuid: 'sp1', raw_data: {}, interpretation: 'POSITIVE', flag: 'LOW_SIGNAL' }], controlsPassed: true } as MolecularBatch));
    await engine.onRunResults('uuid-1');
    expect(orders[0].hydration?.outcome).toBe('notReportable');
  });

  it('the same answer records where it came from', async () => {
    caseData.synopticReports![0].answers = { egfr_status: 'det' };
    const engine = await queuedAndAssigned();
    await runResult(engine, 'POSITIVE');
    expect(orders[0].hydration?.outcome).toBe('hydrated');
    expect(caseData.synopticReports![0].resultSources?.egfr_status.orderId).toBe('MO-1');
  });

  it('one order failing leaves it running and throws after the others are saved', async () => {
    await createMolecularOrderEngine(deps()).ingest([request(), request({ caseId: 'c2', specimenId: 'sp2' })]);
    const d = deps();
    const engine = createMolecularOrderEngine({ ...d, getCase: async id => { if (id === 'c2') throw new Error('db down'); return caseData; } });
    await engine.dispatchAction({ type: 'ASSIGN_TO_PLATE', orderIds: ['MO-1', 'MO-2'], batchId: 'mb-1' });
    await engine.onWorklistDispatched('uuid-1');
    batches = batches.map(b => ({ ...b, results: [
      { well_position: 'A03', specimen_uuid: 'sp1', raw_data: {}, interpretation: 'POSITIVE', flag: 'NONE' },
      { well_position: 'B01', specimen_uuid: 'sp2', raw_data: {}, interpretation: 'POSITIVE', flag: 'NONE' },
    ], controlsPassed: true } as MolecularBatch));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(engine.onRunResults('uuid-1')).rejects.toThrow();
    spy.mockRestore();
    expect(orders.map(o => o.status)).toEqual(['RESULTED', 'IN_RUN']);
  });

  it('saves merge into the orders as they are now (an order placed meanwhile is kept)', async () => {
    let placed = false;
    const engine = createMolecularOrderEngine({ ...deps(), getBatches: async () => { if (!placed && orders.length) { placed = true; orders = [...orders, { ...orders[0], orderId: 'MO-OTHER' }]; } return batches; } });
    await engine.ingest([request()]);
    await engine.dispatchAction({ type: 'ASSIGN_TO_PLATE', orderIds: ['MO-1'], batchId: 'mb-1' });
    expect(orders.map(o => o.orderId)).toEqual(['MO-1', 'MO-OTHER']);
    expect(orders[0].status).toBe('PLATE_ASSIGNED');
  });

  it('duplicate ids bind one order to one well', async () => {
    const engine = createMolecularOrderEngine(deps());
    await engine.ingest([request()]);
    await engine.dispatchAction({ type: 'ASSIGN_TO_PLATE', orderIds: ['MO-1', 'MO-1'], batchId: 'mb-1' });
    expect(batches[0].wells.filter(w => w.orderId === 'MO-1')).toHaveLength(1);
  });

  it('running and resulted orders can\'t be cancelled or removed', async () => {
    const engine = await queuedAndAssigned();
    await engine.onWorklistDispatched('uuid-1');
    expect((await engine.dispatchAction({ type: 'CANCEL', orderId: 'MO-1' })).refused).toBe('wrongStatus');
    expect((await engine.dispatchAction({ type: 'REMOVE_FROM_PLATE', orderId: 'MO-1' })).refused).toBe('wrongStatus');
  });

  it('an order on a plate whose test was dropped asks to be taken off first', async () => {
    const engine = await queuedAndAssigned();
    tests = [{ ...EGFR, inHouseFacilityIds: [] } as StainType];
    const view = await engine.queueView();
    expect(view.rows[0]).toMatchObject({ needsReroute: 'removeFirst', actions: ['REMOVE_FROM_PLATE', 'CANCEL'] });
  });

  it('re-routing moves the add-on slide order to the send-out queue with its lab', async () => {
    const engine = createMolecularOrderEngine(deps());
    await engine.ingest([request()]);
    tests = [{ ...EGFR, inHouseFacilityIds: [] } as StainType];
    await engine.dispatchAction({ type: 'REROUTE_TO_SEND_OUT', orderId: 'MO-1' });
    expect(caseData.specimens![0].blocks![0].stains[0]).toMatchObject({ routedQueueLabel: 'Reference/Send-Out Lab Queue', sendOutReferenceLabFacilityId: 'ref-1', sendOutReferenceLabName: 'Ref Lab' });
  });

  it('a retired test is no longer run in-house', async () => {
    const engine = createMolecularOrderEngine(deps());
    await engine.ingest([request()]);
    tests = [{ ...EGFR, active: false } as StainType];
    expect((await engine.queueView()).rows[0].needsReroute).toBe('reroute');
  });
});

describe('Batch 467b: send-out orders', () => {
  const sendOut = (over: Partial<MolecularOrderIngest> = {}) => request({ routing: 'SEND_OUT', sendOutLabId: 'ref-1', sendOutLabName: 'Ref Lab', ...over });

  it('a referral batch to the order\'s lab takes it to the reference lab (IN_RUN, "at the reference lab")', async () => {
    const engine = createMolecularOrderEngine(deps());
    await engine.ingest([sendOut(), sendOut({ accession: 'S26-OTHER' })]);
    const sent = await engine.onReferralDispatched({ batchId: 'rb-1', labId: 'ref-1', testRequested: 'EGFR PCR', items: [{ caseAccession: 'S26-1', specimenLabel: 'A' }] });
    expect(sent).toEqual([{ orderId: 'MO-1', caseAccession: 'S26-1', assayCode: 'st-egfr' }]);
    expect(orders.map(o => o.status)).toEqual(['IN_RUN', 'QUEUED']);
    expect(orders[0].referral).toMatchObject({ batchId: 'rb-1', labId: 'ref-1' });
    expect((await engine.queueView()).rows.find(r => r.orderId === 'MO-1')).toMatchObject({ statusLabel: 'SENT_OUT', referralBatchId: 'rb-1', actions: [] });
    expect(events()).toContain('WORKLIST_DISPATCHED');
  });

  it('a referral batch to another lab, or another specimen, leaves the order queued', async () => {
    const engine = createMolecularOrderEngine(deps());
    await engine.ingest([sendOut()]);
    expect(await engine.onReferralDispatched({ batchId: 'rb-1', labId: 'ref-2', testRequested: 'EGFR PCR', items: [{ caseAccession: 'S26-1' }] })).toEqual([]);
    expect(await engine.onReferralDispatched({ batchId: 'rb-1', labId: 'ref-1', testRequested: 'EGFR PCR', items: [{ caseAccession: 'S26-1', specimenLabel: 'B' }] })).toEqual([]);
    expect(orders[0].status).toBe('QUEUED');
  });

  it('the reference lab\'s coded result, by order id, fills the synoptic', async () => {
    const engine = createMolecularOrderEngine(deps());
    await engine.ingest([sendOut()]);
    await engine.onReferralDispatched({ batchId: 'rb-1', labId: 'ref-1', testRequested: 'EGFR PCR', items: [{ caseAccession: 'S26-1' }] });
    await engine.onSendOutResults({ batchId: 'rb-1', results: [{ orderId: 'MO-1', caseAccession: 'S26-1', assayCode: 'st-egfr', interpretation: 'POSITIVE' }] });
    expect(orders[0]).toMatchObject({ status: 'RESULTED', result: { interpretation: 'POSITIVE', referralBatchId: 'rb-1' }, hydration: { outcome: 'hydrated' } });
    expect(caseData.synopticReports![0].answers.egfr_status).toBe('det');
    expect(events()).toEqual(expect.arrayContaining(['RUN_RESULTS_RECEIVED', 'REPORT_FIELD_HYDRATED']));
  });

  it('without an order id, the accession and test identify the order — only when exactly one fits', async () => {
    const engine = createMolecularOrderEngine(deps());
    await engine.ingest([sendOut(), sendOut()]);
    await engine.onReferralDispatched({ batchId: 'rb-1', labId: 'ref-1', testRequested: 'EGFR PCR', items: [{ caseAccession: 'S26-1' }] });
    await engine.onSendOutResults({ batchId: 'rb-1', results: [{ caseAccession: 'S26-1', assayCode: 'st-egfr', interpretation: 'NEGATIVE' }] });
    expect(orders.map(o => o.status)).toEqual(['IN_RUN', 'IN_RUN']); // ambiguous: not applied
  });

  it('a result naming an order from another referral batch, or another accession, is never applied', async () => {
    const engine = createMolecularOrderEngine(deps());
    await engine.ingest([sendOut()]);
    await engine.onReferralDispatched({ batchId: 'rb-1', labId: 'ref-1', testRequested: 'EGFR PCR', items: [{ caseAccession: 'S26-1' }] });
    await engine.onSendOutResults({ batchId: 'rb-9', results: [{ orderId: 'MO-1', caseAccession: 'S26-1', interpretation: 'POSITIVE' }] });
    expect(orders[0]).toMatchObject({ status: 'IN_RUN' });
    expect(orders[0].hydration).toBeUndefined(); // the order is fine; the message named the wrong batch (audited)
    expect(events()).toContain('MOLECULAR_RESULT_MISMATCH');
    await engine.onSendOutResults({ batchId: 'rb-1', results: [{ orderId: 'MO-1', caseAccession: 'S26-9', interpretation: 'POSITIVE' }] });
    expect(orders[0]).toMatchObject({ status: 'IN_RUN', hydration: { outcome: 'resultMismatch' } });
    expect(caseData.synopticReports![0].answers.egfr_status).toBeUndefined();
    expect(events()).toContain('MOLECULAR_RESULT_MISMATCH');
  });

  it('only an order whose lab is chosen and whose test the batch names is carried', async () => {
    const engine = createMolecularOrderEngine(deps());
    tests = [EGFR, { ...EGFR, id: 'st-kras', name: 'KRAS PCR' } as StainType];
    await engine.ingest([sendOut(), sendOut({ assayTarget: 'st-kras' }), request({ routing: 'SEND_OUT' })]);
    const sent = await engine.onReferralDispatched({ batchId: 'rb-1', labId: 'ref-1', testRequested: ' egfr pcr ', items: [{ caseAccession: 'S26-1' }] });
    expect(sent.map(x => x.orderId)).toEqual(['MO-1']); // not the KRAS order, nor the EGFR order with no lab chosen
    expect(orders.map(o => o.status)).toEqual(['IN_RUN', 'QUEUED', 'QUEUED']);
    expect(await engine.onReferralDispatched({ batchId: 'rb-2', labId: 'ref-1', items: [{ caseAccession: 'S26-1' }] })).toEqual([]); // no test named
  });

  it('a redelivered result changes nothing; a coded result after a report-only one replaces it', async () => {
    const engine = createMolecularOrderEngine(deps());
    await engine.ingest([sendOut()]);
    await engine.onReferralDispatched({ batchId: 'rb-1', labId: 'ref-1', testRequested: 'EGFR PCR', items: [{ caseAccession: 'S26-1' }] });
    await engine.onSendOutResults({ batchId: 'rb-1', reportOnly: true });
    expect(orders[0].hydration?.outcome).toBe('reportOnly');
    await engine.onSendOutResults({ batchId: 'rb-1', results: [{ orderId: 'MO-1', caseAccession: 'S26-1', interpretation: 'NEGATIVE' }] });
    expect(orders[0]).toMatchObject({ status: 'RESULTED', result: { interpretation: 'NEGATIVE' }, hydration: { outcome: 'hydrated' } });
    const n = audits.length;
    await engine.onSendOutResults({ batchId: 'rb-1', results: [{ orderId: 'MO-1', caseAccession: 'S26-1', interpretation: 'POSITIVE' }] });
    expect(orders[0].result?.interpretation).toBe('NEGATIVE');
    expect(audits).toHaveLength(n);
  });

  it('choosing a lab is refused once the order is at the reference lab; it takes its own capability', async () => {
    const engine = createMolecularOrderEngine(deps());
    const seen: string[] = [];
    const watching = createMolecularOrderEngine({ ...deps(), enforce: async c => { seen.push(c); return { allowed: true }; } });
    await engine.ingest([sendOut()]);
    await watching.dispatchAction({ type: 'SET_SEND_OUT_LAB', orderId: 'MO-1', labId: 'ref-1' });
    expect(seen).toEqual(['molecular:order:set-lab']);
    expect(events()).toContain('MOLECULAR_ORDER_LAB_SET');
    await engine.onReferralDispatched({ batchId: 'rb-1', labId: 'ref-1', testRequested: 'EGFR PCR', items: [{ caseAccession: 'S26-1' }] });
    expect((await engine.dispatchAction({ type: 'SET_SEND_OUT_LAB', orderId: 'MO-1', labId: 'ref-1' })).refused).toBe('wrongStatus');
  });

  it('a change decided on an older copy never overwrites what happened meanwhile', async () => {
    const engine = createMolecularOrderEngine(deps());
    await engine.ingest([sendOut()]);
    // The order is sent while the lab choice is being checked.
    const racing = createMolecularOrderEngine({ ...deps(), getReferenceLabs: async () => { await engine.onReferralDispatched({ batchId: 'rb-1', labId: 'ref-1', testRequested: 'EGFR PCR', items: [{ caseAccession: 'S26-1' }] }); return [{ id: 'ref-1', name: 'Ref Lab' }]; } });
    expect((await racing.dispatchAction({ type: 'SET_SEND_OUT_LAB', orderId: 'MO-1', labId: 'ref-1' })).refused).toBe('wrongStatus');
    expect(orders[0]).toMatchObject({ status: 'IN_RUN', referral: { batchId: 'rb-1' } });
  });

  it('the queue says where each result will come from', async () => {
    const engine = await queuedAndAssigned();
    await engine.ingest([sendOut()]);
    const rows = (await engine.queueView()).rows;
    expect(rows.find(r => r.orderId === 'MO-1')?.awaitingResultFrom).toBe('instrument');
    expect(rows.find(r => r.orderId === 'MO-2')?.awaitingResultFrom).toBe('referenceLab');
  });

  it('a report with no coded result leaves the answer to be entered from it', async () => {
    const engine = createMolecularOrderEngine(deps());
    await engine.ingest([sendOut()]);
    await engine.onReferralDispatched({ batchId: 'rb-1', labId: 'ref-1', testRequested: 'EGFR PCR', items: [{ caseAccession: 'S26-1' }] });
    await engine.onSendOutResults({ batchId: 'rb-1', reportOnly: true });
    expect(orders[0]).toMatchObject({ status: 'RESULTED', hydration: { outcome: 'reportOnly' } });
    expect(caseData.synopticReports![0].answers.egfr_status).toBeUndefined();
  });

  it('a queued send-out order without a lab asks for one; choosing it is checked against the test\'s labs', async () => {
    const engine = createMolecularOrderEngine(deps());
    await engine.ingest([request({ routing: 'SEND_OUT' })]);
    const row = (await engine.queueView()).rows[0];
    expect(row).toMatchObject({ needsLab: true, labChoices: [{ id: 'ref-1', name: 'Ref Lab' }] }); // the test's approved labs only
    expect((await engine.dispatchAction({ type: 'SET_SEND_OUT_LAB', orderId: 'MO-1', labId: 'ref-2' })).refused).toBe('labNotAllowed');
    expect((await engine.dispatchAction({ type: 'SET_SEND_OUT_LAB', orderId: 'MO-1', labId: 'ref-1' })).ok).toBe(true);
    expect(orders[0]).toMatchObject({ sendOutLabId: 'ref-1', sendOutLabName: 'Ref Lab' });
    expect(caseData.specimens![0].blocks![0].stains[0]).toMatchObject({ sendOutReferenceLabFacilityId: 'ref-1', sendOutReferenceLabName: 'Ref Lab' });
    expect((await engine.queueView()).rows[0].needsLab).toBeUndefined();
  });

  it('a test with no approved labs may go to any active reference lab; choosing needs the cancel capability', async () => {
    tests = [{ ...EGFR, referenceLabFacilityIds: [], defaultReferenceLabFacilityId: undefined } as unknown as StainType];
    const engine = createMolecularOrderEngine(deps());
    await engine.ingest([request({ routing: 'SEND_OUT' })]);
    expect((await engine.queueView()).rows[0].labChoices).toHaveLength(2);
    allowed = false;
    expect((await engine.dispatchAction({ type: 'SET_SEND_OUT_LAB', orderId: 'MO-1', labId: 'ref-2' })).refused).toBe('notPermitted');
  });

  it('a re-routed order with no default lab gets one chosen afterwards', async () => {
    tests = [{ ...EGFR, inHouseFacilityIds: ['lab-a'], referenceLabFacilityIds: [], defaultReferenceLabFacilityId: undefined } as unknown as StainType];
    const engine = createMolecularOrderEngine(deps());
    await engine.ingest([request()]);
    tests = [{ ...tests[0], inHouseFacilityIds: [] } as StainType];
    await engine.dispatchAction({ type: 'REROUTE_TO_SEND_OUT', orderId: 'MO-1' });
    expect((await engine.queueView()).rows[0]).toMatchObject({ routing: 'SEND_OUT', needsLab: true });
    expect((await engine.dispatchAction({ type: 'SET_SEND_OUT_LAB', orderId: 'MO-1', labId: 'ref-2' })).ok).toBe(true);
  });
});

describe('Batch 669 (mol-9): Clone & Supersede keeps the orders on a plate that can still be dispatched', () => {
  const clone = (over: Partial<MolecularBatch> = {}): MolecularBatch => plate({
    id: 'mb-2', batchUuid: 'uuid-2', plateBarcode: 'PLT-2', clonedFromBatchId: 'mb-1',
    wells: [...plate().wells, { wellPosition: 'A03', sampleType: 'PATIENT_SPECIMEN', orderId: 'MO-1', accessionNumber: 'S26-1', specimenUuid: 'sp1' }],
    ...over,
  });

  it('an order waiting on the superseded plate is pointed at the clone, in the same well', async () => {
    const engine = await queuedAndAssigned();
    const wellBefore = orders[0].plate!.wellPosition;
    const moved = await engine.onPlateSuperseded('uuid-1', clone({ wells: [...plate().wells, { wellPosition: wellBefore, sampleType: 'PATIENT_SPECIMEN', orderId: 'MO-1' }] }));
    expect(moved).toBe(1);
    expect(orders[0]).toMatchObject({ status: 'PLATE_ASSIGNED', plate: { batchId: 'mb-2', batchUuid: 'uuid-2', plateBarcode: 'PLT-2', wellPosition: wellBefore } });
    expect(audits[audits.length - 1]).toMatchObject({ event: 'PLATE_ASSIGNED' });
    expect(audits[audits.length - 1]!.detail).toContain('PLT-2');
  });

  it('an order the clone does not hold (cleared, or already running) stays where it is', async () => {
    const engine = await queuedAndAssigned();
    expect(await engine.onPlateSuperseded('uuid-1', clone({ wells: plate().wells }))).toBe(0);
    expect(orders[0].plate!.batchUuid).toBe('uuid-1');
    await engine.onWorklistDispatched('uuid-1');
    expect(await engine.onPlateSuperseded('uuid-1', clone())).toBe(0);
    expect(orders[0]).toMatchObject({ status: 'IN_RUN', plate: { batchUuid: 'uuid-1' } });
  });

  it('Take off plate works for an order still pointing at a superseded plate (it used to be refused, leaving only Cancel)', async () => {
    const engine = await queuedAndAssigned();
    batches = batches.map(b => ({ ...b, status: 'superseded' as const }));
    const r = await engine.dispatchAction({ type: 'REMOVE_FROM_PLATE', orderId: 'MO-1' });
    expect(r.ok).toBe(true);
    expect(orders[0].status).toBe('QUEUED');
    expect(orders[0].plate).toBeUndefined();
  });
});
