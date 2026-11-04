import { describe, it, expect } from 'vitest';
import { DIRTY_SECTION_IDS, dirtySectionList } from './dirtySections';
import en from '@/i18n/locales/en.json';
import fr from '@/i18n/locales/fr.json';
import de from '@/i18n/locales/de.json';
import nl from '@/i18n/locales/nl.json';
import ko from '@/i18n/locales/ko.json';

describe('report page unsaved-change sections (Batch 445)', () => {
  it('every section id has its label in all five languages', () => {
    for (const locale of [en, fr, de, nl, ko]) {
      const labels = (locale as { unsavedWarningModal: { sections: Record<string, string> } }).unsavedWarningModal.sections;
      for (const id of DIRTY_SECTION_IDS) expect(labels[id], id).toBeTruthy();
      expect(Object.keys(labels).sort()).toEqual([...DIRTY_SECTION_IDS].sort());
    }
  });
  it('lists each marked section once, in the order marked', () => {
    expect(dirtySectionList(['blocks', 'codes', 'blocks'])).toEqual(['blocks', 'codes']);
  });
});
