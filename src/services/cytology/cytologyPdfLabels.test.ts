import { describe, it, expect } from 'vitest';
import i18next from 'i18next';
import en from '@/i18n/locales/en.json';
import fr from '@/i18n/locales/fr.json';
import de from '@/i18n/locales/de.json';
import nl from '@/i18n/locales/nl.json';
import ko from '@/i18n/locales/ko.json';
import nlBE from '@/i18n/locales/nl-BE.json';
import {
  CYTOLOGY_PDF_LABEL_KEYS, CYTOLOGY_PDF_LABEL_VARS, ENGLISH_CYTOLOGY_PDF_LABELS, buildCytologyPdfLabels, fillLabel,
} from './cytologyPdfLabels';
import { cytologyPdfLabelsFor } from './cytologyPdfLabelsFor';

const resources = { en, fr, de, nl, ko, 'nl-BE': nlBE } as const;
const LOCALES = { en, fr, de, nl, ko } as Record<string, any>;

async function instance() {
  const i = i18next.createInstance();
  await i.init({
    lng: 'en', fallbackLng: { 'nl-BE': ['nl', 'en'], default: ['en'] },
    resources: Object.fromEntries(Object.entries(resources).map(([k, v]) => [k, { translation: v }])),
    interpolation: { escapeValue: false },
  });
  return i;
}
const placeholders = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]).sort();

describe('cytology PDF labels (Batch 391)', () => {
  it('the English fallback is exactly `cytologyPdf` in en.json', () => {
    expect(ENGLISH_CYTOLOGY_PDF_LABELS).toEqual((en as any).cytologyPdf);
  });
  it('every label exists in every language with exactly the placeholders it declares', () => {
    for (const [lang, file] of Object.entries(LOCALES)) {
      for (const key of CYTOLOGY_PDF_LABEL_KEYS) {
        const text = file.cytologyPdf?.[key];
        expect(text, `${lang}.${key}`).toBeTruthy();
        expect(placeholders(text), `${lang}.${key}`).toEqual([...CYTOLOGY_PDF_LABEL_VARS[key]].sort());
      }
    }
  });
  it('the locale files carry no label the PDF does not use', () => {
    for (const [lang, file] of Object.entries(LOCALES)) expect(Object.keys(file.cytologyPdf).sort(), lang).toEqual([...CYTOLOGY_PDF_LABEL_KEYS].sort());
  });
  it('a label set built through i18next keeps its {{placeholders}} for the generator to fill', async () => {
    const i = await instance();
    const labels = buildCytologyPdfLabels((k, o) => i.getFixedT('fr')(k, o) as string);
    expect(labels.dob).toBe('Date de naissance : {{date}}');
    expect(labels.signedBy).toBe('Validé par : {{name}}, {{role}} — {{date}}');
    expect(labels.title).toBe(fr.cytologyPdf.title);
  });
  it('Belgian Dutch falls back to Dutch wording', async () => {
    const i = await instance();
    expect(buildCytologyPdfLabels((k, o) => i.getFixedT('nl-BE')(k, o) as string).patient).toBe('Patiënt');
  });
  it('fillLabel fills, and blanks a missing value', () => {
    expect(fillLabel('Page {{page}} of {{total}}', { page: 2, total: 3 })).toBe('Page 2 of 3');
    expect(fillLabel('Reason: {{reason}}', {})).toBe('Reason: ');
  });
});

describe('cytologyPdfLabelsFor', () => {
  it('English, an unknown language and a language the font cannot print get the English wording', () => {
    expect(cytologyPdfLabelsFor('en')).toBe(ENGLISH_CYTOLOGY_PDF_LABELS);
    expect(cytologyPdfLabelsFor(undefined)).toBe(ENGLISH_CYTOLOGY_PDF_LABELS);
    expect(cytologyPdfLabelsFor('ko')).toBe(ENGLISH_CYTOLOGY_PDF_LABELS);
  });
  it('German and Belgian Dutch get their own wording once the app has started', async () => {
    await i18next.init({
      lng: 'en', fallbackLng: { 'nl-BE': ['nl', 'en'], default: ['en'] },
      resources: Object.fromEntries(Object.entries(resources).map(([k, v]) => [k, { translation: v }])), interpolation: { escapeValue: false },
    });
    expect(cytologyPdfLabelsFor('de').interpretation).toBe('Beurteilung / Diagnostisches Ergebnis');
    expect(cytologyPdfLabelsFor('nl-BE').correctedReport).toBe('GECORRIGEERD VERSLAG');
    expect(cytologyPdfLabelsFor('de').continuationPage).toBe('Seite {{page}} von {{total}}');
  });
});
