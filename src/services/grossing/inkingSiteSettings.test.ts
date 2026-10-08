import { describe, it, expect, vi, beforeEach } from 'vitest';

const { enforce } = vi.hoisted(() => ({ enforce: vi.fn() }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce } }));

// This project's vitest environment is plain Node, not jsdom, so there's no
// global `localStorage` — polyfill it here the same way
// src/services/abnormalDetection/abnormalTriggerRuleService.test.ts does.
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); },
};

import { getInkingValidationMode, setInkingValidationMode } from './inkingSiteSettings';

beforeEach(() => {
  localStorage.clear();
  enforce.mockReset();
  enforce.mockResolvedValue({ allowed: true });
});

describe('inkingSiteSettings', () => {
  it('defaults to WARN_ONLY for a site with nothing saved', () => {
    expect(getInkingValidationMode('site-1')).toBe('WARN_ONLY');
  });

  it('a person without config:inking-validation-mode:manage cannot change it, and nothing is saved', async () => {
    enforce.mockResolvedValue({ allowed: false });
    const result = await setInkingValidationMode('site-1', 'STRICT_ENFORCE');
    expect(result).toEqual({ ok: false, notPermitted: true });
    expect(getInkingValidationMode('site-1')).toBe('WARN_ONLY');
  });

  it('sets and reads back the mode for the given site only', async () => {
    const result = await setInkingValidationMode('site-1', 'STRICT_ENFORCE');
    expect(result).toEqual({ ok: true });
    expect(getInkingValidationMode('site-1')).toBe('STRICT_ENFORCE');
    expect(getInkingValidationMode('site-2')).toBe('WARN_ONLY'); // a different site is untouched
  });
});
