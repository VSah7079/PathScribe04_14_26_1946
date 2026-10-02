import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import i18next from 'i18next';
import en from '@/i18n/locales/en.json';
import de from '@/i18n/locales/de.json';
import fr from '@/i18n/locales/fr.json';
import nl from '@/i18n/locales/nl.json';
import ko from '@/i18n/locales/ko.json';
import { SURGICAL_REPORT_LABEL_KEYS, surgicalReportLabelsFor, formatReportDateOfBirth } from './surgicalReportLabels';

const root = path.resolve(__dirname, '../../..');

describe('surgical report labels (Batch 392)', () => {
  it('every language has every label, with {{name}} exactly where English has it', () => {
    for (const [lang, file] of Object.entries({ en, de, fr, nl, ko } as Record<string, any>)) {
      expect(Object.keys(file.surgicalReportPdf).sort(), lang).toEqual([...SURGICAL_REPORT_LABEL_KEYS].sort());
      for (const k of SURGICAL_REPORT_LABEL_KEYS) expect(file.surgicalReportPdf[k].includes('{{name}}'), `${lang}.${k}`).toBe((en as any).surgicalReportPdf[k].includes('{{name}}'));
    }
  });
  it('the renderer\'s English fallback (functions/main.py DEFAULT_LABELS) matches en.json', () => {
    const py = fs.readFileSync(path.join(root, 'functions/main.py'), 'utf8');
    const block = py.slice(py.indexOf('DEFAULT_LABELS = {'), py.indexOf('\n}', py.indexOf('DEFAULT_LABELS = {')));
    const pairs = Object.fromEntries([...block.matchAll(/'(\w+)': '([^']*)'/g)].map(m => [m[1], m[2]]));
    expect(pairs).toEqual((en as any).surgicalReportPdf);
  });
  it('gives the labels in the report language, placeholders kept for the renderer', async () => {
    await i18next.init({ lng: 'en', resources: { en: { translation: en }, de: { translation: de } }, interpolation: { escapeValue: false } });
    const labels = surgicalReportLabelsFor('de')!;
    expect(labels.mrn).toBe('Patienten-Nr.');
    expect(labels.reportTemplate).toBe('Befundvorlage: {{name}}');
    expect(surgicalReportLabelsFor('xx')!.mrn).toBe('MRN');
  });
  it('writes the date of birth in the report locale, on its own calendar day', () => {
    expect(formatReportDateOfBirth('1988-04-02', 'en-GB')).toBe('02 April 1988');
    expect(formatReportDateOfBirth('1988-04-02', 'de-DE')).toBe('02. April 1988');
    expect(formatReportDateOfBirth(undefined, 'en-GB')).toBe('');
  });
});
