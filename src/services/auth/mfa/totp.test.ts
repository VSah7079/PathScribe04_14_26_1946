// src/services/auth/mfa/totp.test.ts — Batch 611 (#157)
import { describe, it, expect } from 'vitest';
import { base32Decode, base32Encode, normaliseTotpInput, totpAt, totpForStep, totpStepAt, verifyTotp, TOTP_PERIOD_SECONDS } from './totp';

// RFC 6238 appendix B: the SHA-1 secret is the ASCII text 12345678901234567890.
const RFC_SECRET = base32Encode(new TextEncoder().encode('12345678901234567890'));

describe('RFC 6238 test vectors (SHA-1; the last six digits of the 8-digit values)', () => {
  const vectors: Array<[number, string]> = [
    [59, '287082'], [1111111109, '081804'], [1111111111, '050471'], [1234567890, '005924'], [2000000000, '279037'], [20000000000, '353130'],
  ];
  for (const [seconds, code] of vectors) {
    it(`T=${seconds} → ${code}`, async () => { expect(await totpAt(RFC_SECRET, seconds * 1000)).toBe(code); });
  }
});

describe('base32', () => {
  it('round-trips and ignores case, spaces and dashes', () => {
    const bytes = new Uint8Array([1, 2, 3, 250, 251, 252, 0, 9, 99, 100]);
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
    expect(base32Decode(base32Encode(bytes).toLowerCase().replace(/(.{4})/g, '$1 '))).toEqual(bytes);
  });
  it('refuses text that is not base32', () => {
    expect(base32Decode('')).toBeNull();
    expect(base32Decode('abc1')).toBeNull();
  });
  it('a secret that is not base32 gives no code', async () => { expect(await totpForStep('not base32!', 1)).toBeNull(); });
});

describe('verifyTotp', () => {
  const NOW = 1_800_000_000_000;
  const step = totpStepAt(NOW);

  it('accepts the current code and reports its step', async () => {
    const code = (await totpForStep(RFC_SECRET, step))!;
    expect(await verifyTotp(RFC_SECRET, code, NOW, null)).toEqual({ ok: true, step });
  });
  it('accepts a code typed with spaces or a dash', async () => {
    const code = (await totpForStep(RFC_SECRET, step))!;
    expect(await verifyTotp(RFC_SECRET, `${code.slice(0, 3)} ${code.slice(3)}`, NOW, null)).toEqual({ ok: true, step });
    expect(normaliseTotpInput('123-456')).toBe('123456');
  });
  it('accepts one step either side (clock drift)', async () => {
    expect((await verifyTotp(RFC_SECRET, (await totpForStep(RFC_SECRET, step - 1))!, NOW, null)).ok).toBe(true);
    expect((await verifyTotp(RFC_SECRET, (await totpForStep(RFC_SECRET, step + 1))!, NOW, null)).ok).toBe(true);
  });
  it('refuses an expired code (two steps old) and a code from the future', async () => {
    expect(await verifyTotp(RFC_SECRET, (await totpForStep(RFC_SECRET, step - 2))!, NOW, null)).toEqual({ ok: false, reason: 'wrong' });
    expect(await verifyTotp(RFC_SECRET, (await totpForStep(RFC_SECRET, step + 2))!, NOW, null)).toEqual({ ok: false, reason: 'wrong' });
  });
  it('an expired code becomes valid again nowhere: thirty seconds later it is still in the window, ninety later it is not', async () => {
    const code = (await totpForStep(RFC_SECRET, step))!;
    expect((await verifyTotp(RFC_SECRET, code, NOW + TOTP_PERIOD_SECONDS * 1000, null)).ok).toBe(true);
    expect((await verifyTotp(RFC_SECRET, code, NOW + 3 * TOTP_PERIOD_SECONDS * 1000, null)).ok).toBe(false);
  });
  it('a code works once: the same or an older step is "replayed"', async () => {
    const code = (await totpForStep(RFC_SECRET, step))!;
    expect(await verifyTotp(RFC_SECRET, code, NOW, step)).toEqual({ ok: false, reason: 'replayed' });
    expect(await verifyTotp(RFC_SECRET, code, NOW, step + 1)).toEqual({ ok: false, reason: 'replayed' });
    expect((await verifyTotp(RFC_SECRET, code, NOW, step - 1)).ok).toBe(true);
  });
  it('refuses input that is not six digits', async () => {
    for (const bad of ['', '12345', '1234567', 'abcdef', '12 34 5x']) expect(await verifyTotp(RFC_SECRET, bad, NOW, null)).toEqual({ ok: false, reason: 'malformed' });
  });
  it('a wrong code is wrong', async () => {
    const code = (await totpForStep(RFC_SECRET, step))!;
    const other = String((Number(code) + 1) % 1_000_000).padStart(6, '0');
    expect(await verifyTotp(RFC_SECRET, other, NOW, null)).toEqual({ ok: false, reason: 'wrong' });
  });
});
