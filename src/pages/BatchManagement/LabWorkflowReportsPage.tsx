// src/pages/BatchManagement/LabWorkflowReportsPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 730 (Lab Workflow & Batch spec §9, §9.3 item 5): Batch Management → Lab
// Workflow Reports. The seven built-in reports (turnaround by step, volume per
// station, STAT performance, add-ons, recut and rework, reconciliation
// exceptions, batch duration), each behind its own capability, with CSV export
// behind its own export capability. Dates are the lab's calendar days. Labs with
// Power BI use the reporting feed instead (BI_FEED_API.md). Presentation only:
// hooks/useLabWorkflowReports.ts and services/labWorkflowReports/ do the work.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useSystemConfig } from '@/contexts/SystemConfigContext';
import { useCapabilities } from '@/hooks/useCapabilities';
import { LoadingState } from '@/components/Common/LoadingState';
import { toast } from 'react-toastify';
import { facilityService } from '@/services';
import { useLabWorkflowReports } from './hooks/useLabWorkflowReports';
import { LAB_WORKFLOW_REPORT_IDS, LAB_WORKFLOW_REPORT_CAPABILITY, LAB_WORKFLOW_EXPORT_CAPABILITY, TAT_STEPS, type TatGrouping, type TatStep } from '@/services/labWorkflowReports/labWorkflowReportTypes';
import { REPORT_COLUMNS, reportRecords, type CellValue } from '@/services/labWorkflowReports/labWorkflowCsv';
import { formatDateTime } from '@/utils/formatDate';
import './LabWorkflowReportsPage.css';

const GROUPINGS: TatGrouping[] = ['none', 'caseType', 'priority', 'facility'];
const K = 'labWorkflowReports';

const LabWorkflowReportsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { config } = useSystemConfig();
  const { has } = useCapabilities();
  const r = useLabWorkflowReports(config.facilityTimezone);
  const [facilityNames, setFacilityNames] = useState<Record<string, string>>({});
  useEffect(() => { void facilityService.getAll().then(res => { if (res.ok) setFacilityNames(Object.fromEntries(res.data.map(f => [f.id, f.name]))); }); }, []);

  const id = r.form.id;
  const isTat = id === 'turnaround' || id === 'statPerformance';
  const columns = REPORT_COLUMNS[id];

  /** A cell as shown (and exported): codes through their locale keys, dates in the reader's language. */
  const show = (column: string, v: CellValue): string | number => {
    if (v === null || v === '') return column === 'group' && id !== 'stationVolume' ? t(`${K}.groupings.none`) : '—';
    if (column === 'step') return t(`${K}.steps.${v}`);
    if (column === 'measure') return t(`${K}.measures.${v}`);
    if (column === 'kind') return t(`${K}.kinds.${v}`);
    if (column === 'type') return t(`facilityOpsDashboard.addOnTypes.${v}`);
    if (column === 'node') return t(`batchManagement.nodes.${v}`);
    if (column === 'overTarget') return v === 'yes' ? t('common.yes') : t('common.no');
    if (column === 'group' && r.form.grouping === 'caseType') return t(`${K}.caseTypes.${v}`);
    if (column === 'group' && r.form.grouping === 'facility') return facilityNames[String(v)] ?? String(v);
    if (column === 'at' || column === 'startedAt' || column === 'finishedAt') return formatDateTime(String(v), i18n.language);
    return v;
  };

  const doExport = async () => {
    const ok = await r.exportCsv(c => t(`${K}.columns.${c}`), show);
    if (!ok) toast.error(t(`${K}.exportRefused`));
  };

  const records = r.output && r.output.id === id ? reportRecords(r.output) : [];

  return (
    <div className="ps-batch-page">
      <div className="ps-batch-scroll">
        <div className="ps-batch-inner">
          <button className="ps-batch-back-btn" onClick={() => navigate('/batch-management')}>← {t('batchDetail.backToBatches')}</button>
          <div className="ps-batch-page-header">
            <h1 className="ps-batch-page-title">📊 {t(`${K}.pageTitle`)}</h1>
            <p className="ps-batch-page-subtitle">{t(`${K}.pageSubtitle`)}</p>
          </div>

          <div className="ps-lwr-tabs" role="tablist" aria-label={t(`${K}.pageTitle`)}>
            {LAB_WORKFLOW_REPORT_IDS.map(rid => (
              <button key={rid} type="button" role="tab" aria-selected={id === rid} disabled={!has(LAB_WORKFLOW_REPORT_CAPABILITY[rid])}
                className={`ps-lwr-tab${id === rid ? ' ps-lwr-tab--active' : ''}`} onClick={() => r.update({ id: rid })}>
                {t(`${K}.reports.${rid}`)}
              </button>
            ))}
          </div>
          <p className="ps-lwr-note">{t(`${K}.descriptions.${id}`)}</p>

          <div className="ps-lwr-filters">
            <label className="ps-lwr-field">
              <span>{t(`${K}.from`)}</span>
              <input type="date" className="ps-conf-input" value={r.form.fromDate} onChange={e => r.update({ fromDate: e.target.value })} />
            </label>
            <label className="ps-lwr-field">
              <span>{t(`${K}.to`)}</span>
              <input type="date" className="ps-conf-input" value={r.form.toDate} onChange={e => r.update({ toDate: e.target.value })} />
            </label>
            {isTat && (
              <label className="ps-lwr-field">
                <span>{t(`${K}.groupBy`)}</span>
                <select className="ps-conf-select" value={r.form.grouping} onChange={e => r.update({ grouping: e.target.value as TatGrouping })}>
                  {GROUPINGS.map(g => <option key={g} value={g}>{t(`${K}.groupings.${g}`)}</option>)}
                </select>
              </label>
            )}
            {id === 'stationVolume' && (
              <label className="ps-lwr-field">
                <span>{t(`${K}.period`)}</span>
                <select className="ps-conf-select" value={r.form.by} onChange={e => r.update({ by: e.target.value as 'day' | 'week' })}>
                  <option value="day">{t(`${K}.byDay`)}</option>
                  <option value="week">{t(`${K}.byWeek`)}</option>
                </select>
              </label>
            )}
            {id === 'batchDuration' && (
              <label className="ps-lwr-field">
                <span>{t(`${K}.stainingTarget`)}</span>
                <input type="number" min={1} step={1} className="ps-conf-input" value={r.form.stainingTargetMinutes}
                  onChange={e => r.update({ stainingTargetMinutes: Number(e.target.value) || 1 })} />
              </label>
            )}
            <button type="button" className="ps-conf-btn-secondary ps-lwr-export" disabled={!r.output || !has(LAB_WORKFLOW_EXPORT_CAPABILITY[id])} onClick={() => { void doExport(); }}>
              {t(`${K}.export`)}
            </button>
          </div>

          {isTat && (
            <fieldset className="ps-lwr-targets">
              <legend>{t(`${K}.targets`)}</legend>
              {TAT_STEPS.map((step: TatStep) => (
                <label key={step} className="ps-lwr-field ps-lwr-field--small">
                  <span>{t(`${K}.steps.${step}`)}</span>
                  <input type="number" min={1} step={1} className="ps-conf-input" value={r.form.targets[step]}
                    onChange={e => r.update({ targets: { ...r.form.targets, [step]: Number(e.target.value) || 1 } })} />
                </label>
              ))}
            </fieldset>
          )}

          {r.loading && <LoadingState variant="inline" label={t(`${K}.loading`)} />}
          {r.error && <p className="ps-lwr-error" role="alert">{t(`${K}.errors.${r.error}`)}</p>}
          {!r.loading && !r.error && records.length === 0 && <p className="ps-lwr-note">{t(`${K}.empty`)}</p>}
          {records.length > 0 && (
            <div className="ps-conf-table-wrap">
              <table className="ps-conf-table">
                <thead><tr>{columns.map(c => <th key={c} className="ps-conf-th" scope="col">{t(`${K}.columns.${c}`)}</th>)}</tr></thead>
                <tbody>
                  {records.map((row, i) => (
                    <tr key={i}>
                      {columns.map(c => (
                        <td key={c} className="ps-conf-td" {...(c === 'item' || c === 'caseAccession' ? { 'data-phi': 'accession' } : {})}>{show(c, row[c])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="ps-lwr-note">{t(`${K}.footnote`)}</p>
        </div>
      </div>
    </div>
  );
};

export default LabWorkflowReportsPage;
