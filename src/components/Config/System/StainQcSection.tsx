// src/components/Config/System/StainQcSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 763 (Pete: "a Post-Stain / Pre-Distribution QC checkpoint with Option A (vendor sign-off via the interface
// engine) and Option B (native PathScribe QC), configurable per instrument"): the lab's defaults for stainers and for
// slide scanners, and every stainer's and scanner's mode (its own, set on the Equipment screen, or the default).
// Saving needs config:stain-qc:manage (checked in services/stainQc/stainQcService.ts).
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { LoadingState } from '@/components/Common/LoadingState';
import { useStainQcSettings } from '@/hooks/useStainQcSettings';
import { QC_MODES, type QcMode } from '@/services';
import { useReportConfigDirty } from '../configDirtyGuardContext';
import '@/components/StainQc/QcCheckpointPanel.css';

const K = 'stainQcSection';

const StainQcSection: React.FC = () => {
  const { t } = useTranslation();
  const s = useStainQcSettings();
  useReportConfigDirty(s.dirty);
  if (!s.draft) return <LoadingState label={t(`${K}.loading`)} />;
  const d = s.draft;
  const modeSelect = (id: string, value: QcMode, onChange: (m: QcMode) => void) => (
    <select id={id} className="ps-conf-select" value={value} onChange={e => onChange(e.target.value as QcMode)}>
      {QC_MODES.map(m => <option key={m} value={m}>{t(`stainQc.modes.${m}`)}</option>)}
    </select>
  );

  return (
    <div data-testid="stain-qc-section">
      <div className="ps-conf-section-header">
        <div>
          <h2 className="ps-conf-section-title">{t(`${K}.title`)}</h2>
          <p className="ps-conf-section-subtitle">{t(`${K}.subtitle`)}</p>
        </div>
      </div>
      <section className="ps-qc-panel">
        <div className="ps-qc-subtitle">{t(`${K}.defaults`)}</div>
        <div className="ps-conf-form-field">
          <label className="ps-conf-label" htmlFor="sqc-stainer">{t(`${K}.stainerDefault`)}</label>
          {modeSelect('sqc-stainer', d.defaultStainerMode, m => s.set('defaultStainerMode', m))}
        </div>
        <div className="ps-conf-form-field">
          <label className="ps-conf-label" htmlFor="sqc-scanner">{t(`${K}.scannerDefault`)}</label>
          {modeSelect('sqc-scanner', d.defaultScannerMode, m => s.set('defaultScannerMode', m))}
        </div>
        <ul className="ps-qc-hint ps-qc-modes">
          {QC_MODES.map(m => <li key={m}><strong>{t(`stainQc.modes.${m}`)}</strong>: {t(`${K}.explain.${m}`)}</li>)}
        </ul>
        {s.problem && <p className="ps-qc-problem" role="alert">{t('stainQc.errors.notPermitted')}</p>}
        {s.saved && <p className="ps-qc-note" role="status">{t(`${K}.saved`)}</p>}
        <div className="ps-qc-actions">
          <CapabilityButton capability="config:stain-qc:manage" className="ps-btn-primary" onClick={() => { void s.save(); }}>{t(`${K}.save`)}</CapabilityButton>
        </div>
      </section>
      <section className="ps-qc-panel">
        <div className="ps-qc-subtitle">{t(`${K}.instruments`)}</div>
        <p className="ps-qc-hint">{t(`${K}.instrumentsHint`)}</p>
        {s.rows.length === 0 ? <p className="ps-qc-hint">{t(`${K}.noInstruments`)}</p> : (
          <table className="ps-conf-table">
            <thead><tr>
              <th className="ps-conf-th">{t(`${K}.columns.instrument`)}</th>
              <th className="ps-conf-th">{t(`${K}.columns.kind`)}</th>
              <th className="ps-conf-th">{t(`${K}.columns.mode`)}</th>
            </tr></thead>
            <tbody>
              {s.rows.map(r => (
                <tr key={r.id}>
                  <td className="ps-conf-td">{r.name} <span className="ps-qc-meta">{r.code}</span></td>
                  <td className="ps-conf-td">{t(`equipmentKinds.${r.kind}`)}</td>
                  <td className="ps-conf-td">{t(`stainQc.modes.${r.effective}`)}{r.own ? '' : <span className="ps-qc-meta"> · {t(`${K}.fromDefault`)}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default StainQcSection;
