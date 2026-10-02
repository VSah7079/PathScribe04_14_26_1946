// Batch 399: the critical intraoperative results dictionary.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, unknown>();
vi.mock('../mockStorage', () => ({
  storageGet: (k: string, d: unknown) => (store.has(k) ? store.get(k) : d),
  storageSet: (k: string, v: unknown) => { store.set(k, v); },
}));
const enforce = vi.fn();
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce: (...a: unknown[]) => enforce(...a) } }));

import { mockIntraopCriticalResultService as svc, INTRAOP_CRITICAL_RESULTS_NOT_PERMITTED, SEED_INTRAOP_CRITICAL_RESULTS } from './mockIntraopCriticalResultService';

beforeEach(() => { store.clear(); enforce.mockReset(); enforce.mockResolvedValue({ allowed: true }); });

describe('intraop critical results dictionary (Batch 399)', () => {
  it('starts with the seed entries', async () => {
    const r = await svc.getAll();
    expect(r.ok && r.data.map(e => e.id)).toEqual(SEED_INTRAOP_CRITICAL_RESULTS.map(e => e.id));
  });

  it('changes need config:intraop-critical-results:manage', async () => {
    enforce.mockResolvedValue({ allowed: false });
    expect(await svc.add({ name: 'X', description: '', matchTerms: ['x'], frozenCategories: [], status: 'Active' })).toEqual({ ok: false, error: INTRAOP_CRITICAL_RESULTS_NOT_PERMITTED });
    expect(await svc.setActive('icr-malignancy', false)).toEqual({ ok: false, error: INTRAOP_CRITICAL_RESULTS_NOT_PERMITTED });
    expect(enforce).toHaveBeenCalledWith('config:intraop-critical-results:manage');
  });

  it('adds, edits and deactivates; an entry needs a name and a term or category', async () => {
    expect((await svc.add({ name: ' ', description: '', matchTerms: ['x'], frozenCategories: [], status: 'Active' })).ok).toBe(false);
    expect((await svc.add({ name: 'Frozen deferral', description: '', matchTerms: [], frozenCategories: [], status: 'Active' })).ok).toBe(false);
    const added = await svc.add({ name: ' Unexpected infection ', description: '', matchTerms: ['abscess', ' abscess '], frozenCategories: [], status: 'Active' });
    expect(added.ok && added.data).toMatchObject({ name: 'Unexpected infection', matchTerms: ['abscess'] });
    if (!added.ok) return;
    expect((await svc.update(added.data.id, { matchTerms: ['abscess', 'granuloma'] })).ok).toBe(true);
    const off = await svc.setActive(added.data.id, false);
    expect(off.ok && off.data.status).toBe('Inactive');
  });
});
