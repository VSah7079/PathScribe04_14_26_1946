// src/services/interfaceDispatch/dispatchHardwareOrders.ts
// ─────────────────────────────────────────────────
// Batch 605: block orders (ORM^O01), slide orders and specimen labels sent
// through the generic interface dispatch. In the demo the simulated engine
// answers (see mockInterfaceEngine/simulatedEngineReceiver.ts) and the result
// is labelled Simulated. The audit entry names the case and the type only.
// ─────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';
import type { Specimen, HistologyBlock } from '@/types/case/Specimen';
import type { HL7MessageContext } from '../hl7/types';
import { buildOrmO01ForBlock } from '../hl7/ormBuilder';
import { dispatchInterfaceMessage, type InterfaceTransactionType } from './dispatchInterfaceMessage';
import { isEngineSimulated } from '../mockInterfaceEngine/simulatedEngineReceiver';
import { mockAuditService } from '../auditlog/mockAuditService';

export const DEFAULT_HARDWARE_CONTEXT: HL7MessageContext = {
  sendingApplication: 'PATHSCRIBE', sendingFacility: 'PS', receivingApplication: 'ENGINE', receivingFacility: 'LAB', processingId: 'D',
};

export interface HardwareDispatchResult {
  ok: boolean;
  transactionType: InterfaceTransactionType;
  /** True when the simulated engine took it (no real engine in the demo). */
  simulated: boolean;
  /** The message the engine received (HL7 text for a block order, JSON otherwise). */
  messageText: string;
  messageId: string;
  error?: string;
}

async function send(type: InterfaceTransactionType, messageId: string, payload: object, messageText: string, caseId: string, actor: string, what: string): Promise<HardwareDispatchResult> {
  const simulated = isEngineSimulated();
  const r = await dispatchInterfaceMessage(messageId, type, payload);
  await mockAuditService.logEvent({
    type: 'system', event: simulated ? 'Simulated Hardware Order Sent' : 'Hardware Order Sent',
    detail: `${simulated ? 'SIMULATED (no engine): ' : ''}${what} ${r.ok ? 'sent' : `not sent (${r.errorCode ?? 'failed'})`}.`,
    user: actor, caseId, confidence: null,
  }).catch(() => {});
  return { ok: r.ok, transactionType: type, simulated, messageText, messageId, ...(r.ok ? {} : { error: r.error }) };
}

/** Builds the block's ORM^O01 and sends it (BLOCK_ORDER). */
export async function dispatchBlockOrder(input: {
  caseData: Pick<Case, 'id' | 'patient'>; specimen: Pick<Specimen, 'id' | 'label' | 'collection' | 'container'>;
  block: HistologyBlock; actor: string; timezone?: string; ctx?: HL7MessageContext;
}): Promise<HardwareDispatchResult> {
  const orm = buildOrmO01ForBlock(input.ctx ?? DEFAULT_HARDWARE_CONTEXT, input.caseData, input.specimen, input.block, input.timezone ?? 'UTC');
  return send('BLOCK_ORDER', orm.messageControlId,
    { kind: 'block-order', caseId: input.caseData.id, specimenLabel: input.specimen.label, blockLabel: input.block.label, orm: orm.message },
    orm.message, input.caseData.id, input.actor, `Block order for block ${input.specimen.label}${input.block.label}`);
}

export interface SlideOrderInput { caseId: string; accession: string; specimenLabel: string; blockLabel: string; slideLabel: string; stainName?: string; barcode: string; actor: string }
export async function dispatchSlideOrder(i: SlideOrderInput): Promise<HardwareDispatchResult> {
  const messageId = `SLD-${Date.now().toString(36)}-${i.barcode}`;
  const payload = { kind: 'slide-order', messageId, caseId: i.caseId, accession: i.accession, specimenLabel: i.specimenLabel, blockLabel: i.blockLabel, slideLabel: i.slideLabel, stainName: i.stainName ?? null, barcode: i.barcode };
  return send('SLIDE_ORDER', messageId, payload, JSON.stringify(payload, null, 2), i.caseId, i.actor, `Slide order ${i.slideLabel}`);
}

export interface SpecimenLabelInput { caseId: string; accession: string; specimenLabel: string; container?: string; barcode: string; actor: string }
export async function dispatchSpecimenLabelOrder(i: SpecimenLabelInput): Promise<HardwareDispatchResult> {
  const messageId = `SPL-${Date.now().toString(36)}-${i.barcode}`;
  const payload = { kind: 'specimen-label', messageId, caseId: i.caseId, accession: i.accession, specimenLabel: i.specimenLabel, container: i.container ?? null, barcode: i.barcode };
  return send('SPECIMEN_LABEL', messageId, payload, JSON.stringify(payload, null, 2), i.caseId, i.actor, `Specimen label ${i.specimenLabel}`);
}
