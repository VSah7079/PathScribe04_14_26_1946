import { describe, expect, it } from 'vitest';
import { shouldIgnoreScanKeyEvent } from './scanKeyFilter';

describe('shouldIgnoreScanKeyEvent', () => {
  it('accepts a trusted key event (a real scanner or keyboard)', () => {
    expect(shouldIgnoreScanKeyEvent({ key: 'A', isTrusted: true })).toBe(false);
    expect(shouldIgnoreScanKeyEvent({ key: 'Enter', isTrusted: true })).toBe(false);
  });

  it('ignores an untrusted (script-dispatched) event even when it has a key', () => {
    expect(shouldIgnoreScanKeyEvent({ key: 'A', isTrusted: false })).toBe(true);
    expect(shouldIgnoreScanKeyEvent({ key: 'Enter', isTrusted: false })).toBe(true);
  });

  it('ignores a real synthetic KeyboardEvent built by script', () => {
    if (typeof KeyboardEvent === 'undefined') return; // node environment
    const ev = new KeyboardEvent('keydown', { key: '1' });
    expect(ev.isTrusted).toBe(false);
    expect(shouldIgnoreScanKeyEvent(ev)).toBe(true);
  });

  it('ignores events with no key (some password managers and autofill)', () => {
    expect(shouldIgnoreScanKeyEvent({ key: '', isTrusted: true })).toBe(true);
    expect(shouldIgnoreScanKeyEvent(null)).toBe(true);
    expect(shouldIgnoreScanKeyEvent(undefined)).toBe(true);
  });

  it('accepts untrusted events only through the explicit test seam', () => {
    expect(shouldIgnoreScanKeyEvent({ key: 'A', isTrusted: false }, { acceptUntrusted: true })).toBe(false);
    expect(shouldIgnoreScanKeyEvent({ key: '', isTrusted: false }, { acceptUntrusted: true })).toBe(true);
  });
});
