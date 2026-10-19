// src/utils/search/caseReportLabels.ts
// ─────────────────────────────────────────────────
// Batch 613: how a report shows its values. The report holds ids, codes and ISO dates (data);
// this turns them into words in the user's language, for the screen and the CSV alike.
// ─────────────────────────────────────────────────
import type { CaseStatus } from '@/types/case/CaseStatus';
import type { CasePriority } from '@/services/cases/ICaseService';
import type { CaseSearchCaseType } from '@/services/caseSearch/caseSearchTypes';
import {
  REPORT_BLANK_GROUP_KEY, REPORT_OTHER_GROUP_KEY, parseSynopticColumn, type ReportColumn, type ReportGroupBy,
} from '@/services/caseSearch/caseSearchReport';
import type { SynopticProtocolInfo } from '@/services/caseSearch/ICaseSearchService';
import { CASE_PRIORITY_LABEL_KEY, CASE_SEX_LABEL_KEY, CASE_STATUS_LABEL_KEY, CASE_TYPE_LABEL_KEY } from './caseSearchLabels';
import { formatCalendarDate } from './caseSearchCsv';

type T = (key: string, opts?: Record<string, unknown>) => string;

export const REPORT_GROUP_BY_LABEL_KEY: Record<ReportGroupBy, string> = {
  none: 'caseReport.groupBy.none', pathologist: 'caseReport.groupBy.pathologist', month: 'caseReport.groupBy.month',
  diagnosis: 'caseReport.groupBy.diagnosis', facility: 'caseReport.groupBy.facility', caseType: 'caseReport.groupBy.caseType',
  status: 'caseReport.groupBy.status', priority: 'caseReport.groupBy.priority', subspecialty: 'caseReport.groupBy.subspecialty',
};

export const REPORT_COLUMN_LABEL_KEY: Record<string, string> = {
  accession: 'caseReport.column.accession', patientName: 'caseReport.column.patientName', mrn: 'caseReport.column.mrn',
  sex: 'caseReport.column.sex', age: 'caseReport.column.age', specimens: 'caseReport.column.specimens',
  accessionDate: 'caseReport.column.accessionDate', signedOutDate: 'caseReport.column.signedOutDate',
  orderingPhysician: 'caseReport.column.orderingPhysician', facility: 'caseReport.column.facility',
  pathologist: 'caseReport.column.pathologist', caseType: 'caseReport.column.caseType', diagnosis: 'caseReport.column.diagnosis',
  priority: 'caseReport.column.priority', status: 'caseReport.column.status', flags: 'caseReport.column.flags',
  turnaroundDays: 'caseReport.column.turnaroundDays',
};

/** Names for the ids a report holds. A missing name falls back to the id. */
export interface ReportNameLookups {
  pathologist(id: string): string | undefined;
  facility(id: string): string | undefined;
  subspecialty(id: string): string | undefined;
  protocols: readonly SynopticProtocolInfo[];
}

export interface ReportFormatContext { t: T; locale: string; timeZone: string; names: ReportNameLookups }

/** The heading of a column: its translated name, or "Protocol: Question" for a synoptic answer. */
export function reportColumnLabel(column: ReportColumn, ctx: Pick<ReportFormatContext, 't' | 'names'>): string {
  const synoptic = parseSynopticColumn(column);
  if (synoptic) {
    const protocol = ctx.names.protocols.find(p => p.templateId === synoptic.templateId);
    const field = protocol?.fields.find(f => f.id === synoptic.fieldId);
    return `${protocol?.name ?? synoptic.templateId}: ${field?.label ?? synoptic.fieldId}`;
  }
  const key = REPORT_COLUMN_LABEL_KEY[column];
  return key ? ctx.t(key) : column;
}

/** A group's name on screen and in the file. */
export function reportGroupLabel(groupBy: ReportGroupBy, key: string, ctx: ReportFormatContext): string {
  if (key === REPORT_OTHER_GROUP_KEY) return ctx.t('caseReport.group.other');
  if (key === REPORT_BLANK_GROUP_KEY) return ctx.t('caseReport.group.blank');
  switch (groupBy) {
    case 'pathologist': return ctx.names.pathologist(key) ?? key;
    case 'facility': return ctx.names.facility(key) ?? key;
    case 'subspecialty': return ctx.names.subspecialty(key) ?? key;
    case 'caseType': { const k = CASE_TYPE_LABEL_KEY[key as CaseSearchCaseType]; return k ? ctx.t(k) : key; }
    case 'status': { const k = CASE_STATUS_LABEL_KEY[key as CaseStatus]; return k ? ctx.t(k) : key; }
    case 'priority': { const k = CASE_PRIORITY_LABEL_KEY[key as CasePriority]; return k ? ctx.t(k) : key; }
    case 'month': {
      const d = new Date(`${key}-01T00:00:00Z`);
      return Number.isNaN(d.getTime()) ? key : new Intl.DateTimeFormat(ctx.locale, { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(d);
    }
    default: return key;
  }
}

/** One cell as text. A list (specimens, flags, a multi-choice answer) is joined with "; ". */
export function reportCellText(column: ReportColumn, value: string | string[] | undefined, ctx: ReportFormatContext): string {
  if (value === undefined) return '';
  if (Array.isArray(value)) return value.join('; ');
  switch (column) {
    case 'accessionDate': case 'signedOutDate': return formatCalendarDate(value, ctx.locale, ctx.timeZone);
    case 'pathologist': return value ? (ctx.names.pathologist(value) ?? value) : '';
    case 'facility': return value ? (ctx.names.facility(value) ?? value) : '';
    case 'caseType': { const k = CASE_TYPE_LABEL_KEY[value as CaseSearchCaseType]; return k ? ctx.t(k) : value; }
    case 'status': { const k = CASE_STATUS_LABEL_KEY[value as CaseStatus]; return k ? ctx.t(k) : value; }
    case 'priority': { const k = CASE_PRIORITY_LABEL_KEY[value as CasePriority]; return k ? ctx.t(k) : value; }
    case 'sex': { const k = CASE_SEX_LABEL_KEY[value as 'M' | 'F' | 'U']; return k ? ctx.t(k) : value; }
    default: return value;
  }
}
