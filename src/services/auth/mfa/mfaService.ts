// src/services/auth/mfa/mfaService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 611 (#157): multi-factor sign-in, the browser side.
//
// Two sources of a second factor, one policy:
//
//   Hospital single sign-on   The identity provider asks for the second
//                             factor; its ID token says so (amr / acr,
//                             mfaAssurance.ts). When the organisation's
//                             policy requires MFA and the token doesn't say
//                             it was used, the sign-in is refused.
//   Demo accounts             A SIMULATED authenticator: a time-based code
//                             (totp.ts) checked in the browser against a
//                             documented demo secret, with recovery codes.
//                             It exists so the whole flow can be shown; it
//                             protects nothing, and every screen, session
//                             stamp and audit entry says Simulated.
//
// The policy (off / signing roles / everyone, step-up minutes, session hours)
// is per organisation, as are enrolments and the failed-code counts: another
// organisation's second factor never satisfies this one's (stampBelongsTo).
//
// What is checked, and where it is proved: docs/architecture/MFA.md, with the
// tests behind each acceptance criterion. What the server must do instead of
// this file: the same checks on the bearer token and server-held sessions.
//
// Secrets: the demo secret is derived inside the demo account data and passed
// in (`secretFor`); it is never stored here, never audited. Codes typed are
// never audited or stored. Recovery codes are stored only as hashes.
// Audit detail is literal English, PHI-free.
// ─────────────────────────────────────────────────────────────────────────────

import type { IAuditService } from '../../auditlog/IAuditService';
import type { SessionProfile } from '../sessionProfile';
import { currentSigningLock, isSigningLocked, NO_SIGNING_LOCK, recordSigningFailure, type SigningLockState } from '../signerConfirmation';
import { mfaAssertedByClaims, type MfaAssertionBasis } from './mfaAssurance';
import {
  MFA_POLICY_DEFAULTS, mfaOrganisationOf, mfaRequiredFor, normaliseMfaPolicy, stampBelongsTo, stampFresh,
  type MfaPolicy, type MfaStamp,
} from './mfaPolicy';
import { base32Decode, normaliseTotpInput, totpAt, verifyTotp } from './totp';

export const MFA_LOCK_POLICY = { maxFailures: 5, lockMinutes: 15 } as const;
export const MFA_RECOVERY_CODE_COUNT = 8;
const RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** What is kept about a person's enrolment: never the secret. */
export interface MfaEnrolment {
  enrolledAt: string;
  /** The last time step accepted, so a code works once. */
  lastStep: number | null;
  /** SHA-256 of each unused recovery code. */
  recoveryHashes: string[];
}

export interface MfaStores {
  policy: { read(organisationId: string): Partial<MfaPolicy> | null; write(organisationId: string, policy: MfaPolicy): void };
  enrolment: {
    read(organisationId: string, userId: string): MfaEnrolment | null;
    write(organisationId: string, userId: string, enrolment: MfaEnrolment): void;
    remove(organisationId: string, userId: string): void;
    list(organisationId: string): Array<{ userId: string; enrolment: MfaEnrolment }>;
  };
  locks: { read(key: string): SigningLockState | null; write(key: string, state: SigningLockState): void };
}

export interface MfaDeps {
  stores: MfaStores;
  /** The demo secret (base32) for a person, or null when this build has no simulated second factor. */
  secretFor: ((userId: string) => Promise<string | null>) | null;
  audit: Pick<IAuditService, 'logEvent'>;
  /** Whether the signed-in person holds the capability (checked and audited by the caller's authorization service). */
  enforce: (capability: string) => Promise<boolean>;
  now?: () => Date;
  randomBytes?: (length: number) => Uint8Array;
}

export type MfaStatus = 'not_required' | 'enrol' | 'challenge' | 'unavailable';

export type MfaChallengeFailure = 'locked' | 'not_enrolled' | 'invalid' | 'replayed' | 'unavailable';
export type MfaChallengeResult =
  | { ok: true; stamp: MfaStamp; usedRecoveryCode: boolean; recoveryCodesLeft: number }
  | { ok: false; reason: MfaChallengeFailure; lockedUntil?: string; attemptsLeft?: number };

export type MfaEnrolStartResult =
  | { ok: true; secret: string; account: string }
  | { ok: false; reason: 'unavailable' | 'already_enrolled' | 'locked'; lockedUntil?: string };

export type MfaEnrolConfirmResult =
  | { ok: true; recoveryCodes: string[]; stamp: MfaStamp }
  | { ok: false; reason: 'locked' | 'invalid' | 'replayed' | 'unavailable' | 'already_enrolled'; lockedUntil?: string; attemptsLeft?: number };

export type MfaSsoResult =
  | { ok: true; stamp: MfaStamp | null }
  | { ok: false; reason: 'mfa_required' };

export type MfaStepUpClaimsResult = { ok: true; stamp: MfaStamp } | { ok: false };

export interface MfaEnrolmentSummary { userId: string; enrolledAt: string; recoveryCodesLeft: number }

const hex = (buf: ArrayBuffer): string => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

async function sha256Hex(text: string): Promise<string> {
  return hex(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text) as BufferSource));
}

/** Recovery codes are typed in any case, with or without the dash. */
export const normaliseRecoveryInput = (text: string): string => text.toUpperCase().replace(/[\s-]/g, '');

const isRecoveryShape = (normalised: string): boolean => /^[A-Z2-9]{10}$/.test(normalised) && !/^\d{6}$/.test(normalised);

export function createMfaService(deps: MfaDeps) {
  const now = deps.now ?? (() => new Date());
  const random = deps.randomBytes ?? ((n: number) => globalThis.crypto.getRandomValues(new Uint8Array(n)));

  const audit = (profile: Pick<SessionProfile, 'name'>, event: string, detail: string) => {
    void deps.audit.logEvent({ type: 'user', event, detail, user: profile.name, caseId: null, confidence: null }).catch(() => {});
  };

  const policyFor = (organisationId: string): MfaPolicy => normaliseMfaPolicy(deps.stores.policy.read(organisationId));
  const lockKey = (organisationId: string, userId: string) => `${organisationId}:${userId}`;
  const lockFor = (organisationId: string, userId: string) => currentSigningLock(deps.stores.locks.read(lockKey(organisationId, userId)), now());

  const stampFor = (profile: Pick<SessionProfile, 'id' | 'organisationId'>, method: MfaStamp['method']): MfaStamp => ({
    organisationId: mfaOrganisationOf(profile), userId: profile.id, verifiedAt: now().toISOString(), method,
  });

  const recoveryHash = (organisationId: string, userId: string, code: string) => sha256Hex(`${organisationId}:${userId}:${normaliseRecoveryInput(code)}`);

  const newRecoveryCodes = (): string[] => {
    const codes: string[] = [];
    while (codes.length < MFA_RECOVERY_CODE_COUNT) {
      const bytes = random(10);
      let code = '';
      for (let i = 0; i < 10; i++) code += RECOVERY_ALPHABET[bytes[i] % RECOVERY_ALPHABET.length];
      const formatted = `${code.slice(0, 5)}-${code.slice(5)}`;
      if (!codes.includes(formatted)) codes.push(formatted);
    }
    return codes;
  };

  /** A failed code: count it, lock at the limit, audit both. Never records what was typed. */
  const registerFailure = (profile: SessionProfile, organisationId: string, what: string): { lockedUntil?: string; attemptsLeft: number } => {
    const next = recordSigningFailure(lockFor(organisationId, profile.id), now(), MFA_LOCK_POLICY);
    deps.stores.locks.write(lockKey(organisationId, profile.id), next);
    audit(profile, 'MFA code rejected', `${what}; failed attempt ${next.failures} of ${MFA_LOCK_POLICY.maxFailures}.`);
    if (next.lockedUntil) {
      audit(profile, 'MFA locked', `Second-factor codes locked for ${MFA_LOCK_POLICY.lockMinutes} minutes after ${MFA_LOCK_POLICY.maxFailures} failed attempts.`);
      return { lockedUntil: next.lockedUntil, attemptsLeft: 0 };
    }
    return { attemptsLeft: MFA_LOCK_POLICY.maxFailures - next.failures };
  };

  const clearFailures = (organisationId: string, userId: string) => {
    const key = lockKey(organisationId, userId);
    if (deps.stores.locks.read(key)) deps.stores.locks.write(key, NO_SIGNING_LOCK);
  };

  const refusedWhileLocked = (profile: SessionProfile, organisationId: string): { lockedUntil: string } | null => {
    const lock = lockFor(organisationId, profile.id);
    if (!isSigningLocked(lock, now())) return null;
    audit(profile, 'MFA refused', 'A second-factor code was tried while codes are locked; it was not checked.');
    return { lockedUntil: lock.lockedUntil! };
  };

  return {
    // ── Policy ────────────────────────────────────────────────────────────
    getPolicy(organisationId: string): MfaPolicy {
      return policyFor(organisationId);
    },

    /** The policy of the organisation this person belongs to. */
    policyOf(profile: SessionProfile): MfaPolicy {
      return policyFor(mfaOrganisationOf(profile));
    },

    /** Saving needs config:session-security:manage; audited with the old and new mode, never a secret. */
    async savePolicy(actor: SessionProfile, next: Partial<MfaPolicy>): Promise<{ ok: true; policy: MfaPolicy } | { ok: false; reason: 'not_permitted' }> {
      if (!(await deps.enforce('config:session-security:manage'))) return { ok: false, reason: 'not_permitted' };
      const organisationId = mfaOrganisationOf(actor);
      const before = policyFor(organisationId);
      const policy = normaliseMfaPolicy({ ...before, ...next });
      deps.stores.policy.write(organisationId, policy);
      audit(actor, 'MFA policy changed',
        `Second-factor policy changed from ${before.mode} to ${policy.mode} (fresh code for a signature after ${policy.stepUpMinutes} minutes; second factor expires after ${policy.sessionMaxHours} hours).`);
      return { ok: true, policy };
    },

    requiredFor(profile: SessionProfile): boolean {
      return mfaRequiredFor(policyFor(mfaOrganisationOf(profile)), profile);
    },

    /** The simulated second factor is available in this build. */
    simulatedFactorAvailable(): boolean {
      return deps.secretFor !== null;
    },

    // ── Password sign-in (demo accounts): what the person is asked ──────
    async statusFor(profile: SessionProfile): Promise<MfaStatus> {
      const organisationId = mfaOrganisationOf(profile);
      if (!mfaRequiredFor(policyFor(organisationId), profile)) return 'not_required';
      if (!deps.secretFor || !(await deps.secretFor(profile.id))) return 'unavailable';
      return deps.stores.enrolment.read(organisationId, profile.id) ? 'challenge' : 'enrol';
    },

    // ── Enrolment (Simulated authenticator) ─────────────────────────────
    async enrolmentStart(profile: SessionProfile): Promise<MfaEnrolStartResult> {
      const organisationId = mfaOrganisationOf(profile);
      if (deps.stores.enrolment.read(organisationId, profile.id)) return { ok: false, reason: 'already_enrolled' };
      const locked = refusedWhileLocked(profile, organisationId);
      if (locked) return { ok: false, reason: 'locked', lockedUntil: locked.lockedUntil };
      const secret = deps.secretFor ? await deps.secretFor(profile.id) : null;
      if (!secret) return { ok: false, reason: 'unavailable' };
      return { ok: true, secret, account: profile.email };
    },

    /** The person typed the first code their authenticator showed: enrol them and issue recovery codes (shown once). */
    async enrolmentConfirm(profile: SessionProfile, code: string): Promise<MfaEnrolConfirmResult> {
      const organisationId = mfaOrganisationOf(profile);
      if (deps.stores.enrolment.read(organisationId, profile.id)) return { ok: false, reason: 'already_enrolled' };
      const locked = refusedWhileLocked(profile, organisationId);
      if (locked) return { ok: false, reason: 'locked', lockedUntil: locked.lockedUntil };
      const secret = deps.secretFor ? await deps.secretFor(profile.id) : null;
      if (!secret) return { ok: false, reason: 'unavailable' };
      const check = await verifyTotp(secret, code, now().getTime(), null);
      if (check.ok === false) {
        const f = registerFailure(profile, organisationId, 'The first code of the Simulated authenticator was not accepted during enrolment');
        return f.lockedUntil ? { ok: false, reason: 'locked', lockedUntil: f.lockedUntil } : { ok: false, reason: 'invalid', attemptsLeft: f.attemptsLeft };
      }
      const recoveryCodes = newRecoveryCodes();
      const recoveryHashes = await Promise.all(recoveryCodes.map(c => recoveryHash(organisationId, profile.id, c)));
      deps.stores.enrolment.write(organisationId, profile.id, { enrolledAt: now().toISOString(), lastStep: check.step, recoveryHashes });
      clearFailures(organisationId, profile.id);
      audit(profile, 'MFA enrolled', `Simulated authenticator enrolled; ${MFA_RECOVERY_CODE_COUNT} recovery codes issued (shown once, kept only as hashes).`);
      return { ok: true, recoveryCodes, stamp: stampFor(profile, 'simulated-totp') };
    },

    // ── Challenge: sign-in and step-up ──────────────────────────────────
    /**
     * A code or a recovery code. The same rules at sign-in and at a
     * signature: locked after five failures for 15 minutes (nothing is
     * checked while locked), a code works once, an old or future code is
     * wrong, a recovery code works once.
     */
    async challenge(profile: SessionProfile, input: string, purpose: 'sign-in' | 'step-up'): Promise<MfaChallengeResult> {
      const organisationId = mfaOrganisationOf(profile);
      const locked = refusedWhileLocked(profile, organisationId);
      if (locked) return { ok: false, reason: 'locked', lockedUntil: locked.lockedUntil };
      const enrolment = deps.stores.enrolment.read(organisationId, profile.id);
      if (!enrolment) return { ok: false, reason: 'not_enrolled' };
      const secret = deps.secretFor ? await deps.secretFor(profile.id) : null;
      if (!secret) return { ok: false, reason: 'unavailable' };
      const where = purpose === 'step-up' ? 'at a signature' : 'at sign-in';

      const normalised = normaliseRecoveryInput(input);
      if (normaliseTotpInput(input) === null && isRecoveryShape(normalised)) {
        const hash = await recoveryHash(organisationId, profile.id, normalised);
        if (enrolment.recoveryHashes.includes(hash)) {
          const left = enrolment.recoveryHashes.filter(h => h !== hash);
          deps.stores.enrolment.write(organisationId, profile.id, { ...enrolment, recoveryHashes: left });
          clearFailures(organisationId, profile.id);
          audit(profile, 'MFA recovery code used', `A recovery code was used ${where}; ${left.length} left.`);
          if (left.length === 0) audit(profile, 'MFA recovery codes used up', 'No recovery codes are left; an administrator can reset the enrolment.');
          return { ok: true, stamp: stampFor(profile, 'recovery-code'), usedRecoveryCode: true, recoveryCodesLeft: left.length };
        }
        const f = registerFailure(profile, organisationId, `A recovery code was not accepted ${where}`);
        return f.lockedUntil ? { ok: false, reason: 'locked', lockedUntil: f.lockedUntil } : { ok: false, reason: 'invalid', attemptsLeft: f.attemptsLeft };
      }

      const check = await verifyTotp(secret, input, now().getTime(), enrolment.lastStep);
      if (check.ok === false) {
        const f = registerFailure(profile, organisationId, `A Simulated authenticator code was not accepted ${where} (${check.reason === 'replayed' ? 'already used' : check.reason === 'malformed' ? 'not a six-digit code' : 'wrong or expired'})`);
        if (f.lockedUntil) return { ok: false, reason: 'locked', lockedUntil: f.lockedUntil };
        return { ok: false, reason: check.reason === 'replayed' ? 'replayed' : 'invalid', attemptsLeft: f.attemptsLeft };
      }
      deps.stores.enrolment.write(organisationId, profile.id, { ...enrolment, lastStep: check.step });
      clearFailures(organisationId, profile.id);
      audit(profile, purpose === 'step-up' ? 'MFA step-up passed' : 'MFA challenge passed', `Simulated authenticator code accepted ${where}.`);
      return { ok: true, stamp: stampFor(profile, 'simulated-totp'), usedRecoveryCode: false, recoveryCodesLeft: enrolment.recoveryHashes.length };
    },

    // ── Single sign-on: the provider did the second factor ──────────────
    /** After the provider's ID token is checked and the person matched: is MFA required, and did the provider assert it? */
    evaluateSso(profile: SessionProfile, claims: Record<string, unknown>): MfaSsoResult {
      const organisationId = mfaOrganisationOf(profile);
      const required = mfaRequiredFor(policyFor(organisationId), profile);
      const assertion = mfaAssertedByClaims(claims);
      if (assertion.asserted) {
        if (required) audit(profile, 'MFA asserted by identity provider', `The identity provider reported a second factor (${describeBasis(assertion.basis)}).`);
        return { ok: true, stamp: stampFor(profile, 'idp') };
      }
      if (!required) return { ok: true, stamp: null };
      audit(profile, 'MFA sign-in refused', 'Sign-in refused: the organisation requires a second factor and the identity provider did not report one.');
      return { ok: false, reason: 'mfa_required' };
    },

    /** A signature's fresh sign-in at the provider (max_age=0) reported a second factor, or did not. */
    stepUpWithClaims(profile: SessionProfile, claims: Record<string, unknown>): MfaStepUpClaimsResult {
      const assertion = mfaAssertedByClaims(claims);
      if (assertion.asserted) {
        audit(profile, 'MFA step-up passed', `At a signature, the identity provider reported a second factor (${describeBasis(assertion.basis)}).`);
        return { ok: true, stamp: stampFor(profile, 'idp') };
      }
      audit(profile, 'MFA step-up refused', 'At a signature, the identity provider did not report a second factor.');
      return { ok: false };
    },

    // ── Session rules ────────────────────────────────────────────────────
    /** A signature should ask for a fresh second factor now. */
    stepUpNeeded(profile: SessionProfile): boolean {
      const organisationId = mfaOrganisationOf(profile);
      const policy = policyFor(organisationId);
      if (!mfaRequiredFor(policy, profile)) return false;
      return !(stampBelongsTo(profile.mfa, profile) && stampFresh(profile.mfa, now(), policy.stepUpMinutes));
    },

    /**
     * On reload: false when the session's second factor has expired or
     * belongs to someone else, so the session ends and the person signs in
     * again. A session with no stamp stays (the policy may have been switched
     * on after it started); its first signature asks for a code.
     */
    sessionStillValid(profile: SessionProfile): boolean {
      if (!profile.mfa) return true;
      const organisationId = mfaOrganisationOf(profile);
      const policy = policyFor(organisationId);
      if (!mfaRequiredFor(policy, profile)) return true;
      if (!stampBelongsTo(profile.mfa, profile)) return false;
      return stampFresh(profile.mfa, now(), policy.sessionMaxHours * 60);
    },

    // ── Administration ───────────────────────────────────────────────────
    /** Enrolments in the administrator's own organisation. Needs auth:mfa-enrolment:reset. */
    async listEnrolments(actor: SessionProfile): Promise<MfaEnrolmentSummary[] | null> {
      if (!(await deps.enforce('auth:mfa-enrolment:reset'))) return null;
      return deps.stores.enrolment.list(mfaOrganisationOf(actor)).map(({ userId, enrolment }) => ({
        userId, enrolledAt: enrolment.enrolledAt, recoveryCodesLeft: enrolment.recoveryHashes.length,
      }));
    },

    /** A lost device: removes someone's enrolment (and their lock) so they enrol again at next sign-in. Own organisation only. */
    async resetEnrolment(actor: SessionProfile, userId: string): Promise<{ ok: true } | { ok: false; reason: 'not_permitted' | 'not_enrolled' }> {
      if (!(await deps.enforce('auth:mfa-enrolment:reset'))) return { ok: false, reason: 'not_permitted' };
      const organisationId = mfaOrganisationOf(actor);
      if (!deps.stores.enrolment.read(organisationId, userId)) return { ok: false, reason: 'not_enrolled' };
      deps.stores.enrolment.remove(organisationId, userId);
      deps.stores.locks.write(lockKey(organisationId, userId), NO_SIGNING_LOCK);
      audit(actor, 'MFA enrolment reset', `The second-factor enrolment of staff id ${userId} was reset; they enrol again at next sign-in.`);
      return { ok: true };
    },

    /** Demo only: the code the Simulated authenticator shows now, so the flow can be shown without a phone. */
    async demoCurrentCode(profile: SessionProfile): Promise<string | null> {
      const secret = deps.secretFor ? await deps.secretFor(profile.id) : null;
      return secret && base32Decode(secret) ? totpAt(secret, now().getTime()) : null;
    },
  };
}

function describeBasis(basis: MfaAssertionBasis): string {
  return basis === 'amr-mfa' ? 'amr includes mfa' : basis === 'amr-factors' ? 'amr names two kinds of factor' : 'acr names a multi-factor class';
}

export type MfaService = ReturnType<typeof createMfaService>;
export { MFA_POLICY_DEFAULTS };
