// src/services/auth/mfa/mfaInstance.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 611 (#157): the app's one MFA service, wired to this build.
//
// The Simulated authenticator exists only in the demo build (__DEMO_TOOLS__)
// when passwords are accepted: the secret is derived inside the demo account
// data (demo/demoAccounts.ts), loaded by dynamic import, so a server build has
// no secret and no simulated factor (its sign-in is the identity provider's
// second factor, checked from the ID token's amr / acr claims).
// ─────────────────────────────────────────────────────────────────────────────

import { appEnv } from '@/services/runtimeConfig/runtimeEnv';
import { auditService } from '../../auditlog/auditServiceInstance';
import { usesApiServer } from '../../apiServer/serviceSelection';
import { mfaPolicyService } from './mfaPolicyServiceInstance';
import { createMfaService } from './mfaService';
import { browserMfaStores } from './mfaStores';

const secretFor = __DEMO_TOOLS__ && appEnv().VITE_AUTH_MODE !== 'sso'
  ? async (userId: string) => (await import('../demo/demoAccounts')).demoMfaSecretFor(userId)
  : null;

// One load of the authorization module, shared by every check (the screen can ask for two at once).
let authorizationModule: Promise<typeof import('../../authorization/defaultAuthorizationService')> | null = null;
const authorization = () => (authorizationModule ??= import('../../authorization/defaultAuthorizationService'));

export const mfaService = createMfaService({
  stores: browserMfaStores,
  secretFor,
  policySource: usesApiServer('auth') ? mfaPolicyService : undefined,
  audit: auditService,
  enforce: async capability => (await authorization()).authorizationService.enforce(capability).then(d => d.allowed),
});
