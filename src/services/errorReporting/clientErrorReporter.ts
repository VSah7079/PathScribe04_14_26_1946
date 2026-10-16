// src/services/errorReporting/clientErrorReporter.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 502 (PS-472): where a browser crash goes. Every report is scrubbed
// first (scrubClientError.ts) and given a short reference the recovery
// screen shows, so support can find it.
//
// Destination today: the browser console and PathScribe's own Error Log
// (Audit Log → Error Log, auditService.logError). An external monitoring
// service (Sentry, App Insights…) waits on PS-469: the provider, the
// patient-data agreement and whether a hospital can switch it off or route
// it to its own collector. `sinks` is where that one is added.
//
// Flood control: the same scrubbed error is reported once a minute at most,
// and at most 25 reports per page load, so an error in a render loop or a
// rejected promise in a timer can't fill the log.
// ─────────────────────────────────────────────────────────────────────────────

import { scrubClientError, type ScrubbedClientError } from './scrubClientError';

export type ClientErrorSource = 'render' | 'window-error' | 'unhandled-rejection';

export interface ClientErrorReport extends ScrubbedClientError {
  reference: string;
  source: ClientErrorSource;
  /** Which boundary caught it ('app', 'route', 'panel:organ-map'…); none for the global handlers. */
  boundary?: string;
  at: string;
}

export interface ClientErrorSink { (report: ClientErrorReport): void | Promise<unknown> }

export interface ClientErrorReporterDeps {
  sinks: ClientErrorSink[];
  now: () => number;
  pathname: () => string;
  newReference: () => string;
}

const DEDUPE_MS = 60_000;
const MAX_PER_LOAD = 25;
const RENDER_SHADOW_MS = 5_000;

export function createClientErrorReporter(deps: ClientErrorReporterDeps) {
  const lastSeen = new Map<string, number>();
  // The same error object reported twice (React in development re-throws an
  // error a boundary caught to the window) is reported once.
  const seenErrors = new WeakSet<object>();
  const renderSeen = new Map<string, number>();
  let count = 0;
  return {
    /** Reports a crash (scrubbed) and returns its reference, or null when held back by flood control. */
    report(error: unknown, source: ClientErrorSource, boundary?: string): string | null {
      if (error && typeof error === 'object') {
        if (seenErrors.has(error)) return null;
        seenErrors.add(error);
      }
      const scrubbed = scrubClientError(error, deps.pathname());
      const key = `${source}|${boundary ?? ''}|${scrubbed.name}|${scrubbed.message}|${scrubbed.route}`;
      const what = `${scrubbed.name}|${scrubbed.message}|${scrubbed.route}`;
      const now = deps.now();
      // A boundary already reported this crash (React in development re-throws a
      // caught render error to the window, as a new error object on the retry).
      if (source !== 'render') {
        const caught = renderSeen.get(what);
        if (caught !== undefined && now - caught < RENDER_SHADOW_MS) return null;
      } else {
        renderSeen.set(what, now);
      }
      const prev = lastSeen.get(key);
      if (prev !== undefined && now - prev < DEDUPE_MS) return null;
      if (count >= MAX_PER_LOAD) return null;
      lastSeen.set(key, now);
      count += 1;
      const report: ClientErrorReport = { ...scrubbed, reference: deps.newReference(), source, ...(boundary ? { boundary } : {}), at: new Date(now).toISOString() };
      for (const sink of deps.sinks) {
        try { void Promise.resolve(sink(report)).catch(() => {}); } catch { /* a failing sink never breaks the app */ }
      }
      return report.reference;
    },
  };
}

export type ClientErrorReporter = ReturnType<typeof createClientErrorReporter>;

/** A short reference a user can read out to support (no patient data in it). */
export function newErrorReference(random: () => number = Math.random): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += alphabet[Math.floor(random() * alphabet.length)];
  return `ERR-${s.slice(0, 4)}-${s.slice(4)}`;
}

/** The Error Log entry for a report (Audit Log → Error Log). English: a compliance record. */
export function errorLogEntryFor(r: ClientErrorReport) {
  return {
    severity: 'error' as const,
    code: r.source === 'render' ? 'CLIENT_RENDER_ERROR' : r.source === 'window-error' ? 'CLIENT_UNCAUGHT_ERROR' : 'CLIENT_UNHANDLED_REJECTION',
    message: `[${r.reference}] ${r.name}: ${r.message}`,
    source: `browser${r.boundary ? `:${r.boundary}` : ''} ${r.route}`,
    caseId: null,
  };
}

/**
 * Global handlers for errors no boundary sees (event handlers, timers, promises).
 * Returns a function that removes them.
 */
export function installGlobalErrorHandlers(win: Pick<Window, 'addEventListener' | 'removeEventListener'>, reporter: ClientErrorReporter): () => void {
  // Deferred a moment, so a boundary that catches the same render error reports it first.
  const later = (f: () => void) => { setTimeout(f, 0); };
  const onError = (e: ErrorEvent) => { const err = e.error ?? e.message; later(() => reporter.report(err, 'window-error')); };
  const onRejection = (e: PromiseRejectionEvent) => { const reason = e.reason; later(() => reporter.report(reason, 'unhandled-rejection')); };
  win.addEventListener('error', onError as EventListener);
  win.addEventListener('unhandledrejection', onRejection as EventListener);
  return () => {
    win.removeEventListener('error', onError as EventListener);
    win.removeEventListener('unhandledrejection', onRejection as EventListener);
  };
}
