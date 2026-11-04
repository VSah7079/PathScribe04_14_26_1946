// src/services/auth/mfa/mfaAssurance.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 611 (#157): did the hospital's identity provider use more than one
// factor? With single sign-on the second factor happens at the provider; the
// ID token says so in two standard claims, and PathScribe reads them:
//
//   amr  Authentication Methods References (RFC 8176): a list such as
//        ["pwd","mfa"] (Microsoft Entra ID), ["pwd","otp","mfa"] (Okta).
//   acr  Authentication Context Class Reference: the provider's own level,
//        for example Okta "urn:okta:loa:2fa:any" or a Keycloak level mapped
//        to a multi-factor class.
//
// MFA is accepted when amr contains "mfa", or names factors from at least
// two different families (something known, something held, something you
// are), or acr names a multi-factor class. A password alone, or two
// passwords, is not MFA. The check is a gate on the browser side; the API
// server repeats it on the bearer token it trusts (docs/architecture/MFA.md).
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

/** RFC 8176 values grouped by factor family. Other values (geo, rba, user, wia, mca) prove no factor. */
export const AMR_FAMILIES: Readonly<Record<string, 'knowledge' | 'possession' | 'inherence'>> = {
  pwd: 'knowledge', pin: 'knowledge', kba: 'knowledge',
  otp: 'possession', hwk: 'possession', swk: 'possession', sc: 'possession', sms: 'possession', tel: 'possession',
  face: 'inherence', fpt: 'inherence', iris: 'inherence', retina: 'inherence', vbm: 'inherence',
};

/** acr values that name a multi-factor class (case-insensitive, substring). */
export const MFA_ACR_MARKERS: readonly string[] = ['multi-factor', 'multifactor', 'mfa', '2fa', 'two-factor'];
/** acr values that name a multi-factor class exactly (the phishing-resistant classes). */
export const MFA_ACR_EXACT: readonly string[] = ['phr', 'phrh'];

export type MfaAssertionBasis = 'amr-mfa' | 'amr-factors' | 'acr';
export type MfaAssertion = { asserted: true; basis: MfaAssertionBasis } | { asserted: false };

const stringList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : typeof v === 'string' ? [v] : [];

export function mfaAssertedByClaims(claims: Record<string, unknown>): MfaAssertion {
  const amr = stringList(claims.amr).map(x => x.trim().toLowerCase());
  if (amr.includes('mfa')) return { asserted: true, basis: 'amr-mfa' };
  const families = new Set(amr.map(x => AMR_FAMILIES[x]).filter(Boolean));
  if (families.size >= 2) return { asserted: true, basis: 'amr-factors' };
  const acr = stringList(claims.acr).map(x => x.trim().toLowerCase());
  if (acr.some(a => MFA_ACR_EXACT.includes(a) || MFA_ACR_MARKERS.some(m => a.includes(m)))) return { asserted: true, basis: 'acr' };
  return { asserted: false };
}
