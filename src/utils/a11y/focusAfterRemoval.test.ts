// src/utils/a11y/focusAfterRemoval.test.ts — Batches 569 and 570.
import { describe, it, expect } from 'vitest';
import { focusTargetAfterRemoval, isNonPointerClick } from './focusAfterRemoval';

describe('focusTargetAfterRemoval', () => {
  it('the next item; the one before when the last goes; none when the list empties or the id is unknown', () => {
    expect(focusTargetAfterRemoval(['a', 'b', 'c'], 'b')).toBe('c');
    expect(focusTargetAfterRemoval(['a', 'b', 'c'], 'c')).toBe('b');
    expect(focusTargetAfterRemoval(['a'], 'a')).toBeNull();
    expect(focusTargetAfterRemoval(['a', 'b'], 'x')).toBeNull();
  });
  it('Batch 570: skips items no longer in the list now', () => {
    expect(focusTargetAfterRemoval(['a', 'b', 'c', 'd'], 'b', ['a', 'd'])).toBe('d');
    expect(focusTargetAfterRemoval(['a', 'b', 'c'], 'c', ['a'])).toBe('a');
    expect(focusTargetAfterRemoval(['a', 'b'], 'a', [])).toBeNull();
  });
});

describe('isNonPointerClick', () => {
  it('keyboard (detail 0) and a Firefox screen-reader click; not a mouse click', () => {
    expect(isNonPointerClick({ detail: 0 })).toBe(true);
    expect(isNonPointerClick({ detail: 1 })).toBe(false);
    expect(isNonPointerClick({ detail: 1, nativeEvent: Object.assign(new Event('click'), { mozInputSource: 0 }) })).toBe(false); // untrusted
    const trusted = { isTrusted: true, mozInputSource: 0 } as unknown as Event;
    expect(isNonPointerClick({ detail: 1, nativeEvent: trusted })).toBe(true);
    expect(isNonPointerClick({ detail: 1, nativeEvent: { isTrusted: true, mozInputSource: 1 } as unknown as Event })).toBe(false);
  });
});
