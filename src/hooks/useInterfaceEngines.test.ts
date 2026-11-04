// @vitest-environment happy-dom
// src/hooks/useInterfaceEngines.test.ts (Batch 554)
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('@/services', () => ({ interfaceMonitoringService: { viaServer: false } }));
import { useInterfaceEngines } from './useInterfaceEngines';

const ok = (id: string) => ({ ok: true as const, data: { serverTime: '2026-10-14T12:00:00.000Z', engines: [{ engineInstanceId: id, hosting: 'cloud' as const }] } });
afterEach(() => { vi.useRealTimers(); });

describe('useInterfaceEngines', () => {
  it('reads every minute while enabled, and stops when disabled or unmounted', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const service = { viaServer: true, engines: vi.fn(async () => ok('e1')) };
    const { result, rerender, unmount } = renderHook(({ on }) => useInterfaceEngines(service, on), { initialProps: { on: true } });
    await waitFor(() => expect(result.current.views?.length).toBe(1));
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(service.engines).toHaveBeenCalledTimes(2);
    rerender({ on: false });
    await act(async () => { vi.advanceTimersByTime(120_000); });
    expect(service.engines).toHaveBeenCalledTimes(2);
    unmount();
  });

  it('a slower earlier answer never overwrites a newer one', async () => {
    let slow: (v: unknown) => void = () => undefined;
    const service = { viaServer: true, engines: vi.fn().mockImplementationOnce(() => new Promise(r => { slow = r; })).mockImplementation(async () => ok('new')) };
    const { result } = renderHook(() => useInterfaceEngines(service as never));
    await act(async () => { await result.current.reload(); });
    expect(result.current.views?.[0].engine.engineInstanceId).toBe('new');
    await act(async () => { slow(ok('old')); });
    expect(result.current.views?.[0].engine.engineInstanceId).toBe('new');
  });

  it('a refusal clears what was shown; a failed read keeps it, with the problem', async () => {
    const service = { viaServer: true, engines: vi.fn(async () => ok('e1')) };
    const { result } = renderHook(() => useInterfaceEngines(service as never));
    await waitFor(() => expect(result.current.views?.length).toBe(1));
    service.engines.mockResolvedValueOnce({ ok: false, error: 'UNAVAILABLE' } as never);
    await act(async () => { await result.current.reload(); });
    expect([result.current.problem, result.current.views?.length]).toEqual(['UNAVAILABLE', 1]);
    service.engines.mockResolvedValueOnce({ ok: false, error: 'NOT_PERMITTED' } as never);
    await act(async () => { await result.current.reload(); });
    expect([result.current.problem, result.current.views]).toEqual(['NOT_PERMITTED', null]);
  });

  it('nothing is read in the demo', () => {
    const service = { viaServer: false, engines: vi.fn() };
    renderHook(() => useInterfaceEngines(service as never));
    expect(service.engines).not.toHaveBeenCalled();
  });
});
