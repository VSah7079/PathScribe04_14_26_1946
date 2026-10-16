// src/services/userSettings/personalSettings.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 430: settings that belong to a person, not to the browser they're
// signed in on: their voice accent, what dictation has learned from their
// corrections, their voice macros, and their own AI provider override.
// Before, each lived under one fixed browser key, so everyone sharing a
// workstation shared them.
//
//   • Stored per signed-in person (mock phase: browser storage under the
//     mock prefix, so the demo reset clears them; production: the person's
//     settings on the server, PS-345).
//   • The first time a person reads a setting, the old shared value (if any)
//     is carried over to them, so nobody loses what they had set.
//   • Nobody signed in: the shared value, as before.
//
// Foot pedal bindings deliberately stay per workstation (hooks/useFootPedal.ts):
// the pedal is plugged into the machine, not the account.
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet, storageClear } from '../mockStorage';
import { getSessionUser } from '../auth/caseAccessControl';
import { dataStorage } from '../browserData/dataStorage';

export interface PersonalSettingsDeps {
  /** The signed-in person's id, or undefined. */
  userId?: () => string | undefined;
  /** Reads the old, shared browser value (raw string) for carrying over. */
  readLegacy?: (key: string) => string | null;
}

const currentUserId = () => getSessionUser()?.id;
const readLegacyDefault = (key: string): string | null => {
  try { return dataStorage.getItem(key); } catch { return null; }
};

/** Where a person's setting is kept (pure). */
export function personalSettingKey(legacyKey: string, userId: string): string {
  return `personal:${legacyKey}:${userId}`;
}

const MISSING = Symbol('missing');

/** The person's value; on first read, the old shared value carried over. */
export function getPersonalSetting<T>(legacyKey: string, fallback: T, parse: (raw: string) => T = raw => JSON.parse(raw) as T, deps: PersonalSettingsDeps = {}): T {
  const userId = (deps.userId ?? currentUserId)();
  const readLegacy = deps.readLegacy ?? readLegacyDefault;
  const legacy = (): T => {
    const raw = readLegacy(legacyKey);
    if (raw === null) return fallback;
    try { return parse(raw); } catch { return fallback; }
  };
  if (!userId) return legacy();
  const key = personalSettingKey(legacyKey, userId);
  const stored = storageGet<T | typeof MISSING>(key, MISSING);
  if (stored !== MISSING) return stored as T;
  const carried = legacy();
  if (readLegacy(legacyKey) !== null) storageSet(key, carried);
  return carried;
}

/** Saves the person's value (the shared key when nobody is signed in). */
export function setPersonalSetting<T>(legacyKey: string, value: T, deps: PersonalSettingsDeps = {}): void {
  const userId = (deps.userId ?? currentUserId)();
  if (userId) { storageSet(personalSettingKey(legacyKey, userId), value); return; }
  try { dataStorage.setItem(legacyKey, typeof value === 'string' ? value : JSON.stringify(value)); } catch { /* storage unavailable */ }
}

/** Clears the person's value. */
export function clearPersonalSetting(legacyKey: string, deps: PersonalSettingsDeps = {}): void {
  const userId = (deps.userId ?? currentUserId)();
  if (userId) { storageClear(personalSettingKey(legacyKey, userId)); return; }
  try { dataStorage.removeItem(legacyKey); } catch { /* storage unavailable */ }
}
