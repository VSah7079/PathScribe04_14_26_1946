// src/components/MockInterfaceEngine/InboundSimulatorPanel.tsx
// ─────────────────────────────────────────────────
// Batch 605: pick or paste an inbound message, run it through the real
// processors, see the outcome. Labelled Simulated throughout.
// ─────────────────────────────────────────────────
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  INBOUND_SAMPLE_IDS, prepareInboundSample, runInboundMessage, type InboundRunResult, type InboundSampleId,
} from '@/services/mockInterfaceEngine/inboundSimulator';
import { readSessionProfile } from '@/services/auth/sessionProfile';

const DEMO_ORG = 'ORG-DVMC';
const DEMO_FACILITY = 'demo-facility';

const InboundSimulatorPanel: React.FC = () => {
  const { t } = useTranslation();
  const [sample, setSample] = useState<InboundSampleId>('A01');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<InboundRunResult | null>(null);

  const ctx = () => {
    const p = readSessionProfile();
    return { organisationId: p?.organisationId ?? DEMO_ORG, facilityId: DEMO_FACILITY, actor: p?.name ?? 'Simulator' };
  };

  const load = async () => {
    setBusy(true);
    try { setText(await prepareInboundSample(sample, ctx())); setResult(null); }
    catch { toast.error(t('inboundSimulator.loadFailed')); }
    finally { setBusy(false); }
  };

  const run = async () => {
    setBusy(true);
    try {
      const r = await runInboundMessage(text, ctx());
      setResult(r);
      if (r.ok) toast.success(t('inboundSimulator.toastApplied')); else toast.warn(t('inboundSimulator.toastNotApplied'));
    } finally { setBusy(false); }
  };

  return (
    <div className="ps-panel-box ps-mt-20" data-testid="inbound-simulator">
      <h3 className="ps-panel-heading"><span className="ps-conf-badge">{t('inboundSimulator.badge')}</span> {t('inboundSimulator.title')}</h3>
      <p className="ps-helper-text">{t('inboundSimulator.explain')}</p>
      <label className="ps-label" htmlFor="inbound-sample">{t('inboundSimulator.sampleLabel')}</label>
      <div className="ps-flex-row-gap-8">
        <select id="inbound-sample" className="ps-input-dark" value={sample} onChange={e => setSample(e.target.value as InboundSampleId)}>
          {INBOUND_SAMPLE_IDS.map(id => <option key={id} value={id}>{t(`inboundSimulator.samples.${id}`)}</option>)}
        </select>
        <button className="ps-conf-btn-secondary" disabled={busy} onClick={load}>{t('inboundSimulator.load')}</button>
      </div>
      <label className="ps-label ps-mt-12" htmlFor="inbound-text">{t('inboundSimulator.messageLabel')}</label>
      <textarea id="inbound-text" className="ps-input-dark" rows={9} value={text} onChange={e => setText(e.target.value)} spellCheck={false} />
      <div className="ps-mt-12">
        <button className="ps-conf-btn-primary" disabled={busy || !text.trim()} onClick={run}>{t('inboundSimulator.run')}</button>
      </div>
      {result && (
        <div className="ps-mt-12" data-testid="inbound-result">
          <strong>{result.ok ? t('inboundSimulator.resultOk') : t('inboundSimulator.resultNotApplied')}</strong>
          <p>{result.summary}</p>
          {result.exceptionQueued && <p className="ps-helper-text">{t('inboundSimulator.queuedHint')}</p>}
          <table className="ps-conf-table"><tbody>
            {result.details.map(d => <tr key={d.label}><td>{d.label}</td><td>{d.value}</td></tr>)}
          </tbody></table>
        </div>
      )}
    </div>
  );
};

export default InboundSimulatorPanel;
