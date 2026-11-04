// src/components/MockInterfaceEngine/SimulatedEngineLogPanel.tsx
// Batch 605: what the simulated interface engine received from PathScribe, labelled Simulated.
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  clearSimulatedEngineMessages, listSimulatedEngineMessages, subscribeSimulatedEngine, type SimulatedEngineMessage,
} from '@/services/mockInterfaceEngine/simulatedEngineReceiver';

const SimulatedEngineLogPanel: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<readonly SimulatedEngineMessage[]>(() => listSimulatedEngineMessages());
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => subscribeSimulatedEngine(() => setItems([...listSimulatedEngineMessages()])), []);
  const open = items.find(i => i.id === openId) ?? null;

  return (
    <div className="ps-panel-box ps-mt-20" data-testid="simulated-engine-log">
      <h3 className="ps-panel-heading"><span className="ps-conf-badge">{t('simulatedEngine.badge')}</span> {t('simulatedEngine.title')}</h3>
      <p className="ps-helper-text">{t('simulatedEngine.explain')}</p>
      <button className="ps-conf-btn-secondary" disabled={items.length === 0} onClick={() => { clearSimulatedEngineMessages(); setOpenId(null); }}>
        {t('simulatedEngine.clear')}
      </button>
      {items.length === 0 ? <p className="ps-helper-text" data-testid="simulated-engine-empty">{t('simulatedEngine.empty')}</p> : (
        <table className="ps-conf-table">
          <thead><tr><th>{t('simulatedEngine.when')}</th><th>{t('simulatedEngine.type')}</th><th>{t('simulatedEngine.outcome')}</th><th /></tr></thead>
          <tbody>
            {items.map(m => (
              <tr key={m.id}>
                <td>{new Date(m.receivedAt).toLocaleString(i18n.language)}</td>
                <td>{m.transactionType}</td>
                <td>{t(`simulatedEngine.outcomes.${m.outcome}`)}{m.reason ? ` (${m.reason})` : ''}</td>
                <td><button className="ps-conf-btn-secondary" onClick={() => setOpenId(m.id)}>{t('simulatedEngine.open')}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {open && (
        <div data-capture-hide="true" className="ps-conf-backdrop" onClick={() => setOpenId(null)}>
          <div className="ps-conf-modal" role="dialog" aria-label={open.transactionType} onClick={e => e.stopPropagation()}>
            <div className="ps-conf-modal-header"><span className="ps-conf-badge">{t('simulatedEngine.badge')}</span> {open.transactionType}</div>
            <div className="ps-conf-modal-body"><pre data-phi="name">{open.envelopeJson}</pre></div>
            <div className="ps-conf-modal-footer"><button className="ps-conf-btn-secondary" onClick={() => setOpenId(null)}>{t('simulatedEngine.close')}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulatedEngineLogPanel;
