// src/constants/configSearchCoverage.test.ts
// Batch 431 (Pete: Field Requirements couldn't be found): every tab and every
// System, Cytology and Synoptic Library section is searchable, and every entry
// that names a section names a real one on the right tab.
import { describe, it, expect } from 'vitest';
import { CONFIG_SEARCH_INDEX, CONFIG_TABS, PROTOCOL_SECTIONS, STAFF_SECTIONS, TEMPLATE_SECTIONS, VALIDATION_SECTIONS } from './configSearchIndex';
import { SECTIONS as SYSTEM_SECTIONS } from '../components/Config/System/systemSections';
import { SECTIONS as CYTOLOGY_SECTIONS } from '../components/Config/Cytology/cytologySections';
import en from '../i18n/locales/en.json';
import fr from '../i18n/locales/fr.json';
import de from '../i18n/locales/de.json';
import nl from '../i18n/locales/nl.json';
import ko from '../i18n/locales/ko.json';

const SECTION_IDS: Record<string, Set<string>> = {
  system: new Set(SYSTEM_SECTIONS.map(s => s.id)),
  cytology: new Set(CYTOLOGY_SECTIONS.map(s => s.id)),
  protocols: new Set(PROTOCOL_SECTIONS.map(s => s.id)),
  staff: new Set(STAFF_SECTIONS.map(s => s.id)),
  // Batch 449: the inner tabs of Report Templates and Validation Studies.
  templates: new Set(TEMPLATE_SECTIONS.map(s => s.id)),
  validation: new Set(VALIDATION_SECTIONS.map(s => s.id)),
};

const has = (key: string) => key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en) !== undefined;

describe('Configuration search covers everything (Batch 431)', () => {
  it('finds Cytology settings, e.g. the daily workload cap', () => {
    expect(CONFIG_SEARCH_INDEX.some(e => e.tabId === 'cytology' && e.section === 'cytology_workload_cap')).toBe(true);
  });

  it('finds Field Requirements', () => {
    expect(CONFIG_SEARCH_INDEX.some(e => e.tabId === 'system' && e.section === 'field_requirements')).toBe(true);
  });

  // Batch 530 (Pete: every new configuration reachable from Config Search).
  it.each([
    ['staff required fields', 'field_requirements'], ['postal code', 'field_requirements'], ['clinical history required', 'field_requirements'],
    ['mismatch', 'clinical_mismatch_rules'], ['block sign-out', 'clinical_mismatch_rules'], ['unexpected malignancy', 'clinical_mismatch_rules'],
  ])('"%s" finds the %s section', (query, section) => {
    expect(CONFIG_SEARCH_INDEX.some(e => e.section === section && e.synonyms.some(s => s.toLowerCase().includes(query)))).toBe(true);
  });

  it.each(['system', 'cytology', 'staff', 'protocols', 'templates', 'validation'] as const)('every %s section has an entry', tab => {
    const covered = new Set(CONFIG_SEARCH_INDEX.filter(e => e.tabId === tab).map(e => e.section));
    expect([...SECTION_IDS[tab]].filter(id => !covered.has(id))).toEqual([]);
  });

  it('every tab has an entry', () => {
    const tabs = new Set(CONFIG_SEARCH_INDEX.map(e => e.tabId));
    expect(CONFIG_TABS.filter(t => !tabs.has(t))).toEqual([]);
  });

  it('an entry that names a section names a real one on its own tab', () => {
    const bad = CONFIG_SEARCH_INDEX.filter(e => e.section && !SECTION_IDS[e.tabId]?.has(e.section)).map(e => `${e.id} → ${e.tabId}/${e.section}`);
    expect(bad).toEqual([]);
  });

  it('every label, description and context key exists in English', () => {
    const missing = CONFIG_SEARCH_INDEX.flatMap(e => [e.labelKey, e.descriptionKey, e.contextKey].filter((k): k is string => !!k && !has(k)));
    expect(missing).toEqual([]);
  });

  // Batch 449: entries were showing users developer notes ("(Undocumented) …
  // needs review against actual component") and pointing at removed settings.
  it('no placeholder entries, and no description reads like a developer note, in any language', () => {
    expect(CONFIG_SEARCH_INDEX.filter(e => e.confidence === 'placeholder').map(e => e.id)).toEqual([]);
    const get = (loc: unknown, key: string) => key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], loc);
    const notes = [en, fr, de, nl, ko].flatMap(loc => CONFIG_SEARCH_INDEX.flatMap(e => [e.labelKey, e.descriptionKey].filter((k): k is string => !!k)
      .map(k => String(get(loc, k) ?? '')).filter(text => /undocumented|needs review|placeholder|TODO|stub/i.test(text))));
    expect(notes).toEqual([]);
  });

  it('ids are unique', () => {
    const ids = CONFIG_SEARCH_INDEX.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
