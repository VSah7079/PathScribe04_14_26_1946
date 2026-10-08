// @vitest-environment happy-dom
// src/hooks/useGlobalMaterialScanTracking.test.ts
// PS-71 (Batch 458): the microtomy "slides engraved" save is applied to the
// newest case and carries its version.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ cases: {} as Record<string, any>, saves: [] as Array<[string, number | undefined]>, beforeSave: [] as Array<(id: string) => void> }));
vi.mock('@/services/cases/CaseRouter', () => ({
  caseRouter: {
    getCase: vi.fn(async (id: string) => structuredClone(h.cases[id])),
    updateCase: vi.fn(async (id: string, updates: any, expectedVersion?: number) => {
      h.saves.push([id, expectedVersion]);
      h.beforeSave.splice(0).forEach(f => f(id));
      const v = h.cases[id].version ?? 0;
      if (expectedVersion !== v) {
        const { ConcurrencyConflictError } = await import('@/services/cases/ConcurrencyConflictError');
        throw new ConcurrencyConflictError(id, expectedVersion ?? -1, v);
      }
      h.cases[id] = { ...h.cases[id], ...updates, version: v + 1 };
    }),
  },
}));
vi.mock('@/utils/labels/dispatchSlideLabel', () => ({ dispatchSlideLabel: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/services/auditlog/mockAuditService', () => ({ mockAuditService: { logEvent: vi.fn(async () => undefined) } }));

import { processMicrotomyScan } from './useGlobalMaterialScanTracking';
import { dispatchSlideLabel } from '@/utils/labels/dispatchSlideLabel';

const caseAt = (version: number, extraStain?: any) => ({
  id: 'S26-7', version,
  specimens: [
    { id: 'sp-a', label: 'A', blocks: [{ id: 'b1', label: '1', stains: [{ id: 'st1', stainName: 'H&E', status: 'Pending Cut' }, ...(extraStain ? [extraStain] : [])] }] },
    { id: 'sp-b', label: 'B', blocks: [] },
  ],
});

describe('processMicrotomyScan — PS-71', () => {
  beforeEach(() => { h.saves.length = 0; h.beforeSave.length = 0; vi.mocked(dispatchSlideLabel).mockClear(); });

  it('saves with the version it read', async () => {
    h.cases = { 'S26-7': caseAt(2) };
    await processMicrotomyScan('S26-7', 'A', { level: 'block', blockNumber: '1' } as any, 'Microtomy / Sectioning', 'u1');
    expect(h.saves).toEqual([['S26-7', 2]]);
    expect(h.cases['S26-7'].specimens[0].blocks[0].stains[0].status).toBe('Cut & Placed');
  });

  it('a change saved by someone else in between is kept, and a slide added meanwhile (no label engraved) stays Pending Cut', async () => {
    h.cases = { 'S26-7': caseAt(2) };
    h.beforeSave.push(id => {
      const c = caseAt(3, { id: 'st2', stainName: 'PAS', status: 'Pending Cut' });
      c.specimens[1] = { ...c.specimens[1], description: 'theirs' } as any;
      h.cases[id] = c;
    });
    await processMicrotomyScan('S26-7', 'A', { level: 'block', blockNumber: '1' } as any, 'Microtomy / Sectioning', 'u1');
    expect(h.saves).toEqual([['S26-7', 2], ['S26-7', 3]]);
    const c = h.cases['S26-7'];
    expect(c.specimens[1].description).toBe('theirs');
    expect(c.specimens[0].blocks[0].stains.map((s: any) => s.status)).toEqual(['Cut & Placed', 'Pending Cut']);
    expect(dispatchSlideLabel).toHaveBeenCalledTimes(1);
  });
});
