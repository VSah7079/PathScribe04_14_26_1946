// Batch 411 (Pete): a multi-specimen cytology case is final when every specimen is signed out, or early with the override.
import { describe, it, expect, vi } from 'vitest';
import { finalizeCytologyCaseEarly, resolveCytologyCaseFinalization } from './cytologyCaseFinalization';
import { makeWorkspaceDeps } from './cytologyWorkspaceTestDeps';
import { ConcurrencyConflictError } from '../cases/ConcurrencyConflictError';
import { cytologyCaseProgress } from './cytologyWorkspaceView';

const caseData = { id: 'C1', accession: { fullAccession: 'S26-1' }, status: 'in-progress' } as never;
const user = { id: 'P1', name: 'Dr P' };
const base = { caseData, cytologySpecimenIds: ['A', 'B', 'C'], signedOutSpecimenIds: ['A'], reason: 'Specimen C was sent out for flow cytometry', user };

describe('resolveCytologyCaseFinalization', () => {
  it('final only when every cytology specimen is signed out', () => {
    expect(resolveCytologyCaseFinalization(['A', 'B'], ['A'])).toEqual({ allSignedOut: false, remaining: ['B'] });
    expect(resolveCytologyCaseFinalization(['A', 'B'], ['B', 'A', 'A'])).toEqual({ allSignedOut: true, remaining: [] });
    expect(resolveCytologyCaseFinalization([], [])).toEqual({ allSignedOut: false, remaining: [] });
  });
});

describe('finalizeCytologyCaseEarly', () => {
  it('needs cytology:case:finalize', async () => {
    const { deps, updates } = makeWorkspaceDeps({ enforce: vi.fn(async () => ({ allowed: false })) });
    expect(await finalizeCytologyCaseEarly(base, deps)).toBe('notPermitted');
    expect(deps.enforce).toHaveBeenCalledWith('cytology:case:finalize', { caseId: 'C1' });
    expect(updates).toEqual([]);
  });
  it('needs a reason, at least one signed-out specimen, and something left to override', async () => {
    const { deps, updates } = makeWorkspaceDeps();
    expect(await finalizeCytologyCaseEarly({ ...base, reason: '  ' }, deps)).toBe('reasonRequired');
    expect(await finalizeCytologyCaseEarly({ ...base, signedOutSpecimenIds: [] }, deps)).toBe('nothingSignedOut');
    expect(await finalizeCytologyCaseEarly({ ...base, signedOutSpecimenIds: ['A', 'B', 'C'] }, deps)).toBe('alreadyComplete');
    expect(updates).toEqual([]);
  });
  it('finalizes the case, records who, when, why and which specimens were unsigned, and audits it', async () => {
    const { deps, updates, audit } = makeWorkspaceDeps();
    expect(await finalizeCytologyCaseEarly(base, deps)).toBe('finalized');
    expect(updates[0]).toEqual({ caseId: 'C1', patch: { status: 'finalized', cytologyEarlyFinalization: {
      finalizedBy: 'P1', finalizedByName: 'Dr P', finalizedAt: '2026-09-30T18:00:00.000Z', reason: 'Specimen C was sent out for flow cytometry', unsignedSpecimenIds: ['B', 'C'],
    } } });
    expect(audit[0]).toMatchObject({ event: 'Cytology case finalized before all specimens signed out', caseId: 'S26-1' });
  });
});

describe('cytologyCaseProgress', () => {
  it('offers early finalization only part-way through a multi-specimen case that isn\'t final', () => {
    const tabs = [{ status: 'signedOut' as const }, { status: 'draft' as const }];
    expect(cytologyCaseProgress(tabs, { status: 'in-progress' } as never)).toEqual({ multiSpecimen: true, signedOut: 1, total: 2, canFinalizeEarly: true });
    expect(cytologyCaseProgress(tabs, { status: 'finalized' } as never).canFinalizeEarly).toBe(false);
    expect(cytologyCaseProgress([{ status: 'draft' }], null)).toMatchObject({ multiSpecimen: false, canFinalizeEarly: false });
  });
});

// PS-71 (Batch 458): saved with the version the screen loaded; if someone saved
// since, applied to the newer case (their changes kept), never over it.
describe('finalizeCytologyCaseEarly — versioned (PS-71)', () => {
  it('a stale copy conflicts, then the finalization is saved against the newer version', async () => {
    const updateCase = vi.fn(async (_id: string, _p: Record<string, unknown>, v: number) => { if (v !== 8) throw new ConcurrencyConflictError('C1', v, 8); });
    const { deps } = makeWorkspaceDeps({ getCase: async () => ({ id: 'C1', version: 8, status: 'in-progress' }) as never, updateCase });
    expect(await finalizeCytologyCaseEarly({ ...base, caseData: { ...(caseData as any), version: 7 } as never }, deps)).toBe('finalized');
    expect(updateCase.mock.calls.map(c => c[2])).toEqual([7, 8]);
    expect(updateCase.mock.calls[1][1]).toMatchObject({ status: 'finalized' });
  });
});
