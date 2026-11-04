// Batch 624: shipped flag names show in the user's language; everything else shows as stored.
import { describe, expect, it } from 'vitest';
import en from '@/i18n/locales/en.json';
import fr from '@/i18n/locales/fr.json';
import { flagDisplayName, SHIPPED_FLAG_KEYS, SHIPPED_FLAG_NAMES } from './shippedFlagNames';

const lookup = (dict: unknown) => (key: string): string =>
  key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], dict) as string;

describe('flagDisplayName', () => {
  it('translates a shipped flag name', () => {
    expect(flagDisplayName('STAT — Rush Processing', lookup(fr))).toBe('URGENT — Traitement prioritaire');
  });
  it('leaves an admin-made or renamed flag as typed', () => {
    expect(flagDisplayName('Our Own Rush Flag', lookup(fr))).toBe('Our Own Rush Flag');
  });
  it('leaves names that carry a result or a gene as stored', () => {
    for (const n of ['BRAF V600E Positive', 'PD-L1 CPS 15', 'VHL Mutation', 'ER / PR / HER2', 'HER2 FISH']) {
      expect(flagDisplayName(n, lookup(fr))).toBe(n);
    }
  });
  it('has no name when there is none', () => {
    expect(flagDisplayName(undefined, lookup(fr))).toBeUndefined();
  });
  it('every shipped name has its text, and the English text is the stored name', () => {
    const t = lookup(en);
    SHIPPED_FLAG_NAMES.forEach((name, i) => {
      expect(t(SHIPPED_FLAG_KEYS[i])).toBe(name);
    });
  });
});
