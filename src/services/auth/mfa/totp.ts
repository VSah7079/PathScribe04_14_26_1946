// src/services/auth/mfa/totp.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 611 (#157): time-based one-time codes (RFC 6238, HMAC-SHA1, 6 digits,
// 30-second steps), the code an authenticator app shows. Used only by the
// Simulated second factor for the demo accounts (mfaService.ts). With a
// hospital identity provider the second factor happens at the provider and
// this file is not involved (docs/architecture/MFA.md).
//
// Pure apart from the Web Crypto call: the clock is passed in.
// ─────────────────────────────────────────────────────────────────────────────

export const TOTP_DIGITS = 6;
export const TOTP_PERIOD_SECONDS = 30;
/** Steps either side of "now" that are still accepted (clock drift, typing time). */
export const TOTP_WINDOW_STEPS = 1;

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Base32 (RFC 4648, no padding), the form authenticator apps take a secret in. */
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

/** The bytes of a base32 secret; spaces, dashes and case are ignored. Null when it isn't base32. */
export function base32Decode(text: string): Uint8Array | null {
  const clean = text.toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '');
  if (!clean || /[^A-Z2-7]/.test(clean)) return null;
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | BASE32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/** The step number a moment falls in (seconds since 1970 divided by the period). */
export const totpStepAt = (ms: number): number => Math.floor(ms / 1000 / TOTP_PERIOD_SECONDS);

/** The code for one step. */
export async function totpForStep(secretBase32: string, step: number): Promise<string | null> {
  const key = base32Decode(secretBase32);
  if (!key || key.length === 0) return null;
  const counter = new Uint8Array(8);
  let n = step;
  for (let i = 7; i >= 0; i--) { counter[i] = n & 255; n = Math.floor(n / 256); }
  const cryptoKey = await globalThis.crypto.subtle.importKey('raw', key as BufferSource, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const mac = new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', cryptoKey, counter as BufferSource));
  const offset = mac[mac.length - 1] & 15;
  const binary = ((mac[offset] & 127) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

/** The code showing at a moment. */
export const totpAt = (secretBase32: string, ms: number): Promise<string | null> => totpForStep(secretBase32, totpStepAt(ms));

export type TotpCheck =
  | { ok: true; step: number }
  | { ok: false; reason: 'malformed' | 'wrong' | 'replayed' };

/** What a person types: six digits, with any spaces or dashes ignored. */
export function normaliseTotpInput(text: string): string | null {
  const digits = text.replace(/[\s-]/g, '');
  return new RegExp(`^\\d{${TOTP_DIGITS}}$`).test(digits) ? digits : null;
}

/**
 * Checks a code against the steps around now. A step at or before
 * `lastAcceptedStep` is refused ("replayed"): a code that was already used
 * works once. Steps outside the window are simply wrong, which is how an
 * expired code is refused.
 */
export async function verifyTotp(
  secretBase32: string,
  input: string,
  nowMs: number,
  lastAcceptedStep: number | null,
): Promise<TotpCheck> {
  const code = normaliseTotpInput(input);
  if (!code) return { ok: false, reason: 'malformed' };
  const nowStep = totpStepAt(nowMs);
  let sawReplay = false;
  for (let d = -TOTP_WINDOW_STEPS; d <= TOTP_WINDOW_STEPS; d++) {
    const step = nowStep + d;
    const expected = await totpForStep(secretBase32, step);
    if (expected === null) return { ok: false, reason: 'malformed' };
    if (expected !== code) continue;
    if (lastAcceptedStep !== null && step <= lastAcceptedStep) { sawReplay = true; continue; }
    return { ok: true, step };
  }
  return { ok: false, reason: sawReplay ? 'replayed' : 'wrong' };
}
