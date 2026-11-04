// src/pages/AutopsyDashboardPage/AutopsyDashboardPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#61, #89): autopsy BI dashboards in three tiers: Case (one
// autopsy against its targets), Department (one facility, with the reports
// overdue now) and Enterprise (every facility and jurisdiction). Each shows
// turnaround, consent, organ retention and cause of death. Reached from
// Home → Quality & Compliance.
//
// Rendering only. The figures come from services/autopsy/dashboard/, and the
// turnaround verdicts from the same engine as the worklist chip
// (services/autopsy/resolveAutopsyTatStatus.ts).
//
// Simulated cases are on by default so a demonstration site has enough volume
// to read a rate; they carry SIM-A ids and "(Simulated)" facility names and
// one switch turns them off.
// ─────────────────────────────────────────────────────────────────────────────
import { LoadingState } from '@/components/Common/LoadingState';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../../pathscribe.css';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useAutopsyDashboard } from '@/hooks/useAutopsyDashboard';
import { AUTOPSY_TAT_STATE_LABEL_KEY, type AutopsyTatResult } from '@/services/autopsy/resolveAutopsyTatStatus';
import type { AutopsyDashboardPeriod, AutopsyDashboardTier } from '@/services/autopsy/dashboard/autopsyDashboardView';
import type { GroupSummary } from '@/services/autopsy/dashboard/autopsyDashboardCalculations';
import { formatDateTime } from '@/utils/formatDate';
import AutopsyTierPanels from './AutopsyTierPanels';

const TIERS: AutopsyDashboardTier[] = ['case', 'department', 'enterprise'];
const PERIODS: AutopsyDashboardPeriod[] = ['30', '90', '365', 'all'];

const TatLine: React.FC<{ result: AutopsyTatResult; heading: string }> = ({ result, heading }) => {
  const { t } = useTranslation();
  return (
    <div className="ps-autdash-case-line">
      <span className="ps-autdash-case-key">{heading}</span>
      <span className={`wl-autopsy-badge wl-autopsy-badge--tat-${result.state}`}>{t(AUTOPSY_TAT_STATE_LABEL_KEY[result.state])}</span>
      <span>{t('autopsyDashboard.case.tatLine', { elapsed: result.elapsedHours, target: result.targetHours })}</span>
      {result.holdHours > 0 && <span className="ps-autdash-muted">{t('autopsyDashboard.case.holdNote', { hours: result.holdHours })}</span>}
    </div>
  );
};

const GroupTable: React.FC<{ title: string; rows: GroupSummary[]; labelOf: (g: GroupSummary) => string }> = ({ title, rows, labelOf }) => {
  const { t } = useTranslation();
  return (
    <section className="ps-autdash-panel ps-autdash-panel--wide" aria-label={title}>
      <h3 className="ps-autdash-panel-title">{title}</h3>
      <table className="ps-autdash-table">
        <thead>
          <tr>
            <th scope="col" />
            <th scope="col">{t('autopsyDashboard.enterprise.cases')}</th>
            <th scope="col">{t('autopsyDashboard.enterprise.padWithin')}</th>
            <th scope="col">{t('autopsyDashboard.enterprise.fadWithin')}</th>
            <th scope="col">{t('autopsyDashboard.enterprise.overdueNow')}</th>
            <th scope="col">{t('autopsyDashboard.enterprise.revoked')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(g => (
            <tr key={g.key}>
              <th scope="row">{labelOf(g)}</th>
              <td>{g.summary.count}</td>
              <td>{g.summary.pad.withinPct === null ? '—' : `${g.summary.pad.withinPct}%`}</td>
              <td>{g.summary.fad.withinPct === null ? '—' : `${g.summary.fad.withinPct}%`}</td>
              <td className={g.summary.overdueNow > 0 ? 'ps-autdash-overdue' : undefined}>{g.summary.overdueNow}</td>
              <td>{g.summary.consent.revoked}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

const AutopsyDashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { pushCrumb } = useBreadcrumb();
  useEffect(() => { pushCrumb(t('autopsyDashboard.pageTitle'), '/autopsy-dashboards'); }, [pushCrumb, t]);
  const d = useAutopsyDashboard();
  const { view } = d;
  const c = view.selectedCase;

  return (
    <div className="ps-autdash-page">
      <h1 className="ps-autdash-title">{t('autopsyDashboard.pageTitle')}</h1>
      <p className="ps-autdash-subtitle">{t('autopsyDashboard.subtitle')}</p>

      <div className="ps-autdash-controls">
        <div className="ps-autdash-tabs" role="tablist" aria-label={t('autopsyDashboard.tierAria')}>
          {TIERS.map(x => (
            <button key={x} type="button" role="tab" aria-selected={d.tier === x}
              className={`ps-autdash-tab${d.tier === x ? ' ps-autdash-tab--active' : ''}`} onClick={() => d.setTier(x)}>
              {t(`autopsyDashboard.tiers.${x}`)}
            </button>
          ))}
        </div>
        <label className="ps-autdash-field">
          <span>{t('autopsyDashboard.period.label')}</span>
          <select className="ps-conf-select" value={d.period} onChange={e => d.setPeriod(e.target.value as AutopsyDashboardPeriod)}>
            {PERIODS.map(p => <option key={p} value={p}>{t(`autopsyDashboard.period.${p === 'all' ? 'all' : `d${p}`}`)}</option>)}
          </select>
        </label>
        <label className="ps-autdash-check">
          <input type="checkbox" checked={d.includeSimulated} onChange={e => d.setIncludeSimulated(e.target.checked)} />
          <span>{t('autopsyDashboard.simulated.toggle')}</span>
        </label>
      </div>

      {d.includeSimulated && view.simulatedCount > 0 && (
        <div className="ps-autdash-banner" role="note">{t('autopsyDashboard.simulated.banner', { count: view.simulatedCount })}</div>
      )}

      {d.loading ? <LoadingState label={t('autopsyDashboard.loading')} /> : view.summary.count === 0 ? (
        <p className="ps-autdash-muted">{t('autopsyDashboard.empty')}</p>
      ) : (
        <>
          {d.tier === 'case' && (
            <label className="ps-autdash-field">
              <span>{t('autopsyDashboard.case.select')}</span>
              <select className="ps-conf-select" value={c?.id ?? ''} onChange={e => d.setCaseId(e.target.value)}>
                {view.cases.map(x => (
                  <option key={x.id} value={x.id} data-phi="accession">{x.simulated ? `${x.id} · ${t('autopsyDashboard.simulated.badge')}` : x.id}</option>
                ))}
              </select>
            </label>
          )}
          {d.tier === 'department' && (
            <label className="ps-autdash-field">
              <span>{t('autopsyDashboard.department.select')}</span>
              <select className="ps-conf-select" value={view.selectedFacilityId ?? ''} onChange={e => d.setFacilityId(e.target.value)}>
                {view.facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
          )}

          {d.tier === 'case' && c && (
            <section className="ps-autdash-panel ps-autdash-panel--wide" aria-label={t('autopsyDashboard.case.heading')}>
              <h3 className="ps-autdash-panel-title">
                <span data-phi="accession">{c.id}</span>
                {c.simulated && <span className="ps-autdash-sim-badge">{t('autopsyDashboard.simulated.badge')}</span>}
              </h3>
              <div className="ps-autdash-case-line"><span className="ps-autdash-case-key">{t('autopsyDashboard.case.facility')}</span><span>{c.facilityName}</span></div>
              <div className="ps-autdash-case-line"><span className="ps-autdash-case-key">{t('autopsyDashboard.case.authority')}</span><span>{t(`autopsyDashboard.authority.${c.autopsy.caseAuthority}`)}</span></div>
              <div className="ps-autdash-case-line"><span className="ps-autdash-case-key">{t('autopsyDashboard.case.arrived')}</span><span>{formatDateTime(c.startedAt, i18n.language)}</span></div>
              <TatLine result={c.tat.pad} heading={t('autopsyDashboard.tat.padHeading')} />
              <TatLine result={c.tat.fad} heading={t('autopsyDashboard.tat.fadHeading')} />
            </section>
          )}

          <AutopsyTierPanels summary={view.summary} />

          {d.tier === 'department' && (
            <section className="ps-autdash-panel ps-autdash-panel--wide" aria-label={t('autopsyDashboard.department.overdueHeading')}>
              <h3 className="ps-autdash-panel-title">{t('autopsyDashboard.department.overdueHeading')}</h3>
              {view.overdue.length === 0 ? <p className="ps-autdash-muted">{t('autopsyDashboard.department.noneOverdue')}</p> : (
                <ul className="ps-autdash-list">
                  {view.overdue.map(o => (
                    <li key={`${o.record.id}-${o.result.tier}`}>
                      <span data-phi="accession">{o.record.id}</span>
                      <span>{t('autopsyDashboard.department.overdueRow', { tier: o.result.tier, hours: o.overdueHours })}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {d.tier === 'enterprise' && (
            <>
              <GroupTable title={t('autopsyDashboard.enterprise.byFacility')} rows={view.byFacility} labelOf={g => g.label} />
              <GroupTable title={t('autopsyDashboard.enterprise.byJurisdiction')} rows={view.byJurisdiction} labelOf={g => t(`jurisdictionNames.${g.key}`)} />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AutopsyDashboardPage;
