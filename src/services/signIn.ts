// src/services/signIn.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 527 (PS-486): what the sign-in path needs (the sign-in page, the
// SSO return page, AuthContext), without the whole services barrel. The
// barrel (services/index.ts) loads after sign-in, so the first screen
// doesn't wait for every service. The barrel re-exports the staff password
// service from here, so the choice of implementation stays in one place.
// ─────────────────────────────────────────────────────────────────────────────
export { authSession, authConfig } from './auth/authSessionInstance';
export { mockStaffPasswordService as staffPasswordService } from './staffPasswords/mockStaffPasswordService';
export { passwordConfirmProblem, PASSWORD_MIN_LENGTH } from './staffPasswords/staffPasswordRules';
export { signInRefusalNotice } from './auth/signInLockout';
export { mfaService } from './auth/mfa/mfaInstance';
