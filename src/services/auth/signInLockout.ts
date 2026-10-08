// src/services/auth/signInLockout.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 456 (Pete: "Add the sign-in lockout"): password sign-in locks after
// 5 failed attempts in a row for one email, for 15 minutes. Same numbers as
// signature confirmation (SIGNING_LOCK_POLICY), and the same counting rules
// (signerConfirmation.ts: recordSigningFailure).
//
//   • Counted per email typed, whether or not an account has that email, so
//     the lock doesn't reveal which emails are accounts.
//   • While locked, the password is not checked at all, so a correct guess
//     during the lock gets nothing.
//   • A correct password clears the count.
//   • It ends on its own after 15 minutes. An administrator who sets a new
//     password from the Staff screen also clears it (staffPasswords/).
//     Full Reset clears every lock.
//   • Each failure, each lock and each attempt while locked is audited. The
//     audit names the account when the email belongs to one, and never
//     records what was typed in the password box.
//
// This build keeps the counts in browser storage, so the lock holds in this
// browser only. Production: the API server keeps them (SQL Server), and the
// lock holds wherever the person signs in from (docs/architecture).
// Single sign-on has no PathScribe password: the hospital's identity
// provider applies its own lockout.
// ─────────────────────────────────────────────────────────────────────────────

import { currentSigningLock, isSigningLocked, recordSigningFailure, NO_SIGNING_LOCK, type SigningLockState } from './signerConfirmation';
import { storageGet, storageSet } from '../mockStorage';

export const SIGN_IN_LOCK_POLICY = { maxFailures: 5, lockMinutes: 15 } as const;

export type SignInLockState = SigningLockState;

/** The key a lock is kept under: the email as typed, without case or surrounding spaces. */
export const signInLockKey = (email: string): string => email.trim().toLowerCase();

export const currentSignInLock = (state: SignInLockState | null | undefined, now: Date): SignInLockState => currentSigningLock(state, now);
export const isSignInLocked = (state: SignInLockState, now: Date): boolean => isSigningLocked(state, now);
export const recordSignInFailure = (state: SignInLockState, now: Date): SignInLockState => recordSigningFailure(state, now, SIGN_IN_LOCK_POLICY);
export const NO_SIGN_IN_LOCK = NO_SIGNING_LOCK;

/** What a refused password sign-in tells the person. */
export type SignInRefusal =
  | { refused: 'invalid'; attemptsLeft: number }
  | { refused: 'locked'; lockedUntil: string };

/**
 * What the sign-in screen says after a refusal: the locale key and its values.
 * The lockout warning appears only when one more failure would lock.
 */
export function signInRefusalNotice(r: SignInRefusal | 'invalid_credentials', now: Date): { key: string; values?: Record<string, number> } {
  if (r === 'invalid_credentials') return { key: 'login.invalidCredentials' };
  if (r.refused === 'locked') {
    const minutes = Math.max(1, Math.ceil((Date.parse(r.lockedUntil) - now.getTime()) / 60_000));
    return { key: 'login.locked', values: { count: minutes } };
  }
  return r.attemptsLeft === 1
    ? { key: 'login.lockWarning', values: { minutes: SIGN_IN_LOCK_POLICY.lockMinutes } }
    : { key: 'login.invalidCredentials' };
}

export interface SignInLockStore {
  read(key: string): SignInLockState | null;
  write(key: string, state: SignInLockState): void;
  clear(keys: readonly string[]): void;
}

// ── The browser store (this build) ─────────────────────────────────────────

export const SIGN_IN_LOCK_STORAGE_KEY = 'pathscribe_sign_in_locks';
/** Kept small: entries for emails nobody has tried for a while are dropped first. */
const MAX_ENTRIES = 200;

type Stored = Record<string, SignInLockState & { at: string }>;

export const browserSignInLockStore: SignInLockStore = {
  read(key) {
    const s = storageGet<Stored>(SIGN_IN_LOCK_STORAGE_KEY, {})[key];
    return s ? { failures: s.failures, lockedUntil: s.lockedUntil } : null;
  },
  write(key, state) {
    const all = storageGet<Stored>(SIGN_IN_LOCK_STORAGE_KEY, {});
    if (state.failures === 0 && !state.lockedUntil) delete all[key];
    else all[key] = { ...state, at: new Date().toISOString() };
    const kept = Object.entries(all).sort((a, b) => b[1].at.localeCompare(a[1].at)).slice(0, MAX_ENTRIES);
    storageSet(SIGN_IN_LOCK_STORAGE_KEY, Object.fromEntries(kept));
  },
  clear(keys) {
    const all = storageGet<Stored>(SIGN_IN_LOCK_STORAGE_KEY, {});
    let changed = false;
    for (const k of keys.map(signInLockKey)) if (k in all) { delete all[k]; changed = true; }
    if (changed) storageSet(SIGN_IN_LOCK_STORAGE_KEY, all);
  },
};
