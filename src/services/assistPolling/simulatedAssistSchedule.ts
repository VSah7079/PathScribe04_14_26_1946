// src/services/assistPolling/simulatedAssistSchedule.ts
// ─────────────────────────────────────────────────
// Batch 605: in the demo no server schedule exists. While the app is open and
// someone is signed in, this runs the Assist poll at the saved interval when
// polling is switched on, as a 'scheduled' run. The Assist screen labels it a
// simulated schedule and shows the last and next run. With an API server that
// runs the job, the browser does not (browserRunsServerJob in the hook).
// ─────────────────────────────────────────────────
import type { AssistPollingState } from './types';

export const SIMULATED_SCHEDULE_TICK_MS = 15_000;

export interface ScheduleStatus { enabled: boolean; lastRunAt: string | null; nextRunAt: string | null }

/** Last and next run from the saved state. `startedAt` stands in for a first run that has not happened yet. Pure. */
export function scheduleStatus(state: Pick<AssistPollingState, 'settings' | 'runs'>, startedAt: string | null): ScheduleStatus {
  const last = state.runs.find(r => r.trigger === 'scheduled');
  if (!state.settings.enabled) return { enabled: false, lastRunAt: last?.startedAt ?? null, nextRunAt: null };
  const base = last?.startedAt ?? startedAt;
  const next = base ? new Date(new Date(base).getTime() + state.settings.intervalMinutes * 60_000).toISOString() : null;
  return { enabled: true, lastRunAt: last?.startedAt ?? null, nextRunAt: next };
}

/** Whether a scheduled poll is due now. Pure. */
export function isPollDue(status: ScheduleStatus, now: Date): boolean {
  return status.enabled && !!status.nextRunAt && now.getTime() >= new Date(status.nextRunAt).getTime();
}

let startedAt: string | null = null;
export const scheduleStartedAt = (): string | null => startedAt;

/** Starts the timer; returns the stop function. One timer at a time. */
export function startSimulatedAssistSchedule(deps: {
  getState: () => Promise<AssistPollingState>;
  runPoll: () => Promise<unknown>;
  now?: () => Date;
  tickMs?: number;
}): () => void {
  const now = deps.now ?? (() => new Date());
  startedAt = now().toISOString();
  let busy = false;
  const id = setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      const state = await deps.getState();
      if (isPollDue(scheduleStatus(state, startedAt), now())) await deps.runPoll();
    } catch { /* a failed tick waits for the next one */ } finally { busy = false; }
  }, deps.tickMs ?? SIMULATED_SCHEDULE_TICK_MS);
  return () => { clearInterval(id); startedAt = null; };
}
