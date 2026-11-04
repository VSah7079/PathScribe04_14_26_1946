// src/services/referral/processInboundReferralResultEvent.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, working ingestion for ReferralResultEventPayload. Same real
// idempotent-on-messageId, honest-distinct-outcomes discipline as
// this app's own other inbound processors.
// ─────────────────────────────────────────────────────────────────────────────

import { referralTrackingService } from './referralTrackingServiceInstance';
import type { ReferralResultEventPayload } from '@/types/events/ReferralResultEventPayload';

export interface ProcessInboundReferralResultEventResult {
  messageId: string;
  outcome: 'applied' | 'already-applied' | 'tracking-not-found' | 'invalid-payload';
}

const processedMessageIds = new Set<string>();

export async function processInboundReferralResultEvent(
  payload: ReferralResultEventPayload,
): Promise<ProcessInboundReferralResultEventResult> {
  if (processedMessageIds.has(payload.messageId)) {
    return { messageId: payload.messageId, outcome: 'already-applied' };
  }

  if (!payload.batchId || !payload.resultType) {
    return { messageId: payload.messageId, outcome: 'invalid-payload' };
  }
  // Real, per this payload's own header — a genuine mutual-exclusivity
  // rule between the two real result modes, the same discipline the
  // Structured Clinical History Dictionary's own inbound validation
  // already established for its unmapped-text-fallback field.
  if (payload.resultType === 'discrete' && (!payload.discreteResult || payload.pdfAttachmentUrl)) {
    return { messageId: payload.messageId, outcome: 'invalid-payload' };
  }
  if (payload.resultType === 'pdf_attachment' && (!payload.pdfAttachmentUrl || payload.discreteResult)) {
    return { messageId: payload.messageId, outcome: 'invalid-payload' };
  }

  const existing = await referralTrackingService.getByBatchId(payload.batchId);
  if (!existing.ok || !existing.data) {
    return { messageId: payload.messageId, outcome: 'tracking-not-found' };
  }

  await referralTrackingService.recordResult(payload.batchId, {
    resultType: payload.resultType,
    discreteResult: payload.discreteResult,
    pdfAttachmentUrl: payload.pdfAttachmentUrl,
  });

  // Batch 467b: the batch's send-out molecular orders take their results (coded ones fill the synoptic; a final PDF
  // report alone leaves the answer to be entered from it; an interim text message changes nothing). If one can't be applied, the message isn't marked processed, so
  // redelivering it finishes the job (orders already resulted are skipped).
  const { molecularOrderEngine } = await import('../molecularOrders/molecularOrderEngineLive');
  await molecularOrderEngine.onSendOutResults({ batchId: payload.batchId, results: payload.orderResults, reportOnly: !payload.orderResults?.length && payload.resultType === 'pdf_attachment' });

  processedMessageIds.add(payload.messageId);
  return { messageId: payload.messageId, outcome: 'applied' };
}

/** Test-only reset — same real pattern as this app's own other
 *  idempotent inbound processors. */
export function _resetProcessedReferralResultMessageIdsForTests(): void {
  processedMessageIds.clear();
}
