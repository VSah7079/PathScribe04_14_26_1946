// src/services/errorReporting/errorMonitoring.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 590 (PS-469): the external monitoring sink the app's reporter holds.
// It does nothing until startErrorMonitoring() finds a valid configuration, and
// then loads the Sentry SDK (a separate chunk) so a deployment without
// monitoring never downloads it. Reports that arrive while the SDK is loading
// are held (at most 25) and sent when it is ready.
// ─────────────────────────────────────────────────────────────────────────────

import type { ClientErrorReport, ClientErrorSink } from './clientErrorReporter';
import { resolveMonitoringConfig } from './monitoringConfig';
import { createSentrySink, type SentrySdk } from './sentrySink';

let target: ClientErrorSink | null = null;
let starting = false;
let held: ClientErrorReport[] = [];

/** The sink added to the reporter's list. */
export const monitoringSink: ClientErrorSink = report => {
  if (target) return target(report);
  if (starting && held.length < 25) held.push(report);
};

export interface StartMonitoringDeps {
  dsn: string | undefined;
  environment: string | undefined;
  release?: string;
  /** Loads the SDK; the app passes a dynamic import. */
  loadSdk: () => Promise<SentrySdk>;
}

/** Starts monitoring if configured. Resolves true when started; never throws. */
export async function startErrorMonitoring(deps: StartMonitoringDeps): Promise<boolean> {
  const cfg = resolveMonitoringConfig(deps.dsn, deps.environment, deps.release);
  if (!cfg || target || starting) return false;
  starting = true;
  try {
    const sdk = await deps.loadSdk();
    target = createSentrySink(cfg, sdk);
    const pending = held;
    held = [];
    for (const r of pending) { try { void target(r); } catch { /* never breaks the app */ } }
    return true;
  } catch {
    held = [];
    return false;
  } finally {
    starting = false;
  }
}

/** For tests. */
export function resetErrorMonitoringForTests(): void {
  target = null; starting = false; held = [];
}
