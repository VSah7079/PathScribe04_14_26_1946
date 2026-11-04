// src/services/hl7/processInboundStainQcSignOffEvent.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 763 (Option A): a stainer's own QC sign-off for a run, from the interface engine. Idempotent on messageId. The
// run's QC checkpoint is opened if the stainer's Run Completed was missed, then decided by the instrument's result
// (services/stainQc/stainQcService.ts vendorRunResult). On the server this is POST /api/v1/events/stain-qc-sign-off
// (docs/architecture/STAIN_QC_API.md §3); here it is the demonstration's handler.
// ─────────────────────────────────────────────────────────────────────────────
import { batchService } from '../batches/batchServiceInstance';
import { stainQcSystem } from '../stainQc/stainQcServiceInstance';
import type { StainQcSignOffEventPayload } from '@/types/events/StainQcSignOffEventPayload';

export type StainQcSignOffOutcome = 'applied' | 'already-applied' | 'invalid-payload' | 'batch-not-found' | 'wrong-node' | 'already-decided' | 'not-vendor-mode';

const processed = new Set<string>();

export async function processInboundStainQcSignOffEvent(p: StainQcSignOffEventPayload): Promise<{ messageId: string; outcome: StainQcSignOffOutcome; batchId?: string }> {
  if (processed.has(p.messageId)) return { messageId: p.messageId, outcome: 'already-applied' };
  if (!p.masterBarcode || (p.result !== 'pass' && p.result !== 'fail')) return { messageId: p.messageId, outcome: 'invalid-payload' };
  const found = await batchService.getByMasterBarcode(p.masterBarcode);
  if (!found.ok) return { messageId: p.messageId, outcome: 'batch-not-found' };
  const batch = found.data;
  if (batch.processingNode !== 'Staining') return { messageId: p.messageId, outcome: 'wrong-node', batchId: batch.id };
  await stainQcSystem.openRun({
    batchId: batch.id, masterBarcode: batch.masterBarcode, stainerIdOrCode: p.instrumentCode ?? null,
    slides: batch.items.filter(i => i.materialType === 'slide').map(i => ({ slideId: i.displayId, caseAccession: i.caseAccession })),
  });
  const r = await stainQcSystem.vendorRunResult({ batchId: batch.id, result: p.result, failedSlideIds: p.failedSlideIds, vendorRef: p.vendorRef });
  if (!r.ok) return { messageId: p.messageId, outcome: r.error === 'ALREADY_DECIDED' ? 'already-decided' : r.error === 'NOT_VENDOR_MODE' ? 'not-vendor-mode' : 'invalid-payload', batchId: batch.id };
  processed.add(p.messageId);
  return { messageId: p.messageId, outcome: 'applied', batchId: batch.id };
}

/** Test-only reset. */
export function _resetProcessedStainQcSignOffMessageIdsForTests(): void { processed.clear(); }
