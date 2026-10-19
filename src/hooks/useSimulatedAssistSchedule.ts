// Batch 605: the demo's stand-in for the server's assist.pollLis schedule (see services/assistPolling/simulatedAssistSchedule.ts).
import { useEffect } from 'react';
import { browserRunsServerJob } from '@/services/serverJobs/browserStandIns';
import { dataMayPersistInBrowser } from '@/services/browserData/browserDataPolicy';

export function useSimulatedAssistSchedule(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !dataMayPersistInBrowser() || !browserRunsServerJob('assist.pollLis')) return;
    let stop = () => {};
    let cancelled = false;
    void Promise.all([import('@/services/assistPolling/simulatedAssistSchedule'), import('@/services/assistPolling/assistPollingRuntime'), import('@/services')]).then(([sched, runtime, svc]) => {
      if (cancelled) return;
      stop = sched.startSimulatedAssistSchedule({ getState: () => svc.assistPollingService.getState(), runPoll: () => runtime.runAssistPollNow('scheduled') });
    });
    return () => { cancelled = true; stop(); };
  }, [enabled]);
}
