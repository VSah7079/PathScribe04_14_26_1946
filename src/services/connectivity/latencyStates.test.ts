import { describe, expect, it } from 'vitest';
import { LATENCY_LIMITS, connectionBanner, connectionProblem, loadingPhase } from './latencyStates';

// Batch 548 (PS-539 phase 2d, readiness review §8): what a screen shows while it waits.
describe('waiting for data', () => {
  it('nothing under 300 ms, a placeholder from 300 ms, "still working" from 3 s', () => {
    expect(loadingPhase(0)).toBe('hidden');
    expect(loadingPhase(299)).toBe('hidden');
    expect(loadingPhase(300)).toBe('skeleton');
    expect(loadingPhase(2_999)).toBe('skeleton');
    expect(loadingPhase(3_000)).toBe('slow');
  });
});

describe('the connection banner', () => {
  it('the browser\'s own network comes first; the hub counts only when it is in use', () => {
    expect(connectionProblem({ browserOnline: false, transport: 'local', hub: 'local' })).toBe('offline');
    expect(connectionProblem({ browserOnline: true, transport: 'local', hub: 'local' })).toBe('none');
    expect(connectionProblem({ browserOnline: true, transport: 'signalr', hub: 'idle' })).toBe('none');
    expect(connectionProblem({ browserOnline: true, transport: 'signalr', hub: 'connecting' })).toBe('none');
    expect(connectionProblem({ browserOnline: true, transport: 'signalr', hub: 'reconnecting' })).toBe('reconnecting');
    expect(connectionProblem({ browserOnline: true, transport: 'signalr', hub: 'offline' })).toBe('offline');
  });
  it('a blip under 2 s shows nothing; a longer problem shows, and stays while it lasts', () => {
    const base = { problemShown: false, recoveredAt: null, now: 10_000 };
    expect(connectionBanner({ ...base, problem: 'reconnecting', problemSince: 10_000 - LATENCY_LIMITS.bannerGraceMs + 1 })).toBe('none');
    expect(connectionBanner({ ...base, problem: 'reconnecting', problemSince: 10_000 - LATENCY_LIMITS.bannerGraceMs })).toBe('reconnecting');
    expect(connectionBanner({ ...base, problem: 'offline', problemSince: 9_999, problemShown: true })).toBe('offline');
  });
  it('once back after a shown problem, "reconnected" for 4 s, then nothing; no click needed', () => {
    expect(connectionBanner({ problem: 'none', problemSince: null, problemShown: false, recoveredAt: 10_000, now: 13_999 })).toBe('reconnected');
    expect(connectionBanner({ problem: 'none', problemSince: null, problemShown: false, recoveredAt: 10_000, now: 14_000 })).toBe('none');
    expect(connectionBanner({ problem: 'none', problemSince: null, problemShown: false, recoveredAt: null, now: 14_000 })).toBe('none');
  });
});
