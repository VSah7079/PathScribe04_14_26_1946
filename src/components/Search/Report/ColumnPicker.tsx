// src/components/Search/Report/ColumnPicker.tsx
// Batch 613: choose a report's columns (standard ones and synoptic answers) and put them in order.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SynopticProtocolInfo } from '@/services/caseSearch/ICaseSearchService';
import {
  MAX_REPORT_COLUMNS, REPORT_STANDARD_COLUMNS, synopticColumn, type ReportColumn,
} from '@/services/caseSearch/caseSearchReport';
import { REPORT_COLUMN_LABEL_KEY } from '@/utils/search/caseReportLabels';

interface Props {
  columns: ReportColumn[];
  protocols: readonly SynopticProtocolInfo[];
  onChange(next: ReportColumn[]): void;
  labelOf(c: ReportColumn): string;
}

export const ColumnPicker: React.FC<Props> = ({ columns, protocols, onChange, labelOf }) => {
  const { t } = useTranslation();
  const [templateId, setTemplateId] = useState('');
  const protocol = protocols.find(p => p.templateId === templateId);
  const full = columns.length >= MAX_REPORT_COLUMNS;
  const toggle = (c: ReportColumn) => onChange(columns.includes(c) ? columns.filter(x => x !== c) : [...columns, c]);
  const move = (i: number, by: -1 | 1) => {
    const j = i + by; if (j < 0 || j >= columns.length) return;
    const next = [...columns]; [next[i], next[j]] = [next[j], next[i]]; onChange(next);
  };

  return (
    <div className="ps-casereport-columns" data-testid="report-columns">
      <fieldset className="ps-casereport-fieldset">
        <legend>{t('caseReport.columns.standard')}</legend>
        <div className="ps-searchpage-pill-row">
          {REPORT_STANDARD_COLUMNS.map(c => (
            <label key={c} className="ps-casereport-check">
              <input type="checkbox" checked={columns.includes(c)} disabled={!columns.includes(c) && full} onChange={() => toggle(c)} />
              {t(REPORT_COLUMN_LABEL_KEY[c])}
            </label>
          ))}
        </div>
      </fieldset>
      {protocols.length > 0 && (
        <fieldset className="ps-casereport-fieldset">
          <legend>{t('caseReport.columns.synoptic')}</legend>
          <select className="ps-searchpage-basis-select" aria-label={t('searchPage.synopticValues.protocol')} value={templateId} onChange={e => setTemplateId(e.target.value)}>
            <option value="">{t('caseReport.columns.chooseProtocol')}</option>
            {protocols.map(p => <option key={p.templateId} value={p.templateId}>{p.name}</option>)}
          </select>
          {protocol && (
            <div className="ps-searchpage-pill-row">
              {protocol.fields.map(f => {
                const c = synopticColumn(protocol.templateId, f.id);
                return (
                  <label key={f.id} className="ps-casereport-check">
                    <input type="checkbox" checked={columns.includes(c)} disabled={!columns.includes(c) && full} onChange={() => toggle(c)} />
                    {f.label}
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>
      )}
      <ol className="ps-casereport-order" aria-label={t('caseReport.columns.order')}>
        {columns.map((c, i) => (
          <li key={c}>
            <span>{labelOf(c)}</span>
            <button type="button" className="ps-searchpage-pager-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t('caseReport.columns.moveUp', { column: labelOf(c) })}>↑</button>
            <button type="button" className="ps-searchpage-pager-btn" onClick={() => move(i, 1)} disabled={i === columns.length - 1} aria-label={t('caseReport.columns.moveDown', { column: labelOf(c) })}>↓</button>
          </li>
        ))}
      </ol>
      <p className="ps-svf-hint">{t('caseReport.columns.count', { count: columns.length, max: MAX_REPORT_COLUMNS })}</p>
    </div>
  );
};
