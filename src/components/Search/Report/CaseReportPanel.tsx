// src/components/Search/Report/CaseReportPanel.tsx
// ─────────────────────────────────────────────────
// Batch 613: the Search page's report view. The same search as the results table, shown as
// counts by group (with each group's share and median days to sign-out; click a group for its
// cases) or as a list of cases with chosen columns, including answers from synoptic reports.
// Reports can be saved, exported as CSV (own capability, audited) and scheduled.
// ─────────────────────────────────────────────────
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { caseSearchService, savedCaseReportService } from '@/services';
import { runExport } from '@/services/exports/runExport';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { LoadingState } from '@/components/Common/LoadingState';
import { downloadCsv } from '@/utils/csv';
import { draftToCriteria } from '@/utils/search/buildCaseSearchRequest';
import { facilityDateString } from '@/utils/search/searchDateShortcuts';
import { buildCaseReportCsv, caseReportCsvFilename } from '@/utils/search/caseReportCsv';
import {
  REPORT_GROUP_BY_LABEL_KEY, reportCellText, reportColumnLabel, reportGroupLabel, type ReportFormatContext, type ReportNameLookups,
} from '@/utils/search/caseReportLabels';
import type { CaseSearchDraft } from '@/services/caseSearch/caseSearchTypes';
import {
  REPORT_GROUP_BYS, type CaseSearchReport, type ReportColumn, type ReportGroupSortKey,
} from '@/services/caseSearch/caseSearchReport';
import { ColumnPicker } from './ColumnPicker';
import { ReportSchedulesPanel } from './ReportSchedulesPanel';
import { useCaseReport } from './useCaseReport';

interface Named { id: string; name: string }
interface Props {
  searchedDraft: CaseSearchDraft | null;
  timeZone: string;
  pathologists: readonly Named[];
  facilities: readonly Named[];
  subspecialties: readonly Named[];
  /** Load a saved report's search into the page and run it. */
  onLoadSearch(draft: CaseSearchDraft): void;
}

const CasesTable: React.FC<{ report: CaseSearchReport; columns: ReportColumn[]; ctx: ReportFormatContext }> = ({ report, columns, ctx }) => {
  const { t } = useTranslation();
  if (report.rows.length === 0) return <p className="ps-svf-hint">{t('caseReport.noCases')}</p>;
  return (
    <div className="ps-casereport-scroll">
      <table className="ps-casereport-table" data-testid="report-cases">
        <thead><tr>{columns.map(c => <th key={c} scope="col">{reportColumnLabel(c, ctx)}</th>)}</tr></thead>
        <tbody>
          {report.rows.map(r => (
            <tr key={r.caseId}>{columns.map(c => <td key={c} data-phi="name">{reportCellText(c, r.cells[c], ctx)}</td>)}</tr>
          ))}
        </tbody>
      </table>
      {report.rowsTruncated && <p className="ps-svf-hint">{t('caseReport.rowsTruncated', { shown: report.rows.length, total: report.total })}</p>}
    </div>
  );
};

export const CaseReportPanel: React.FC<Props> = ({ searchedDraft, timeZone, pathologists, facilities, subspecialties, onLoadSearch }) => {
  const { t } = useTranslation();
  const r = useCaseReport(searchedDraft, timeZone, true);
  const [showColumns, setShowColumns] = useState(false);
  const [showSchedules, setShowSchedules] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [savedId, setSavedId] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const names = useMemo<ReportNameLookups>(() => ({
    pathologist: id => pathologists.find(p => p.id === id)?.name,
    facility: id => facilities.find(f => f.id === id)?.name,
    subspecialty: id => subspecialties.find(s => s.id === id)?.name,
    protocols: r.protocols,
  }), [pathologists, facilities, subspecialties, r.protocols]);
  const ctx: ReportFormatContext = { t, locale: i18n.language, timeZone, names };
  const labelOf = (c: ReportColumn) => reportColumnLabel(c, ctx);

  const pct = new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 1 });
  const num = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 });

  const sortBy = (key: ReportGroupSortKey) =>
    r.setGroupSort({ key, direction: r.groupSort.key === key && r.groupSort.direction === 'desc' ? 'asc' : (key === 'label' ? 'asc' : 'desc') });
  const arrow = (key: ReportGroupSortKey) => (r.groupSort.key === key ? (r.groupSort.direction === 'asc' ? ' ▲' : ' ▼') : '');
  const ariaSort = (key: ReportGroupSortKey) => (r.groupSort.key === key ? (r.groupSort.direction === 'asc' ? 'ascending' : 'descending') : 'none');

  const handleSave = async () => {
    const def = r.definition(); if (!def) return;
    const res = await savedCaseReportService.save(saveName, def);
    if (res.ok) { setSaveName(''); setSavedId(res.data.id); setNotice(t('caseReport.saved')); await r.refreshSaved(); }
    else setNotice(res.error === 'NAME_REQUIRED' ? t('caseReport.nameRequired') : t('caseReport.saveFailed'));
  };
  const handleLoad = (id: string) => {
    setSavedId(id);
    const found = r.saved.find(s => s.id === id); if (!found) return;
    r.applyDefinition(found.definition);
    onLoadSearch(found.definition.draft);
    void savedCaseReportService.recordUse(id);
    setNotice(t('caseReport.loadedNote'));
  };
  const handleDelete = async () => {
    if (!savedId) return;
    await savedCaseReportService.delete(savedId); setSavedId(''); await r.refreshSaved();
  };

  const handleExport = async () => {
    if (!searchedDraft) return;
    setExporting(true); setNotice(null);
    try {
      const criteria = draftToCriteria(searchedDraft);
      const filename = caseReportCsvFilename(facilityDateString(new Date(), timeZone));
      await runExport('search.case-report', filename, { criteria, timeZone, groupBy: r.groupBy, columns: r.columns }, async () => {
        const res = await caseSearchService.exportReport({ criteria, timeZone, groupBy: r.groupBy, columns: r.columns });
        if (res.ok === true) {
          downloadCsv(filename, buildCaseReportCsv(res.data, r.columns, ctx));
          if (res.data.rowsTruncated) setNotice(t('caseReport.export.truncated', { count: res.data.rows.length, total: res.data.total }));
        } else {
          setNotice(res.error === 'EXPORT_NOT_PERMITTED' ? t('caseReport.export.notPermitted') : t('caseReport.export.failed'));
        }
      });
    } catch { setNotice(t('caseReport.export.failed')); } finally { setExporting(false); }
  };

  if (!searchedDraft) return <div className="ps-searchpage-no-search">{t('caseReport.noSearchYet')}</div>;

  return (
    <div className="ps-casereport" data-testid="case-report">
      <div className="ps-casereport-toolbar">
        <label className="ps-casereport-field">
          <span>{t('caseReport.groupByLabel')}</span>
          <select className="ps-searchpage-sort-select" value={r.groupBy} onChange={e => r.setGroupBy(e.target.value as typeof r.groupBy)}>
            {REPORT_GROUP_BYS.map(g => <option key={g} value={g}>{t(REPORT_GROUP_BY_LABEL_KEY[g])}</option>)}
          </select>
        </label>
        <button type="button" className="ps-searchpage-export-btn" aria-expanded={showColumns} onClick={() => setShowColumns(v => !v)}>
          {t('caseReport.columnsButton', { count: r.columns.length })}
        </button>
        <label className="ps-casereport-field">
          <span>{t('caseReport.savedLabel')}</span>
          <select className="ps-searchpage-sort-select" value={savedId} onChange={e => handleLoad(e.target.value)}>
            <option value="">{t('caseReport.chooseSaved')}</option>
            {r.saved.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        {savedId && <button type="button" className="ps-searchpage-export-btn" onClick={() => void handleDelete()}>{t('caseReport.deleteSaved')}</button>}
        <input className="ps-searchpage-basis-select" value={saveName} onChange={e => setSaveName(e.target.value)} placeholder={t('caseReport.saveNamePlaceholder')} aria-label={t('caseReport.saveNamePlaceholder')} />
        <button type="button" className="ps-searchpage-export-btn" disabled={!saveName.trim()} onClick={() => void handleSave()}>{t('caseReport.save')}</button>
        <button type="button" className="ps-searchpage-export-btn" aria-expanded={showSchedules} onClick={() => setShowSchedules(v => !v)}>{t('caseReport.schedulesButton')}</button>
        {r.report && r.report.total > 0 && (
          <CapabilityButton capability="search:case-report:export" className="ps-searchpage-export-btn" disabled={exporting} onClick={() => void handleExport()}>
            {exporting ? t('searchPage.export.exporting') : t('caseReport.export.button')}
          </CapabilityButton>
        )}
      </div>
      {notice && <p className="ps-searchpage-notice" role="status">{notice}</p>}
      {showColumns && <ColumnPicker columns={r.columns} protocols={r.protocols} onChange={r.setColumns} labelOf={labelOf} />}
      {showSchedules && <ReportSchedulesPanel saved={r.saved} timeZone={timeZone} />}

      {r.state === 'loading' && <LoadingState label={t('caseReport.loading')} />}
      {r.state === 'failed' && <p className="ps-searchpage-notice ps-searchpage-notice--error" role="alert">{t('caseReport.failed')}</p>}

      {r.state === 'done' && r.report && (
        r.report.groupBy === 'none' ? (
          <>
            <p className="ps-svf-hint" aria-live="polite">{t('caseReport.totalCases', { count: r.report.total })}</p>
            <CasesTable report={r.report} columns={r.columns} ctx={ctx} />
          </>
        ) : (
          <div className="ps-casereport-scroll">
            <table className="ps-casereport-table" data-testid="report-groups">
              <thead>
                <tr>
                  <th scope="col" aria-sort={ariaSort('label')}><button type="button" className="ps-casereport-sort" onClick={() => sortBy('label')}>{t(REPORT_GROUP_BY_LABEL_KEY[r.report.groupBy])}{arrow('label')}</button></th>
                  <th scope="col" aria-sort={ariaSort('count')}><button type="button" className="ps-casereport-sort" onClick={() => sortBy('count')}>{t('caseReport.table.cases')}{arrow('count')}</button></th>
                  <th scope="col">{t('caseReport.table.share')}</th>
                  <th scope="col" aria-sort={ariaSort('median')}><button type="button" className="ps-casereport-sort" onClick={() => sortBy('median')}>{t('caseReport.table.medianDays')}{arrow('median')}</button></th>
                </tr>
              </thead>
              <tbody>
                {r.report.groups.map(g => {
                  const open = r.openGroupKey === g.key;
                  const label = reportGroupLabel(r.report!.groupBy, g.key, ctx);
                  return (
                    <React.Fragment key={g.key}>
                      <tr>
                        <td>
                          <button type="button" className="ps-casereport-sort" aria-expanded={open} onClick={() => r.openGroup(open ? null : g.key)} title={t('caseReport.showCases')}>
                            {open ? '▾ ' : '▸ '}<span data-phi="name">{label}</span>
                          </button>
                        </td>
                        <td>{g.count}</td>
                        <td>
                          <span className="ps-casereport-bar" aria-hidden="true" style={{ '--ps-share': `${Math.round(g.share * 100)}%` } as React.CSSProperties}><span /></span>
                          {pct.format(g.share)}
                        </td>
                        <td>{g.medianTatDays === null ? t('caseReport.table.noMedian') : num.format(g.medianTatDays)}</td>
                      </tr>
                      {open && (
                        <tr><td colSpan={4}>
                          {r.groupState === 'loading' && <LoadingState label={t('caseReport.loadingGroup')} variant="inline" />}
                          {r.groupState === 'failed' && <p className="ps-searchpage-notice ps-searchpage-notice--error" role="alert">{t('caseReport.failed')}</p>}
                          {r.groupState === 'done' && r.groupReport && <CasesTable report={r.groupReport} columns={r.columns} ctx={ctx} />}
                        </td></tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr><th scope="row">{t('caseReport.table.total')}</th><td>{r.report.total}</td><td>{pct.format(r.report.total ? 1 : 0)}</td><td /></tr>
              </tfoot>
            </table>
            {r.report.total === 0 && <p className="ps-svf-hint">{t('caseReport.noCases')}</p>}
          </div>
        )
      )}
    </div>
  );
};
