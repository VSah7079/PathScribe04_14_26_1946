// src/services/caseSearch/caseSearchReport.ts
// ─────────────────────────────────────────────────
// Batch 613: reporting on the cases a search finds. The same search (same criteria, same
// access rules) feeds a report that
//   • groups the matching cases (by pathologist, month, diagnosis, facility, case type,
//     status, priority or subspecialty) and counts them, with each group's share and the
//     median turnaround (days from accession to sign-out), or
//   • lists them with the columns the user chose, including answers from synoptic reports.
//
// Pure: it takes the cases the search already matched, so access rules have been applied
// before anything is counted. The API server does the same in SQL
// (docs/architecture/CASE_SEARCH_API.md).
// ─────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';
import {
  ageOn, caseAccessionInstant, caseReleasedInstant, caseSignedOutInstant, caseStaffInRole, caseTypesOf, patientSortName,
  toFacilityDate, type CaseSearchMatchContext,
} from './caseSearchMatching';
import type { CaseSearchCaseType, CaseSearchCriteria } from './caseSearchTypes';
import { answerDisplay, answerValues } from './synopticValueCriteria';

// ── What a report is ───────────────────────────────────────────────

export type ReportGroupBy =
  | 'none' | 'pathologist' | 'month' | 'diagnosis' | 'facility' | 'caseType' | 'status' | 'priority' | 'subspecialty';

export const REPORT_GROUP_BYS: readonly ReportGroupBy[] = [
  'none', 'pathologist', 'month', 'diagnosis', 'facility', 'caseType', 'status', 'priority', 'subspecialty',
];

/** Columns every case has. A synoptic answer column is `synoptic:<templateId>:<fieldId>`. */
export type ReportStandardColumn =
  | 'accession' | 'patientName' | 'mrn' | 'sex' | 'age' | 'specimens' | 'accessionDate' | 'signedOutDate'
  | 'orderingPhysician' | 'facility' | 'pathologist' | 'caseType' | 'diagnosis' | 'priority' | 'status'
  | 'flags' | 'turnaroundDays';

export const REPORT_STANDARD_COLUMNS: readonly ReportStandardColumn[] = [
  'accession', 'patientName', 'mrn', 'sex', 'age', 'specimens', 'accessionDate', 'signedOutDate',
  'orderingPhysician', 'facility', 'pathologist', 'caseType', 'diagnosis', 'priority', 'status', 'flags', 'turnaroundDays',
];

export type ReportColumn = ReportStandardColumn | `synoptic:${string}:${string}`;

export const DEFAULT_REPORT_COLUMNS: readonly ReportColumn[] = [
  'accession', 'accessionDate', 'signedOutDate', 'pathologist', 'diagnosis', 'status', 'turnaroundDays',
];

/** The most columns one report carries. */
export const MAX_REPORT_COLUMNS = 24;
/** Case rows shown on screen for a list report or one group. The export carries every match up to its limit. */
export const REPORT_DETAIL_PREVIEW_LIMIT = 200;
/** The most groups returned; the rest are counted under one "other" group. */
export const REPORT_GROUP_LIMIT = 500;
/** The key of that last group. */
export const REPORT_OTHER_GROUP_KEY = '\u0000other';
/** The key of cases with no value for the grouping (no pathologist yet, no diagnosis …). */
export const REPORT_BLANK_GROUP_KEY = '';

export type ReportGroupSortKey = 'label' | 'count' | 'median';
export interface ReportGroupSort { key: ReportGroupSortKey; direction: 'asc' | 'desc' }
export const DEFAULT_REPORT_GROUP_SORT: ReportGroupSort = { key: 'count', direction: 'desc' };

export interface CaseSearchReportRequest {
  criteria: CaseSearchCriteria;
  timeZone?: string;
  groupBy: ReportGroupBy;
  columns: ReportColumn[];
  /** Only the cases of this group in `rows` (a key from an earlier report). */
  groupKey?: string;
  /** Most rows to return (default REPORT_DETAIL_PREVIEW_LIMIT). */
  rowLimit?: number;
}

export interface ReportGroup {
  /** A staff or facility id, a status or case type code, YYYY-MM, or the diagnosis text. Not translated. */
  key: string;
  count: number;
  /** count / total, 0 to 1. */
  share: number;
  /** Median days from accession to sign-out over the group's signed-out cases; null when none. */
  medianTatDays: number | null;
}

/** One case's cells, by column. Values are data (ids, codes, ISO dates); screens and the CSV translate them. */
export interface ReportRow {
  caseId: string;
  cells: Partial<Record<ReportColumn, string | string[]>>;
}

export interface CaseSearchReport {
  /** Every case that matched. */
  total: number;
  groupBy: ReportGroupBy;
  /** Empty when groupBy is 'none'. */
  groups: ReportGroup[];
  rows: ReportRow[];
  /** More cases matched than rows holds. */
  rowsTruncated: boolean;
  /** More groups existed than were returned (the rest are in the "other" group). */
  groupsTruncated: boolean;
}

export function isSynopticColumn(c: ReportColumn): c is `synoptic:${string}:${string}` {
  return c.startsWith('synoptic:');
}

/** Splits `synoptic:<templateId>:<fieldId>`; ids may not contain a colon, so the split is exact. */
export function parseSynopticColumn(c: ReportColumn): { templateId: string; fieldId: string } | null {
  if (!isSynopticColumn(c)) return null;
  const [, templateId, ...rest] = c.split(':');
  const fieldId = rest.join(':');
  return templateId && fieldId ? { templateId, fieldId } : null;
}

export const synopticColumn = (templateId: string, fieldId: string): ReportColumn => `synoptic:${templateId}:${fieldId}`;

/** A column list the report accepts: known columns only, no duplicates, at most MAX_REPORT_COLUMNS (pure). */
export function cleanColumns(columns: readonly string[] | undefined): ReportColumn[] {
  const out: ReportColumn[] = [];
  for (const c of columns ?? []) {
    const ok = (REPORT_STANDARD_COLUMNS as readonly string[]).includes(c) || parseSynopticColumn(c as ReportColumn) !== null;
    if (ok && !out.includes(c as ReportColumn)) out.push(c as ReportColumn);
    if (out.length >= MAX_REPORT_COLUMNS) break;
  }
  return out;
}

// ── Working a case out ───────────────────────────────────────────────

const CASE_TYPE_ORDER: readonly CaseSearchCaseType[] = ['surgical', 'gynCytology', 'nonGynCytology', 'autopsy'];

/** A case counts under one type: the first it has, in this order. */
export function primaryCaseType(c: Case, ctx: CaseSearchMatchContext): CaseSearchCaseType | '' {
  const types = caseTypesOf(c, ctx.specimenDictionary);
  return CASE_TYPE_ORDER.find(t => types.has(t)) ?? '';
}

/** The pathologist a case is counted under: who signed it out, else who it is assigned to. */
export function responsiblePathologist(c: Case, ctx: CaseSearchMatchContext): string {
  const signed = [...caseStaffInRole(c, 'signedOut', ctx)][0];
  if (signed) return signed;
  return [...caseStaffInRole(c, 'assigned', ctx)][0] ?? '';
}

function subspecialtyOfCase(c: Case, ctx: CaseSearchMatchContext): string {
  const lab = ctx.performingLabByFacilityId?.get(c.order?.facilityId ?? '');
  return c.subspecialtyId ?? ctx.subspecialtyOf?.(c, lab) ?? '';
}

/** Whole and part days from accession to sign-out, or null while the case is open. */
export function turnaroundDays(c: Case): number | null {
  const start = Date.parse(caseAccessionInstant(c) ?? '');
  const end = Date.parse(caseSignedOutInstant(c) ?? '');
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.round(((end - start) / 86_400_000) * 10) / 10;
}

export function medianOf(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return Math.round((s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2) * 10) / 10;
}

function monthOf(c: Case, criteria: CaseSearchCriteria, timeZone: string): string {
  const basis = criteria.dateBasis;
  const instant = basis === 'signedOut' ? caseSignedOutInstant(c)
    : basis === 'released' ? caseReleasedInstant(c)
    : caseAccessionInstant(c);
  return toFacilityDate(instant, timeZone)?.slice(0, 7) ?? '';
}

function diagnosisOf(c: Case): string {
  return (c.diagnostic?.primaryDiagnosis ?? '').replace(/\s+/g, ' ').trim();
}

/** The group a case falls in for a grouping (pure). */
export function groupKeyOf(c: Case, groupBy: ReportGroupBy, ctx: CaseSearchMatchContext, criteria: CaseSearchCriteria): string {
  switch (groupBy) {
    case 'pathologist': return responsiblePathologist(c, ctx);
    case 'month': return monthOf(c, criteria, ctx.timeZone);
    case 'diagnosis': return diagnosisOf(c).toLowerCase();
    case 'facility': return c.order?.facilityId ?? '';
    case 'caseType': return primaryCaseType(c, ctx);
    case 'status': return c.status ?? '';
    case 'priority': return c.order?.priority ?? 'Routine';
    case 'subspecialty': return subspecialtyOfCase(c, ctx);
    default: return '';
  }
}

// ── Cells ──────────────────────────────────────────────────────

/** One cell of one case (pure). Dates are ISO; people and facilities are ids. */
export function reportCell(c: Case, column: ReportColumn, ctx: CaseSearchMatchContext): string | string[] {
  const synoptic = parseSynopticColumn(column);
  if (synoptic) {
    const field = ctx.synopticFields?.get(synoptic.templateId)?.get(synoptic.fieldId);
    const values = (c.synopticReports ?? [])
      .filter(r => r.templateId === synoptic.templateId)
      .flatMap(r => answerValues(r.answers?.[synoptic.fieldId]))
      .map(v => answerDisplay(v, field));
    return [...new Set(values)];
  }
  switch (column as ReportStandardColumn) {
    case 'accession': return c.accession?.fullAccession ?? c.id;
    case 'patientName': return patientSortName(c);
    case 'mrn': return c.patient?.mrn ?? '';
    case 'sex': return c.patient?.sex ?? '';
    case 'age': {
      const dob = c.patient?.dateOfBirth?.slice(0, 10);
      const today = toFacilityDate(ctx.now.toISOString(), ctx.timeZone) ?? '';
      const age = dob ? ageOn(dob, today) : null;
      return age === null ? '' : String(age);
    }
    case 'specimens': return (c.specimens ?? []).map(s => s.description ?? s.label ?? '').filter(Boolean);
    case 'accessionDate': return caseAccessionInstant(c) ?? '';
    case 'signedOutDate': return caseSignedOutInstant(c) ?? '';
    case 'orderingPhysician': return c.order?.requestingProvider ?? '';
    case 'facility': return c.order?.facilityId ?? '';
    case 'pathologist': return responsiblePathologist(c, ctx);
    case 'caseType': return primaryCaseType(c, ctx);
    case 'diagnosis': return diagnosisOf(c);
    case 'priority': return c.order?.priority ?? 'Routine';
    case 'status': return c.status ?? '';
    case 'flags':
      return (c.caseFlags ?? []).filter(f => !f.deletedAt)
        .map(f => ctx.flagsById?.get(f.flagDefinitionId)?.name ?? (f as { name?: string }).name ?? '').filter(Boolean);
    case 'turnaroundDays': { const d = turnaroundDays(c); return d === null ? '' : String(d); }
    default: return '';
  }
}

export function reportRow(c: Case, columns: readonly ReportColumn[], ctx: CaseSearchMatchContext): ReportRow {
  const cells: ReportRow['cells'] = {};
  for (const col of columns) cells[col] = reportCell(c, col, ctx);
  return { caseId: c.id, cells };
}

// ── The report ───────────────────────────────────────────────

/**
 * Builds a report from the cases a search matched (already sorted by the caller).
 * `cases` have had the user's access rules applied; nothing here widens them.
 */
export function buildCaseReport(
  cases: readonly Case[], request: Pick<CaseSearchReportRequest, 'groupBy' | 'columns' | 'groupKey' | 'rowLimit' | 'criteria'>,
  ctx: CaseSearchMatchContext, sort: ReportGroupSort = DEFAULT_REPORT_GROUP_SORT,
): CaseSearchReport {
  const columns = cleanColumns(request.columns);
  const groupBy = REPORT_GROUP_BYS.includes(request.groupBy) ? request.groupBy : 'none';
  const total = cases.length;

  const labelByKey = new Map<string, string>();
  const buckets = new Map<string, { count: number; tat: number[] }>();
  if (groupBy !== 'none') {
    for (const c of cases) {
      const key = groupKeyOf(c, groupBy, ctx, request.criteria);
      if (groupBy === 'diagnosis' && key && !labelByKey.has(key)) labelByKey.set(key, diagnosisOf(c));
      const b = buckets.get(key) ?? { count: 0, tat: [] };
      b.count += 1;
      const d = turnaroundDays(c);
      if (d !== null) b.tat.push(d);
      buckets.set(key, b);
    }
  }
  const all: ReportGroup[] = [...buckets.entries()].map(([key, b]) => ({
    // A diagnosis group shows the text as first written; the key is its lower-case form.
    key: groupBy === 'diagnosis' && key ? (labelByKey.get(key) ?? key) : key,
    count: b.count, share: total ? b.count / total : 0, medianTatDays: medianOf(b.tat),
  }));
  const sorted = sortReportGroups(all, sort);
  let groups = sorted;
  let groupsTruncated = false;
  if (sorted.length > REPORT_GROUP_LIMIT) {
    const kept = sorted.slice(0, REPORT_GROUP_LIMIT);
    const rest = sorted.slice(REPORT_GROUP_LIMIT);
    const count = rest.reduce((n, g) => n + g.count, 0);
    kept.push({ key: REPORT_OTHER_GROUP_KEY, count, share: total ? count / total : 0, medianTatDays: null });
    groups = kept; groupsTruncated = true;
  }

  const wanted = request.groupKey === undefined || groupBy === 'none'
    ? cases
    : cases.filter(c => {
      // A diagnosis group's key is its text as first written; cases are grouped on the lower-case form.
      const want = groupBy === 'diagnosis' ? request.groupKey!.toLowerCase() : request.groupKey!;
      return groupKeyOf(c, groupBy, ctx, request.criteria) === want;
    });
  const limit = Math.max(0, Math.floor(request.rowLimit ?? REPORT_DETAIL_PREVIEW_LIMIT));
  const rows = wanted.slice(0, limit).map(c => reportRow(c, columns, ctx));
  return { total, groupBy, groups, rows, rowsTruncated: wanted.length > rows.length, groupsTruncated };
}

/** Groups in the order asked for; the blank group and "other" always come last (pure). */
export function sortReportGroups(groups: readonly ReportGroup[], sort: ReportGroupSort): ReportGroup[] {
  const dir = sort.direction === 'asc' ? 1 : -1;
  const last = (g: ReportGroup) => (g.key === REPORT_OTHER_GROUP_KEY ? 2 : g.key === REPORT_BLANK_GROUP_KEY ? 1 : 0);
  return [...groups].sort((a, b) => {
    if (last(a) !== last(b)) return last(a) - last(b);
    let cmp = 0;
    if (sort.key === 'count') cmp = a.count - b.count;
    else if (sort.key === 'median') {
      // Groups with no median sort after those with one, whichever way it is sorted.
      if (a.medianTatDays === null || b.medianTatDays === null) {
        if (a.medianTatDays === b.medianTatDays) cmp = 0;
        else return a.medianTatDays === null ? 1 : -1;
      } else cmp = a.medianTatDays - b.medianTatDays;
    } else cmp = a.key.localeCompare(b.key, undefined, { sensitivity: 'base', numeric: true });
    return cmp === 0 ? a.key.localeCompare(b.key) : cmp * dir;
  });
}

/** Whether a report asks for answers from synoptic reports (the search must load the protocols' questions). */
export function reportNeedsSynopticFields(request: Pick<CaseSearchReportRequest, 'columns' | 'criteria'>): boolean {
  return (request.criteria.synopticValues?.length ?? 0) > 0 || request.columns.some(isSynopticColumn);
}
