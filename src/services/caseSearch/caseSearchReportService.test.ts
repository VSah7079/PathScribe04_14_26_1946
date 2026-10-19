import { describe, it, expect, vi } from 'vitest';
import type { Case } from '@/types/case/Case';
import { createCaseSearchService, CASE_SEARCH_EXPORT_NOT_PERMITTED, type CaseSearchDependencies } from './createCaseSearchService';
import { buildSynopticFieldCatalogue } from './synopticValueCriteria';

const mk = (i: number, grade: string, signer: string): Case => ({
  id: `C-${i}`, status: 'finalized', createdAt: '2026-08-01T00:00:00Z',
  accession: { fullAccession: `S26-${i}`, accessionedAt: '2026-08-01T00:00:00Z' },
  patient: { mrn: `M${i}`, firstName: 'Pat', lastName: `L${i}`, sex: 'F' },
  order: { priority: 'Routine', facilityId: 'fac1' }, finalizedAt: '2026-08-03T00:00:00Z', finalizedBy: signer,
  diagnostic: { primaryDiagnosis: 'Carcinoma' }, synopticReports: [{ templateId: 'breast', answers: { grade } }],
} as unknown as Case);

const catalogue = buildSynopticFieldCatalogue([{ id: 'breast', sections: [{ fields: [{ id: 'grade', label: 'Grade', type: 'dropdown', options: [{ id: 'g3', label: 'Grade 3' }] }] }] }]);

function deps(cases: Case[], over: Partial<CaseSearchDependencies> = {}): CaseSearchDependencies & { needs: unknown[] } {
  const needs: unknown[] = [];
  return {
    needs,
    loadAccessibleCases: async () => ({ ok: true, data: cases }),
    loadReferenceData: async n => { needs.push(n); return { physicianNamesById: new Map(), ...(n?.synopticFields ? { synopticFields: catalogue } : {}) }; },
    auditExport: vi.fn(),
    now: () => new Date('2026-09-27T12:00:00Z'),
    ...over,
  };
}
const cases = [mk(1, 'g3', 'u1'), mk(2, 'g3', 'u1'), mk(3, 'g1', 'u2')];

describe('case search reports (Batch 613)', () => {
  it('reports on the cases the user may see, grouped and counted', async () => {
    const res = await createCaseSearchService(deps(cases)).report({ criteria: {}, groupBy: 'pathologist', columns: ['accession'] });
    expect(res.ok && res.data.groups.map(g => [g.key, g.count])).toEqual([['u1', 2], ['u2', 1]]);
  });

  it('counts nothing the user cannot see: the report is built from the accessible cases only', async () => {
    const res = await createCaseSearchService(deps(cases.slice(0, 1))).report({ criteria: {}, groupBy: 'none', columns: ['accession'] });
    expect(res.ok && res.data.total).toBe(1);
  });

  it('searches on synoptic answers and loads the protocols\' questions only when a search or report needs them', async () => {
    const d = deps(cases);
    const svc = createCaseSearchService(d);
    const hit = await svc.report({ criteria: { synopticValues: [{ templateId: 'breast', fieldId: 'grade', operator: 'is', value: 'Grade 3' }] }, groupBy: 'none', columns: [] });
    expect(hit.ok && hit.data.total).toBe(2);
    expect(d.needs[d.needs.length - 1]).toEqual({ synopticFields: true });
    await svc.report({ criteria: {}, groupBy: 'status', columns: ['accession'] });
    expect(d.needs[d.needs.length - 1]).toEqual({ synopticFields: false });
    await svc.report({ criteria: {}, groupBy: 'none', columns: ['synoptic:breast:grade'] });
    expect(d.needs[d.needs.length - 1]).toEqual({ synopticFields: true });
    await svc.search({ criteria: { synopticValues: [{ templateId: 'breast', fieldId: 'grade', operator: 'answered', value: '' }] }, page: 1 });
    expect(d.needs[d.needs.length - 1]).toEqual({ synopticFields: true });
  });

  it('filters the report with the same criteria as the search', async () => {
    const res = await createCaseSearchService(deps(cases)).report({ criteria: { synopticValues: [{ templateId: 'breast', fieldId: 'grade', operator: 'is', value: 'g1' }] }, groupBy: 'pathologist', columns: [] });
    expect(res.ok && res.data.groups.map(g => g.key)).toEqual(['u2']);
  });

  it('exports the whole report after the capability check, and records counts only', async () => {
    const auditReportExport = vi.fn();
    const svc = createCaseSearchService(deps(cases, { authorizeReportExport: async () => ({ allowed: true }), auditReportExport }));
    const res = await svc.exportReport({ criteria: {}, groupBy: 'none', columns: ['accession', 'synoptic:breast:grade'] });
    expect(res.ok && res.data.rows).toHaveLength(3);
    expect(auditReportExport).toHaveBeenCalledWith({ groupBy: 'none', groupCount: 0, rowCount: 3, total: 3 });
    expect(JSON.stringify(auditReportExport.mock.calls)).not.toMatch(/Pat|L1|M1/);
  });

  it('a grouped export holds the groups, not the case rows', async () => {
    const svc = createCaseSearchService(deps(cases));
    const res = await svc.exportReport({ criteria: {}, groupBy: 'pathologist', columns: ['accession'] });
    expect(res.ok && res.data.groups).toHaveLength(2);
    expect(res.ok && res.data.rows).toHaveLength(0);
  });

  it('a refused export makes no report and records nothing', async () => {
    const auditReportExport = vi.fn();
    const svc = createCaseSearchService(deps(cases, { authorizeReportExport: async () => ({ allowed: false }), auditReportExport }));
    expect(await svc.exportReport({ criteria: {}, groupBy: 'none', columns: [] })).toEqual({ ok: false, error: CASE_SEARCH_EXPORT_NOT_PERMITTED });
    expect(auditReportExport).not.toHaveBeenCalled();
  });

  it('the on-screen report needs no export capability', async () => {
    const authorizeReportExport = vi.fn(async () => ({ allowed: false }));
    const res = await createCaseSearchService(deps(cases, { authorizeReportExport })).report({ criteria: {}, groupBy: 'status', columns: [] });
    expect(res.ok).toBe(true);
    expect(authorizeReportExport).not.toHaveBeenCalled();
  });

  it('lists the protocols and their questions from the registry', async () => {
    const svc = createCaseSearchService(deps(cases, { loadSynopticProtocols: async () => [{ templateId: 'breast', name: 'Breast', fields: [] }] }));
    const res = await svc.listSynopticProtocols();
    expect(res.ok && res.data[0].name).toBe('Breast');
    expect(await createCaseSearchService(deps(cases)).listSynopticProtocols()).toEqual({ ok: true, data: [] });
  });
});
