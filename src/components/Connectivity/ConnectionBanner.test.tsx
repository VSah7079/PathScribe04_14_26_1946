// @vitest-environment happy-dom
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
const live = vi.hoisted(() => {
  let state = 'idle';
  const listeners = new Set<(s: string) => void>();
  return {
    service: {
      transport: 'signalr',
      getState: () => state,
      retryNow: () => { live.retried += 1; },
      onStateChange: (l: (s: string) => void) => { listeners.add(l); return () => listeners.delete(l); },
    },
    retried: 0,
    set(s: string) { state = s; listeners.forEach(l => l(s)); },
  };
});
vi.mock('@/services/liveUpdates/liveUpdateService', () => ({ liveUpdateService: live.service }));

import { ConnectionBanner } from './ConnectionBanner';

beforeEach(() => { vi.useFakeTimers(); live.set('idle'); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

// Batch 548 (PS-539 phase 2d): the app-wide connection banner.
describe('ConnectionBanner', () => {
  it('shows nothing while the hub is idle or live', () => {
    render(<ConnectionBanner />);
    act(() => live.set('live'));
    expect(screen.queryByText(/connectionBanner\./)).toBeNull();
  });

  it('a drop shorter than 2 s shows nothing', () => {
    render(<ConnectionBanner />);
    act(() => live.set('reconnecting'));
    act(() => { vi.advanceTimersByTime(1_500); });
    act(() => live.set('live'));
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(screen.queryByText(/connectionBanner\./)).toBeNull();
  });

  it('a longer drop shows "reconnecting", then "reconnected" for 4 s once back, then nothing', () => {
    render(<ConnectionBanner />);
    act(() => live.set('reconnecting'));
    act(() => { vi.advanceTimersByTime(2_100); });
    expect(screen.getByText('connectionBanner.reconnecting.title')).toBeTruthy();
    act(() => live.set('live'));
    expect(screen.getByText('connectionBanner.reconnected.title')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(4_100); });
    expect(screen.queryByText(/connectionBanner\./)).toBeNull();
  });

  it('the browser losing its network shows "offline"', () => {
    render(<ConnectionBanner />);
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    act(() => { window.dispatchEvent(new Event('offline')); });
    act(() => { vi.advanceTimersByTime(2_100); });
    expect(screen.getByText('connectionBanner.offline.title')).toBeTruthy();
    online.mockRestore();
    // Batch 549: the network back makes the hub try at once.
    const before = live.retried;
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(live.retried).toBe(before + 1);
  });

  it('a drop that comes back while "reconnected" still shows is shown again at once (no flicker)', () => {
    render(<ConnectionBanner />);
    act(() => live.set('reconnecting'));
    act(() => { vi.advanceTimersByTime(2_100); });
    act(() => live.set('live'));
    act(() => live.set('reconnecting'));
    expect(screen.getByText('connectionBanner.reconnecting.title')).toBeTruthy();
  });

  it('never says "reconnected" when the hub just closes (idle) rather than coming back', () => {
    render(<ConnectionBanner />);
    act(() => live.set('reconnecting'));
    act(() => { vi.advanceTimersByTime(2_100); });
    act(() => live.set('idle'));
    expect(screen.queryByText(/connectionBanner\./)).toBeNull();
  });

  it('is announced politely, never a window to dismiss', () => {
    render(<ConnectionBanner />);
    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
