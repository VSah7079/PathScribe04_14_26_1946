// @vitest-environment happy-dom
// src/services/batches/mockBatchService.readyForScreening.test.ts
// PS-71 (Batch 458): marking a Cytology Staining batch's slides Ready for
// Review is applied to the newest case and saved with its version.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ cases: {} as Record<string, any>, saves: [] as Array<[string, number | undefined]>, beforeSave: [] as Array<(id: string) => void>, alwaysConflict: { current: false } }));
vi.mock('../cases/CaseRouter', () => ({
  caseRouter: {
    getCase: vi.fn(async (id: string) => structuredClone(h.cases[id])),
    updateCase: vi.fn(async (id: string, updates: any, expectedVersion?: number) => {
      h.saves.push([id, expectedVersion]);
      h.beforeSave.splice(0).forEach(f => f(id));
      const v = h.cases[id].version ?? 0;
      if (h.alwaysConflict.current || expectedVersion !== v) {
        const { ConcurrencyConflictError } = await import('../cases/ConcurrencyConflictError');
        throw new ConcurrencyConflictError(id, expectedVersion ?? -1, v);
      }
      h.cases[id] = { ...h.cases[id], ...updates, version: v + 1 };
    }),
  },
}));
vi.mock('@/utils/resolveMaterialFromScan', () => ({
  resolveMaterialFromScan: vi.fn(async (displayId: string) => ({ caseData: h.cases.C1, specimenLetter: 'A', displayId })),
}));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent: vi.fn(async () => undefined) } }));

import { transitionSlidesToReadyForScreeningIfApplicable } from './mockBatchService';
import { mockAuditService } from '../auditlog/mockAuditService';

const stain = (displayId: string, status = 'Stained') => ({ id: displayId, displayId, status });
const batch = { masterBarcode: 'RACK-1', processingNode: 'Cytology Staining', items: [{ displayId: 'S1' }, { displayId: 'S2' }] } as any;

describe('transitionSlidesToReadyForScreeningIfApplicable — PS-71', () => {
  beforeEach(() => {
    h.saves.length = 0; h.beforeSave.length = 0; h.alwaysConflict.current = false;
    vi.mocked(mockAuditService.logEvent).mockClear();
    h.cases = { C1: { id: 'C1', version: 3, specimens: [{ label: 'A', blocks: [], decants: [{ id: 'd', stains: [stain('S1'), stain('S2'), stain('S3')] }] }] } };
  });

  it('one versioned save per case, both slides marked', async () => {
    await transitionSlidesToReadyForScreeningIfApplicable(batch);
    expect(h.saves).toEqual([['C1', 3]]);
    expect(h.cases.C1.specimens[0].decants[0].stains.map((s: any) => s.status)).toEqual(['Ready for Review', 'Ready for Review', 'Stained']);
  });

  it('a slide changed by someone else in between is kept (the change is re-applied to the newer case)', async () => {
    h.beforeSave.push(id => {
      const c = h.cases[id];
      c.specimens[0].decants[0].stains[2] = { ...stain('S3'), status: 'Recut' };
      c.version = 4;
    });
    await transitionSlidesToReadyForScreeningIfApplicable(batch);
    expect(h.saves).toEqual([['C1', 3], ['C1', 4]]);
    expect(h.cases.C1.specimens[0].decants[0].stains.map((s: any) => s.status)).toEqual(['Ready for Review', 'Ready for Review', 'Recut']);
  });

  it('when every try conflicts nothing is forced through and no success audit is written', async () => {
    h.alwaysConflict.current = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await transitionSlidesToReadyForScreeningIfApplicable(batch);
    expect(h.saves.every(([, v]) => typeof v === 'number')).toBe(true);
    expect(h.cases.C1.specimens[0].decants[0].stains[0].status).toBe('Stained');
    expect(mockAuditService.logEvent).not.toHaveBeenCalled();
  });
});
