// @vitest-environment happy-dom
//
// src/services/userSettings/personalLanguage.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
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

  describe('audit (Batch 651)', () => {
    const fake = () => ({ logEvent: vi.fn(async () => ({ ok: true })) as any });

    it('a change from one chosen language to another is audited, naming the person and both codes, no PHI', async () => {
      const auditService = fake();
      savePersonalLanguage('1', 'fr');
      savePersonalLanguage('1', 'ko', { auditService, actorName: () => 'Dr Path' });
      await vi.waitFor(() => expect(auditService.logEvent).toHaveBeenCalledTimes(1));
      expect(auditService.logEvent).toHaveBeenCalledWith({
        type: 'user', event: 'Screen language changed', detail: 'Screen language changed from fr to ko.',
        user: 'Dr Path', caseId: null, confidence: null,
      });
    });

    it('the first save and saving the same language again write nothing', async () => {
      const auditService = fake();
      savePersonalLanguage('1', 'fr', { auditService, actorName: () => 'Dr Path' });
      savePersonalLanguage('1', 'fr', { auditService, actorName: () => 'Dr Path' });
      await new Promise(r => setTimeout(r, 20));
      expect(auditService.logEvent).not.toHaveBeenCalled();
    });

    it('a failing audit write never fails the save', async () => {
      const auditService = { logEvent: vi.fn(async () => { throw new Error('down'); }) as any };
      savePersonalLanguage('1', 'fr');
      expect(() => savePersonalLanguage('1', 'de', { auditService, actorName: () => 'x' })).not.toThrow();
      expect(personalLanguageFor('1', ['fr', 'de'])).toBe('de');
    });
  });
});
