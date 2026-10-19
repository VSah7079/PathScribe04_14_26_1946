// Batch 609 (#177, #179): the dictation refinement prompt per language and English spelling convention.
import { describe, it, expect } from 'vitest';
import {
  buildDictationRefinementSystem, dictationLanguageForLocale, englishSpellingFor, reviewablePrompts, spellLocaleForDictation,
} from './dictationRefinementPrompt';

describe('englishSpellingFor', () => {
  it.each([
    ['en-US', 'US'], ['en-GB', 'GB'], ['en-IE', 'GB'], ['en-AU', 'AU'], ['en-NZ', 'AU'], ['en-CA', 'CA'],
    ['en-IN', 'GB'], ['en-ZA', 'GB'], ['en-PH', 'US'], ['', 'US'], [undefined, 'US'],
  ])('%s → %s', (tag, expected) => expect(englishSpellingFor(tag as string | undefined)).toBe(expected));
});

describe('dictation spelling per locale (#177)', () => {
  const prompt = (spellLocale: string) => buildDictationRefinementSystem({ language: 'en', spellLocale });

  it('Australian dictation gets British medical spelling and -ise, not American', () => {
    const p = prompt('en-AU');
    expect(p).toContain('Australian English');
    expect(p).toContain('"haemorrhage"');
    expect(p).toContain('"organise"');
    expect(p).not.toContain('American English');
  });

  it('Canadian dictation gets -our/-re with American medical forms', () => {
    const p = prompt('en-CA');
    expect(p).toContain('Canadian English');
    expect(p).toContain('"colour"');
    expect(p).toContain('"hemorrhage"');
  });

  it('British and Irish dictation get British spelling; US gets American', () => {
    expect(prompt('en-GB')).toContain('British English spelling');
    expect(prompt('en-IE')).toContain('British English spelling');
    expect(prompt('en-US')).toContain('American English spelling');
  });

  it('the four English prompts differ from each other', () => {
    const all = ['en-US', 'en-GB', 'en-AU', 'en-CA'].map(prompt);
    expect(new Set(all).size).toBe(4);
  });

  it('keeps the existing English rules (gross fix, measurements, staging, return only text)', () => {
    const p = prompt('en-US');
    expect(p).toContain('"Rose" → "Gross"');
    expect(p).toContain('3 x 2 x 1 cm');
    expect(p).toContain('pT2b');
    expect(p).toContain('Return ONLY the refined text');
  });

  it('numbers the rules in order', () => {
    expect(prompt('en-US')).toMatch(/1\. Correct phonetic[\s\S]*4\. Use American[\s\S]*7\. Return ONLY/);
  });
});

describe('prompt per language (#179)', () => {
  it.each([['fr', 'French'], ['de', 'German'], ['nl', 'Dutch'], ['ko', 'Korean']] as const)('%s keeps the text in %s and never translates', (language, name) => {
    const p = buildDictationRefinementSystem({ language });
    expect(p).toContain(`The transcript is in ${name}.`);
    expect(p).toContain('never translate');
    expect(p).toContain('Return ONLY the refined text');
    expect(p).toContain('pT2b');
  });

  it('non-English prompts drop the English-only "Rose" → "Gross" example and ignore the spelling locale', () => {
    for (const language of ['fr', 'de', 'nl', 'ko'] as const) {
      const p = buildDictationRefinementSystem({ language, spellLocale: 'en-AU' });
      expect(p).not.toContain('Rose');
      expect(p).not.toContain('English spelling');
    }
  });

  it('each language carries its own typography rule', () => {
    expect(buildDictationRefinementSystem({ language: 'fr' })).toContain('guillemets');
    expect(buildDictationRefinementSystem({ language: 'de' })).toContain('Capitalise German nouns');
    expect(buildDictationRefinementSystem({ language: 'nl' })).toContain('compound words as one word');
    expect(buildDictationRefinementSystem({ language: 'ko' })).toContain('do not transliterate');
  });

  it('French, German and Dutch use the decimal comma; Korean does not', () => {
    for (const language of ['fr', 'de', 'nl'] as const) expect(buildDictationRefinementSystem({ language })).toContain('3,5 x 2 x 1 cm');
    expect(buildDictationRefinementSystem({ language: 'ko' })).toContain('3.5 x 2 x 1 cm');
  });
});

describe('locale resolution', () => {
  it('dictationLanguageForLocale maps Belgian Dutch and anything unknown', () => {
    expect(dictationLanguageForLocale('nl-BE')).toBe('nl');
    expect(dictationLanguageForLocale('fr_FR')).toBe('fr');
    expect(dictationLanguageForLocale('ko-KR')).toBe('ko');
    expect(dictationLanguageForLocale('en-AU')).toBe('en');
    expect(dictationLanguageForLocale(undefined)).toBe('en');
  });

  it('the lab’s English jurisdiction wins over the speaker’s profile; a non-English lab defers to the profile', () => {
    expect(spellLocaleForDictation('en-AU', 'en-US')).toBe('en-AU');
    expect(spellLocaleForDictation('nl-BE', 'en-GB')).toBe('en-GB');
    expect(spellLocaleForDictation(undefined, undefined)).toBe('en-US');
  });
});

describe('reviewablePrompts', () => {
  it('lists the four English conventions then fr, de, nl, ko, each matching what is sent', () => {
    const list = reviewablePrompts();
    expect(list.map(p => p.id)).toEqual(['en-US', 'en-GB', 'en-AU', 'en-CA', 'fr', 'de', 'nl', 'ko']);
    expect(list.find(p => p.id === 'en-AU')!.prompt).toBe(buildDictationRefinementSystem({ language: 'en', spellLocale: 'en-AU' }));
    expect(list.find(p => p.id === 'de')!.prompt).toBe(buildDictationRefinementSystem({ language: 'de' }));
  });
});
