// src/services/voice/dictationRefinementPrompt.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 609 (#177, #179): the system prompt for AI dictation refinement,
// built per dictation language and, for English, per spelling convention.
// Pure, so the admin screen can show exactly what is sent, and tests can pin it.
//
// Before this batch one English-only prompt was used for every profile: it
// asked for "Rose" → "Gross" fixes even when the speaker was dictating
// German, and Australian or Canadian dictation was left to the model's
// default (American) spelling. Now:
//   - English: a spelling rule for the convention the lab uses
//     (US, GB/IE, AU/NZ, CA);
//   - French, German, Dutch, Korean: the text stays in that language (never
//     translated), with that language's own typography rules.
//
// The non-English wording is machine-assisted and NEEDS NATIVE-SPEAKER
// REVIEW (the admin screen shows each prompt for that purpose).
// ─────────────────────────────────────────────────────────────────────────────

import type { VoiceProfileLanguage } from '@/constants/voiceProfiles';

export type EnglishSpelling = 'US' | 'GB' | 'AU' | 'CA';

/** Spelling conventions an English dictation session can use. */
export const ENGLISH_SPELLINGS: readonly EnglishSpelling[] = ['US', 'GB', 'AU', 'CA'];

/**
 * Which English spelling convention a locale tag uses. Ireland follows
 * British spelling; New Zealand follows Australian; Indian, South African,
 * Singaporean and Nigerian English follow British. Anything unrecognised
 * (including the accent-only profiles, which recognise as en-US) is American.
 */
export function englishSpellingFor(localeTag: string | undefined | null): EnglishSpelling {
  const tag = (localeTag ?? '').toLowerCase().replace('_', '-');
  if (tag.startsWith('en-au') || tag.startsWith('en-nz')) return 'AU';
  if (tag.startsWith('en-ca')) return 'CA';
  if (/^en-(gb|ie|in|za|sg|ng)/.test(tag)) return 'GB';
  return 'US';
}

/** The dictation language a locale tag implies (nl-BE → Dutch, anything unrecognised → English). */
export function dictationLanguageForLocale(localeTag: string | undefined | null): VoiceProfileLanguage {
  const lang = (localeTag ?? '').toLowerCase().split(/[-_]/)[0];
  return lang === 'fr' || lang === 'de' || lang === 'nl' || lang === 'ko' ? lang : 'en';
}

/**
 * The locale tag that decides English spelling for a dictation session: the
 * lab's own jurisdiction when it is English-speaking (the report is filed under
 * that convention whoever dictates it), otherwise the speaker's profile.
 */
export function spellLocaleForDictation(jurisdictionSpellLang: string | undefined | null, profileRecognitionLang: string | undefined | null): string {
  return dictationLanguageForLocale(jurisdictionSpellLang) === 'en' && jurisdictionSpellLang ? jurisdictionSpellLang : (profileRecognitionLang ?? 'en-US');
}

const SPELLING_RULE: Record<EnglishSpelling, string> = {
  US: 'Use American English spelling (e.g. "hemorrhage", "esophagus", "anesthesia", "tumor", "color", "center", "organize").',
  GB: 'Use British English spelling (e.g. "haemorrhage", "oesophagus", "anaesthesia", "tumour", "colour", "centre", "organise").',
  AU: 'Use Australian English spelling, which follows British forms for medical terms (e.g. "haemorrhage", "oesophagus", "anaesthesia", "tumour", "colour", "centre") but writes "program" and uses -ise endings ("organise", "analyse").',
  CA: 'Use Canadian English spelling: British -our and -re endings ("colour", "centre", "tumour") with -ize verbs ("organize"), but the American forms for medical terms ("hemorrhage", "esophagus", "anesthesia", "pediatric").',
};

interface LanguagePrompt {
  /** English name of the language, for the prompt and the admin screen. */
  name: string;
  rules: readonly string[];
}

const NON_ENGLISH: Record<Exclude<VoiceProfileLanguage, 'en'>, LanguagePrompt> = {
  fr: {
    name: 'French',
    rules: [
      'The transcript is in French. Keep it in French: never translate and never replace a French term with an English one.',
      'Correct phonetic errors using standard French pathology terminology (e.g. "adénocarcinome", "exérèse", "berges").',
      'Write measurements with the decimal comma and an \'x\' between dimensions (e.g. "3,5 x 2 x 1 cm").',
      'Follow French typography: a space before ; : ? ! and inside « guillemets », and keep accents and ligatures (é, è, ç, œ).',
      'Keep staging and grading codes exactly as spoken in international form (pT2b, pN0, pM0, G2).',
    ],
  },
  de: {
    name: 'German',
    rules: [
      'The transcript is in German. Keep it in German: never translate and never replace a German term with an English one.',
      'Correct phonetic errors using standard German pathology terminology (e.g. "Adenokarzinom", "Resektionsrand", "Lymphknoten").',
      'Capitalise German nouns, and keep umlauts and ß (ä, ö, ü, ß).',
      'Write measurements with the decimal comma and an \'x\' between dimensions (e.g. "3,5 x 2 x 1 cm").',
      'Keep staging and grading codes exactly as spoken in international form (pT2b, pN0, pM0, G2).',
    ],
  },
  nl: {
    name: 'Dutch',
    rules: [
      'The transcript is in Dutch. Keep it in Dutch: never translate and never replace a Dutch term with an English one.',
      'Correct phonetic errors using standard Dutch pathology terminology (e.g. "adenocarcinoom", "resectiemarge", "lymfeklier").',
      'Write Dutch compound words as one word (e.g. "plaveiselcelcarcinoom"), and keep the trema where it belongs ("carcinoïd").',
      'Write measurements with the decimal comma and an \'x\' between dimensions (e.g. "3,5 x 2 x 1 cm").',
      'Keep staging and grading codes exactly as spoken in international form (pT2b, pN0, pM0, G2).',
    ],
  },
  ko: {
    name: 'Korean',
    rules: [
      'The transcript is in Korean. Keep it in Korean: never translate and never replace a Korean term with an English one.',
      'Correct phonetic errors using standard Korean pathology terminology, and follow standard Korean word spacing.',
      'Keep Latin-script clinical terms, abbreviations and units as written (e.g. "adenocarcinoma", "HER2", "cm", "mm"); do not transliterate them into Hangul.',
      'Write measurements as digits with an \'x\' between dimensions (e.g. "3.5 x 2 x 1 cm").',
      'Keep staging and grading codes exactly as spoken in international form (pT2b, pN0, pM0, G2).',
    ],
  },
};

const FOOTER = [
  'Capitalise the first word and the word after sentence-ending punctuation, following the language\'s own rules.',
  'Preserve punctuation symbols already present (commas, periods etc.).',
  'Return ONLY the refined text. No explanation, no quotes.',
] as const;

const INTRO = 'You are an expert Pathology Transcription Assistant. Refine raw voice transcripts into professional medical text.';

const numbered = (rules: readonly string[]) => rules.map((r, i) => `${i + 1}. ${r}`).join('\n');

export interface DictationPromptInput {
  /** The dictation language of the voice profile. */
  language: VoiceProfileLanguage;
  /** The locale tag that decides English spelling: the lab's jurisdiction
   *  spell language, or the profile's recognition language. Ignored for
   *  non-English dictation. */
  spellLocale?: string | null;
}

/** The system prompt for refining one dictation segment. */
export function buildDictationRefinementSystem({ language, spellLocale }: DictationPromptInput): string {
  if (language !== 'en') {
    return `${INTRO}\n\nRULES:\n${numbered([...NON_ENGLISH[language].rules, ...FOOTER])}`;
  }
  const english = [
    'Correct phonetic errors (e.g. "Rose" → "Gross", "Serial" → "Ciliary").',
    'Format measurements using \'x\' (e.g. "3 x 2 x 1 cm").',
    'Use proper pathology staging capitalization (pT2b, pN0, pM0).',
    SPELLING_RULE[englishSpellingFor(spellLocale)],
  ];
  return `${INTRO}\n\nRULES:\n${numbered([...english, ...FOOTER])}`;
}

/** The English name of a dictation language, for the admin screen. */
export function dictationLanguageName(language: VoiceProfileLanguage): string {
  return language === 'en' ? 'English' : NON_ENGLISH[language].name;
}

/** One entry per prompt the admin can review: each English convention, then each other language. */
export interface ReviewablePrompt {
  id: string;
  language: VoiceProfileLanguage;
  spelling?: EnglishSpelling;
  prompt: string;
}

const SPELLING_LOCALE: Record<EnglishSpelling, string> = { US: 'en-US', GB: 'en-GB', AU: 'en-AU', CA: 'en-CA' };

export function reviewablePrompts(): ReviewablePrompt[] {
  return [
    ...ENGLISH_SPELLINGS.map(spelling => ({
      id: `en-${spelling}`, language: 'en' as const, spelling,
      prompt: buildDictationRefinementSystem({ language: 'en', spellLocale: SPELLING_LOCALE[spelling] }),
    })),
    ...(['fr', 'de', 'nl', 'ko'] as const).map(language => ({
      id: language, language, prompt: buildDictationRefinementSystem({ language }),
    })),
  ];
}
