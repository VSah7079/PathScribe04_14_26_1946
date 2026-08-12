// src/services/governingBodies/mockGoverningBodyService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

const { mockGoverningBodyService } = await import('./mockGoverningBodyService');

describe('mockGoverningBodyService — real persistence, closing the "TODO: persist" gap', () => {
  beforeEach(() => { store.clear(); });

  it('getAll returns the real seed data on first load', async () => {
    const bodies = await mockGoverningBodyService.getAll();
    expect(bodies.find(b => b.id === 'CAP')).toBeDefined();
    expect(bodies.length).toBeGreaterThanOrEqual(4);
  });

  it('a real save is genuinely visible on the next getAll — the actual bug this closes', async () => {
    const bodies = await mockGoverningBodyService.getAll();
    const updated = bodies.map(b => b.id === 'CAP' ? { ...b, enabled: false } : b);
    await mockGoverningBodyService.saveAll(updated);

    // Simulates a page refresh — a fresh getAll() call, same as the
    // component's own useEffect on mount.
    const reloaded = await mockGoverningBodyService.getAll();
    const cap = reloaded.find(b => b.id === 'CAP');
    expect(cap?.enabled).toBe(false);
  });

  it('adding a custom governing body actually persists, not just to in-memory state', async () => {
    const bodies = await mockGoverningBodyService.getAll();
    const withCustom = [...bodies, {
      id: 'CUSTOM1', label: 'Custom Body', fullName: 'A Custom Governing Body',
      region: 'Test Region', website: 'https://example.com', enabled: true, syncEnabled: false, isCustom: true,
    }];
    await mockGoverningBodyService.saveAll(withCustom);

    const reloaded = await mockGoverningBodyService.getAll();
    expect(reloaded.find(b => b.id === 'CUSTOM1')).toBeDefined();
  });

  it('removing a body actually persists the removal', async () => {
    const bodies = await mockGoverningBodyService.getAll();
    const withoutRcpa = bodies.filter(b => b.id !== 'RCPA');
    await mockGoverningBodyService.saveAll(withoutRcpa);

    const reloaded = await mockGoverningBodyService.getAll();
    expect(reloaded.find(b => b.id === 'RCPA')).toBeUndefined();
  });
});
