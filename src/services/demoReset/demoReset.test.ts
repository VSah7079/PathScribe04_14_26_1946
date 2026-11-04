// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { resetAllDemoData, keptThroughReset } from './demoReset';

describe('resetAllDemoData (PS-356)', () => {
  it('refuses without config:demo-data:reset, and clears nothing', async () => {
    localStorage.setItem('pathscribe_mock_cases', '[1]');
    const checks: string[] = [];
    const res = await resetAllDemoData({ authorization: { enforce: async (c: string) => { checks.push(c); return { capability: c, allowed: false, grantedBy: [], missingRequirements: [], context: {} }; } } });
    expect(res).toEqual({ ok: false, reason: 'notPermitted' });
    expect(checks).toEqual(['config:demo-data:reset']);
    expect(localStorage.getItem('pathscribe_mock_cases')).toBe('[1]');
  });
  it('clears with it', async () => {
    localStorage.setItem('pathscribe_mock_cases', '[1]');
    const res = await resetAllDemoData({ authorization: { enforce: async (c: string) => ({ capability: c, allowed: true, grantedBy: [], missingRequirements: [], context: {} }) } });
    expect(res.ok).toBe(true);
    expect(localStorage.getItem('pathscribe_mock_cases')).toBeNull();
  });
  it('keeps the audit trails, which the mock services store under the mock prefix (Batch 372)', async () => {
    localStorage.setItem('pathscribe_mock_pathscribe_audit_logs', '[1]');
    localStorage.setItem('pathscribe_mock_pathscribe_support_audit', '{}');
    localStorage.setItem('pathscribe_mock_pathscribe_support_access_requests', '[1]');
    const res = await resetAllDemoData({ authorization: { enforce: async (c: string) => ({ capability: c, allowed: true, grantedBy: [], missingRequirements: [], context: {} }) } });
    expect(res.ok).toBe(true);
    expect(localStorage.getItem('pathscribe_mock_pathscribe_audit_logs')).toBe('[1]');
    expect(localStorage.getItem('pathscribe_mock_pathscribe_support_audit')).toBe('{}');
    expect(localStorage.getItem('pathscribe_mock_pathscribe_support_access_requests')).toBeNull();
    expect(keptThroughReset('ps_ai_audit_log_v1')).toBe(true);
    expect(keptThroughReset('pathscribe_mock_cases')).toBe(false);
  });
  it('clears every screen display preference (Batch 508), and still keeps the companion-window positions', async () => {
    for (const k of ['ps_ui_worklistFilters', 'ps_ui_pageSize', 'ps_ui_editorTheme', 'ps_ui_worklist_pool_collapse_u1', 'ps_ui_reportTabWidth']) localStorage.setItem(k, '1');
    localStorage.setItem('ps-companion-window-geometry-user-guide', '{"left":1}');
    const res = await resetAllDemoData({ authorization: { enforce: async (c: string) => ({ capability: c, allowed: true, grantedBy: [], missingRequirements: [], context: {} }) } });
    expect(res.ok).toBe(true);
    expect(Object.keys(localStorage).filter(k => k.startsWith('ps_ui_'))).toEqual([]);
    expect(localStorage.getItem('ps-companion-window-geometry-user-guide')).toBe('{"left":1}');
  });
  it('clears the workstation setup (scan station, OR terminal, display profile, foot pedal) and keeps only the guide-window positions', async () => {
    const workstation = {
      pathscribe_current_scan_station_id: 'SS-1',
      pathscribe_scan_station_prompted: '1',
      pathscribe_current_or_terminal_id: 'OR-3',
      pathscribe_current_display_profile_id: 'DP-2',
      pathscribe_footpedal_bindings: '{"left":"next"}',
    };
    for (const [k, v] of Object.entries(workstation)) localStorage.setItem(k, v);
    localStorage.setItem('ps-companion-window-geometry-admin-guide', '{"left":40,"top":40,"width":900,"height":700}');
    const res = await resetAllDemoData({ authorization: { enforce: async (c: string) => ({ capability: c, allowed: true, grantedBy: [], missingRequirements: [], context: {} }) } });
    expect(res.ok).toBe(true);
    for (const k of Object.keys(workstation)) expect(localStorage.getItem(k), k).toBeNull();
    expect(localStorage.getItem('ps-companion-window-geometry-admin-guide')).toBe('{"left":40,"top":40,"width":900,"height":700}');
  });
});
