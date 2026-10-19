// src/services/biometric/biometricDeploymentSwitch.test.ts
// Batch 617 (PS-512): a deployment can turn biometric sign-in off whatever the lab policy says.
import { describe, it, expect, vi } from 'vitest';
import { isBiometricOffValue, withDeploymentSwitch } from './biometricDeploymentSwitch';
import type { IBiometricFlow } from './IBiometricFlow';
import type { BiometricPolicy } from './mockBiometricService';

const POLICY_ON: BiometricPolicy = { enabled: true, cadence: 'per_session', cadenceDays: 30 };
function inner(): IBiometricFlow {
  return {
    getPolicy: vi.fn(async () => POLICY_ON),
    savePolicy: vi.fn(async () => true),
    getCredential: vi.fn(async () => null),
    isAvailable: vi.fn(async () => true),
    deviceName: () => 'Device',
    enroll: vi.fn(async () => ({ ok: true })),
    verify: vi.fn(async () => ({ ok: true })),
    remove: vi.fn(async () => ({ ok: true })),
    isCurrent: vi.fn(async () => false),
    shouldShowWizard: vi.fn(async () => true),
    dismissWizard: vi.fn(async () => undefined),
  };
}

describe('the deployment switch value', () => {
  it('false, off, 0 and no (any case, trimmed) turn it off; anything else, or nothing, leaves the lab policy in charge', () => {
    for (const v of ['false', 'FALSE', ' off ', '0', 'No']) expect(isBiometricOffValue(v)).toBe(true);
    for (const v of ['true', 'on', '1', '', undefined, null, 0, false]) expect(isBiometricOffValue(v)).toBe(false);
  });
});

describe('biometric flow with the switch off', () => {
  it('shows the policy as off, refuses to turn it on, offers no wizard or device prompt', async () => {
    const base = inner(); const f = withDeploymentSwitch(base, () => true);
    expect((await f.getPolicy()).enabled).toBe(false);
    expect(await f.savePolicy(POLICY_ON)).toBe(false);
    expect(base.savePolicy).not.toHaveBeenCalled();
    expect(await f.savePolicy({ ...POLICY_ON, enabled: false })).toBe(true);
    expect(await f.isAvailable()).toBe(false);
    expect(await f.shouldShowWizard('u1')).toBe(false);
    expect(await f.enroll('u1')).toEqual({ ok: false, error: 'UNAVAILABLE' });
    expect(await f.verify('u1')).toEqual({ ok: false, error: 'UNAVAILABLE' });
    expect(base.enroll).not.toHaveBeenCalled();
    expect(base.verify).not.toHaveBeenCalled();
  });

  it('with the switch unset the lab policy decides, as before', async () => {
    const base = inner(); const f = withDeploymentSwitch(base, () => false);
    expect((await f.getPolicy()).enabled).toBe(true);
    expect(await f.savePolicy(POLICY_ON)).toBe(true);
    expect(await f.isAvailable()).toBe(true);
    expect(await f.shouldShowWizard('u1')).toBe(true);
    expect((await f.verify('u1')).ok).toBe(true);
  });
});
