import { describe, it, expect } from 'vitest';
import { stepSignOutAndNext, hasNextInQueue, signOutDone, armSignOutNext, SIGN_OUT_NEXT_IDLE, ARM_TTL_MS } from './signOutAndNext';

describe('stepSignOutAndNext', () => {
  it('does nothing when not armed, even after a plain sign-out', () => {
    expect(stepSignOutAndNext(SIGN_OUT_NEXT_IDLE, { signed: true, now: 5 })).toEqual({ state: SIGN_OUT_NEXT_IDLE, step: 'wait' });
  });
  it('waits while the sign-out is still going (windows, parked checks), then goes once', () => {
    const armed = armSignOutNext(1000);
    expect(stepSignOutAndNext(armed, { signed: false, now: 2000 })).toEqual({ state: armed, step: 'wait' });
    const r = stepSignOutAndNext(armed, { signed: true, now: 5000 });
    expect(r).toEqual({ state: SIGN_OUT_NEXT_IDLE, step: 'go' });
    expect(stepSignOutAndNext(r.state, { signed: true, now: 6000 }).step).toBe('wait');
  });
  it('a stale arming does not move the person on', () => {
    const armed = armSignOutNext(0);
    expect(stepSignOutAndNext(armed, { signed: true, now: ARM_TTL_MS }).step).toBe('go');
    expect(stepSignOutAndNext(armed, { signed: true, now: ARM_TTL_MS + 1 })).toEqual({ state: SIGN_OUT_NEXT_IDLE, step: 'expired' });
  });
});

describe('hasNextInQueue', () => {
  it('needs a position in the queue and a case after it', () => {
    expect(hasNextInQueue(['a', 'b', 'c'], 0)).toBe(true);
    expect(hasNextInQueue(['a', 'b', 'c'], 2)).toBe(false);
    expect(hasNextInQueue(['a'], -1)).toBe(false);
    expect(hasNextInQueue([], 0)).toBe(false);
  });
});

describe('signOutDone', () => {
  it('is true once the sign-out has set its status, false while the case is still being reported', () => {
    for (const s of ['finalized', 'pending-release', 'pending-countersign']) expect(signOutDone(s)).toBe(true);
    for (const s of ['draft', 'in-progress', 'pool', undefined]) expect(signOutDone(s)).toBe(false);
  });
});
