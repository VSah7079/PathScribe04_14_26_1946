// src/services/consultAccess/consultTokenCrypto.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 522 (PS-290): how a consult link's bearer token is made and kept.
//
//   - 32 random bytes from the platform's cryptographic generator
//     (crypto.getRandomValues), written base64url with a `ct_` prefix:
//     256 bits, so guessing one is not feasible. Before, the token was
//     Math.random() text, which is predictable.
//   - Only its SHA-256 fingerprint is stored. The token itself is shown once,
//     in the link, when it is issued; a copy of the stored records (a
//     browser-storage dump today, a database backup on the API server) gives
//     no working link.
//
// The API server must do the same (docs/architecture/CONSULT_ACCESS_API.md,
// CA-3 and CA-4).
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_BYTES = 32;

/** `ct_` and 43 base64url characters (32 bytes). */
export const CONSULT_TOKEN_PATTERN = /^ct_[A-Za-z0-9_-]{43}$/;

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A new bearer token: 256 random bits. */
export function generateConsultToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return 'ct_' + base64Url(bytes);
}

/** The stored fingerprint of a token: SHA-256, hex. */
export async function hashConsultToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
