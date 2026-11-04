// Batch 450 (PS-188, PS-189): the Cytology Workspace's real wiring for the
// workload cap tiers and workload reassignment.
import { describe, it, expect, beforeEach, vi } from 'vitest';
// The mock services read browser storage when imported.
const memoryStorage = vi.hoisted(() => {
  const make = () => {
    const store: Record<string, string> = {};
    return { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; }, clear: () => {}, key: () => null, length: 0 };
  };
  (globalThis as any).localStorage = make();
  return make;
});
// These tests are about the wiring, not who may change settings (that check: authorization/guardConfigWrites.test.ts).
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
vi.mock('@/services/cases/casePoolAssignmentService', () => ({ applyPoolRouting: vi.fn(async () => undefined) }));
import { cytologyWorkspaceDeps } from './cytologyWorkspaceDeps';
import { applyPoolRouting } from '@/services/cases/casePoolAssignmentService';
import { mockFacilityCytologyWorkloadCapOverrideService } from './mockFacilityCytologyWorkloadCapOverrideService';
import { mockStaffCytologyWorkloadCapOverrideService } from './mockStaffCytologyWorkloadCapOverrideService';
import { resolveEffectiveCytologyWorkloadCap } from './resolveEffectiveCytologyWorkloadCap';

beforeEach(() => {
  (globalThis as any).localStorage = memoryStorage();
});

describe('cytologyWorkspaceDeps.getWorkloadCaps', () => {
  it('loads the Enterprise default, that facility\'s override and that reviewer\'s override', async () => {
    await mockFacilityCytologyWorkloadCapOverrideService.create('fac-wl-1', { dailySlideCap: 90 });
    await mockStaffCytologyWorkloadCapOverrideService.create('CT-WL-1', { dailySlideCap: 70 });
    const caps = await cytologyWorkspaceDeps.getWorkloadCaps('fac-wl-1', 'CT-WL-1');
    expect(caps?.facility?.overrides.dailySlideCap).toBe(90);
    expect(caps?.staff?.overrides.dailySlideCap).toBe(70);
    expect(resolveEffectiveCytologyWorkloadCap(caps!.enterprise, caps!.facility, caps!.staff).dailySlideCap).toBe(70);
  });

  it('another facility\'s override is never applied: a reviewer with no override at a facility with none gets the Enterprise cap', async () => {
    await mockFacilityCytologyWorkloadCapOverrideService.create('fac-wl-1', { dailySlideCap: 90 });
    const caps = await cytologyWorkspaceDeps.getWorkloadCaps('fac-wl-2', 'CT-WL-2');
    expect(caps?.facility).toBeNull();
    expect(caps?.staff).toBeNull();
    expect(resolveEffectiveCytologyWorkloadCap(caps!.enterprise, caps!.facility, caps!.staff).dailySlideCap).toBe(caps!.enterprise.dailySlideCap);
  });

  it('the facility\'s cap applies to a reviewer with no override of their own', async () => {
    await mockFacilityCytologyWorkloadCapOverrideService.create('fac-wl-3', { dailySlideCap: 95 });
    const caps = await cytologyWorkspaceDeps.getWorkloadCaps('fac-wl-3', 'CT-WL-3');
    expect(resolveEffectiveCytologyWorkloadCap(caps!.enterprise, caps!.facility, caps!.staff).dailySlideCap).toBe(95);
  });
});

describe('cytologyWorkspaceDeps.returnToCytologyPool', () => {
  it('returns the case to the Cytology pool through applyPoolRouting, the case passed as-is', async () => {
    const caseData = { id: 'C1', version: 3, order: { assignedTo: 'CT1' } } as never;
    await cytologyWorkspaceDeps.returnToCytologyPool(caseData);
    expect(applyPoolRouting).toHaveBeenCalledWith(caseData, '1', 'Cytology');
  });
});
