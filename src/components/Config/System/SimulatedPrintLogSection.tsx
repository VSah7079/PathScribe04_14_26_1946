// src/components/Config/System/SimulatedPrintLogSection.tsx
// ─────────────────────────────────────────────────
// Batch 606: every label, engraving, report print and scan event the demo sent
// down a route with no real transport yet, labelled Simulated
// (services/printing/simulatedPrint.ts). The failure switch makes the next
// simulated sends come back failed, so the failure path can be shown.
// ─────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  clearSimulatedPrints, getSimulatedPrintFailure, listSimulatedPrints, setSimulatedPrintFailure, subscribeSimulatedPrint,
  type SimulatedPrintRecord,
} from '@/services/printing/simulatedPrint';

const SimulatedPrintLogSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<readonly SimulatedPrintRecord[]>(() => listSimulatedPrints());
  const [failing, setFailing] = useState<boolean>(() => getSimulatedPrintFailure());

  useEffect(() => subscribeSimulatedPrint(() => { setItems([...listSimulatedPrints()]); setFailing(getSimulatedPrintFailure()); }), []);

  return (
    <div className="ps-conf-section" data-testid="simulated-print-log">
      <h2 className="ps-conf-section-title">{t('simulatedPrint.title')}</h2>
      <p className="ps-conf-section-subtitle">{t('simulatedPrint.explain')}</p>
      <label className="ps-conf-value">
        <input type="checkbox" checked={failing} data-testid="simulated-print-failure"
          onChange={e => setSimulatedPrintFailure(e.target.checked)} /> {t('simulatedPrint.failureSwitch')}
      </label>
      <div>
        <span className="ps-conf-value">{t('simulatedPrint.count', { count: items.length })}</span>{' '}
        <button className="ps-conf-btn-secondary" disabled={items.length === 0}
          onClick={() => { if (window.confirm(t('simulatedPrint.clearConfirm'))) clearSimulatedPrints(); }}>{t('simulatedPrint.clear')}</button>
      </div>
      {items.length === 0 ? (
        <p className="ps-conf-section-subtitle" data-testid="simulated-print-empty">{t('simulatedPrint.empty')}</p>
      ) : (
        <table className="ps-conf-table">
          <thead><tr>
            <th>{t('simulatedPrint.when')}</th><th>{t('simulatedPrint.kind')}</th><th>{t('simulatedPrint.transport')}</th>
            <th>{t('simulatedPrint.destination')}</th><th>{t('simulatedPrint.copies')}</th><th>{t('simulatedPrint.outcome')}</th>
          </tr></thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id}>
                <td>{new Date(r.at).toLocaleString(i18n.language)}</td>
                <td><span className="ps-conf-badge">{t('simulatedPrint.badge')}</span> {t(`simulatedPrint.kinds.${r.kind}`)}</td>
                <td>{r.transport}</td><td>{r.destination}</td><td>{r.copies}</td>
                <td>{t(r.outcome === 'delivered' ? 'simulatedPrint.delivered' : 'simulatedPrint.failed')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SimulatedPrintLogSection;
