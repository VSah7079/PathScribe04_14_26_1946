// src/services/biometric/platformAuthenticator.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 611 (#158): the browser's WebAuthn platform authenticator (Touch ID,
// Windows Hello, Face ID) for the biometric e-signature DEMO.
//
//   • The challenge is made here, in the browser (crypto.getRandomValues). A
//     real deployment gets it from the API server and the server checks the
//     signature against the stored public key; this demo does neither, so the
//     result is labelled SIMULATED on screen and in the audit log even when the
//     device's real prompt was shown.
//   • Only the credential id (and the public key the browser hands over) is
//     kept. The private key never leaves the device; no secret is stored.
//   • When WebAuthn is missing, or the person cancels / the device refuses,
//     the caller falls back to the labelled simulated prompt (or, at sign-out,
//     the password).
// ─────────────────────────────────────────────────────────────────────────────

export interface PlatformAuthenticatorClient {
  create(options: CredentialCreationOptions): Promise<Credential | null>;
  get(options: CredentialRequestOptions): Promise<Credential | null>;
}

export type PlatformAuthResult =
  | { kind: 'used'; credentialId: string; publicKey?: string }
  | { kind: 'unavailable' }   // no WebAuthn in this browser
  | { kind: 'declined' };     // person cancelled, or the device refused

export function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  arr.forEach(b => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
  const raw = atob(b64);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

/** A fresh random challenge (32 bytes). */
export function localChallenge(): Uint8Array<ArrayBuffer> {
  const c = new Uint8Array(new ArrayBuffer(32));
  globalThis.crypto.getRandomValues(c);
  return c;
}

export function defaultClient(): PlatformAuthenticatorClient | null {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return null;
  if (typeof (window as unknown as { PublicKeyCredential?: unknown }).PublicKeyCredential === 'undefined') return null;
  if (!navigator.credentials || typeof navigator.credentials.create !== 'function') return null;
  if (!globalThis.crypto?.getRandomValues) return null;
  return {
    create: o => navigator.credentials.create(o),
    get: o => navigator.credentials.get(o),
  };
}

const TIMEOUT_MS = 60_000;

/** Registers a platform credential; the browser shows its own fingerprint / face / PIN prompt. */
export async function createPlatformCredential(
  user: { id: string; name: string },
  client: PlatformAuthenticatorClient | null = defaultClient(),
): Promise<PlatformAuthResult> {
  if (!client) return { kind: 'unavailable' };
  try {
    const cred = await client.create({
      publicKey: {
        challenge: localChallenge(),
        rp: { name: 'PathScribe AI' },
        user: { id: new TextEncoder().encode(user.id), name: user.name || user.id, displayName: user.name || user.id },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        timeout: TIMEOUT_MS,
        attestation: 'none',
      },
    }) as PublicKeyCredential | null;
    if (!cred) return { kind: 'declined' };
    let publicKey: string | undefined;
    try {
      const pk = (cred.response as AuthenticatorAttestationResponse).getPublicKey?.();
      if (pk) publicKey = toBase64Url(pk);
    } catch { /* the public key is optional */ }
    return { kind: 'used', credentialId: toBase64Url(cred.rawId), publicKey };
  } catch {
    return { kind: 'declined' };
  }
}

/** Asks the device to confirm the person again with the enrolled credential. */
export async function assertPlatformCredential(
  credentialId: string,
  client: PlatformAuthenticatorClient | null = defaultClient(),
): Promise<PlatformAuthResult> {
  if (!client) return { kind: 'unavailable' };
  try {
    const got = await client.get({
      publicKey: {
        challenge: localChallenge(),
        allowCredentials: [{ type: 'public-key', id: fromBase64Url(credentialId) as BufferSource, transports: ['internal'] }],
        userVerification: 'required',
        timeout: TIMEOUT_MS,
      },
    }) as PublicKeyCredential | null;
    if (!got) return { kind: 'declined' };
    return { kind: 'used', credentialId: toBase64Url(got.rawId) };
  } catch {
    return { kind: 'declined' };
  }
}
