// src/pages/AutopsyDashboardPage/AutopsyTierPanels.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#61, #89): the four panels every autopsy dashboard tier shows:
// turnaround, consent, organ retention and cause of death. Rendering only; the
// figures come from services/autopsy/dashboard/.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CONSENT_KINDS, RETENTION_KINDS,
} from '@/services/autopsy/dashboard/autopsyDashboardCalculations';
import type { TatKpis, TierSummary } from '@/services/autopsy/dashboard/autopsyDashboardTypes';

const Bar: React.FC<{ label: string; count: number; total: number }> = ({ label, count, total }) => {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <div className="ps-autdash-bar-row">
      <span className="ps-autdash-bar-label">{label}</span>
      <span className="ps-autdash-bar-track" aria-hidden="true">
        <span className="ps-autdash-bar-fill" style={{ '--ps-pct': `${pct}%` } as React.CSSProperties} />
      </span>
      <span className="ps-autdash-bar-count">{count}</span>
    </div>
  );
};

const TatBlock: React.FC<{ heading: string; kpis: TatKpis }> = ({ heading, kpis }) => {
  const { t } = useTranslation();
  return (
    <div className="ps-autdash-tat">
      <div className="ps-autdash-tat-heading">{heading}</div>
      <div className="ps-autdash-tat-figure">
        {kpis.withinPct === null ? t('autopsyDashboard.tat.noneDecided') : t('autopsyDashboard.tat.withinTarget', { pct: kpis.withinPct })}
      </div>
      <div className="ps-autdash-tat-detail">
        {kpis.decided > 0 && <span>{t('autopsyDashboard.tat.counts', { within: kpis.within, decided: kpis.decided })}</span>}
        <span>{t('autopsyDashboard.tat.open', { count: kpis.open })}</span>
        <span className={kpis.overdue > 0 ? 'ps-autdash-overdue' : undefined}>{t('autopsyDashboard.tat.overdue', { count: kpis.overdue })}</span>
        {kpis.medianHours !== null && <span>{t('autopsyDashboard.tat.median', { hours: kpis.medianHours })}</span>}
      </div>
    </div>
  );
};

const AutopsyTierPanels: React.FC<{ summary: TierSummary }> = ({ summary }) => {
  const { t } = useTranslation();
  return (
    <div className="ps-autdash-panels">
      <section className="ps-autdash-panel" aria-label={t('autopsyDashboard.panels.tat')}>
        <h3 className="ps-autdash-panel-title">{t('autopsyDashboard.panels.tat')}</h3>
        <TatBlock heading={t('autopsyDashboard.tat.padHeading')} kpis={summary.pad} />
        <TatBlock heading={t('autopsyDashboard.tat.fadHeading')} kpis={summary.fad} />
      </section>

      <section className="ps-autdash-panel" aria-label={t('autopsyDashboard.panels.consent')}>
        <h3 className="ps-autdash-panel-title">{t('autopsyDashboard.panels.consent')}</h3>
        {CONSENT_KINDS.map(k => <Bar key={k} label={t(`autopsyDashboard.consent.${k}`)} count={summary.consent[k]} total={summary.count} />)}
      </section>

      <section className="ps-autdash-panel" aria-label={t('autopsyDashboard.panels.retention')}>
        <h3 className="ps-autdash-panel-title">{t('autopsyDashboard.panels.retention')}</h3>
        {RETENTION_KINDS.map(k => <Bar key={k} label={t(`autopsyDashboard.retention.${k}`)} count={summary.retention[k]} total={summary.count} />)}
      </section>

      <section className="ps-autdash-panel" aria-label={t('autopsyDashboard.panels.cause')}>
        <h3 className="ps-autdash-panel-title">{t('autopsyDashboard.panels.cause')}</h3>
        {summary.causes.length === 0
          ? <p className="ps-autdash-muted">{t('autopsyDashboard.empty')}</p>
          : summary.causes.map(c => <Bar key={c.cause} label={t(`autopsyDashboard.cause.${c.cause}`)} count={c.count} total={summary.count} />)}
        {summary.causes.some(c => c.cause === 'not_recorded') && <p className="ps-autdash-muted">{t('autopsyDashboard.causeNote')}</p>}
      </section>
    </div>
  );
};

export default AutopsyTierPanels;
