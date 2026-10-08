// src/services/staffPasswords/mockStaffPasswordService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 448: staff passwords set from the Staff screen (staffPasswordRules.ts).
//
//   • set / clear need config:staff-password:manage (Admin), and are audited
//     (STAFF_PASSWORD_SET / STAFF_PASSWORD_CLEARED). The audit says that a
//     password was set and by whom, never the password.
//   • verify(email, password): used at sign-in. A staff member with a password
//     set here is checked against it only; the built-in demo password for that
//     account stops working. Someone with no password set here isn't matched,
//     and sign-in falls back to the built-in demo accounts.
//   • changeAtSignIn: the person's own change when they must choose a new
//     password; they prove the current one, so no permission is needed.
//   • Batch 456: both refuse a common, predictable or breached password
//     (passwordScreening.ts), and set() lifts any sign-in lock on the
//     person's emails (auth/signInLockout.ts).
//
// This build keeps the hashes in browser storage, so a password set here
// works in this browser (Full Reset clears it, back to the built-in demo
// passwords). Production: the API server stores the hash in SQL Server and
// checks it at sign-in; the browser never sees a hash.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import { mockAuditService } from '../auditlog/mockAuditService';
import { readSessionProfile } from '../auth/sessionProfile';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { derivePasswordHash, verifyPasswordHash, type StoredPasswordHash } from '../auth/demo/passwordHash';
import { mockUserService } from '../users/mockUserService';
import {
  PASSWORD_HASH_ITERATIONS, passwordPolicyProblem, type PasswordPolicyProblem, type StaffPasswordRecord,
} from './staffPasswordRules';
import { screenPassword, defaultPasswordScreeningDeps, type PasswordScreeningDeps, type PasswordScreeningProblem, type BreachCheckOutcome } from './passwordScreening';
import { browserSignInLockStore, type SignInLockStore } from '../auth/signInLockout';

export const STAFF_PASSWORD_STORAGE_KEY = 'staff_passwords';
export const STAFF_PASSWORD_NOT_PERMITTED = 'notPermitted';
export const STAFF_PASSWORD_NO_STAFF = 'noStaff';
export const STAFF_PASSWORD_WRONG_CURRENT = 'wrongCurrent';
export const STAFF_PASSWORD_SAME_AS_CURRENT = 'sameAsCurrent';
export type StaffPasswordError = PasswordPolicyProblem | PasswordScreeningProblem | typeof STAFF_PASSWORD_NOT_PERMITTED | typeof STAFF_PASSWORD_NO_STAFF
  | typeof STAFF_PASSWORD_WRONG_CURRENT | typeof STAFF_PASSWORD_SAME_AS_CURRENT;

export interface StaffPasswordStatus {
  hasOwn: boolean;
  mustChange: boolean;
  setAt?: string;
  /** A built-in demo password exists for this person (used while no password is set here). */
  builtInDefault: boolean;
  /** This build signs people in with a password at all (not single sign-on only). */
  passwordSignIn: boolean;
}

export type StaffPasswordCheck =
  | { result: 'match'; staffId: string; mustChange: boolean }
  | { result: 'wrong' }
  | { result: 'none' };

export interface IStaffPasswordService {
  status(staffId: string): Promise<ServiceResult<StaffPasswordStatus>>;
  set(staffId: string, password: string, opts: { mustChange: boolean }): Promise<ServiceResult<StaffPasswordStatus>>;
  /** Removes the password set here (the built-in demo password, if any, applies again). */
  clear(staffId: string): Promise<ServiceResult<StaffPasswordStatus>>;
  /**
   * At sign-in. 'none': no password was set here for this email (sign-in falls
   * back to the built-in demo accounts). 'wrong': one was, and this isn't it
   * (no fallback: once set here, the built-in password stops working).
   */
  verify(email: string, password: string): Promise<StaffPasswordCheck>;
  /** The person's own change when they must choose a new password. */
  changeAtSignIn(email: string, current: string, next: string): Promise<ServiceResult<true>>;
}

const load = () => storageGet<StaffPasswordRecord[]>(STAFF_PASSWORD_STORAGE_KEY, []);
const saveAll = (all: StaffPasswordRecord[]) => storageSet(STAFF_PASSWORD_STORAGE_KEY, all);
const toBase64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));

async function hashPassword(password: string): Promise<StoredPasswordHash> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordHash(password, salt, PASSWORD_HASH_ITERATIONS);
  return { iterations: PASSWORD_HASH_ITERATIONS, salt: toBase64(salt), hash: toBase64(hash) };
}

/** Compared against when no staff record matches, so a wrong email takes as long as a wrong password. */
const NO_MATCH: StoredPasswordHash = { iterations: PASSWORD_HASH_ITERATIONS, salt: 'uZcBfjDeAK+0yh4OHOhC7Q==', hash: 'EEPiWPbQZ3YGIV+tcrKwZmsgRRhufzkxnVt9WCAquHw=' };

const passwordSignIn = import.meta.env.VITE_AUTH_MODE !== 'sso';

async function builtInDefault(staffId: string): Promise<boolean> {
  if (!passwordSignIn) return false;
  return (await import('../auth/demo/demoAccounts')).DEMO_ACCOUNTS.some(a => a.id === staffId);
}

async function status(staffId: string, r: StaffPasswordRecord | undefined): Promise<StaffPasswordStatus> {
  return { hasOwn: !!r, mustChange: !!r?.mustChange, setAt: r?.setAt, builtInDefault: await builtInDefault(staffId), passwordSignIn };
}

async function staffNamed(staffId: string) {
  const r = await mockUserService.getById(staffId);
  return r.ok ? r.data : null;
}

async function audit(event: string, detail: string) {
  const user = readSessionProfile();
  await mockAuditService.logEvent({ type: 'user', event, detail, user: user?.name ?? user?.id ?? 'unknown', caseId: null, confidence: null }).catch(() => {});
}

async function permitted(): Promise<boolean> {
  return (await authorizationService.enforce('config:staff-password:manage')).allowed;
}

/** Batch 456: the audit's note on the breach check; never anything about the password itself. */
const breachNote = (b: BreachCheckOutcome) => (b === 'unavailable' ? ' The breached-password service could not be reached, so only the local checks were applied.' : '');

/**
 * Batch 456: a new password must pass the length rules and then the
 * common/breached screening (passwordScreening.ts). Setting one from the
 * Staff screen also lifts any sign-in lock on the person's emails.
 */
export function createMockStaffPasswordService(deps: { screening?: PasswordScreeningDeps; signInLocks?: SignInLockStore } = {}): IStaffPasswordService {
  const screening = deps.screening ?? defaultPasswordScreeningDeps;
  const locks = deps.signInLocks ?? browserSignInLockStore;

  const check = async (password: string, email: string): Promise<{ error: StaffPasswordError } | { breach: BreachCheckOutcome }> => {
    const problem = passwordPolicyProblem(password, email);
    if (problem) return { error: problem };
    const screened = await screenPassword(password.trim(), { email }, screening);
    return screened.problem ? { error: screened.problem } : { breach: screened.breachCheck };
  };

  /** Every email this person signs in with: their staff email and any built-in demo account's. */
  const signInEmails = async (staffId: string, staffEmail: string | undefined): Promise<string[]> => {
    const demo = passwordSignIn ? (await import('../auth/demo/demoAccounts')).DEMO_ACCOUNTS.filter(a => a.id === staffId).map(a => a.email) : [];
    return [...new Set([staffEmail ?? '', ...demo].map(e => e.trim().toLowerCase()).filter(Boolean))];
  };

  const service: IStaffPasswordService = {
    async status(staffId) {
      return { ok: true, data: await status(staffId, load().find(r => r.staffId === staffId)) };
    },

    async set(staffId, password, { mustChange }) {
      if (!(await permitted())) return { ok: false, error: STAFF_PASSWORD_NOT_PERMITTED };
      const staff = await staffNamed(staffId);
      if (!staff) return { ok: false, error: STAFF_PASSWORD_NO_STAFF };
      const checked = await check(password, staff.email);
      if ('error' in checked) return { ok: false, error: checked.error };
      const record: StaffPasswordRecord = {
        staffId, password: await hashPassword(password), mustChange, setAt: new Date().toISOString(), setBy: readSessionProfile()?.id ?? 'unknown',
      };
      saveAll([...load().filter(r => r.staffId !== staffId), record]);
      const emails = await signInEmails(staffId, staff.email);
      const wasLocked = emails.some(e => locks.read(e));
      locks.clear(emails);
      await audit('STAFF_PASSWORD_SET', `Sign-in password set for staff record ${staffId}${mustChange ? '; must be changed at next sign-in' : ''}.${wasLocked ? ' Failed sign-in attempts cleared.' : ''}${breachNote(checked.breach)}`);
      return { ok: true, data: await status(staffId, record) };
    },

    async clear(staffId) {
      if (!(await permitted())) return { ok: false, error: STAFF_PASSWORD_NOT_PERMITTED };
      const all = load();
      if (all.some(r => r.staffId === staffId)) {
        saveAll(all.filter(r => r.staffId !== staffId));
        await audit('STAFF_PASSWORD_CLEARED', `Sign-in password removed from staff record ${staffId}.`);
      }
      return { ok: true, data: await status(staffId, undefined) };
    },

    async verify(email, password) {
      const wanted = email.trim().toLowerCase();
      const staffRes = await mockUserService.getAll();
      const staff = staffRes.ok ? staffRes.data.find(s => (s.email ?? '').trim().toLowerCase() === wanted) : undefined;
      const record = staff ? load().find(r => r.staffId === staff.id) : undefined;
      const ok = await verifyPasswordHash(password.trim(), record?.password ?? NO_MATCH);
      if (!staff || !record) return { result: 'none' };
      return ok ? { result: 'match', staffId: staff.id, mustChange: record.mustChange } : { result: 'wrong' };
    },

    async changeAtSignIn(email, current, next) {
      const match = await service.verify(email, current);
      if (match.result !== 'match') return { ok: false, error: STAFF_PASSWORD_WRONG_CURRENT };
      if (next.trim() === current.trim()) return { ok: false, error: STAFF_PASSWORD_SAME_AS_CURRENT };
      const checked = await check(next, email);
      if ('error' in checked) return { ok: false, error: checked.error };
      const record: StaffPasswordRecord = { staffId: match.staffId, password: await hashPassword(next), mustChange: false, setAt: new Date().toISOString(), setBy: match.staffId };
      saveAll([...load().filter(r => r.staffId !== match.staffId), record]);
      await mockAuditService.logEvent({ type: 'user', event: 'STAFF_PASSWORD_CHANGED', detail: `Staff record ${match.staffId} chose a new sign-in password at sign-in.${breachNote(checked.breach)}`, user: match.staffId, caseId: null, confidence: null }).catch(() => {});
      return { ok: true, data: true };
    },
  };
  return service;
}

export const mockStaffPasswordService: IStaffPasswordService = createMockStaffPasswordService();
