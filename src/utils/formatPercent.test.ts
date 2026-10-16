// src/utils/formatPercent.test.ts
import { describe, it, expect } from 'vitest';
import i18next from 'i18next';
import { formatDecimal, formatPercent, formatPercentagePointChange } from './formatPercent';
import en from '@/i18n/locales/en.json';
import fr from '@/i18n/locales/fr.json';
import de from '@/i18n/locales/de.json';
import nl from '@/i18n/locales/nl.json';
import ko from '@/i18n/locales/ko.json';

// Intl uses a narrow no-break space before "%" in French; compare on plain spaces.
const plain = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ').replace(/−/g, '-');

describe('formatPercent / formatDecimal (Batch 514)', () => {
  it('writes the number the way each language does', () => {
    expect(plain(formatPercent(12.34, 'en'))).toBe('12.3%');
    expect(plain(formatPercent(12.34, 'fr'))).toBe('12,3 %');
    expect(plain(formatPercent(12.34, 'de'))).toBe('12,3 %');
    expect(plain(formatPercent(50, 'en', 0))).toBe('50%');
    expect(formatDecimal(1.256, 'en')).toBe('1.26');
    expect(formatDecimal(1.256, 'nl')).toBe('1,26');
  });
});

describe('formatPercentagePointChange (Batch 514)', () => {
  it('signs the change and formats it for the language', () => {
    expect(formatPercentagePointChange(2.34, 'en').value).toBe('+2.3');
    expect(plain(formatPercentagePointChange(-1.46, 'fr').value)).toBe('-1,5');
    expect(formatPercentagePointChange(0.04, 'en').value).toBe('0.0');
    expect(formatPercentagePointChange(-0.04, 'en').value).toBe('0.0');
  });

  it('picks the unit-word form that agrees with the number as shown', () => {
    expect(formatPercentagePointChange(1.5, 'fr').form).toBe('one');   // French: under 2 is singular
    expect(formatPercentagePointChange(2.3, 'fr').form).toBe('other');
    expect(formatPercentagePointChange(1, 'de').form).toBe('other');   // "1,0 Prozentpunkte"
    expect(formatPercentagePointChange(1, 'nl').form).toBe('other');
    expect(formatPercentagePointChange(1, 'ko').form).toBe('other');
  });

  it('reads as Pete specified in each language (Oct 10, 2026)', async () => {
    const i18n = i18next.createInstance();
    await i18n.init({ lng: 'en', resources: { en: { translation: en }, fr: { translation: fr }, de: { translation: de }, nl: { translation: nl }, ko: { translation: ko } } });
    const say = (lng: string, change: number) => {
      const { value, form } = formatPercentagePointChange(change, lng);
      return plain(i18n.getFixedT(lng)('cytologyQaTab.hpvPositivityTable.percentagePoints', { value, context: form }));
    };
    expect(say('en', 2.3)).toBe('+2.3 pp');
    expect(say('fr', 1.5)).toBe('+1,5 point de pourcentage');
    expect(say('fr', -2.3)).toBe('-2,3 points de pourcentage');
    expect(say('de', 2.3)).toBe('+2,3 Prozentpunkte');
    expect(say('nl', 2.3)).toBe('+2,3 procentpunten');
    expect(say('ko', 2.3)).toBe('+2.3퍼센트포인트');
  });
});
