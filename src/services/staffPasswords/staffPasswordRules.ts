// src/services/staffPasswords/staffPasswordRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 448: passwords set from the Staff screen (Pete: "In most cases I've
// simply defined the password in the Staff configurations"). Pure.
//
// They apply where PathScribe itself signs people in with a password: the
// demo, and a site without single sign-on. A site on single sign-on signs in
// at the hospital's identity provider, and its staff have no PathScribe
// password at all.
//
//   • passwordPolicyProblem: at least 12 characters (NIST SP 800-63B favours
//     length over composition rules), at most 128, not the person's email,
//     and not blank space.
//   • A password is stored only as a PBKDF2-SHA256 hash (600,000 iterations,
//     a fresh random salt), never as typed, and never written to the audit
//     log.
// ─────────────────────────────────────────────────────────────────────────────

import type { StoredPasswordHash } from '../auth/demo/passwordHash';

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_HASH_ITERATIONS = 600_000;

export interface StaffPasswordRecord {
  staffId: string;
  password: StoredPasswordHash;
  /** Asked for a new password at the next sign-in, before the session starts. */
  mustChange: boolean;
  setAt: string;
  /** Who set it: an administrator's id, or the staff member's own when they changed it. */
  setBy: string;
}

export type PasswordPolicyProblem = 'tooShort' | 'tooLong' | 'sameAsEmail' | 'blank';

export function passwordPolicyProblem(password: string, email?: string): PasswordPolicyProblem | null {
  if (!password.trim()) return 'blank';
  if (password.length < PASSWORD_MIN_LENGTH) return 'tooShort';
  if (password.length > PASSWORD_MAX_LENGTH) return 'tooLong';
  if (email && password.trim().toLowerCase() === email.trim().toLowerCase()) return 'sameAsEmail';
  return null;
}

/** What the Staff screen shows about a person's password. */
export type StaffPasswordState = 'own' | 'ownMustChange' | 'builtInDefault' | 'none';

export function staffPasswordState(s: { hasOwn: boolean; mustChange: boolean; builtInDefault: boolean }): StaffPasswordState {
  if (s.hasOwn) return s.mustChange ? 'ownMustChange' : 'own';
  return s.builtInDefault ? 'builtInDefault' : 'none';
}

/** The new-password form: both entries must match. */
export function passwordConfirmProblem(next: string, confirm: string): 'mismatch' | null {
  return next === confirm ? null : 'mismatch';
}
