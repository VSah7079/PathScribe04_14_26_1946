// @vitest-environment happy-dom
// Batch 736 (Pete, Oct 30, 2026): the bench's tap-to-pick reasons live in the Reason Dictionary. Defaults are
// translated until a lab rewords them; the code (the entry's id) never changes, so reports count consistently.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const enforced: string[] = [];
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async (k: string) => { enforced.push(k); return { allowed: k !== 'config:revision-reasons:manage' }; } },
}));

import { mockReasonDictionaryService } from './mockReasonDictionaryService';
import {
  BENCH_REASON_CATEGORIES, BENCH_REASON_SEEDS, activeBenchReasons, benchReasonCode, benchReasonLabel, benchReasonText, withReasonCode,
} from './benchReasons';

const t = (k: string) => `T:${k}`;
const join = (r: string, n: string) => `${r} | ${n}`;

describe('bench reasons in the Reason Dictionary (Batch 736)', () => {
  beforeEach(() => { localStorage.clear(); enforced.length = 0; });

  it('ships defaults for every bench category, in order', async () => {
    for (const c of BENCH_REASON_CATEGORIES) {
      const r = await mockReasonDictionaryService.getAll(c);
      expect(r.ok && r.data.length).toBeGreaterThan(2);
      if (r.ok) expect(activeBenchReasons(r.data).map(e => e.sortOrder)).toEqual(r.data.map((_, i) => i + 1));
    }
  });

  it('shows the translation until the lab rewords a default; then the lab\'s own words, under the same code', async () => {
    const seed = BENCH_REASON_SEEDS.find(s => s.id === 'BE_NO_TISSUE')!;
    expect(benchReasonLabel(seed, t)).toBe('T:benchReasons.BE_NO_TISSUE');
    const r = await mockReasonDictionaryService.update('BE_NO_TISSUE', { name: 'Bloc épuisé', id: 'X', category: 'ADDENDUM' } as never);
    expect(r.ok && r.data).toMatchObject({ id: 'BE_NO_TISSUE', category: 'BENCH_BLOCK_EXHAUSTED', name: 'Bloc épuisé' });
    if (r.ok) expect(benchReasonLabel(r.data, t)).toBe('Bloc épuisé');
  });

  it('changing a bench reason needs config:bench-reasons:manage, not the revision reasons\' capability', async () => {
    expect((await mockReasonDictionaryService.add({ category: 'BENCH_BATCH_ABORT', name: 'Power cut', description: '', status: 'Active' })).ok).toBe(true);
    expect(enforced).toEqual(['config:bench-reasons:manage']);
    expect((await mockReasonDictionaryService.deactivate('AMEND_DIAG')).ok).toBe(false);
    expect(enforced).toContain('config:revision-reasons:manage');
  });

  it('only active reasons are offered', () => {
    const list = activeBenchReasons([{ ...BENCH_REASON_SEEDS[0], status: 'Inactive' }, BENCH_REASON_SEEDS[1]]);
    expect(list.map(e => e.id)).toEqual([BENCH_REASON_SEEDS[1].id]);
  });

  it('saves the picked reason with its code, a note optional; a note alone has no code', () => {
    expect(benchReasonText({ code: 'BA_RUN_CANCELLED', label: 'Run cancelled', note: '' }, join)).toBe('Run cancelled');
    expect(benchReasonText({ code: 'BA_RUN_CANCELLED', label: 'Run cancelled', note: 'per Dr P' }, join)).toBe('Run cancelled | per Dr P');
    expect(benchReasonText({ note: 'typed only' }, join)).toBe('typed only');
    expect(benchReasonCode({ code: 'BA_RUN_CANCELLED', label: 'Run cancelled', note: '' })).toBe('BA_RUN_CANCELLED');
    expect(benchReasonCode({ note: 'typed only' })).toBeUndefined();
    expect(withReasonCode('Batch X aborted. Reason: Run cancelled', 'BA_RUN_CANCELLED')).toBe('Batch X aborted. Reason: Run cancelled [reason code BA_RUN_CANCELLED]');
    expect(withReasonCode('no code', undefined)).toBe('no code');
  });
});
