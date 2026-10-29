// src/services/staffPasswords/passwordSignInAvailable.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 711: whether this build signs people in with a PathScribe password at
// all. Only the demo build does (__DEMO_TOOLS__ is fixed by the build, see
// authSessionInstance.ts); a server deployment signs in through the customer's
// identity provider, has no password store, and so has no "ask my administrator
// to reset my password" action either. Shared by the staff password service and
// the reset request service so the two cannot disagree.
// ─────────────────────────────────────────────────────────────────────────────
import { appEnv } from '@/services/runtimeConfig/runtimeEnv';

export const passwordSignInAvailable = (): boolean => __DEMO_TOOLS__ && appEnv().VITE_AUTH_MODE !== 'sso';
