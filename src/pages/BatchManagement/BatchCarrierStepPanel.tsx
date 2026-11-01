// src/pages/BatchManagement/BatchCarrierStepPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 726 (Lab Workflow & Batch spec, Decision 1, §2 rows 1-2): on Batch
// Detail, the carrier's trip. Says plainly when the carrier is closed (not only
// the status badge), whether its manifest is sealed (with Seal), the steps it
// has moved through, the Move to <next step> action, and when this computer's
// station works on a different step. Rules: services/batches/stationCarrierRules.ts.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { batchService } from '@/services';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { formatDateTime } from '@/utils/formatDate';
import { BATCH_NOT_PERMITTED, isBatchErrorCode, type Batch, type BatchProcessingNode } from '@/services/batches/IBatchService';
import { NEXT_NODE, advanceProblem, sealProblem } from '@/services/batches/stationCarrierRules';
import './BatchCarrierStepPanel.css';

interface Props {
  batch: Batch;
  onBatchUpdated: (batch: Batch) => void;
  userId: string;
  userName: string;
  stationId: string | null;
  /** This computer's station, for the "works on another step" note. */
  stationName?: string;
  stationNodes: readonly BatchProcessingNode[];
}

export const BatchCarrierStepPanel: React.FC<Props> = ({ batch, onBatchUpdated, userId, userName, stationId, stationName, stationNodes }) => {
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState(false);
  const node = (n: BatchProcessingNode) => t(`batchManagement.nodes.${n}`);
  const when = (iso?: string) => (iso ? formatDateTime(iso, i18n.language) : '—');
  const refusal = (error: string) => (error === BATCH_NOT_PERMITTED ? t('batchDetail.notPermitted') : isBatchErrorCode(error) ? t(`batchDetail.errors.${error}`, { barcode: batch.masterBarcode }) : t('batchDetail.actionFailed'));
  const next = NEXT_NODE[batch.processingNode];
  // Decal keeps its own "Transfer to Processing" button on Batch Detail (now the same move, Decision 9).
  const canAdvance = !!next && batch.processingNode !== 'Decal / Special Processing' && advanceProblem(batch, next) === null;
  const canSeal = sealProblem(batch) === null;
  const otherStep = !!stationId && stationNodes.length > 0 && !stationNodes.includes(batch.processingNode);

  const run = async (call: () => Promise<{ ok: true; data: Batch } | { ok: false; error: string }>, doneKey: string) => {
    setBusy(true);
    const res = await call();
    setBusy(false);
    if (res.ok !== true) { toast.error(refusal(res.error)); return; }
    toast.success(t(doneKey, { barcode: batch.masterBarcode, node: node(res.data.processingNode), count: res.data.items.length }));
    onBatchUpdated(res.data);
  };

  return (
    <div className="ps-batch-carrier-steps">
      {batch.status === 'complete' && <p className="ps-batch-carrier-closed" role="status">{t('batchCarrier.closedComplete', { at: when(batch.completedAt) })}</p>}
      {batch.status === 'aborted' && <p className="ps-batch-carrier-closed" role="status">{t('batchCarrier.closedAborted', { at: when(batch.abortedAt) })}</p>}
      {otherStep && (
        <p className="ps-batch-carrier-note" role="status">
          {t('batchCarrier.otherStep', { station: stationName ?? stationId, stationSteps: stationNodes.map(node).join(', '), node: node(batch.processingNode) })}
        </p>
      )}
      {batch.sealedAt && <p className="ps-batch-carrier-note">{t('batchCarrier.sealedBy', { name: batch.sealedByUserName ?? '—', at: when(batch.sealedAt) })}</p>}
      {(batch.nodeHistory ?? []).length > 0 && (
        <ol className="ps-batch-carrier-history" aria-label={t('batchCarrier.historyLabel')}>
          {(batch.nodeHistory ?? []).map((h, i) => (
            <li key={`${h.at}-${i}`}>{t('batchCarrier.historyStep', { from: node(h.fromNode), to: node(h.toNode), name: h.byUserName, at: when(h.at) })}</li>
          ))}
        </ol>
      )}
      {(canSeal || canAdvance) && (
        <div className="ps-batch-carrier-actions">
          {canSeal && (
            <CapabilityButton capability="batch:manifest:seal" className="ps-btn-secondary" disabled={busy} onClick={() => { void run(() => batchService.sealManifest(batch.id, userId, userName), 'batchCarrier.sealedToast'); }}>
              {t('batchCarrier.seal')}
            </CapabilityButton>
          )}
          {canAdvance && next && (
            <CapabilityButton capability="batch:carrier:advance" className="ps-btn-primary" disabled={busy} onClick={() => { void run(() => batchService.advanceToNode(batch.id, next, userId, userName, stationId ?? undefined), 'batchCarrier.movedToast'); }}>
              {t('batchCarrier.moveTo', { node: node(next) })}
            </CapabilityButton>
          )}
        </div>
      )}
    </div>
  );
};
