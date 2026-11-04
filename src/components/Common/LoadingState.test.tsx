// @vitest-environment happy-dom
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
import { LoadingState } from './LoadingState';
import { PageLoader } from './PageLoader';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });

// Batch 548 (PS-539 phase 2d, readiness review §8).
describe('LoadingState', () => {
  it('nothing for 300 ms, then the screen\'s own text, then "still working" from 3 s', () => {
    render(<LoadingState label="Loading equipment…" />);
    expect(screen.queryByText('Loading equipment…')).toBeNull();
    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite');
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.getByText('Loading equipment…')).toBeTruthy();
    expect(screen.queryByText('loadingState.slow')).toBeNull();
    act(() => { vi.advanceTimersByTime(2_700); });
    expect(screen.getByText('loadingState.slow')).toBeTruthy();
  });
});

describe('PageLoader', () => {
  it('no spinner for a quick page; "still loading" after 3 s', () => {
    const { container } = render(<PageLoader />);
    expect(container.querySelector('.ps-app-loader-spinner')).toBeNull();
    act(() => { vi.advanceTimersByTime(300); });
    expect(container.querySelector('.ps-app-loader-spinner')).not.toBeNull();
    act(() => { vi.advanceTimersByTime(2_700); });
    expect(screen.getByText('loadingState.slowPage')).toBeTruthy();
  });
});
