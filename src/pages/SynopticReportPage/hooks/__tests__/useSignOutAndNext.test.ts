// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSignOutAndNext, type SignOutAndNextInput } from '../useSignOutAndNext';

const base = (over: Partial<SignOutAndNextInput> = {}): SignOutAndNextInput => ({
  caseId: 'c1', signed: false, queue: ['c1', 'c2'], queueIndex: 0, openNext: vi.fn(), notifyNoNext: vi.fn(), now: () => 1000, ...over,
});
const run = (first: SignOutAndNextInput) => renderHook((p: SignOutAndNextInput) => useSignOutAndNext(p), { initialProps: first });

describe('useSignOutAndNext (Orchestration Sign Out and Next, Assist Finalise & Next)', () => {
  it('opens the next case once, when the armed flow ends with the case done', () => {
    const input = base();
    const h = run(input);
    h.result.current.arm();
    h.rerender({ ...input, signed: true });
    expect(input.openNext).toHaveBeenCalledTimes(1);
    h.rerender({ ...input, signed: true });
    expect(input.openNext).toHaveBeenCalledTimes(1);
  });
  it('still moves on when a check parked the sign-out and it completed later', () => {
    const input = base();
    const h = run(input);
    h.result.current.arm();                      // press; a fixative check parks the sign-out; the window closes; later it completes
    h.rerender({ ...input });
    h.rerender({ ...input, signed: true });
    expect(input.openNext).toHaveBeenCalledTimes(1);
  });
  it('says so, and stays, when there is no next case', () => {
    const input = base({ queue: ['c1'] });
    const h = run(input);
    h.result.current.arm();
    h.rerender({ ...input, signed: true });
    expect(input.notifyNoNext).toHaveBeenCalledTimes(1);
    expect(input.openNext).not.toHaveBeenCalled();
  });
  it('a plain press clears the arming', () => {
    const input = base();
    const h = run(input);
    h.result.current.arm();
    h.result.current.disarm();
    h.rerender({ ...input, signed: true });
    expect(input.openNext).not.toHaveBeenCalled();
  });
  it('a different case clears the arming', () => {
    const input = base();
    const h = run(input);
    h.result.current.arm();
    h.rerender({ ...input, caseId: 'c2' });
    h.rerender({ ...input, caseId: 'c2', signed: true });
    expect(input.openNext).not.toHaveBeenCalled();
  });
  it('an arming left over for ten minutes does not move the person on', () => {
    let t = 0;
    const input = base({ now: () => t });
    const h = run(input);
    h.result.current.arm();
    t = 10 * 60 * 1000 + 1;
    h.rerender({ ...input, signed: true });
    expect(input.openNext).not.toHaveBeenCalled();
  });
});
