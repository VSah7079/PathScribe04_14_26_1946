// src/services/caseReports/caseReportDefinition.ts
// ─────────────────────────────────────────────────
// Batch 613: a saved report definition = the search (the Search page's whole draft) + how the
// results are shown (grouping and columns). Saved through the saved-search service under the
// 'caseReport' context, so it is private to its owner like any saved search. Pure.
// ─────────────────────────────────────────────────
import type { CaseSearchDraft } from '../caseSearch/caseSearchTypes';
import { emptyCaseSearchDraft } from '../caseSearch/caseSearchTypes';
import { normalizeCaseSearchDraft } from '@/utils/search/buildCaseSearchRequest';
import {
  DEFAULT_REPORT_COLUMNS, REPORT_GROUP_BYS, cleanColumns, type ReportColumn, type ReportGroupBy,
} from '../caseSearch/caseSearchReport';

export interface CaseReportDefinition {
  kind: 'caseReport';
  draft: CaseSearchDraft;
  groupBy: ReportGroupBy;
  columns: ReportColumn[];
}

export function emptyCaseReportDefinition(timeZone = '', today = ''): CaseReportDefinition {
  return { kind: 'caseReport', draft: emptyCaseSearchDraft(timeZone, today), groupBy: 'pathologist', columns: [...DEFAULT_REPORT_COLUMNS] };
}

export function isCaseReportDefinition(v: unknown): v is CaseReportDefinition {
  return !!v && typeof v === 'object' && (v as { kind?: unknown }).kind === 'caseReport';
}

/** A stored definition read back safely, whatever version saved it (pure). */
export function normalizeCaseReportDefinition(value: unknown, timeZone = '', today = ''): CaseReportDefinition {
  const r = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const columns = cleanColumns(Array.isArray(r.columns) ? (r.columns as string[]) : []);
  return {
    kind: 'caseReport',
    draft: normalizeCaseSearchDraft(r.draft, timeZone, today),
    groupBy: REPORT_GROUP_BYS.includes(r.groupBy as ReportGroupBy) ? (r.groupBy as ReportGroupBy) : 'pathologist',
    columns: columns.length ? columns : [...DEFAULT_REPORT_COLUMNS],
  };
}
