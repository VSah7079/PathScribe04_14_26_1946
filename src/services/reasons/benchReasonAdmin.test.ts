import { describe, it, expect } from 'vitest';
import type { ReasonDictionaryEntry } from '@/types/reasons/ReasonDictionaryEntry';
import { benchWordingProblem, nextSortOrder, moveBenchReason, defaultWordingOf } from './benchReasonAdmin';

const e = (id: string, name: string, sortOrder: number, status: 'Active' | 'Inactive' = 'Active'): ReasonDictionaryEntry =>
  ({ id, category: 'BENCH_BATCH_ABORT', name, description: '', status, sortOrder });
const list = [e('A', 'Created in error', 1), e('B', 'Wrong rack', 2), e('C', 'Old', 3, 'Inactive'), e('D', 'Power cut', 4)];
const shown = (x: ReasonDictionaryEntry) => (x.id === 'A' ? 'Créé par erreur' : x.name);

describe('Bench Reasons configuration (Batch 736)', () => {
  it('a wording is required and unique among the active reasons, in any language shown', () => {
    expect(benchWordingProblem('  ', undefined, list, shown)).toBe('required');
    expect(benchWordingProblem('wrong rack', undefined, list, shown)).toBe('duplicate');
    expect(benchWordingProblem('créé par erreur', 'D', list, shown)).toBe('duplicate');
    expect(benchWordingProblem('Wrong rack', 'B', list, shown)).toBeNull();
    expect(benchWordingProblem('Old', undefined, list, shown)).toBeNull();
  });
  it('a new reason goes last; moving swaps with the neighbour, nothing at the ends', () => {
    expect(nextSortOrder(list)).toBe(5);
    expect(moveBenchReason(list, 'D', -1)).toEqual([{ id: 'D', sortOrder: 2 }, { id: 'B', sortOrder: 3 }]);
    expect(moveBenchReason(list, 'A', -1)).toEqual([]);
    expect(moveBenchReason(list, 'D', 1)).toEqual([]);
  });
  it('a default reason can go back to its shipped wording; a lab\'s own reason has none', () => {
    expect(defaultWordingOf('BA_CREATED_IN_ERROR')).toBe('Created in error');
    expect(defaultWordingOf('reason-123')).toBeUndefined();
  });
});
