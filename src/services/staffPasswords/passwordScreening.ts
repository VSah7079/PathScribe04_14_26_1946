// src/services/staffPasswords/passwordScreening.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 456 (Pete: "a common/breached-password block"): a new password is
// refused when it is easy to guess, as NIST SP 800-63B asks: checked against
// a list of commonly used passwords, the passwords known from data breaches,
// repetitive or sequential characters, and words specific to this service or
// person. No composition rules and no forced expiry (NIST advises against
// both). Applied wherever a password is chosen: the Staff screen and the
// person's own change at sign-in (mockStaffPasswordService.ts).
//
//   common        The password, or the password with digits and symbols
//                 trimmed from its ends, is on the common-password list
//                 (commonPasswords.txt: the UK National Cyber Security
//                 Centre's 100,000 most-used passwords from breach data,
//                 lower-cased, keeping the top 20,000 of 8 characters or more
//                 and every entry of 12 or more; 9,365 entries). Compared
//                 without regard to case. Loaded only when a password is set.
//   predictable   One short pattern repeated ("abcabcabcabc"), or a straight
//                 run of characters ("123456789012", "abcdefghijkl").
//   contextWord   Contains "pathscribe" or "formedrix", or the person's email
//                 or the part of it before the @ (4 characters or more).
//   breached      Found in Have I Been Pwned's Pwned Passwords. Only the
//                 first 5 characters of the password's SHA-1 hash leave the
//                 browser (the k-anonymity range search, with padding), so
//                 neither the password nor its hash is ever sent. If the
//                 service can't be reached, the other checks still apply and
//                 the save goes ahead; the audit says the breach check was
//                 unavailable. VITE_PWNED_CHECK=off turns it off
//                 (a private cloud with no internet access).
//
// Production: the API server runs these checks when it stores the hash
// (docs/architecture/AUTHENTICATION_OIDC.md).
// ─────────────────────────────────────────────────────────────────────────────

export type PasswordScreeningProblem = 'common' | 'predictable' | 'contextWord' | 'breached';
export type BreachCheckOutcome = 'clear' | 'breached' | 'unavailable' | 'off';

export interface PasswordScreeningContext {
  email?: string;
}

/** Words specific to this service that a password may not contain. */
export const SERVICE_WORDS = ['pathscribe', 'formedrix'] as const;

const TRIM_ENDS = /^[^a-z]+|[^a-z]+$/g;

/** The common-password check against a given list (lower-case entries). */
export function isCommonPassword(password: string, common: ReadonlySet<string>): boolean {
  const lower = password.trim().toLowerCase();
  if (common.has(lower)) return true;
  const core = lower.replace(TRIM_ENDS, '');
  return core.length >= 8 && core !== lower && common.has(core);
}

/** One short pattern repeated, or a straight run of characters. */
export function isPredictablePassword(password: string): boolean {
  const p = password.trim().toLowerCase();
  if (p.length < 2) return true;
  for (let size = 1; size <= 4; size++) {
    const chunk = p.slice(0, size);
    if (chunk.repeat(Math.ceil(p.length / size)).slice(0, p.length) === p) return true;
  }
  const step = p.charCodeAt(1) - p.charCodeAt(0);
  if (Math.abs(step) !== 1) return false;
  for (let i = 1; i < p.length; i++) {
    const d = p.charCodeAt(i) - p.charCodeAt(i - 1);
    // A run may wrap from 9 to 0 ("789012"), as people type it.
    const wraps = (step === 1 && p[i - 1] === '9' && p[i] === '0') || (step === -1 && p[i - 1] === '0' && p[i] === '9');
    if (d !== step && !wraps) return false;
  }
  return true;
}

/** Contains the service's name, or the person's email or its name part. */
export function containsContextWord(password: string, ctx: PasswordScreeningContext): boolean {
  const p = password.toLowerCase().replace(/\s+/g, '');
  const words: string[] = [...SERVICE_WORDS];
  const email = (ctx.email ?? '').trim().toLowerCase();
  if (email) {
    words.push(email);
    const local = email.split('@')[0];
    if (local.length >= 4) words.push(local);
  }
  return words.some(w => p.includes(w));
}

/** The checks that need no network, in order. */
export function localScreeningProblem(password: string, ctx: PasswordScreeningContext, common: ReadonlySet<string>): Exclude<PasswordScreeningProblem, 'breached'> | null {
  if (isPredictablePassword(password)) return 'predictable';
  if (containsContextWord(password, ctx)) return 'contextWord';
  if (isCommonPassword(password, common)) return 'common';
  return null;
}

// ── Pwned Passwords range search ───────────────────────────────────────────

export const PWNED_RANGE_URL = 'https://api.pwnedpasswords.com/range/';
const BREACH_TIMEOUT_MS = 5000;

export type BreachedPasswordCheck = (password: string) => Promise<BreachCheckOutcome>;

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

/** Reads the range response: a match with a count above 0 (padding rows have 0). */
export function rangeHasSuffix(body: string, suffix: string): boolean {
  return body.split(/\r?\n/).some(line => {
    const [s, count] = line.trim().split(':');
    return s?.toUpperCase() === suffix && Number(count) > 0;
  });
}

export function createPwnedPasswordCheck(deps: { fetch: typeof fetch; subtle?: SubtleCrypto; timeoutMs?: number }): BreachedPasswordCheck {
  return async password => {
    try {
      const subtle = deps.subtle ?? globalThis.crypto.subtle;
      const hex = toHex(await subtle.digest('SHA-1', new TextEncoder().encode(password)));
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? BREACH_TIMEOUT_MS);
      try {
        const res = await deps.fetch(`${PWNED_RANGE_URL}${hex.slice(0, 5)}`, { headers: { 'Add-Padding': 'true' }, signal: controller.signal });
        if (!res.ok) return 'unavailable';
        return rangeHasSuffix(await res.text(), hex.slice(5)) ? 'breached' : 'clear';
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return 'unavailable';
    }
  };
}

// ── The whole screen ───────────────────────────────────────────────────────

export interface PasswordScreeningDeps {
  loadCommon: () => Promise<ReadonlySet<string>>;
  /** null: the breach check is off. */
  breached: BreachedPasswordCheck | null;
}

export interface PasswordScreeningResult {
  problem: PasswordScreeningProblem | null;
  breachCheck: BreachCheckOutcome;
}

/** The local checks first; the breach service is asked only if they pass. */
export async function screenPassword(password: string, ctx: PasswordScreeningContext, deps: PasswordScreeningDeps): Promise<PasswordScreeningResult> {
  const local = localScreeningProblem(password, ctx, await deps.loadCommon());
  if (local) return { problem: local, breachCheck: 'off' };
  if (!deps.breached) return { problem: null, breachCheck: 'off' };
  const breachCheck = await deps.breached(password);
  return { problem: breachCheck === 'breached' ? 'breached' : null, breachCheck };
}

let commonCache: Promise<ReadonlySet<string>> | null = null;

/** This build's screening: the bundled list (loaded on first use) and Pwned Passwords unless turned off. */
export const defaultPasswordScreeningDeps: PasswordScreeningDeps = {
  loadCommon: () => (commonCache ??= import('./commonPasswords.txt?raw').then(m =>
    new Set(m.default.split(/\r?\n/).map(l => l.trim()).filter(Boolean)))),
  breached: import.meta.env.VITE_PWNED_CHECK === 'off' || typeof fetch !== 'function'
    ? null
    : createPwnedPasswordCheck({ fetch: (input, init) => fetch(input, init) }),
};
