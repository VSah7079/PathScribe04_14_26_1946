// @vitest-environment happy-dom
//
// src/hooks/useDraftCache.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real bug regression test, per direct report: "timeout worked, but no
// restore dialog appeared on re-entry." Traced precisely — the service
// call always succeeded; a redundant `checkedKeyRef` guard, meant to
// prevent re-checking, instead broke React 18 Strict Mode's mount →
// cleanup → re-mount cycle: the first invocation's promise resolved
// after being marked cancelled by its own cleanup, and the second,
// surviving invocation skipped calling getDraft() again entirely
// because the ref was already set. The draft was found and thrown
// away every time.
//
// The critical case here is rendering inside React.StrictMode — this
// app's real root (main.tsx) does exactly that, so a test that only
// renders normally would not have caught this regression; Strict Mode
// is what actually exposed the bug in the first place.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useDraftCache } from './useDraftCache';

const mockGetDraft = vi.fn();
vi.mock('@/services/drafts/mockDraftCacheService', () => ({
  mockDraftCacheService: {
    getDraft: (...args: unknown[]) => mockGetDraft(...args),
    saveDraft: vi.fn().mockResolvedValue({ ok: true }),
    clearDraft: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

describe('useDraftCache — real bug: draft found but never surfaced', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('surfaces an existing draft under normal rendering', async () => {
    mockGetDraft.mockResolvedValue({
      ok: true,
      data: { entityId: 'CASE-1', userId: 'USER-1', payload: { priority: 'STAT' }, savedAt: '2026-08-09T00:00:00Z' },
    });

    const { result } = renderHook(() => useDraftCache('USER-1', 'CASE-1', {}));

    await waitFor(() => expect(result.current.hasExistingDraft).toBe(true));
    expect(result.current.existingDraftPayload).toEqual({ priority: 'STAT' });
  });

  it('still surfaces an existing draft inside React.StrictMode — the exact condition that exposed the real bug', async () => {
    mockGetDraft.mockResolvedValue({
      ok: true,
      data: { entityId: 'CASE-1', userId: 'USER-1', payload: { priority: 'STAT' }, savedAt: '2026-08-09T00:00:00Z' },
    });

    const { result } = renderHook(() => useDraftCache('USER-1', 'CASE-1', {}), {
      wrapper: ({ children }) => React.createElement(React.StrictMode, null, children),
    });

    // Real assertion this bug violated: hasExistingDraft must become
    // true even though Strict Mode mounts, cleans up, and re-mounts
    // this effect once before settling.
    await waitFor(() => expect(result.current.hasExistingDraft).toBe(true));
    expect(result.current.existingDraftPayload).toEqual({ priority: 'STAT' });
  });

  it('does not surface anything when no draft exists', async () => {
    mockGetDraft.mockResolvedValue({ ok: true, data: null });

    const { result } = renderHook(() => useDraftCache('USER-1', 'CASE-1', {}), {
      wrapper: ({ children }) => React.createElement(React.StrictMode, null, children),
    });

    await new Promise(r => setTimeout(r, 50));
    expect(result.current.hasExistingDraft).toBe(false);
    expect(result.current.existingDraftPayload).toBeNull();
  });
});
