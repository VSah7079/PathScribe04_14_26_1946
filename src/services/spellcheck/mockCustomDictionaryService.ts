// src/services/spellcheck/mockCustomDictionaryService.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-342 (Batch 336): mock-phase storage for personal and facility spelling
// dictionaries (localStorage via mockStorage; SQL Server behind the API in
// production). Rules are in customDictionaryRules.ts. Facility changes are
// audited; personal words are audited too (Batch 651), without the word itself.
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../mockStorage';
import { mockAuditService } from '../auditlog/mockAuditService';
import type { ICustomDictionaryService, CustomWordResult } from './ICustomDictionaryService';
import {
  facilityDictionaryAuditEntry, normalizeCustomWord, personalDictionaryAuditEntry, withCustomWord, withoutCustomWord,
  type CustomWordEntry, type CustomWordRefusal,
} from './customDictionaryRules';

export const PERSONAL_WORDS_KEY = 'spelling_personal_words_v1';
export const FACILITY_WORDS_KEY = 'spelling_facility_words_v1';

type Store = Record<string, CustomWordEntry[]>;

const MESSAGES: Record<CustomWordRefusal, string> = {
  EMPTY: 'Enter a word.',
  NOT_A_WORD: 'Only a single word can be added.',
  TOO_LONG: 'That word is too long.',
  NOT_PERMITTED: 'You do not have permission to change this dictionary.',
  NOT_FOUND: 'That word is not in the dictionary.',
};
const refuse = <T>(code: CustomWordRefusal): CustomWordResult<T> => ({ ok: false, code, error: MESSAGES[code] });
const ok = <T>(data: T): CustomWordResult<T> => ({ ok: true, data });

const read = (key: string) => storageGet<Store>(key, {});

// Batch 432: changing a facility's dictionary needs config:facilities:manage
// (it was a role-name check). Removing a personal word is for its owner only.
async function mayManageFacility(): Promise<boolean> {
  const { authorizationService } = await import('../authorization/defaultAuthorizationService');
  return (await authorizationService.enforce('config:facilities:manage')).allowed;
}
/** The signed-in owner's display name when `userId` is the signed-in person, else null (Batch 651: the audit names them). */
async function ownerName(userId: string): Promise<string | null> {
  const { getSessionUser } = await import('../auth/caseAccessControl');
  const me = getSessionUser();
  if (!me || me.id !== userId) return null;
  return [me.firstName, me.lastName].filter(Boolean).join(' ') || me.id;
}
const write = (key: string, store: Store) => storageSet(key, store);

export const mockCustomDictionaryService: ICustomDictionaryService = {
  async listPersonal(userId) {
    return ok(read(PERSONAL_WORDS_KEY)[userId] ?? []);
  },

  async addPersonal(userId, raw, actor) {
    const n = normalizeCustomWord(raw);
    if (n.ok === false) return refuse(n.code);
    const store = read(PERSONAL_WORDS_KEY);
    const { list, added } = withCustomWord(store[userId] ?? [], { word: n.word, addedBy: { userId: actor.userId, userName: actor.userName }, addedAt: new Date().toISOString() });
    write(PERSONAL_WORDS_KEY, { ...store, [userId]: list });
    if (added) await mockAuditService.logEvent(personalDictionaryAuditEntry('added', n.word, actor.userName, userId)).catch(() => {});
    return ok(list);
  },

  async removePersonal(userId, word) {
    const owner = await ownerName(userId);
    if (owner === null) return refuse('NOT_PERMITTED');
    const store = read(PERSONAL_WORDS_KEY);
    const { list, removed } = withoutCustomWord(store[userId] ?? [], word);
    if (!removed) return refuse('NOT_FOUND');
    write(PERSONAL_WORDS_KEY, { ...store, [userId]: list });
    await mockAuditService.logEvent(personalDictionaryAuditEntry('removed', word, owner, userId)).catch(() => {});
    return ok(list);
  },

  async listFacility(facilityId) {
    return ok(read(FACILITY_WORDS_KEY)[facilityId] ?? []);
  },

  async addFacility(facilityId, raw, actor, facilityLabel) {
    if (!(await mayManageFacility())) return refuse('NOT_PERMITTED');
    const n = normalizeCustomWord(raw);
    if (n.ok === false) return refuse(n.code);
    const store = read(FACILITY_WORDS_KEY);
    const { list, added } = withCustomWord(store[facilityId] ?? [], { word: n.word, addedBy: { userId: actor.userId, userName: actor.userName }, addedAt: new Date().toISOString() });
    if (added) {
      write(FACILITY_WORDS_KEY, { ...store, [facilityId]: list });
      await mockAuditService.logEvent(facilityDictionaryAuditEntry('added', n.word, facilityLabel ?? facilityId, actor.userName, facilityId));
    }
    return ok(list);
  },

  async removeFacility(facilityId, word, actor, facilityLabel) {
    if (!(await mayManageFacility())) return refuse('NOT_PERMITTED');
    const store = read(FACILITY_WORDS_KEY);
    const { list, removed } = withoutCustomWord(store[facilityId] ?? [], word);
    if (!removed) return refuse('NOT_FOUND');
    write(FACILITY_WORDS_KEY, { ...store, [facilityId]: list });
    await mockAuditService.logEvent(facilityDictionaryAuditEntry('removed', word, facilityLabel ?? facilityId, actor.userName, facilityId));
    return ok(list);
  },
};
