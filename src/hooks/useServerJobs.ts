// src/hooks/useServerJobs.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 551 (PS-539 phase 2d): the Server jobs view's data. Reads the job
// kinds' health, the recurring jobs and the dead-lettered jobs from the API
// server (services/serverJobs), filtered by kind, and requeues one. The
// decisions (capabilities, which screen resends which kind, what is overdue)
// are in the service and the contract. Only the latest read is shown, so a
// slower earlier answer never overwrites a newer one.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';
import { serverJobsService } from '@/services';
import type { IServerJobsService } from '@/services/serverJobs/serverJobsService';
import type { DeadLetteredJob, ServerJobKind, ServerJobsErrorCode, ServerJobsHealth } from '@/services/serverJobs/serverJobsContract';

export function useServerJobs(service: IServerJobsService = serverJobsService) {
  const [health, setHealth] = useState<ServerJobsHealth | null>(null);
  const [jobs, setJobs] = useState<DeadLetteredJob[] | null>(null);
  const [kind, setKindState] = useState<ServerJobKind | ''>('');
  const kindRef = useRef<ServerJobKind | ''>('');
  const [problem, setProblem] = useState<ServerJobsErrorCode | null>(null);
  const [busyJob, setBusyJob] = useState<string | null>(null);
  /** The outcome of the last requeue. Shown above the list: a requeued job leaves the list. */
  const [lastRequeue, setLastRequeue] = useState<{ ok: boolean; error?: ServerJobsErrorCode } | null>(null);
  const latest = useRef(0);

  const reload = useCallback(async () => {
    if (!service.viaServer) return;
    const mine = ++latest.current;
    try {
      const [h, d] = await Promise.all([service.health(), service.deadLetters(kindRef.current || undefined)]);
      if (mine !== latest.current) return;
      if (h.ok) setHealth(h.data);
      setJobs(d.ok ? d.data : []);
      setProblem(h.ok === false ? h.error : d.ok === false ? d.error : null);
    } catch {
      if (mine === latest.current) setProblem('UNAVAILABLE');
    }
  }, [service]);

  useEffect(() => { void reload(); }, [reload]);

  const setKind = useCallback((next: ServerJobKind | '') => {
    kindRef.current = next;
    setKindState(next);
    setJobs(null); // never show one kind's rows under another's filter
    void reload();
  }, [reload]);

  const requeue = useCallback(async (job: DeadLetteredJob) => {
    setBusyJob(job.jobId);
    try {
      const r = await service.requeue(job);
      setLastRequeue(r.ok ? { ok: true } : { ok: false, error: r.error });
      if (r.ok) await reload();
    } catch {
      setLastRequeue({ ok: false, error: 'UNAVAILABLE' });
    } finally {
      setBusyJob(null);
    }
  }, [service, reload]);

  return { viaServer: service.viaServer, simulated: !!service.simulated, health, jobs, kind, setKind, problem, busyJob, lastRequeue, reload, requeue };
}
