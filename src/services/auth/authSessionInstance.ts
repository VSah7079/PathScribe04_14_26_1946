// src/services/auth/authSessionInstance.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-60 (Batch 343): the app's one authSession, wired to this build's
// settings and services. Exported from `@/services` as `authSession`.
//
// The demo accounts are loaded only in the demo build (__DEMO_TOOLS__) and
// when VITE_AUTH_MODE is not exactly "sso". Batch 547: the sign-in mode now
// comes from config.json at start-up, so it can't strip the module any more;
// __DEMO_TOOLS__ is fixed by the build, so in a server build every import of
// the accounts below is dead code and the module is not in the bundle
// (scripts/check-production-bundle.mjs fails the build if it is). A server
// build signs in through the identity provider only (config.json must say
// "sso", services/runtimeConfig/runtimeSettings.ts).
// ─────────────────────────────────────────────────────────────────────────────

import { resolveServiceEndpoint } from '@/utils/serviceEndpoint';
import { runSessionEndHooks } from './sessionEndHooks';
import { mockUserService } from '../users/mockUserService';
import { mockRoleService } from '../roles/mockRoleService';
import { mockAuditService } from '../auditlog/mockAuditService';
import { draftCacheService as mockDraftCacheService } from '../drafts/draftCacheInstance';
import { biometricFlow } from '../biometric/biometricFlowInstance';
import * as markers from '../session/sessionSupersedeService';
import { resolveAuthConfig } from './authConfig';
import { createAuthSession } from './authSession';
import { readSessionProfile, writeSessionProfile } from './sessionProfile';
import { dataStorage } from '../browserData/dataStorage';
import { createSsoClient, type ISsoClient } from './sso/ssoClient';
import { setAccessTokenSource } from './accessTokenSource';
import { browserSignInLockStore } from './signInLockout';
import { createSignerConfirmation, type SigningLockState } from './signerConfirmation';
import { createSignatureGate } from './signatureEvidence';
import { signatureRecordService } from '../signatures/signatureRecordServiceInstance';
import { mfaService } from './mfa/mfaInstance';
import { appEnv } from '@/services/runtimeConfig/runtimeEnv';

const isProduction = !!import.meta.env.PROD;

// Batch 444: each setting is read by its full name. Passing `import.meta.env`
// as an object made Vite copy every VITE_ variable in .env into the browser
// bundle, whatever it held (envExposure.guard.test.ts).
const AUTH_ENV: Record<string, string | undefined> = {
  VITE_AUTH_MODE: appEnv().VITE_AUTH_MODE,
  VITE_AUTH_MICROSOFT_AUTHORITY: appEnv().VITE_AUTH_MICROSOFT_AUTHORITY,
  VITE_AUTH_MICROSOFT_CLIENT_ID: appEnv().VITE_AUTH_MICROSOFT_CLIENT_ID,
  VITE_AUTH_MICROSOFT_API_SCOPE: appEnv().VITE_AUTH_MICROSOFT_API_SCOPE,
  VITE_AUTH_MICROSOFT_SCOPES: appEnv().VITE_AUTH_MICROSOFT_SCOPES,
  VITE_AUTH_MICROSOFT_LINK_BY_EMAIL: appEnv().VITE_AUTH_MICROSOFT_LINK_BY_EMAIL,
  VITE_AUTH_GOOGLE_AUTHORITY: appEnv().VITE_AUTH_GOOGLE_AUTHORITY,
  VITE_AUTH_GOOGLE_CLIENT_ID: appEnv().VITE_AUTH_GOOGLE_CLIENT_ID,
  VITE_AUTH_GOOGLE_API_SCOPE: appEnv().VITE_AUTH_GOOGLE_API_SCOPE,
  VITE_AUTH_GOOGLE_SCOPES: appEnv().VITE_AUTH_GOOGLE_SCOPES,
  VITE_AUTH_GOOGLE_LINK_BY_EMAIL: appEnv().VITE_AUTH_GOOGLE_LINK_BY_EMAIL,
  VITE_AUTH_OIDC_AUTHORITY: appEnv().VITE_AUTH_OIDC_AUTHORITY,
  VITE_AUTH_OIDC_CLIENT_ID: appEnv().VITE_AUTH_OIDC_CLIENT_ID,
  VITE_AUTH_OIDC_API_SCOPE: appEnv().VITE_AUTH_OIDC_API_SCOPE,
  VITE_AUTH_OIDC_SCOPES: appEnv().VITE_AUTH_OIDC_SCOPES,
  VITE_AUTH_OIDC_LINK_BY_EMAIL: appEnv().VITE_AUTH_OIDC_LINK_BY_EMAIL,
};

export const authConfig = resolveAuthConfig(AUTH_ENV, isProduction);
for (const problem of authConfig.problems) console.error(`[auth] ${problem}`);

const API_ENV_VAR = 'VITE_API_BASE_URL';
const configuredApi = appEnv().VITE_API_BASE_URL;
let apiBaseUrl: string | null = null;
if (configuredApi) {
  const r = resolveServiceEndpoint({ name: 'PathScribe API server', envVar: API_ENV_VAR, configured: configuredApi, devDefault: '', isProduction });
  if (r.ok === false) console.error(`[auth] ${r.message} Signed-in users are matched in the browser instead.`);
  else apiBaseUrl = r.url;
}
if (!apiBaseUrl && authConfig.providers.length > 0 && isProduction) {
  console.warn('[auth] No PathScribe API server is configured (VITE_API_BASE_URL), so SSO users are matched to staff in the browser against the demo directory. That is for demonstrations only.');
}

const verifyDemoCredentials = __DEMO_TOOLS__ && appEnv().VITE_AUTH_MODE !== 'sso'
  ? async (email: string, password: string) => (await import('./demo/demoAccounts')).verifyDemoCredentials(email, password)
  : null;

// Batch 448: passwords set from the Staff screen, checked first at sign-in.
const verifyStaffPassword = verifyDemoCredentials
  ? async (email: string, password: string) => (await import('../staffPasswords/mockStaffPasswordService')).mockStaffPasswordService.verify(email, password)
  : null;
const demoAccountFor = async (staffId: string) => (__DEMO_TOOLS__ ? (await import('./demo/demoAccounts')).DEMO_ACCOUNTS.find(a => a.id === staffId) : undefined);

// Batch 456: the sign-in lockout (signInLockout.ts) and the name the audit
// gives an email that belongs to an account.
const accountNameFor = async (email: string): Promise<string | null> => {
  const wanted = email.trim().toLowerCase();
  if (!wanted) return null;
  if (__DEMO_TOOLS__ && verifyDemoCredentials) {
    const account = (await import('./demo/demoAccounts')).DEMO_ACCOUNTS.find(a => a.email.toLowerCase() === wanted);
    if (account) return account.name;
  }
  const staff = await mockUserService.getAll();
  const person = staff.ok ? staff.data.find(s => (s.email ?? '').trim().toLowerCase() === wanted) : undefined;
  return person ? [person.firstName, person.lastName].filter(Boolean).join(' ') || person.id : null;
};

let ssoClient: ISsoClient | null = null;
const getSsoClient = () => (ssoClient ??= createSsoClient(authConfig.providers, { origin: window.location.origin }));

export const authSession = createAuthSession({
  config: authConfig,
  verifyDemoCredentials,
  verifyStaffPassword,
  demoAccountFor,
  signInLocks: browserSignInLockStore,
  accountNameFor,
  ssoClient: getSsoClient,
  apiBaseUrl,
  onSessionEnded: runSessionEndHooks,
  userService: mockUserService,
  roleService: mockRoleService,
  auditService: mockAuditService,
  draftCacheService: mockDraftCacheService,
  markers,
  profileStore: { read: readSessionProfile, write: writeSessionProfile },
  // Batch 616: whether to invite the person to enrol is asked of biometricFlow by AuthContext after sign-in (it may be the server's answer).
  shouldShowBiometricWizard: () => false,
  mfa: mfaService,
});

setAccessTokenSource(() => authSession.accessToken());

// ── Batch 344: confirming who signs (services/auth/signerConfirmation.ts) ──
// The lock survives a reload (localStorage, per user); the "already gave
// the username in this sign-in session" note is per tab (sessionStorage).
const SIGNING_LOCK_KEY = (userId: string) => `pathscribe_signing_lock_${userId}`;
const SIGNING_SESSION_KEY = 'pathscribe_signing_confirmed_session';

export const signerConfirmation = createSignerConfirmation({
  config: authConfig,
  readProfile: readSessionProfile,
  verifyDemoCredentials,
  ssoClient: getSsoClient,
  auditService: mockAuditService,
  lockStore: {
    read: userId => {
      try { return JSON.parse(localStorage.getItem(SIGNING_LOCK_KEY(userId)) ?? 'null') as SigningLockState | null; } catch { return null; }
    },
    write: (userId, state) => {
      try { localStorage.setItem(SIGNING_LOCK_KEY(userId), JSON.stringify(state)); } catch { /* storage unavailable */ }
    },
  },
  signingSession: {
    current: () => markers.getOwnSessionId(),
    lastConfirmed: () => { try { return sessionStorage.getItem(SIGNING_SESSION_KEY); } catch { return null; } },
    markConfirmed: id => { try { sessionStorage.setItem(SIGNING_SESSION_KEY, id); } catch { /* storage unavailable */ } },
  },
  biometric: { verify: userId => biometricFlow.verify(userId) },
  // Batch 611 (#157): a signature asks for a fresh second factor when the policy says so.
  mfa: {
    stepUpNeeded: profile => mfaService.stepUpNeeded(profile),
    challenge: (profile, code) => mfaService.challenge(profile, code, 'step-up'),
    stepUpWithClaims: (profile, claims) => mfaService.stepUpWithClaims(profile, claims),
  },
});

// ── Batch 345: checking each signature when the signed record is saved ────
// (services/auth/signatureEvidence.ts). The ids already used are the mock
// server's memory of which confirmations and ID tokens have backed a
// signature, so none can back two.
// Batch 525 (PS-485): server data, so dataStorage (memory on a server deployment).
const SIGNATURE_USED_KEY = 'pathscribe_signature_used';
const USED_KEEP = 500;

export const signatureGate = createSignatureGate({
  config: authConfig,
  readProfile: readSessionProfile,
  recordService: signatureRecordService,
  auditService: mockAuditService,
  usedStore: {
    read: () => {
      try {
        const v = JSON.parse(dataStorage.getItem(SIGNATURE_USED_KEY) ?? 'null');
        return { confirmationIds: v?.confirmationIds ?? [], tokenHashes: v?.tokenHashes ?? [] };
      } catch { return { confirmationIds: [], tokenHashes: [] }; }
    },
    add: (confirmationId, tokenHash) => {
      try {
        const v = JSON.parse(dataStorage.getItem(SIGNATURE_USED_KEY) ?? 'null') ?? {};
        const confirmationIds = [...(v.confirmationIds ?? []), confirmationId].slice(-USED_KEEP);
        const tokenHashes = [...(v.tokenHashes ?? []), ...(tokenHash ? [tokenHash] : [])].slice(-USED_KEEP);
        dataStorage.setItem(SIGNATURE_USED_KEY, JSON.stringify({ confirmationIds, tokenHashes }));
      } catch { /* storage unavailable */ }
    },
  },
});
