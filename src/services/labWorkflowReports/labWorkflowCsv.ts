// src/services/labWorkflowReports/labWorkflowCsv.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 730: a lab workflow report as table rows (screen) and CSV rows (export),
// and its export. The columns are fixed per report; their headings come from the
// caller (translated on the screen). Values are data: numbers, step and group
// ids, station names, accession numbers in the exception rows only. The export
// checks the report's own export capability and is recorded in the audit log
// with the row count (no case data).
// ─────────────────────────────────────────────────────────────────────────────
import { toCsv, downloadCsv } from '@/utils/csv';
import type { LabWorkflowReportId } from './labWorkflowReportTypes';
import type { LabWorkflowReportOutput, LabWorkflowReportDeps } from './labWorkflowReportService';
import { checkReportExport } from './labWorkflowReportService';
import type { recordDocumentOutput } from '../printing/recordDocumentOutput';
import { DESTINATION } from '../printing/documentOutputAudit';

export type CellValue = string | number | null;

/** The columns of each report, in order. */
export const REPORT_COLUMNS: Readonly<Record<LabWorkflowReportId, readonly string[]>> = {
  turnaround: ['group', 'step', 'cases', 'medianHours', 'p90Hours', 'targetHours', 'late', 'latePct'],
  statPerformance: ['group', 'step', 'cases', 'medianHours', 'p90Hours', 'targetHours', 'late', 'latePct'],
  stationVolume: ['period', 'stationName', 'stage', 'items', 'scans'],
  addOns: ['type', 'ordered', 'cut', 'medianMinutesToCut', 'stat'],
  rework: ['measure', 'value'],
  reconciliation: ['kind', 'carrier', 'item', 'caseAccession', 'at', 'by', 'reason', 'reasonCode'],
  batchDuration: ['node', 'carrier', 'startedAt', 'finishedAt', 'minutes', 'targetMinutes', 'overTarget'],
};

/** The report's rows as plain records keyed by column. */
export function reportRecords(out: LabWorkflowReportOutput): Record<string, CellValue>[] {
  const cols = REPORT_COLUMNS[out.id];
  return (out.rows as unknown as Record<string, unknown>[]).map(r => Object.fromEntries(cols.map(c => {
    const v = r[c];
    return [c, typeof v === 'boolean' ? (v ? 'yes' : 'no') : (v as CellValue) ?? null];
  })));
}

/** CSV rows with the given column headings (and translated codes where the caller maps them). */
export function reportCsvRows(out: LabWorkflowReportOutput, heading: (column: string) => string, value: (column: string, v: CellValue) => string | number = (_c, v) => v ?? ''): Record<string, string | number>[] {
  const cols = REPORT_COLUMNS[out.id];
  return reportRecords(out).map(r => Object.fromEntries(cols.map(c => [heading(c), value(c, r[c])])));
}

export type LabWorkflowExportResult = { ok: true; rowCount: number } | { ok: false; reason: 'notPermitted' };

export async function exportLabWorkflowReport(
  id: LabWorkflowReportId, rows: Record<string, string | number>[], filename: string,
  deps: { enforce: LabWorkflowReportDeps['enforce']; deliver?: (filename: string, csv: string) => void; record?: typeof recordDocumentOutput },
): Promise<LabWorkflowExportResult> {
  if (!(await checkReportExport(id, deps.enforce)).allowed) return { ok: false, reason: 'notPermitted' };
  (deps.deliver ?? downloadCsv)(filename, toCsv(rows));
  const record = deps.record ?? (await import('../printing/recordDocumentOutput')).recordDocumentOutput;
  await record({
    action: 'export', document: `lab-workflow-${id}`, destination: DESTINATION.download(filename.endsWith('.csv') ? filename : `${filename}.csv`),
    status: 'success', format: 'csv', rowCount: rows.length, facilityId: null,
  }).catch(e => console.error('[labWorkflowReports] The export was not recorded in the audit log:', e));
  return { ok: true, rowCount: rows.length };
}
