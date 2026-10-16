// @vitest-environment happy-dom
//
// src/pages/GrossingScreenPage/hooks/useGrossingScreen.marginInk.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 481 (Structured Inking, Module 2; PS-359 follow-up). Covers
// handleRecordMarginInk's own real orchestration: it calls the real,
// capability-checked recordMarginInkApplication.ts (Batch 480) and, only on
// success, re-reads the case (that service doesn't hand back the updated
// case itself, unlike recordAutopsyOrganTag.ts) — mirrors this hook's own
// initial-load idiom rather than reconstructing the new margin locally.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/services/cases/CaseRouter', () => ({
  caseRouter: { updateCase: vi.fn().mockResolvedValue(undefined), getCase: vi.fn() },
}));

vi.mock('@/services', () => ({
  fieldRequirementService: { forSession: vi.fn().mockResolvedValue([]) },
  specimenDeficiencyService: { getByCaseId: vi.fn().mockResolvedValue({ ok: true, data: [] }) },
  // Structured Inking, Module 3 (PS-359 follow-up): the hook loads the active
  // ink-colour palette for the severity engine's display; empty is fine here.
  inkColorService: { getAll: vi.fn().mockResolvedValue({ ok: true, data: [] }) },
}));

const { recordMarginInkApplication } = vi.hoisted(() => ({ recordMarginInkApplication: vi.fn() }));
vi.mock('@/services/grossing/recordMarginInkApplication', () => ({ recordMarginInkApplication }));

import { caseRouter } from '@/services/cases/CaseRouter';
import { useGrossingScreen } from './useGrossingScreen';

function baseParams(overrides: any = {}) {
  const caseData = {
    id: 'CASE-1',
    specimens: [{ id: 'SP-1', label: 'A', blocks: [{ id: 'BLK-1', label: '1' }], processing: {} }],
    ...overrides.caseData,
  };
  const { caseData: _omit, ...restOverrides } = overrides;
  return {
    caseData,
    setCaseData: vi.fn(),
    signingUser: { id: 'USER-1', name: 'Dr. Reed' },
    knownVersionRef: { current: 1 },
    setConcurrencyConflict: vi.fn(),
    ...restOverrides,
  };
}

beforeEach(() => {
  recordMarginInkApplication.mockReset();
  vi.mocked(caseRouter.getCase).mockReset();
});

describe('useGrossingScreen — handleRecordMarginInk (Batch 481)', () => {
  it('calls the real service with the case id, the input, and the signing user’s name', async () => {
    recordMarginInkApplication.mockResolvedValue({ ok: true, marginId: 'margin-1' });
    vi.mocked(caseRouter.getCase).mockResolvedValue({ id: 'CASE-1', version: 2, specimens: [] } as any);
    const params = baseParams();
    const { result } = renderHook(() => useGrossingScreen(params as any));

    await act(async () => {
      await result.current.handleRecordMarginInk({ specimenId: 'SP-1', marginName: 'Deep', colorName: 'Blue', colorCode: '#0000FF', examined: true });
    });

    expect(recordMarginInkApplication).toHaveBeenCalledWith('CASE-1', expect.objectContaining({ specimenId: 'SP-1', marginName: 'Deep' }), 'Dr. Reed');
  });

  it('falls back to the signing user’s id when no real name is set', async () => {
    recordMarginInkApplication.mockResolvedValue({ ok: true, marginId: 'margin-1' });
    vi.mocked(caseRouter.getCase).mockResolvedValue({ id: 'CASE-1', version: 2, specimens: [] } as any);
    const params = baseParams({ signingUser: { id: 'USER-2' } });
    const { result } = renderHook(() => useGrossingScreen(params as any));

    await act(async () => {
      await result.current.handleRecordMarginInk({ specimenId: 'SP-1', marginName: 'Deep', colorName: 'Blue', colorCode: '#0000FF' });
    });

    expect(recordMarginInkApplication).toHaveBeenCalledWith('CASE-1', expect.anything(), 'USER-2');
  });

  it('on success, re-reads the case and hands it to setCaseData — never reconstructs the margin locally', async () => {
    recordMarginInkApplication.mockResolvedValue({ ok: true, marginId: 'margin-1' });
    const freshCase = { id: 'CASE-1', version: 2, specimens: [{ id: 'SP-1', label: 'A', margins: [{ id: 'margin-1' }] }] };
    vi.mocked(caseRouter.getCase).mockResolvedValue(freshCase as any);
    const params = baseParams();
    const { result } = renderHook(() => useGrossingScreen(params as any));

    await act(async () => {
      await result.current.handleRecordMarginInk({ specimenId: 'SP-1', marginName: 'Deep', colorName: 'Blue', colorCode: '#0000FF' });
    });

    expect(caseRouter.getCase).toHaveBeenCalledWith('CASE-1');
    expect(params.setCaseData).toHaveBeenCalledWith(freshCase);
    expect(params.knownVersionRef.current).toBe(2);
  });

  it('on failure, never re-reads the case and leaves knownVersionRef untouched', async () => {
    recordMarginInkApplication.mockResolvedValue({ ok: false, error: 'not permitted', notPermitted: true });
    const params = baseParams();
    const { result } = renderHook(() => useGrossingScreen(params as any));

    const outcome = await act(async () => result.current.handleRecordMarginInk({ specimenId: 'SP-1', marginName: 'Deep', colorName: 'Blue', colorCode: '#0000FF' }));

    expect(caseRouter.getCase).not.toHaveBeenCalled();
    expect(params.setCaseData).not.toHaveBeenCalled();
    expect(params.knownVersionRef.current).toBe(1);
    expect(outcome).toEqual({ ok: false, error: 'not permitted', notPermitted: true });
  });

  it('with no case loaded at all, is a real, honest no-op that never calls the service', async () => {
    const params = baseParams();
    params.caseData = null;
    const { result } = renderHook(() => useGrossingScreen(params as any));

    const outcome = await result.current.handleRecordMarginInk({ specimenId: 'SP-1', marginName: 'Deep', colorName: 'Blue', colorCode: '#0000FF' });

    expect(recordMarginInkApplication).not.toHaveBeenCalled();
    expect(outcome.ok).toBe(false);
  });
});
