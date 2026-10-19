// src/services/migration/importLegacyFile.test.ts — Batch 611 (#132, #166)
// The run on the app's own mock services: a job, per-record results, and draft cases in the case store.
import { describe, it, expect, beforeEach, vi } from 'vitest';

let allowed = true;
vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed }) },
}));

beforeEach(() => {
  allowed = true;
  const store: Record<string, string> = {};
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  } as unknown as Storage;
});

const MAP = (s: string, t: string, id: string) => ({ sourceSystemName: 'LegacyLIS', sourceFieldName: s, targetField: t, category: 'demographics' as const, active: true, id });

describe('importLegacyFile (mock services)', () => {
  it('creates a job, results and draft cases; a second run of the same file creates no second case', async () => {
    const { importLegacyFile } = await import('./importLegacyFile');
    const { mockMigrationFieldMappingService } = await import('./mockMigrationFieldMappingService');
    const { mockCaseService } = await import('../cases/mockCaseService');
    // The mapping service is guarded by the same capability; the mocked check allows it.
    for (const [s, t] of [['pt_fname', 'patientFirstName'], ['pt_lname', 'patientLastName'], ['pt_dob', 'patientDateOfBirth'], ['pt_mrn', 'patientMrn'], ['accn', 'legacyAccessionNumber']]) {
      await mockMigrationFieldMappingService.add({ ...MAP(s, t, ''), id: undefined } as never);
    }
    const input = {
      text: 'pt_fname,pt_lname,pt_dob,pt_mrn,accn\nJane,Roe,1980-01-01,MRN-9001,LEG-9001\nNo,,1970-01-01,MRN-9002,LEG-9002\n',
      format: 'csv' as const, sourceSystemName: 'LegacyLIS', organisationId: 'org-1', createdByUserId: 'u1', createdByUserName: 'Admin',
    };
    const first = await importLegacyFile(input);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.summary.job).toMatchObject({ succeededCount: 1, failedCount: 1 });
    expect(first.summary.draftCasesCreated).toBe(1);
    const created = first.summary.results.find(r => r.outcome === 'succeeded')!;
    const c = await mockCaseService.getCase(created.targetCaseId!);
    expect(c?.status).toBe('draft');
    expect(c?.importSource?.kind).toBe('simulated_bulk_import');

    const second = await importLegacyFile(input);
    expect(second.ok && second.summary.draftCasesCreated).toBe(0);
    expect(second.ok && second.summary.alreadyImported).toBe(1);
  }, 30_000);

  it('is refused without the capability', async () => {
    allowed = false;
    const { importLegacyFile } = await import('./importLegacyFile');
    const out = await importLegacyFile({ text: 'a\n1', format: 'csv', sourceSystemName: 'X', organisationId: 'o', createdByUserId: 'u', createdByUserName: 'U' });
    expect(out).toEqual({ ok: false, error: 'notPermitted' });
  }, 30_000);
});
