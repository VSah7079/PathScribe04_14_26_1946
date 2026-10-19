// Batch 609 (#179): which phrases a voice command is fuzzy-matched against.
import { describe, it, expect, afterEach } from 'vitest';
import { exactTriggers, fuzzyTriggers } from './voiceTriggerPool';
import { mockActionRegistryService } from './mockActionRegistryService';

const action = {
  voiceTriggers: ['go home', 'open home'],
  voiceTriggersByLanguage: { fr: ['aller à l’accueil'] },
  learnedTriggers: ['take me home'],
};

describe('exactTriggers', () => {
  it('English profile: English phrases only', () => expect(exactTriggers(action, 'en')).toEqual(['go home', 'open home']));
  it('translated profile: own language first, then English', () => expect(exactTriggers(action, 'fr')).toEqual(['aller à l’accueil', 'go home', 'open home']));
  it('a language with no translations falls back to English', () => expect(exactTriggers(action, 'de')).toEqual(['go home', 'open home']));
});

describe('fuzzyTriggers', () => {
  it('default (fallback on): unchanged, learned phrases included', () => {
    expect(fuzzyTriggers(action, 'fr')).toEqual(['aller à l’accueil', 'go home', 'open home', 'take me home']);
    expect(fuzzyTriggers(action, 'fr', { englishFuzzyFallback: true })).toEqual(fuzzyTriggers(action, 'fr'));
  });
  it('fallback off: a non-English profile uses only its own language and learned phrases', () => {
    expect(fuzzyTriggers(action, 'fr', { englishFuzzyFallback: false })).toEqual(['aller à l’accueil', 'take me home']);
  });
  it('fallback off, language with no translations: only learned phrases', () => {
    expect(fuzzyTriggers(action, 'de', { englishFuzzyFallback: false })).toEqual(['take me home']);
  });
  it('fallback off does not affect an English profile', () => {
    expect(fuzzyTriggers(action, 'en', { englishFuzzyFallback: false })).toEqual(['go home', 'open home', 'take me home']);
  });
});

describe('findActionByTrigger with the English fuzzy fallback (#179)', () => {
  const live = mockActionRegistryService.getActionById('OPEN_HOME')!;
  const originalByLanguage = live.voiceTriggersByLanguage;
  afterEach(() => { live.voiceTriggersByLanguage = originalByLanguage; });

  it('an exact English phrase still matches on a French profile with the fallback off', () => {
    live.voiceTriggersByLanguage = { fr: ['aller à l’accueil'] };
    expect(mockActionRegistryService.findActionByTrigger('go home', 'fr', { englishFuzzyFallback: false })?.id).toBe('OPEN_HOME');
  });

  it('a near-miss of an English phrase matches by default but not with the fallback off', () => {
    live.voiceTriggersByLanguage = { fr: ['aller à l’accueil'] };
    const nearMiss = 'home go';
    expect(mockActionRegistryService.findActionByTrigger(nearMiss, 'fr')?.id).toBe('OPEN_HOME');
    expect(mockActionRegistryService.findActionByTrigger(nearMiss, 'fr', { englishFuzzyFallback: false })?.id).not.toBe('OPEN_HOME');
  });

  it('a near-miss of the profile’s own phrase still matches with the fallback off', () => {
    live.voiceTriggersByLanguage = { fr: ['aller à l’accueil'] };
    expect(mockActionRegistryService.findActionByTrigger('aller a l’accueil', 'fr', { englishFuzzyFallback: false })?.id).toBe('OPEN_HOME');
  });
});
