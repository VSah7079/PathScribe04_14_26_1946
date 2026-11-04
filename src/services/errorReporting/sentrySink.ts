// src/services/errorReporting/sentrySink.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 590 (PS-469): Sentry as one more sink of the app's own crash reporter.
//
// Sentry never sees an error directly. The reporter has already scrubbed each
// report (scrubClientError.ts, Batch 502) and de-duplicated it; this sink then
// checks the report once more and sends only a report with the expected scrubbed
// shape. Anything else is dropped (fail closed). Sentry's own collectors stay
// off: no default integrations (so no global handlers, breadcrumbs or request
// data), no tracing, no session replay, no personal data, and beforeSend
// removes request, user, extra and breadcrumbs again and drops the event if
// anything throws.
//
// The SDK is passed in, so a test can use a stand-in and nothing leaves the
// test; the app loads the real one only when monitoring is configured.
// ─────────────────────────────────────────────────────────────────────────────

import type { ClientErrorReport, ClientErrorSink } from './clientErrorReporter';
import type { MonitoringConfig } from './monitoringConfig';

/** The part of the Sentry SDK this sink uses. */
export interface SentrySdk {
  init(options: Record<string, unknown>): unknown;
  captureException(error: unknown, hint?: { tags?: Record<string, string> }): unknown;
}

const MAX_MESSAGE = 300;
const MAX_FRAMES = 10;
const NAME = /^[A-Za-z]{1,40}$/;
const REFERENCE = /^ERR-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
const SOURCES = new Set(['render', 'window-error', 'unhandled-rejection']);
const BOUNDARY = /^[a-z0-9:_-]{1,60}$/i;

/** A route as the scrubber leaves it: path segments only, any segment with a digit or over 24 characters already ":id". */
function isScrubbedRoute(route: unknown): route is string {
  if (typeof route !== 'string' || route.length > 200 || !route.startsWith('/')) return false;
  if (/[?#\s]/.test(route)) return false;
  return route.split('/').every(seg => seg === ':id' || (!/\d/.test(seg) && seg.length <= 24));
}

/** Frames hold function and bundle location only: no query string, no whitespace-separated free text beyond "at fn (file:line:col)". */
function isScrubbedFrame(frame: unknown): frame is string {
  return typeof frame === 'string' && frame.length <= 300 && !/[?#]/.test(frame) && /:\d+:\d+\)?$/.test(frame);
}

/** True only for a report with the shape scrubClientError produces. */
export function isSendableReport(r: unknown): r is ClientErrorReport {
  if (!r || typeof r !== 'object') return false;
  const x = r as Record<string, unknown>;
  return typeof x.name === 'string' && NAME.test(x.name)
    && typeof x.message === 'string' && x.message.length <= MAX_MESSAGE && !/[\n\r]/.test(x.message)
    && !/@[^\s@]+\.[^\s@]+/.test(x.message) && !/\d{3,}/.test(x.message)
    && Array.isArray(x.stack) && x.stack.length <= MAX_FRAMES && x.stack.every(isScrubbedFrame)
    && isScrubbedRoute(x.route)
    && typeof x.reference === 'string' && REFERENCE.test(x.reference)
    && typeof x.source === 'string' && SOURCES.has(x.source)
    && (x.boundary === undefined || (typeof x.boundary === 'string' && BOUNDARY.test(x.boundary)));
}

/** Removes everything Sentry could add on its own; null (drop) if anything goes wrong. */
export function sentryBeforeSend<T extends Record<string, unknown>>(event: T): T | null {
  try {
    const e = event as Record<string, unknown>;
    delete e.request;
    delete e.user;
    delete e.extra;
    delete e.contexts;
    delete e.server_name;
    e.breadcrumbs = [];
    return event;
  } catch {
    return null;
  }
}

export function createSentrySink(cfg: MonitoringConfig, sdk: SentrySdk): ClientErrorSink {
  sdk.init({
    dsn: cfg.dsn,
    environment: cfg.environment,
    ...(cfg.release ? { release: cfg.release } : {}),
    defaultIntegrations: false,   // no global handlers, breadcrumbs or request data
    integrations: [],
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeBreadcrumb: () => null,
    beforeSend: sentryBeforeSend,
  });
  return (report: ClientErrorReport) => {
    if (!isSendableReport(report)) return;   // fail closed
    const err = new Error(report.message);
    err.name = report.name;
    err.stack = [`${report.name}: ${report.message}`, ...report.stack].join('\n');
    sdk.captureException(err, {
      tags: { source: report.source, boundary: report.boundary ?? 'none', route: report.route, reference: report.reference },
    });
  };
}
