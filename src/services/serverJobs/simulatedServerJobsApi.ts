// src/services/serverJobs/simulatedServerJobsApi.ts
// ─────────────────────────────────────────────────
// Batch 605: with no API server (the demo) there is no job queue. This keeps a
// small set of sample dead-lettered jobs in the browser, derives the health
// view from them, and lets a person requeue one (it leaves the list and an
// audit entry is written). Labelled Simulated by the screen. With an API
// server this is not used.
// ─────────────────────────────────────────────────
import { storageGet, storageSet } from '../mockStorage';
import { mockAuditService } from '../auditlog/mockAuditService';
import { RECURRING_JOBS, SERVER_JOB_KINDS, type DeadLetteredJob, type ServerJobsHealth, type RecurringJobName } from './serverJobsContract';
import type { IServerJobsApi } from './serverJobsService';

export const SIMULATED_JOBS_KEY = 'simulatedServerJobsDeadLetters';

/** The starting set, relative to `now`. Pure. */
export function seedDeadLetters(now: number): DeadLetteredJob[] {
  const at = (minAgo: number) => new Date(now - minAgo * 60_000).toISOString();
  return [
    { jobId: 'sim-job-1', kind: 'delivery.attempt', attempts: 5, maxAttempts: 5, enqueuedAt: at(190), deadLetteredAt: at(120), lastError: { code: 'FAX_BUSY', message: 'Simulated: the fax line was busy on every attempt.' }, correlationId: 'sim-corr-1' },
    { jobId: 'sim-job-2', kind: 'charge.dispatch', attempts: 3, maxAttempts: 3, enqueuedAt: at(95), deadLetteredAt: at(60), lastError: { code: 'DISPATCH_REJECTED', message: 'Simulated: the billing engine rejected the charge.' }, correlationId: 'sim-corr-2' },
    { jobId: 'sim-job-3', kind: 'event', consumer: 'registry.submit', attempts: 4, maxAttempts: 4, enqueuedAt: at(45), deadLetteredAt: at(30), lastError: { code: 'TIMEOUT', message: 'Simulated: the registry did not answer in time.' }, correlationId: 'sim-corr-3' },
  ];
}

const load = (): DeadLetteredJob[] => storageGet<DeadLetteredJob[] | null>(SIMULATED_JOBS_KEY, null) ?? (() => { const s = seedDeadLetters(Date.now()); storageSet(SIMULATED_JOBS_KEY, s); return s; })();

/** Health derived from the current dead letters. Pure. */
export function healthFrom(dead: readonly DeadLetteredJob[], now: number): ServerJobsHealth {
  const recurring = (Object.keys(RECURRING_JOBS) as RecurringJobName[]).map(name => {
    const every = RECURRING_JOBS[name];
    return { name, lastRunAt: new Date(now - (every ? every * 30_000 : 120_000)).toISOString(), lastOutcome: 'ok' as const };
  });
  return {
    generatedAt: new Date(now).toISOString(),
    kinds: SERVER_JOB_KINDS.map(kind => ({ kind, ready: kind === 'interface.dispatch' ? 2 : 0, oldestReadyOverdueSeconds: 0, running: kind === 'event' ? 1 : 0, deadLetters24h: dead.filter(j => j.kind === kind).length })),
    recurring,
  };
}

export const simulatedServerJobsApi: IServerJobsApi = {
  async health() { return { ok: true, data: healthFrom(load(), Date.now()) }; },
  async deadLetters(kind) { return { ok: true, data: load().filter(j => !kind || j.kind === kind) }; },
  async requeue(jobId) {
    const all = load();
    const job = all.find(j => j.jobId === jobId);
    if (!job) return { ok: false, error: 'NOT_FOUND' };
    storageSet(SIMULATED_JOBS_KEY, all.filter(j => j.jobId !== jobId));
    await mockAuditService.logEvent({
      type: 'system', event: 'Simulated Job Requeued',
      detail: `SIMULATED (no job server): dead-lettered ${job.kind} job ${job.jobId} requeued by a person. Nothing ran.`,
      user: 'system', caseId: job.caseId ?? null, confidence: null,
    }).catch(() => {});
    return { ok: true, data: { jobId, requeuedAt: new Date().toISOString() } };
  },
};

/** Test seam. */
export function resetSimulatedServerJobsForTests(): void { storageSet(SIMULATED_JOBS_KEY, null); }
