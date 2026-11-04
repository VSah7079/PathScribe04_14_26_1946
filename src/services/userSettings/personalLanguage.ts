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

import type { IAuditService } from '../auditlog/IAuditService';
import { getPersonalSetting, setPersonalSetting } from './personalSettings';

/** The browser key the language detector keeps; also the setting's legacy key. */
export const LANGUAGE_SETTING_KEY = 'pathscribe_language';

/** The person's saved language, if it's one the app supports (pure apart from the read). */
export function personalLanguageFor(userId: string, supported: readonly string[]): string | null {
  const saved = getPersonalSetting<string | null>(LANGUAGE_SETTING_KEY, null, raw => raw, { userId: () => userId });
  return typeof saved === 'string' && supported.includes(saved) ? saved : null;
}

export interface PersonalLanguageDeps {
  /** Where the change is audited (a fake in tests; the shared audit service otherwise). */
  auditService?: Pick<IAuditService, 'logEvent'>;
  /** The display name the audit names (the signed-in person's; the id when no name is known). */
  actorName?: () => string | null;
}

async function defaultActorName(userId: string): Promise<string> {
  const { getSessionUser } = await import('../auth/caseAccessControl');
  const me = getSessionUser();
  const name = me && me.id === userId ? [me.firstName, me.lastName].filter(Boolean).join(' ') : '';
  return name || userId;
}

/**
 * Saves the person's language. Batch 651: when it replaces a language they had already chosen with a different one,
 * the change is audited ("Screen language changed", the two language codes, no PHI). Saving the same language again
 * (what signing in does) and the first save (the workstation's language carrying over) are not changes and write
 * nothing. The audit write never blocks or fails the save.
 */
export function savePersonalLanguage(userId: string, language: string, deps: PersonalLanguageDeps = {}): void {
  const previous = getPersonalSetting<string | null>(LANGUAGE_SETTING_KEY, null, raw => raw, { userId: () => userId });
  setPersonalSetting(LANGUAGE_SETTING_KEY, language, { userId: () => userId });
  if (typeof previous !== 'string' || !previous || previous === language) return;
  void (async () => {
    const audit = deps.auditService ?? (await import('../auditlog/auditServiceInstance')).auditService;
    const user = deps.actorName?.() ?? (await defaultActorName(userId));
    await audit.logEvent({
      type: 'user', event: 'Screen language changed',
      detail: `Screen language changed from ${previous} to ${language}.`,
      user, caseId: null, confidence: null,
    });
  })().catch(() => {});
}
