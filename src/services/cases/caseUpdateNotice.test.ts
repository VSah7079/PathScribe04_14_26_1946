// src/services/cases/caseUpdateNotice.test.ts — Batch 572.
import { describe, it, expect } from 'vitest';
import { caseUpdateStillNews, caseUpdateToShow } from './caseUpdateNotice';
import { changedCaseIds } from './mockCaseService';

describe('caseUpdateToShow', () => {
  it('a newer version than the page knows and than the last dismissed; nothing otherwise', () => {
    expect(caseUpdateToShow(3, 4, 0)).toBe(4);
    expect(caseUpdateToShow(4, 4, 0)).toBeNull();
    expect(caseUpdateToShow(5, 4, 0)).toBeNull();
    expect(caseUpdateToShow(3, 4, 4)).toBeNull();
    expect(caseUpdateToShow(3, 5, 4)).toBe(5);
    expect(caseUpdateToShow(3, undefined, 0)).toBeNull();
  });
  it('a notice stops being news once the page catches up', () => {
    expect(caseUpdateStillNews(5, 4)).toBe(true);
    expect(caseUpdateStillNews(5, 5)).toBe(false);
    expect(caseUpdateStillNews(null, 0)).toBe(false);
  });
});

describe('changedCaseIds (the demo stand-in)', () => {
  it('names the cases another tab moved on, and no others', () => {
    const before = [{ id: 'a', version: 1 }, { id: 'b', version: 2 }] as any;
    const after = [{ id: 'a', version: 2 }, { id: 'b', version: 2 }, { id: 'c', version: 1 }] as any;
    expect(changedCaseIds(before, after)).toEqual(['a', 'c']);
  });
});
