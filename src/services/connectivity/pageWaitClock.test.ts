// src/services/connectivity/pageWaitClock.test.ts (Batch 563)
import { describe, it, expect } from 'vitest';
import { createPageWaitClock } from './pageWaitClock';

describe('page wait clock', () => {
  it('a loader that follows another within a second continues its wait; later, a new wait starts', () => {
    const c = createPageWaitClock();
    expect(c.start(1_000)).toBe(1_000);
    c.end(4_000);
    expect(c.peek(4_400)).toBe(1_400);    // what a loader appearing now would count from, without starting it
    expect(c.start(4_400)).toBe(1_400);   // the signed-in app's loader after the app's: 3 s already waited, kept
    c.end(6_000);
    expect(c.start(9_000)).toBe(9_000);   // a page opened later: a new wait
    c.end(9_100);
    expect(c.start(9_500)).toBe(9_400);   // a quick wait followed by another: only the 100 ms waited carries on
  });

  it('two loaders at once share the first one\'s start', () => {
    const c = createPageWaitClock();
    expect(c.start(100)).toBe(100);
    expect(c.start(900)).toBe(100);
    c.end(1_000);
    expect(c.start(5_000)).toBe(100);     // one was still open, so the wait never ended
  });
});
