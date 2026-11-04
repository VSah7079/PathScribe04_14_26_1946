// src/services/displayAccess/displayToken.ts
// ─────────────────────────────────────────────────
// Batch 603 (dev decision: wall displays use device binding with strict
// payload masking). Pure helpers for the Display Token: a long-lived,
// revocable, cryptographically random secret an administrator issues for one
// wall display and provisions to it.
//
//   • generateDisplayToken: 32 random bytes from the browser's secure random
//     source, base64url, prefixed "psd_" so a pasted token is recognisable.
//   • hashDisplayToken: SHA-256 hex. Only the hash is ever stored; the token
//     itself is shown once, when it is issued.
//   • evaluateDisplayBinding: the one decision (valid / expired / revoked /
//     invalid / unbound) the pages and the API server's header check share.
// ─────────────────────────────────────────────────

export type DisplayKind = 'facility-ops' | 'or-suite';

export type DisplayBindingStatus = 'valid' | 'unbound' | 'invalid' | 'expired' | 'revoked';

export interface DisplayBinding {
  kind: DisplayKind;
  /** DisplayProfile.id (facility-ops) or OrSuiteTerminal.id (or-suite). */
  subjectId: string;
  /** SHA-256 hex of the token; the token itself is never stored. */
  tokenHash: string;
  /** Last four characters, so an administrator can tell tokens apart. */
  tokenHint: string;
  issuedAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export const DISPLAY_TOKEN_PREFIX = 'psd_';
export const DEFAULT_DISPLAY_TOKEN_DAYS = 365;
export const DISPLAY_TOKEN_VALIDITY_DAYS = [30, 90, 180, 365, 730] as const;

const toBase64Url = (bytes: Uint8Array): string => {
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export function generateDisplayToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return DISPLAY_TOKEN_PREFIX + toBase64Url(bytes);
}

export async function hashDisplayToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token.trim()));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Compares two hex strings without stopping at the first difference. */
export function hashesMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function evaluateDisplayBinding(binding: DisplayBinding | undefined, presentedHash: string | null, now: Date = new Date()): DisplayBindingStatus {
  if (!binding) return 'unbound';
  if (!presentedHash || !hashesMatch(binding.tokenHash, presentedHash)) return 'invalid';
  if (binding.revokedAt) return 'revoked';
  if (new Date(binding.expiresAt).getTime() <= now.getTime()) return 'expired';
  return 'valid';
}
