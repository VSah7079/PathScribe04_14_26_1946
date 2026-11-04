import { describe, it, expect } from 'vitest';
import { SUPPORTED_LANGUAGES } from '@/i18n/config';
import { JURISDICTION_LABELS } from '@/types/systemConfig';
import {
  REPORT_LANGUAGES, DEFAULT_REPORT_LANGUAGE_BY_JURISDICTION, defaultReportLanguage, resolveReportLanguage, resolvePdfLanguage, isReportLanguage, resolveReportDateLocale, reportDateLocale,
} from './reportLanguage';

describe('report language (Batch 391)', () => {
  it('offers exactly the languages the app is translated into', () => {
    expect([...REPORT_LANGUAGES].sort()).toEqual([...SUPPORTED_LANGUAGES].sort());
  });
  it('every jurisdiction has a default, and it is a supported language', () => {
    for (const j of Object.keys(JURISDICTION_LABELS)) expect(isReportLanguage((DEFAULT_REPORT_LANGUAGE_BY_JURISDICTION as any)[j]), j).toBe(true);
  });
  it('Dutch, German and French labs report in their own language; English-speaking jurisdictions in English', () => {
    expect(defaultReportLanguage('NL')).toBe('nl');
    expect(defaultReportLanguage('DE')).toBe('de');
    expect(defaultReportLanguage('FR')).toBe('fr');
    expect(defaultReportLanguage('KR')).toBe('ko');
    expect(defaultReportLanguage('BE')).toBe('nl-BE');
    for (const j of ['US', 'CA', 'GB_EW', 'GB_SCT', 'GB_NIR', 'IE', 'AU', 'NZ'] as const) expect(defaultReportLanguage(j)).toBe('en');
  });
  it('a lab\'s own setting wins over its jurisdiction (a French-speaking Belgian lab)', () => {
    expect(resolveReportLanguage({ jurisdiction: 'BE', reportLanguage: 'fr-BE' })).toBe('fr-BE');
    expect(resolveReportLanguage({ jurisdiction: 'BE' })).toBe('nl-BE');
  });
  it('an unknown setting or no lab falls back safely', () => {
    expect(resolveReportLanguage({ jurisdiction: 'DE', reportLanguage: 'xx' })).toBe('de');
    expect(resolveReportLanguage(undefined)).toBe('en');
  });
  it('the PDF is worded in the report language (Korean included, Batch 391 Pretendard)', () => {
    expect(resolvePdfLanguage('nl-BE')).toBe('nl-BE');
    expect(resolvePdfLanguage('de')).toBe('de');
    expect(resolvePdfLanguage('ko')).toBe('ko');
    expect(resolvePdfLanguage(undefined)).toBe('en');
    expect(resolvePdfLanguage('zz')).toBe('en');
  });
  it('dates follow the lab\'s jurisdiction, else the language', () => {
    const loc = (j: string) => ({ GB_EW: 'en-GB', DE: 'de-DE' } as Record<string, string>)[j];
    expect(resolveReportDateLocale({ jurisdiction: 'GB_EW' }, loc)).toBe('en-GB');
    expect(resolveReportDateLocale({ jurisdiction: 'DE' }, loc)).toBe('de-DE');
    expect(resolveReportDateLocale(undefined, loc)).toBe('en-US');
    expect(reportDateLocale({ language: 'nl', locale: 'nl-BE' })).toBe('nl-BE');
    expect(reportDateLocale({ language: 'fr' })).toBe('fr-FR');
    expect(reportDateLocale({})).toBe('en-US');
  });
});
