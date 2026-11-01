// src/services/interfaceDispatch/dispatchCharge.ts
// ─────────────────────────────────────────────────
// Batch 605: sends charges to the billing engine through the generic interface
// dispatch. A queued charge goes out as the JSON charge-capture payload
// (CHARGE_JSON) and the DFT^P03 text (CHARGE_DFT); a successful send moves the
// queue entry QUEUED to SENT, a failed one to FAILED with the reason. The
// financial-class payload goes out as FINANCIAL_CLASS (a preview-level payload
// until X12 837P, KVDT and SESAM-Vitale exist). In the demo the simulated
// engine answers and the result says so. Audit entries hold ids and types only.
// ─────────────────────────────────────────────────
import { caseRouter } from '../cases/CaseRouter';
import { serviceChargeService, billingDeficiencyService, outboundChargeQueueService } from '@/services';
import { buildDftP03ForCase } from '../hl7/dftBuilder';
import { buildJsonWebhookPayload } from '../billing/jsonWebhookBuilder';
import { buildFinancialClassPayload } from '../billing/buildFinancialClassPayload';
import { canCaseExportDft } from '../billing/canCaseExportDft';
import { dispatchInterfaceMessage, type InterfaceTransactionType } from './dispatchInterfaceMessage';
import { isEngineSimulated } from '../mockInterfaceEngine/simulatedEngineReceiver';
import { auditService } from '../auditlog/auditServiceInstance';
import type { OutboundChargeQueueEntry } from '@/types/billing/OutboundChargeQueueEntry';
import { getResearchCaseSettings } from '../researchCases/researchCaseSettings';
import { isResearchCase } from '../researchCases/researchCaseRules';

/** Batch 728 (Lab Workflow spec, Decision 4): the text a refused research-case charge carries. */
export const RESEARCH_NO_CHARGE_MESSAGE = 'This is a research case: no charges are sent to billing (Configuration > System > Research Cases).';

export interface ChargeDispatchResult {
  ok: boolean;
  simulated: boolean;
  error?: string;
  /** What was sent, for the screen. */
  sent: { transactionType: InterfaceTransactionType; ok: boolean; text: string }[];
}

const RCM_CONTEXT = { sendingApplication: 'PATHSCRIBE', sendingFacility: 'FORMEDRIX', receivingApplication: 'RCM', receivingFacility: 'RCM_FAC', processingId: 'T' as const };

async function audit(event: string, detail: string, caseId: string, actor: string): Promise<void> {
  await auditService.logEvent({ type: 'system', event, detail, user: actor, caseId, confidence: null }).catch(() => {});
}

/** Sends one queued charge. Moves the queue entry to SENT or FAILED. Never throws. */
export async function dispatchQueuedCharge(entry: OutboundChargeQueueEntry, actor = 'system'): Promise<ChargeDispatchResult> {
  const simulated = isEngineSimulated();
  const fail = async (error: string, code: 'DISPATCH_REJECTED' | 'DISPATCH_TIMEOUT' = 'DISPATCH_REJECTED'): Promise<ChargeDispatchResult> => {
    await outboundChargeQueueService.markFailed(entry.id, { errorCode: code, errorMessage: error, maxRetriesExceeded: false });
    await audit(simulated ? 'Simulated Charge Dispatch Failed' : 'Charge Dispatch Failed', `${simulated ? 'SIMULATED: ' : ''}charge queue entry ${entry.id} not sent: ${error}`, entry.caseId, actor);
    return { ok: false, simulated, error, sent: [] };
  };
  try {
    const caseData = await caseRouter.getCase(entry.caseId);
    if (!caseData) return await fail('The case for this charge was not found.');
    if (isResearchCase(caseData, getResearchCaseSettings())) return await fail(RESEARCH_NO_CHARGE_MESSAGE);
    const [chargesRes, defRes] = await Promise.all([serviceChargeService.getChargesForCase(entry.caseId), billingDeficiencyService.getByCaseId(entry.caseId)]);
    const gate = canCaseExportDft(defRes.ok ? defRes.data : []);
    if (!gate.allowed) return await fail(`${gate.blocking.length} open billing deficiency(ies) block the export.`);
    const charge = chargesRes.ok ? chargesRes.data.find(c => c.id === entry.serviceChargeRecordId) : undefined;
    if (!charge) return await fail('The charge record was not found.');

    const icd10 = (caseData.order?.icd10Codes ?? []).map(c => ({ code: c.code, display: c.description }));
    const dft = buildDftP03ForCase(RCM_CONTEXT, { id: caseData.id, patient: caseData.patient, coding: { icd10 } }, [charge], 'UTC');
    const json = await buildJsonWebhookPayload(caseData, [charge]);
    const jsonText = JSON.stringify(json, null, 2);

    const sent: ChargeDispatchResult['sent'] = [];
    for (const [type, payload, text] of [
      ['CHARGE_JSON', json as object, jsonText],
      ['CHARGE_DFT', { messageControlId: dft.messageControlId, caseId: caseData.id, dft: dft.message }, dft.message.split('\r').join('\n')],
    ] as [InterfaceTransactionType, object, string][]) {
      const r = await dispatchInterfaceMessage(`${entry.id}:${type}`, type, payload);
      sent.push({ transactionType: type, ok: r.ok, text });
      if (!r.ok) {
        await outboundChargeQueueService.markFailed(entry.id, { errorCode: r.errorCode === 'DISPATCH_TIMEOUT' ? 'DISPATCH_TIMEOUT' : 'DISPATCH_REJECTED', errorMessage: r.error ?? 'The engine did not accept the charge.', maxRetriesExceeded: false });
        await audit(simulated ? 'Simulated Charge Dispatch Failed' : 'Charge Dispatch Failed', `${simulated ? 'SIMULATED: ' : ''}${type} for queue entry ${entry.id} not accepted.`, entry.caseId, actor);
        return { ok: false, simulated, error: r.error, sent };
      }
    }
    await outboundChargeQueueService.markSent(entry.id);
    await audit(simulated ? 'Simulated Charge Dispatched' : 'Charge Dispatched', `${simulated ? 'SIMULATED (no billing engine): ' : ''}charge queue entry ${entry.id} sent as JSON and DFT^P03.`, entry.caseId, actor);
    return { ok: true, simulated, sent };
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'The charge could not be sent.');
  }
}

/** Sends every QUEUED charge of a case. Charges with a FAILED entry are left to the dead-letter screen. */
export async function dispatchQueuedChargesForCase(caseId: string, actor = 'system'): Promise<{ attempted: number; sent: number }> {
  const res = await outboundChargeQueueService.getByCaseId(caseId);
  const queued = res.ok ? res.data.filter(e => e.status === 'QUEUED') : [];
  let sent = 0;
  for (const e of queued) if ((await dispatchQueuedCharge(e, actor)).ok) sent += 1;
  return { attempted: queued.length, sent };
}

/** From the export preview: queues a case's charges that have no entry yet, then sends the queued ones. */
export async function sendCaseChargesToBillingEngine(caseId: string, actor: string): Promise<{ ok: boolean; message: string; attempted: number; sent: number }> {
  if (isResearchCase(await caseRouter.getCase(caseId), getResearchCaseSettings())) return { ok: false, message: RESEARCH_NO_CHARGE_MESSAGE, attempted: 0, sent: 0 };
  const [chargesRes, defRes] = await Promise.all([serviceChargeService.getChargesForCase(caseId), billingDeficiencyService.getByCaseId(caseId)]);
  const gate = canCaseExportDft(defRes.ok ? defRes.data : []);
  if (!gate.allowed) return { ok: false, message: `${gate.blocking.length} open billing deficiency(ies) block the export.`, attempted: 0, sent: 0 };
  const charges = chargesRes.ok ? chargesRes.data.filter(c => c.transactionType === 'charge') : [];
  if (charges.length === 0) return { ok: false, message: 'This case has no charges to send.', attempted: 0, sent: 0 };
  const existing = await outboundChargeQueueService.getByServiceChargeRecordIds(charges.map(c => c.id));
  const have = new Set(existing.ok ? existing.data.map(e => e.serviceChargeRecordId) : []);
  for (const c of charges.filter(x => !have.has(x.id))) {
    await outboundChargeQueueService.enqueue({
      serviceChargeRecordId: c.id, caseId, specimenId: (c as { specimenId?: string }).specimenId,
      billingType: ((c as { billingType?: 'TC' | '26' | 'Global' }).billingType ?? 'Global'), triggerEvent: 'CASE_SIGNED_OUT',
    });
  }
  const r = await dispatchQueuedChargesForCase(caseId, actor);
  return { ok: r.attempted > 0 && r.sent === r.attempted, message: r.attempted === 0 ? 'Nothing was waiting to be sent.' : `${r.sent} of ${r.attempted} charge(s) sent.`, ...r };
}

/** Sends the financial-class payload (FINANCIAL_CLASS). A preview-level payload until the formats exist. */
export async function dispatchFinancialClass(caseId: string, actor: string): Promise<ChargeDispatchResult> {
  const simulated = isEngineSimulated();
  const caseData = await caseRouter.getCase(caseId);
  if (!caseData) return { ok: false, simulated, error: 'Case not found.', sent: [] };
  const built = await buildFinancialClassPayload(caseData);
  // Batch 728 (Decision 4): a research case carries the lab's no-charge financial class and no coverage.
  const research = getResearchCaseSettings();
  const payload = isResearchCase(caseData, research)
    ? { ...built, accountBillingType: research.noChargeFinancialClass, primaryCoverage: undefined, secondaryCoverage: undefined }
    : built;
  const text = JSON.stringify(payload, null, 2);
  const r = await dispatchInterfaceMessage(`FC-${caseId}-${Date.now().toString(36)}`, 'FINANCIAL_CLASS', payload);
  await audit(simulated ? 'Simulated Financial Class Sent' : 'Financial Class Sent', `${simulated ? 'SIMULATED: ' : ''}financial-class payload ${r.ok ? 'sent' : 'not sent'} (preview-level).`, caseId, actor);
  return { ok: r.ok, simulated, error: r.error, sent: [{ transactionType: 'FINANCIAL_CLASS', ok: r.ok, text }] };
}
