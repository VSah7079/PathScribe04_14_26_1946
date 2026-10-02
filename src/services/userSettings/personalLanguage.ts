// src/services/userSettings/personalLanguage.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 431: the screen language is the signed-in person's own setting.
//
// Before, the language was kept only in the browser (the language detector's
// 'pathscribe_language' key), so everyone at a workstation shared it. Now:
//   • signed in: the person's saved language is applied, and a change from the
//     language menu is saved to them (production: their settings on the
//     server, PS-345);
//   • on the sign-in page, nobody is signed in yet, so the workstation's last
//     language (the browser key) or the browser's own language applies;
//   • the first time a person signs in, the workstation's language carries over
//     to them, so nobody's screen changes language unexpectedly.
// ─────────────────────────────────────────────────────────────────────────────

import { getPersonalSetting, setPersonalSetting } from './personalSettings';

/** The browser key the language detector keeps; also the setting's legacy key. */
export const LANGUAGE_SETTING_KEY = 'pathscribe_language';

/** The person's saved language, if it's one the app supports (pure apart from the read). */
export function personalLanguageFor(userId: string, supported: readonly string[]): string | null {
  const saved = getPersonalSetting<string | null>(LANGUAGE_SETTING_KEY, null, raw => raw, { userId: () => userId });
  return typeof saved === 'string' && supported.includes(saved) ? saved : null;
}

/** Saves the person's language. */
export function savePersonalLanguage(userId: string, language: string): void {
  setPersonalSetting(LANGUAGE_SETTING_KEY, language, { userId: () => userId });
}
