// Batch 430: settings that belong to a person, not the browser.
import { describe, expect, it, beforeEach, vi } from 'vitest';

const store = new Map<string, unknown>();
vi.mock('../mockStorage', () => ({
  storageGet: (k: string, f: unknown) => (store.has(k) ? store.get(k) : f),
  storageSet: (k: string, v: unknown) => { store.set(k, v); },
  storageClear: (k: string) => { store.delete(k); },
}));
vi.mock('../auth/caseAccessControl', () => ({ getSessionUser: () => null }));

import { clearPersonalSetting, getPersonalSetting, personalSettingKey, setPersonalSetting } from './personalSettings';

beforeEach(() => store.clear());

describe('personal settings (Batch 430)', () => {
  const asUser = (id?: string, legacy: Record<string, string> = {}) => ({ userId: () => id, readLegacy: (k: string) => legacy[k] ?? null });

  it('each person has their own value', () => {
    setPersonalSetting('accent', 'en-GB', asUser('u1'));
    setPersonalSetting('accent', 'fr-FR', asUser('u2'));
    expect(getPersonalSetting('accent', 'en-US', raw => raw, asUser('u1'))).toBe('en-GB');
    expect(getPersonalSetting('accent', 'en-US', raw => raw, asUser('u2'))).toBe('fr-FR');
    expect(getPersonalSetting('accent', 'en-US', raw => raw, asUser('u3'))).toBe('en-US');
  });
  it('the old shared value carries over to a person once, then their own value wins', () => {
    const legacy = { 'ps_dictation_corrections': JSON.stringify({ a: 'b' }) };
    expect(getPersonalSetting('ps_dictation_corrections', {}, undefined, asUser('u1', legacy))).toEqual({ a: 'b' });
    expect(store.get(personalSettingKey('ps_dictation_corrections', 'u1'))).toEqual({ a: 'b' });
    setPersonalSetting('ps_dictation_corrections', { a: 'c' }, asUser('u1'));
    expect(getPersonalSetting('ps_dictation_corrections', {}, undefined, asUser('u1', legacy))).toEqual({ a: 'c' });
  });
  it('clearing removes only that person\'s value', () => {
    setPersonalSetting('k', 1, asUser('u1'));
    setPersonalSetting('k', 2, asUser('u2'));
    clearPersonalSetting('k', asUser('u1'));
    expect(getPersonalSetting('k', 0, undefined, asUser('u1'))).toBe(0);
    expect(getPersonalSetting('k', 0, undefined, asUser('u2'))).toBe(2);
  });
});
