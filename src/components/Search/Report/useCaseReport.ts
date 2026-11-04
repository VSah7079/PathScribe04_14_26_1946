// src/components/Search/Report/useCaseReport.ts
// ─────────────────────────────────────────────────
// Batch 613: the state behind the Search page's report view: the grouping and columns, the
// report the service returned, one group opened for its cases, the protocols' questions,
// and the saved definitions. The service applies access rules; nothing here widens them.
// ─────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { caseSearchService, savedCaseReportService } from '@/services';
import { draftToCriteria } from '@/utils/search/buildCaseSearchRequest';
import type { CaseSearchDraft } from '@/services/caseSearch/caseSearchTypes';
import type { SynopticProtocolInfo } from '@/services/caseSearch/ICaseSearchService';
import {
  DEFAULT_REPORT_COLUMNS, DEFAULT_REPORT_GROUP_SORT, cleanColumns, sortReportGroups,
  type CaseSearchReport, type ReportColumn, type ReportGroupBy, type ReportGroupSort,
} from '@/services/caseSearch/caseSearchReport';
import type { CaseReportDefinition } from '@/services/caseReports/caseReportDefinition';
import type { SavedCaseReport } from '@/services/caseReports/savedCaseReports';

export type ReportLoadState = 'idle' | 'loading' | 'done' | 'failed';

export interface UseCaseReport {
  groupBy: ReportGroupBy;
  setGroupBy(g: ReportGroupBy): void;
  columns: ReportColumn[];
  setColumns(c: ReportColumn[]): void;
  groupSort: ReportGroupSort;
  setGroupSort(s: ReportGroupSort): void;
  report: CaseSearchReport | null;
  state: ReportLoadState;
  /** The group opened for its cases, and those cases. */
  openGroupKey: string | null;
  openGroup(key: string | null): void;
  groupReport: CaseSearchReport | null;
  groupState: ReportLoadState;
  protocols: SynopticProtocolInfo[];
  saved: SavedCaseReport[];
  refreshSaved(): Promise<void>;
  /** The definition as it stands: the searched draft plus grouping and columns. */
  definition(): CaseReportDefinition | null;
  applyDefinition(d: CaseReportDefinition): void;
}

export function useCaseReport(searchedDraft: CaseSearchDraft | null, timeZone: string, active: boolean): UseCaseReport {
  const [groupBy, setGroupBy] = useState<ReportGroupBy>('pathologist');
  const [columns, setColumnsState] = useState<ReportColumn[]>([...DEFAULT_REPORT_COLUMNS]);
  const [groupSort, setGroupSort] = useState<ReportGroupSort>(DEFAULT_REPORT_GROUP_SORT);
  const [report, setReport] = useState<CaseSearchReport | null>(null);
  const [state, setState] = useState<ReportLoadState>('idle');
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);
  const [groupReport, setGroupReport] = useState<CaseSearchReport | null>(null);
  const [groupState, setGroupState] = useState<ReportLoadState>('idle');
  const [protocols, setProtocols] = useState<SynopticProtocolInfo[]>([]);
  const [saved, setSaved] = useState<SavedCaseReport[]>([]);
  // Only the latest request may set state (a slow earlier one must not overwrite a newer result).
  const generation = useRef(0);
  const groupGeneration = useRef(0);

  const setColumns = useCallback((c: ReportColumn[]) => setColumnsState(cleanColumns(c)), []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void caseSearchService.listSynopticProtocols().then(r => { if (!cancelled && r.ok) setProtocols(r.data); }).catch(() => {});
    return () => { cancelled = true; };
  }, [active]);

  const refreshSaved = useCallback(async () => {
    const r = await savedCaseReportService.list().catch(() => null);
    if (r?.ok) setSaved(r.data);
  }, []);
  useEffect(() => { if (active) void refreshSaved(); }, [active, refreshSaved]);

  const columnsKey = columns.join('|');
  useEffect(() => {
    if (!active || !searchedDraft) return;
    const mine = ++generation.current;
    groupGeneration.current += 1;
    setState('loading'); setOpenGroupKey(null); setGroupReport(null);
    void caseSearchService.report({ criteria: draftToCriteria(searchedDraft), timeZone, groupBy, columns, rowLimit: groupBy === 'none' ? undefined : 0 })
      .then(r => { if (mine !== generation.current) return; if (r.ok) { setReport(r.data); setState('done'); } else setState('failed'); })
      .catch(() => { if (mine === generation.current) setState('failed'); });
    // columns is read through columnsKey so a new array with the same columns does not re-run the report.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, searchedDraft, timeZone, groupBy, columnsKey]);

  const openGroup = useCallback((key: string | null) => {
    setOpenGroupKey(key);
    if (key === null || !searchedDraft) { setGroupReport(null); return; }
    const mine = ++groupGeneration.current;
    setGroupState('loading');
    void caseSearchService.report({ criteria: draftToCriteria(searchedDraft), timeZone, groupBy, columns, groupKey: key })
      .then(r => { if (mine !== groupGeneration.current) return; if (r.ok) { setGroupReport(r.data); setGroupState('done'); } else setGroupState('failed'); })
      .catch(() => { if (mine === groupGeneration.current) setGroupState('failed'); });
  }, [searchedDraft, timeZone, groupBy, columns]);

  const sortedReport = useMemo(
    () => (report ? { ...report, groups: sortReportGroups(report.groups, groupSort) } : null),
    [report, groupSort],
  );

  return {
    groupBy, setGroupBy, columns, setColumns, groupSort, setGroupSort, report: sortedReport, state,
    openGroupKey, openGroup, groupReport, groupState, protocols, saved, refreshSaved,
    definition: () => (searchedDraft ? { kind: 'caseReport', draft: searchedDraft, groupBy, columns } : null),
    applyDefinition: d => { setGroupBy(d.groupBy); setColumnsState(cleanColumns(d.columns)); },
  };
}
