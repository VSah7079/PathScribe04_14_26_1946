import { describe, it, expect } from 'vitest';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};
const { runHistoryRefreshSweep, destroyHistoryCacheAtSignOut } = await import('./runHistoryRefreshSweep');
const { mockPatientHistoryCacheService } = await import('./mockPatientHistoryCacheService');

describe('prior-report refresh sweep', () => {
  it('runs over the active Assist cases and reports counts', async () => {
    const r = await runHistoryRefreshSweep('T');
    expect(r.considered).toBeGreaterThanOrEqual(0);
    expect(r.refreshed).toBeLessThanOrEqual(r.considered);
  });
  it('destroys a case cache at sign-out, and does not throw for an unknown case', async () => {
    await mockPatientHistoryCacheService.ensurePending('CASE-X', 'P-X');
    await destroyHistoryCacheAtSignOut('CASE-X');
    const after = await mockPatientHistoryCacheService.getByCaseId('CASE-X');
    expect(after.ok && after.data).toBeNull();
    await expect(destroyHistoryCacheAtSignOut('no-such')).resolves.toBeUndefined();
  });
});
