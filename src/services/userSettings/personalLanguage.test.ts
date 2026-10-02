// @vitest-environment happy-dom
//
// src/services/userSettings/personalLanguage.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { personalLanguageFor, savePersonalLanguage, LANGUAGE_SETTING_KEY } from './personalLanguage';

const SUPPORTED = ['en', 'fr', 'ko'] as const;

describe('personal language (Batch 431)', () => {
  beforeEach(() => localStorage.clear());

  it('each person keeps their own language at a shared workstation', () => {
    savePersonalLanguage('1', 'ko');
    savePersonalLanguage('2', 'fr');
    expect(personalLanguageFor('1', SUPPORTED)).toBe('ko');
    expect(personalLanguageFor('2', SUPPORTED)).toBe('fr');
  });

  it("carries the workstation's language over the first time", () => {
    localStorage.setItem(LANGUAGE_SETTING_KEY, 'fr');
    expect(personalLanguageFor('7', SUPPORTED)).toBe('fr');
  });

  it('ignores a language the app does not support', () => {
    savePersonalLanguage('1', 'xx');
    expect(personalLanguageFor('1', SUPPORTED)).toBeNull();
  });

  it('nothing saved and nothing to carry over: none', () => {
    expect(personalLanguageFor('9', SUPPORTED)).toBeNull();
  });
});
