// Batch 622 (PS-811): Spain as a jurisdiction and es-ES as the sixth language.
// Screening intervals, registry profiles, invoicing and SNOMED are deliberately
// not built yet (docs/product/SPAIN_RESEARCH.md); a test pins that they are absent
// so nobody mistakes the first piece for the whole of Spain.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JURISDICTION_LABELS, JURISDICTION_LOCALE, PATIENT_ID_BY_JURISDICTION, icd10VariantForJurisdiction, snomedReleaseForJurisdiction } from '@/types/systemConfig';
import { SUPPORTED_LANGUAGES } from '@/i18n/config';
import { defaultReportLanguage, resolveReportDateLocale, resolvePdfLanguage } from '@/services/reports/reportLanguage';
import { getVoiceProfileLanguage, getVoiceProfileRecognitionLang } from '@/constants/voiceProfiles';
import { getPunctuationMapForLanguage } from '@/contexts/punctuationMaps';
import { formatOrdinal } from '@/utils/formatOrdinal';
import { JURISDICTION_SPELLING_LOCALE, SPELLING_LOCALES } from '@/services/spellcheck/spellingLocales';
import { buildDictationRefinementSystem, dictationLanguageForLocale } from '@/services/voice/dictationRefinementPrompt';
import { DEFAULT_SCREENING_INTERVALS } from '@/services/cytology/screeningIntervals';
import es from '@/i18n/locales/es.json';
import en from '@/i18n/locales/en.json';

describe('Spain (ES) jurisdiction', () => {
  it('is a jurisdiction with Spanish conventions', () => {
    expect(JURISDICTION_LABELS.ES).toBe('Spain');
    expect(JURISDICTION_LOCALE.ES).toEqual({ locale: 'es-ES', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', spellLang: 'es-ES' });
    expect(icd10VariantForJurisdiction('ES')).toBe('CIE-10-ES');
    expect(snomedReleaseForJurisdiction('ES')).toContain('Spanish');
  });
  it('writes dates day first in Spanish', () => {
    expect(new Date(Date.UTC(2026, 8, 27, 12)).toLocaleDateString('es-ES', { timeZone: 'UTC' })).toBe('27/9/2026');
  });
  it('has a DNI / NIE patient identifier pattern', () => {
    const p = new RegExp(PATIENT_ID_BY_JURISDICTION.ES.pattern);
    expect(p.test(PATIENT_ID_BY_JURISDICTION.ES.example)).toBe(true);
    expect(p.test('X1234567L')).toBe(true);
    expect(p.test('1234567Z')).toBe(false);
    expect(PATIENT_ID_BY_JURISDICTION.ES.luhnCheck).toBe(false);
  });
  it('does not claim a screening interval table before the figures are verified', () => {
    expect(DEFAULT_SCREENING_INTERVALS.map(r => r.countryCode)).not.toContain('ES');
  });
});

describe('es-ES language', () => {
  it('is a supported language, the default report language for Spain, and has its own file', () => {
    expect(SUPPORTED_LANGUAGES).toContain('es');
    expect(defaultReportLanguage('ES')).toBe('es');
    expect(resolvePdfLanguage('es')).toBe('es');
    expect(resolveReportDateLocale({ jurisdiction: 'ES' }, j => JURISDICTION_LOCALE[j as 'ES'].locale)).toBe('es-ES');
  });
  it('has a Castilian voice profile with Spanish punctuation commands', () => {
    expect(getVoiceProfileLanguage('ES-ES')).toBe('es');
    expect(getVoiceProfileRecognitionLang('ES-ES')).toBe('es-ES');
    const map = getPunctuationMapForLanguage('es');
    expect(map['punto y coma']).toBe('; ');
    expect(map['nuevo párrafo']).toBe('\n\n');
  });
  it('writes ordinals the Spanish way', () => {
    expect(formatOrdinal(3, 'es')).toBe('3.º');
    expect(formatOrdinal(3, 'es-ES')).toBe('3.º');
  });
  it('checks spelling against es-ES for Spain', () => {
    expect(JURISDICTION_SPELLING_LOCALE.ES).toBe('es-ES');
    expect(SPELLING_LOCALES['es-ES'].available).toBe(true);
  });
  it('refines Spanish dictation without translating it', () => {
    expect(dictationLanguageForLocale('es-ES')).toBe('es');
    const prompt = buildDictationRefinementSystem({ language: 'es' });
    expect(prompt).toContain('Spanish (Spain)');
    expect(prompt).toContain('never translate');
  });
  it('translates the headline strings and keeps the Spain-specific ones', () => {
    expect((es as any).jurisdictionNames.ES).toBe('España');
    expect((en as any).jurisdictionNames.ES).toBe('Spain');
    expect((es as any).language.es).toBe('Español (España)');
  });
  it('words Spanish plurals for large counts too (many = other)', () => {
    const flat = (o: any, p = ''): Record<string, string> => Object.fromEntries(Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[p + k, v]] : Object.entries(flat(v, `${p}${k}.`)))));
    const f = flat(es);
    const others = Object.keys(f).filter(k => k.endsWith('_other'));
    expect(others.length).toBeGreaterThan(100);
    for (const k of others) expect(f[k.replace(/_other$/, '_many')], k).toBe(f[k]);
  });
});

describe('what Batch 622 leaves for later', () => {
  it('keeps the research and the hold list on file', () => {
    const doc = readFileSync(resolve(__dirname, '../../docs/product/SPAIN_RESEARCH.md'), 'utf8');
    expect(doc).toContain('Veri*Factu');
    expect(doc).toContain('SNOMED');
  });
});
