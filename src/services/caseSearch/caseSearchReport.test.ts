import { describe, it, expect } from 'vitest';
import type { Case } from '@/types/case/Case';
import {
  DEFAULT_REPORT_COLUMNS, REPORT_BLANK_GROUP_KEY, REPORT_GROUP_LIMIT, REPORT_OTHER_GROUP_KEY, buildCaseReport, cleanColumns, medianOf,
  parseSynopticColumn, reportCell, sortReportGroups, synopticColumn, turnaroundDays, type ReportGroup,
} from './caseSearchReport';
import { buildSynopticFieldCatalogue } from './synopticValueCriteria';
import type { CaseSearchMatchContext } from './caseSearchMatching';

const ctx: CaseSearchMatchContext = {
  physicianNamesById: new Map(), timeZone: 'UTC', now: new Date('2026-09-27T12:00:00Z'),
  specimenDictionary: [], flagsById: new Map([['f1', { name: 'Malignant', lisCode: 'MAL' }]]),
  synopticFields: buildSynopticFieldCatalogue([{ id: 'breast', sections: [{ fields: [
    { id: 'grade', label: 'Grade', type: 'dropdown', options: [{ id: 'g3', label: 'Grade 3' }] },
    { id: 'size', label: 'Size', type: 'numeric' },
  ] }] }]),
};

const mk = (id: string, over: Record<string, unknown> = {}): Case => ({
  id, status: 'finalized', createdAt: '2026-08-01T00:00:00Z',
  accession: { fullAccession: `S26-${id}`, accessionedAt: '2026-08-01T00:00:00Z' },
  patient: { mrn: `M${id}`, firstName: 'Pat', lastName: `Case${id}`, sex: 'F', dateOfBirth: '1980-09-27' },
  order: { priority: 'Routine', facilityId: 'fac1' },
  finalizedAt: '2026-08-04T00:00:00Z', finalizedBy: 'u1',
  diagnostic: { primaryDiagnosis: 'Invasive ductal carcinoma' },
  caseFlags: [{ flagDefinitionId: 'f1', deletedAt: null }],
  ...over,
} as unknown as Case);

const req = (over = {}) => ({ criteria: {}, groupBy: 'pathologist' as const, columns: [...DEFAULT_REPORT_COLUMNS], ...over });

describe('case search report engine (Batch 613)', () => {
  const cases = [
    mk('1'),
    mk('2', { finalizedAt: '2026-08-03T00:00:00Z' }),
    mk('3', { finalizedBy: 'u2', finalizedAt: '2026-09-02T00:00:00Z', diagnostic: { primaryDiagnosis: 'invasive  ductal carcinoma' } }),
    mk('4', { status: 'in-progress', finalizedAt: undefined, finalizedBy: undefined, order: { priority: 'STAT', assignedTo: 'u2', facilityId: 'fac2' }, diagnostic: { primaryDiagnosis: 'Fibroadenoma' } }),
    mk('5', { status: 'in-progress', finalizedAt: undefined, finalizedBy: undefined, order: { priority: 'Routine', facilityId: 'fac2' }, diagnostic: undefined }),
  ];

  it('counts cases by pathologist, with each share, and puts cases without one in a blank group last', () => {
    const r = buildCaseReport(cases, req(), ctx);
    expect(r.total).toBe(5);
    expect(r.groups.map(g => [g.key, g.count])).toEqual([['u1', 2], ['u2', 2], [REPORT_BLANK_GROUP_KEY, 1]]);
    expect(r.groups[0].share).toBeCloseTo(0.4);
    expect(r.groups.reduce((n, g) => n + g.count, 0)).toBe(r.total);
  });

  it('counts a case under its signer first, else the pathologist it is assigned to', () => {
    const r = buildCaseReport(cases, req(), ctx);
    expect(r.groups.find(g => g.key === 'u2')?.count).toBe(2); // case 3 signed by u2, case 4 assigned to u2
  });

  it('works out each group\'s median days from accession to sign-out, and none for a group with no signed-out case', () => {
    const r = buildCaseReport(cases, req(), ctx);
    expect(r.groups.find(g => g.key === 'u1')?.medianTatDays).toBe(2.5); // 3 and 2 days
    expect(r.groups.find(g => g.key === 'u2')?.medianTatDays).toBe(32);  // only case 3 is signed out
    expect(r.groups.find(g => g.key === REPORT_BLANK_GROUP_KEY)?.medianTatDays).toBeNull();
    expect(turnaroundDays(cases[3])).toBeNull();
    expect(medianOf([])).toBeNull();
    expect(medianOf([3, 1, 2])).toBe(2);
  });

  it('groups by month on the search\'s date basis', () => {
    expect(buildCaseReport(cases, req({ groupBy: 'month' }), ctx).groups.map(g => [g.key, g.count])).toEqual([['2026-08', 5]]);
    const bySignedOut = buildCaseReport(cases, req({ groupBy: 'month', criteria: { dateBasis: 'signedOut' } }), ctx);
    expect(bySignedOut.groups.map(g => [g.key, g.count])).toEqual([['2026-08', 2], ['2026-09', 1], [REPORT_BLANK_GROUP_KEY, 2]]);
  });

  it('groups equal diagnoses together whatever their case or spacing, showing the first wording', () => {
    const r = buildCaseReport(cases, req({ groupBy: 'diagnosis' }), ctx);
    expect(r.groups[0]).toMatchObject({ key: 'Invasive ductal carcinoma', count: 3 });
    expect(r.groups[r.groups.length - 1]?.key).toBe(REPORT_BLANK_GROUP_KEY);
  });

  it('groups by facility, status and priority', () => {
    expect(buildCaseReport(cases, req({ groupBy: 'facility' }), ctx).groups.map(g => [g.key, g.count])).toEqual([['fac1', 3], ['fac2', 2]]);
    expect(buildCaseReport(cases, req({ groupBy: 'status' }), ctx).groups.map(g => [g.key, g.count])).toEqual([['finalized', 3], ['in-progress', 2]]);
    expect(buildCaseReport(cases, req({ groupBy: 'priority' }), ctx).groups.map(g => [g.key, g.count])).toEqual([['Routine', 4], ['STAT', 1]]);
  });

  it('lists the cases of one group, and every case when not grouped', () => {
    expect(buildCaseReport(cases, req({ groupKey: 'u1' }), ctx).rows.map(r => r.caseId)).toEqual(['1', '2']);
    const flat = buildCaseReport(cases, req({ groupBy: 'none' }), ctx);
    expect(flat.groups).toEqual([]);
    expect(flat.rows).toHaveLength(5);
    const diagnosisGroup = buildCaseReport(cases, req({ groupBy: 'diagnosis', groupKey: 'Invasive ductal carcinoma' }), ctx);
    expect(diagnosisGroup.rows).toHaveLength(3);
  });

  it('limits the rows and says when it did', () => {
    const r = buildCaseReport(cases, req({ groupBy: 'none', rowLimit: 2 }), ctx);
    expect(r.rows).toHaveLength(2);
    expect(r.rowsTruncated).toBe(true);
    expect(buildCaseReport(cases, req({ rowLimit: 0 }), ctx).rows).toEqual([]);
  });

  it('folds groups past the limit into one "other" group so the counts still add up', () => {
    const many = Array.from({ length: REPORT_GROUP_LIMIT + 20 }, (_, i) => mk(`x${i}`, { order: { priority: 'Routine', facilityId: `fac-${String(i).padStart(4, '0')}` } }));
    const r = buildCaseReport(many, req({ groupBy: 'facility', rowLimit: 0 }), ctx);
    expect(r.groupsTruncated).toBe(true);
    expect(r.groups).toHaveLength(REPORT_GROUP_LIMIT + 1);
    expect(r.groups[r.groups.length - 1]).toMatchObject({ key: REPORT_OTHER_GROUP_KEY, count: 20 });
    expect(r.groups.reduce((n, g) => n + g.count, 0)).toBe(many.length);
  });

  it('sorts groups by name, count or median, with the blank and other groups always last', () => {
    const g = (key: string, count: number, medianTatDays: number | null): ReportGroup => ({ key, count, share: 0, medianTatDays });
    const groups = [g(REPORT_BLANK_GROUP_KEY, 9, 1), g('b', 2, 5), g('a', 3, null), g(REPORT_OTHER_GROUP_KEY, 1, null), g('c', 3, 2)];
    expect(sortReportGroups(groups, { key: 'label', direction: 'asc' }).map(x => x.key)).toEqual(['a', 'b', 'c', REPORT_BLANK_GROUP_KEY, REPORT_OTHER_GROUP_KEY]);
    expect(sortReportGroups(groups, { key: 'count', direction: 'desc' }).map(x => x.key)).toEqual(['a', 'c', 'b', REPORT_BLANK_GROUP_KEY, REPORT_OTHER_GROUP_KEY]);
    expect(sortReportGroups(groups, { key: 'median', direction: 'asc' }).map(x => x.key)).toEqual(['c', 'b', 'a', REPORT_BLANK_GROUP_KEY, REPORT_OTHER_GROUP_KEY]);
    expect(sortReportGroups(groups, { key: 'median', direction: 'desc' }).map(x => x.key).slice(0, 3)).toEqual(['b', 'c', 'a']);
  });

  it('fills the chosen columns, including answers from synoptic reports (choices by their wording)', () => {
    const c = mk('9', { synopticReports: [{ templateId: 'breast', answers: { grade: 'g3', size: '2.3 cm' } }, { templateId: 'colon', answers: { grade: 'x' } }] });
    expect(reportCell(c, synopticColumn('breast', 'grade'), ctx)).toEqual(['Grade 3']);
    expect(reportCell(c, synopticColumn('breast', 'size'), ctx)).toEqual(['2.3 cm']);
    expect(reportCell(c, synopticColumn('breast', 'missing'), ctx)).toEqual([]);
    expect(reportCell(c, 'accession', ctx)).toBe('S26-9');
    expect(reportCell(c, 'turnaroundDays', ctx)).toBe('3');
    expect(reportCell(c, 'flags', ctx)).toEqual(['Malignant']);
    expect(reportCell(c, 'age', ctx)).toBe('46');
  });

  it('reads and cleans column lists', () => {
    expect(parseSynopticColumn('synoptic:breast:grade')).toEqual({ templateId: 'breast', fieldId: 'grade' });
    expect(parseSynopticColumn('accession')).toBeNull();
    expect(cleanColumns(['mrn', 'mrn', 'nonsense', 'synoptic:breast:grade', 'synoptic:'])).toEqual(['mrn', 'synoptic:breast:grade']);
    expect(cleanColumns(Array.from({ length: 40 }, (_, i) => `synoptic:t:f${i}`))).toHaveLength(24);
    expect(cleanColumns(undefined)).toEqual([]);
  });
});
