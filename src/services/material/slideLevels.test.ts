// Batch 460: a slide's level is the one printed on its label, not its position.
import { describe, it, expect } from 'vitest';
import { slideLevelOf, stainIndexAtLevel, stainAtLevel, nextSlideLevelNumber, isSlideAtLevel } from './slideLevels';

const slides = [
  { id: 'c', displayId: 'S26-1-A1-L3' },
  { id: 'a', displayId: 'S26-1-A1-L1' },
  { id: 'old' },                          // older data: no displayId
  { id: 'm', displayId: 'S26-1-M1-L12' },
];

describe('slideLevels', () => {
  it('reads the level from the displayId, else the position', () => {
    expect(slides.map((s, i) => slideLevelOf(s, i))).toEqual(['L3', 'L1', 'L3', 'L12']);
  });
  it('finds the slide a scanned level means, after a reorder', () => {
    expect(stainIndexAtLevel(slides, 'L1')).toBe(1);
    expect(stainAtLevel(slides, 'l12')?.id).toBe('m');
    expect(stainIndexAtLevel(slides, 'L7')).toBe(-1);
    expect(stainAtLevel(undefined, 'L1')).toBeUndefined();
    expect(isSlideAtLevel(slides[0], 0, 'L3')).toBe(true);
  });
  it('the next level is past the highest ever used (a deleted level is not reused)', () => {
    expect(nextSlideLevelNumber([{ displayId: 'X-A1-L1' }, { displayId: 'X-A1-L3' }])).toBe(4);
    expect(nextSlideLevelNumber([])).toBe(1);
    expect(nextSlideLevelNumber(undefined)).toBe(1);
  });
});
