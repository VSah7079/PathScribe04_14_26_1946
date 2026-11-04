// src/services/exports/demoExportApi.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 611 (#194, queue: "a demo export API behind the same interface, as site
// agents do"). Until the API server's /api/exports exists, this answers the
// same calls (IExportApi) from memory, so the whole flow can be shown: a long
// export says "Preparing", appears in My exports, can be cancelled, becomes
// ready and downloads.
//
// SIMULATED. The browser builds the file itself, exactly as it always has
// (`local.build`, with its downloads captured instead of saved: see
// utils/downloadCapture.ts), keeps it in memory until the page is reloaded or
// the user signs out, and holds it back for a simulated build time:
//   - up to 500 rows: ready at once (it downloads with no wait, as before);
//   - more rows: 10 ms for each row over 500, at most 30 s;
//   - "Simulate a long export" switched on: 8 s, whatever the size.
// Nothing here is a server: no row limit is applied, nothing is stored outside
// this window, and the capability is checked by the builder, as in the demo.
// Everything is passed in, so it is testable without a browser.
// ─────────────────────────────────────────────────────────────────────────────
import { captureDownloads, saveToDevice, type CapturedFile } from '@/utils/downloadCapture';
import { LIVE_UPDATES_CONTRACT_VERSION } from '../liveUpdates/liveUpdateContract';
import { EXPORT_KINDS, EXPORT_LIMITS, exportExpiresAt, downloadRefusal, type ExportJob, type ExportRequest, type ExportStatusEvent } from './asyncExportContract';
import type { ExportApiResult, ExportLocalBuild, IExportApi } from './httpExportApi';

/** Rows the simulated server builds at once. */
export const DEMO_QUICK_ROWS = 500;
/** The simulated build time for each row over DEMO_QUICK_ROWS (ms). */
export const DEMO_MS_PER_EXTRA_ROW = 10;
export const DEMO_MAX_BUILD_MS = 30_000;
/** The build time when "Simulate a long export" is on (ms). */
export const DEMO_LONG_BUILD_MS = 8_000;
/** Download links from the simulated server use this scheme; only demoExportApi.openDownload follows them. */
export const DEMO_LINK_SCHEME = 'demo-export://';

/** Data rows in a CSV file's text: lines that have text, less the header (pure). */
export function demoRowCount(file: Pick<CapturedFile, 'content'> | undefined): number {
  if (!file) return 0;
  const lines = file.content.split(/\r?\n/).filter(l => l.trim() !== '').length;
  return Math.max(0, lines - 1);
}

/** How long the simulated server takes to build `rows` rows (pure). */
export function demoBuildMs(rows: number, longBuilds: boolean): number {
  if (longBuilds) return DEMO_LONG_BUILD_MS;
  if (rows <= DEMO_QUICK_ROWS) return 0;
  return Math.min(DEMO_MAX_BUILD_MS, (rows - DEMO_QUICK_ROWS) * DEMO_MS_PER_EXTRA_ROW);
}

export interface DemoExportApiDeps {
  now: () => Date;
  user: () => { userId: string; userName: string };
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  /** Runs a builder and returns the files it would have downloaded (utils/downloadCapture.ts). */
  capture?: typeof captureDownloads;
  /** The real browser download of one file. */
  save?: (file: CapturedFile) => void;
}

export interface DemoExportApi extends IExportApi {
  /** The simulated hub: ExportStatus events as jobs change. */
  subscribe(onEvent: (event: ExportStatusEvent) => void): { unsubscribe(): void };
  /** Follows a link this API issued: saves the kept file(s). False for any other link. */
  openDownload(url: string): boolean;
  longBuilds(): boolean;
  setLongBuilds(on: boolean): void;
  /** Sign-out: forget every job, file and timer. */
  reset(): void;
}

interface Entry { job: ExportJob; files: CapturedFile[]; timer?: unknown }

export function createDemoExportApi(deps: DemoExportApiDeps): DemoExportApi {
  const setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? (h => clearTimeout(h as ReturnType<typeof setTimeout>));
  const capture = deps.capture ?? captureDownloads;
  const save = deps.save ?? saveToDevice;

  const entries = new Map<string, Entry>();
  const listeners = new Set<(event: ExportStatusEvent) => void>();
  let counter = 0;
  let eventCounter = 0;
  let long = false;

  const emit = (job: ExportJob) => {
    const event: ExportStatusEvent = {
      type: 'ExportStatus', v: LIVE_UPDATES_CONTRACT_VERSION, eventId: `demo-event-${++eventCounter}`,
      exportId: job.exportId, status: job.status, title: job.title,
      ...(job.rowCount !== undefined ? { rowCount: job.rowCount } : {}),
    };
    for (const l of [...listeners]) l(event);
  };
  const iso = () => deps.now().toISOString();
  const isOpen = (j: ExportJob) => j.status === 'queued' || j.status === 'running';

  /** A ready file past its expiry is expired when next read. */
  const refresh = (e: Entry): ExportJob => {
    if (e.job.status === 'ready' && e.job.expiresAt && new Date(e.job.expiresAt) <= deps.now()) {
      e.job = { ...e.job, status: 'expired' };
      e.files = [];
    }
    return e.job;
  };
  const mine = (): Entry[] => {
    const me = deps.user().userId;
    return [...entries.values()].filter(e => e.job.requestedBy.userId === me);
  };

  const finish = (e: Entry, rows: number) => {
    const at = iso();
    const bytes = e.files.reduce((n, f) => n + new TextEncoder().encode(f.content).length, 0);
    e.job = { ...e.job, status: 'ready', finishedAt: at, rowCount: rows, expiresAt: exportExpiresAt(at), byteLength: bytes };
    e.timer = undefined;
    emit(e.job);
  };

  return {
    async request(req: ExportRequest, local?: ExportLocalBuild): Promise<ExportApiResult<ExportJob>> {
      if (!(req.kind in EXPORT_KINDS)) return { ok: false, error: { code: 'INVALID_PARAMETERS' } };
      if (!local) return { ok: false, error: { code: 'UNAVAILABLE' } }; // the simulated server can only build what the browser builds
      if (mine().filter(e => isOpen(refresh(e))).length >= EXPORT_LIMITS.maxOpenPerUser) return { ok: false, error: { code: 'TOO_MANY_OPEN' } };

      const { userId, userName } = deps.user();
      const exportId = `demo-export-${++counter}`;
      const requestedAt = iso();
      const base: ExportJob = {
        exportId, kind: req.kind, format: req.format, title: req.title, status: 'queued',
        requestedBy: { userId, userName }, requestedAt,
      };
      const entry: Entry = { job: base, files: [] };
      entries.set(exportId, entry);

      let files: CapturedFile[] = [];
      try {
        files = (await capture(local.build)).files;
      } catch {
        files = [];
      }
      if (files.length === 0) {
        // The builder refused or had nothing to write (it has already told the user why).
        entry.job = { ...base, status: 'failed', finishedAt: iso(), error: { code: 'BUILD_FAILED', message: 'The simulated export server received no file from the builder.' } };
        emit(entry.job);
        return { ok: true, data: entry.job };
      }
      entry.files = files;
      const rows = demoRowCount(files[0]);
      const wait = demoBuildMs(rows, long);
      entry.job = { ...base, status: 'running', startedAt: iso() };
      if (wait <= 0) {
        finish(entry, rows);
      } else {
        emit(entry.job);
        entry.timer = setTimer(() => { if (entry.job.status === 'running') finish(entry, rows); }, wait);
      }
      return { ok: true, data: entry.job };
    },

    async get(exportId) {
      const e = entries.get(exportId);
      if (!e || e.job.requestedBy.userId !== deps.user().userId) return { ok: false, error: { code: 'NOT_FOUND' } };
      return { ok: true, data: refresh(e) };
    },

    async list() {
      return { ok: true, data: mine().map(refresh).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt) || b.exportId.localeCompare(a.exportId)) };
    },

    async downloadLink(exportId) {
      const e = entries.get(exportId);
      if (!e) return { ok: false, error: { code: 'NOT_FOUND' } };
      const job = refresh(e);
      const refusal = downloadRefusal(job, deps.user().userId, deps.now());
      if (refusal === 'notRequester') return { ok: false, error: { code: 'NOT_PERMITTED' } };
      if (refusal === 'expired') return { ok: false, error: { code: 'NOT_FOUND' } };
      if (refusal === 'notReady') return { ok: false, error: { code: 'UNAVAILABLE' } };
      const expiresAt = new Date(deps.now().getTime() + EXPORT_LIMITS.downloadLinkMinutes * 60_000).toISOString();
      return { ok: true, data: { url: `${DEMO_LINK_SCHEME}${encodeURIComponent(exportId)}`, expiresAt, filename: e.files[0]?.filename ?? `${job.title}.csv` } };
    },

    async cancel(exportId) {
      const e = entries.get(exportId);
      if (!e || e.job.requestedBy.userId !== deps.user().userId) return { ok: false, error: { code: 'NOT_FOUND' } };
      const job = refresh(e);
      if (!isOpen(job)) return { ok: false, error: { code: 'NOT_FOUND' } };
      if (e.timer !== undefined) { clearTimer(e.timer); e.timer = undefined; }
      e.files = [];
      e.job = { ...job, status: 'cancelled', finishedAt: iso() };
      emit(e.job);
      return { ok: true, data: e.job };
    },

    subscribe(onEvent) {
      listeners.add(onEvent);
      return { unsubscribe: () => { listeners.delete(onEvent); } };
    },

    openDownload(url) {
      if (!url.startsWith(DEMO_LINK_SCHEME)) return false;
      let id: string;
      try { id = decodeURIComponent(url.slice(DEMO_LINK_SCHEME.length)); } catch { return false; }
      const e = entries.get(id);
      if (!e || e.files.length === 0) return false;
      for (const f of e.files) save(f);
      return true;
    },

    longBuilds: () => long,
    setLongBuilds: on => { long = on; },

    reset() {
      for (const e of entries.values()) if (e.timer !== undefined) clearTimer(e.timer);
      entries.clear();
      long = false;
    },
  };
}
