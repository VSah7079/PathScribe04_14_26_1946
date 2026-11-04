// src/services/migration/runLegacyFileImport.test.ts — Batch 611 (#132, #166)
import { describe, it, expect } from 'vitest';
import { runLegacyFileImport, type LegacyImportDeps, type LegacyImportInput } from './runLegacyFileImport';
import type { MigrationJob } from './IMigrationJobService';
import type { MigrationRecordResult } from './IMigrationRecordResultService';
import type { MigrationFieldMapping } from './IMigrationFieldMappingService';
import type { Case } from '@/types/case/Case';

const MAPPINGS: MigrationFieldMapping[] = [
  ['pt_fname', 'patientFirstName'], ['pt_lname', 'patientLastName'], ['pt_dob', 'patientDateOfBirth'], ['accn', 'legacyAccessionNumber'],
].map(([s, t], i) => ({ id: 'm' + i, sourceSystemName: 'LegacyLIS', sourceFieldName: s, targetField: t, category: 'demographics' as const, active: true }));

function fakeDeps(over: Partial<LegacyImportDeps> = {}) {
  const job: MigrationJob = { id: 'migjob-9', sourceSystemName: 'LegacyLIS', status: 'pending', totalRecordsProcessed: 0, succeededCount: 0, failedCount: 0, needsReviewCount: 0, createdByUserId: 'u1', createdByUserName: 'Admin', createdAt: '2026-10-18T00:00:00Z' };
  const state = { job, results: [] as MigrationRecordResult[], cases: [] as Case[], audits: [] as { event: string; detail: string }[], refuse: new Set<string>() };
  const deps: LegacyImportDeps = {
    enforce: async () => ({ allowed: true }),
    getMappings: async () => ({ ok: true, data: MAPPINGS }),
    createJob: async () => ({ ok: true, data: state.job }),
    startJob: async () => { state.job = { ...state.job, status: 'running' }; return { ok: true, data: state.job }; },
    recordJobOutcome: async (_id, o) => {
      state.job = { ...state.job, totalRecordsProcessed: state.job.totalRecordsProcessed + 1,
        succeededCount: state.job.succeededCount + (o === 'succeeded' ? 1 : 0), failedCount: state.job.failedCount + (o === 'failed' ? 1 : 0), needsReviewCount: state.job.needsReviewCount + (o === 'needs_review' ? 1 : 0) };
      return { ok: true, data: state.job };
    },
    completeJob: async () => { state.job = { ...state.job, status: state.job.failedCount > 0 ? 'completed_with_errors' : 'completed' }; return { ok: true, data: state.job }; },
    recordResult: async r => { const x = { ...r, id: 'r' + state.results.length, processedAt: '2026-10-18T00:00:00Z' }; state.results.push(x); return { ok: true, data: x }; },
    processRecord: async (raw) => {
      const draft = { patientFirstName: raw.pt_fname, patientLastName: raw.pt_lname, patientDateOfBirth: raw.pt_dob, legacyAccessionNumber: raw.accn };
      if (!draft.patientLastName) return { outcome: 'failed', draft, unmappedSourceFields: [], errorMessage: 'Missing patient name.' };
      if (state.refuse.has(raw.accn)) return { outcome: 'needs_review', draft, unmappedSourceFields: ['extra'], patientId: 'p?', mpiCandidatePatientIds: ['p1', 'p2'] };
      return { outcome: 'succeeded', draft, unmappedSourceFields: ['extra'], patientId: 'pt-' + raw.accn };
    },
    importedAccessions: async () => new Set(state.cases.map(c => c.accession.externalAccession ?? '')),
    createCase: async c => { state.cases.push(c); },
    audit: async (event, detail) => { state.audits.push({ event, detail }); },
    now: () => new Date('2026-10-18T12:00:00Z'),
    ...over,
  };
  return { deps, state };
}

const INPUT: LegacyImportInput = {
  text: 'pt_fname,pt_lname,pt_dob,accn,extra\nAnna,Lee,1980-01-02,S1,x\nBen,,1970-02-03,S2,y\nCy,Dee,1990-03-04,S3,z\nCy,Dee,1990-03-04,S1,dup\n',
  format: 'csv', sourceSystemName: 'LegacyLIS', organisationId: 'org-1', createdByUserId: 'u1', createdByUserName: 'Admin',
};

describe('runLegacyFileImport', () => {
  it('runs every record, creates draft cases for the ones that succeeded, and reports counts', async () => {
    const { deps, state } = fakeDeps();
    const out = await runLegacyFileImport(INPUT, deps);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.summary.job).toMatchObject({ totalRecordsProcessed: 4, succeededCount: 2, failedCount: 2, needsReviewCount: 0 });
    expect(out.summary.draftCasesCreated).toBe(2);
    expect(out.summary.alreadyImported).toBe(1);
    expect(state.cases.map(c => c.accession.externalAccession)).toEqual(['S1', 'S3']);
    expect(state.cases.every(c => c.status === 'draft' && c.importSource?.kind === 'simulated_bulk_import')).toBe(true);
    expect(out.summary.unmappedFields).toEqual(['extra']);
    const byId = Object.fromEntries(state.results.map(r => [r.sourceRecordId + ':' + r.outcome, r]));
    expect(byId['S1:succeeded'].targetCaseId).toMatch(/^MIG-9-1$/);
    expect(byId['S2:failed'].errorMessage).toBe('Missing patient name.');
    expect(state.results.find(r => r.errorMessage?.startsWith('Already imported'))?.sourceRecordId).toBe('S1');
  });

  it('a record that needs MPI review creates no case', async () => {
    const { deps, state } = fakeDeps();
    state.refuse.add('S3');
    const out = await runLegacyFileImport(INPUT, deps);
    expect(out.ok && out.summary.job.needsReviewCount).toBe(1);
    expect(state.cases.map(c => c.accession.externalAccession)).toEqual(['S1']);
  });

  it('can run without creating cases', async () => {
    const { deps, state } = fakeDeps();
    const out = await runLegacyFileImport({ ...INPUT, createDraftCases: false }, deps);
    expect(out.ok && out.summary.draftCasesCreated).toBe(0);
    expect(state.cases).toEqual([]);
    expect(state.results.filter(r => r.outcome === 'succeeded')).toHaveLength(3);
  });

  it('writes one audit entry with counts and the source system only: no patient, accession or file detail', async () => {
    const { deps, state } = fakeDeps();
    await runLegacyFileImport(INPUT, deps);
    expect(state.audits).toHaveLength(1);
    const { event, detail } = state.audits[0];
    expect(event).toBe('Legacy File Import (Simulated bulk import)');
    expect(detail).toContain('LegacyLIS');
    for (const secret of ['Anna', 'Lee', 'S1', 'S2', '1980', 'pt_fname']) expect(detail).not.toContain(secret);
  });

  it('refuses without the capability and creates nothing', async () => {
    const { deps, state } = fakeDeps({ enforce: async () => ({ allowed: false }) });
    expect(await runLegacyFileImport(INPUT, deps)).toEqual({ ok: false, error: 'notPermitted' });
    expect(state.cases).toEqual([]); expect(state.results).toEqual([]);
  });

  it('refuses an unreadable file, a missing source system, and a system with no active mappings', async () => {
    const { deps } = fakeDeps();
    expect(await runLegacyFileImport({ ...INPUT, text: '' }, deps)).toEqual({ ok: false, error: 'empty', max: undefined });
    expect(await runLegacyFileImport({ ...INPUT, sourceSystemName: '  ' }, deps)).toEqual({ ok: false, error: 'noSourceSystem' });
    const none = fakeDeps({ getMappings: async () => ({ ok: true, data: MAPPINGS.map(m => ({ ...m, active: false })) }) });
    expect(await runLegacyFileImport(INPUT, none.deps)).toEqual({ ok: false, error: 'noMappings' });
  });
});
