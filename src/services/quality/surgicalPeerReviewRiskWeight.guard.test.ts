// src/services/quality/surgicalPeerReviewRiskWeight.guard.test.ts
// Batch 432: setting or removing a risk weight needs config:qa-types:manage.
import { describe, it, expect, vi, beforeEach } from 'vitest';

let allowed = false;
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce: async () => ({ allowed }) } }));

beforeEach(() => {
  allowed = false;
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; } };
});

describe('surgical peer review risk weights (Batch 432)', () => {
  it('refuses without config:qa-types:manage, saves with it', async () => {
    const { mockSurgicalPeerReviewRiskWeightService: svc } = await import('./mockSurgicalPeerReviewRiskWeightService');
    expect(await svc.setWeight('sub-gi', 2, 'Pete')).toMatchObject({ ok: false, error: 'CONFIG_NOT_PERMITTED' });
    allowed = true;
    expect((await svc.setWeight('sub-gi', 2, 'Pete')).ok).toBe(true);
    const all = await svc.getAll();
    expect(all.ok && all.data.map(w => [w.subspecialtyId, w.multiplier])).toEqual([['sub-gi', 2]]);
  });
});
