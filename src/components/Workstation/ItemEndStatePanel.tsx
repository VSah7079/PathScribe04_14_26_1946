// src/components/Workstation/ItemEndStatePanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 731 (Lab Workflow & Batch spec §10.5): the item's end state at the bench
// (the Microtome for a block, Slide Distribution for a slide): what it is now,
// with the reason, who and when, and an inline form to record a new one
// (exhausted, returned to storage, archived, sent out, consumed for testing,
// discarded). A quick-pick reason fills the reason field; the reason is
// required. Closed until opened, so it adds nothing to a routine cut. Recording
// needs material:end-state:record (checked again in the service).
// Presentation only: hooks/useItemEndState.ts loads and records.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useItemEndState } from '@/hooks/useItemEndState';
import { endStatesFor, END_STATE_REASON_KEYS } from '@/services/itemEndStates/itemEndStateRules';
import type { ItemEndStateKind, ItemEndStateMaterial } from '@/services/itemEndStates/IItemEndStateService';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { LoadingState } from '@/components/Common/LoadingState';
import { formatDateTime } from '@/utils/formatDate';
import './ItemEndStatePanel.css';

interface Props {
  itemId: string;
  materialType: ItemEndStateMaterial;
  caseAccession: string;
  stationId?: string | null;
}

const ItemEndStatePanel: React.FC<Props> = ({ itemId, materialType, caseAccession, stationId }) => {
  const { t, i18n } = useTranslation();
  const es = useItemEndState({ itemId, materialType, caseAccession, stationId });
  const choices = endStatesFor(materialType);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ItemEndStateKind>(choices[0]);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ key: string; warn: boolean } | null>(null);

  const submit = async () => {
    setBusy(true);
    const outcome = await es.record(state, reason);
    setBusy(false);
    if (outcome === 'recorded') { setOpen(false); setReason(''); setMessage({ key: 'itemEndState.recorded', warn: false }); return; }
    setMessage({ key: `itemEndState.errors.${outcome}`, warn: true });
  };

  return (
    <section className="ps-end-state" aria-label={t('itemEndState.title')}>
      <div className="ps-end-state-head">
        <span className="ps-end-state-title">{t('itemEndState.title')}</span>
        {es.loading && <LoadingState variant="inline" className="ps-end-state-note" label={t('itemEndState.loading')} />}
        {!es.loading && !es.current && <span className="ps-end-state-note">{t('itemEndState.none')}</span>}
        {es.current && (
          <span className="ps-end-state-current">
            <strong>{t(`itemEndState.states.${es.current.state}`)}</strong>
            {t('itemEndState.currentDetail', { reason: es.current.reason, name: es.current.userName, when: formatDateTime(es.current.at, i18n.language) })}
          </span>
        )}
        {!open && (
          <button type="button" className="ps-end-state-toggle" onClick={() => { setOpen(true); setMessage(null); }}>{t('itemEndState.recordButton')}</button>
        )}
      </div>
      {message && <p className={`ps-end-state-note${message.warn ? ' ps-end-state-note--warn' : ''}`} role={message.warn ? 'alert' : 'status'}>{t(message.key)}</p>}
      {open && (
        <div className="ps-end-state-form">
          <label className="ps-end-state-label" htmlFor={`ps-end-state-kind-${itemId}`}>{t('itemEndState.stateLabel')}</label>
          <select id={`ps-end-state-kind-${itemId}`} className="ps-end-state-input" value={state} onChange={e => { setState(e.target.value as ItemEndStateKind); setReason(''); }}>
            {choices.map(s => <option key={s} value={s}>{t(`itemEndState.states.${s}`)}</option>)}
          </select>
          <div className="ps-end-state-picks" role="group" aria-label={t('itemEndState.quickReasons')}>
            {END_STATE_REASON_KEYS[state].map(k => (
              <button key={k} type="button" className="ps-end-state-pick" onClick={() => setReason(t(`itemEndState.reasons.${state}.${k}`))}>
                {t(`itemEndState.reasons.${state}.${k}`)}
              </button>
            ))}
          </div>
          <label className="ps-end-state-label" htmlFor={`ps-end-state-reason-${itemId}`}>{t('itemEndState.reasonLabel')}<span className="ps-conf-required"> *</span></label>
          <input id={`ps-end-state-reason-${itemId}`} className="ps-end-state-input" value={reason} onChange={e => setReason(e.target.value)} />
          <div className="ps-end-state-actions">
            <CapabilityButton capability="material:end-state:record" className="ps-btn-primary" disabled={busy || !reason.trim()} onClick={submit}>
              {t('itemEndState.save')}
            </CapabilityButton>
            <button type="button" className="ps-btn-secondary" disabled={busy} onClick={() => setOpen(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}
    </section>
  );
};

export default ItemEndStatePanel;
