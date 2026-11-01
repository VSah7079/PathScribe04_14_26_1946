// src/pages/BatchManagement/hooks/useLabWorkflowReports.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 730 (Lab Workflow & Batch spec §9): the Lab Workflow Reports screen's
// state: which report, the dates and options, the rows, and the export. Rebuilds
// on every change (no Run button: click economy). The deciding is in
// services/labWorkflowReports/.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react';
import { buildLabWorkflowReport, type LabWorkflowReportOutput, type LabWorkflowReportParams } from '@/services/labWorkflowReports/labWorkflowReportService';
import { labWorkflowReportDeps } from '@/services/labWorkflowReports/labWorkflowReportDeps';
import { exportLabWorkflowReport, reportCsvRows, type CellValue } from '@/services/labWorkflowReports/labWorkflowCsv';
import { runLabWorkflowExport } from '@/services/labWorkflowReports/runLabWorkflowExport';
import { defaultReportDates, reportRangeOf } from '@/services/labWorkflowReports/reportDates';
import { authorizationService } from '@/services';
import { DEFAULT_TAT_TARGET_HOURS, type LabWorkflowReportId, type TatGrouping, type TatStep } from '@/services/labWorkflowReports/labWorkflowReportTypes';

export interface ReportForm {
  id: LabWorkflowReportId;
  fromDate: string;
  toDate: string;
  grouping: TatGrouping;
  by: 'day' | 'week';
  targets: Record<TatStep, number>;
  stainingTargetMinutes: number;
}

export function useLabWorkflowReports(timeZone: string) {
  const [form, setForm] = useState<ReportForm>(() => ({
    id: 'turnaround', ...defaultReportDates(timeZone), grouping: 'none', by: 'day', targets: { ...DEFAULT_TAT_TARGET_HOURS }, stainingTargetMinutes: 120,
  }));
  const [output, setOutput] = useState<LabWorkflowReportOutput | null>(null);
  const [error, setError] = useState<'NOT_PERMITTED' | 'LOAD_FAILED' | 'BAD_DATES' | null>(null);
  const [loading, setLoading] = useState(false);

  const params = useCallback((f: ReportForm): LabWorkflowReportParams | null => {
    const range = reportRangeOf(f.fromDate, f.toDate, timeZone);
    if (!range) return null;
    return { id: f.id, range, timeZone, grouping: f.grouping, targets: f.targets, by: f.by, stainingTargetMinutes: f.stainingTargetMinutes };
  }, [timeZone]);

  useEffect(() => {
    let live = true;
    const p = params(form);
    if (!p) { setError('BAD_DATES'); setOutput(null); return; }
    setLoading(true);
    void labWorkflowReportDeps().then(deps => buildLabWorkflowReport(p, deps)).then(res => {
      if (!live) return;
      setLoading(false);
      if (res.ok === true) { setOutput(res.data); setError(null); } else { setOutput(null); setError(res.error); }
    });
    return () => { live = false; };
  }, [form, params]);

  const update = useCallback((change: Partial<ReportForm>) => setForm(f => ({ ...f, ...change })), []);

  /** Exports the rows on screen; false when refused. */
  const exportCsv = useCallback(async (heading: (column: string) => string, value: (column: string, v: CellValue) => string | number): Promise<boolean> => {
    const p = params(form);
    if (!output || !p) return false;
    const filename = `lab-workflow-${form.id}-${form.fromDate}-to-${form.toDate}`;
    let allowed = true;
    await runLabWorkflowExport(form.id, filename, { ...p, from: p.range.from, to: p.range.to }, async () => {
      const res = await exportLabWorkflowReport(form.id, reportCsvRows(output, heading, value), filename, { enforce: k => authorizationService.enforce(k as never) });
      allowed = res.ok === true;
    });
    return allowed;
  }, [form, output, params]);

  return { form, update, output, error, loading, exportCsv };
}
