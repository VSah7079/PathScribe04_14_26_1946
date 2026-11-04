// src/services/delivery/mockDeliveryRetrySettingsService.test.ts
// Batch 521 (PS-281): the lab's retry delays — default 1, 5, 15; saving needs config:delivery-rules:manage
// and refuses delays that can't be used.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const auth = vi.hoisted(() => ({ allowed: true, asked: [] as string[] }));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: {
    enforce: async (cap: string) => { auth.asked.push(cap); return { allowed: auth.allowed }; },
    evaluate: async () => ({ allowed: auth.allowed }),
    grantedCapabilities: async () => new Set<string>(),
  },
}));
import { mockDeliveryRetrySettingsService } from './mockDeliveryRetrySettingsService';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; },
  };
  auth.allowed = true;
  auth.asked = [];
});

describe('delivery retry settings', () => {
  it('default: 1, 5 and 15 minutes', async () => {
    expect(await mockDeliveryRetrySettingsService.get()).toEqual({ ok: true, data: { delaysMinutes: [1, 5, 15] } });
  });
  it('saving checks config:delivery-rules:manage, and keeps what was saved', async () => {
    expect((await mockDeliveryRetrySettingsService.save({ delaysMinutes: [2, 10] })).ok).toBe(true);
    expect(auth.asked).toContain('config:delivery-rules:manage');
    expect((await mockDeliveryRetrySettingsService.get()).ok && (await mockDeliveryRetrySettingsService.get() as { data: { delaysMinutes: number[] } }).data.delaysMinutes).toEqual([2, 10]);
  });
  it('without the permission nothing changes', async () => {
    auth.allowed = false;
    expect((await mockDeliveryRetrySettingsService.save({ delaysMinutes: [2] })).ok).toBe(false);
    auth.allowed = true;
    expect(await mockDeliveryRetrySettingsService.get()).toEqual({ ok: true, data: { delaysMinutes: [1, 5, 15] } });
  });
  it('delays it can\'t use are refused', async () => {
    expect((await mockDeliveryRetrySettingsService.save({ delaysMinutes: [0] })).ok).toBe(false);
    expect((await mockDeliveryRetrySettingsService.save({ delaysMinutes: [] })).ok).toBe(true);
  });
});
