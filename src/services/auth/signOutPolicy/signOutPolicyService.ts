// src/services/auth/signOutPolicy/signOutPolicyService.ts
// ─────────────────────────────────────────────────────────────────
// Batch 642: keeps the sign-out authentication policy, the sign-out session,
// and the audit entries both produce. The rules are in signOutPolicy.ts.
//
//   • Saving needs config:session-security:manage and is audited: who, when,
//     old value, new value, for the enterprise default, each facility
//     override, and the override lock.
//   • An authentication is audited with the full context an auditor asks for
//     (signOutAuditDetail): user, facility, enterprise policy, facility
//     override, session id, methods, time, case, device, network.
//   • A session expiry is audited with its reason.
//
// The API server repeats the policy check on the sign-out request
// (docs/architecture/SIGN_OUT_AUTHENTICATION.md).
// ─────────────────────────────────────────────────────────────────

import type { IAuditService } from '../../auditlog/IAuditService';
import type { SessionProfile } from '../sessionProfile';
import {
  describePolicy, evaluateSignOutSession, normaliseSignOutConfig, normaliseSignOutPolicy, resolveSignOutPolicy, signOutAuditDetail,
  type ActiveSignOutPolicy, type SignOutAuthPolicy, type SignOutExpiryReason, type SignOutPolicyConfig, type SignOutSession, type SignOutSessionState,
} from './signOutPolicy';

export interface SignOutPolicyStore {
  readConfig(): Partial<SignOutPolicyConfig> | null;
  writeConfig(config: SignOutPolicyConfig): void;
  readSession(userId: string): SignOutSession | null;
  writeSession(userId: string, session: SignOutSession | null): void;
  /** Whoever's session this tab holds (one per tab). */
  readAny(): SignOutSession | null;
}

export interface SignOutPolicyDeps {
  store: SignOutPolicyStore;
  audit: Pick<IAuditService, 'logEvent'>;
  enforce: (capability: string) => Promise<boolean>;
  deviceFingerprint: () => string;
  network: () => string;
  now?: () => Date;
  newId?: () => string;
}

export interface SignOutAuthentication {
  facilityId: string | null;
  facilityName?: string | null;
  caseId: string | null;
  method: SignOutSession['method'];
  mfa: boolean;
}

export function createSignOutPolicyService(deps: SignOutPolicyDeps) {
  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => globalThis.crypto.randomUUID());
  const config = (): SignOutPolicyConfig => normaliseSignOutConfig(deps.store.readConfig());

  const log = (user: string, event: string, detail: string, caseId: string | null = null) => {
    void deps.audit.logEvent({ type: 'user', event, detail, user, caseId, confidence: null }).catch(() => {});
  };

  const contextFor = (profile: Pick<SessionProfile, 'name'>, active: ActiveSignOutPolicy, c: SignOutAuthentication, sessionId: string | null, methods: string[]) => {
    const cfg = config();
    return signOutAuditDetail({
      user: profile.name, facilityId: c.facilityId, facilityName: c.facilityName,
      enterprise: cfg.enterprise,
      facilityOverride: c.facilityId ? cfg.overrides[c.facilityId] ?? null : null,
      overrideIgnored: active.overrideIgnored,
      sessionId, methods, at: now().toISOString(), caseId: c.caseId,
      deviceFingerprint: deps.deviceFingerprint(), network: deps.network(),
    });
  };

  const expire = (profile: Pick<SessionProfile, 'id' | 'name'>, session: SignOutSession, reason: SignOutExpiryReason) => {
    deps.store.writeSession(profile.id, null);
    log(profile.name, 'Sign-out session expired', `Sign-out session ${session.sessionId} ended (${reason.replace('_', ' ')}); the next sign-out asks for authentication again.`);
  };

  return {
    getConfig: config,

    /** The policy that applies to a case performed at this facility. */
    activeFor(facilityId: string | null | undefined): ActiveSignOutPolicy {
      return resolveSignOutPolicy(config(), facilityId);
    },

    async saveConfig(actor: Pick<SessionProfile, 'name'>, next: Partial<SignOutPolicyConfig>): Promise<{ ok: true; config: SignOutPolicyConfig } | { ok: false; reason: 'not_permitted' }> {
      if (!(await deps.enforce('config:session-security:manage'))) return { ok: false, reason: 'not_permitted' };
      const before = config();
      const after = normaliseSignOutConfig({ ...before, ...next });
      deps.store.writeConfig(after);
      const when = now().toISOString();
      const changed = (a: SignOutAuthPolicy | undefined, b: SignOutAuthPolicy | undefined) => JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
      const word = (p: SignOutAuthPolicy | undefined) => (p ? describePolicy(p) : 'no override');
      if (changed(before.enterprise, after.enterprise)) {
        log(actor.name, 'Sign-out policy changed', `Enterprise default sign-out authentication changed by ${actor.name} at ${when} from "${word(before.enterprise)}" to "${word(after.enterprise)}".`);
      }
      for (const id of new Set([...Object.keys(before.overrides), ...Object.keys(after.overrides)])) {
        if (changed(before.overrides[id], after.overrides[id])) {
          log(actor.name, 'Sign-out policy changed', `Facility ${id} sign-out authentication changed by ${actor.name} at ${when} from "${word(before.overrides[id])}" to "${word(after.overrides[id])}".`);
        }
      }
      if (before.overridesLocked !== after.overridesLocked) {
        log(actor.name, 'Sign-out policy changed', `Facility overrides of the sign-out policy changed by ${actor.name} at ${when} from ${before.overridesLocked ? 'locked' : 'allowed'} to ${after.overridesLocked ? 'locked' : 'allowed'}.`);
      }
      return { ok: true, config: after };
    },

    /** Where this person stands for a sign-out at this facility. Records an expiry the first time it is seen. */
    stateFor(profile: Pick<SessionProfile, 'id' | 'name' | 'role'>, facilityId: string | null | undefined): SignOutSessionState {
      const active = resolveSignOutPolicy(config(), facilityId);
      const session = deps.store.readSession(profile.id);
      const state = evaluateSignOutSession(active, session, { userId: profile.id, role: profile.role }, now());
      if (state.kind === 'prompt' && state.why === 'expired' && session) expire(profile, session, state.reason);
      return state;
    },

    /** A second factor is part of sign-out at this facility. */
    mfaRequired(facilityId: string | null | undefined): boolean {
      return resolveSignOutPolicy(config(), facilityId).policy.mfa;
    },

    /** The person just authenticated for a sign-out. Starts a session in session mode; audits in both modes. */
    recordAuthentication(profile: Pick<SessionProfile, 'id' | 'name' | 'role'>, c: SignOutAuthentication): { sessionId: string | null } {
      const active = resolveSignOutPolicy(config(), c.facilityId);
      let sessionId: string | null = null;
      if (active.policy.mode === 'session') {
        sessionId = newId();
        deps.store.writeSession(profile.id, { sessionId, userId: profile.id, userName: profile.name, role: profile.role, facilityId: active.facilityId, authenticatedAt: now().toISOString(), method: c.method, mfa: c.mfa });
      } else {
        deps.store.writeSession(profile.id, null);
      }
      log(profile.name, active.policy.mode === 'session' ? 'Sign-out session started' : 'Sign-out authentication',
        contextFor(profile, active, c, sessionId, c.mfa ? [c.method, 'second factor'] : [c.method]), c.caseId);
      return { sessionId };
    },

    /** A later sign-out inside a valid session: audited, nothing asked. */
    recordSessionSignOut(profile: Pick<SessionProfile, 'name'>, session: SignOutSession, c: SignOutAuthentication): void {
      const active = resolveSignOutPolicy(config(), c.facilityId);
      log(profile.name, 'Sign-out within session', contextFor(profile, active, c, session.sessionId, [`session (${session.method}${session.mfa ? ' + second factor' : ''})`]), c.caseId);
    },

    /** The sign-out session ends for a reason the app learns of (logout, workstation lock from the server in phase 2e). */
    expireSession(profile: Pick<SessionProfile, 'id' | 'name'>, reason: SignOutExpiryReason): void {
      const session = deps.store.readSession(profile.id);
      if (session) expire(profile, session, reason);
    },

    /** The sign-in ended (logout, session taken over): whatever sign-out session this tab held ends too. */
    expireAny(reason: SignOutExpiryReason): void {
      const session = deps.store.readAny();
      if (session) expire({ id: session.userId, name: session.userName }, session, reason);
    },

    normalisePolicy: normaliseSignOutPolicy,
  };
}

export type SignOutPolicyService = ReturnType<typeof createSignOutPolicyService>;
