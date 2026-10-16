// Batch 528 (PS-359): every page, group, field, lock reason and hint in the
// Field Requirements catalog has its text in all five languages; the screen
// builds these keys at run time, so the usual missing-key checks can't see them.
import { describe, it, expect } from 'vitest';
import { FIELD_REQUIREMENT_PAGES, FIELD_GROUP_ORDER } from './fieldRequirementRules';
import en from '../../i18n/locales/en.json';
import fr from '../../i18n/locales/fr.json';
import de from '../../i18n/locales/de.json';
import nl from '../../i18n/locales/nl.json';
import ko from '../../i18n/locales/ko.json';

const LOCALES = { en, fr, de, nl, ko } as Record<string, Record<string, unknown>>;
const text = (d: Record<string, unknown>, path: string): unknown =>
  path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), d);

describe('Field Requirements catalog text (PS-359)', () => {
  const keys: string[] = [];
  for (const [page, fields] of Object.entries(FIELD_REQUIREMENT_PAGES)) {
    keys.push(`fieldRequirements.pages.${page}`);
    for (const f of fields) {
      keys.push(`fieldRequirements.fields.${page}.${f.id}`, `fieldRequirements.groups.${f.group}`);
      if (f.lockReason) keys.push(`fieldRequirements.lockReasons.${f.lockReason}`);
      if (f.hint) keys.push(`fieldRequirements.hints.${f.hint}`);
    }
  }
  for (const [lang, d] of Object.entries(LOCALES)) {
    it(`${lang}: every catalog entry has text`, () => {
      const missing = [...new Set(keys)].filter(k => typeof text(d, k) !== 'string' || !(text(d, k) as string).trim());
      expect(missing).toEqual([]);
    });
  }
  it('every group used is in the display order', () => {
    const used = new Set(Object.values(FIELD_REQUIREMENT_PAGES).flat().map(f => f.group));
    expect([...used].filter(g => !FIELD_GROUP_ORDER.includes(g))).toEqual([]);
  });
  it('the new pages: Staff, Facility editor and Clinical history, with reasons on every locked field', () => {
    expect(Object.keys(FIELD_REQUIREMENT_PAGES)).toEqual(expect.arrayContaining(['staff', 'facility', 'clinicalHistory']));
    for (const page of ['staff', 'facility', 'clinicalHistory'] as const)
      for (const f of FIELD_REQUIREMENT_PAGES[page]) if (f.default === 'locked') expect(f.lockReason, `${page}.${f.id}`).toBeTruthy();
  });
});
