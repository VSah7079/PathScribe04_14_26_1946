// src/services/molecularOrders/molecularOrderEngineLive.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 467: the molecular order engine wired to today's (mock) services. The
// API server replaces this with the same engine behind
// /api/v1/molecular/orders/ingest, GET /api/v1/molecular/queue and
// POST /api/v1/molecular/orders/action (docs/architecture/MOLECULAR_ORDERS_API.md);
// the screens keep calling `molecularOrderEngine` through `@/services`.
//
// `simulateMolecularRunResults` is the demo's stand-in for the instrument: it
// reports a call for each order on a plate and hands the run to the same
// results processing a real run uses. Demo builds only (IS_MOCK_BACKEND).
// ─────────────────────────────────────────────────────────────────────────────

import { createMolecularOrderEngine, type MolecularOrderEngine } from './molecularOrderEngine';
import { loadMolecularOrders, saveMolecularOrders } from './mockMolecularOrderStore';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { mockStainTypeService } from '../stains/mockStainTypeService';
import { mockMolecularBatchService } from '../molecular/mockMolecularBatchService';
import { mockMolecularAssayControlRuleService } from '../molecular/mockMolecularAssayControlRuleService';
import { caseRouter } from '../cases/CaseRouter';
import { updateCaseWithRetry } from '../cases/caseWrite';
import { getTemplateCached } from '../templates/templateService';
import { mockAuditService } from '../auditlog/mockAuditService';
import { mockAmendmentService } from '../reports/mockAmendmentService';
import { mockFacilityService } from '../facilities/mockFacilityService';
import { activeReferenceLabs } from '../stains/referenceLabLink';
import { getSessionUser } from '../auth/caseAccessControl';
import type { MolecularRunResultsPayload } from '@/types/events/MolecularRunResultsPayload';

let labNames: Record<string, string> = {};
void mockFacilityService.getAll().then(r => { if (r.ok) labNames = Object.fromEntries(r.data.map(f => [f.id, f.name])); }).catch(() => {});

export const molecularOrderEngine: MolecularOrderEngine = createMolecularOrderEngine({
  loadOrders: loadMolecularOrders,
  saveOrders: saveMolecularOrders,
  enforce: (capability, context) => authorizationService.enforce(capability, context),
  getStainTypes: async () => { const r = await mockStainTypeService.getAll(); return r.ok ? r.data : []; },
  getBatches: async () => { const r = await mockMolecularBatchService.getAll(); return r.ok ? r.data : []; },
  updateBatchWells: async (batchUuid, wells) => (await mockMolecularBatchService.updateByUuid(batchUuid, { wells })).ok,
  getControlRules: async () => { const r = await mockMolecularAssayControlRuleService.getAll(); return r.ok ? r.data : []; },
  getCase: async caseId => (await caseRouter.getCase(caseId)) ?? null,
  changeCase: async (caseId, change) => (await updateCaseWithRetry(caseId, change, caseRouter)).ok,
  getTemplate: async templateId => {
    try { return (await getTemplateCached(templateId)).template as never; } catch { return null; }
  },
  labName: id => labNames[id] ?? id,
  getReferenceLabs: async () => { const r = await mockFacilityService.getAll(); return r.ok ? activeReferenceLabs(r.data).map(f => ({ id: f.id, name: f.name })) : []; },
  logAudit: entry => mockAuditService.logEvent(entry),
  startAddendum: async input => {
    const r = await mockAmendmentService.startDraft({ caseId: input.caseId, type: 'addendum', authoringPathologist: input.pathologist, reportInstanceId: input.reportInstanceId, specimenId: input.specimenId });
    return r.ok ? r.data.id : undefined;
  },
  now: () => new Date().toISOString(),
  // eslint-disable-next-line no-restricted-properties -- the year in a new order id is the creating device's own date (an id, not a stored event's date)
  newOrderId: () => `MO-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
  actorName: () => { const u = getSessionUser(); return u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.id : 'Unknown user'; },
});

/** Demo only: the instrument reports `call` for every sample on the plate (controls as expected), as if its
 *  worklist had been dispatched and run. Goes through processInboundMolecularRunResults like a real run. */
export async function simulateMolecularRunResults(batchId: string, call: 'POSITIVE' | 'NEGATIVE'): Promise<boolean> {
  const { processInboundMolecularRunResults } = await import('../molecular/processInboundMolecularRunResults');
  const r = await mockMolecularBatchService.getById(batchId);
  if (!r.ok) return false;
  const batch = r.data;
  if (!batch.worklistDispatchedAt) {
    await mockMolecularBatchService.updateByUuid(batch.batchUuid, { worklistDispatchedAt: new Date().toISOString(), status: 'active' });
    await molecularOrderEngine.onWorklistDispatched(batch.batchUuid);
  }
  const payload: MolecularRunResultsPayload = {
    event_type: 'MOLECULAR_RUN_RESULTS', timestamp: new Date().toISOString(),
    batch_info: { batch_uuid: batch.batchUuid, instrument_id: batch.targetInstrumentId, run_status: 'COMPLETED' },
    control_validation: { controls_passed: true, review_status: 'AUTO_PASSED' },
    results: batch.wells.filter(w => w.sampleType).map(w => ({
      well_position: w.wellPosition, specimen_uuid: w.specimenUuid ?? null, accession_number: w.accessionNumber, ...(w.orderId ? { order_id: w.orderId } : {}),
      raw_data: w.sampleType === 'PATIENT_SPECIMEN' ? { ct_value: call === 'POSITIVE' ? 27.4 : undefined, internal_control_ct: 28.6 } : { internal_control_ct: 28.1 },
      interpretation: w.sampleType === 'PATIENT_SPECIMEN' ? call : w.controlInfo?.expectedValue ?? 'NEGATIVE',
      flag: 'NONE' as const,
    })),
  };
  const out = await processInboundMolecularRunResults(payload);
  return out.outcome === 'applied';
}

/** Batch 467b, demo only: the reference lab reports `call` for a send-out order. The order is sent first when it is
 *  still queued (a referral batch of its own, as a referral batch's dispatch would), then the reference lab's reply
 *  goes through the same inbound processing a real one uses (referral/processInboundReferralResultEvent.ts), carrying
 *  the order id the manifest gave it. 'needsLab': choose the order's reference lab first. */
export async function simulateSendOutResult(orderId: string, call: 'POSITIVE' | 'NEGATIVE'): Promise<'applied' | 'needsLab' | 'failed'> {
  const order = loadMolecularOrders().find(o => o.orderId === orderId);
  if (!order || order.routing !== 'SEND_OUT') return 'failed';
  let batchId = order.referral?.batchId;
  if (order.status === 'QUEUED') {
    if (!order.sendOutLabId) return 'needsLab';
    batchId = `ref-demo-${order.orderId}`;
    const { mockReferralTrackingService } = await import('../referral/mockReferralTrackingService');
    await mockReferralTrackingService.createOnDispatch(batchId);
    const sent = await molecularOrderEngine.onReferralDispatched({ batchId, labId: order.sendOutLabId, testRequested: order.assayName, items: [{ caseAccession: order.accession, specimenLabel: order.specimenLabel }], assayCodes: [order.assayTarget] });
    if (!sent.some(x => x.orderId === order.orderId)) return 'failed';
  }
  if (!batchId) return 'failed';
  const { processInboundReferralResultEvent } = await import('../referral/processInboundReferralResultEvent');
  const out = await processInboundReferralResultEvent({
    messageId: `ref-demo-${order.orderId}-${Date.now()}`, timestamp: new Date().toISOString(), batchId,
    resultType: 'discrete', discreteResult: `${order.assayName}: ${call}`,
    orderResults: [{ orderId: order.orderId, caseAccession: order.accession, assayCode: order.assayTarget, interpretation: call, flag: 'NONE' }],
  });
  return out.outcome === 'applied' ? 'applied' : 'failed';
}
