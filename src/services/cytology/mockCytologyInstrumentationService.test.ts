// src/services/cytology/mockCytologyInstrumentationService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
// Batch 428: these tests are about the service, not who may use it, so Configuration
// changes are allowed here (the check itself: authorization/guardConfigWrites.test.ts).
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

describe('mockCytologyInstrumentationService — real, per direct guidance on Cytology Assisted Instrumentation', () => {
  it('real, per direct guidance ("Standardize on WSI"): the real, honest default is wsi, not traditional_guided', async () => {
    const { mockCytologyInstrumentationService } = await import('./mockCytologyInstrumentationService');
    const res = await mockCytologyInstrumentationService.get();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.modality).toBe('wsi');
  });

  it('real, update correctly persists a real, explicit switch to traditional_guided', async () => {
    const { mockCytologyInstrumentationService } = await import('./mockCytologyInstrumentationService');
    await mockCytologyInstrumentationService.update({ modality: 'traditional_guided' });
    const res = await mockCytologyInstrumentationService.get();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.modality).toBe('traditional_guided');
  });

  it('real, reset correctly returns to the real, honest wsi default', async () => {
    const { mockCytologyInstrumentationService } = await import('./mockCytologyInstrumentationService');
    await mockCytologyInstrumentationService.update({ modality: 'traditional_guided' });
    await mockCytologyInstrumentationService.reset();
    const res = await mockCytologyInstrumentationService.get();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.modality).toBe('wsi');
  });
});
