import { describe, expect, it } from 'vitest';
import { defaultQaScope, inQaScope, qaExportFilename, qaScopeFacilityOptions, qaRowFacilityIds, qaScopeCaseMap, scopeLabel, scopeQaRows } from './qaScopeRows';
import { qaScopeContext } from './qaExport';
import { qaEvidenceBinderExportFilename } from '../quality/resolveQaEvidenceBinder';

// Batch 544 (Pete, Oct 13, 2026): QA exports for one facility, not only "all".
const cases = qaScopeCaseMap([
  { id: 'S26-1', order: { facilityId: 'fac-north' } },
  { id: 'S26-2', order: { facilityId: 'fac-south' } },
  { id: 'S26-3', order: { clientId: 'fac-north' } },
]);
const north = { level: 'client', clientId: 'fac-north' } as const;

describe('single-facility QA scope (qaScopeRows)', () => {
  it('enterprise-wide keeps every row, including ones whose facility is unknown', () => {
    const rows = [{ caseId: 'S26-1' }, { caseId: 'unknown' }, { facilityId: undefined }];
    expect(scopeQaRows(rows, r => r, cases, { level: 'enterprise' })).toHaveLength(3);
  });

  it('one facility keeps rows of cases ordered from it (order.facilityId, or the older clientId)', () => {
    const rows = [{ caseId: 'S26-1' }, { caseId: 'S26-2' }, { caseId: 'S26-3' }];
    expect(scopeQaRows(rows, r => r, cases, north).map(r => r.caseId)).toEqual(['S26-1', 'S26-3']);
  });

  it("a row's own facility wins over its case's (a follow-up, an FPPE assignment)", () => {
    expect(inQaScope({ caseId: 'S26-2', facilityId: 'fac-north' }, cases, north)).toBe(true);
    expect(inQaScope({ facilityId: 'fac-north' }, cases, north)).toBe(true);
  });

  it('a row whose facility cannot be told is never put in a facility', () => {
    expect(inQaScope({ caseId: 'not-loaded' }, cases, north)).toBe(false);
    expect(inQaScope({}, cases, north)).toBe(false);
    expect(inQaScope({}, cases, { level: 'organisation', organisationId: 'org-1' })).toBe(false);
  });

  it('someone assigned to one facility opens on it; anyone else opens enterprise-wide', () => {
    expect(defaultQaScope(['fac-north'])).toEqual(north);
    expect(defaultQaScope([])).toEqual({ level: 'enterprise' });
    expect(defaultQaScope(['fac-north', 'fac-south'])).toEqual({ level: 'enterprise' });
  });

  it('the picker always offers the facility in force, even when these rows have none from it', () => {
    const all = [{ id: 'fac-north' }, { id: 'fac-south' }, { id: 'fac-east' }];
    expect(qaScopeFacilityOptions(all, ['fac-south'], false, north).map(f => f.id)).toEqual(['fac-north', 'fac-south']);
    expect(qaScopeFacilityOptions(all, ['fac-south'], true, north)).toHaveLength(3);
    expect(qaScopeFacilityOptions(all, undefined, false, { level: 'enterprise' })).toHaveLength(3);
  });

  it('an organisation is found from the case, never from a facility alone', () => {
    expect(inQaScope({ facilityId: 'fac-north' }, cases, { level: 'organisation', organisationId: 'ORG-DVMC' })).toBe(false);
    const orgCases = qaScopeCaseMap([{ id: 'S26-9', originHospitalId: 'HOSP-001' }]);
    expect(inQaScope({ caseId: 'S26-9' }, orgCases, { level: 'organisation', organisationId: 'ORG-DVMC' })).toBe(true);
    expect(inQaScope({ caseId: 'S26-9' }, orgCases, { level: 'organisation', organisationId: 'ORG-MFT' })).toBe(false);
  });

  it('offers only the facilities the rows come from', () => {
    expect(qaRowFacilityIds([{ caseId: 'S26-2' }, { facilityId: 'fac-east' }, { caseId: 'S26-1' }, { caseId: 'x' }], r => r, cases))
      .toEqual(['fac-east', 'fac-north', 'fac-south']);
  });

  it('the export is checked for that one facility, and the file is named for it', () => {
    expect(qaScopeContext(north)).toEqual({ facilityIds: ['fac-north'] });
    expect(qaScopeContext({ level: 'enterprise' })).toEqual({ allFacilities: true });
    const now = new Date('2026-10-13T12:00:00Z');
    expect(qaExportFilename('follow-up-not-received', north, now)).toBe('follow-up-not-received-fac-north-2026-10-13.csv');
    expect(qaExportFilename('fppe-tracking', { level: 'enterprise' }, now)).toBe('fppe-tracking-enterprise-2026-10-13.csv');
    expect(scopeLabel({ level: 'organisation', organisationId: 'org-1' })).toBe('org-1');
    expect(qaEvidenceBinderExportFilename(24, now, north)).toBe('qa-inspection-evidence-binder-24mo-fac-north-2026-10-13.csv');
    expect(qaEvidenceBinderExportFilename(24, now)).toBe('qa-inspection-evidence-binder-24mo-2026-10-13.csv');
  });
});
