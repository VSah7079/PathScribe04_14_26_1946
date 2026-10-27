import { describe, it, expect } from 'vitest';
import { isReactiveChangesCategory, reactiveChangesSetting, reactiveChangesUpdates } from './reactiveChangesPolicy';
import { resolveCytologyReviewRequirement } from './resolveCytologyReviewRequirement';
import { resolveCytologySignOutGate } from './resolveCytologySignOutGate';
import type { CytologyCategoryEntry } from './ICytologyCategoryService';

const cat = (id: string, requiresPathologistReview: boolean, section: CytologyCategoryEntry['section'] = 'interpretation_result') =>
  ({ id, section, requiresPathologistReview }) as CytologyCategoryEntry;

const lab = (a: boolean, b: boolean, c: boolean) => [
  cat('cyto-nonneo-reactive-inflammation', a), cat('cyto-nonneo-reactive-radiation', b), cat('cyto-nonneo-reactive-iud', c),
  cat('cyto-nilm', false), cat('cyto-hsil', true),
];

describe('reactive changes lab setting (PS-163)', () => {
  it('finds only the reactive-change interpretation categories', () => {
    expect(isReactiveChangesCategory(cat('cyto-nonneo-reactive-iud', false))).toBe(true);
    expect(isReactiveChangesCategory(cat('cyto-nonneo-reactive-iud', false, 'recommendation'))).toBe(false);
    expect(isReactiveChangesCategory(cat('cyto-hsil', true))).toBe(false);
  });

  it('reads the setting: cytotechnologist, pathologist, mixed, or no such categories', () => {
    expect(reactiveChangesSetting(lab(false, false, false))).toBe('cytotechnologist');
    expect(reactiveChangesSetting(lab(true, true, true))).toBe('pathologist');
    expect(reactiveChangesSetting(lab(true, false, true))).toBe('mixed');
    expect(reactiveChangesSetting([cat('cyto-hsil', true)])).toBe('none');
  });

  it('turning it on changes only the reactive categories that are off; turning it off the reverse', () => {
    expect(reactiveChangesUpdates(lab(false, true, false), true).map(u => u.id))
      .toEqual(['cyto-nonneo-reactive-inflammation', 'cyto-nonneo-reactive-iud']);
    expect(reactiveChangesUpdates(lab(true, true, true), false)).toHaveLength(3);
    expect(reactiveChangesUpdates(lab(true, true, true), true)).toEqual([]);
  });

  it('the sign-out gate follows the setting for a negative GYN case with reactive changes', () => {
    const gate = (entries: CytologyCategoryEntry[]) => resolveCytologySignOutGate(
      { requiresPathologistReview: resolveCytologyReviewRequirement(['cyto-nonneo-reactive-iud'], entries) },
      true, false, entries, 'US', [],
    );
    expect(gate(lab(false, false, false)).allowed).toBe(true);
    const on = gate(lab(true, true, true));
    expect(on.allowed).toBe(false);
    expect(on.blockedReasons).toEqual(['requires_pathologist_review']);
  });
});
