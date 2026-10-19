// src/services/actionRegistry/voiceTriggerPool.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 609 (#179): which trigger phrases a voice command may be fuzzy-matched
// against. Pure.
//
// A non-English voice profile checks its own language's phrases first and, until
// now, always let the English phrases take part in the fuzzy step as well. With
// the English fuzzy fallback on (the default, and the behaviour before this
// setting) nothing changes. With it off, a non-English profile fuzzy-matches only
// its own language's phrases and the person's learned phrases, so a mis-heard
// French or German phrase is not read as a near-miss of an unrelated English
// command. An exact English phrase still matches either way.
// ─────────────────────────────────────────────────────────────────────────────

import type { SystemAction } from './IActionRegistryService';
import type { VoiceProfileLanguage } from '@/constants/voiceProfiles';

export interface TriggerPoolOptions {
  /** Default true. */
  englishFuzzyFallback?: boolean;
}

type TriggerSource = Pick<SystemAction, 'voiceTriggers' | 'voiceTriggersByLanguage' | 'learnedTriggers'>;

/** The phrases for the exact step: the language's own, then the English set. */
export function exactTriggers(a: TriggerSource, language: VoiceProfileLanguage): string[] {
  const own = language !== 'en' ? a.voiceTriggersByLanguage?.[language] : undefined;
  return own?.length ? [...own, ...a.voiceTriggers] : a.voiceTriggers;
}

/** The phrases for the fuzzy step. */
export function fuzzyTriggers(a: TriggerSource, language: VoiceProfileLanguage, options: TriggerPoolOptions = {}): string[] {
  const learned = a.learnedTriggers ?? [];
  const english = options.englishFuzzyFallback ?? true;
  if (language === 'en' || english) return [...exactTriggers(a, language), ...learned].filter(Boolean);
  return [...(a.voiceTriggersByLanguage?.[language] ?? []), ...learned].filter(Boolean);
}
