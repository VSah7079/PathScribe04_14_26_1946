// Batch 696: the origin of an AI-suggested code is checked before it is shown.
import { describe, it, expect } from 'vitest';
import { normaliseSuggestionOrigin, specimenNamedIn } from './suggestionOrigin';

const texts = { gross: 'A: Right breast mastectomy, 512 g.\nB: Right axillary contents.', microscopic: 'A: Invasive carcinoma, grade 3.', ancillary: '', narrative: '', hasSynoptic: true };

describe('normaliseSuggestionOrigin', () => {
  it('keeps a known part that holds text, and a specimen the text names', () => {
    expect(normaliseSuggestionOrigin('microscopic', 'a', texts)).toEqual({ sourceSection: 'microscopic', specimenLabel: 'A' });
  });
  it('drops a part with no text, so a guess is never shown as the source', () => {
    expect(normaliseSuggestionOrigin('ancillary', 'A', texts)).toEqual({});
    expect(normaliseSuggestionOrigin('narrative', null, texts)).toEqual({});
  });
  it('drops a part the product does not know', () => {
    expect(normaliseSuggestionOrigin('clinical history', null, texts)).toEqual({});
    expect(normaliseSuggestionOrigin(undefined, undefined, texts)).toEqual({});
  });
  it('keeps the part but not a specimen the text never names', () => {
    expect(normaliseSuggestionOrigin('gross', 'D', texts)).toEqual({ sourceSection: 'gross' });
    expect(normaliseSuggestionOrigin('gross', null, texts)).toEqual({ sourceSection: 'gross' });
  });
  it('the synoptic part needs synoptic answers', () => {
    expect(normaliseSuggestionOrigin('synoptic', null, texts)).toEqual({ sourceSection: 'synoptic' });
    expect(normaliseSuggestionOrigin('synoptic', null, { ...texts, hasSynoptic: false })).toEqual({});
  });
});

describe('specimenNamedIn', () => {
  it('accepts "Specimen B" and "B:" forms, and refuses a bare letter in running text', () => {
    expect(specimenNamedIn('B', { gross: 'Specimen B is a node.', microscopic: '', ancillary: '' })).toBe(true);
    expect(specimenNamedIn('B', { gross: 'B: a node.', microscopic: '', ancillary: '' })).toBe(true);
    expect(specimenNamedIn('B', { gross: 'a B cell lymphoma', microscopic: '', ancillary: '' })).toBe(false);
  });
  it('refuses a label that is not a short letter or number', () => {
    expect(specimenNamedIn('.*', texts)).toBe(false);
    expect(specimenNamedIn('LONGER', texts)).toBe(false);
  });
});
