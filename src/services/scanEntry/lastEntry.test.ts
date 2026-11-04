// Batch 759: the last entry, and whether it was a typed entry naming a case.
import { describe, it, expect, vi } from 'vitest';
import { lastEntry, noteEntry, subscribeToEntries, typedEntryNamesCase } from './lastEntry';

describe('lastEntry (Batch 759)', () => {
  it('keeps the last entry and tells listeners', () => {
    const listener = vi.fn();
    const off = subscribeToEntries(listener);
    noteEntry(' S26-0001-A1 ', 'manual', 5);
    expect(lastEntry()).toEqual({ value: 'S26-0001-A1', method: 'manual', at: 5 });
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    noteEntry('S26-0001-A2', 'scan');
    expect(listener).toHaveBeenCalledTimes(1);
  });
  it('a typed accession, block or slide names its case; a scan, another case or a look-alike does not', () => {
    const typed = (value: string) => ({ value, method: 'manual' as const, at: 0 });
    expect(typedEntryNamesCase(typed('s26-0001'), ['S26-0001'])).toBe(true);
    expect(typedEntryNamesCase(typed('S26-0001-A1-L2'), ['S26-0001'])).toBe(true);
    expect(typedEntryNamesCase(typed('O26-0031'), ['S26-0001', 'O26-0031'])).toBe(true);
    expect(typedEntryNamesCase(typed('S26-00011'), ['S26-0001'])).toBe(false);
    expect(typedEntryNamesCase(typed('S26-0002-A1'), ['S26-0001'])).toBe(false);
    expect(typedEntryNamesCase({ value: 'S26-0001-A1', method: 'scan', at: 0 }, ['S26-0001'])).toBe(false);
    expect(typedEntryNamesCase(null, ['S26-0001'])).toBe(false);
  });
});
