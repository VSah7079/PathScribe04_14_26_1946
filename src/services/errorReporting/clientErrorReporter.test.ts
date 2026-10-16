import { describe, it, expect, vi } from 'vitest';
import { createClientErrorReporter, errorLogEntryFor, installGlobalErrorHandlers, newErrorReference } from './clientErrorReporter';

function make(now = { t: 0 }) {
  const sink = vi.fn();
  let n = 0;
  const reporter = createClientErrorReporter({ sinks: [sink], now: () => now.t, pathname: () => '/case/S26-1/synoptic', newReference: () => `ERR-${++n}` });
  return { reporter, sink, now };
}

describe('clientErrorReporter (Batch 502, PS-472)', () => {
  it('reports a scrubbed error with a reference, the source and the boundary', () => {
    const { reporter, sink } = make();
    expect(reporter.report(new TypeError("Cannot read 'x' of Jane 12345"), 'render', 'route')).toBe('ERR-1');
    expect(sink).toHaveBeenCalledWith(expect.objectContaining({ reference: 'ERR-1', source: 'render', boundary: 'route', name: 'TypeError', message: 'Cannot read … of … #', route: '/case/:id/synoptic' }));
  });

  it('the same error is reported once a minute at most, and 25 per page load', () => {
    const { reporter, sink, now } = make();
    reporter.report(new Error('a'), 'render');
    expect(reporter.report(new Error('a'), 'render')).toBeNull();
    now.t = 61_000;
    expect(reporter.report(new Error('a'), 'render')).not.toBeNull();
    for (let i = 0; i < 40; i++) reporter.report(new Error(`e${'x'.repeat(i)}`), 'render');
    expect(sink).toHaveBeenCalledTimes(25);
  });

  it('the same error object is reported once, whoever reports it', () => {
    const { reporter, sink } = make();
    const e = new Error('once');
    reporter.report(e, 'render', 'app');
    expect(reporter.report(e, 'window-error')).toBeNull();
    expect(sink).toHaveBeenCalledTimes(1);
  });

  it('a window error matching a crash a boundary just reported is not reported again', () => {
    const { reporter, sink, now } = make();
    reporter.report(new Error('same'), 'render', 'route');
    expect(reporter.report(new Error('same'), 'window-error')).toBeNull();
    now.t = 6_000;
    expect(reporter.report(new Error('same'), 'window-error')).not.toBeNull();
    expect(sink).toHaveBeenCalledTimes(2);
  });

  it('a failing sink never breaks reporting', () => {
    const reporter = createClientErrorReporter({ sinks: [() => { throw new Error('sink down'); }, () => Promise.reject(new Error('async down'))], now: () => 0, pathname: () => '/', newReference: () => 'R' });
    expect(() => reporter.report(new Error('x'), 'render')).not.toThrow();
  });

  it('the Error Log entry names the reference, kind and route; never a case id', () => {
    const entry = errorLogEntryFor({ reference: 'ERR-1', source: 'unhandled-rejection', name: 'Error', message: 'm', stack: [], route: '/worklist', at: '' });
    expect(entry).toEqual({ severity: 'error', code: 'CLIENT_UNHANDLED_REJECTION', message: '[ERR-1] Error: m', source: 'browser /worklist', caseId: null });
  });

  it('global handlers report window errors and unhandled rejections, and can be removed', () => {
    const listeners: Record<string, (e: unknown) => void> = {};
    const win = { addEventListener: (k: string, f: never) => { listeners[k] = f; }, removeEventListener: vi.fn() } as never;
    const report = vi.fn();
    const remove = installGlobalErrorHandlers(win, { report } as never);
    vi.useFakeTimers();
    listeners.error({ error: new Error('w') });
    listeners.unhandledrejection({ reason: 'r' });
    vi.runAllTimers();
    vi.useRealTimers();
    expect(report).toHaveBeenNthCalledWith(1, expect.any(Error), 'window-error');
    expect(report).toHaveBeenNthCalledWith(2, 'r', 'unhandled-rejection');
    remove();
    expect((win as { removeEventListener: ReturnType<typeof vi.fn> }).removeEventListener).toHaveBeenCalledTimes(2);
  });

  it('a reference is short and readable', () => {
    expect(newErrorReference(() => 0)).toBe('ERR-AAAA-AAAA');
    expect(newErrorReference()).toMatch(/^ERR-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });
});
