// @vitest-environment happy-dom
// Batch 506 (PS-477): workstation settings keep their exact keys (settings
// saved before the helper existed are still found) and never throw.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { getWorkstationSetting, setWorkstationSetting, getWorkstationJson, setWorkstationJson } from './workstationSettings';

afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe('workstationSettings', () => {
  it('reads a value saved under the exact key, before this helper existed', () => {
    localStorage.setItem('pathscribe_current_scan_station_id', 'SS-7');
    expect(getWorkstationSetting('pathscribe_current_scan_station_id')).toBe('SS-7');
  });

  it('saves, and removes on null', () => {
    setWorkstationSetting('k', 'v');
    expect(localStorage.getItem('k')).toBe('v');
    setWorkstationSetting('k', null);
    expect(localStorage.getItem('k')).toBeNull();
  });

  it('JSON values round-trip; unreadable JSON gives the fallback', () => {
    setWorkstationJson('pedal', { left: 'next' });
    expect(getWorkstationJson('pedal', {})).toEqual({ left: 'next' });
    localStorage.setItem('pedal', '{not json');
    expect(getWorkstationJson('pedal', { none: true })).toEqual({ none: true });
  });

  it('blocked storage never throws', () => {
    const blocked = () => { throw new Error('blocked'); };
    const real = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: blocked, setItem: blocked, removeItem: blocked, clear: () => {} } });
    try {
      expect(getWorkstationSetting('x')).toBeNull();
      expect(() => setWorkstationSetting('x', '1')).not.toThrow();
      expect(getWorkstationJson('x', 5)).toBe(5);
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: real });
    }
  });
});
