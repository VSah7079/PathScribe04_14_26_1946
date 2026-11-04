import { describe, it, expect } from 'vitest';
import { consultLinkLifetime, consultLifetimeLine, CONSULT_POST_SIGNATURE_MAX_VIEWS, CONSULT_POST_SIGNATURE_HOURS } from './consultLinkLifetime';
import { resolveConsultTokenStatus } from './IConsultTokenService';

const H = 3_600_000;
const T0 = new Date('2026-10-24T10:00:00Z');
const at = (hours: number) => new Date(T0.getTime() + hours * H);
const expiresAt = '2026-12-01T00:00:00Z';

describe('consultLinkLifetime (Batch 669, reviewer ruling)', () => {
  it('the constants are 3 views and 48 hours', () => {
    expect(CONSULT_POST_SIGNATURE_MAX_VIEWS).toBe(3);
    expect(CONSULT_POST_SIGNATURE_HOURS).toBe(48);
  });

  it('before a signature only the link\'s own expiry applies (a draft starts no clock and counts no view)', () => {
    const l = consultLinkLifetime({ expiresAt, viewsAfterSignature: 7 }, at(0));
    expect(l).toMatchObject({ state: 'open', signed: false, remainingViews: null, viewsCounted: 0 });
    expect(consultLinkLifetime({ expiresAt: at(-1).toISOString() }, at(0)).state).toBe('expired');
    expect(consultLifetimeLine({ expiresAt }, at(0))).toBeNull();
  });

  it('after a signature each view counts: 3 are allowed, then the link is exhausted', () => {
    const signedAt = T0.toISOString();
    expect(consultLinkLifetime({ expiresAt, signedAt, viewsAfterSignature: 0 }, at(1))).toMatchObject({ state: 'open', remainingViews: 3 });
    expect(consultLinkLifetime({ expiresAt, signedAt, viewsAfterSignature: 2 }, at(1))).toMatchObject({ state: 'open', remainingViews: 1 });
    expect(consultLinkLifetime({ expiresAt, signedAt, viewsAfterSignature: 3 }, at(1))).toMatchObject({ state: 'exhausted', remainingViews: 0 });
  });

  it('48 hours after the signature the link is expired, to the millisecond', () => {
    const signedAt = T0.toISOString();
    expect(consultLinkLifetime({ expiresAt, signedAt, viewsAfterSignature: 0 }, new Date(at(48).getTime() - 1)).state).toBe('open');
    expect(consultLinkLifetime({ expiresAt, signedAt, viewsAfterSignature: 0 }, at(48)).state).toBe('expired');
  });

  it('hours remaining are rounded up and never zero while open', () => {
    const signedAt = T0.toISOString();
    expect(consultLinkLifetime({ expiresAt, signedAt }, at(1)).hoursRemaining).toBe(47);
    expect(consultLinkLifetime({ expiresAt, signedAt }, new Date(at(47).getTime() + 60_000)).hoursRemaining).toBe(1);
    expect(consultLinkLifetime({ expiresAt, signedAt }, at(60)).hoursRemaining).toBe(0);
  });

  it('the link\'s own earlier expiry still wins: signing never lengthens a link', () => {
    const l = consultLinkLifetime({ expiresAt: at(5).toISOString(), signedAt: T0.toISOString() }, at(4));
    expect(l.hoursRemaining).toBe(1);
    expect(consultLinkLifetime({ expiresAt: at(5).toISOString(), signedAt: T0.toISOString() }, at(5)).state).toBe('expired');
  });

  it('the issuer-side status reads Expired once the views or the hours are used up', () => {
    const base = { isActive: true, expiresAt, signedAt: T0.toISOString() };
    const now = Date.now();
    expect(resolveConsultTokenStatus({ ...base, signedAt: new Date(now).toISOString(), viewsAfterSignature: 2 })).toBe('Active');
    expect(resolveConsultTokenStatus({ ...base, signedAt: new Date(now).toISOString(), viewsAfterSignature: 3 })).toBe('Expired');
    expect(resolveConsultTokenStatus({ ...base, signedAt: new Date(now - 49 * H).toISOString() })).toBe('Expired');
  });

  it('the list line says what is left, or why it closed', () => {
    const signedAt = T0.toISOString();
    expect(consultLifetimeLine({ expiresAt, signedAt, viewsAfterSignature: 1 }, at(2))).toEqual({ key: 'open', remainingViews: 2, hoursRemaining: 46 });
    expect(consultLifetimeLine({ expiresAt, signedAt, viewsAfterSignature: 3 }, at(2))).toEqual({ key: 'exhausted' });
    expect(consultLifetimeLine({ expiresAt, signedAt }, at(50))).toEqual({ key: 'ended' });
  });
});
