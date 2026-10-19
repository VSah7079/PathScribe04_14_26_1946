// src/components/QualityAssurance/AiDiscordanceTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#78). Quality Assurance → Operations → AI discordance. Two reports on
// the AI screening products the lab uses:
//   • how often a pathologist disagreed with each product (only results a
//     pathologist has judged are counted, never assumed concordant), and
//   • AI results that were ordered and have had no answer for longer than the
//     lab's timeout (the stalled-result rule), with that timeout editable here.
// Both export to CSV under qa:ai-discordance:export. Counting and the rows are
// in services/digitalPathology/ (aiQaReportRows.ts, aiStalledResultRule.ts).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiScreeningResultService, dpVendorService, aiStalledResultSettingsService } from '@/services';
import type { AiScreeningResult } from '@/types/digitalPathology/AiScreeningResult';
import type { DpVendorEntry } from '@/services/digitalPathology/IDpVendorService';
import { AI_STALLED_TIMEOUT_DEFAULT_HOURS, resolveStalledAiResults } from '@/services/digitalPathology/aiStalledResultRule';
import { buildVendorDiscordanceRows, vendorDiscordanceExportRows, stalledResultExportRows, formatDiscordancePercent } from '@/services/digitalPathology/aiQaReportRows';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { useOpenCase } from '@/hooks/useOpenCase';
import { pressable } from '@/utils/a11y/pressable';
import { exportQaReportRows, qaScopeContext } from './qaReportUtils';

export const AiDiscordanceTab: React.FC = () => {
  const { t } = useTranslation();
  const openCase = useOpenCase();
  const [results, setResults] = useState<AiScreeningResult[]>([]);
  const [vendors, setVendors] = useState<DpVendorEntry[]>([]);
  const [timeoutHours, setTimeoutHours] = useState(AI_STALLED_TIMEOUT_DEFAULT_HOURS);
  const [draft, setDraft] = useState(String(AI_STALLED_TIMEOUT_DEFAULT_HOURS));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [r, v, s] = await Promise.all([aiScreeningResultService.getAll(), dpVendorService.getAll(), aiStalledResultSettingsService.get()]);
    if (r.ok) setResults(r.data);
    if (v.ok) setVendors(v.data);
    if (s.ok) { setTimeoutHours(s.data.timeoutHours); setDraft(String(s.data.timeoutHours)); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const rows = useMemo(() => buildVendorDiscordanceRows(results, vendors), [results, vendors]);
  const stalled = useMemo(() => resolveStalledAiResults(results, new Date(), timeoutHours), [results, timeoutHours]);
  const vendorName = (id: string) => vendors.find(v => v.id === id)?.name ?? id;
  const today = new Date().toISOString().slice(0, 10);

  const saveTimeout = async () => {
    const res = await aiStalledResultSettingsService.update({ timeoutHours: Number(draft) });
    setError(res.ok ? null : t(`aiDiscordanceTab.errors.${res.error}`, { defaultValue: t('aiDiscordanceTab.errors.saveFailed') }));
    if (res.ok) await load();
  };

  const exportRates = () => {
    void exportQaReportRows('qa:ai-discordance:export', vendorDiscordanceExportRows(rows), `ai-discordance-by-vendor-${today}.csv`, qaScopeContext(), {});
  };
  const exportStalled = () => {
    void exportQaReportRows('qa:ai-discordance:export', stalledResultExportRows(stalled, vendors, timeoutHours), `ai-stalled-results-${today}.csv`, qaScopeContext(), { timeoutHours });
  };

  return (
    <div>
      <h3 className="ps-conf-section-title">{t('aiDiscordanceTab.title')}</h3>
      <p className="ps-conf-section-subtitle ps-conf-section-subtitle--spaced">{t('aiDiscordanceTab.subtitle')}</p>

      <div className="ps-defic-review-banner ps-mb-8">
        <span className="ps-defic-review-banner-label">{t('aiDiscordanceTab.vendorTitle')}</span>
        <CapabilityButton capability="qa:ai-discordance:export" context={qaScopeContext()} className="ps-conf-btn-secondary" onClick={exportRates}>
          {t('aiDiscordanceTab.exportRates')}
        </CapabilityButton>
      </div>
      <div className="ps-conf-table-wrap">
        <table className="ps-conf-table" aria-label={t('aiDiscordanceTab.vendorTitle')}>
          <thead><tr>
            <th className="ps-conf-th">{t('aiDiscordanceTab.headers.vendor')}</th>
            <th className="ps-conf-th">{t('aiDiscordanceTab.headers.product')}</th>
            <th className="ps-conf-th">{t('aiDiscordanceTab.headers.ordered')}</th>
            <th className="ps-conf-th">{t('aiDiscordanceTab.headers.reviewed')}</th>
            <th className="ps-conf-th">{t('aiDiscordanceTab.headers.concordant')}</th>
            <th className="ps-conf-th">{t('aiDiscordanceTab.headers.discordant')}</th>
            <th className="ps-conf-th">{t('aiDiscordanceTab.headers.rate')}</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td className="ps-conf-td" colSpan={7}>{t('aiDiscordanceTab.vendorEmpty')}</td></tr>}
            {rows.map(r => (
              <tr key={r.vendorId}>
                <td className="ps-conf-td">{r.vendorName}</td>
                <td className="ps-conf-td">{r.productName}</td>
                <td className="ps-conf-td">{r.orderedCount}</td>
                <td className="ps-conf-td">{r.reviewedCount}</td>
                <td className="ps-conf-td">{r.concordantCount}</td>
                <td className="ps-conf-td">{r.discordantCount}</td>
                <td className="ps-conf-td">
                  {r.discordanceRate === undefined
                    ? <span className="ps-conf-td--muted-italic">{t('aiDiscordanceTab.notReviewed')}</span>
                    : t('aiDiscordanceTab.ratePercent', { percent: formatDiscordancePercent(r.discordanceRate) })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ps-conf-section-subtitle">{t('aiDiscordanceTab.reviewNote')}</p>

      <div className="ps-defic-review-banner ps-mt-20 ps-mb-8">
        <span className="ps-defic-review-banner-label">{t('aiDiscordanceTab.stalledTitle', { count: stalled.length })}</span>
        <CapabilityButton capability="qa:ai-discordance:export" context={qaScopeContext()} className="ps-conf-btn-secondary" onClick={exportStalled}>
          {t('aiDiscordanceTab.exportStalled')}
        </CapabilityButton>
      </div>
      <div className="ps-conf-row">
        <label className="ps-conf-label" htmlFor="ai-stalled-hours">{t('aiDiscordanceTab.timeoutLabel')}</label>
        <div className="ps-conf-row-actions">
          <input id="ai-stalled-hours" className="ps-conf-input ps-corr-days" inputMode="numeric" value={draft} onChange={e => setDraft(e.target.value)} />
          <button className="ps-conf-btn-primary" disabled={draft === String(timeoutHours)} onClick={() => void saveTimeout()}>{t('common.save')}</button>
        </div>
      </div>
      {error && <p className="ps-field-still-required" role="alert">{error}</p>}
      <div className="ps-conf-table-wrap">
        <table className="ps-conf-table" aria-label={t('aiDiscordanceTab.stalledTable')}>
          <thead><tr>
            <th className="ps-conf-th">{t('qualityAssurance.common.case')}</th>
            <th className="ps-conf-th">{t('aiDiscordanceTab.headers.vendor')}</th>
            <th className="ps-conf-th">{t('aiDiscordanceTab.headers.orderedAt')}</th>
            <th className="ps-conf-th">{t('aiDiscordanceTab.headers.waiting')}</th>
          </tr></thead>
          <tbody>
            {stalled.length === 0 && <tr><td className="ps-conf-td" colSpan={4}>{t('aiDiscordanceTab.stalledEmpty', { hours: timeoutHours })}</td></tr>}
            {stalled.map(s => (
              <tr key={s.result.id} className="ps-conf-tr-clickable" {...pressable(() => void openCase(s.result.caseId, 'synoptic'), { role: null })}>
                <td className="ps-conf-td" data-phi="accession">{s.result.caseId}</td>
                <td className="ps-conf-td">{vendorName(s.result.vendorId)}</td>
                <td className="ps-conf-td">{new Date(s.result.orderedAt).toLocaleString()}</td>
                <td className="ps-conf-td">{t('aiDiscordanceTab.waitingHours', { hours: s.hoursWaiting })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
