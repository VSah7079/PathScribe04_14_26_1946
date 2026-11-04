// src/services/auth/authSession.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-60 (Batch 343): signing in and out, outside React. AuthContext calls
// this and keeps only React state; the decisions live here.
//
//   Password sign-in   demo accounts only (VITE_AUTH_MODE unset or "demo");
//                      Batch 456: locks for 15 minutes after 5 failures
//                      (signInLockout.ts)
//   SSO sign-in        begin → provider → /auth/callback/<id> → complete:
//                      tokens checked (ssoClient), then the person resolved
//                      by the API server, or locally when there is none yet
//   startSession       same-browser session conflict check (another tab
//                      already signed in as this user), then stores the
//                      profile and claims this tab as the active session
//   endSession         clears drafts on an explicit sign-out only (an idle
//                      timeout or a superseded tab keeps them), releases the
//                      active-session marker if it is still this tab's,
//                      forgets SSO tokens, removes the profile
//   restoreSession     on page load: the stored profile, if its sign-in
//                      method is still allowed and, for SSO, its tokens are
//                      still there; staff fields filled in if missing
//
// Created with its dependencies (authSessionInstance.ts wires the real
// ones), so tests pass fakes.
// ─────────────────────────────────────────────────────────────────────────────

import type { IUserService } from '../users/IUserService';
import type { IRoleService } from '../roles/IRoleService';
import type { IAuditService } from '../auditlog/IAuditService';
import type { IDraftCacheService } from '../drafts/IDraftCacheService';
import { findProvider, type AuthConfig } from './authConfig';
import { identityFromClaims, type SsoDenialReason } from './externalIdentity';
import type { ISsoClient } from './sso/ssoClient';
import { resolveSsoProfileFromApi, resolveSsoProfileLocally, SSO_PROVIDER_AUDIT_NAMES } from './sso/resolveSsoProfile';
import { profileNeedsStaffFields, staffSessionFields, type SessionProfile } from './sessionProfile';
import type { DemoAccount } from './demo/demoAccounts';
import { deriveSessionRole } from './sessionRole';
import type { MfaService } from './mfa/mfaService';
import type { StaffPasswordCheck } from '../staffPasswords/mockStaffPasswordService';
import {
  SIGN_IN_LOCK_POLICY, currentSignInLock, isSignInLocked, recordSignInFailure, signInLockKey, NO_SIGN_IN_LOCK,
  type SignInLockStore, type SignInRefusal,
} from './signInLockout';

export interface SessionMarkers {
  getActiveSessionId(userId: string): string | null;
  setActiveSessionId(userId: string, sessionId: string): void;
  clearActiveSessionId(userId: string): void;
  getOwnSessionId(): string | null;
  setOwnSessionId(sessionId: string): void;
  clearOwnSessionId(): void;
  generateSessionId(): string;
}

export interface AuthSessionDeps {
  /** Batch 611 (#157). Optional: the second-factor rules for single sign-on and for a restored session. */
  mfa?: Pick<MfaService, 'evaluateSso' | 'sessionStillValid' | 'loadPolicy'>;
  config: AuthConfig;
  /** Null when this build has no demo accounts (VITE_AUTH_MODE=sso). */
  verifyDemoCredentials: ((email: string, password: string) => Promise<DemoAccount | null>) | null;
  /**
   * Batch 448: passwords set from the Staff screen, checked before the
   * built-in demo accounts. Null when there is no password sign-in.
   */
  verifyStaffPassword?: ((email: string, password: string) => Promise<StaffPasswordCheck>) | null;
  /** The built-in demo account for a staff id, when there is one. */
  demoAccountFor?: (staffId: string) => Promise<DemoAccount | undefined>;
  /**
   * Batch 456: failed password sign-ins, per email (signInLockout.ts). With
   * it, a wrong password returns a SignInRefusal instead of null.
   */
  signInLocks?: SignInLockStore;
  /** The name of the account with this email (demo account or staff), for the audit. */
  accountNameFor?: (email: string) => Promise<string | null>;
  /** Created on first use, so importing this module never touches the browser. */
  ssoClient: () => ISsoClient;
  /** The API server, when there is one (VITE_API_BASE_URL). */
  apiBaseUrl: string | null;
  /** Batch 550: clears what this window holds for the user (the export notices). Called by endSession. */
  onSessionEnded?: () => void;
  userService: Pick<IUserService, 'getAll' | 'update'>;
  roleService: Pick<IRoleService, 'getAll'>;
  auditService: Pick<IAuditService, 'logEvent'>;
  draftCacheService: Pick<IDraftCacheService, 'clearAllDraftsForUser'>;
  markers: SessionMarkers;
  profileStore: { read(): SessionProfile | null; write(p: SessionProfile | null): void };
  shouldShowBiometricWizard: (userId: string) => boolean;
  fetch?: typeof fetch;
  now?: () => Date;
}

export type SsoSignInResult =
  | { ok: true; profile: SessionProfile; returnPath: string }
  | { ok: false; reason: SsoDenialReason };

export type StartSessionResult =
  | { result: 'success'; showBiometricWizard: boolean }
  | { result: 'session_conflict' };

export function createAuthSession(deps: AuthSessionDeps) {
  const now = deps.now ?? (() => new Date());

  const staffFor = async (id: string) => {
    const res = await deps.userService.getAll().catch(() => null);
    return res && res.ok !== false ? res.data.find(s => s.id === id) ?? null : null;
  };

  /**
   * Batch 448: the session for someone signing in with a password set from the
   * Staff screen. A built-in demo account keeps its own app role and profile;
   * anyone else (the demo Lab Director, a site without single sign-on) gets
   * the app role their staff roles give, exactly as single sign-on does
   * (sessionRole.deriveSessionRole), and no role means no access.
   */
  const profileForStaffSignIn = async (staffId: string): Promise<SessionProfile | null> => {
    const staff = await staffFor(staffId);
    if (!staff) return null;
    const account = await deps.demoAccountFor?.(staffId);
    if (account) {
      return { id: account.id, name: account.name, email: account.email, role: account.role, initials: account.initials, voiceProfile: account.voiceProfile, ...staffSessionFields(staff), authMethod: 'password' };
    }
    const roles = await deps.roleService.getAll().catch(() => null);
    if (!roles || roles.ok === false) return null;
    const role = deriveSessionRole(staff.roles, roles.data);
    if (!role) return null;
    const first = staff.firstName ?? '';
    const last = staff.lastName ?? '';
    return {
      id: staff.id,
      name: [first, last].map(x => x.trim()).filter(Boolean).join(' ') || staff.email,
      email: staff.email,
      role,
      initials: `${first.trim().charAt(0)}${last.trim().charAt(0)}`.toUpperCase() || '?',
      voiceProfile: (staff.voiceProfile ?? 'EN-US') as SessionProfile['voiceProfile'],
      ...staffSessionFields(staff),
      authMethod: 'password',
    };
  };

  const auditSignIn = (profile: SessionProfile) => {
    const how = profile.authMethod === 'sso'
      ? SSO_PROVIDER_AUDIT_NAMES[profile.ssoProviderId as keyof typeof SSO_PROVIDER_AUDIT_NAMES] ?? 'single sign-on'
      : 'a password';
    void deps.auditService.logEvent({
      type: 'user', event: 'Signed in', detail: `Signed in with ${how}.`,
      user: profile.name, caseId: null, confidence: null,
    }).catch(() => {});
  };

  const auditLockout = (event: string, detail: string, user: string) => {
    void deps.auditService.logEvent({ type: 'user', event, detail, user, caseId: null, confidence: null }).catch(() => {});
  };

  /** Batch 456: who the audit names; never what was typed when no account has the email. */
  const lockoutUser = async (email: string) => (await deps.accountNameFor?.(signInLockKey(email)).catch(() => null)) ?? 'Unknown email';

  /** A wrong password: count it, lock at the limit, audit both. */
  const failSignIn = async (email: string): Promise<SignInRefusal | null> => {
    const store = deps.signInLocks;
    if (!store) return null;
    const key = signInLockKey(email);
    const next = recordSignInFailure(currentSignInLock(store.read(key), now()), now());
    store.write(key, next);
    const user = await lockoutUser(email);
    auditLockout('Sign-in failed', `Password sign-in failed: wrong email or password; failed attempt ${next.failures} of ${SIGN_IN_LOCK_POLICY.maxFailures}.`, user);
    if (next.lockedUntil) {
      auditLockout('Sign-in locked', `Password sign-in locked for ${SIGN_IN_LOCK_POLICY.lockMinutes} minutes after ${SIGN_IN_LOCK_POLICY.maxFailures} failed attempts.`, user);
      return { refused: 'locked', lockedUntil: next.lockedUntil };
    }
    return { refused: 'invalid', attemptsLeft: SIGN_IN_LOCK_POLICY.maxFailures - next.failures };
  };

  const clearFailures = (email: string) => {
    const key = signInLockKey(email);
    const store = deps.signInLocks;
    if (store && store.read(key)) store.write(key, NO_SIGN_IN_LOCK);
  };

  return {
    config: deps.config,

    /**
     * The profile for this email and password, or null. Batch 448: a password
     * set from the Staff screen is checked first, and once set, the built-in
     * demo password for that account no longer works. 'password_change_required'
     * when the person must choose a new password first (no session starts).
     *
     * Batch 456: with a lock store, a wrong password is a SignInRefusal (the
     * attempts left, or locked until when), and while an email is locked the
     * password isn't checked at all. null: password sign-in is off here, or
     * the password was right but the staff record gives no app access.
     */
    async signInWithPassword(email: string, password: string): Promise<SessionProfile | 'password_change_required' | SignInRefusal | null> {
      if (!deps.config.passwordSignIn || !deps.verifyDemoCredentials) return null;
      if (deps.signInLocks) {
        const lock = currentSignInLock(deps.signInLocks.read(signInLockKey(email)), now());
        if (isSignInLocked(lock, now())) {
          auditLockout('Sign-in refused', 'Password sign-in attempted while locked; the password was not checked.', await lockoutUser(email));
          return { refused: 'locked', lockedUntil: lock.lockedUntil! };
        }
      }
      const own = deps.verifyStaffPassword ? await deps.verifyStaffPassword(email, password) : { result: 'none' as const };
      if (own.result === 'wrong') return failSignIn(email);
      if (own.result === 'match') {
        clearFailures(email);
        if (own.mustChange) return 'password_change_required';
        return profileForStaffSignIn(own.staffId);
      }
      const account = await deps.verifyDemoCredentials(email, password);
      if (!account) return failSignIn(email);
      clearFailures(email);
      const staff = await staffFor(account.id);
      return {
        id: account.id,
        name: account.name,
        email: account.email,
        role: account.role,
        initials: account.initials,
        voiceProfile: account.voiceProfile,
        ...staffSessionFields(staff),
        authMethod: 'password',
      };
    },

    /** Sends the browser to the provider. Only returns if it couldn't. */
    async beginSsoSignIn(providerId: string, returnPath: string): Promise<{ ok: false; reason: SsoDenialReason } | { ok: true }> {
      const r = await deps.ssoClient().begin(providerId, returnPath);
      return r.ok === false ? { ok: false, reason: r.reason } : { ok: true };
    },

    /** Finishes the sign-in on the callback page. */
    async completeSsoSignIn(providerId: string, url: string): Promise<SsoSignInResult> {
      const provider = findProvider(deps.config, providerId);
      if (!provider) return { ok: false, reason: 'not_configured' };
      const client = deps.ssoClient();
      const done = await client.complete(providerId, url);
      if (done.ok === false) return { ok: false, reason: done.reason };

      const resolved = deps.apiBaseUrl
        ? await resolveSsoProfileFromApi(provider, { apiBaseUrl: deps.apiBaseUrl, accessToken: await client.accessToken(providerId), fetch: deps.fetch })
        : await resolveSsoProfileLocally(provider, done.claims, { ...deps, now });
      if (resolved.ok === false) {
        await client.signOut(providerId);
        return { ok: false, reason: resolved.reason };
      }
      // Remember which account this is, for signature confirmation (Batch 344).
      const identity = identityFromClaims(provider, done.claims);
      const profile: SessionProfile = { ...resolved.profile, ssoIssuer: identity?.issuer, ssoSubject: identity?.subject };
      // Batch 611 (#157): when the organisation requires a second factor, the
      // provider must have reported one (amr / acr); otherwise no session.
      if (deps.mfa) {
        // Batch 675 (access-14): on a server deployment the policy is read from the server first; if it
        // cannot be read the sign-in is refused (fail closed), never treated as "no policy".
        if (!(await deps.mfa.loadPolicy(profile))) {
          await client.signOut(providerId);
          return { ok: false, reason: 'server_unavailable' };
        }
        const mfa = deps.mfa.evaluateSso(profile, done.claims as Record<string, unknown>);
        if (mfa.ok === false) {
          await client.signOut(providerId);
          return { ok: false, reason: mfa.reason };
        }
        if (mfa.stamp) profile.mfa = mfa.stamp;
      }
      return { ok: true, profile, returnPath: done.returnPath };
    },

    /** Stores the session, unless this user is already active in another tab and the user hasn't confirmed. */
    startSession(profile: SessionProfile, forceSupersede: boolean): StartSessionResult {
      if (!forceSupersede && deps.markers.getActiveSessionId(profile.id)) return { result: 'session_conflict' };
      deps.profileStore.write(profile);
      const sessionId = deps.markers.generateSessionId();
      deps.markers.setActiveSessionId(profile.id, sessionId);
      deps.markers.setOwnSessionId(sessionId);
      auditSignIn(profile);
      return { result: 'success', showBiometricWizard: deps.shouldShowBiometricWizard(profile.id) };
    },

    /** Gives up a session held for the conflict prompt that the user then cancelled. */
    async abandonPendingSession(profile: SessionProfile): Promise<void> {
      if (profile.authMethod === 'sso' && profile.ssoProviderId) await deps.ssoClient().signOut(profile.ssoProviderId);
    },

    endSession(profile: SessionProfile | null, clearDrafts: boolean): void {
      if (profile?.id) {
        // Fire and forget: signing out never waits on this.
        if (clearDrafts) void deps.draftCacheService.clearAllDraftsForUser(profile.id);
        // Only release the active-session marker if it is still this tab's.
        // If a newer sign-in elsewhere took over, the marker is theirs.
        const ownId = deps.markers.getOwnSessionId();
        if (ownId && deps.markers.getActiveSessionId(profile.id) === ownId) deps.markers.clearActiveSessionId(profile.id);
        deps.markers.clearOwnSessionId();
      }
      if (profile?.authMethod === 'sso' && profile.ssoProviderId) void deps.ssoClient().signOut(profile.ssoProviderId);
      deps.profileStore.write(null);
      deps.onSessionEnded?.();
    },

    /** Closing the tab releases the active-session marker (drafts stay). */
    releaseActiveMarker(userId: string): void {
      const ownId = deps.markers.getOwnSessionId();
      if (ownId && deps.markers.getActiveSessionId(userId) === ownId) deps.markers.clearActiveSessionId(userId);
    },

    /** The session to resume on page load, or null (and nothing stored) if there isn't a usable one. */
    async restoreSession(): Promise<SessionProfile | null> {
      const stored = deps.profileStore.read();
      if (!stored) return null;
      const method = stored.authMethod ?? 'password';
      let usable: boolean;
      if (method === 'sso') {
        usable = !!findProvider(deps.config, stored.ssoProviderId) && await deps.ssoClient().hasSession(stored.ssoProviderId!);
      } else {
        usable = deps.config.passwordSignIn;
      }
      if (!usable) { deps.profileStore.write(null); return null; }

      const profile: SessionProfile = { ...stored, voiceProfile: stored.voiceProfile || 'EN-US' };
      // A reload fires beforeunload, which released this tab's claim on the
      // active-session marker. Take it back if nobody else has, so a sign-in
      // in another tab is still reported as a conflict (fixed in Batch 343:
      // before, one reload was enough to lose the check).
      const ownId = deps.markers.getOwnSessionId();
      if (ownId && !deps.markers.getActiveSessionId(profile.id)) deps.markers.setActiveSessionId(profile.id, ownId);
      // A session stored before a staff-derived field existed gets it now;
      // otherwise it would stay locked out (no organisation = no cases).
      if (profileNeedsStaffFields(profile)) {
        Object.assign(profile, staffSessionFields(await staffFor(profile.id)));
        deps.profileStore.write(profile);
      }
      // Batch 611 (#157): a second factor that has expired (or belongs to
      // another organisation) ends the session; the person signs in again.
      if (deps.mfa && (!(await deps.mfa.loadPolicy(profile)) || !deps.mfa.sessionStillValid(profile))) {
        if (method === 'sso' && profile.ssoProviderId) void deps.ssoClient().signOut(profile.ssoProviderId);
        deps.profileStore.write(null);
        return null;
      }
      return profile;
    },

    /** Saves profile edits made in the app (display name, voice profile). */
    saveProfile(profile: SessionProfile): void {
      deps.profileStore.write(profile);
    },

    /** The signed-in user's access token for the API and the hub, or null. */
    async accessToken(): Promise<string | null> {
      const p = deps.profileStore.read();
      if (!p || p.authMethod !== 'sso' || !p.ssoProviderId || !findProvider(deps.config, p.ssoProviderId)) return null;
      return deps.ssoClient().accessToken(p.ssoProviderId);
    },
  };
}

export type AuthSession = ReturnType<typeof createAuthSession>;
