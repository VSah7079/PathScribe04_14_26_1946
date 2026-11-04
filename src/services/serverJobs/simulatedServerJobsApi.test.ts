import { describe, it, expect, beforeEach } from 'vitest';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};
const { simulatedServerJobsApi, seedDeadLetters, healthFrom, resetSimulatedServerJobsForTests } = await import('./simulatedServerJobsApi');
const { createServerJobsService } = await import('./serverJobsService');
const { createInterfaceMonitoringService } = await import('../interfaceMonitoring/interfaceMonitoringService');
const { simulatedInterfaceMonitoringApi, sampleEngines } = await import('../interfaceMonitoring/simulatedInterfaceMonitoringApi');
const { engineViews, engineCounts } = await import('../interfaceMonitoring/interfaceMonitoringContract');

const allow = { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }) } as any;
beforeEach(() => resetSimulatedServerJobsForTests());

describe('simulated server jobs', () => {
  it('seeds dead letters, derives health from them, and requeue removes one', async () => {
    const svc = createServerJobsService({ api: null, simulatedApi: simulatedServerJobsApi, authorization: allow });
    expect(svc.viaServer).toBe(true); expect(svc.simulated).toBe(true);
    const before = await svc.deadLetters();
    expect(before.ok && before.data).toHaveLength(3);
    const h = await svc.health();
    expect(h.ok && h.data.kinds.find(k => k.kind === 'charge.dispatch')!.deadLetters24h).toBe(1);
    const job = (before as any).data[0];
    expect((await svc.requeue(job)).ok).toBe(true);
    const after = await svc.deadLetters();
    expect(after.ok && after.data).toHaveLength(2);
    expect((await svc.requeue(job)).ok).toBe(false);
  });
  it('without a simulated api the service is unchanged: nothing to list', async () => {
    const svc = createServerJobsService({ api: null, authorization: allow });
    expect(svc.viaServer).toBe(false); expect(svc.simulated).toBe(false);
    expect(await svc.health()).toEqual({ ok: false, error: 'UNAVAILABLE' });
  });
  it('health and seeds are pure', () => {
    expect(healthFrom(seedDeadLetters(0), 0).kinds.reduce((n, k) => n + k.deadLetters24h, 0)).toBe(3);
  });
});

describe('simulated interface engines', () => {
  it('shows one engine in each status', async () => {
    const svc = createInterfaceMonitoringService({ api: null, simulatedApi: simulatedInterfaceMonitoringApi, authorization: allow });
    expect(svc.simulated).toBe(true);
    const r = await svc.engines();
    expect(r.ok).toBe(true);
    const counts = engineCounts(engineViews((r as any).data));
    expect([counts.online, counts.attention, counts.degraded, counts.offline]).toEqual([1, 1, 1, 1]);
    expect(sampleEngines(0)).toHaveLength(4);
  });
});
