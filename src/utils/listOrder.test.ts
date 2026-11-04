import { describe, it, expect } from 'vitest';
import { moveIdOnto, moveIdBy } from './listOrder';

describe('reordering slides (touch spec T4)', () => {
  it('drag onto another row, as before', () => {
    expect(moveIdOnto(['a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'c', 'a']);
    expect(moveIdOnto(['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b']);
    expect(moveIdOnto(['a', 'b'], 'x', 'a')).toEqual(['a', 'b']);
  });
  it('Move up and Move down, stopping at the ends', () => {
    expect(moveIdBy(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moveIdBy(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b']);
    expect(moveIdBy(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
    expect(moveIdBy(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c']);
  });
});
