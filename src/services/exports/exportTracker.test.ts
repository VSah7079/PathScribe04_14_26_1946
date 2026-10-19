// Batch 550 (PS-539 phase 2d, D7): the browser's export service.
import { describe, it, expect, vi } from 'vitest';
import { createExportTracker, exportProblemKey, noticeForJob, noticeMayChange, PREPARING_POLL_MS } from './exportTracker';
import { absoluteDownloadUrl, downloadFromUrl } from '@/utils/downloadFromUrl';
import { onSessionEnd, runSessionEndHooks } from '../auth/sessionEndHooks';
import { createHttpExportApi, exportApiError, type IExportApi } from './httpExportApi';
import { exportFacilityId, exportTitleFromFilename, type ExportJob, type ExportStatusEvent } from './asyncExportContract';
import { parseExportStatusEvent } from '../liveUpdates/liveUpdateContract';

const job = (over: Partial<ExportJob> = {}): ExportJob => ({
  exportId: 'x1', kind: 'audit.audit-log', format: 'csv', title: 'audit-log', status: 'queued',
  requestedBy: { userId: 'u1', userName: 'Dr A' }, requestedAt: '2026-10-13T00:00:00Z', ...over,
});

/** A fake API whose job moves through `statuses`, one per GET. */
function fakeApi(statuses: ExportJob['status'][], over: Partial<IExportApi> = {}) {
  let i = 0;
  const api: IExportApi = {
    request: vi.fn(async () => ({ ok: true as const, data: job() })),
    get: vi.fn(async () => ({ ok: true as const, data: job({ status: statuses[Math.min(i++, statuses.length - 1)], rowCount: 12 }) })),
    list: vi.fn(async () => ({ ok: true as const, data: [job({ status: 'ready' })] })),
    downloadLink: vi.fn(async () => ({ ok: true as const, data: { url: 'https://blob.example/x1?sig', expiresAt: 'later', filename: 'audit-log-2026-10-13.csv' } })),
    cancel: vi.fn(async () => ({ ok: true as const, data: job({ status: 'cancelled' }) })),
    ...over,
  };
  return api;
}

function setup(api: IExportApi | null) {
  let t = 0;
  const timers: { fn: () => void; ms: number }[] = [];
  let onEvent: ((e: ExportStatusEvent) => void) | null = null;
  const unsubscribe = vi.fn(() => { onEvent = null; });
  const openDownload = vi.fn((_url: string, _name: string) => true);
  const tracker = createExportTracker({
    api,
    subscribeStatus: fn => { onEvent = fn; return { unsubscribe }; },
    openDownload,
    now: () => t,
    sleep: async ms => { t += ms; },
    setTimer: (fn, ms) => { const x = { fn, ms }; timers.push(x); return x; },
    clearTimer: h => { const i = timers.indexOf(h as never); if (i >= 0) timers.splice(i, 1); },
  });
  return { tracker, openDownload, timers, emit: (e: ExportStatusEvent) => onEvent?.(e), unsubscribe, hasSubscription: () => onEvent !== null };
}

const input = (buildInBrowser = vi.fn()) => ({ kind: 'audit.audit-log' as const, title: 'audit-log', parameters: { from: '2026-10-01' }, buildInBrowser });

describe('no API server (the demo): exports are built in the browser, as before', () => {
  it('runs the browser build and nothing else', async () => {
    const { tracker } = setup(null);
    const build = vi.fn();
    expect(await tracker.run(input(build))).toEqual({ via: 'browser' });
    expect(build).toHaveBeenCalledTimes(1);
    expect(tracker.viaServer).toBe(false);
    expect(tracker.getSnapshot()).toEqual([]);
    expect(await tracker.list()).toEqual({ ok: true, data: [] });
  });
});

describe('with the API server', () => {
  it('a quick export (ready within 3 s) downloads straight away: no notice, no extra click', async () => {
    const api = fakeApi(['running', 'ready']);
    const { tracker, openDownload } = setup(api);
    const build = vi.fn();
    expect(await tracker.run(input(build))).toEqual({ via: 'server', result: 'downloaded', exportId: 'x1' });
    expect(build).not.toHaveBeenCalled();
    expect(api.request).toHaveBeenCalledWith({ kind: 'audit.audit-log', format: 'csv', parameters: { from: '2026-10-01' }, title: 'audit-log' }, { build: expect.any(Function) });
    expect(openDownload).toHaveBeenCalledWith('https://blob.example/x1?sig', 'audit-log-2026-10-13.csv');
    expect(tracker.getSnapshot()).toEqual([]);
  });

  it('a long export shows "preparing" after 3 s; the hub saying ready offers Download, which downloads and clears it', async () => {
    const api = fakeApi(['running']);
    const s = setup(api);
    expect(await s.tracker.run({ ...input(), facilityId: 'F1' })).toEqual({ via: 'server', result: 'preparing', exportId: 'x1' });
    expect(api.request).toHaveBeenCalledWith(expect.objectContaining({ facilityId: 'F1' }), expect.anything());
    expect(api.get).toHaveBeenCalledTimes(6); // every 500 ms for 3 s
    expect(s.tracker.getSnapshot()).toEqual([{ exportId: 'x1', title: 'audit-log', state: 'preparing' }]);
    expect(s.hasSubscription()).toBe(true);
    expect(s.timers.map(x => x.ms)).toEqual([PREPARING_POLL_MS]);
    s.emit({ type: 'ExportStatus', v: 1, eventId: 'e1', exportId: 'x1', status: 'ready', title: 'audit-log', rowCount: 250000 });
    await Promise.resolve();
    expect(s.tracker.getSnapshot()).toEqual([{ exportId: 'x1', title: 'audit-log', state: 'ready', rowCount: 250000 }]);
    expect(s.hasSubscription()).toBe(false); // nothing left to wait for
    expect(s.timers).toEqual([]);
    expect(await s.tracker.download('x1')).toEqual({ ok: true });
    expect(s.openDownload).toHaveBeenCalledTimes(1);
    expect(s.tracker.getSnapshot()).toEqual([]);
  });

  it('with no hub message, the 15 s re-read finds it ready', async () => {
    const api = fakeApi(['running', 'running', 'running', 'running', 'running', 'running', 'ready']);
    const s = setup(api);
    await s.tracker.run(input());
    s.timers[0].fn();
    await vi.waitFor(() => expect(s.tracker.getSnapshot()[0]?.state).toBe('ready'));
  });

  it('a failed export says why: the event has no reason, so the job is read for it', async () => {
    const api = fakeApi(['running'], {});
    const s = setup(api);
    await s.tracker.run(input());
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, data: job({ status: 'failed', error: { code: 'TIMED_OUT', message: 'stopped after 30 minutes' } }) });
    s.emit({ type: 'ExportStatus', v: 1, eventId: 'e2', exportId: 'x1', status: 'failed', title: 'audit-log' });
    await vi.waitFor(() => expect(s.tracker.getSnapshot()).toEqual([{ exportId: 'x1', title: 'audit-log', state: 'failed', problem: 'TIMED_OUT' }]));
  });

  it('a refusal at request time is shown at once, with the matched count for TOO_MANY_ROWS', async () => {
    const api = fakeApi([], { request: vi.fn(async () => ({ ok: false as const, error: { code: 'TOO_MANY_ROWS' as const, matchedRows: 1_000_001 } })) });
    const { tracker } = setup(api);
    expect(await tracker.run(input())).toEqual({ via: 'server', result: 'refused', problem: 'TOO_MANY_ROWS' });
    expect(tracker.getSnapshot()).toEqual([expect.objectContaining({ state: 'failed', problem: 'TOO_MANY_ROWS', matchedRows: 1_000_001 })]);
  });

  it('a download refused because the capability was removed says so on the notice', async () => {
    const api = fakeApi(['running'], { downloadLink: vi.fn(async () => ({ ok: false as const, error: { code: 'NOT_PERMITTED' as const } })) });
    const s = setup(api);
    await s.tracker.run(input());
    s.emit({ type: 'ExportStatus', v: 1, eventId: 'e1', exportId: 'x1', status: 'ready', title: 'audit-log' });
    await Promise.resolve();
    expect(await s.tracker.download('x1')).toEqual({ ok: false, problem: 'NOT_PERMITTED' });
    expect(s.tracker.getSnapshot()[0]).toMatchObject({ state: 'failed', problem: 'NOT_PERMITTED' });
    expect(s.openDownload).not.toHaveBeenCalled();
  });

  it('an export asked for in another window is not shown here (My exports lists it)', async () => {
    const s = setup(fakeApi(['running']));
    await s.tracker.run(input());
    s.emit({ type: 'ExportStatus', v: 1, eventId: 'e9', exportId: 'other', status: 'ready', title: 'other' });
    await Promise.resolve();
    expect(s.tracker.getSnapshot().map(n => n.exportId)).toEqual(['x1']);
  });

  it('cancel and dismiss clear the notice', async () => {
    const api = fakeApi(['running']);
    const s = setup(api);
    await s.tracker.run(input());
    expect(await s.tracker.cancel('x1')).toEqual({ ok: true });
    expect(s.tracker.getSnapshot()).toEqual([]);
    await s.tracker.run(input());
    s.tracker.dismiss('x1');
    expect(s.tracker.getSnapshot()).toEqual([]);
  });
});

describe('notices from job status', () => {
  it('ready, failed (with its code), expired, cancelled (none) and preparing', () => {
    expect(noticeForJob(job({ status: 'ready', rowCount: 3 }))).toMatchObject({ state: 'ready', rowCount: 3 });
    expect(noticeForJob(job({ status: 'failed', error: { code: 'BUILD_FAILED', message: '' } }))).toMatchObject({ state: 'failed', problem: 'BUILD_FAILED' });
    expect(noticeForJob(job({ status: 'expired' }))).toMatchObject({ state: 'failed', problem: 'EXPIRED' });
    expect(noticeForJob(job({ status: 'cancelled' }))).toBeNull();
    expect(noticeForJob(job({ status: 'queued' }))).toMatchObject({ state: 'preparing' });
  });
});

describe('the HTTP client', () => {
  it('posts the request with the access token, and reads the job', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(job()), { status: 202 }));
    const api = createHttpExportApi({ baseUrl: 'https://api.example/', fetch: fetchFn as never, accessToken: async () => 'tok' });
    const res = await api.request({ kind: 'audit.audit-log', format: 'csv', parameters: {}, title: 't' });
    expect(res.ok).toBe(true);
    const [url, init] = (fetchFn.mock.calls[0] as unknown) as [string, RequestInit];
    expect(url).toBe('https://api.example/api/exports');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });
  it('paths for status, download and cancel; ids are encoded', async () => {
    const fetchFn = vi.fn(async () => new Response('{}', { status: 200 }));
    const api = createHttpExportApi({ baseUrl: 'https://api.example', fetch: fetchFn as never, accessToken: async () => '' });
    await api.get('a/b'); await api.downloadLink('x'); await api.cancel('x'); await api.list();
    expect(fetchFn.mock.calls.map(c => ((c as unknown) as [string])[0])).toEqual([
      'https://api.example/api/exports/a%2Fb', 'https://api.example/api/exports/x/download', 'https://api.example/api/exports/x/cancel', 'https://api.example/api/exports',
    ]);
  });
  it('errors: the body\'s code wins; otherwise the status decides; a network failure is UNAVAILABLE', async () => {
    expect(exportApiError(409, { code: 'TOO_MANY_OPEN' })).toEqual({ code: 'TOO_MANY_OPEN' });
    expect(exportApiError(422, { code: 'TOO_MANY_ROWS', matchedRows: 5 })).toEqual({ code: 'TOO_MANY_ROWS', matchedRows: 5 });
    expect(exportApiError(403, null)).toEqual({ code: 'NOT_PERMITTED' });
    expect(exportApiError(401, null)).toEqual({ code: 'SIGNED_OUT' });
    expect(exportApiError(429, null)).toEqual({ code: 'TOO_MANY_OPEN' });
    expect(exportApiError(404, {})).toEqual({ code: 'NOT_FOUND' });
    expect(exportApiError(503, { code: 'SOMETHING_ELSE' })).toEqual({ code: 'UNAVAILABLE' });
    const api = createHttpExportApi({ baseUrl: 'https://api.example', fetch: (async () => { throw new Error('offline'); }) as never, accessToken: async () => '' });
    expect(await api.get('x')).toEqual({ ok: false, error: { code: 'UNAVAILABLE' } });
  });
});

describe('request helpers and the hub event', () => {
  it('the title drops the date and extension; the facility comes from the checked context', () => {
    expect(exportTitleFromFilename('reconciliation-F1-2026-10-13.csv')).toBe('reconciliation-F1');
    expect(exportTitleFromFilename('audit_log_2026-10-13.csv')).toBe('audit_log');
    expect(exportTitleFromFilename('plain.csv')).toBe('plain');
    expect(exportFacilityId({ facilityIds: ['F1'] })).toBe('F1');
    expect(exportFacilityId({ allFacilities: true })).toBe('all');
    expect(exportFacilityId({ facilityId: 'F2' })).toBe('F2');
    expect(exportFacilityId(undefined)).toBeUndefined();
  });
  it('ExportStatus from the wire is checked; anything malformed is ignored', () => {
    const ok = { type: 'ExportStatus', v: 1, eventId: 'e', exportId: 'x', status: 'ready', title: 't', rowCount: 3 };
    expect(parseExportStatusEvent(ok)).toEqual(ok);
    expect(parseExportStatusEvent({ ...ok, v: 2 })).toBeNull();
    expect(parseExportStatusEvent({ ...ok, status: 'done' })).toBeNull();
    expect(parseExportStatusEvent({ ...ok, rowCount: -1 })).toBeNull();
    expect(parseExportStatusEvent({ ...ok, type: 'Other' })).toBeNull();
  });
});

describe('notice wording (Batch 550)', () => {
  it('every problem a notice can show has its text in English (the parity test covers the other languages)', async () => {
    const { EXPORT_PROBLEMS, exportNoticeMessage } = await import('./exportTracker');
    const en = (await import('../../i18n/locales/en.json')).default as { exports: { problem: Record<string, string> } };
    for (const p of EXPORT_PROBLEMS) expect(en.exports.problem[p], p).toBeTruthy();
    expect(exportNoticeMessage({ state: 'failed', problem: 'TOO_MANY_ROWS', matchedRows: 5 })).toEqual({ key: 'exports.problem.TOO_MANY_ROWS_count', values: { count: 5 } });
    expect(exportNoticeMessage({ state: 'ready' })).toEqual({ key: 'exports.notice.ready' });
  });
});

describe('after the independent check (Batch 550)', () => {
  it('signing out (reset) forgets every notice and stops listening and re-reading; a run in progress stops quietly', async () => {
    const api = fakeApi(['running']);
    const s = setup(api);
    await s.tracker.run(input());
    expect(s.tracker.getSnapshot()).toHaveLength(1);
    s.tracker.reset();
    expect(s.tracker.getSnapshot()).toEqual([]);
    expect(s.hasSubscription()).toBe(false);
    expect(s.timers).toEqual([]);
  });

  it('a double click while the first request is being made sends one request', async () => {
    const api = fakeApi(['running', 'ready']);
    const { tracker } = setup(api);
    const [a, b] = await Promise.all([tracker.run(input()), tracker.run(input())]);
    expect(api.request).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });

  it('after 1 s without an answer the "preparing" notice shows; a quick one that turns ready at 2 s still downloads by itself and clears it', async () => {
    const api = fakeApi(['running', 'running', 'running', 'ready']);
    const s = setup(api);
    const snapshots: number[] = [];
    s.tracker.subscribe(() => snapshots.push(s.tracker.getSnapshot().length));
    expect(await s.tracker.run(input())).toMatchObject({ result: 'downloaded' });
    expect(snapshots).toContain(1);
    expect(s.tracker.getSnapshot()).toEqual([]);
    expect(s.openDownload).toHaveBeenCalledTimes(1);
  });

  it('a late "still running" answer never turns a ready notice back into preparing', () => {
    expect(noticeMayChange('ready', 'preparing')).toBe(false);
    expect(noticeMayChange('failed', 'preparing')).toBe(false);
    expect(noticeMayChange('preparing', 'ready')).toBe(true);
    expect(noticeMayChange(undefined, 'preparing')).toBe(true);
  });

  it('a download link the browser refuses keeps the notice, saying the server could not be reached', async () => {
    const api = fakeApi(['running']);
    const s = setup(api);
    s.openDownload.mockReturnValue(false);
    await s.tracker.run(input());
    s.emit({ type: 'ExportStatus', v: 1, eventId: 'e1', exportId: 'x1', status: 'ready', title: 'audit-log' });
    expect(await s.tracker.download('x1')).toEqual({ ok: false, problem: 'UNAVAILABLE' });
    expect(s.tracker.getSnapshot()[0]).toMatchObject({ state: 'failed', problem: 'UNAVAILABLE' });
  });

  it('two refusals in the same moment are two notices', async () => {
    const api = fakeApi([], { request: vi.fn(async () => ({ ok: false as const, error: { code: 'TOO_MANY_OPEN' as const } })) });
    const { tracker } = setup(api);
    await tracker.run(input());
    await tracker.run({ ...input(), parameters: { other: 1 } });
    expect(tracker.getSnapshot()).toHaveLength(2);
  });

  it('an unknown code from the server is shown as "couldn\'t be made"', () => {
    expect(exportProblemKey('SOMETHING_NEW')).toBe('exports.problem.BUILD_FAILED');
    expect(exportProblemKey('TIMED_OUT')).toBe('exports.problem.TIMED_OUT');
  });
});

describe('download links (Batch 550)', () => {
  it('only an absolute https link is followed (http only to this computer in development); a path is on the API server', () => {
    expect(absoluteDownloadUrl('/api/exports/x/file?t=1', 'https://api.example/base')).toBe('https://api.example/api/exports/x/file?t=1');
    expect(absoluteDownloadUrl('https://blob.example/x', 'https://api.example')).toBe('https://blob.example/x');
    expect(absoluteDownloadUrl('//evil.example/x', 'https://api.example')).toBe('');
    expect(downloadFromUrl('', 'f.csv')).toBe(false);
    expect(downloadFromUrl('http://blob.example/x', 'f.csv')).toBe(false);
    expect(downloadFromUrl('javascript:alert(1)', 'f.csv')).toBe(false);
    expect(downloadFromUrl('https://u:p@blob.example/x', 'f.csv')).toBe(false);
  });
});

describe('session end hooks (Batch 550)', () => {
  it('run on sign-out; one failing never stops the others', () => {
    const a = vi.fn(() => { throw new Error('x'); });
    const b = vi.fn();
    const offA = onSessionEnd(a); const offB = onSessionEnd(b);
    runSessionEndHooks();
    expect(a).toHaveBeenCalled(); expect(b).toHaveBeenCalled();
    offA(); offB();
  });
});
