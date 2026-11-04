// src/services/errorReporting/monitoringConfig.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 590 (PS-469): whether, and where, scrubbed crash reports go to an
// external monitoring service (Sentry or a self-hosted Sentry-compatible
// collector). Pure.
//
// Off unless the deployment's config.json sets BOTH a DSN and an environment
// name (VITE_ERROR_MONITORING_DSN, VITE_ERROR_MONITORING_ENV). A missing,
// unreadable or invalid setting means monitoring is simply not started, and
// there is no default environment label such as "production" (fail closed).
// A hospital turns monitoring off by leaving the DSN out, or sends it to its
// own collector by putting that collector's DSN in. The DSN is a public key and
// is safe in config.json; nothing secret goes there.
// ─────────────────────────────────────────────────────────────────────────────

import { monitoringDsnProblem } from '../runtimeConfig/runtimeSettings';

export interface MonitoringConfig {
  dsn: string;
  environment: string;
  release?: string;
}

/** https only (plain http only to this computer), a public key, no password, and a project in the path. Same rule as config.json's check. */
export function isValidMonitoringDsn(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 500 && monitoringDsnProblem(value.trim(), true) === null;
}

/** A short deployment name such as "hospital-a-prod" or "validation". */
export function isValidMonitoringEnvironment(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/.test(value.trim());
}

/** The monitoring settings, or null when monitoring is not configured (or configured wrongly). */
export function resolveMonitoringConfig(
  dsn: string | undefined, environment: string | undefined, release?: string,
): MonitoringConfig | null {
  const d = (dsn ?? '').trim();
  const e = (environment ?? '').trim();
  if (!isValidMonitoringDsn(d) || !isValidMonitoringEnvironment(e)) return null;
  const r = (release ?? '').trim();
  return { dsn: d, environment: e, ...(r && /^[A-Za-z0-9._+-]{1,60}$/.test(r) ? { release: r } : {}) };
}
