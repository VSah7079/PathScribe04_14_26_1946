// src/services/inkColors/mockInkColorService.test.ts
// Structured Inking, Module 3 (PS-359 follow-up). Same pattern as
// mockQaActivityTypeService.test.ts — this is about the service itself,
// not who may use it (that's authorization/guardConfigWrites.test.ts).
import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
import { mockInkColorService } from './mockInkColorService';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

describe('mockInkColorService', () => {
  it('seeds seven real, distinct, active colors by default', async () => {
    const res = await mockInkColorService.getAll();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.length).toBe(7);
    expect(res.data.every(c => c.active)).toBe(true);
    expect(res.data.map(c => c.id)).toEqual(expect.arrayContaining(['ink-black', 'ink-blue', 'ink-green', 'ink-yellow', 'ink-orange', 'ink-red', 'ink-violet']));
  });

  it('every seed has a real 6-digit hex code', async () => {
    const res = await mockInkColorService.getAll();
    if (!res.ok) return;
    for (const c of res.data) expect(c.code).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('adds a new color, assigning id/createdAt/updatedAt', async () => {
    const res = await mockInkColorService.create({ name: 'Teal', code: '#008080', active: true });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.id).toBeTruthy();
    expect(res.data.createdAt).toBeTruthy();
    const all = await mockInkColorService.getAll();
    if (!all.ok) return;
    expect(all.data.length).toBe(8);
  });

  it('getById returns the real color or a real error for an unknown id', async () => {
    const found = await mockInkColorService.getById('ink-blue');
    expect(found.ok && found.data.name).toBe('Blue');
    const missing = await mockInkColorService.getById('not-real');
    expect(missing.ok).toBe(false);
  });

  it('update rejects an unknown id', async () => {
    const res = await mockInkColorService.update('not-real', { name: 'X' });
    expect(res.ok).toBe(false);
  });

  it('deactivate/reactivate toggle the active flag without touching other fields', async () => {
    const created = await mockInkColorService.create({ name: 'Teal', code: '#008080', active: true });
    if (!created.ok) throw new Error('setup failed');
    const deactivated = await mockInkColorService.deactivate(created.data.id);
    expect(deactivated.ok && deactivated.data.active).toBe(false);
    expect(deactivated.ok && deactivated.data.code).toBe('#008080');
    const reactivated = await mockInkColorService.reactivate(created.data.id);
    expect(reactivated.ok && reactivated.data.active).toBe(true);
  });
});
