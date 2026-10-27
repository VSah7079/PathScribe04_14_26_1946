// src/services/healthStatus/mockHealthStatusService.ts
// Batch 669h (footer): the demo's stand-in for the health check. There is no server to ask, so the only
// real probe is whether this browser is online; the result is labelled simulated. Tests and demos can set
// the answer. Nothing is stored in the browser.
import type { IHealthStatusService } from './IHealthStatusService';
import { HEALTH_CHECK_FAILED } from './IHealthStatusService';
import { HEALTH_COMPONENTS, type HealthComponent, type HealthState, type HealthStatus } from './healthStatusContract';

export interface MockHealthDeps {
  /** True when the browser is online. Default: navigator.onLine (true where unknown). */
  isOnline?: () => boolean;
  now?: () => Date;
}

const allComponents = (state: HealthState): Record<HealthComponent, HealthState> =>
  Object.fromEntries(HEALTH_COMPONENTS.map(c => [c, state])) as Record<HealthComponent, HealthState>;

export function createMockHealthStatusService(deps: MockHealthDeps = {}) {
  const isOnline = deps.isOnline ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
  const now = deps.now ?? (() => new Date());
  let override: HealthStatus | 'fail' | null = null;
  const service: IHealthStatusService & {
    /** Demo/test control: the next checks answer this (a status), fail ('fail'), or go back to probing (null). */
    setMockResult(r: HealthStatus | 'fail' | null): void;
  } = {
    setMockResult(r) { override = r; },
    async check() {
      if (override === 'fail') return { ok: false, error: HEALTH_CHECK_FAILED };
      if (override) return { ok: true, data: { ...override, simulated: true } };
      const state: HealthState = isOnline() ? 'operational' : 'unavailable';
      return { ok: true, data: { overall: state, components: allComponents(state), checkedAt: now().toISOString(), simulated: true } };
    },
  };
  return service;
}

export const mockHealthStatusService = createMockHealthStatusService();
