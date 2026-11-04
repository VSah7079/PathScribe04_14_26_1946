// Batch 758: what sign-out would leave behind, asked about first.
import { describe, it, expect, vi } from 'vitest';
import { registerLeaveGuard, leaveWarnings, mayLeave } from './leaveGuards';

describe('leaveGuards (Batch 758)', () => {
  it('asks only while something would be left behind, and staying cancels', () => {
    const ask = vi.fn(() => false);
    expect(mayLeave(ask)).toBe(true);
    expect(ask).not.toHaveBeenCalled();
    let count = 2;
    const off = registerLeaveGuard('bench:st-1', () => (count > 0 ? `${count} slides on the bench` : null));
    expect(leaveWarnings()).toEqual(['2 slides on the bench']);
    expect(mayLeave(ask)).toBe(false);
    expect(ask).toHaveBeenCalledWith('2 slides on the bench');
    expect(mayLeave(() => true)).toBe(true);
    count = 0;
    expect(leaveWarnings()).toEqual([]);
    off();
    count = 1;
    expect(leaveWarnings()).toEqual([]);
  });

  it('a newer registration under the same id is not removed by the older one\'s cleanup', () => {
    const offOld = registerLeaveGuard('x', () => 'old');
    const offNew = registerLeaveGuard('x', () => 'new');
    offOld();
    expect(leaveWarnings()).toEqual(['new']);
    offNew();
    expect(leaveWarnings()).toEqual([]);
  });
});
