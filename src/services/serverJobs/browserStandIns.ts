// src/services/serverJobs/browserStandIns.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 555 (PS-539 phase 2d; readiness review §7 and §9 item 3): the server
// jobs the browser stands in for today (delivery retries, release-delay
// releases, consult-link expiry, the registry 72-hour escalation, follow-up
// alerts, support-access expiry, the cytology–histology correlation sweep).
//
// Each becomes one of the API server's recurring jobs (MESSAGE_BUS_API.md §5)
// in phase 2e, domain by domain, once the job and its data are on the server.
// So the browser stops a stand-in only for the jobs the deployment says its
// server runs: config.json's `VITE_SERVER_JOBS`, a comma-separated list of
// recurring job names (RUNTIME_CONFIG.md). Then two runners never send a
// delivery, an alert or an escalation twice, and a job is never left with no
// runner. With no API server (the demo), or a job not listed, the browser runs
// it while someone is signed in, as before.
//
// Each stand-in calls `browserRunsServerJob('<job>')` where it starts; the
// guard test (browserStandIns.guard.test.ts) checks every one listed does.
// ─────────────────────────────────────────────────────────────────────────────
import { apiServerUrl } from '../apiServer/apiServerUrl';
import { appEnv } from '../runtimeConfig/runtimeEnv';
import { RECURRING_JOBS, type RecurringJobName } from './serverJobsContract';

export interface BrowserStandIn {
  /** The server's recurring job that replaces it (MESSAGE_BUS_API.md §5). */
  serverJob: RecurringJobName;
  /** Where the browser runs it, from `src/` (the guard checks this file calls `browserRunsServerJob('<serverJob>')`). */
  file: string;
  /** When the browser runs it. */
  trigger: 'timer' | 'onRead' | 'onLoad';
}

export const BROWSER_STAND_INS: readonly BrowserStandIn[] = [
  { serverJob: 'delivery.retrySweep', file: 'hooks/useDeliveryBackgroundWork.ts', trigger: 'timer' },
  { serverJob: 'release.dueSweep', file: 'hooks/useReleaseBackgroundWork.ts', trigger: 'timer' },
  { serverJob: 'release.dueSweep', file: 'services/reportRelease/releaseCountdown.ts', trigger: 'timer' },
  { serverJob: 'consult.expireLinks', file: 'services/consultAccess/mockConsultTokenService.ts', trigger: 'onRead' },
  { serverJob: 'registry.escalateStale', file: 'services/registrySubmission/registryExceptionsService.ts', trigger: 'onRead' },
  { serverJob: 'followUp.dailyAlerts', file: 'services/followUp/followUpLive.ts', trigger: 'onLoad' },
  { serverJob: 'supportAccess.expire', file: 'services/supportAccess/defaultSupportAccessService.ts', trigger: 'onRead' },
  { serverJob: 'cytology.histologyCorrelationSweep', file: 'services/cytology/cytologyHistologyCorrelationLive.ts', trigger: 'onLoad' },
];

/** The recurring jobs a `VITE_SERVER_JOBS` value names; unknown names are returned apart, to be reported (pure). */
export function parseServerJobs(value: unknown): { jobs: Set<RecurringJobName>; unknown: string[] } {
  const jobs = new Set<RecurringJobName>();
  const unknown: string[] = [];
  if (typeof value !== 'string') return { jobs, unknown };
  for (const raw of value.split(',')) {
    const name = raw.trim();
    if (!name) continue;
    if (Object.prototype.hasOwnProperty.call(RECURRING_JOBS, name)) jobs.add(name as RecurringJobName); else unknown.push(name);
  }
  return { jobs, unknown };
}

/** Whether the browser runs a job: always without an API server; with one, unless the server runs it (pure). */
export function runsInBrowser(job: RecurringJobName, apiServer: string | null, serverJobs: ReadonlySet<RecurringJobName>): boolean {
  return !apiServer || !serverJobs.has(job);
}

let cached: { apiServer: string | null; serverJobs: Set<RecurringJobName> } | null = null;

const settings = () => {
  if (!cached) {
    const apiServer = apiServerUrl('server jobs');
    const { jobs, unknown } = parseServerJobs(appEnv().VITE_SERVER_JOBS);
    if (unknown.length) console.error(`[server jobs] VITE_SERVER_JOBS names jobs this version doesn't know: ${unknown.join(', ')}. The browser keeps running those.`);
    cached = { apiServer, serverJobs: jobs };
  }
  return cached;
};

/** Whether this browser runs a server job. Read once: the deployment's settings don't change while the app runs. */
export function browserRunsServerJob(job: RecurringJobName): boolean {
  const s = settings();
  return runsInBrowser(job, s.apiServer, s.serverJobs);
}

/** Tests only: forget the cached settings. */
export function resetBrowserStandIns(): void {
  cached = null;
}
