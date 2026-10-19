/**
 * mockBiometricService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * WebAuthn-based biometric e-signature service.
 *
 * Design principles:
 *   - Biometric is DISABLED by default. Admin enables at institution level.
 *   - Password is ALWAYS a valid fallback — pathologists are never blocked.
 *   - Biometric attempts first at sign-off; if device can't verify (face
 *     changed, bad lighting, no reader) → fall back to password silently.
 *   - Private key never leaves the device. PathScribe stores credential ID only.
 *   - Satisfies 21 CFR Part 11 / MHRA e-signature requirements.
 *
 * Facial recognition note: appearance changes over time. The fallback to
 * password must always be immediate and non-judgmental.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readLabSetting, saveLabSetting } from '../labSettings/labSettingsStore';
import { dataStorage } from '../browserData/dataStorage';
import { assertPlatformCredential, createPlatformCredential, type PlatformAuthenticatorClient } from './platformAuthenticator';

export type BiometricCadence =
  | 'never'          // enrol once, biometric prompt valid indefinitely
  | 'per_session'    // re-verify each login session
  | 'per_days'       // re-verify every N days
  | 'per_sign_off';  // re-verify on every finalisation (strongest audit trail)

export interface BiometricPolicy {
  enabled: boolean;            // institution master switch — default FALSE
  cadence: BiometricCadence;
  cadenceDays: number;         // used when cadence === 'per_days'
}

export const BIOMETRIC_POLICY_DEFAULTS: BiometricPolicy = {
  enabled: false,
  cadence: 'per_sign_off',
  cadenceDays: 30,
};

export interface BiometricCredential {
  userId: string;
  credentialId: string;           // WebAuthn credential ID (base64)
  enrolledAt: string;             // ISO datetime
  lastVerifiedAt: string | null;  // ISO datetime
  deviceName: string;             // e.g. "Touch ID", "Windows Hello"
  /** Batch 611: 'device' = the browser's real fingerprint / face prompt was shown; 'simulated' = the labelled demo prompt. Either way the check is a SIMULATION (no server checks it). */
  prompt?: 'device' | 'simulated';
  /** Batch 611: the public key the browser gave (never a secret). */
  publicKey?: string;
}

const POLICY_KEY      = 'ps_biometric_policy';
const CREDENTIALS_KEY = 'ps_biometric_credentials';
const SESSION_KEY     = 'ps_biometric_session';

// ─── Policy ──────────────────────────────────────────────────────────────────

// Batch 433: the policy is a lab-wide setting (services/labSettings/, the API
// server under PS-345), changed in Configuration → System → Session Security.

const CADENCES: readonly BiometricCadence[] = ['never', 'per_session', 'per_days', 'per_sign_off'];

/** A usable policy from whatever was saved (pure; tested). */
export function normaliseBiometricPolicy(raw: Partial<BiometricPolicy> | null | undefined): BiometricPolicy {
  const days = Math.round(Number(raw?.cadenceDays));
  return {
    enabled: raw?.enabled === true,
    cadence: CADENCES.includes(raw?.cadence as BiometricCadence) ? raw!.cadence as BiometricCadence : BIOMETRIC_POLICY_DEFAULTS.cadence,
    cadenceDays: Number.isFinite(days) && days >= 1 && days <= 365 ? days : BIOMETRIC_POLICY_DEFAULTS.cadenceDays,
  };
}

export function getBiometricPolicy(): BiometricPolicy {
  return normaliseBiometricPolicy(readLabSetting<Partial<BiometricPolicy> | null>(POLICY_KEY, null));
}

/** Batch 433: saving needs config:session-security:manage (checked here).
 *  False when refused (nothing saved). */
export async function saveBiometricPolicy(policy: BiometricPolicy): Promise<boolean> {
  const { authorizationService } = await import('../authorization/defaultAuthorizationService');
  const { permitConfigChange } = await import('../authorization/guardConfigWrites');
  if (!(await permitConfigChange(authorizationService.enforce('config:session-security:manage'), 'config:session-security:manage'))) return false;
  saveLabSetting(POLICY_KEY, normaliseBiometricPolicy(policy));
  return true;
}

// ─── Credentials ─────────────────────────────────────────────────────────────

function loadCredentials(): BiometricCredential[] {
  try {
    const raw = dataStorage.getItem(CREDENTIALS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCredentials(creds: BiometricCredential[]): void {
  dataStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
}

export function getCredentialForUser(userId: string): BiometricCredential | null {
  return loadCredentials().find(c => c.userId === userId) ?? null;
}

/** Batch 433: removes the signed-in person's own enrolment (profile menu →
 *  Biometric signing). Someone else's can't be removed here. */
export async function removeBiometricCredential(userId: string): Promise<{ ok: boolean; error?: string }> {
  const { getSessionUser } = await import('../auth/caseAccessControl');
  if (getSessionUser()?.id !== userId) return { ok: false, error: 'NOT_PERMITTED' };
  saveCredentials(loadCredentials().filter(c => c.userId !== userId));
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* fine */ }
  return { ok: true };
}

// ─── Device capability ───────────────────────────────────────────────────────

export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (typeof (window as any).PublicKeyCredential !== 'undefined') {
    try {
      return await (window as any).PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch { /* fall through */ }
  }
  return true; // demo fallback
}

export function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return 'Face ID / Touch ID';
  if (/Mac/.test(ua)) return 'Touch ID';
  if (/Windows/.test(ua)) return 'Windows Hello';
  return 'Platform authenticator';
}

// ─── Enrolment ───────────────────────────────────────────────────────────────

/** Batch 611 (#158): says on screen and in the audit log that the check is a demonstration. */
async function auditBiometric(event: string, detail: string, userId: string): Promise<void> {
  try {
    const { mockAuditService } = await import('../auditlog/mockAuditService');
    await mockAuditService.logEvent({ type: 'system', event, detail, user: userId, caseId: null, confidence: null });
  } catch { /* the audit write never blocks the person */ }
}

export interface BiometricRunOptions {
  /** Tests give a fake browser client (null = no WebAuthn). */
  client?: PlatformAuthenticatorClient | null;
  /** Tests skip the simulated wait. */
  simulatedDelayMs?: number;
}

export async function enrollBiometric(userId: string, options: BiometricRunOptions = {}): Promise<{ ok: boolean; error?: string; prompt?: 'device' | 'simulated' }> {
  // Batch 433: you enrol yourself only.
  const { getSessionUser } = await import('../auth/caseAccessControl');
  const session = getSessionUser();
  if (session?.id !== userId) return { ok: false, error: 'NOT_PERMITTED' };

  // Batch 611: the device's own prompt when the browser has one (challenge made
  // here, not by a server: SIMULATED); a person who cancels is not enrolled.
  const real = await createPlatformCredential({ id: userId, name: [session?.firstName, session?.lastName].filter(Boolean).join(' ') || userId }, options.client);
  if (real.kind === 'declined') {
    await auditBiometric('Biometric Enrolment Declined (Simulated)', 'Simulated biometric enrolment: the device prompt was cancelled or refused; nothing was enrolled.', userId);
    return { ok: false, error: 'DECLINED' };
  }
  let credentialId: string;
  let publicKey: string | undefined;
  let prompt: 'device' | 'simulated';
  if (real.kind === 'used') {
    credentialId = real.credentialId; publicKey = real.publicKey; prompt = 'device';
  } else {
    await new Promise(r => setTimeout(r, options.simulatedDelayMs ?? 1500));
    credentialId = btoa(`pathscribe-${userId}-${Date.now()}`); prompt = 'simulated';
  }

  const creds = loadCredentials().filter(c => c.userId !== userId);
  creds.push({
    userId, credentialId,
    enrolledAt: new Date().toISOString(),
    lastVerifiedAt: new Date().toISOString(),
    deviceName: getDeviceName(), prompt, publicKey,
  });
  saveCredentials(creds);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId, verifiedAt: new Date().toISOString() }));
  await auditBiometric('Biometric Enrolment (Simulated)', `Simulated biometric enrolment (${prompt === 'device' ? 'device prompt, challenge made in the browser' : 'demonstration prompt'}); no server verified it.`, userId);
  return { ok: true, prompt };
}

// ─── Verification ─────────────────────────────────────────────────────────────

export async function verifyBiometric(userId: string, options: BiometricRunOptions = {}): Promise<{ ok: boolean; error?: string; prompt?: 'device' | 'simulated' }> {
  const cred = getCredentialForUser(userId);
  if (!cred) return { ok: false, error: 'No biometric credential enrolled.' };

  let prompt: 'device' | 'simulated' = 'simulated';
  if (cred.prompt === 'device') {
    const real = await assertPlatformCredential(cred.credentialId, options.client);
    if (real.kind === 'declined') {
      await auditBiometric('Biometric Check Not Recognised (Simulated)', 'Simulated biometric check: the device did not confirm the person; password fallback offered.', userId);
      return { ok: false, error: 'DECLINED' };
    }
    if (real.kind === 'used') prompt = 'device';
  }
  if (prompt === 'simulated') await new Promise(r => setTimeout(r, options.simulatedDelayMs ?? 1200));

  const creds = loadCredentials().map(c =>
    c.userId === userId ? { ...c, lastVerifiedAt: new Date().toISOString() } : c
  );
  saveCredentials(creds);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId, verifiedAt: new Date().toISOString() }));
  await auditBiometric('Biometric Check (Simulated)', `Simulated biometric check passed (${prompt === 'device' ? 'device prompt, challenge made in the browser' : 'demonstration prompt'}); no server verified it.`, userId);
  return { ok: true, prompt };
}

// ─── Cadence check ───────────────────────────────────────────────────────────

export function isBiometricCurrentForUser(userId: string): boolean {
  const policy = getBiometricPolicy();
  const cred = getCredentialForUser(userId);
  if (!cred) return false;

  if (policy.cadence === 'never') return true;
  if (policy.cadence === 'per_sign_off') return false; // always re-verify at sign-off

  if (policy.cadence === 'per_session') {
    try {
      const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null');
      return session?.userId === userId;
    } catch { return false; }
  }

  if (policy.cadence === 'per_days') {
    const lastVerified = cred.lastVerifiedAt ? new Date(cred.lastVerifiedAt) : null;
    if (!lastVerified) return false;
    const daysSince = (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince < policy.cadenceDays;
  }

  return false;
}

// ─── First-login wizard ───────────────────────────────────────────────────────

const WIZARD_KEY = 'ps_biometric_wizard_dismissed';

export function shouldShowBiometricWizard(userId: string): boolean {
  const policy = getBiometricPolicy();
  if (!policy.enabled) return false;   // don't prompt if institution hasn't enabled biometric
  const cred = getCredentialForUser(userId);
  if (cred) return false;              // already enrolled
  try {
    const raw = dataStorage.getItem(WIZARD_KEY);
    const dismissed: Record<string, number> = raw ? JSON.parse(raw) : {};
    return (dismissed[userId] ?? 0) < 3; // re-prompt until dismissed 3 times
  } catch { return true; }
}

export function dismissBiometricWizard(userId: string): void {
  try {
    const raw = dataStorage.getItem(WIZARD_KEY);
    const dismissed: Record<string, number> = raw ? JSON.parse(raw) : {};
    dismissed[userId] = (dismissed[userId] ?? 0) + 1;
    dataStorage.setItem(WIZARD_KEY, JSON.stringify(dismissed));
  } catch { /* */ }
}
