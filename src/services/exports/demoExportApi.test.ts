// Batch 611 (#194): the simulated export server answers the same calls as the real one.
import { describe, it, expect, vi } from 'vitest';
import { createDemoExportApi, demoBuildMs, demoRowCount, DEMO_LINK_SCHEME, DEMO_LONG_BUILD_MS } from './demoExportApi';
import type { CapturedFile } from '@/utils/downloadCapture';
import type { ExportRequest, ExportStatusEvent } from './asyncExportContract';

const REQ: ExportRequest = { kind: 'audit.audit-log', format: 'csv', parameters: {}, title: 'audit-log' };
const csv = (rows: number): CapturedFile => ({ filename: 'audit-log-2026-10-18.csv', mime: 'text/csv', content: ['h1,h2', ...Array.from({ length: rows }, (_, i) => `${i},x`)].join('\r\n') });

function setup(opts: { files?: CapturedFile[]; user?: string } = {}) {
  let now = new Date('2026-10-18T10:00:00Z');
  const timers: { fn: () => void; ms: number; id: number; live: boolean }[] = [];
  const save = vi.fn();
  const files = opts.files ?? [csv(3)];
  const build = vi.fn();
  let user = opts.user ?? 'u1';
  const api = createDemoExportApi({
    now: () => now,
    user: () => ({ userId: user, userName: user.toUpperCase() }),
    setTimer: (fn, ms) => { const t = { fn, ms, id: timers.length, live: true }; timers.push(t); return t.id; },
    clearTimer: h => { timers[h as number].live = false; },
    capture: async b => { await b(); return { result: undefined as never, files }; },
    save,
  });
  const events: ExportStatusEvent[] = [];
  api.subscribe(e => events.push(e));
  return { api, timers, save, build, events, advance: (ms: number) => { now = new Date(now.getTime() + ms); }, setUser: (u: string) => { user = u; } };
}

describe('pure rules', () => {
  it('counts data rows in the file, not the header or blank lines', () => {
    expect(demoRowCount(csv(3))).toBe(3);
    expect(demoRowCount({ content: 'h\r\n\r\n' })).toBe(0);
    expect(demoRowCount(undefined)).toBe(0);
  });
  it('up to 500 rows is ready at once; more takes 10 ms per extra row, at most 30 s; the long switch makes it 8 s', () => {
    expect(demoBuildMs(500, false)).toBe(0);
    expect(demoBuildMs(600, false)).toBe(1000);
    expect(demoBuildMs(100_000, false)).toBe(30_000);
    expect(demoBuildMs(5, true)).toBe(DEMO_LONG_BUILD_MS);
  });
});

describe('createDemoExportApi', () => {
  it('a quick export is ready at once, with rows, an expiry and a size, and downloads the kept file', async () => {
    const s = setup();
    const res = await s.api.request(REQ, { build: s.build });
    expect(res.ok && res.data.status).toBe('ready');
    if (!res.ok) throw new Error();
    expect(res.data.rowCount).toBe(3);
    expect(res.data.expiresAt).toBe('2026-10-25T10:00:00.000Z');
    expect(res.data.byteLength).toBeGreaterThan(0);
    const link = await s.api.downloadLink(res.data.exportId);
    expect(link.ok && link.data.url.startsWith(DEMO_LINK_SCHEME)).toBe(true);
    if (!link.ok) throw new Error();
    expect(link.data.filename).toBe('audit-log-2026-10-18.csv');
    expect(s.api.openDownload(link.data.url)).toBe(true);
    expect(s.save).toHaveBeenCalledWith(csv(3));
  });

  it('a long export is Running, appears in the list, becomes ready when its time is up, and tells the subscribers', async () => {
    const s = setup({ files: [csv(700)] });
    const res = await s.api.request(REQ, { build: s.build });
    if (!res.ok) throw new Error();
    expect(res.data.status).toBe('running');
    expect(s.timers).toHaveLength(1);
    expect(s.timers[0].ms).toBe(2000);
    expect((await s.api.list()).ok && (await s.api.list() as { data: unknown[] }).data).toHaveLength(1);
    expect((await s.api.downloadLink(res.data.exportId)).ok).toBe(false); // not ready yet
    s.timers[0].fn();
    const got = await s.api.get(res.data.exportId);
    expect(got.ok && got.data.status).toBe('ready');
    expect(s.events.map(e => e.status)).toEqual(['running', 'ready']);
    expect(s.events[1].rowCount).toBe(700);
  });

  it('the long switch makes even a small export take 8 s', async () => {
    const s = setup();
    s.api.setLongBuilds(true);
    expect(s.api.longBuilds()).toBe(true);
    const res = await s.api.request(REQ, { build: s.build });
    expect(res.ok && res.data.status).toBe('running');
    expect(s.timers[0].ms).toBe(DEMO_LONG_BUILD_MS);
  });

  it('cancel stops a running export and drops its file', async () => {
    const s = setup({ files: [csv(700)] });
    const res = await s.api.request(REQ, { build: s.build });
    if (!res.ok) throw new Error();
    const c = await s.api.cancel(res.data.exportId);
    expect(c.ok && c.data.status).toBe('cancelled');
    expect(s.timers[0].live).toBe(false);
    expect((await s.api.cancel(res.data.exportId)).ok).toBe(false); // already over
    expect(s.events[s.events.length - 1]?.status).toBe('cancelled');
  });

  it('refuses a fourth open export (3 per user) but not once one has finished', async () => {
    const s = setup({ files: [csv(700)] });
    for (let i = 0; i < 3; i++) expect((await s.api.request(REQ, { build: s.build })).ok).toBe(true);
    const fourth = await s.api.request(REQ, { build: s.build });
    expect(!fourth.ok && fourth.error.code).toBe('TOO_MANY_OPEN');
    s.timers[0].fn();
    expect((await s.api.request(REQ, { build: s.build })).ok).toBe(true);
  });

  it('a builder that produced no file (it refused, or had nothing) fails the export', async () => {
    const s = setup({ files: [] });
    const res = await s.api.request(REQ, { build: s.build });
    expect(res.ok && res.data.status).toBe('failed');
    expect(res.ok && res.data.error?.code).toBe('BUILD_FAILED');
  });

  it('refuses an unknown kind, and a request with no builder (the simulated server only builds what the browser builds)', async () => {
    const s = setup();
    const bad = await s.api.request({ ...REQ, kind: 'nope.nope' as never }, { build: s.build });
    expect(!bad.ok && bad.error.code).toBe('INVALID_PARAMETERS');
    const none = await s.api.request(REQ);
    expect(!none.ok && none.error.code).toBe('UNAVAILABLE');
  });

  it('a ready file expires after 7 days and then cannot be downloaded', async () => {
    const s = setup();
    const res = await s.api.request(REQ, { build: s.build });
    if (!res.ok) throw new Error();
    s.advance(7 * 86_400_000 + 1000);
    const got = await s.api.get(res.data.exportId);
    expect(got.ok && got.data.status).toBe('expired');
    const link = await s.api.downloadLink(res.data.exportId);
    expect(!link.ok && link.error.code).toBe('NOT_FOUND');
  });

  it('only the requester sees or downloads an export', async () => {
    const s = setup();
    const res = await s.api.request(REQ, { build: s.build });
    if (!res.ok) throw new Error();
    s.setUser('u2');
    expect(((await s.api.list()) as { data: unknown[] }).data).toEqual([]);
    expect((await s.api.get(res.data.exportId)).ok).toBe(false);
    const link = await s.api.downloadLink(res.data.exportId);
    expect(!link.ok && link.error.code).toBe('NOT_PERMITTED');
  });

  it('lists newest first, ignores links it did not issue, and forgets everything on sign-out', async () => {
    const s = setup();
    const a = await s.api.request(REQ, { build: s.build });
    s.advance(1000);
    const b = await s.api.request({ ...REQ, title: 'second' }, { build: s.build });
    if (!a.ok || !b.ok) throw new Error();
    const list = await s.api.list();
    expect(list.ok && list.data.map(j => j.title)).toEqual(['second', 'audit-log']);
    expect(s.api.openDownload('https://example.com/x')).toBe(false);
    expect(s.api.openDownload(`${DEMO_LINK_SCHEME}missing`)).toBe(false);
    s.api.setLongBuilds(true);
    s.api.reset();
    expect(((await s.api.list()) as { data: unknown[] }).data).toEqual([]);
    expect(s.api.longBuilds()).toBe(false);
  });
});
