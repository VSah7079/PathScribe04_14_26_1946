// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { useSystemStatus } from './useSystemStatus';
import type { IHealthStatusService } from '@/services';
import { HEALTH_RECHECK_AFTER_MS } from '@/services';

afterEach(cleanup);
const ok = (overall: 'operational' | 'degraded' | 'unavailable') => ({ ok: true as const, data: { overall, components: { database: overall, messaging: overall, queues: overall, interfaceEngine: overall }, checkedAt: 'x' } });
const setVisible = (v: 'visible' | 'hidden') => { Object.defineProperty(document, 'visibilityState', { value: v, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); };

describe('useSystemStatus', () => {
  it('shows checking, then the result; checks once on load and sets no timer', async () => {
    const check = vi.fn().mockResolvedValue(ok('operational'));
    const { result } = renderHook(() => useSystemStatus({ check } as IHealthStatusService));
    expect(result.current.kind).toBe('checking');
    await waitFor(() => expect(result.current.kind).toBe('operational'));
    expect(check).toHaveBeenCalledTimes(1);
  });

  it('uses no timer (source check)', () => {
    const src = readFileSync(join(__dirname, 'useSystemStatus.ts'), 'utf8').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
    expect(src).not.toMatch(/setInterval|setTimeout/);
  });

  it('a failed or throwing check shows statusUnavailable', async () => {
    const a = renderHook(() => useSystemStatus({ check: async () => ({ ok: false as const, error: 'E' }) }));
    await waitFor(() => expect(a.result.current.kind).toBe('statusUnavailable'));
    const b = renderHook(() => useSystemStatus({ check: () => Promise.reject(new Error('x')) }));
    await waitFor(() => expect(b.result.current.kind).toBe('statusUnavailable'));
  });

  it('re-checks when the tab becomes visible after 5 minutes, not before', async () => {
    let clock = 1_000;
    const check = vi.fn().mockResolvedValueOnce(ok('operational')).mockResolvedValueOnce(ok('degraded'));
    const svc = { check } as IHealthStatusService;
    const now = () => clock;
    const { result } = renderHook(() => useSystemStatus(svc, now));
    await waitFor(() => expect(result.current.kind).toBe('operational'));
    clock += HEALTH_RECHECK_AFTER_MS - 1;
    act(() => setVisible('visible'));
    expect(check).toHaveBeenCalledTimes(1);
    clock += 1;
    act(() => setVisible('hidden'));
    expect(check).toHaveBeenCalledTimes(1);
    act(() => setVisible('visible'));
    await waitFor(() => expect(result.current.kind).toBe('degraded'));
    expect(check).toHaveBeenCalledTimes(2);
  });
});
