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

describe('mockImageUploadService', () => {
  it('a real, configured vendor (the seeded [DEMO ONLY] entry) is used to produce a real-shaped URL', async () => {
    const { mockImageUploadService } = await import('./mockImageUploadService');
    const res = await mockImageUploadService.upload('data:image/jpeg;base64,AAAA', 'Gross Specimen');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.imageUrl.startsWith('https://')).toBe(true);
      expect(res.data.imageUrl).not.toContain('data:image');
    }
  });

  it('refuses honestly, never silently succeeding, when genuinely no vendor has a configured base URL', async () => {
    const { mockGrossImagingVendorService } = await import('./mockGrossImagingVendorService');
    const all = await mockGrossImagingVendorService.getAll();
    if (all.ok) for (const v of all.data) await mockGrossImagingVendorService.deactivate(v.id);

    const { mockImageUploadService } = await import('./mockImageUploadService');
    const res = await mockImageUploadService.upload('data:image/jpeg;base64,AAAA', 'Gross Specimen');
    expect(res.ok).toBe(false);
  });
});
