// src/pages/AddOnOrderPage/components/OrderTrackingDashboard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per the spec's own §4 "Real-Time Pathologist Order Tracking:
// Requested → Block Retrieved → Cut/Pending Stain → Stained/QC →
// Checked Out/Scanned" and §5 "Exception Handling & Block Exhaustion...
// Pathologist Notification Loop." One combined dashboard — every real
// add-on order this case has, its live derived stage, and (for the one
// with an open exception) the real cancel/modify/approve-destructive-
// cut response actions the spec calls for. See
// useAddOnOrderStation.ts's own header for why this doubles as the
// spec's own "LIS inbox" rather than a separate notification surface.
//
// Batch 403 (PS-359):
//   - The exception note and the pathologist's response note follow the
//     organisation's Field Requirements (page "addOnOrder"): starred when
//     required, "Still required", buttons off until given.
//   - "Modify & Resubmit" used to resubmit the order unchanged (it sent no
//     changes). It now opens the order's level depth and bench instructions
//     to edit before resubmitting.
//   - Approving destructive cutting is greyed without
//     add-on:exception:approve-destructive-cut; cancel and modify without
//     add-on:order:place (checked again in services/addOnOrders).
//   - Exception reasons, routing queues and panel names are shown in the
//     user's language (stored in English); each form is kept per order, so
//     typing on one row no longer fills another's.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TrackedAddOnOrder } from '../hooks/useAddOnOrderStation';
import { BLOCK_EXCEPTION_REASONS, type BlockExceptionReason, type AddOnRouteQueue } from '@/types/case/AddOnOrder';
import { ADD_ON_ROUTE_QUEUE_KEYS, BLOCK_EXCEPTION_REASON_KEYS } from '@/utils/addOnOrderOperations';
import { addOnExceptionMissing, addOnResponseMissing, addOnOrderFieldRequired } from '@/services';
import type { ResolvedFieldRequirement } from '@/services/fieldRequirements/fieldRequirementRules';
import type { AddOnExceptionResponse } from '@/services/addOnOrders/addOnOrderActions';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { formatList } from '@/utils/formatList';

export interface OrderTrackingDashboardProps {
  orders: TrackedAddOnOrder[];
  caseId: string;
  requirements: readonly ResolvedFieldRequirement[];
  onMarkBlockRetrieved: (stainOrderId: string) => void;
  onFlagException: (stainOrderId: string, reason: BlockExceptionReason, note: string) => void;
  onResolveException: (
    stainOrderId: string, action: AddOnExceptionResponse, responseNote: string,
    modifyChanges?: { levelDepthMicrons?: number; cuttingInstructions?: string },
  ) => void;
}

const STAGE_CLASS: Record<string, string> = {
  Requested: 'ps-addon-stage-badge--requested',
  'Block Retrieved': 'ps-addon-stage-badge--retrieved',
  'Cut / Pending Stain': 'ps-addon-stage-badge--cutting',
  'Stained / QC': 'ps-addon-stage-badge--staining',
  'Checked Out / Scanned': 'ps-addon-stage-badge--done',
  Exception: 'ps-addon-stage-badge--exception',
  Cancelled: 'ps-addon-stage-badge--cancelled',
};

const OrderTrackingDashboard: React.FC<OrderTrackingDashboardProps> = ({ orders, caseId, requirements, onMarkBlockRetrieved, onFlagException, onResolveException }) => {
  const { t, i18n } = useTranslation();
  const [flagTargetId, setFlagTargetId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState<BlockExceptionReason>('Block exhausted');
  const [flagNote, setFlagNote] = useState('');
  const [responseNotes, setResponseNotes] = useState<Record<string, string>>({});
  const [modifyTargetId, setModifyTargetId] = useState<string | null>(null);
  const [modifyDepth, setModifyDepth] = useState('');
  const [modifyInstructions, setModifyInstructions] = useState('');

  const stillRequired = (missing: string[]) => missing.length > 0 && (
    <p className="ps-field-still-required" role="status">
      {t('fieldRequirements.stillRequired', { fields: formatList(missing.map(id => t(`fieldRequirements.fields.addOnOrder.${id}`)), i18n.language) })}
    </p>
  );
  const star = (fieldId: string) => addOnOrderFieldRequired(requirements, fieldId) && <span className="ps-conf-required"> *</span>;

  if (orders.length === 0) {
    return (
      <div className="ps-addon-panel ps-addon-tracking-panel">
        <p className="ps-addon-panel-title">{t('addOnOrder.tracking.title')}</p>
        <div className="ps-addon-empty">{t('addOnOrder.tracking.empty')}</div>
      </div>
    );
  }

  const flagMissing = addOnExceptionMissing(flagNote, requirements);

  return (
    <div className="ps-addon-panel ps-addon-tracking-panel">
      <p className="ps-addon-panel-title">{t('addOnOrder.tracking.title')}<span>{t('addOnOrder.tracking.count', { count: orders.length })}</span></p>
      <ul className="ps-addon-tracking-list">
        {orders.map(row => {
          const orderId = row.order.id;
          const responseNote = responseNotes[orderId] ?? '';
          const responseMissing = addOnResponseMissing(responseNote, requirements);
          const queueKey = row.order.routedQueueLabel ? ADD_ON_ROUTE_QUEUE_KEYS[row.order.routedQueueLabel as AddOnRouteQueue] : undefined;
          const reason = row.order.exception?.reason as BlockExceptionReason | undefined;
          const answer = (action: AddOnExceptionResponse, changes?: { levelDepthMicrons?: number; cuttingInstructions?: string }) => {
            if (responseMissing.length > 0) return;
            onResolveException(orderId, action, responseNote, changes);
            setResponseNotes(prev => ({ ...prev, [orderId]: '' }));
            setModifyTargetId(null);
          };
          return (
            <li key={orderId} className="ps-addon-tracking-row">
              <div className="ps-addon-tracking-row-top">
                <div>
                  <strong>{row.specimenLabel}{row.blockLabel}</strong> — {row.order.stainName}
                  {row.order.addOnPanelId && <span className="ps-addon-cart-panel-badge">{t('addOnOrder.summary.panelBadge', { panel: t(`addOnOrder.panels.${row.order.addOnPanelId}`) })}</span>}
                </div>
                <span className={`ps-addon-stage-badge ${STAGE_CLASS[row.stage] ?? ''}`}>{t(`addOnOrder.tracking.stage.${row.stage.replace(/[ /]/g, '')}`)}</span>
              </div>
              <div className="ps-addon-tracking-row-meta">
                {[
                  row.order.orderedByPathologistName ? t('addOnOrder.tracking.orderedBy', { name: row.order.orderedByPathologistName }) : '',
                  row.order.addOnPriority ? t(`addOnOrder.priority.${row.order.addOnPriority.replace(/[\s/-]+/g, '_')}`) : '',
                  queueKey ? t(`addOnOrder.queues.${queueKey}`) : '',
                  row.order.sendOutReferenceLabName ? t('addOnOrder.tracking.sendOutTo', { lab: row.order.sendOutReferenceLabName }) : '',
                ].filter(Boolean).map(text => <span key={text} className="ps-addon-meta-item">{text}</span>)}
              </div>

              {row.stage === 'Requested' && (
                <button type="button" className="ps-addon-row-btn" onClick={() => onMarkBlockRetrieved(orderId)}>
                  {t('addOnOrder.tracking.markRetrieved')}
                </button>
              )}

              {row.stage !== 'Exception' && row.stage !== 'Cancelled' && row.stage !== 'Checked Out / Scanned' && (
                flagTargetId === orderId ? (
                  <div className="ps-addon-exception-form">
                    <label className="ps-addon-field-label" htmlFor={`addon-flag-reason-${orderId}`}>{t('addOnOrder.tracking.exceptionReason')}</label>
                    <select id={`addon-flag-reason-${orderId}`} className="ps-addon-field-input" value={flagReason} onChange={e => setFlagReason(e.target.value as BlockExceptionReason)}>
                      {BLOCK_EXCEPTION_REASONS.map(r => <option key={r} value={r}>{t(`addOnOrder.exceptionReasons.${BLOCK_EXCEPTION_REASON_KEYS[r]}`)}</option>)}
                    </select>
                    <label className="ps-addon-field-label" htmlFor={`addon-flag-note-${orderId}`}>{t('addOnOrder.tracking.exceptionNoteLabel')}{star('exceptionNote')}</label>
                    <input id={`addon-flag-note-${orderId}`} className="ps-addon-field-input" placeholder={t('addOnOrder.tracking.exceptionNote') ?? ''} value={flagNote} onChange={e => setFlagNote(e.target.value)} />
                    {stillRequired(flagMissing)}
                    <div className="ps-addon-exception-actions">
                      <button type="button" className="ps-btn-primary" disabled={flagMissing.length > 0}
                        onClick={() => { onFlagException(orderId, flagReason, flagNote); setFlagTargetId(null); setFlagNote(''); }}>
                        {t('addOnOrder.tracking.confirmFlag')}
                      </button>
                      <button type="button" className="ps-btn-secondary" onClick={() => setFlagTargetId(null)}>{t('addOnOrder.tracking.cancelFlag')}</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="ps-addon-row-btn ps-addon-row-btn--warn" onClick={() => { setFlagTargetId(orderId); setFlagNote(''); }}>
                    {t('addOnOrder.tracking.flagException')}
                  </button>
                )
              )}

              {row.stage === 'Exception' && (
                <div className="ps-addon-exception-banner">
                  <div>
                    <strong>{reason && BLOCK_EXCEPTION_REASON_KEYS[reason] ? t(`addOnOrder.exceptionReasons.${BLOCK_EXCEPTION_REASON_KEYS[reason]}`) : reason}</strong>
                    {row.order.exception?.note && ` — ${row.order.exception.note}`}
                  </div>
                  <div className="ps-addon-tracking-row-meta">{t('addOnOrder.tracking.flaggedBy', { name: row.order.exception?.flaggedByName })}</div>
                  <label className="ps-addon-field-label" htmlFor={`addon-response-${orderId}`}>{t('addOnOrder.tracking.responseNoteLabel')}{star('responseNote')}</label>
                  <input id={`addon-response-${orderId}`} className="ps-addon-field-input" placeholder={t('addOnOrder.tracking.responseNote') ?? ''}
                    value={responseNote} onChange={e => setResponseNotes(prev => ({ ...prev, [orderId]: e.target.value }))} />
                  {stillRequired(responseMissing)}

                  {modifyTargetId === orderId ? (
                    <div className="ps-addon-exception-form">
                      <label className="ps-addon-field-label" htmlFor={`addon-modify-depth-${orderId}`}>{t('addOnOrder.builder.levelDepth')}</label>
                      <input id={`addon-modify-depth-${orderId}`} className="ps-addon-field-input" type="number" min={1} value={modifyDepth} onChange={e => setModifyDepth(e.target.value)} />
                      <label className="ps-addon-field-label" htmlFor={`addon-modify-instructions-${orderId}`}>{t('addOnOrder.summary.cuttingInstructions')}</label>
                      <textarea id={`addon-modify-instructions-${orderId}`} className="ps-addon-field-textarea" rows={2} value={modifyInstructions} onChange={e => setModifyInstructions(e.target.value)} />
                      <div className="ps-addon-exception-actions">
                        <CapabilityButton capability="add-on:order:place" context={{ caseId }} className="ps-btn-primary" disabled={responseMissing.length > 0}
                          onClick={() => answer('modify', {
                            levelDepthMicrons: modifyDepth.trim() ? Number(modifyDepth) : undefined,
                            cuttingInstructions: modifyInstructions.trim() || undefined,
                          })}>
                          {t('addOnOrder.tracking.resubmit')}
                        </CapabilityButton>
                        <button type="button" className="ps-btn-secondary" onClick={() => setModifyTargetId(null)}>{t('addOnOrder.tracking.cancelFlag')}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="ps-addon-exception-actions">
                      <CapabilityButton capability="add-on:exception:approve-destructive-cut" context={{ caseId }} className="ps-btn-primary" disabled={responseMissing.length > 0}
                        onClick={() => answer('approve_destructive_cut')}>
                        {t('addOnOrder.tracking.approveDestructive')}
                      </CapabilityButton>
                      <CapabilityButton capability="add-on:order:place" context={{ caseId }} className="ps-btn-secondary"
                        onClick={() => { setModifyTargetId(orderId); setModifyDepth(row.order.levelDepthMicrons?.toString() ?? ''); setModifyInstructions(row.order.cuttingInstructions ?? ''); }}>
                        {t('addOnOrder.tracking.modify')}
                      </CapabilityButton>
                      <CapabilityButton capability="add-on:order:place" context={{ caseId }} className="ps-btn-secondary" disabled={responseMissing.length > 0}
                        onClick={() => answer('cancel')}>
                        {t('addOnOrder.tracking.cancelOrder')}
                      </CapabilityButton>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default OrderTrackingDashboard;
