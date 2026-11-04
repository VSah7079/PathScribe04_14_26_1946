// PS-101 review (Oct 15, 2026): the case report's breadcrumb names where the case was opened from.
import { describe, it, expect } from 'vitest';
import { caseReturnTarget } from './caseReturnTarget';
import en from '@/i18n/locales/en.json';

const lookup = (key: string): unknown => key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en);

describe('caseReturnTarget', () => {
  it('a case opened from Search goes back to Search, and the breadcrumb says so', () => {
    const target = caseReturnTarget('search');
    expect(target.path).toBe('/search');
    expect(lookup(target.labelKey)).toBe('Search');
    expect(lookup(target.tooltipKey)).toBe('Back to search');
  });
  it('a case opened from the Worklist keeps "Worklist"', () => {
    const target = caseReturnTarget('worklist');
    expect(target.path).toBe('/worklist');
    expect(lookup(target.labelKey)).toBe('Worklist');
    expect(lookup(target.tooltipKey)).toBe('Back to worklist');
  });
});
