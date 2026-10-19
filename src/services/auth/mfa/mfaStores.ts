// src/services/auth/mfa/mfaStores.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 611 (#157): where this build keeps the second-factor policy, the
// enrolments and the failed-code counts. All three are server data, so they go
// through mockStorage (dataStorage: memory on a server deployment, per
// browserData.guard). Each is keyed by organisation first, so one
// organisation's state is never read for another. An enrolment holds no secret
// (the demo secret lives in the demo account data) and recovery codes only as
// hashes. Each key is listed in demoReset.ts so Full Reset clears it.
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../../mockStorage';
import type { SigningLockState } from '../signerConfirmation';
import type { MfaPolicy } from './mfaPolicy';
import type { MfaEnrolment, MfaStores } from './mfaService';

export const MFA_POLICY_KEY = 'ps_mfa_policy_v1';
export const MFA_ENROLMENTS_KEY = 'ps_mfa_enrolments_v1';
export const MFA_LOCKS_KEY = 'ps_mfa_locks_v1';

type ByOrganisation<T> = Record<string, T>;

export const browserMfaStores: MfaStores = {
  policy: {
    read: organisationId => storageGet<ByOrganisation<Partial<MfaPolicy>>>(MFA_POLICY_KEY, {})[organisationId] ?? null,
    write(organisationId, policy) {
      const all = storageGet<ByOrganisation<Partial<MfaPolicy>>>(MFA_POLICY_KEY, {});
      all[organisationId] = policy;
      storageSet(MFA_POLICY_KEY, all);
    },
  },
  enrolment: {
    read: (organisationId, userId) => storageGet<ByOrganisation<Record<string, MfaEnrolment>>>(MFA_ENROLMENTS_KEY, {})[organisationId]?.[userId] ?? null,
    write(organisationId, userId, enrolment) {
      const all = storageGet<ByOrganisation<Record<string, MfaEnrolment>>>(MFA_ENROLMENTS_KEY, {});
      all[organisationId] = { ...(all[organisationId] ?? {}), [userId]: enrolment };
      storageSet(MFA_ENROLMENTS_KEY, all);
    },
    remove(organisationId, userId) {
      const all = storageGet<ByOrganisation<Record<string, MfaEnrolment>>>(MFA_ENROLMENTS_KEY, {});
      if (!all[organisationId]) return;
      delete all[organisationId][userId];
      storageSet(MFA_ENROLMENTS_KEY, all);
    },
    list: organisationId => Object.entries(storageGet<ByOrganisation<Record<string, MfaEnrolment>>>(MFA_ENROLMENTS_KEY, {})[organisationId] ?? {})
      .map(([userId, enrolment]) => ({ userId, enrolment })),
  },
  locks: {
    read: key => storageGet<Record<string, SigningLockState>>(MFA_LOCKS_KEY, {})[key] ?? null,
    write(key, state) {
      const all = storageGet<Record<string, SigningLockState>>(MFA_LOCKS_KEY, {});
      if (state.failures === 0 && !state.lockedUntil) delete all[key];
      else all[key] = state;
      storageSet(MFA_LOCKS_KEY, all);
    },
  },
};

/** In-memory stores for tests. */
export function memoryMfaStores(): MfaStores {
  const policy = new Map<string, Partial<MfaPolicy>>();
  const enrol = new Map<string, MfaEnrolment>();
  const locks = new Map<string, SigningLockState>();
  const k = (o: string, u: string) => `${o}\u0000${u}`;
  return {
    policy: { read: o => policy.get(o) ?? null, write: (o, p) => { policy.set(o, p); } },
    enrolment: {
      read: (o, u) => enrol.get(k(o, u)) ?? null,
      write: (o, u, e) => { enrol.set(k(o, u), e); },
      remove: (o, u) => { enrol.delete(k(o, u)); },
      list: o => [...enrol.entries()].filter(([key]) => key.startsWith(`${o}\u0000`)).map(([key, enrolment]) => ({ userId: key.split('\u0000')[1], enrolment })),
    },
    locks: { read: key => locks.get(key) ?? null, write: (key, s) => { locks.set(key, s); } },
  };
}
