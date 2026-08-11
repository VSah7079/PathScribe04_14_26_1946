// src/components/Config/AI/orchestratorModeConfig.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

const {
  getOrgOrchestratorDefault,
  setOrgOrchestratorDefault,
  resolveOrchestratorMode,
} = await import('./orchestratorModeConfig');
const { mockFacilityService } = await import('../../../services/facilities/mockFacilityService');

describe('orchestratorModeConfig — real fix: the per-lab override that was silently never applied', () => {
  beforeEach(() => { store.clear(); });

  it('getOrgOrchestratorDefault/setOrgOrchestratorDefault round-trip through the real, shared localStorage key', () => {
    setOrgOrchestratorDefault(true);
    expect(getOrgOrchestratorDefault()).toBe(true);
    setOrgOrchestratorDefault(false);
    expect(getOrgOrchestratorDefault()).toBe(false);
  });

  it('resolveOrchestratorMode falls back to the org default when no ordering client is given', async () => {
    setOrgOrchestratorDefault(true);
    const result = await resolveOrchestratorMode(undefined);
    expect(result).toBe(true);
  });

  it('the real per-lab override wins over the org default — the exact behavior that was previously never reachable from HeaderBar/RightSynopticPanel', async () => {
    setOrgOrchestratorDefault(false);
    const clientRes = await mockFacilityService.add({
      name: 'Test Internal Lab', roles: ['performing_lab'], status: 'Active',
      internalAiOrchestratorEnabled: true,
    } as any);
    expect(clientRes.ok).toBe(true);
    if (!clientRes.ok) return;

    const result = await resolveOrchestratorMode(clientRes.data.id);
    expect(result).toBe(true); // per-lab override (true) wins over org default (false)
  });

  it('falls back to the org default when the performing lab has no override set (null/undefined)', async () => {
    setOrgOrchestratorDefault(true);
    const clientRes = await mockFacilityService.add({
      name: 'Test Lab No Override', roles: ['performing_lab'], status: 'Active',
    } as any);
    expect(clientRes.ok).toBe(true);
    if (!clientRes.ok) return;

    const result = await resolveOrchestratorMode(clientRes.data.id);
    expect(result).toBe(true); // no override set -> org default
  });

  it('falls back to the org default when the ordering client id does not resolve to a real client', async () => {
    setOrgOrchestratorDefault(true);
    const result = await resolveOrchestratorMode('does-not-exist');
    expect(result).toBe(true);
  });
});
