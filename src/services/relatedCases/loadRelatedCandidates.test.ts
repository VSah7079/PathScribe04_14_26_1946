import { describe, expect, it, vi } from 'vitest';
import type { Case } from '@/types/case/Case';
import { loadRelatedCandidates, type LoadRelatedDeps } from './loadRelatedCandidates';
import { loadAmendedRelatedCases } from './loadAmendedRelatedCases';
import { resetRelatedCaseAttachmentsForTests, setRelatedCases, freezeRelatedCases, type RelatedCaseDeps } from './relatedCaseAttachments';

const mk = (id: string, patientId = 'P1'): Case => ({
  id, status: 'finalized', version: 1, releasedAt: '2026-01-10T00:00:00Z', accession: { fullAccession: `S26-${id}` },
  patient: { id: patientId }, specimens: [], diagnostic: { primaryDiagnosis: 'Dx' }, order: {},
}) as unknown as Case;

const deps = (cases: Case[], entries: unknown[] = []): LoadRelatedDeps => ({
  getVisibleCases: vi.fn(async () => ({ ok: true as const, data: cases })),
  getSamePersonIds: vi.fn(async (id: string) => [id, 'P2']),
  getIntraopEntries: vi.fn(async () => ({ ok: true as const, data: entries as never })),
});

describe('loadRelatedCandidates', () => {
  it('lists released cases of the patient and linked identities, with the intraoperative diagnosis', async () => {
    const entries = [{ status: 'merged', mergedIntoCaseId: 'a', specimens: [{ specimenLabel: 'A', frozenSectionDiagnosis: 'Benign' }] }];
    const out = await loadRelatedCandidates({ patientId: 'P1', currentCaseId: 'cur' }, deps([mk('a'), mk('b', 'P2'), mk('cur'), mk('x', 'P3')], entries));
    expect(out.map(o => o.sourceCaseId).sort()).toEqual(['a', 'b']);
    expect(out.find(o => o.sourceCaseId === 'a')?.intraoperativeDiagnosis).toBe('A: Benign');
  });
  it('returns nothing when the cases cannot be read, or there is no patient', async () => {
    const failing: LoadRelatedDeps = { ...deps([]), getVisibleCases: async () => ({ ok: false, error: 'x' }) as never };
    expect(await loadRelatedCandidates({ patientId: 'P1' }, failing)).toEqual([]);
    expect(await loadRelatedCandidates({ patientId: '' }, deps([mk('a')]))).toEqual([]);
  });
  it('still lists cases when the intraoperative entries cannot be read', async () => {
    const d: LoadRelatedDeps = { ...deps([mk('a')]), getIntraopEntries: async () => { throw new Error('down'); } };
    expect(await loadRelatedCandidates({ patientId: 'P1' }, d)).toHaveLength(1);
  });
});

describe('loadAmendedRelatedCases', () => {
  it('flags only after sign-out, from the current versions', async () => {
    resetRelatedCaseAttachmentsForTests();
    const rd: RelatedCaseDeps = { enforce: async () => ({ allowed: true }), audit: () => {}, now: () => 't' };
    const snapA = { sourceCaseId: 'a', accession: 'S26-a', releasedAt: '2026-01-01', sourceVersion: 1, specimens: [], diagnosis: 'Dx', copyToPhysicians: [] };
    await setRelatedCases({ caseId: 'cur', cases: [snapA], user: 'u' }, rd);
    const versions = { getVersions: async () => new Map([['a', 2]]) };
    expect(await loadAmendedRelatedCases('cur', versions)).toEqual([]);
    freezeRelatedCases('cur', 'u', rd);
    expect((await loadAmendedRelatedCases('cur', versions)).map(a => a.accession)).toEqual(['S26-a']);
  });
});
