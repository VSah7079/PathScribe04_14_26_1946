import { beforeEach, describe, expect, it } from 'vitest';
import { loadCriticalFindings, saveCriticalFindings } from './criticalFindingStore';
import type { CriticalFindingFlag } from './detectCriticalFindings';

const flag = (term: string) => ({ term, sourceQuote: `shows ${term}`, severity: 'Malignant' }) as unknown as CriticalFindingFlag;

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

describe('criticalFindingStore (PS-323)', () => {
  it('gives the same findings back after a save', () => {
    saveCriticalFindings('C1', [flag('invasive carcinoma')]);
    expect(loadCriticalFindings('C1').map(f => f.term)).toEqual(['invasive carcinoma']);
  });

  it('keeps each case separate', () => {
    saveCriticalFindings('C1', [flag('a')]);
    saveCriticalFindings('C2', [flag('b')]);
    expect(loadCriticalFindings('C1')[0].term).toBe('a');
    expect(loadCriticalFindings('C2')[0].term).toBe('b');
  });

  it('clears a case when saved empty', () => {
    saveCriticalFindings('C1', [flag('a')]);
    saveCriticalFindings('C1', []);
    expect(loadCriticalFindings('C1')).toEqual([]);
  });

  it('gives an empty list for a case never saved', () => {
    expect(loadCriticalFindings('nope')).toEqual([]);
  });
});
