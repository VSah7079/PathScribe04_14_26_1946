// src/components/Config/Cytology/ScreeningIntervalsCard.tsx
// Batch 608 (#52): the per-country, per-age screening interval table that
// EU-QA-01's interval adherence is judged against (Configuration → Cytology →
// Country and laboratory rules). Saves need config:cytology-compliance:manage.

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { screeningIntervalService } from '@/services';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { SCREENING_INTERVAL_GRACE_MONTHS, type ScreeningIntervalRule } from '@/services/cytology/screeningIntervals';
import { useReportConfigDirty } from '../configDirtyGuardContext';

export function ScreeningIntervalsCard() {
  const { t } = useTranslation();
  const [saved, setSaved] = useState<ScreeningIntervalRule[]>([]);
  const [rules, setRules] = useState<ScreeningIntervalRule[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  useReportConfigDirty(JSON.stringify(saved) !== JSON.stringify(rules));

  useEffect(() => { void screeningIntervalService.get().then(r => { if (r.ok) { setSaved(r.data); setRules(r.data); } }); }, []);

  const change = (i: number, patch: Partial<ScreeningIntervalRule>) => setRules(rs => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const num = (v: string) => (v === '' ? NaN : Number(v));

  const save = async () => {
    const r = await screeningIntervalService.save(rules);
    if (r.ok) { setSaved(r.data); setRules(r.data); setMessage(t('screeningIntervals.saved')); }
    else setMessage(t(r.error === 'invalidRule' ? 'screeningIntervals.invalid' : 'screeningIntervals.notPermitted'));
  };

  return (
    <div className="ps-conf-card ps-conf-card--spaced">
      <div className="ps-conf-card-title">{t('screeningIntervals.title')}</div>
      <p className="ps-conf-hint">{t('screeningIntervals.help', { months: SCREENING_INTERVAL_GRACE_MONTHS })}</p>
      {message && <div className="ps-conf-saving-indicator">{message}</div>}
      <table className="ps-conf-table">
        <thead><tr>
          <th className="ps-conf-th">{t('screeningIntervals.country')}</th><th className="ps-conf-th">{t('screeningIntervals.minAge')}</th>
          <th className="ps-conf-th">{t('screeningIntervals.maxAge')}</th><th className="ps-conf-th">{t('screeningIntervals.months')}</th><th className="ps-conf-th" />
        </tr></thead>
        <tbody>
          {rules.map((r, i) => (
            <tr key={i} className="ps-conf-tr">
              <td className="ps-conf-td"><input aria-label={t('screeningIntervals.country')} className="ps-conf-input" value={r.countryCode} onChange={e => change(i, { countryCode: e.target.value.toUpperCase() })} /></td>
              <td className="ps-conf-td"><input aria-label={t('screeningIntervals.minAge')} type="number" min={0} className="ps-conf-input" value={Number.isFinite(r.minAge) ? r.minAge : ''} onChange={e => change(i, { minAge: num(e.target.value) })} /></td>
              <td className="ps-conf-td"><input aria-label={t('screeningIntervals.maxAge')} type="number" min={0} className="ps-conf-input" value={Number.isFinite(r.maxAge) ? r.maxAge : ''} onChange={e => change(i, { maxAge: num(e.target.value) })} /></td>
              <td className="ps-conf-td"><input aria-label={t('screeningIntervals.months')} type="number" min={1} className="ps-conf-input" value={Number.isFinite(r.intervalMonths) ? r.intervalMonths : ''} onChange={e => change(i, { intervalMonths: num(e.target.value) })} /></td>
              <td className="ps-conf-td"><button type="button" className="ps-conf-btn-secondary" onClick={() => setRules(rs => rs.filter((_, j) => j !== i))}>{t('common.remove')}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ps-conf-row-actions">
        <button type="button" className="ps-conf-btn-secondary" onClick={() => setRules(rs => [...rs, { countryCode: '', minAge: 25, maxAge: 64, intervalMonths: 36 }])}>{t('screeningIntervals.add')}</button>
        <CapabilityButton capability="config:cytology-compliance:manage" className="ps-conf-btn-primary" onClick={() => void save()}>{t('common.save')}</CapabilityButton>
      </div>
    </div>
  );
}
