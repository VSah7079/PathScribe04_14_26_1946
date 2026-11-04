import { describe, it, expect, vi, afterEach } from 'vitest';
import { scheduleStatus, isPollDue, startSimulatedAssistSchedule } from './simulatedAssistSchedule';

const state = (enabled: boolean, intervalMinutes: number, runs: any[] = []) => ({ settings: { enabled, intervalMinutes } as any, runs });
afterEach(() => { vi.useRealTimers(); });

describe('simulated assist schedule', () => {
  it('next run is the last scheduled run plus the interval; off when disabled; first run counts from the start', () => {
    const last = scheduleStatus(state(true, 10, [{ trigger: 'manual', startedAt: '2026-01-01T10:05:00Z' }, { trigger: 'scheduled', startedAt: '2026-01-01T10:00:00Z' }]), null);
    expect(last).toEqual({ enabled: true, lastRunAt: '2026-01-01T10:00:00.000Z'.replace('.000Z', 'Z'), nextRunAt: '2026-01-01T10:10:00.000Z' });
    expect(scheduleStatus(state(false, 10), '2026-01-01T09:00:00Z')).toMatchObject({ enabled: false, nextRunAt: null });
    expect(scheduleStatus(state(true, 5), '2026-01-01T09:00:00Z').nextRunAt).toBe('2026-01-01T09:05:00.000Z');
  });
  it('is due only when enabled and the next run has passed', () => {
    const s = { enabled: true, lastRunAt: null, nextRunAt: '2026-01-01T10:00:00.000Z' };
    expect(isPollDue(s, new Date('2026-01-01T09:59:59Z'))).toBe(false);
    expect(isPollDue(s, new Date('2026-01-01T10:00:00Z'))).toBe(true);
    expect(isPollDue({ ...s, enabled: false }, new Date('2026-01-01T11:00:00Z'))).toBe(false);
  });
  it('the timer polls when due and not before', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01T09:00:00Z'));
    const runs: any[] = [];
    const runPoll = vi.fn(async () => { runs.unshift({ trigger: 'scheduled', startedAt: new Date().toISOString() }); return {}; });
    const stop = startSimulatedAssistSchedule({ getState: async () => state(true, 1, runs) as any, runPoll, tickMs: 10_000 });
    await vi.advanceTimersByTimeAsync(30_000);
    expect(runPoll).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(40_000);
    expect(runPoll).toHaveBeenCalledTimes(1);
    stop();
  });
});
