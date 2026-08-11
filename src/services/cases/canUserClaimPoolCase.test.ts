// src/services/cases/canUserClaimPoolCase.test.ts
import { describe, it, expect } from 'vitest';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

const { canUserClaimPoolCase } = await import('./mockCaseService');
const { mockSubspecialtyService } = await import('../subspecialties/mockSubspecialtyService');

describe('canUserClaimPoolCase — real fix: claim-time enforcement was completely missing before this', () => {
  it('allows claiming when poolId is undefined (no pool at all)', async () => {
    const result = await canUserClaimPoolCase(undefined, 'user-1');
    expect(result.allowed).toBe(true);
  });

  it('allows claiming when the poolId does not resolve to a real Subspecialty record (e.g. the "general" fallback pool)', async () => {
    const result = await canUserClaimPoolCase('general', 'user-1');
    expect(result.allowed).toBe(true);
  });

  it('allows claiming when the subspecialty exists but isWorkgroupEnabled is off (today\'s default for every seeded subspecialty — backward compatible)', async () => {
    const created = await mockSubspecialtyService.add({
      name: 'Test Pool Unrestricted', isWorkgroup: true, isWorkgroupEnabled: false,
      active: true, status: 'Active', userIds: ['member-only'],
    } as any);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = await canUserClaimPoolCase(created.data.id, 'someone-not-in-the-list');
    expect(result.allowed).toBe(true);
  });

  it('blocks a non-member when isWorkgroupEnabled is on — the real, previously-missing enforcement', async () => {
    const created = await mockSubspecialtyService.add({
      name: 'Test Pool Restricted', isWorkgroup: true, isWorkgroupEnabled: true,
      active: true, status: 'Active', userIds: ['member-1', 'member-2'],
    } as any);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = await canUserClaimPoolCase(created.data.id, 'not-a-member');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Test Pool Restricted');
  });

  it('allows a real member when isWorkgroupEnabled is on', async () => {
    const created = await mockSubspecialtyService.add({
      name: 'Test Pool Restricted 2', isWorkgroup: true, isWorkgroupEnabled: true,
      active: true, status: 'Active', userIds: ['member-1', 'member-2'],
    } as any);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = await canUserClaimPoolCase(created.data.id, 'member-1');
    expect(result.allowed).toBe(true);
  });
});
