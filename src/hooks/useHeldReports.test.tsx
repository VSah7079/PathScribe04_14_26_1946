// @vitest-environment happy-dom
// src/hooks/useHeldReports.test.tsx (Batch 561)
// Batch 560 made the held reports banner wait for live updates rather than read every 5 seconds, so a slow
// answer for the previous case could have stayed on screen. It no longer can.
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const list = vi.hoisted(() => vi.fn());
vi.mock('@/services/reportRelease/releaseThroughDelay', () => ({ listHeldReports: list, recallHeldReport: vi.fn() }));

import { useHeldReports } from './useHeldReports';

describe('useHeldReports (Batch 561)', () => {
  it('drops a slow answer for a case no longer shown, and clears the list when the case changes', async () => {
    let answerA!: (v: unknown[]) => void;
    let answerB!: (v: unknown[]) => void;
    list.mockImplementation((caseId: string) => new Promise(r => { if (caseId === 'A') answerA = r; else answerB = r; }));
    const { result, rerender } = renderHook(({ c }) => useHeldReports(c, null), { initialProps: { c: 'A' } });
    await waitFor(() => expect(answerA).toBeDefined());
    answerA([{ id: 'hA' }]);
    await waitFor(() => expect(result.current.held).toEqual([{ id: 'hA' }]));
    answerA = undefined as never;
    list.mockImplementation((caseId: string) => new Promise(r => { if (caseId === 'A') answerA = r; else answerB = r; }));
    rerender({ c: 'B' });
    expect(result.current.held).toEqual([]); // cleared at once, not the previous case's
    answerB([{ id: 'hB' }]);
    await waitFor(() => expect(result.current.held).toEqual([{ id: 'hB' }]));
    // A slow answer for A (a read started before the switch) never replaces B's.
    list.mockImplementationOnce(() => new Promise(r => { answerA = r; }));
    rerender({ c: 'A' });
    rerender({ c: 'B' });
    answerA?.([{ id: 'late-A' }]);
    await new Promise(r => setTimeout(r, 0));
    expect(result.current.held).not.toEqual([{ id: 'late-A' }]);
  });

  it('no case: nothing held, nothing read', async () => {
    list.mockClear();
    const { result } = renderHook(() => useHeldReports(null, null));
    expect(result.current.held).toEqual([]);
    expect(list).not.toHaveBeenCalled();
  });
});
