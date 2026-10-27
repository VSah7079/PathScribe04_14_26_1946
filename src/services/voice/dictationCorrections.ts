// src/services/voice/dictationCorrections.ts
// ─────────────────────────────────────────────────────────────────────────────
// What dictation learns from a person's corrections (Batch 430: theirs, kept per signed-in person). Moved out of
// VoiceProvider in Batch 650 so the report section editors record corrections through the same table the Internal
// Notes drawer uses, and so it can be tested without React.
//
// How it is used: every dictated segment is looked up by its raw words BEFORE the AI sees it
// (`applyDictationLearning`); when a person edits a dictated segment, `recordDictationCorrection` stores what they
// wrote for those raw words. The first few corrections are also sent to the AI as examples.
// ─────────────────────────────────────────────────────────────────────────────
import { getSessionUser } from '../auth/caseAccessControl';
import { getPersonalSetting, setPersonalSetting } from '../userSettings/personalSettings';

export const DICTATION_LEARN_KEY = 'ps_dictation_corrections';

/** The key a spoken phrase is stored under: lower case, letters and digits only. Unicode-aware (Korean, accents). */
export function normaliseDictation(s: string): string {
  return s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();
}

let cache: { userId: string | undefined; map: Record<string, string> } | null = null;

/** Forgets the loaded table (tests, and a changed sign-in). */
export function resetDictationCorrectionsCache(): void { cache = null; }

export function dictationCorrectionsForCurrentUser(): Record<string, string> {
  const userId = getSessionUser()?.id;
  if (!cache || cache.userId !== userId) {
    cache = { userId, map: { ...getPersonalSetting<Record<string, string>>(DICTATION_LEARN_KEY, {}) } };
  }
  return cache.map;
}

export function applyDictationLearning(rawTranscript: string, localText: string): string {
  return dictationCorrectionsForCurrentUser()[normaliseDictation(rawTranscript)] ?? localText;
}

export function recordDictationCorrection(rawTranscript: string, corrected: string): void {
  const key = normaliseDictation(rawTranscript);
  if (!key || !corrected.trim()) return;
  const map = dictationCorrectionsForCurrentUser();
  map[key] = corrected;
  setPersonalSetting(DICTATION_LEARN_KEY, map);
}
