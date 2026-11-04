import { describe, it, expect } from 'vitest';
import { matchStrength, STRONG_MATCH_FROM } from './matchStrength';
describe('matchStrength (Batch 690; the row moved to AiSuggestionMeta in Batch 696)', () => {
  it('85 and above is strong, below is possible, missing is possible', () => {
    expect(matchStrength(STRONG_MATCH_FROM)).toBe('strong');
    expect(matchStrength(99)).toBe('strong');
    expect(matchStrength(84)).toBe('possible');
    expect(matchStrength(undefined)).toBe('possible');
    expect(matchStrength(null)).toBe('possible');
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
describe('where the label is used (Batch 690; the row moved to AiSuggestionMeta in Batch 696)', () => {
  it('AI code suggestions always show the plain label, never a percentage (Batch 706)', () => {
    const src = readFileSync(resolve(__dirname, '../../pages/Synoptic/Codes/AiSuggestionMeta.tsx'), 'utf8');
    expect(src).not.toContain('showsConfidence');
    expect(src).not.toContain('{sug.confidence}%');
    expect(src).toContain('data-testid="code-match-strength"');
    expect(src).toContain("t(`addCodeModal.match.${matchStrength(sug.confidence)}`)");
  });
});
