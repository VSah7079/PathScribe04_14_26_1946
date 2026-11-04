// @vitest-environment happy-dom
// Batch 525 (PS-485): no patient data in browser storage on a server deployment.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { browserMayKeepData, setDataMayPersistInBrowserForTests } from './browserDataPolicy';
import { MemoryStorage, dataStorage, storageKeys, tabDataStorage } from './dataStorage';
import { LOCAL_KEEP, SESSION_KEEP, isKept, keysToRemove, removeBrowserDataCopies } from './browserKeepList';
import { minimalSessionProfile, readSessionProfile, writeSessionProfile, SESSION_PROFILE_STORAGE_KEY, type SessionProfile } from '../auth/sessionProfile';

const PROFILE: SessionProfile = {
  id: 'PATH-001', name: 'Dr. Sarah Johnson', email: 'sjohnson@example.org', role: 'pathologist', initials: 'SJ', voiceProfile: 'EN-US' as never,
  credentials: 'MD, FCAP', signatureUrl: 'https://dms.hospital.example/sig/sj.png', firstName: 'Sarah', lastName: 'Johnson',
  canViewPediatric: true, canViewOrchestration: true, canAccessCrossTenantQa: false, organisationId: 'org-1', authMethod: 'password',
};

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(() => { setDataMayPersistInBrowserForTests(null); writeSessionProfile(null); localStorage.clear(); sessionStorage.clear(); });

describe('the policy', () => {
  it('keeps data in the browser only when there is no API server (the demo)', () => {
    expect(browserMayKeepData(false)).toBe(true);
    expect(browserMayKeepData(true)).toBe(false);
  });
});

describe('dataStorage and tabDataStorage', () => {
  it('in the demo, are the browser’s own storage', () => {
    setDataMayPersistInBrowserForTests(true);
    dataStorage.setItem('cases', '[1]');
    tabDataStorage.setItem('pathscribe:lastSearch', '{"q":"Ruiz"}');
    expect(localStorage.getItem('cases')).toBe('[1]');
    expect(sessionStorage.getItem('pathscribe:lastSearch')).toBe('{"q":"Ruiz"}');
  });

  it('on a server deployment, hold everything in memory and write nothing to the browser', () => {
    setDataMayPersistInBrowserForTests(false);
    dataStorage.setItem('cases', '[1]');
    tabDataStorage.setItem('pathscribe:lastSearch', '{"q":"Ruiz"}');
    expect(dataStorage.getItem('cases')).toBe('[1]');
    expect(storageKeys(dataStorage)).toEqual(['cases']);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    dataStorage.removeItem('cases');
    expect(dataStorage.getItem('cases')).toBeNull();
  });

  it('MemoryStorage behaves as a Storage', () => {
    const m = new MemoryStorage();
    m.setItem('a', '1'); m.setItem('b', '2');
    expect([m.length, m.key(0), m.getItem('b'), m.getItem('z')]).toEqual([2, 'a', '2', null]);
    m.clear();
    expect(m.length).toBe(0);
  });
});

describe('the start-up clean-up', () => {
  it('keeps preferences, workstation settings and the session; everything else goes', () => {
    expect(isKept('ps_ui_worklistFilters', LOCAL_KEEP)).toBe(true);
    expect(isKept('pathscribe_current_scan_station_id', LOCAL_KEEP)).toBe(true);
    expect(isKept('pathscribe-user', LOCAL_KEEP)).toBe(true);
    expect(isKept('pathscribe.sso.microsoft.user', SESSION_KEEP)).toBe(true);
    expect(keysToRemove(['cases', 'orch_cases_v3', 'pathscribe_drafts', 'pathscribe_mock_patientHistoryCache', 'ps_case_masks_v1',
      'pathscribe_mock_cytologyQcCaseAssignments', 'pathscribe_language', 'ps_ui_theme'], LOCAL_KEEP))
      .toEqual(['cases', 'orch_cases_v3', 'pathscribe_drafts', 'pathscribe_mock_patientHistoryCache', 'ps_case_masks_v1', 'pathscribe_mock_cytologyQcCaseAssignments']);
  });

  it('on a server deployment removes the old clinical copies from both areas; in the demo removes nothing', () => {
    localStorage.setItem('cases', '[]');
    localStorage.setItem('pathscribe_mock_orch_cases_v3', '[]');
    localStorage.setItem('ps_ui_theme', '"dark"');
    sessionStorage.setItem('pathscribe:lastSearch', '{}');
    sessionStorage.setItem('pathscribe_own_session_id', 'x');
    expect(removeBrowserDataCopies(undefined, true)).toBe(0);
    expect(localStorage.length).toBe(3);
    expect(removeBrowserDataCopies(undefined, false)).toBe(3);
    expect(storageKeys(localStorage)).toEqual(['ps_ui_theme']);
    expect(storageKeys(sessionStorage)).toEqual(['pathscribe_own_session_id']);
  });
});

describe('the session profile', () => {
  it('in the demo, the whole profile is stored, as before', () => {
    setDataMayPersistInBrowserForTests(true);
    writeSessionProfile(PROFILE);
    expect(JSON.parse(localStorage.getItem(SESSION_PROFILE_STORAGE_KEY)!)).toEqual(PROFILE);
  });

  it('on a server deployment, only who and how is stored; the rest stays in memory for the tab', () => {
    setDataMayPersistInBrowserForTests(false);
    writeSessionProfile(PROFILE);
    const stored = JSON.parse(localStorage.getItem(SESSION_PROFILE_STORAGE_KEY)!);
    expect(stored).toEqual(minimalSessionProfile(PROFILE));
    expect(Object.keys(stored).sort()).toEqual(['authMethod', 'email', 'id', 'initials', 'name', 'role', 'voiceProfile']);
    expect(JSON.stringify(stored)).not.toContain('base64');
    expect(readSessionProfile()).toEqual(PROFILE);
  });

  it('a sign-out or a different person in another tab wins over this tab’s copy', () => {
    setDataMayPersistInBrowserForTests(false);
    writeSessionProfile(PROFILE);
    localStorage.removeItem(SESSION_PROFILE_STORAGE_KEY);
    expect(readSessionProfile()).toBeNull();
    writeSessionProfile(PROFILE);
    localStorage.setItem(SESSION_PROFILE_STORAGE_KEY, JSON.stringify({ id: 'ADMIN-1', name: 'Admin', role: 'admin' }));
    expect(readSessionProfile()?.id).toBe('ADMIN-1');
  });
});

describe('a case worked on a server deployment leaves nothing in browser storage', () => {
  it('cases, drafts, patient history, case masks and cytology QC assignments stay in memory', async () => {
    vi.resetModules();
    const policy = await import('./browserDataPolicy');
    policy.setDataMayPersistInBrowserForTests(false);
    try {
      const { mockCaseService } = await import('../cases/mockCaseService');
      const { mockDraftCacheService } = await import('../drafts/mockDraftCacheService');
      const { mockPatientHistoryCacheService } = await import('../patientHistory/mockPatientHistoryCacheService');
      const { mockCytologyQcCaseAssignmentService } = await import('../cytologyQc/mockCytologyQcCaseAssignmentService');
      const { storageGet, storageSet } = await import('../mockStorage');

      const all = await mockCaseService.getAll();
      expect(all.ok && all.data.length).toBeGreaterThan(0);
      await mockDraftCacheService.saveDraft('PATH-001', 'S26-4401', { text: 'Invasive ductal carcinoma' });
      await mockPatientHistoryCacheService.ensurePending('S26-4401', 'P-1');
      await mockCytologyQcCaseAssignmentService.getAll?.();
      storageSet('ps_case_masks_v1', [{ scopeType: 'global' }]);
      expect(storageGet('ps_case_masks_v1', null)).toEqual([{ scopeType: 'global' }]);

      // Only kept, non-clinical keys (the language, set by i18n) may be there.
      expect(keysToRemove(storageKeys(localStorage), LOCAL_KEEP)).toEqual([]);
      expect(keysToRemove(storageKeys(sessionStorage), SESSION_KEEP)).toEqual([]);
      expect(storageKeys(localStorage).some(k => /case|draft|history|mask|cytology/i.test(k))).toBe(false);
    } finally {
      policy.setDataMayPersistInBrowserForTests(null);
      vi.resetModules();
    }
  });
});

describe('control: the same work in the demo does keep its data in the browser', () => {
  it('so the server-deployment test above would catch a store that bypassed dataStorage', async () => {
    vi.resetModules();
    const policy = await import('./browserDataPolicy');
    policy.setDataMayPersistInBrowserForTests(true);
    try {
      const { mockDraftCacheService } = await import('../drafts/mockDraftCacheService');
      await mockDraftCacheService.saveDraft('PATH-001', 'S26-4401', { text: 'x' });
      expect(storageKeys(localStorage)).toContain('pathscribe_mock_pathscribe_drafts');
    } finally {
      policy.setDataMayPersistInBrowserForTests(null);
      vi.resetModules();
    }
  });
});
