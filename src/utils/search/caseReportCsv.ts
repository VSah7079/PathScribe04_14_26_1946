// src/utils/search/caseReportCsv.ts
// ─────────────────────────────────────────────────
// Batch 613: the report's CSV. A grouped report is written as one row per group (name, cases,
// share, median days to sign-out) with a total row; a list report as one row per case with the
// chosen columns. Every cell is quoted and formula cells are neutralised (csvQuoted).
// ─────────────────────────────────────────────────
import { csvQuoted } from '../csv';
import type { CaseSearchReport, ReportColumn } from '@/services/caseSearch/caseSearchReport';
import { reportCellText, reportColumnLabel, reportGroupLabel, type ReportFormatContext } from './caseReportLabels';

const line = (cells: readonly string[]) => cells.map(csvQuoted).join(',');

export function buildCaseReportCsv(report: CaseSearchReport, columns: readonly ReportColumn[], ctx: ReportFormatContext): string {
  if (report.groupBy !== 'none') {
    const pct = new Intl.NumberFormat(ctx.locale, { style: 'percent', maximumFractionDigits: 1 });
    const num = new Intl.NumberFormat(ctx.locale, { maximumFractionDigits: 1 });
    const lines = [line([ctx.t(`caseReport.groupBy.${report.groupBy}`), ctx.t('caseReport.table.cases'), ctx.t('caseReport.table.share'), ctx.t('caseReport.table.medianDays')])];
    for (const g of report.groups) {
      lines.push(line([reportGroupLabel(report.groupBy, g.key, ctx), String(g.count), pct.format(g.share), g.medianTatDays === null ? '' : num.format(g.medianTatDays)]));
    }
    lines.push(line([ctx.t('caseReport.table.total'), String(report.total), pct.format(report.total ? 1 : 0), '']));
    return lines.join('\r\n');
  }
  const header = line(columns.map(c => reportColumnLabel(c, ctx)));
  const body = report.rows.map(r => line(columns.map(c => reportCellText(c, r.cells[c], ctx))));
  return [header, ...body].join('\r\n');
}

/** pathscribe-case-report-2026-09-27.csv (the date is the facility's). */
export function caseReportCsvFilename(facilityDate: string): string {
  return `pathscribe-case-report-${facilityDate}.csv`;
}
