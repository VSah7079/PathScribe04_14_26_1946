import { describe, it, expect } from 'vitest';
import { fillViewportHeight } from './fillViewportHeight';

describe('fillViewportHeight (Batch 395)', () => {
  it('reaches the bottom of the window, less the margin', () => {
    expect(fillViewportHeight(400, 1032)).toBe(616);
    expect(fillViewportHeight(400.6, 1032)).toBe(615);
  });
  it('never goes below the minimum (a short window, or a panel pushed low)', () => {
    expect(fillViewportHeight(900, 1032)).toBe(200);
  });
});
