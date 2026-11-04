// Batch 551 (PS-539 phase 2d): the Server jobs view's service and rules.
import { describe, it, expect, vi } from 'vitest';
import { createHttpServerJobsApi, createServerJobsService, serverJobsError, type IServerJobsApi } from './serverJobsService';
import { deadLetterContext, kindNeedsAttention, normaliseJobKind, recurringJobOverdue, requeueRouteFor, REQUEUE_ROUTE, SERVER_JOB_KINDS } from './serverJobsContract';
import { CAPABILITY_CATALOG } from '../authorization/capabilityCatalog';

const api = (): IServerJobsApi => ({
  health: vi.fn(async () => ({ ok: true as const, data: { generatedAt: 'now', kinds: [], recurring: [] } })),
  deadLetters: vi.fn(async () => ({ ok: true as const, data: [] })),
  requeue: vi.fn(async (jobId: string) => ({ ok: true as const, data: { jobId, requeuedAt: 'now' } })),
});
const allow = (allowed: string[], visible: (ctx: Record<string, unknown>) => boolean = () => true) => ({
  enforce: vi.fn(async (c: string) => ({ allowed: allowed.includes(c) }) as never),
  evaluate: vi.fn(async (c: string, ctx: Record<string, unknown> = {}) => ({ allowed: allowed.includes(c) && visible(ctx) }) as never),
});

describe('the Server jobs service (Batch 551)', () => {
  it('with no API server (the demo) there is nothing to list', async () => {
    const s = createServerJobsService({ api: null, authorization: allow([]) });
    expect(s.viaServer).toBe(false);
    expect(await s.health()).toEqual({ ok: false, error: 'UNAVAILABLE' });
  });

  it('seeing the jobs needs jobs:server-job:view, checked here before the server is asked', async () => {
    const a = api();
    const refused = createServerJobsService({ api: a, authorization: allow([]) });
    expect(await refused.health()).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await refused.deadLetters()).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(a.health).not.toHaveBeenCalled();
    const ok = createServerJobsService({ api: a, authorization: allow(['jobs:server-job:view']) });
    expect((await ok.deadLetters('charge.dispatch')).ok).toBe(true);
    expect(a.deadLetters).toHaveBeenCalledWith('charge.dispatch');
  });

  it('requeue needs jobs:server-job:requeue at the job\'s facility; interface and print jobs are resent from their own screens', async () => {
    const a = api();
    const auth = allow(['jobs:server-job:requeue']);
    const s = createServerJobsService({ api: a, authorization: auth });
    expect(await s.requeue({ jobId: 'j1', kind: 'interface.dispatch' })).toEqual({ ok: false, error: 'WRONG_SCREEN' });
    expect(await s.requeue({ jobId: 'j2', kind: 'print.dispatch' })).toEqual({ ok: false, error: 'WRONG_SCREEN' });
    expect((await s.requeue({ jobId: 'j3', kind: 'report.releaseHeld', facilityId: 'F1' })).ok).toBe(true);
    expect(auth.enforce).toHaveBeenCalledWith('jobs:server-job:requeue', { facilityId: 'F1' });
    // No facility but a case: checked at the case (so a facility-limited user can't requeue another facility's).
    await s.requeue({ jobId: 'j5', kind: 'delivery.attempt', caseId: 'C9' });
    expect(auth.enforce).toHaveBeenLastCalledWith('jobs:server-job:requeue', { facilityId: null, caseId: 'C9' });
    // Neither: every facility.
    await s.requeue({ jobId: 'j6', kind: 'export.build' });
    expect(auth.enforce).toHaveBeenLastCalledWith('jobs:server-job:requeue', { allFacilities: true });
    expect(await s.requeue({ jobId: 'j7', kind: 'future.kind' })).toEqual({ ok: false, error: 'WRONG_SCREEN' });
    expect(a.requeue).toHaveBeenCalledTimes(3);
    const refused = createServerJobsService({ api: a, authorization: allow([]) });
    expect(await refused.requeue({ jobId: 'j4', kind: 'charge.dispatch' })).toEqual({ ok: false, error: 'NOT_PERMITTED' });
  });

  it('a facility-limited viewer sees only their facilities\' dead letters', async () => {
    const a = api();
    (a.deadLetters as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: [
      { jobId: 'mine', kind: 'charge.dispatch', facilityId: 'F1' }, { jobId: 'theirs', kind: 'charge.dispatch', facilityId: 'F2' }, { jobId: 'lab', kind: 'export.build' },
    ] });
    const s = createServerJobsService({ api: a, authorization: allow(['jobs:server-job:view'], ctx => ctx.facilityId === 'F1') });
    const res = await s.deadLetters();
    expect(res.ok && res.data.map(j => j.jobId)).toEqual(['mine']);
  });

  it('the HTTP client turns event:{consumer} into an event job with its consumer', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify([{ jobId: 'e', kind: 'event:notifyClinician' }]), { status: 200 }));
    const h = createHttpServerJobsApi({ baseUrl: 'https://api.example', fetch: fetchFn as never, accessToken: async () => '' });
    const res = await h.deadLetters();
    expect(res.ok && res.data[0]).toMatchObject({ kind: 'event', consumer: 'notifyClinician' });
    expect(normaliseJobKind('charge.dispatch')).toEqual({ kind: 'charge.dispatch' });
  });

  it('the HTTP client: paths, token, and errors', async () => {
    const fetchFn = vi.fn(async () => new Response('[]', { status: 200 }));
    const h = createHttpServerJobsApi({ baseUrl: 'https://api.example/', fetch: fetchFn as never, accessToken: async () => 'tok' });
    await h.health(); await h.deadLetters('export.build'); await h.requeue('a/b');
    expect(fetchFn.mock.calls.map(c => ((c as unknown) as [string])[0])).toEqual([
      'https://api.example/api/jobs/health', 'https://api.example/api/jobs/dead-letters?kind=export.build', 'https://api.example/api/jobs/a%2Fb/requeue',
    ]);
    expect((((fetchFn.mock.calls[2] as unknown) as [string, RequestInit])[1].headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(serverJobsError(409, null)).toBe('NOT_DEAD_LETTERED');
    expect(serverJobsError(401, null)).toBe('SIGNED_OUT');
    expect(serverJobsError(500, { code: 'NOT_FOUND' })).toBe('NOT_FOUND');
    expect(serverJobsError(503, null)).toBe('UNAVAILABLE');
  });
});

describe('the rules the screen uses (MESSAGE_BUS_API.md §7)', () => {
  const now = new Date('2026-10-13T12:00:00Z');
  it('a recurring job is overdue after three intervals; never run is overdue; one on its own schedule is left to the server', () => {
    expect(recurringJobOverdue({ name: 'consult.expireLinks', lastRunAt: '2026-10-13T11:46:00Z' }, now)).toBe(false);
    expect(recurringJobOverdue({ name: 'consult.expireLinks', lastRunAt: '2026-10-13T11:44:00Z' }, now)).toBe(true);
    expect(recurringJobOverdue({ name: 'bus.purge' }, now)).toBe(true);
    expect(recurringJobOverdue({ name: 'assist.pollLis' }, now)).toBe(false);
    expect(recurringJobOverdue({ name: 'cytology.roseSlaMonitor' }, now)).toBe(false); // optional: a site may switch it off
    expect(recurringJobOverdue({ name: 'release.dueSweep', lastRunAt: '2026-10-13T11:59:20Z' }, now)).toBe(false); // 40 s: within 3 × 15 s
    expect(recurringJobOverdue({ name: 'release.dueSweep', lastRunAt: '2026-10-13T11:59:00Z' }, now)).toBe(true);
    expect(recurringJobOverdue({ name: 'some.newJob' }, now)).toBe(false);
  });
  it('a kind needs attention when work is more than 5 minutes past due, or anything failed for good today', () => {
    expect(kindNeedsAttention({ oldestReadyOverdueSeconds: 301, deadLetters24h: 0 })).toBe(true);
    expect(kindNeedsAttention({ oldestReadyOverdueSeconds: 300, deadLetters24h: 1 })).toBe(true);
    expect(kindNeedsAttention({ oldestReadyOverdueSeconds: 120, deadLetters24h: 0 })).toBe(false);
  });
  it('the context of a dead letter: its facility and case, or every facility when it names neither', () => {
    expect(deadLetterContext({ facilityId: 'F1' })).toEqual({ facilityId: 'F1' });
    expect(deadLetterContext({ caseId: 'C1' })).toEqual({ facilityId: null, caseId: 'C1' });
    expect(deadLetterContext({})).toEqual({ allFacilities: true });
    expect(requeueRouteFor('nope')).toBeNull();
  });
  it('every kind has a requeue route whose capability is in the catalog', () => {
    const keys = CAPABILITY_CATALOG.map(c => c.key as string);
    for (const k of SERVER_JOB_KINDS) expect(keys, k).toContain(REQUEUE_ROUTE[k].capability);
  });
});
