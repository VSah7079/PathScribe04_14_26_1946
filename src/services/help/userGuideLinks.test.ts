// src/services/help/userGuideLinks.test.ts — Batch 657: which article opens for which screen.
import { describe, it, expect } from 'vitest';
import { userGuideSlugForRoute } from './userGuideLinks';

describe('userGuideSlugForRoute', () => {
  it('the Home page opens the Home article, and only the Home page', () => {
    expect(userGuideSlugForRoute('/')).toBe('home');
    expect(userGuideSlugForRoute('')).toBe('home');
  });
  it('a screen with a parameter in its address finds its article whatever the parameter is', () => {
    expect(userGuideSlugForRoute('/case/HFHS26-1004-LU/grossing')).toBe('grossing');
    expect(userGuideSlugForRoute('/case/MPA26-1001-BR/synoptic?tab=1')).toBe('report');
  });
  it('screens with no article, the help pages and Configuration open nothing', () => {
    expect(userGuideSlugForRoute('/configuration')).toBeNull();
    expect(userGuideSlugForRoute('/help/accession')).toBeNull();
    expect(userGuideSlugForRoute('/no-such-screen')).toBeNull();
  });
});
