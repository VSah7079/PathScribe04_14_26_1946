// src/services/serverJobs/serverJobsContract.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 551 (PS-539 phase 2d; readiness review §9 item 10; MESSAGE_BUS_API.md
// §4a): the wire contract for the "Server jobs" view. The API server's message
// bus (MESSAGE_BUS_API.md) runs the work the browser does today: interface
// messages, deliveries, prints, held releases, charges, exports and event
// handlers. When a job fails for good it is dead-lettered. Interface and print
// jobs show where staff already look (Audit Log → Interfaces), with their own
// resend capabilities; the rest show here, with the job kinds' health and the
// recurring jobs. Pure: types, the kinds, and the rules the screen uses.
// ─────────────────────────────────────────────────────────────────────────────

import type { CapabilityKey } from '../authorization/capabilityCatalog';

/** The job kinds (MESSAGE_BUS_API.md §5). `event` stands for every `event:{consumer}` job. */
export const SERVER_JOB_KINDS = [
  'interface.dispatch', 'delivery.attempt', 'print.dispatch', 'report.releaseHeld', 'charge.dispatch', 'export.build', 'event',
] as const;
export type ServerJobKind = typeof SERVER_JOB_KINDS[number];

/** The recurring jobs (MESSAGE_BUS_API.md §5), with how often each runs (minutes; null = its own schedule). */
export const RECURRING_JOBS = {
  'delivery.retrySweep': 0.5,
  'release.dueSweep': 0.25,
  'consult.expireLinks': 5,
  'registry.escalateStale': 60,
  'followUp.dailyAlerts': 1440,
  'supportAccess.expire': 5,
  'cytology.histologyCorrelationSweep': 1440,
  'assist.pollLis': null,
  'print.batchAggregation': null,
  'cytology.roseSlaMonitor': 5,
  'bus.purge': 1440,
  'requisition.ingest': null, // Batch 762: every scheduleMinutes of each requisition source
  'requisition.missingSweep': 60, // Batch 762: cases still missing their requisition; scans with no case
} as const satisfies Record<string, number | null>;
export type RecurringJobName = keyof typeof RECURRING_JOBS;

/**
 * Where a dead-lettered job is resent from, and with which capability (§4).
 * Interface and print jobs keep their own screens and capabilities; the rest
 * are requeued here with `jobs:server-job:requeue`.
 */
export const REQUEUE_ROUTE: Record<ServerJobKind, { screen: 'serverJobs' | 'outboundInterfaces' | 'printQueue'; capability: CapabilityKey }> = {
  'interface.dispatch': { screen: 'outboundInterfaces', capability: 'interface:outbound:resend' },
  'print.dispatch':     { screen: 'printQueue', capability: 'print:job:retry' },
  'delivery.attempt':   { screen: 'serverJobs', capability: 'jobs:server-job:requeue' },
  'report.releaseHeld': { screen: 'serverJobs', capability: 'jobs:server-job:requeue' },
  'charge.dispatch':    { screen: 'serverJobs', capability: 'jobs:server-job:requeue' },
  'export.build':       { screen: 'serverJobs', capability: 'jobs:server-job:requeue' },
  'event':              { screen: 'serverJobs', capability: 'jobs:server-job:requeue' },
};

/** `GET /api/jobs/health`: per kind, no patient data (also /health/bus). */
export interface ServerJobKindHealth {
  /** A `ServerJobKind`; a kind this version doesn't know is shown as sent. */
  kind: ServerJobKind | (string & {});
  ready: number;
  /** Age of the oldest Ready job past its DueAt (seconds); 0 when none. */
  oldestReadyOverdueSeconds: number;
  running: number;
  deadLetters24h: number;
}
export interface RecurringJobHealth {
  name: RecurringJobName | (string & {});
  /** When it last finished a run (ISO 8601); absent if it never has. */
  lastRunAt?: string;
  /** The last run's outcome. */
  lastOutcome?: 'ok' | 'failed';
}
export interface ServerJobsHealth {
  generatedAt: string;
  kinds: ServerJobKindHealth[];
  recurring: RecurringJobHealth[];
}

/** One dead-lettered job, as `GET /api/jobs/dead-letters` lists it (newest first). No patient data. */
export interface DeadLetteredJob {
  jobId: string;
  /** A `ServerJobKind` (the client turns `event:{consumer}` into `event` + `consumer`); an unknown kind is shown as sent. */
  kind: ServerJobKind | (string & {});
  /** The consumer, for an event job (`event:{consumer}`). */
  consumer?: string;
  attempts: number;
  maxAttempts: number;
  enqueuedAt: string;
  deadLetteredAt: string;
  /** A code and short plain English, never patient data (§7). */
  lastError: { code: string; message: string };
  facilityId?: string;
  /** What the job is about, by id only: the case it concerns, if any. */
  caseId?: string;
  correlationId: string;
}

/** `POST /api/jobs/{jobId}/requeue`: Attempts reset, Ready now; audited. */
export interface RequeueResult { jobId: string; requeuedAt: string }

export type ServerJobsErrorCode = 'NOT_PERMITTED' | 'NOT_FOUND' | 'NOT_DEAD_LETTERED' | 'WRONG_SCREEN' | 'UNAVAILABLE' | 'SIGNED_OUT';

/** Whether a recurring job is overdue: its last run is more than three intervals old (the §7 alert). `now` is the
 *  server's time (`ServerJobsHealth.generatedAt`), so a workstation clock that is off doesn't matter. Pure. */
export function recurringJobOverdue(job: RecurringJobHealth, now: Date): boolean {
  const every = (RECURRING_JOBS as Record<string, number | null | undefined>)[job.name];
  if (every === null || every === undefined) return false; // its own schedule (per site, per batch), or unknown: the server alerts on it
  if (!job.lastRunAt) return !(OPTIONAL_RECURRING_JOBS as readonly string[]).includes(job.name);
  return now.getTime() - new Date(job.lastRunAt).getTime() > 3 * every * 60_000;
}

/** Whether a kind needs attention: work waiting more than 5 minutes past due, or a dead letter today (§7). Pure. */
export function kindNeedsAttention(h: Pick<ServerJobKindHealth, 'oldestReadyOverdueSeconds' | 'deadLetters24h'>): boolean {
  return h.oldestReadyOverdueSeconds > 300 || h.deadLetters24h > 0;
}

/** The route for a kind the server sends, or null for a kind this version doesn't know (shown, with no action). Pure. */
export function requeueRouteFor(kind: string): typeof REQUEUE_ROUTE[ServerJobKind] | null {
  return (SERVER_JOB_KINDS as readonly string[]).includes(kind) ? REQUEUE_ROUTE[kind as ServerJobKind] : null;
}

/** `event:{consumer}` is shown as an event job with its consumer (§5); other kinds as sent. Pure. */
export function normaliseJobKind(kind: string): { kind: string; consumer?: string } {
  return kind.startsWith('event:') ? { kind: 'event', consumer: kind.slice('event:'.length) } : { kind };
}

/** Recurring jobs a site may switch off (§5 "optional"): never having run is not overdue. */
export const OPTIONAL_RECURRING_JOBS: readonly RecurringJobName[] = ['cytology.roseSlaMonitor'];

/** The capability context of a dead-lettered job: its facility and case, or every facility when it names neither. Pure. */
export function deadLetterContext(job: Pick<DeadLetteredJob, 'facilityId' | 'caseId'>): { facilityId?: string | null; caseId?: string; allFacilities?: boolean } {
  if (!job.facilityId && !job.caseId) return { allFacilities: true };
  return { facilityId: job.facilityId ?? null, ...(job.caseId ? { caseId: job.caseId } : {}) };
}

/** Whether the screen has a label for this kind or recurring job (anything else is shown as the server named it). Pure. */
export const isKnownJobKind = (kind: string): kind is ServerJobKind => (SERVER_JOB_KINDS as readonly string[]).includes(kind);
export const isKnownRecurringJob = (name: string): name is RecurringJobName => Object.prototype.hasOwnProperty.call(RECURRING_JOBS, name);
