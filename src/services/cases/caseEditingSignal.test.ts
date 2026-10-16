// src/services/cases/caseEditingSignal.test.ts — Batch 573.
import { describe, it, expect } from 'vitest';
import { isPersonsDirtySection, isPersonsEdit, isReportEditEvent, SETUP_DIRTY_WINDOW_MS } from './caseEditingSignal';

describe('isPersonsEdit', () => {
  it('nothing unsaved: not editing', () => expect(isPersonsEdit(false, 5_000, 0)).toBe(false));
  it('marked while the page was setting itself up: not editing', () => expect(isPersonsEdit(true, SETUP_DIRTY_WINDOW_MS - 1, 0)).toBe(false));
  it('marked later: the person is editing', () => expect(isPersonsEdit(true, SETUP_DIRTY_WINDOW_MS, 0)).toBe(true));
  it('no time recorded yet: editing', () => expect(isPersonsEdit(true, null, 0)).toBe(true));

  it('Batch 576: marked while setting up, then the person types in the report: editing', () => {
    expect(isPersonsEdit(true, 100, 0, 2_000)).toBe(true);
    expect(isPersonsEdit(true, 100, 5_000, 2_000)).toBe(false); // an edit before this case loaded doesn't count
    expect(isPersonsEdit(false, 100, 0, 2_000)).toBe(false);
  });
  it('Batch 576: only an edit inside the report counts', () => {
    expect(isReportEditEvent({ closest: (s: string) => (s === '.ps-syn-panel' ? {} : null) })).toBe(true);
    expect(isReportEditEvent({ closest: () => null })).toBe(false);
    expect(isReportEditEvent(null)).toBe(false);
  });

  it('Batch 576: every unsaved change but the two set-up can mark is the person\'s', () => {
    expect(isPersonsDirtySection('flags')).toBe(true);
    expect(isPersonsDirtySection('specimens')).toBe(true);
    expect(isPersonsDirtySection('synopticFields')).toBe(false);
    expect(isPersonsDirtySection('restoredDraft')).toBe(false);
  });
});
