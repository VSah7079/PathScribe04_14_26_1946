// src/services/surgicalSignOut/completeSurgicalSignOut.test.ts
// Batch 649: status, version and signature stay consistent; the signature names the exact version and PDF hash;
// a countersign failure is reported and stops.
import { describe, it, expect, vi } from 'vitest';
import type { Case } from '@/types/case/Case';
import { completeSurgicalSignOut, commitCountersignRelease, reportVersionLink, buildSignOutStatusPatch, type CompleteSignOutDeps } from './completeSurgicalSignOut';

const before = { id: 'C1', status: 'in-progress', synopticReports: [{ instanceId: 'I1', status: 'draft' }] } as unknown as Case;
const version = { id: 'ver-7', caseId: 'C1', versionNumber: 3, pdfSha256: 'ab'.repeat(32) } as never;
const NOW = new Date('2026-10-22T10:00:00Z');

function deps(o: Partial<CompleteSignOutDeps> = {}) {
  const order: string[] = [];
  const d: CompleteSignOutDeps = {
    update: vi.fn(async (p: Partial<Case>) => { order.push(`update:${p.status}`); }),
    resolveBuffer: vi.fn(async () => ({ applies: true, durationMinutes: 10 })),
    completeCountersign: vi.fn(async () => { order.push('countersign'); return { ok: true as const, data: {} }; }),
    releaseRevisions: vi.fn(async () => { order.push('revisions'); }),
    createVersion: vi.fn(async () => { order.push('version'); return { ok: true as const, data: version }; }),
    commitSignature: vi.fn(async () => { order.push('signature'); return { id: 'sig-1' } as never; }),
    now: () => NOW,
    ...o,
  };
  return { d, order };
}

describe('completeSurgicalSignOut', () => {
  it('writes the status first, then revisions, the version and a signature linked to that exact version and PDF hash', async () => {
    const { d, order } = deps();
    const r = await completeSurgicalSignOut({ caseData: before, orchestration: true, signerId: 'P1' }, d);
    expect(order).toEqual(['update:pending-release', 'revisions', 'version', 'signature']);
    expect(d.commitSignature).toHaveBeenCalledWith({ kind: 'report-version', id: 'ver-7', versionNumber: 3, pdfSha256: 'ab'.repeat(32) });
    expect(r).toMatchObject({ ok: true, version, buffer: { applies: true } });
  });

  it('a conflict at the status write stops with no version and no signature saved', async () => {
    const conflict = new Error('conflict');
    const { d } = deps({ update: vi.fn(async () => { throw conflict; }) });
    const r = await completeSurgicalSignOut({ caseData: before, orchestration: true, signerId: 'P1' }, d);
    expect(r).toMatchObject({ ok: false, step: 'status', error: conflict });
    expect(d.releaseRevisions).not.toHaveBeenCalled();
    expect(d.createVersion).not.toHaveBeenCalled();
    expect(d.commitSignature).not.toHaveBeenCalled();
  });

  it('a version that cannot be saved puts the status back and records no signature', async () => {
    const { d } = deps({ createVersion: vi.fn(async () => ({ ok: false as const, error: 'disk full' })) });
    const r = await completeSurgicalSignOut({ caseData: { ...before, finalizedAt: undefined } as Case, orchestration: true, signerId: 'P1' }, d);
    expect(r).toMatchObject({ ok: false, step: 'version', error: 'disk full', compensated: true });
    expect(vi.mocked(d.update).mock.calls[1][0]).toMatchObject({ status: 'in-progress', releaseBufferExpiresAt: undefined, preReleaseBufferStatus: undefined });
    expect(d.commitSignature).not.toHaveBeenCalled();
  });

  it('a countersign failure is reported (not swallowed), stops before the version and signature, and puts the status back', async () => {
    const pending = { ...before, status: 'pending-countersign' } as Case;
    const { d } = deps({ completeCountersign: vi.fn(async () => ({ ok: false as const, error: 'No pending countersign record' })) });
    const r = await completeSurgicalSignOut({ caseData: pending, orchestration: true, signerId: 'P1' }, d);
    expect(r).toMatchObject({ ok: false, step: 'countersign', error: 'No pending countersign record', compensated: true });
    expect(vi.mocked(d.update).mock.calls[1][0]).toMatchObject({ status: 'pending-countersign' });
    expect(d.createVersion).not.toHaveBeenCalled();
    expect(d.commitSignature).not.toHaveBeenCalled();
    // A thrown countersign is the same failure.
    const thrown = deps({ completeCountersign: vi.fn(async () => { throw new Error('offline'); }) });
    expect(await completeSurgicalSignOut({ caseData: pending, orchestration: true, signerId: 'P1' }, thrown.d)).toMatchObject({ ok: false, step: 'countersign', error: 'offline' });
  });

  it('the countersign runs only for a case released for countersign', async () => {
    const { d } = deps();
    await completeSurgicalSignOut({ caseData: before, orchestration: true, signerId: 'P1' }, d);
    expect(d.completeCountersign).not.toHaveBeenCalled();
  });

  it('a failed status restore is said (compensated: false)', async () => {
    let n = 0;
    const { d } = deps({ update: vi.fn(async () => { n += 1; if (n > 1) throw new Error('conflict'); }), createVersion: vi.fn(async () => ({ ok: false as const })) });
    expect(await completeSurgicalSignOut({ caseData: before, orchestration: true, signerId: 'P1' }, d)).toMatchObject({ ok: false, step: 'version', compensated: false });
  });

  it('without a PathScribe-owned status (not Orchestration): no status write, no whole-case version, an unlinked signature', async () => {
    const { d } = deps();
    const r = await completeSurgicalSignOut({ caseData: before, orchestration: false, signerId: 'P1' }, d);
    expect(d.update).not.toHaveBeenCalled();
    expect(d.createVersion).not.toHaveBeenCalled();
    expect(d.commitSignature).toHaveBeenCalledWith(undefined);
    expect(r).toMatchObject({ ok: true, statusPatch: null, buffer: null });
  });
});

describe('buildSignOutStatusPatch / reportVersionLink', () => {
  it('held: pending-release with its expiry and the status to go back to; not held: finalized and released now', () => {
    expect(buildSignOutStatusPatch(before, { applies: true, durationMinutes: 10 }, NOW, 'P1')).toMatchObject({
      status: 'pending-release', finalizedAt: NOW.toISOString(), releasedAt: undefined, releaseBufferExpiresAt: '2026-10-22T10:10:00.000Z', preReleaseBufferStatus: 'in-progress',
    });
    expect(buildSignOutStatusPatch(before, { applies: false, durationMinutes: 0 }, NOW, 'P1')).toMatchObject({ status: 'finalized', releasedAt: NOW.toISOString(), releaseBufferExpiresAt: undefined });
  });
  it('a version whose PDF failed to render is linked by id and number, with no hash', () => {
    expect(reportVersionLink({ id: 'v1', versionNumber: 1 } as never)).toEqual({ kind: 'report-version', id: 'v1', versionNumber: 1 });
  });
});

describe('commitCountersignRelease', () => {
  it('status first, then the version, the countersign record and the resident signature linked to the version', async () => {
    const order: string[] = [];
    const d = {
      update: vi.fn(async (p: Partial<Case>) => { order.push(`update:${p.status}`); }),
      createVersion: vi.fn(async () => { order.push('version'); return { ok: true as const, data: version }; }),
      releaseForCountersign: vi.fn(async () => { order.push('release'); return { ok: true as const, data: {} }; }),
      commitSignature: vi.fn(async () => { order.push('signature'); return null; }),
    };
    const r = await commitCountersignRelease(before, d);
    expect(order).toEqual(['update:pending-countersign', 'version', 'release', 'signature']);
    expect(vi.mocked(d.update).mock.calls[0][0].synopticReports?.[0].status).toBe('pending-countersign');
    expect(d.commitSignature).toHaveBeenCalledWith(expect.objectContaining({ id: 'ver-7', versionNumber: 3 }));
    expect(r.ok).toBe(true);
  });
  it('a conflict at the status write writes nothing else; a refused countersign release puts the status back', async () => {
    const createVersion = vi.fn();
    expect(await commitCountersignRelease(before, { update: vi.fn(async () => { throw new Error('conflict'); }), createVersion, releaseForCountersign: vi.fn(), commitSignature: vi.fn() }))
      .toMatchObject({ ok: false, step: 'status' });
    expect(createVersion).not.toHaveBeenCalled();
    const update = vi.fn(async () => {});
    const commitSignature = vi.fn();
    const r = await commitCountersignRelease(before, { update, createVersion: vi.fn(async () => ({ ok: true as const, data: version })), releaseForCountersign: vi.fn(async () => ({ ok: false as const, error: 'already released' })), commitSignature });
    expect(r).toMatchObject({ ok: false, step: 'countersign', error: 'already released', compensated: true });
    expect(vi.mocked(update).mock.calls[1]).toEqual([{ status: 'in-progress', synopticReports: before.synopticReports }]);
    expect(commitSignature).not.toHaveBeenCalled();
  });
});
