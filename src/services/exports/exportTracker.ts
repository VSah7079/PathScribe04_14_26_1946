// src/services/exports/exportTracker.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 550 (PS-539 phase 2d, decision D7; ASYNC_EXPORT_API.md §5 and §7):
// the browser's one export service. Every export button calls `run` with its
// kind, a title, the screen's filters and the facility it is checked for,
// plus the way the browser builds the file today.
//
//   - No API server (the demo): the browser builds the file, exactly as
//     before (`buildInBrowser`).
//   - With the API server: the request is posted. A quick export (ready
//     within 3 s) downloads straight away, with no extra click. A longer one
//     shows a "preparing" notice and the user carries on; when the hub says
//     it is ready (ExportStatus) the notice offers Download. A refusal or a
//     failure says why, in the user's language.
//
// The notices are a small store the notice component reads
// (components/Exports/ExportNotices.tsx). Everything is passed in, so it is
// testable without a server.
// ─────────────────────────────────────────────────────────────────────────────
import { EXPORT_LIMITS, type ExportJob, type ExportKind, type ExportStatusEvent } from './asyncExportContract';
import type { ExportApiErrorCode, IExportApi } from './httpExportApi';

/** Why a notice shows a problem: the server's codes, or the export ran out or was cancelled. */
export type ExportProblem = ExportApiErrorCode | 'EXPIRED' | 'CANCELLED';

export interface ExportNotice {
  exportId: string;
  title: string;
  state: 'preparing' | 'ready' | 'failed';
  rowCount?: number;
  problem?: ExportProblem;
  /** With TOO_MANY_ROWS: how many rows matched. */
  matchedRows?: number;
}

export interface RunExportInput {
  kind: ExportKind;
  /** The file name the user sees, without date or extension (exportTitleFromFilename). */
  title: string;
  /** The screen's filters, as that screen's own API takes them. No patient names. */
  parameters: Record<string, unknown>;
  /** One facility or 'all', for a facility-scoped kind (exportFacilityId). */
  facilityId?: string;
  /** How the browser builds the file today; used when there is no API server. */
  buildInBrowser: () => Promise<unknown> | unknown;
}

export type RunExportOutcome =
  | { via: 'browser' }
  | { via: 'server'; result: 'downloaded'; exportId: string }
  | { via: 'server'; result: 'preparing'; exportId: string }
  | { via: 'server'; result: 'refused' | 'failed'; problem: ExportProblem; exportId?: string };

/** True when the export went to the API server (its notice reports the outcome). */
export function isServerOutcome(outcome: unknown): outcome is Extract<RunExportOutcome, { via: 'server' }> {
  return !!outcome && typeof outcome === 'object' && (outcome as { via?: unknown }).via === 'server';
}

export type DownloadOutcome = { ok: true } | { ok: false; problem: ExportProblem };

export interface ExportTracker {
  /** True when exports go through the API server; false in the demo. */
  readonly viaServer: boolean;
  run(input: RunExportInput): Promise<RunExportOutcome>;
  /** Fetches a fresh download link and starts the download (the capability is checked again by the server). */
  download(exportId: string): Promise<DownloadOutcome>;
  cancel(exportId: string): Promise<DownloadOutcome>;
  /** The requester's exports, newest first ("My exports"). */
  list(): Promise<{ ok: true; data: ExportJob[] } | { ok: false; problem: ExportProblem }>;
  dismiss(exportId: string): void;
  /** Batch 550: the session ended. Forget every notice and stop waiting, so the next user sees none of them. */
  reset(): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): readonly ExportNotice[];
}

export interface ExportTrackerDeps {
  /** The API server's export endpoints, or null with no API server (the demo). */
  api: IExportApi | null;
  /** ExportStatus events for the signed-in user (liveUpdateService.subscribeExports). */
  subscribeStatus: (onEvent: (event: ExportStatusEvent) => void) => { unsubscribe(): void };
  /** Starts the browser's download of a signed link; false when the link isn't one it may follow. */
  openDownload: (url: string, filename: string) => boolean;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

/** How often the browser asks while it waits the first 3 s. */
export const INLINE_POLL_MS = 500;
/** How often a preparing export is re-read in case a hub message was missed (or there is no hub). */
export const PREPARING_POLL_MS = 15_000;
/** After this long without an answer, the "preparing" notice shows, so a click never looks ignored (the file still
 *  downloads by itself if it is ready within 3 s). */
export const SHOW_PREPARING_AFTER_MS = 1_000;

/** A notice never goes back: once ready or failed, a late "still running" answer is ignored (pure). */
export function noticeMayChange(from: ExportNotice['state'] | undefined, to: ExportNotice['state']): boolean {
  return !(to === 'preparing' && (from === 'ready' || from === 'failed'));
}

/** The same request while the first is still being made (a double click) is not sent twice. */
export function exportRequestKey(input: Pick<RunExportInput, 'kind' | 'parameters' | 'facilityId'>): string {
  return JSON.stringify([input.kind, input.facilityId ?? '', input.parameters]);
}

/** The notice for a job's status (pure): ready, failed, gone (null) or still preparing. */
export function noticeForJob(job: Pick<ExportJob, 'exportId' | 'title' | 'status' | 'rowCount' | 'error'>): ExportNotice | null {
  switch (job.status) {
    case 'ready': return { exportId: job.exportId, title: job.title, state: 'ready', ...(job.rowCount !== undefined ? { rowCount: job.rowCount } : {}) };
    case 'failed': return { exportId: job.exportId, title: job.title, state: 'failed', problem: job.error?.code ?? 'BUILD_FAILED' };
    case 'expired': return { exportId: job.exportId, title: job.title, state: 'failed', problem: 'EXPIRED' };
    case 'cancelled': return null;
    default: return { exportId: job.exportId, title: job.title, state: 'preparing' };
  }
}

export function createExportTracker(deps: ExportTrackerDeps): ExportTracker {
  const now = deps.now ?? (() => Date.now());
  const sleep = deps.sleep ?? (ms => new Promise<void>(r => setTimeout(r, ms)));
  const setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? (h => clearTimeout(h as ReturnType<typeof setTimeout>));
  const api = deps.api;

  let notices: readonly ExportNotice[] = [];
  const listeners = new Set<() => void>();
  let subscription: { unsubscribe(): void } | null = null;
  let pollTimer: unknown = null;
  /** Exports this window asked for and is still waiting on in the first 3 s. */
  const waitingInline = new Map<string, ExportJob>();
  /** Requests being made now, by exportRequestKey (a double click joins the first). */
  const inFlight = new Map<string, Promise<RunExportOutcome>>();
  /** Bumped by reset(): anything started before it stops quietly. */
  let generation = 0;
  let refusedCount = 0;

  const emit = () => { for (const l of [...listeners]) l(); };
  const setNotices = (next: readonly ExportNotice[]) => { notices = next; emit(); syncWatching(); };
  const upsert = (n: ExportNotice) => {
    const current = notices.find(x => x.exportId === n.exportId);
    if (!noticeMayChange(current?.state, n.state)) return;
    setNotices([...notices.filter(x => x.exportId !== n.exportId), n]);
  };
  const remove = (exportId: string) => { if (notices.some(n => n.exportId === exportId)) setNotices(notices.filter(n => n.exportId !== exportId)); };
  const tracked = (exportId: string) => waitingInline.has(exportId) || notices.some(n => n.exportId === exportId);

  const apply = (job: Pick<ExportJob, 'exportId' | 'title' | 'status' | 'rowCount' | 'error'>) => {
    if (waitingInline.has(job.exportId)) { waitingInline.set(job.exportId, { ...waitingInline.get(job.exportId)!, ...job }); return; }
    if (!notices.some(n => n.exportId === job.exportId)) return; // asked for in another window: "My exports" shows it
    const n = noticeForJob(job);
    if (n) upsert(n); else remove(job.exportId);
  };

  const onEvent = (event: ExportStatusEvent) => {
    if (!tracked(event.exportId)) return;
    if (event.status === 'failed' && api) {
      // The event carries no reason; read the job for it.
      const gen = generation;
      void api.get(event.exportId).then(res => { if (gen === generation) apply(res.ok ? res.data : { exportId: event.exportId, title: event.title, status: 'failed' }); });
      return;
    }
    apply({ exportId: event.exportId, title: event.title, status: event.status, ...(event.rowCount !== undefined ? { rowCount: event.rowCount } : {}) });
  };

  const pollPreparing = async () => {
    pollTimer = null;
    if (!api) return;
    const gen = generation;
    for (const n of notices.filter(x => x.state === 'preparing' && !waitingInline.has(x.exportId))) {
      const res = await api.get(n.exportId);
      if (gen !== generation) return;
      if (res.ok) apply(res.data);
      else if (res.error.code === 'NOT_FOUND' || res.error.code === 'NOT_PERMITTED' || res.error.code === 'SIGNED_OUT') remove(n.exportId);
    }
    syncWatching();
  };

  /** Listens to the hub and re-reads now and then while anything is preparing or waiting. */
  function syncWatching() {
    const watching = waitingInline.size > 0 || notices.some(n => n.state === 'preparing');
    if (watching && !subscription) subscription = deps.subscribeStatus(onEvent);
    if (!watching && subscription) { subscription.unsubscribe(); subscription = null; }
    const preparing = notices.some(n => n.state === 'preparing');
    if (preparing && !pollTimer) pollTimer = setTimer(() => { void pollPreparing(); }, PREPARING_POLL_MS);
    if (!preparing && pollTimer) { clearTimer(pollTimer); pollTimer = null; }
  }

  const download = async (exportId: string): Promise<DownloadOutcome> => {
    if (!api) return { ok: false, problem: 'UNAVAILABLE' };
    const gen = generation;
    const link = await api.downloadLink(exportId);
    if (gen !== generation) return { ok: false, problem: 'SIGNED_OUT' };
    const fail = (problem: ExportProblem): DownloadOutcome => {
      const existing = notices.find(n => n.exportId === exportId);
      if (existing) setNotices([...notices.filter(x => x.exportId !== exportId), { ...existing, state: 'failed', problem }]);
      return { ok: false, problem };
    };
    if (link.ok === false) return fail(link.error.code === 'NOT_FOUND' ? 'EXPIRED' : link.error.code);
    if (!deps.openDownload(link.data.url, link.data.filename)) return fail('UNAVAILABLE');
    remove(exportId);
    return { ok: true };
  };

  /** Waits up to `ms` for `p`; undefined if it took longer (so the first 3 s stay 3 s on a slow network). */
  const within = <T,>(p: Promise<T>, ms: number): Promise<T | undefined> => new Promise(resolve => {
    let done = false;
    const timer = setTimer(() => { if (!done) { done = true; resolve(undefined); } }, Math.max(0, ms));
    p.then(v => { if (!done) { done = true; clearTimer(timer); resolve(v); } }, () => { if (!done) { done = true; clearTimer(timer); resolve(undefined); } });
  });

  const runOnServer = async (input: RunExportInput, server: IExportApi): Promise<RunExportOutcome> => {
    const gen = generation;
    const req = await server.request({
      kind: input.kind, format: 'csv', parameters: input.parameters, title: input.title,
      ...(input.facilityId ? { facilityId: input.facilityId } : {}),
    });
    if (gen !== generation) return { via: 'server', result: 'failed', problem: 'SIGNED_OUT' };
    if (req.ok === false) {
      const problem = req.error.code;
      upsert({ exportId: `refused-${++refusedCount}`, title: input.title, state: 'failed', problem, ...(req.error.matchedRows !== undefined ? { matchedRows: req.error.matchedRows } : {}) });
      return { via: 'server', result: 'refused', problem };
    }
    const exportId = req.data.exportId;
    waitingInline.set(exportId, req.data);
    syncWatching();
    const start = now();
    let job = req.data;
    let shown = false;
    const settled = () => job.status === 'ready' || job.status === 'failed' || job.status === 'cancelled';
    while (!settled() && now() - start < EXPORT_LIMITS.inlineWaitMs) {
      await sleep(INLINE_POLL_MS);
      if (gen !== generation) return { via: 'server', result: 'failed', problem: 'SIGNED_OUT', exportId };
      if (!shown && now() - start >= SHOW_PREPARING_AFTER_MS) { shown = true; upsert({ exportId, title: job.title, state: 'preparing' }); }
      job = waitingInline.get(exportId) ?? job;
      if (settled()) break;
      const res = await within(server.get(exportId), EXPORT_LIMITS.inlineWaitMs - (now() - start));
      if (gen !== generation) return { via: 'server', result: 'failed', problem: 'SIGNED_OUT', exportId };
      if (res?.ok) job = res.data;
    }
    waitingInline.delete(exportId);
    if (job.status === 'ready') {
      if (!notices.some(n => n.exportId === exportId)) upsert({ exportId, title: job.title, state: 'preparing' });
      const d = await download(exportId);
      syncWatching();
      return d.ok ? { via: 'server', result: 'downloaded', exportId } : { via: 'server', result: 'failed', problem: d.problem, exportId };
    }
    const n = noticeForJob(job);
    if (!n) { remove(exportId); syncWatching(); return { via: 'server', result: 'failed', problem: 'CANCELLED', exportId }; }
    upsert(n);
    if (n.state === 'failed') return { via: 'server', result: 'failed', problem: n.problem ?? 'BUILD_FAILED', exportId };
    return { via: 'server', result: 'preparing', exportId };
  };

  return {
    viaServer: api !== null,

    async run(input) {
      if (!api) {
        await input.buildInBrowser();
        return { via: 'browser' };
      }
      const key = exportRequestKey(input);
      const pending = inFlight.get(key);
      if (pending) return pending;
      const p = runOnServer(input, api).finally(() => { inFlight.delete(key); });
      inFlight.set(key, p);
      return p;
    },

    download,

    async cancel(exportId) {
      if (!api) return { ok: false, problem: 'UNAVAILABLE' };
      const res = await api.cancel(exportId);
      if (res.ok === false) return { ok: false, problem: res.error.code };
      remove(exportId);
      return { ok: true };
    },

    async list() {
      if (!api) return { ok: true, data: [] };
      const res = await api.list();
      return res.ok ? { ok: true, data: res.data } : { ok: false, problem: res.error.code };
    },

    dismiss: remove,

    reset() {
      generation++;
      waitingInline.clear();
      inFlight.clear();
      if (pollTimer) { clearTimer(pollTimer); pollTimer = null; }
      if (subscription) { subscription.unsubscribe(); subscription = null; }
      if (notices.length) { notices = []; emit(); }
    },

    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => notices,
  };
}

/** The message key for a notice (pure): what the notice says, in the user's language. */
export function exportNoticeMessage(n: Pick<ExportNotice, 'state' | 'problem' | 'rowCount' | 'matchedRows'>): { key: string; values?: Record<string, unknown> } {
  if (n.state === 'preparing') return { key: 'exports.notice.preparing' };
  if (n.state === 'ready') return n.rowCount !== undefined ? { key: 'exports.notice.readyRows', values: { count: n.rowCount } } : { key: 'exports.notice.ready' };
  const problem = n.problem ?? 'BUILD_FAILED';
  if (problem === 'TOO_MANY_ROWS' && n.matchedRows !== undefined) return { key: 'exports.problem.TOO_MANY_ROWS_count', values: { count: n.matchedRows } };
  return { key: exportProblemKey(problem) };
}

/** Every problem a notice can show (for the locale files and their test). */
export const EXPORT_PROBLEMS: readonly ExportProblem[] = [
  'NOT_PERMITTED', 'TOO_MANY_ROWS', 'TOO_MANY_OPEN', 'INVALID_PARAMETERS', 'TIMED_OUT', 'BUILD_FAILED', 'NOT_FOUND', 'UNAVAILABLE', 'SIGNED_OUT', 'EXPIRED', 'CANCELLED',
];

/** The message key for a problem from the server, falling back for a code this version doesn't know (pure). */
export function exportProblemKey(code: string | undefined): string {
  return `exports.problem.${code && (EXPORT_PROBLEMS as readonly string[]).includes(code) ? code : 'BUILD_FAILED'}`;
}

/** How many notices offer a download (pure; the top bar's badge). */
export function readyExportCount(notices: readonly Pick<ExportNotice, 'state'>[]): number {
  return notices.filter(n => n.state === 'ready').length;
}
