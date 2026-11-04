// @vitest-environment happy-dom
//
// src/services/browserCleanup/retiredBrowserKeys.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { removeRetiredBrowserKeys } from './retiredBrowserKeys';

describe('removeRetiredBrowserKeys (Batch 431)', () => {
  beforeEach(() => localStorage.clear());

  it('removes old AI draft copies and access-requested markers, and nothing else', () => {
    localStorage.setItem('ps_orch_sections_O26-1', '[{"id":"a"}]');
    localStorage.setItem('ps_orch_sections_O26-2', '[]');
    localStorage.setItem('pathscribe_pool_access_requested', '["GI"]');
    localStorage.setItem('pathscribe_ped_requested', '["c1"]');
    localStorage.setItem('pathscribe_orch_requested', '["c2"]');
    localStorage.setItem('pathscribe_current_scan_station_id', 'ss-1');
    localStorage.setItem('ps_ui_reportTabWidth', '320');

    expect(removeRetiredBrowserKeys(localStorage)).toBe(5);
    expect(Object.keys(localStorage).sort()).toEqual(['pathscribe_current_scan_station_id', 'ps_ui_reportTabWidth']);
  });

  it('does nothing without storage', () => {
    expect(removeRetiredBrowserKeys(undefined)).toBe(0);
  });
});
