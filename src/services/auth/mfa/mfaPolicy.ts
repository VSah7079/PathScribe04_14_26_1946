// src/services/auth/mfa/mfaPolicy.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 611 (#157): when an organisation requires a second factor, and how
// long one stays good. Pure; mfaService.ts applies it.
//
//   mode  'off'            no second factor asked for by PathScribe
//         'signing_roles'  required for the roles that sign reports
//                          (Pathologist, Pathologist-Admin)
//         'all'            required for everyone who signs in
//   stepUpMinutes   a signature (case sign-out, finalisation) asks for a
//                   fresh second factor when the last one is older than this
//   sessionMaxHours a sign-in's second factor expires after this long; the
//                   session ends and the person signs in again
//
// The policy belongs to an organisation (the tenant boundary), never to
// another one: the policy, the enrolments and the lock counts are all kept
// per organisation id.
// ─────────────────────────────────────────────────────────────────────────────

import type { SessionProfile } from '../sessionProfile';

export const MFA_MODES = ['off', 'signing_roles', 'all'] as const;
export type MfaMode = typeof MFA_MODES[number];

export interface MfaPolicy {
  mode: MfaMode;
  stepUpMinutes: number;
  sessionMaxHours: number;
}

export const MFA_POLICY_DEFAULTS: MfaPolicy = { mode: 'off', stepUpMinutes: 30, sessionMaxHours: 12 };
export const MFA_STEP_UP_RANGE = { min: 1, max: 720 } as const;
export const MFA_SESSION_RANGE = { min: 1, max: 72 } as const;

/** The session roles that sign reports. */
export const MFA_SIGNING_ROLES: readonly SessionProfile['role'][] = ['pathologist', 'pathologist-admin'];

/** The organisation a session belongs to; sessions with none share 'default'. */
export const mfaOrganisationOf = (profile: Pick<SessionProfile, 'organisationId'>): string => profile.organisationId?.trim() || 'default';

const inRange = (v: unknown, r: { min: number; max: number }, fallback: number): number => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= r.min && n <= r.max ? n : fallback;
};

/** A usable policy from whatever was saved. */
export function normaliseMfaPolicy(raw: Partial<MfaPolicy> | null | undefined): MfaPolicy {
  return {
    mode: MFA_MODES.includes(raw?.mode as MfaMode) ? raw!.mode as MfaMode : MFA_POLICY_DEFAULTS.mode,
    stepUpMinutes: inRange(raw?.stepUpMinutes, MFA_STEP_UP_RANGE, MFA_POLICY_DEFAULTS.stepUpMinutes),
    sessionMaxHours: inRange(raw?.sessionMaxHours, MFA_SESSION_RANGE, MFA_POLICY_DEFAULTS.sessionMaxHours),
  };
}

/** Does this policy ask this person for a second factor? */
export function mfaRequiredFor(policy: MfaPolicy, profile: Pick<SessionProfile, 'role'>): boolean {
  if (policy.mode === 'all') return true;
  if (policy.mode === 'signing_roles') return MFA_SIGNING_ROLES.includes(profile.role);
  return false;
}

/** What a session carries once a second factor was satisfied (no secret, no code). */
export interface MfaStamp {
  organisationId: string;
  userId: string;
  /** ISO time of the last second factor. */
  verifiedAt: string;
  method: 'idp' | 'simulated-totp' | 'recovery-code';
}

const minutesBetween = (from: string, now: Date): number => (now.getTime() - Date.parse(from)) / 60_000;

/** The stamp belongs to this person in this organisation. Another organisation's stamp never counts. */
export function stampBelongsTo(stamp: MfaStamp | undefined | null, profile: Pick<SessionProfile, 'id' | 'organisationId'>): stamp is MfaStamp {
  return !!stamp && stamp.userId === profile.id && stamp.organisationId === mfaOrganisationOf(profile) && Number.isFinite(Date.parse(stamp.verifiedAt));
}

/** The stamp is still within `minutes` (a future-dated stamp is not trusted). */
export function stampFresh(stamp: MfaStamp, now: Date, minutes: number): boolean {
  const age = minutesBetween(stamp.verifiedAt, now);
  return age >= -1 && age <= minutes;
}
