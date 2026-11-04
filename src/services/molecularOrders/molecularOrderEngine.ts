// src/services/molecularOrders/molecularOrderEngine.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 467 (Pete's spec "In-House Molecular Order Queue & Plate Binding
// Engine", v1.1.0, engine-driven): every state change of an in-house molecular
// order happens here. The screens render `queueView()` and send
// `dispatchAction()`; they never compute a status or validate a binding.
//
//   ingest (spec /api/v1/molecular/orders/ingest)
//     an add-on molecular order → MolecularOrder, routing checked against the
//     test and the performing lab → QUEUED. Audit MOLECULAR_ORDER_CREATED and
//     MOLECULAR_ORDER_QUEUED.
//   queueView (spec GET /api/v1/molecular/queue)
//     rows with the actions each offers, and the draft plates in-house orders
//     can go on.
//   dispatchAction (spec POST /api/v1/molecular/orders/action)
//     ASSIGN_TO_PLATE (binds queued in-house orders to a draft plate's free
//     wells, molecularPlateOrchestrator) → PLATE_ASSIGNED, audit
//     PLATE_ASSIGNED; REMOVE_FROM_PLATE → QUEUED; CANCEL → CANCELLED (its
//     add-on slide order too); REROUTE_TO_SEND_OUT (Pete: a lab that stops
//     running a test in-house leaves its queued orders asking to be re-routed,
//     never breaking plate assembly) → SEND_OUT with the test's default lab.
//   Every assignment re-checks the test still runs in-house at the order's lab
//   (the facility/assay matrix at the time, not at ordering); an order already
//   on a plate whose test is dropped is flagged and offers Remove / Cancel.
//   onWorklistDispatched — the plate's worklist went to the instrument:
//     its orders → IN_RUN, audit WORKLIST_DISPATCHED.
//   onRunResults — the run's results arrived: each order's well (the well that
//     holds the order, and whose result names the order's accession and
//     specimen — a mismatch is never applied) → RESULTED, audit
//     RUN_RESULTS_RECEIVED; a reportable call (controls passed,
//     POSITIVE/NEGATIVE, no flag) fills the case's bound synoptic
//     question (templates/molecularResultBinding.ts), audit
//     REPORT_FIELD_HYDRATED. A signed-out report is never changed (Pete: no
//     retrospective change to a locked report): an addendum draft is opened
//     for the case's pathologist instead, and the order says so. The fill is
//     decided inside the case write, against the answers as they are then, so
//     an answer typed while the run was processing is never overwritten.
//   Saves merge by order id into the orders as they are at save time, so an
//   order placed meanwhile (another tab) is never lost.
//
// Capabilities (checked here): molecular:order:assign-plate (assign, remove),
// molecular:order:cancel. Ingest is part of placing the add-on order
// (add-on:order:place, checked there); the dispatch and results hooks are the
// system's own.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case, SynopticReportInstance } from '@/types/case/Case';
import type { StainOrder } from '@/types/case/Specimen';
import type { StainType } from '../stains/IStainService';
import type { MolecularBatch } from '../molecular/IMolecularBatchService';
import type { MolecularAssayControlRule } from '../molecular/IMolecularAssayControlRuleService';
import type { NewAuditLog } from '../auditlog/IAuditService';
import type { MolecularWellResult } from '@/types/events/MolecularRunResultsPayload';
import { resolveMolecularRouting } from './molecularRouting';
import { bindOrdersToPlate, freeSampleWells, unbindOrderFromPlate } from './molecularPlateOrchestrator';
import { boundFieldFor, decideHydration } from '../templates/molecularResultBinding';
import { resolveSendOutLabChoices } from '@/utils/addOnOrderOperations';
import type {
  HydrationOutcome, MolecularOrder, MolecularOrderAction, MolecularOrderActionResult, MolecularOrderActionType,
  MolecularOrderAuditEvent, MolecularOrderIngest, MolecularOrderRefusal, MolecularQueueRow, MolecularQueueView,
  ReferralDispatchInput, SendOutResultInput,
} from './molecularOrderTypes';

export const MOLECULAR_ORDER_ASSIGN_CAPABILITY = 'molecular:order:assign-plate';
export const MOLECULAR_ORDER_CANCEL_CAPABILITY = 'molecular:order:cancel';

type TemplateLike = { sections: { fields: { id: string; type: string; options?: { id: string }[] }[] }[] };

export interface MolecularOrderEngineDeps {
  loadOrders: () => MolecularOrder[];
  saveOrders: (orders: MolecularOrder[]) => void;
  enforce: (capability: string, context?: Record<string, unknown>) => Promise<{ allowed: boolean }>;
  getStainTypes: () => Promise<StainType[]>;
  getBatches: () => Promise<MolecularBatch[]>;
  updateBatchWells: (batchUuid: string, wells: MolecularBatch['wells']) => Promise<boolean>;
  getControlRules: () => Promise<MolecularAssayControlRule[]>;
  getCase: (caseId: string) => Promise<Case | null | undefined>;
  /** Writes a change to the case (retrying on a version conflict); false when the change was dropped. */
  changeCase: (caseId: string, change: (current: Case) => Partial<Case> | null) => Promise<boolean>;
  getTemplate: (templateId: string) => Promise<TemplateLike | null>;
  /** A reference lab's name, for the re-routed order. */
  labName: (facilityId: string) => string;
  /** Batch 467b: the active reference labs, for choosing a send-out order's lab. */
  getReferenceLabs: () => Promise<{ id: string; name: string }[]>;
  logAudit: (entry: NewAuditLog) => Promise<unknown>;
  /** Opens an addendum draft on a signed-out case; its id, or undefined when it couldn't. */
  startAddendum: (input: { caseId: string; reportInstanceId?: string; specimenId?: string; pathologist: { userId: string; userName: string } }) => Promise<string | undefined>;
  now: () => string;
  newOrderId: () => string;
  actorName: () => string;
}

const SIGNED_CASE_STATUSES = new Set(['finalized', 'closed', 'finalizing', 'pending-countersign', 'pending-release']);
/** Reportable: controls passed, a positive or negative call, and no flag (a low signal, inhibition or repeat isn't). */
const isReportable = (r: Pick<MolecularWellResult, 'interpretation' | 'flag'>, controlsPassed: boolean) =>
  controlsPassed && (r.interpretation === 'POSITIVE' || r.interpretation === 'NEGATIVE') && r.flag === 'NONE';
/** The case or this synoptic is signed out (or on its way): the report is never changed. */
const isLocked = (c: Pick<Case, 'status'>, inst: Pick<SynopticReportInstance, 'status'>) => SIGNED_CASE_STATUSES.has(c.status as string) || inst.status !== 'draft';

type HydrationResult = { outcome: HydrationOutcome; instanceId?: string; fieldId?: string; addendumId?: string };

/** The case change for one add-on slide order (null: not on the case, or unchanged). */
function withStainOrder(current: Case, stainOrderId: string, change: (st: StainOrder) => StainOrder): Partial<Case> | null {
  let touched = false;
  const specimens = (current.specimens ?? []).map(sp => ({
    ...sp,
    blocks: (sp.blocks ?? []).map(b => ({
      ...b,
      stains: (b.stains ?? []).map(st => {
        if (st.id !== stainOrderId) return st;
        const next = change(st);
        if (next !== st) touched = true;
        return next;
      }),
    })),
  }));
  return touched ? { specimens } : null;
}

export function createMolecularOrderEngine(deps: MolecularOrderEngineDeps) {
  const audit = (event: MolecularOrderAuditEvent, order: Pick<MolecularOrder, 'accession'>, detail: string, user = deps.actorName()) =>
    deps.logAudit({ type: event === 'RUN_RESULTS_RECEIVED' || event === 'REPORT_FIELD_HYDRATED' || event === 'WORKLIST_DISPATCHED' ? 'system' : 'user', event, detail, user, caseId: order.accession, confidence: null });
  /** Writes these orders (changed or new) into the orders as they are now, by id — never a stale whole list. */
  const commit = (changed: readonly MolecularOrder[]) => {
    const fresh = deps.loadOrders();
    const ids = new Set(fresh.map(o => o.orderId));
    deps.saveOrders([...fresh.map(o => changed.find(c => c.orderId === o.orderId) ?? o), ...changed.filter(c => !ids.has(c.orderId))]);
  };

  /** Changes orders as they are NOW (re-read at save time), only if each is still in a status this change expects:
   *  a change decided on an older copy never overwrites what happened meanwhile (another tab, a referral dispatch).
   *  False: something moved on; nothing is saved. */
  const update = (changes: readonly { orderId: string; expect: readonly MolecularOrder['status'][]; change: (fresh: MolecularOrder) => MolecularOrder }[]): boolean => {
    const fresh = deps.loadOrders();
    const next = new Map<string, MolecularOrder>();
    for (const c of changes) {
      const cur = fresh.find(o => o.orderId === c.orderId);
      if (!cur || !c.expect.includes(cur.status)) return false;
      next.set(c.orderId, c.change(cur));
    }
    deps.saveOrders(fresh.map(o => next.get(o.orderId) ?? o));
    return true;
  };

  /** Whether the order's lab still runs its test in-house (the matrix now, not at ordering). */
  const stillInHouse = (o: MolecularOrder, tests: readonly StainType[]) => {
    const test = tests.find(t => t.id === o.assayTarget);
    return !!test && test.active !== false && resolveMolecularRouting(test, o.performingLabFacilityId, 'IN_HOUSE') === 'IN_HOUSE';
  };
  /** An in-house order not yet running whose lab no longer runs the test in-house (or the test is retired). */
  const needsReroute = (o: MolecularOrder, tests: readonly StainType[]) =>
    (o.status === 'QUEUED' || o.status === 'PLATE_ASSIGNED') && o.routing === 'IN_HOUSE' && !stillInHouse(o, tests);

  /** The actions a row offers now. */
  function actionsFor(o: MolecularOrder, tests: readonly StainType[]): MolecularOrderActionType[] {
    // Queued: send it out instead, or cancel. On a plate: take it off (then re-route) or cancel.
    if (needsReroute(o, tests)) return o.status === 'QUEUED' ? ['REROUTE_TO_SEND_OUT', 'CANCEL'] : ['REMOVE_FROM_PLATE', 'CANCEL'];
    // Batch 467b: a queued send-out order can have its reference lab chosen or changed until it is sent.
    if (o.status === 'QUEUED') return o.routing === 'IN_HOUSE' ? ['ASSIGN_TO_PLATE', 'CANCEL'] : ['SET_SEND_OUT_LAB', 'CANCEL'];
    if (o.status === 'PLATE_ASSIGNED') return ['REMOVE_FROM_PLATE', 'CANCEL'];
    return [];
  }

  async function queueView(): Promise<MolecularQueueView> {
    const [orders, batches, rules, tests, labs] = [deps.loadOrders(), await deps.getBatches(), await deps.getControlRules(), await deps.getStainTypes(), await deps.getReferenceLabs()];
    const labChoicesFor = (o: MolecularOrder) => {
      const test = tests.find(t => t.id === o.assayTarget);
      return test ? resolveSendOutLabChoices(test, labs).choices.map(l => ({ id: l.id, name: l.name })) : [];
    };
    const rows: MolecularQueueRow[] = [...orders].sort((a, b) => b.orderedAt.localeCompare(a.orderedAt)).map(o => ({
      orderId: o.orderId, caseId: o.caseId, accession: o.accession, specimenBlock: `${o.specimenLabel}${o.blockLabel}`,
      assayTarget: o.assayTarget, assayName: o.assayName, routing: o.routing, sendOutLabName: o.sendOutLabName,
      status: o.status, statusLabel: o.status === 'IN_RUN' && o.routing === 'SEND_OUT' ? 'SENT_OUT' as const : o.status,
      orderedByName: o.orderedByName, orderedAt: o.orderedAt,
      plateBarcode: o.plate?.plateBarcode, wellPosition: o.plate?.wellPosition, plateBatchId: o.plate?.batchId,
      interpretation: o.result?.interpretation, hydration: o.hydration?.outcome, actions: actionsFor(o, tests),
      ...(needsReroute(o, tests) ? { needsReroute: o.status === 'QUEUED' ? 'reroute' as const : 'removeFirst' as const } : {}),
      ...(o.routing === 'SEND_OUT' && o.status === 'QUEUED' ? { labChoices: labChoicesFor(o), sendOutLabId: o.sendOutLabId, ...(o.sendOutLabId ? {} : { needsLab: true }) } : {}),
      ...(o.referral ? { referralBatchId: o.referral.batchId } : {}),
      ...(o.routing === 'IN_HOUSE' && (o.status === 'PLATE_ASSIGNED' || o.status === 'IN_RUN') ? { awaitingResultFrom: 'instrument' as const } : {}),
      ...(o.routing === 'SEND_OUT' && (o.status === 'QUEUED' || o.status === 'IN_RUN') ? { awaitingResultFrom: 'referenceLab' as const } : {}),
    }));
    const assays = new Set(orders.filter(o => o.routing === 'IN_HOUSE' && o.status === 'QUEUED' && !needsReroute(o, tests)).map(o => o.assayTarget));
    const plates = batches.filter(b => b.status === 'draft' && !b.worklistDispatchedAt && assays.has(b.assayCode))
      .map(b => ({ batchId: b.id, plateBarcode: b.plateBarcode, instrument: b.targetInstrumentId, assayTarget: b.assayCode, freeWells: freeSampleWells(b, rules).length }))
      .filter(p => p.freeWells > 0);
    return { rows, plates };
  }

  /** Spec ingestion: one order per add-on molecular line. Refused lines are returned with why. */
  async function ingest(requests: MolecularOrderIngest[]): Promise<{ created: MolecularOrder[]; refused: { request: MolecularOrderIngest; refused: MolecularOrderRefusal }[] }> {
    const stainTypes = await deps.getStainTypes();
    const created: MolecularOrder[] = [];
    const refused: { request: MolecularOrderIngest; refused: MolecularOrderRefusal }[] = [];
    for (const r of requests) {
      const test = stainTypes.find(s => s.id === r.assayTarget && s.category === 'Molecular');
      if (!test) { refused.push({ request: r, refused: 'testNotFound' }); continue; }
      const routing = resolveMolecularRouting(test, r.performingLabFacilityId, r.routing);
      if (!routing) { refused.push({ request: r, refused: 'routingNotAvailable' }); continue; }
      const now = deps.now();
      created.push({
        orderId: deps.newOrderId(), caseId: r.caseId, accession: r.accession, specimenId: r.specimenId, specimenLabel: r.specimenLabel,
        blockId: r.blockId, blockLabel: r.blockLabel, assayTarget: test.id, assayName: test.name, routing,
        ...(routing === 'SEND_OUT' ? { sendOutLabId: r.sendOutLabId, sendOutLabName: r.sendOutLabName } : {}),
        performingLabFacilityId: r.performingLabFacilityId, stainOrderId: r.stainOrderId,
        orderedBy: r.orderedBy, orderedByName: r.orderedByName, orderedAt: now, status: 'QUEUED',
      });
    }
    if (created.length) {
      commit(created);
      for (const o of created) {
        await audit('MOLECULAR_ORDER_CREATED', o, `Molecular order ${o.orderId}: ${o.assayName} on ${o.specimenLabel}${o.blockLabel}, ${o.routing === 'IN_HOUSE' ? 'in-house' : `send-out to ${o.sendOutLabName ?? 'a reference lab'}`}`, o.orderedByName);
        await audit('MOLECULAR_ORDER_QUEUED', o, `Molecular order ${o.orderId} queued (${o.routing === 'IN_HOUSE' ? 'in-house order queue' : 'send-out'})`, o.orderedByName);
      }
    }
    return { created, refused };
  }

  async function dispatchAction(action: MolecularOrderAction): Promise<MolecularOrderActionResult> {
    // The keys are written out so the capabilities guard finds them. Re-routing is a cancel-and-redirect of the
    // in-house order, so it takes the cancel capability; choosing a send-out order's lab has its own (Batch 467b).
    const decision = action.type === 'CANCEL' || action.type === 'REROUTE_TO_SEND_OUT'
      ? await deps.enforce('molecular:order:cancel', { action: action.type })
      : action.type === 'SET_SEND_OUT_LAB'
        ? await deps.enforce('molecular:order:set-lab', { action: action.type })
        : await deps.enforce('molecular:order:assign-plate', { action: action.type });
    if (!decision.allowed) return { ok: false, refused: 'notPermitted' };
    const orders = deps.loadOrders();
    const byId = (id: string) => orders.find(o => o.orderId === id);

    if (action.type === 'ASSIGN_TO_PLATE') {
      const picked = [...new Set(action.orderIds)].map(byId);
      if (!picked.length || picked.some(o => !o)) return { ok: false, refused: 'orderNotFound' };
      const tests = await deps.getStainTypes();
      if ((picked as MolecularOrder[]).some(o => needsReroute(o, tests))) return { ok: false, refused: 'routingNotAvailable' };
      const batch = (await deps.getBatches()).find(b => b.id === action.batchId);
      if (!batch) return { ok: false, refused: 'plateNotFound' };
      const bound = bindOrdersToPlate(batch, picked as MolecularOrder[], await deps.getControlRules());
      if (bound.ok === false) return { ok: false, refused: bound.refused };
      if (!(await deps.updateBatchWells(batch.batchUuid, bound.wells))) return { ok: false, refused: 'plateNotFound' };
      const plateOf = (o: MolecularOrder) => ({ batchId: batch.id, batchUuid: batch.batchUuid, plateBarcode: batch.plateBarcode, wellPosition: bound.positions[o.orderId] });
      const saved = update((picked as MolecularOrder[]).map(o => ({ orderId: o.orderId, expect: ['QUEUED'] as const, change: f => ({ ...f, status: 'PLATE_ASSIGNED' as const, plate: plateOf(f) }) })));
      if (!saved) {
        // An order moved on meanwhile: the plate goes back as it was.
        await deps.updateBatchWells(batch.batchUuid, batch.wells);
        return { ok: false, refused: 'wrongStatus' };
      }
      for (const o of picked as MolecularOrder[]) await audit('PLATE_ASSIGNED', o, `Molecular order ${o.orderId} assigned to plate ${batch.plateBarcode}, well ${plateOf(o).wellPosition}`);
      return { ok: true, view: await queueView() };
    }

    const order = byId(action.orderId);
    if (!order) return { ok: false, refused: 'orderNotFound' };
    const tests = await deps.getStainTypes();
    if (!actionsFor(order, tests).includes(action.type)) return { ok: false, refused: 'wrongStatus' };

    if (action.type === 'SET_SEND_OUT_LAB') {
      // Batch 467b: the lab must be one the test may go to (its approved labs, or any active reference lab when it has none).
      const test = tests.find(t => t.id === order.assayTarget);
      const lab = test ? resolveSendOutLabChoices(test, await deps.getReferenceLabs()).choices.find(l => l.id === action.labId) : undefined;
      if (!lab) return { ok: false, refused: 'labNotAllowed' };
      if (!update([{ orderId: order.orderId, expect: ['QUEUED'], change: f => ({ ...f, sendOutLabId: lab.id, sendOutLabName: lab.name }) }])) return { ok: false, refused: 'wrongStatus' };
      if (order.stainOrderId) {
        await deps.changeCase(order.caseId, current => withStainOrder(current, order.stainOrderId!, st => (
          st.sendOutReferenceLabFacilityId === lab.id ? st : { ...st, sendOutReferenceLabFacilityId: lab.id, sendOutReferenceLabName: lab.name })));
      }
      await deps.logAudit({ type: 'user', event: 'MOLECULAR_ORDER_LAB_SET', detail: `Molecular order ${order.orderId} (${order.assayName}): reference lab ${order.sendOutLabName ? `changed from ${order.sendOutLabName} ` : ''}set to ${lab.name}`, user: deps.actorName(), caseId: order.accession, confidence: null });
      return { ok: true, view: await queueView() };
    }

    if (action.type === 'REROUTE_TO_SEND_OUT') {
      const test = tests.find(t => t.id === order.assayTarget);
      const labId = test?.defaultReferenceLabFacilityId ?? (test?.referenceLabFacilityIds?.length === 1 ? test.referenceLabFacilityIds[0] : undefined);
      const labName = labId ? deps.labName(labId) : undefined;
      if (!update([{ orderId: order.orderId, expect: ['QUEUED'], change: f => ({ ...f, routing: 'SEND_OUT', sendOutLabId: labId, sendOutLabName: labName }) }])) return { ok: false, refused: 'wrongStatus' };
      // The add-on slide order goes to the send-out queue too (with its lab, when there is one).
      if (order.stainOrderId) {
        await deps.changeCase(order.caseId, current => withStainOrder(current, order.stainOrderId!, st => ({
          ...st, routedQueueLabel: 'Reference/Send-Out Lab Queue' as const,
          ...(labId ? { sendOutReferenceLabFacilityId: labId, sendOutReferenceLabName: labName } : {}),
        })));
      }
      await audit('MOLECULAR_ORDER_QUEUED', order, `Molecular order ${order.orderId} re-routed to send-out (${order.assayName} no longer run in-house)${labId ? ` to ${deps.labName(labId)}` : ', reference lab to be chosen'}`);
      return { ok: true, view: await queueView() };
    }

    // Taking it off its plate (removing, or cancelling an assigned order).
    if (order.status === 'PLATE_ASSIGNED' && order.plate) {
      const batch = (await deps.getBatches()).find(b => b.id === order.plate!.batchId);
      // Batch 669: a superseded plate is a closed record; its orders are taken off without editing it (Take off plate used
      // to be refused there with plateNotDraft, leaving only Cancel).
      if (batch && batch.status !== 'superseded') {
        const unbound = unbindOrderFromPlate(batch, order.orderId);
        if (unbound.ok === false) return { ok: false, refused: unbound.refused };
        if (!(await deps.updateBatchWells(batch.batchUuid, unbound.wells))) return { ok: false, refused: 'plateNotFound' };
      }
    }

    if (action.type === 'REMOVE_FROM_PLATE') {
      if (!update([{ orderId: order.orderId, expect: ['PLATE_ASSIGNED'], change: f => { const { plate: _p, ...rest } = f; return { ...rest, status: 'QUEUED' }; } }])) return { ok: false, refused: 'wrongStatus' };
      await audit('MOLECULAR_ORDER_QUEUED', order, `Molecular order ${order.orderId} taken off plate ${order.plate?.plateBarcode ?? ''} and queued again`);
      return { ok: true, view: await queueView() };
    }

    // CANCEL: the order, and the add-on slide order it came from.
    if (!update([{ orderId: order.orderId, expect: ['QUEUED', 'PLATE_ASSIGNED'], change: f => { const { plate: _p2, ...rest } = f; return { ...rest, status: 'CANCELLED', cancelledAt: deps.now(), cancelledBy: deps.actorName() }; } }])) return { ok: false, refused: 'wrongStatus' };
    if (order.stainOrderId) {
      await deps.changeCase(order.caseId, current => withStainOrder(current, order.stainOrderId!, st => (st.status === 'Cancelled' ? st : { ...st, status: 'Cancelled' as const })));
    }
    await deps.logAudit({ type: 'user', event: 'MOLECULAR_ORDER_CANCELLED', detail: `Molecular order ${order.orderId} (${order.assayName}) cancelled`, user: deps.actorName(), caseId: order.accession, confidence: null });
    return { ok: true, view: await queueView() };
  }

  /** The plate's worklist went to the instrument: its orders are running. */
  async function onWorklistDispatched(batchUuid: string): Promise<void> {
    const orders = deps.loadOrders();
    const running = orders.filter(o => o.status === 'PLATE_ASSIGNED' && o.plate?.batchUuid === batchUuid);
    if (!running.length) return;
    update(running.map(o => ({ orderId: o.orderId, expect: ['PLATE_ASSIGNED'] as const, change: f => ({ ...f, status: 'IN_RUN' as const }) })));
    for (const o of running) await audit('WORKLIST_DISPATCHED', o, `Molecular order ${o.orderId} running: plate ${o.plate!.plateBarcode} worklist dispatched`, 'PathScribe');
  }

  /** Batch 669 (mol-9): Clone & Supersede kept the orders' wells on the new plate; the orders now point at it. Only orders still
   *  waiting on the superseded plate move (PLATE_ASSIGNED, and the new plate holds their well); a running order stays with the plate
   *  it runs on. Returns how many moved. */
  async function onPlateSuperseded(originalBatchUuid: string, clone: Pick<MolecularBatch, 'id' | 'batchUuid' | 'plateBarcode' | 'wells'>): Promise<number> {
    const moving = deps.loadOrders().filter(o => o.status === 'PLATE_ASSIGNED' && o.plate?.batchUuid === originalBatchUuid
      && clone.wells.some(w => w.orderId === o.orderId));
    if (!moving.length) return 0;
    const positionOf = (o: MolecularOrder) => clone.wells.find(w => w.orderId === o.orderId)!.wellPosition;
    const saved = update(moving.map(o => ({ orderId: o.orderId, expect: ['PLATE_ASSIGNED'] as const,
      change: f => ({ ...f, plate: { batchId: clone.id, batchUuid: clone.batchUuid, plateBarcode: clone.plateBarcode, wellPosition: positionOf(f) } }) })));
    if (!saved) return 0;
    for (const o of moving) await audit('PLATE_ASSIGNED', o, `Molecular order ${o.orderId} moved to plate ${clone.plateBarcode}, well ${positionOf(o)} (replaces superseded plate ${o.plate!.plateBarcode})`);
    return moving.length;
  }

  /** A signed-out report is never changed: an addendum draft is opened for the case's pathologist instead. */
  async function openAddendum(caseData: Case, inst: SynopticReportInstance, fieldId: string): Promise<HydrationResult> {
    const assigned = caseData.order?.assignedTo;
    const name = (caseData.participants ?? []).find(p => p.staffId === assigned)?.staffName ?? assigned ?? '';
    const addendumId = assigned
      ? await deps.startAddendum({ caseId: caseData.id, reportInstanceId: inst.instanceId, specimenId: inst.specimenId, pathologist: { userId: assigned, userName: name } })
      : undefined;
    return { outcome: addendumId ? 'addendumQueued' : 'addendumNotOpened', instanceId: inst.instanceId, fieldId, addendumId };
  }

  /** Fills the case's bound synoptic question from a reportable call. The decision is made inside the case write,
   *  against the synoptic as it is then (an answer typed meanwhile is kept; a report signed meanwhile isn't touched). */
  async function hydrate(order: MolecularOrder, call: string): Promise<HydrationResult> {
    const caseData = await deps.getCase(order.caseId);
    if (!caseData) return { outcome: 'notBound' };
    // The specimen's synoptics first, then the case's others.
    const instances = [...(caseData.synopticReports ?? [])].sort((a, b) => Number(b.specimenId === order.specimenId) - Number(a.specimenId === order.specimenId));
    for (const inst of instances) {
      const template = await deps.getTemplate(inst.templateId);
      const field = template ? boundFieldFor(template as never, order.assayTarget) : undefined;
      if (!field) continue;
      const at = deps.now();
      const box: { r: HydrationResult | 'locked' } = { r: { outcome: 'notBound' } };
      const written = await deps.changeCase(order.caseId, current => {
        const cur = (current.synopticReports ?? []).find(r => r.instanceId === inst.instanceId);
        if (!cur) { box.r = { outcome: 'notBound' }; return null; }
        if (isLocked(current, cur)) { box.r = 'locked'; return null; }
        const decision = decideHydration(field, call, cur.answers ?? {});
        if (decision.kind === 'none') { box.r = { outcome: 'notReportable', instanceId: inst.instanceId, fieldId: field.id }; return null; }
        box.r = { outcome: decision.kind === 'suggest' ? 'suggested' : 'hydrated', instanceId: inst.instanceId, fieldId: field.id };
        const source = { orderId: order.orderId, assayName: order.assayName, call, at };
        return {
          synopticReports: (current.synopticReports ?? []).map((r: SynopticReportInstance) => {
            if (r.instanceId !== inst.instanceId) return r;
            const resultSources = { ...(r.resultSources ?? {}), [field.id]: source };
            // A different answer is kept; the result is recorded beside it and the synoptic shows the difference
            // (molecularResultDeltas) for the pathologist to accept or keep theirs.
            return decision.kind === 'answer' ? { ...r, answers: { ...r.answers, [field.id]: decision.value }, resultSources } : { ...r, resultSources };
          }),
        };
      });
      const r = box.r;
      if (r === 'locked') return openAddendum((await deps.getCase(order.caseId)) ?? caseData, inst, field.id);
      if ((r.outcome === 'hydrated' || r.outcome === 'suggested') && !written) return { outcome: 'notBound' };
      return r;
    }
    return { outcome: 'notBound' };
  }

  /** Records a call against an order (in-house run or reference lab): RESULTED, the report filled when reportable. */
  async function applyResult(
    o: MolecularOrder,
    r: { interpretation: string; flag?: string; controlsPassed: boolean; batchUuid?: string; referralBatchId?: string; from: string },
    expect: readonly MolecularOrder['status'][],
  ): Promise<void> {
    const at = deps.now();
    const flag = r.flag ?? 'NONE';
    await audit('RUN_RESULTS_RECEIVED', o, `Molecular order ${o.orderId}: ${o.assayName} result ${r.interpretation}${flag !== 'NONE' ? ` (${flag})` : ''}${r.controlsPassed ? '' : ', controls failed'} (${r.from})`, 'PathScribe');
    const h: HydrationResult = isReportable({ interpretation: r.interpretation as MolecularWellResult['interpretation'], flag: flag as MolecularWellResult['flag'] }, r.controlsPassed)
      ? await hydrate(o, r.interpretation) : { outcome: 'notReportable' };
    update([{ orderId: o.orderId, expect, change: f => ({
      ...f, status: 'RESULTED',
      result: { interpretation: r.interpretation, flag, controlsPassed: r.controlsPassed, receivedAt: at, ...(r.batchUuid ? { batchUuid: r.batchUuid } : {}), ...(r.referralBatchId ? { referralBatchId: r.referralBatchId } : {}) },
      hydration: { ...h, at },
    }) }]);
    if (h.outcome === 'addendumQueued' || h.outcome === 'addendumNotOpened') {
      await deps.logAudit({ type: 'system', event: 'MOLECULAR_RESULT_ADDENDUM_QUEUED', detail: `Molecular order ${o.orderId}: result ${r.interpretation} arrived after sign-out; report unchanged, ${h.addendumId ? `addendum draft ${h.addendumId}` : 'no addendum draft opened (no assigned pathologist, or it failed) — add it by hand'}`, user: 'PathScribe', caseId: o.accession, confidence: null });
    }
    if (h.outcome === 'hydrated' || h.outcome === 'suggested') {
      await audit('REPORT_FIELD_HYDRATED', o, `Molecular order ${o.orderId}: synoptic ${h.instanceId} question ${h.fieldId} ${h.outcome === 'hydrated' ? 'answered' : 'given the result beside a different answer'} from result ${r.interpretation}`, 'PathScribe');
    }
  }

  const mismatchAudit = (o: MolecularOrder, detail: string) =>
    deps.logAudit({ type: 'system', event: 'MOLECULAR_RESULT_MISMATCH', detail: `Molecular order ${o.orderId}: ${detail}; not applied`, user: 'PathScribe', caseId: o.accession, confidence: null });

  /** The run's results arrived for this plate. Each order is saved as it is done, and one that fails is left running
   *  (so the run can be processed again); throws after the others are done if any failed. */
  async function onRunResults(batchUuid: string): Promise<void> {
    const batch = (await deps.getBatches()).find(b => b.batchUuid === batchUuid);
    if (!batch?.results) return;
    const onPlate = deps.loadOrders().filter(o => (o.status === 'IN_RUN' || o.status === 'PLATE_ASSIGNED') && o.plate?.batchUuid === batchUuid);
    const controlsPassed = batch.controlsPassed !== false && batch.reviewStatus !== 'BLOCKED';
    let failed = 0;
    for (const o of onPlate) {
      try {
        // The well that holds this order now, and a result that names its specimen (and, when the instrument echoes it,
        // its order) — never by position alone.
        const well = batch.wells.find(w => w.orderId === o.orderId);
        const r = batch.results.find(x => x.well_position === (well?.wellPosition ?? o.plate!.wellPosition));
        if (!r) continue;
        const mismatch = !well || (!!r.order_id && r.order_id !== o.orderId)
          || (!!r.accession_number && r.accession_number !== o.accession) || (!!r.specimen_uuid && r.specimen_uuid !== o.specimenId);
        if (mismatch) {
          update([{ orderId: o.orderId, expect: ['IN_RUN', 'PLATE_ASSIGNED'], change: f => ({ ...f, hydration: { outcome: 'resultMismatch', at: deps.now() } }) }]);
          await mismatchAudit(o, `the result for well ${r.well_position} (accession ${r.accession_number ?? 'none'}${r.order_id ? `, order ${r.order_id}` : ''}) doesn't match the order's specimen`);
          continue;
        }
        await applyResult(o, { interpretation: r.interpretation, flag: r.flag, controlsPassed, batchUuid, from: `plate ${batch.plateBarcode}` }, ['IN_RUN', 'PLATE_ASSIGNED']);
      } catch (e) {
        failed++;
        console.error(`[molecularOrderEngine] result for ${o.orderId} not applied:`, e);
      }
    }
    if (failed) throw new Error(`${failed} molecular order result(s) could not be applied; the run can be processed again`);
  }

  /** Batch 467b: a referral batch went to its reference lab. The send-out orders it carries are now at the reference
   *  lab (IN_RUN). An order is carried only when all of these hold: its lab was chosen and is the batch's destination;
   *  the batch names its test (the batch's requested test is the test's catalog name or id, or the test is in
   *  `assayCodes`); and its accession (and the item's specimen, when given) is in the batch. Anything less leaves the
   *  order queued. Returns them, for the referral manifest to name (the reference lab echoes the order id). */
  async function onReferralDispatched(input: ReferralDispatchInput): Promise<{ orderId: string; caseAccession: string; assayCode: string }[]> {
    const at = deps.now();
    const requested = input.testRequested?.trim().toLowerCase();
    const namesTest = (o: MolecularOrder) => (input.assayCodes ?? []).includes(o.assayTarget)
      || (!!requested && (requested === o.assayName.trim().toLowerCase() || requested === o.assayTarget.toLowerCase()));
    const sent = deps.loadOrders().filter(o => o.routing === 'SEND_OUT' && o.status === 'QUEUED'
      && o.sendOutLabId === input.labId && namesTest(o)
      && input.items.some(i => i.caseAccession === o.accession && (!i.specimenLabel || i.specimenLabel === o.specimenLabel)));
    if (!sent.length) return [];
    const labName = deps.labName(input.labId);
    const saved = sent.filter(o => update([{ orderId: o.orderId, expect: ['QUEUED'], change: f => ({ ...f, status: 'IN_RUN', referral: { batchId: input.batchId, labId: input.labId, sentAt: at } }) }]));
    for (const o of saved) await audit('WORKLIST_DISPATCHED', o, `Molecular order ${o.orderId}: sent to ${labName} in referral batch ${input.batchId}`, 'PathScribe');
    return saved.map(o => ({ orderId: o.orderId, caseAccession: o.accession, assayCode: o.assayTarget }));
  }

  /** Batch 467b: a reference lab's results for a referral batch. Each coded result is matched to a send-out order in
   *  that batch — by order id when the lab echoes it, else by accession and test (and only when exactly one order
   *  fits). A coded result also replaces an earlier "report only" outcome. A final report with no coded results (a
   *  PDF) marks the batch's orders still waiting as resulted, with the answer to be entered from it. Throws after the
   *  others are done if any failed. */
  async function onSendOutResults(input: SendOutResultInput): Promise<void> {
    const open = (o: MolecularOrder) => o.status === 'IN_RUN' || (o.status === 'RESULTED' && o.hydration?.outcome === 'reportOnly');
    const inBatch = deps.loadOrders().filter(o => o.routing === 'SEND_OUT' && o.referral?.batchId === input.batchId);
    let failed = 0;
    for (const r of input.results ?? []) {
      const candidates = r.orderId
        ? deps.loadOrders().filter(o => o.orderId === r.orderId)
        : inBatch.filter(o => open(o) && o.accession === r.caseAccession && (!r.assayCode || o.assayTarget === r.assayCode));
      if (candidates.length !== 1) continue; // no order, or ambiguous: the result stays on the referral record only
      const o = candidates[0];
      try {
        if (o.referral?.batchId !== input.batchId) {
          // Names an order that isn't in this batch: the order is untouched; the message is wrong.
          await mismatchAudit(o, `the reference lab named this order in referral batch ${input.batchId}, but it was sent in ${o.referral?.batchId ?? 'no referral batch'}`);
          continue;
        }
        if (!open(o)) continue; // already resulted (a redelivery), or cancelled
        if (o.accession !== r.caseAccession || (r.assayCode && r.assayCode !== o.assayTarget)) {
          update([{ orderId: o.orderId, expect: [o.status], change: f => ({ ...f, hydration: { outcome: 'resultMismatch', at: deps.now() } }) }]);
          await mismatchAudit(o, `the reference lab's result for ${r.caseAccession}${r.assayCode ? ` (${r.assayCode})` : ''} doesn't match this order`);
          continue;
        }
        await applyResult(o, { interpretation: r.interpretation, flag: r.flag, controlsPassed: true, referralBatchId: input.batchId, from: `reference lab, referral batch ${input.batchId}` }, ['IN_RUN', 'RESULTED']);
      } catch (e) {
        failed++;
        console.error(`[molecularOrderEngine] reference lab result for ${o.orderId} not applied:`, e);
      }
    }
    // A final report with no coded results (a PDF): the batch's orders still waiting have their answer to read from it.
    if (!(input.results ?? []).length && input.reportOnly) {
      for (const o of inBatch.filter(x => x.status === 'IN_RUN')) {
        const at = deps.now();
        if (!update([{ orderId: o.orderId, expect: ['IN_RUN'], change: f => ({ ...f, status: 'RESULTED', result: { interpretation: 'REPORT', flag: 'NONE', controlsPassed: true, receivedAt: at, referralBatchId: input.batchId }, hydration: { outcome: 'reportOnly', at } }) }])) continue;
        await audit('RUN_RESULTS_RECEIVED', o, `Molecular order ${o.orderId}: the reference lab's report arrived (referral batch ${input.batchId}); no coded result, answer to be entered from the report`, 'PathScribe');
      }
    }
    if (failed) throw new Error(`${failed} reference lab result(s) could not be applied; the message can be processed again`);
  }

  return { ingest, queueView, dispatchAction, onWorklistDispatched, onPlateSuperseded, onRunResults, onReferralDispatched, onSendOutResults };
}

export type MolecularOrderEngine = ReturnType<typeof createMolecularOrderEngine>;
