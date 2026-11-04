import { describe, it, expect, vi } from 'vitest';
import { openCaseForView, type OpenCaseForViewDeps } from './openCaseForView';

const CASE = { id: 'S26-1' } as any;
const deps = (over: Partial<OpenCaseForViewDeps> = {}): OpenCaseForViewDeps => ({
  getCase: vi.fn().mockResolvedValue(CASE),
  gate: vi.fn().mockResolvedValue({ granted: true, reason: null, detail: null }),
  session: () => ({ id: 'u1', role: 'pathologist' } as any),
  logUnavailable: vi.fn(),
  ...over,
});

describe('openCaseForView (Batch 396, privacy model rules 2 to 4)', () => {
  it('opens a case the reader may open', async () => {
    expect(await openCaseForView('S26-1', deps())).toEqual({ caseData: CASE });
  });

  it('a missing case, a refused case, a restricted case and an error all give the same answer', async () => {
    const missing = await openCaseForView('X', deps({ getCase: vi.fn().mockResolvedValue(undefined) }));
    const pediatric = await openCaseForView('S26-1', deps({ gate: vi.fn().mockResolvedValue({ granted: false, reason: 'pediatric', detail: 'under 18' }) }));
    const orchestration = await openCaseForView('S26-1', deps({ gate: vi.fn().mockResolvedValue({ granted: false, reason: 'orchestration', detail: 'no flag' }) }));
    const error = await openCaseForView('S26-1', deps({ getCase: vi.fn().mockRejectedValue(new Error('boom')) }));
    for (const r of [missing, pediatric, orchestration, error]) expect(r).toEqual({ caseData: null });
  });

  it('logs the real reason for support, never returns it', async () => {
    const d = deps({ gate: vi.fn().mockResolvedValue({ granted: false, reason: 'pediatric', detail: 'under 18' }) });
    const r = await openCaseForView(' S26-1 ', d);
    expect(d.logUnavailable).toHaveBeenCalledWith('S26-1', 'pediatric', 'under 18');
    expect(Object.keys(r)).toEqual(['caseData']);
  });

  it('an empty id opens nothing and asks nobody', async () => {
    const d = deps();
    expect(await openCaseForView('  ', d)).toEqual({ caseData: null });
    expect(d.getCase).not.toHaveBeenCalled();
  });
});
