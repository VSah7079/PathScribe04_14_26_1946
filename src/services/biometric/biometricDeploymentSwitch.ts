// src/services/biometric/biometricDeploymentSwitch.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-512): a deployment can turn biometric sign-in off for everyone,
// whatever the lab's own policy says, with VITE_BIOMETRIC_SIGN_IN set to
// "false" (or "off", "0", "no") in its build or config.json. Use it while the
// device checks have not been tried on the target authenticators. Left unset
// the lab's policy decides, as before (Batch 433): off until a lab turns it on,
// then on. Password sign-off always works.
// ─────────────────────────────────────────────────────────────────────────────
import { appEnv } from '@/services/runtimeConfig/runtimeEnv';
import type { IBiometricFlow } from './IBiometricFlow';
import type { BiometricPolicy } from './mockBiometricService';

const OFF = new Set(['false', 'off', '0', 'no']);

/** True when this deployment turned biometric sign-in off (pure for a given value). */
export function isBiometricOffValue(value: unknown): boolean {
  return typeof value === 'string' && OFF.has(value.trim().toLowerCase());
}

export function biometricOffForDeployment(): boolean {
  return isBiometricOffValue(appEnv().VITE_BIOMETRIC_SIGN_IN);
}

/** The flow as the app sees it when the deployment switch is off: no policy turns it on, no wizard, no device prompt. */
export function withDeploymentSwitch(flow: IBiometricFlow, isOff: () => boolean = biometricOffForDeployment): IBiometricFlow {
  return {
    ...flow,
    getPolicy: async (): Promise<BiometricPolicy> => {
      const p = await flow.getPolicy();
      return isOff() ? { ...p, enabled: false } : p;
    },
    savePolicy: async (policy: BiometricPolicy): Promise<boolean> => (isOff() && policy.enabled ? false : flow.savePolicy(policy)),
    isAvailable: async (): Promise<boolean> => (isOff() ? false : flow.isAvailable()),
    shouldShowWizard: async (userId: string): Promise<boolean> => (isOff() ? false : flow.shouldShowWizard(userId)),
    enroll: async (userId, options) => (isOff() ? { ok: false, error: 'UNAVAILABLE' } : flow.enroll(userId, options)),
    verify: async (userId, options) => (isOff() ? { ok: false, error: 'UNAVAILABLE' } : flow.verify(userId, options)),
  };
}
