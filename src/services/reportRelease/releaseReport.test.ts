// src/services/reportRelease/releaseReport.test.ts
// Batch 534 (Pete, Oct 12, 2026): every report output follows the release delay
// (a resend after a failure never comes through here); Recall by the person who
// released it reopens what was released.
import { describe, it, expect, vi } from 'vitest';
import { releaseReport, releaseDueReports, recallHeldRelease, recallHeldForCase, trackSignOutBuffer, type ReleaseReportDeps } from './releaseReport';
import type { IHeldReleaseService } from './mockHeldReleaseService';
import type { HeldRelease } from '@/types/reportRelease/HeldRelease';

function heldStore(): IHeldReleaseService & { rows: HeldRelease[] } {
  const rows: HeldRelease[] = [];
  return {
    rows,
    async add(h) { rows.push(h); return { ok: true, data: h }; },
    async getAll() { return { ok: true, data: rows.map(r => ({ ...r })) }; },
    async getByCaseId(id) { return { ok: true, data: rows.filter(r => r.caseId === id) }; },
    async settle(id, status, at) {
      const r = rows.find(x => x.id === id);
      if (!r || r.status !== 'held') return false;
      Object.assign(r, { status, ...(status === 'released' ? { sentAt: at } : { recalledAt: at }), pdfBase64: undefined });
      return true;
    },
  };
}

function makeDeps(over: Partial<ReleaseReportDeps> = {}, clock = { t: new Date('2026-10-12T18:00:00.000Z') }) {
  const held = heldStore();
  const deps: ReleaseReportDeps = {
    resolveDelay: vi.fn(async () => ({ applies: true, durationMinutes: 10 })),
    held,
    publish: vi.fn(async () => ({ dispatchedCount: 1 })),
    runFollowUp: vi.fn(async () => undefined),
    reopen: vi.fn(async () => undefined),
    audit: vi.fn(async () => undefined),
    releaseSignOut: vi.fn(async () => ({ released: true })),
    now: () => clock.t,
    newId: () => 'n1',
    ...over,
  };
  return { deps, held, clock };
}

const event = { caseId: 'C1', reportType: 'CORRECTED' as const, releasedAt: '2026-10-12T18:00:00.000Z', source: 'CYTOLOGY' as const, instanceId: 'rec-2',
  releasedBy: { id: 'P1', name: 'Dr P' }, generatePdf: async () => ({ pdfBase64: 'PDF-AT-RELEASE' }) };
const hold = { kind: 'cytology-revision' as const, releasedBy: { userId: 'P1', userName: 'Dr P' }, subject: { recordId: 'rec-2' },
  followUps: [{ type: 'cytology-revision-registry' as const, recordId: 'rec-2', revision: 'correction' as const, isGynCytology: true, categories: [] }] };

describe('releaseReport', () => {
  it('no delay (switched off, or STAT with the bypass): published at once, with what goes with it', async () => {
    const { deps, held } = makeDeps({ resolveDelay: vi.fn(async () => ({ applies: false, durationMinutes: 0, bypassReason: 'STAT priority' })) });
    const out = await releaseReport(event, hold, deps);
    expect(out).toEqual({ published: { dispatchedCount: 1 } });
    expect(deps.publish).toHaveBeenCalledWith(event);
    expect(deps.runFollowUp).toHaveBeenCalledWith(hold.followUps[0], 'C1');
    expect(held.rows).toHaveLength(0);
  });

  it('a delay that can\'t be worked out never stops the report: published at once', async () => {
    const { deps } = makeDeps({ resolveDelay: vi.fn(async () => { throw new Error('down'); }) });
    expect('published' in await releaseReport(event, hold, deps)).toBe(true);
  });

  it('with the delay: held, with the PDF as it was when released, nothing sent, audited', async () => {
    const { deps, held } = makeDeps();
    const out = await releaseReport(event, hold, deps);
    expect('held' in out).toBe(true);
    expect(deps.publish).not.toHaveBeenCalled();
    expect(deps.runFollowUp).not.toHaveBeenCalled();
    expect(held.rows[0]).toMatchObject({
      id: 'held-n1', caseId: 'C1', kind: 'cytology-revision', status: 'held', pdfBase64: 'PDF-AT-RELEASE',
      heldAt: '2026-10-12T18:00:00.000Z', expiresAt: '2026-10-12T18:10:00.000Z', subject: { recordId: 'rec-2' },
    });
    expect((held.rows[0].event as unknown as Record<string, unknown>).generatePdf).toBeUndefined();
    expect((deps.audit as any).mock.calls[0][0]).toMatchObject({ event: 'REPORT_RELEASE_HELD', caseId: 'C1' });
  });
});

describe('releaseDueReports', () => {
  it('sends nothing before the delay ends; then once, with the stored PDF and the follow-ups', async () => {
    const { deps, clock } = makeDeps();
    await releaseReport(event, hold, deps);
    clock.t = new Date('2026-10-12T18:09:59.000Z');
    expect(await releaseDueReports(deps)).toBe(0);
    clock.t = new Date('2026-10-12T18:10:00.000Z');
    expect(await releaseDueReports(deps)).toBe(1);
    const sent = (deps.publish as any).mock.calls[0][0];
    expect(sent).toMatchObject({ caseId: 'C1', reportType: 'CORRECTED', instanceId: 'rec-2' });
    await expect(sent.generatePdf()).resolves.toEqual({ pdfBase64: 'PDF-AT-RELEASE' });
    expect(deps.runFollowUp).toHaveBeenCalledWith(hold.followUps[0], 'C1');
    expect((deps.audit as any).mock.calls.at(-1)[0]).toMatchObject({ event: 'REPORT_RELEASE_SENT' });
    // Never twice (two open screens both sweeping).
    expect(await releaseDueReports(deps)).toBe(0);
    expect(deps.publish).toHaveBeenCalledTimes(1);
  });

  it('a surgical sign-out\'s buffer is released on the case, not published again here', async () => {
    const { deps, clock } = makeDeps();
    await trackSignOutBuffer({ caseId: 'S1', expiresAt: '2026-10-12T18:05:00.000Z', releasedBy: { userId: 'P1', userName: 'Dr P' }, performingFacilityId: 'F1' }, deps);
    clock.t = new Date('2026-10-12T18:06:00.000Z');
    expect(await releaseDueReports(deps)).toBe(1);
    expect(deps.releaseSignOut).toHaveBeenCalledWith('S1');
    expect(deps.publish).not.toHaveBeenCalled();
  });
});

describe('recallHeldRelease', () => {
  it('the person who released it, within the delay: nothing is sent and what was released reopens', async () => {
    const { deps, clock } = makeDeps();
    await releaseReport(event, hold, deps);
    expect(await recallHeldRelease('held-n1', { userId: 'P1', userName: 'Dr P' }, deps)).toEqual({ ok: true });
    expect(deps.reopen).toHaveBeenCalledWith(expect.objectContaining({ id: 'held-n1', kind: 'cytology-revision' }), { userId: 'P1', userName: 'Dr P' });
    expect((deps.audit as any).mock.calls.at(-1)[0]).toMatchObject({ event: 'REPORT_RELEASE_RECALLED' });
    clock.t = new Date('2026-10-12T19:00:00.000Z');
    expect(await releaseDueReports(deps)).toBe(0);
    expect(deps.publish).not.toHaveBeenCalled();
  });

  it('refused for someone else, after the delay, for a kind that can\'t reopen yet, or when not found', async () => {
    const { deps, clock } = makeDeps();
    await releaseReport(event, hold, deps);
    expect(await recallHeldRelease('held-n1', { userId: 'P2', userName: 'Dr Q' }, deps)).toEqual({ ok: false, refusal: 'notReleaser' });
    expect(await recallHeldRelease('nope', { userId: 'P1', userName: 'Dr P' }, deps)).toEqual({ ok: false, refusal: 'notFound' });
    clock.t = new Date('2026-10-12T18:10:00.000Z');
    expect(await recallHeldRelease('held-n1', { userId: 'P1', userName: 'Dr P' }, deps)).toEqual({ ok: false, refusal: 'expired' });
    // The surgical sign-out is recalled from its own banner, not here.
    const signOut = makeDeps();
    await trackSignOutBuffer({ caseId: 'S1', expiresAt: '2026-10-12T18:05:00.000Z', releasedBy: { userId: 'P1', userName: 'Dr P' } }, signOut.deps);
    expect(await recallHeldRelease('held-n1', { userId: 'P1', userName: 'Dr P' }, signOut.deps)).toEqual({ ok: false, refusal: 'notRecallable' });
    expect(deps.reopen).not.toHaveBeenCalled();
  });
});

describe('Batch 535', () => {
  it('a recall blocked by what came after (a FAD signed on the PAD) changes nothing', async () => {
    const { deps, held } = makeDeps({ recallBlocked: vi.fn(async () => 'superseded' as const) });
    await releaseReport({ ...event, reportType: 'PRELIMINARY', source: 'SURGPATH' }, { kind: 'autopsy', releasedBy: { userId: 'P1', userName: 'Dr P' } }, deps);
    expect(await recallHeldRelease('held-n1', { userId: 'P1', userName: 'Dr P' }, deps)).toEqual({ ok: false, refusal: 'superseded' });
    expect(held.rows[0].status).toBe('held');
    expect(deps.reopen).not.toHaveBeenCalled();
  });
  it('surgical corrections and addenda, and autopsy reports, can now be recalled by whoever released them', async () => {
    for (const kind of ['surgical-amendment', 'autopsy'] as const) {
      const { deps } = makeDeps();
      await releaseReport({ ...event, source: 'SURGPATH' }, { kind, releasedBy: { userId: 'P1', userName: 'Dr P' } }, deps);
      expect(await recallHeldRelease('held-n1', { userId: 'P1', userName: 'Dr P' }, deps)).toEqual({ ok: true });
    }
  });
  it('recalling a sign-out takes back the corrections still held on its case, and nothing else', async () => {
    const { deps, held } = makeDeps();
    await releaseReport({ ...event, source: 'SURGPATH' }, { kind: 'surgical-amendment', releasedBy: { userId: 'P1', userName: 'Dr P' } }, deps);
    await releaseReport(event, { ...hold, releasedBy: { userId: 'P1', userName: 'Dr P' } }, { ...deps, newId: () => 'n2' });
    expect(await recallHeldForCase('C1', ['surgical-amendment'], { userId: 'P1', userName: 'Dr P' }, deps)).toBe(1);
    expect(held.rows.map(r => [r.id, r.status])).toEqual([['held-n1', 'recalled'], ['held-n2', 'held']]);
    expect(deps.reopen).toHaveBeenCalledTimes(1);
  });
});
