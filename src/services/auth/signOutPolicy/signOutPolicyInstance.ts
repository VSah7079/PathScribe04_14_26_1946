// src/services/auth/signOutPolicy/signOutPolicyInstance.ts
// ─────────────────────────────────────────────────────────────────
// Batch 642: the app's one sign-out policy service, wired to this build.
// The policy is data (dataStorage: memory with the API server configured);
// the sign-out session is per tab (tabDataStorage) and ends with the
// sign-in (sessionEndHooks).
// ─────────────────────────────────────────────────────────────────

import { auditService } from '../../auditlog/auditServiceInstance';
import { dataStorage, tabDataStorage } from '../../browserData/dataStorage';
import { onSessionEnd } from '../sessionEndHooks';
import { deviceFingerprintOf, type SignOutPolicyConfig, type SignOutSession } from './signOutPolicy';
import { createSignOutPolicyService, type SignOutPolicyStore } from './signOutPolicyService';

const CONFIG_KEY = 'pathscribe_signout_policy';
const SESSION_KEY = 'pathscribe_signout_session';

export const browserSignOutPolicyStore: SignOutPolicyStore = {
  readConfig: () => { try { return JSON.parse(dataStorage.getItem(CONFIG_KEY) ?? 'null') as Partial<SignOutPolicyConfig> | null; } catch { return null; } },
  writeConfig: config => { try { dataStorage.setItem(CONFIG_KEY, JSON.stringify(config)); } catch { /* storage unavailable */ } },
  readAny: () => { try { return JSON.parse(tabDataStorage.getItem(SESSION_KEY) ?? 'null') as SignOutSession | null; } catch { return null; } },
  readSession: userId => { try { const s = JSON.parse(tabDataStorage.getItem(SESSION_KEY) ?? 'null') as SignOutSession | null; return s && s.userId === userId ? s : null; } catch { return null; } },
  writeSession: (_userId, session) => {
    try { if (session) tabDataStorage.setItem(SESSION_KEY, JSON.stringify(session)); else tabDataStorage.removeItem(SESSION_KEY); } catch { /* storage unavailable */ }
  },
};

// One load of the authorization module, shared by every check.
let authorizationModule: Promise<typeof import('../../authorization/defaultAuthorizationService')> | null = null;
const authorization = () => (authorizationModule ??= import('../../authorization/defaultAuthorizationService'));

const browserDevice = (): string => {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const scr = typeof screen !== 'undefined' ? screen : undefined;
  return deviceFingerprintOf({ userAgent: nav?.userAgent, platform: nav?.platform, language: nav?.language, screen: scr ? `${scr.width}x${scr.height}x${scr.colorDepth}` : '' });
};

export const signOutPolicyService = createSignOutPolicyService({
  store: browserSignOutPolicyStore,
  audit: auditService,
  enforce: async capability => (await authorization()).authorizationService.enforce(capability).then(d => d.allowed),
  deviceFingerprint: browserDevice,
  // The browser cannot tell a trusted network from another; the API server classifies the client address (phase 2e).
  network: () => 'not classified (browser build)',
});

onSessionEnd(() => signOutPolicyService.expireAny('logout'));
