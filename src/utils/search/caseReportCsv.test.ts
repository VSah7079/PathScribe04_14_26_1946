import { describe, it, expect } from 'vitest';
import { buildCaseReportCsv, caseReportCsvFilename } from './caseReportCsv';
import { reportCellText, reportColumnLabel, reportGroupLabel, type ReportFormatContext } from './caseReportLabels';
import { REPORT_BLANK_GROUP_KEY, type CaseSearchReport } from '@/services/caseSearch/caseSearchReport';

const t = (key: string, o?: Record<string, unknown>) => (o ? `${key}${JSON.stringify(o)}` : key);
const ctx: ReportFormatContext = {
  t, locale: 'en-US', timeZone: 'UTC',
  names: {
    pathologist: id => ({ u1: 'Dr Lee' } as Record<string, string>)[id], facility: id => ({ f1: 'Main Lab' } as Record<string, string>)[id],
    subspecialty: () => undefined,
    protocols: [{ templateId: 'breast', name: 'Breast', fields: [{ id: 'grade', label: 'Grade', kind: 'choice', options: [] }] }],
  },
};

describe('case report CSV (Batch 613)', () => {
  it('writes a grouped report as one row per group with shares, medians and a total', () => {
    const report: CaseSearchReport = {
      total: 4, groupBy: 'pathologist', rows: [], rowsTruncated: false, groupsTruncated: false,
      groups: [{ key: 'u1', count: 3, share: 0.75, medianTatDays: 2.5 }, { key: REPORT_BLANK_GROUP_KEY, count: 1, share: 0.25, medianTatDays: null }],
    };
    expect(buildCaseReportCsv(report, [], ctx).split('\r\n')).toEqual([
      '"caseReport.groupBy.pathologist","caseReport.table.cases","caseReport.table.share","caseReport.table.medianDays"',
      '"Dr Lee","3","75%","2.5"',
      '"caseReport.group.blank","1","25%",""',
      '"caseReport.table.total","4","100%",""',
    ]);
  });

  it('writes a list report with the chosen columns, synoptic answers included, and lists joined', () => {
    const report: CaseSearchReport = {
      total: 1, groupBy: 'none', groups: [], rowsTruncated: false, groupsTruncated: false,
      rows: [{ caseId: 'C1', cells: { accession: 'S26-1', status: 'finalized', 'synoptic:breast:grade': ['Grade 3', 'Grade 2'], signedOutDate: '2026-08-04T00:00:00Z' } }],
    };
    const lines = buildCaseReportCsv(report, ['accession', 'status', 'synoptic:breast:grade', 'signedOutDate'], ctx).split('\r\n');
    expect(lines[0]).toBe('"caseReport.column.accession","caseReport.column.status","Breast: Grade","caseReport.column.signedOutDate"');
    expect(lines[1]).toBe('"S26-1","searchPage.statusLabelKey.finalized","Grade 3; Grade 2","08/04/2026"');
  });

  it('neutralises formulas in any cell (a diagnosis or an answer starting with = + - @)', () => {
    const report: CaseSearchReport = { total: 1, groupBy: 'none', groups: [], rowsTruncated: false, groupsTruncated: false, rows: [{ caseId: 'C1', cells: { diagnosis: '=HYPERLINK("x")' } }] };
    expect(buildCaseReportCsv(report, ['diagnosis'], ctx).split('\r\n')[1]).not.toMatch(/^"=/);
  });

  it('names ids in words, and falls back to the id when no name is known', () => {
    expect(reportGroupLabel('facility', 'f1', ctx)).toBe('Main Lab');
    expect(reportGroupLabel('facility', 'f9', ctx)).toBe('f9');
    expect(reportGroupLabel('month', '2026-08', ctx)).toBe('August 2026');
    expect(reportCellText('pathologist', 'u9', ctx)).toBe('u9');
    expect(reportColumnLabel('synoptic:other:x', ctx)).toBe('other: x');
  });

  it('names the file with the facility date', () => {
    expect(caseReportCsvFilename('2026-09-27')).toBe('pathscribe-case-report-2026-09-27.csv');
  });
});
