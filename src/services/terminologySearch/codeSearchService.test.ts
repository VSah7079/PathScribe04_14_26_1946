// src/services/terminologySearch/codeSearchService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { searchCodes } from './codeSearchService';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

describe('searchCodes("CPT", ...) — real fix: replaces the permanent, documented "not yet implemented" stub', () => {
  it('returns real, seeded codes from the active RVU code map version, not an empty array', async () => {
    const results = await searchCodes('CPT', '');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].system).toBe('CPT');
  });

  it('filters by a real query against code or description', async () => {
    const results = await searchCodes('CPT', '88305');
    expect(results.some(r => r.code === '88305')).toBe(true);
    expect(results.every(r => r.code === '88305')).toBe(true); // no unrelated codes leak in
  });

  it('filters by description text too, not just the code itself', async () => {
    const results = await searchCodes('CPT', 'immunohistochemistry');
    expect(results.some(r => r.code === '88342')).toBe(true);
  });

  it('returns no results for a genuinely unmatched query, not a fabricated fallback', async () => {
    const results = await searchCodes('CPT', 'not-a-real-code-xyz');
    expect(results).toHaveLength(0);
  });
});
