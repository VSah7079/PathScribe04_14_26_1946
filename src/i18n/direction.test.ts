// @vitest-environment happy-dom
// src/i18n/direction.test.ts — Batch 615 (PS-293)
import { describe, it, expect } from 'vitest';
import i18n, { SUPPORTED_LANGUAGES } from './config';
import { directionFor, applyDocumentDirection, RTL_LANGUAGES } from './direction';

describe('text direction follows the language (Batch 615, PS-293)', () => {
  it('Arabic, Hebrew, Persian and Urdu are right to left, with or without a region', () => {
    for (const l of RTL_LANGUAGES) expect(directionFor(l)).toBe('rtl');
    expect(directionFor('ar-EG')).toBe('rtl');
    expect(directionFor('he_IL')).toBe('rtl');
    expect(directionFor('AR')).toBe('rtl');
  });

  it('every language in use today is left to right', () => {
    for (const l of SUPPORTED_LANGUAGES) expect(directionFor(l)).toBe('ltr');
    expect(directionFor(undefined)).toBe('ltr');
    expect(directionFor('')).toBe('ltr');
  });

  it('sets lang and dir on the document element', () => {
    const doc = document.implementation.createHTMLDocument('t');
    expect(applyDocumentDirection('ar', doc)).toBe('rtl');
    expect(doc.documentElement.getAttribute('dir')).toBe('rtl');
    expect(doc.documentElement.getAttribute('lang')).toBe('ar');
    applyDocumentDirection('nl-BE', doc);
    expect(doc.documentElement.getAttribute('dir')).toBe('ltr');
    expect(doc.documentElement.getAttribute('lang')).toBe('nl-BE');
  });

  it('changing the app language updates the page', async () => {
    await i18n.changeLanguage('fr');
    expect(document.documentElement.getAttribute('lang')).toBe('fr');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
    await i18n.changeLanguage('en');
  });
});
