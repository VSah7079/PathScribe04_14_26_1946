// src/components/ColdChain/AssetReadingsPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (queue entries #17 and #123): the readings and excursion status of
// one monitored asset (a storage unit or a smart container), with a clearly
// labelled Simulated control that posts one temperature reading through the
// ingestion service. No sensor feed is connected yet (server work), so every
// reading here comes from that control and is labelled Simulated.
// Used by the Cold chain section (storage units and containers) and by the
// batch detail page (the container checked out to the batch).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { useAuth } from '@/contexts/AuthContext';
import {
  telemetryReadingService, postSimulatedTelemetryReading, summariseReadings, recentReadings,
  type MonitoredAssetType, type TelemetryReading,
} from '@/services';

interface Props {
  assetType: MonitoredAssetType;
  assetId: string;
  /** The unit name or rack id, shown in the audit entry. */
  assetLabel: string;
  /** Called after a reading is posted (the batch page reloads the batch to show the hold). */
  onPosted?: () => void;
}

export const AssetReadingsPanel: React.FC<Props> = ({ assetType, assetId, assetLabel, onPosted }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [readings, setReadings] = useState<TelemetryReading[]>([]);
  const [temperature, setTemperature] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await telemetryReadingService.getByAsset(assetType, assetId);
    if (res.ok) setReadings(res.data);
  }, [assetType, assetId]);

  useEffect(() => { void load(); }, [load]);

  const summary = summariseReadings(readings);
  const when = (iso: string) => new Date(iso).toLocaleString(i18n.language);
  const parsed = temperature.trim() === '' ? Number.NaN : Number(temperature);

  const post = async () => {
    setBusy(true);
    setMessage(null);
    const res = await postSimulatedTelemetryReading({
      assetType, assetId, assetLabel, temperatureCelsius: parsed, user: user?.name ?? 'unknown',
    });
    setBusy(false);
    if (!res.ok) {
      setMessage({ kind: 'error', text: t(`coldChain.sim.errors.${res.error}`) });
      return;
    }
    const parts = [res.excursion ? t('coldChain.sim.result.excursion', { temp: parsed }) : t('coldChain.sim.result.withinRange', { temp: parsed })];
    if (res.heldBatchId) parts.push(t('coldChain.sim.result.batchHeld'));
    if (res.deficienciesRaised > 0) parts.push(t('coldChain.sim.result.capaRaised', { count: res.deficienciesRaised }));
    setMessage({ kind: 'info', text: parts.join(' ') });
    setTemperature('');
    await load();
    onPosted?.();
  };

  return (
    <div className="ps-coldchain-panel" data-testid="coldchain-panel">
      <div className="ps-coldchain-summary">
        <span className={`ps-coldchain-status ps-coldchain-status--${summary.status}`} data-testid="coldchain-status">
          {t(`coldChain.status.${summary.status}`)}
        </span>
        {summary.latest && (
          <span>
            {t('coldChain.latest', { temp: summary.latest.temperatureCelsius ?? '—', time: when(summary.latest.recordedAt) })}
            {summary.latest.simulated && <> <span className="ps-simulated-badge">{t('coldChain.simulated')}</span></>}
          </span>
        )}
        <span className="ps-conf-identity-sub">{t('coldChain.counts', { readings: summary.readingCount, excursions: summary.excursionCount })}</span>
      </div>

      <div className="ps-coldchain-sim">
        <div className="ps-coldchain-sim-title">
          <span className="ps-simulated-badge">{t('coldChain.simulated')}</span> {t('coldChain.sim.title')}
        </div>
        <p className="ps-conf-identity-sub">{t('coldChain.sim.explain')}</p>
        <div className="ps-conf-form-row">
          <label className="ps-conf-label" htmlFor={`sim-temp-${assetId}`}>{t('coldChain.sim.temperatureLabel')}</label>
          <input
            id={`sim-temp-${assetId}`} type="number" step="0.1" className="ps-conf-input ps-coldchain-temp-input"
            value={temperature} onChange={e => setTemperature(e.target.value)} data-dirty-ignore
          />
          <CapabilityButton
            capability="batch:cold-chain-reading:simulate" className="ps-conf-btn-secondary"
            disabled={busy || !Number.isFinite(parsed)} onClick={() => { void post(); }}
          >
            {t('coldChain.sim.post')}
          </CapabilityButton>
        </div>
        {message && (
          <div className={message.kind === 'error' ? 'ps-coldchain-message ps-coldchain-message--error' : 'ps-coldchain-message'} role="status" data-testid="coldchain-message">
            {message.text}
          </div>
        )}
      </div>

      {readings.length > 0 && (
        <table className="ps-conf-table" data-testid="coldchain-readings">
          <thead>
            <tr>
              <th className="ps-conf-th">{t('coldChain.readings.time')}</th>
              <th className="ps-conf-th">{t('coldChain.readings.temperature')}</th>
              <th className="ps-conf-th">{t('coldChain.readings.result')}</th>
            </tr>
          </thead>
          <tbody>
            {recentReadings(readings, 5).map(r => (
              <tr key={r.id} className="ps-conf-tr">
                <td className="ps-conf-td">{when(r.recordedAt)}</td>
                <td className="ps-conf-td">{r.temperatureCelsius ?? '—'} °C {r.simulated && <span className="ps-simulated-badge">{t('coldChain.simulated')}</span>}</td>
                <td className="ps-conf-td">{r.isExcursion ? t('coldChain.readings.excursion') : t('coldChain.readings.withinRange')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
