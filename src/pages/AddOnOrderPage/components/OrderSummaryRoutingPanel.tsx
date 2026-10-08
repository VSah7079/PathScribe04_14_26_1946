// src/pages/AddOnOrderPage/components/OrderSummaryRoutingPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per the spec's own Right Panel: "Order Summary & Routing —
// active request cart, priority selector, target lab routing, digital
// signature/submission." "Digital signature" here is the real,
// existing actor identity (orderedByPathologistId/Name, stamped by
// createAddOnOrder) — this app has no separate e-signature capture
// mechanism anywhere to reuse or fabricate one for, so submission
// itself (by the authenticated pathologist) is what's recorded as the
// real, attributable order-placing act, same posture every other real
// "ordered by"/"assigned by" field in this app already takes.
//
// Batch 403 (PS-359, Pete): each molecular/send-out line carries its own
// reference lab, filled in from the test's default and offering only the labs
// approved for that test (Stain Dictionary); with none approved, every active
// reference lab. The lab is always required at submission (Field Requirements
// "sendOutLab", locked: an unrouted send-out leaves blind spots in the courier
// and tracking logs). Required fields are starred, "Still required: …" says
// what is missing, Submit stays off until it is complete and is greyed without
// add-on:order:place, and "submit order" by voice (ADD_ON_SUBMIT_ORDER) does
// what the button does. Routing queues and panel names are translated.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Facility } from '@/services/facilities/IFacilityService';
import type { ScanStation } from '@/services/scanStations/IScanStationService';
import { ADD_ON_ORDER_PRIORITIES, SLIDE_MEDIA_TYPES, type AddOnOrderPriority, type SlideMediaType } from '@/types/case/AddOnOrder';
import { resolveSendOutLabChoices, type AddOnOrderLineInput, type AddOnOrderSubmissionInput } from '@/utils/addOnOrderOperations';
import { actionRegistryService, addOnSubmitMissing, addOnOrderFieldRequired, molecularRoutingChoices } from '@/services';
import type { ResolvedFieldRequirement } from '@/services/fieldRequirements/fieldRequirementRules';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { formatList } from '@/utils/formatList';

export interface CartLine extends AddOnOrderLineInput {
  cartId: string;
}

export interface OrderSummaryRoutingPanelProps {
  cart: CartLine[];
  onRemoveLine: (cartId: string) => void;
  selectedBlockIds: string[];
  priority: AddOnOrderPriority;
  onPriorityChange: (p: AddOnOrderPriority) => void;
  slideMediaType: SlideMediaType;
  onSlideMediaTypeChange: (m: SlideMediaType) => void;
  cuttingInstructions: string;
  onCuttingInstructionsChange: (v: string) => void;
  referenceLabs: Facility[];
  /** Batch 403: the reference lab for one molecular/send-out line. */
  onLineLabChange: (cartId: string, labId: string, labName: string) => void;
  /** Batch 467: run a molecular line in-house or send it out. */
  onLineRoutingChange?: (cartId: string, routing: 'IN_HOUSE' | 'SEND_OUT') => void;
  /** Batch 467: the case's performing lab (which molecular tests it runs in-house). */
  performingLabFacilityId?: string;
  stationsForLine: (line: AddOnOrderLineInput) => ScanStation[];
  performingLabResolved: boolean;
  onSubmit: (submission: AddOnOrderSubmissionInput) => void;
  requirements: readonly ResolvedFieldRequirement[];
  caseId: string;
}

const OrderSummaryRoutingPanel: React.FC<OrderSummaryRoutingPanelProps> = ({
  cart, onRemoveLine, selectedBlockIds, priority, onPriorityChange, slideMediaType, onSlideMediaTypeChange,
  cuttingInstructions, onCuttingInstructionsChange, referenceLabs, onLineLabChange, onLineRoutingChange, performingLabFacilityId,
  stationsForLine, performingLabResolved, onSubmit, requirements, caseId,
}) => {
  const { t, i18n } = useTranslation();
  const missing = addOnSubmitMissing({ blockIds: selectedBlockIds, lines: cart, cuttingInstructions }, requirements);
  const star = (fieldId: string) => addOnOrderFieldRequired(requirements, fieldId) && <span className="ps-conf-required"> *</span>;

  const handleSubmit = () => {
    if (missing.length > 0) return;
    onSubmit({ priority, slideMediaType, cuttingInstructions: cuttingInstructions.trim() || undefined });
  };
  const submitRef = useRef(handleSubmit);
  submitRef.current = handleSubmit;
  useEffect(() => actionRegistryService.onAction((actionId: string) => {
    if (actionId === 'ADD_ON_SUBMIT_ORDER') submitRef.current();
  }), []);

  return (
    <div className="ps-addon-panel">
      <p className="ps-addon-panel-title">{t('addOnOrder.summary.title')}</p>

      <div className="ps-addon-cart-meta">{t('addOnOrder.summary.blocksSelected', { count: selectedBlockIds.length })}</div>

      {cart.length === 0 ? (
        <div className="ps-addon-empty">{t('addOnOrder.summary.emptyCart')}</div>
      ) : (
        <ul className="ps-addon-cart-list">
          {cart.map(line => (
            <li key={line.cartId} className="ps-addon-cart-row">
              <div>
                <strong>{line.stainType.name}</strong>
                {line.panelId && <span className="ps-addon-cart-panel-badge">{t('addOnOrder.summary.panelBadge', { panel: t(`addOnOrder.panels.${line.panelId}`) })}</span>}
                {line.levelDepthMicrons !== undefined && <div className="ps-addon-cart-row-meta">{t('addOnOrder.summary.microns', { count: line.levelDepthMicrons })}</div>}
                {line.controlMode && line.controlMode !== 'none' && <div className="ps-addon-cart-row-meta">{t(`addOnOrder.builder.controlMode.${line.controlMode}`)}</div>}
                {line.orderKind !== 'molecular' && (
                  <div className="ps-addon-cart-row-meta">
                    {stationsForLine(line).length > 0
                      ? t('addOnOrder.summary.routesTo', { stations: formatList(stationsForLine(line).map(s => s.name), i18n.language) })
                      : t('addOnOrder.summary.routesToQueueOnly')}
                  </div>
                )}
                {line.orderKind === 'molecular' && (() => {
                  // Batch 467: in-house where the performing lab runs the test (services/molecularOrders/molecularRouting.ts).
                  const routing = molecularRoutingChoices(line.stainType, performingLabFacilityId);
                  const current = line.molecularRouting ?? routing.defaultRouting;
                  const routingId = `addon-routing-${line.cartId}`;
                  const routingRow = (
                    <div className="ps-addon-cart-row-meta">
                      {routing.choices.length > 1 ? (
                        <>
                          <label className="ps-addon-field-label" htmlFor={routingId}>{t('addOnOrder.summary.molecularRouting')}</label>
                          <select id={routingId} className="ps-addon-field-input" value={current} onChange={e => onLineRoutingChange?.(line.cartId, e.target.value as 'IN_HOUSE' | 'SEND_OUT')}>
                            {routing.choices.map(r => <option key={r} value={r}>{t(`molecularOrders.routing.${r}`)}</option>)}
                          </select>
                        </>
                      ) : <div>{t('addOnOrder.summary.sendOutOnly')}</div>}
                    </div>
                  );
                  if (current === 'IN_HOUSE') return <>{routingRow}<div className="ps-addon-cart-row-meta">{t('addOnOrder.summary.inHouseQueue')}</div></>;
                  const { choices, limited } = resolveSendOutLabChoices(line.stainType, referenceLabs);
                  const id = `addon-lab-${line.cartId}`;
                  return (
                    <>{routingRow}
                    <div className="ps-addon-cart-row-meta">
                      <label className="ps-addon-field-label" htmlFor={id}>{t('addOnOrder.summary.sendOutLab')}{star('sendOutLab')}</label>
                      <select id={id} className="ps-addon-field-input" value={line.sendOutReferenceLabFacilityId ?? ''}
                        onChange={e => { const f = choices.find(c => c.id === e.target.value); onLineLabChange(line.cartId, e.target.value, f?.name ?? ''); }}>
                        <option value="">{t('addOnOrder.summary.selectLab')}</option>
                        {choices.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                      <div>{t(limited ? 'addOnOrder.summary.labsApprovedForTest' : 'addOnOrder.summary.labsAll')}</div>
                    </div>
                    </>
                  );
                })()}
              </div>
              <button type="button" className="ps-addon-row-btn" onClick={() => onRemoveLine(line.cartId)}>{t('addOnOrder.summary.remove')}</button>
            </li>
          ))}
        </ul>
      )}

      {!performingLabResolved && cart.length > 0 && (
        <div className="ps-addon-warning-banner">{t('addOnOrder.summary.noPerformingLab')}</div>
      )}

      <label className="ps-addon-field-label">{t('addOnOrder.summary.priority')}</label>
      <div className="ps-addon-kind-toggle">
        {ADD_ON_ORDER_PRIORITIES.map(p => (
          <button key={p} type="button" className={`ps-addon-toggle-btn${priority === p ? ' ps-addon-toggle-btn--active' : ''}`} onClick={() => onPriorityChange(p)}>
            {t(`addOnOrder.priority.${p.replace(/[\s/-]+/g, '_')}`)}
          </button>
        ))}
      </div>

      <label className="ps-addon-field-label">{t('addOnOrder.summary.slideMedia')}</label>
      <div className="ps-addon-kind-toggle">
        {SLIDE_MEDIA_TYPES.map(m => (
          <button key={m} type="button" className={`ps-addon-toggle-btn${slideMediaType === m ? ' ps-addon-toggle-btn--active' : ''}`} onClick={() => onSlideMediaTypeChange(m)}>
            {t(`addOnOrder.slideMedia.${m.replace(/ /g, '_')}`)}
          </button>
        ))}
      </div>

      <label className="ps-addon-field-label" htmlFor="addon-cutting-instructions">{t('addOnOrder.summary.cuttingInstructions')}{star('cuttingInstructions')}</label>
      <textarea id="addon-cutting-instructions" className="ps-addon-field-textarea" rows={3} value={cuttingInstructions} onChange={e => onCuttingInstructionsChange(e.target.value)} />

      {missing.length > 0 && (
        <p className="ps-field-still-required" role="status">
          {t('fieldRequirements.stillRequired', { fields: formatList(missing.map(id => t(`fieldRequirements.fields.addOnOrder.${id}`)), i18n.language) })}
        </p>
      )}
      <CapabilityButton capability="add-on:order:place" context={{ caseId }} className="ps-btn-primary ps-addon-submit-btn" disabled={missing.length > 0} onClick={handleSubmit}>
        {t('addOnOrder.summary.submit')}
      </CapabilityButton>
    </div>
  );
};

export default OrderSummaryRoutingPanel;
