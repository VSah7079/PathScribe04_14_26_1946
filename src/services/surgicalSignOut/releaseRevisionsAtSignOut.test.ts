// src/services/surgicalSignOut/releaseRevisionsAtSignOut.test.ts
// Batch 649: a refused release is not marked finalized or sent; a revision is sent only after the instances are saved.
import { describe, it, expect, vi } from 'vitest';
import type { Case } from '@/types/case/Case';
import { releaseRevisionsAtSignOut, type ReleaseRevisionsDeps } from './releaseRevisionsAtSignOut';

const orch = (reports: unknown[]) => ({ id: 'C1', reportingMode: 'orchestrator', status: 'in-progress', synopticReports: reports }) as unknown as Case;
const deps = (o: Partial<ReleaseRevisionsDeps> = {}): ReleaseRevisionsDeps => ({
  release: vi.fn(async (id: string) => ({ ok: true as const, data: { id, type: 'correction' } as never })),
  publish: vi.fn(async () => ({})), sendToLis: vi.fn(async () => ({ ok: true })), createAssistVersion: vi.fn(async () => ({})),
  saveReports: vi.fn(async () => {}), ...o,
});

describe('releaseRevisionsAtSignOut', () => {
  it('Orchestration: released, saved as finalized with its revision label, then published', async () => {
    const d = deps();
    const r = await releaseRevisionsAtSignOut(orch([{ instanceId: 'I1', pendingAmendmentId: 'a1', status: 'draft' }]), d);
    expect(r.patch?.synopticReports?.[0]).toMatchObject({ status: 'finalized', lastRevisionType: 'correction', pendingAmendmentId: undefined });
    expect(r.patch?.lastRevisionType).toBe('correction');
    expect(vi.mocked(d.saveReports).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(d.publish).mock.invocationCallOrder[0]);
  });

  it('a release the amendment service refuses is not marked finalized and not published', async () => {
    const d = deps({ release: vi.fn(async () => ({ ok: false as const, error: 'refused' })) });
    const r = await releaseRevisionsAtSignOut(orch([{ instanceId: 'I1', pendingAmendmentId: 'a1', status: 'draft' }]), d);
    expect(r).toEqual({ notTransmitted: 0, notReleased: 1, patch: null });
    expect(d.saveReports).not.toHaveBeenCalled();
    expect(d.publish).not.toHaveBeenCalled();
  });

  it('a save that fails sends nothing and is passed to the caller', async () => {
    const d = deps({ saveReports: vi.fn(async () => { throw new Error('conflict'); }) });
    await expect(releaseRevisionsAtSignOut(orch([{ instanceId: 'I1', pendingAmendmentId: 'a1' }]), d)).rejects.toThrow('conflict');
    expect(d.publish).not.toHaveBeenCalled();
  });

  const assist = (reports: unknown[]) => ({ ...orch(reports), reportingMode: 'assist' }) as Case;

  it('Assist: a refused release is never sent to the LIS', async () => {
    const d = deps({ release: vi.fn(async () => ({ ok: false as const, error: 'refused' })) });
    expect(await releaseRevisionsAtSignOut(assist([{ instanceId: 'I1', pendingAmendmentId: 'a1' }]), d)).toEqual({ notTransmitted: 0, notReleased: 1, patch: null });
    expect(d.sendToLis).not.toHaveBeenCalled();
    expect(d.createAssistVersion).not.toHaveBeenCalled();
  });

  it('Assist: an accepted release is then sent to the LIS, then its per-instance version saved', async () => {
    const d = deps();
    const r = await releaseRevisionsAtSignOut(assist([{ instanceId: 'I1', pendingAmendmentId: 'a1' }]), d);
    expect(d.sendToLis).toHaveBeenCalled();
    expect(vi.mocked(d.release).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(d.sendToLis).mock.invocationCallOrder[0]);
    expect(d.createAssistVersion).toHaveBeenCalled();
    expect(d.publish).not.toHaveBeenCalled();
    expect(r).toMatchObject({ notTransmitted: 0, notReleased: 0 });
    expect(r.patch?.synopticReports?.[0]).toMatchObject({ status: 'finalized' });
  });

  it('Assist: a send that fails after the release is counted, and the instance stays released', async () => {
    const d = deps({ sendToLis: vi.fn(async () => ({ ok: false })) });
    const r = await releaseRevisionsAtSignOut(assist([{ instanceId: 'I1', pendingAmendmentId: 'a1' }]), d);
    expect(r).toMatchObject({ notTransmitted: 1, notReleased: 0 });
    expect(r.patch?.synopticReports?.[0]).toMatchObject({ status: 'finalized' });
  });
});
