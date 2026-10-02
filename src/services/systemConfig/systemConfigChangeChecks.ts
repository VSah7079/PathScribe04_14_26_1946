// src/services/systemConfig/systemConfigChangeChecks.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 428: the settings kept in SystemConfigContext (browser storage in the
// mock phase) are changed from four Configuration sections. Each field needs
// that section's capability, checked here before the context applies the
// change:
//   voiceEnabled                                   config:voice:manage
//   approvedFonts                                  config:report-appearance:manage
//   showPeerAveragesToPathologists, facilityTimezone config:contribution-settings:manage
//   enterprise features.abnormalDetectionEnabled   config:abnormal-triggers:manage
// A field no Configuration screen changes needs nothing.
// ─────────────────────────────────────────────────────────────────────────────

import { permitConfigChange } from '../authorization/guardConfigWrites';

export interface ConfigCheckDeps {
  enforce: (capability: string) => Promise<{ allowed: boolean }>;
}

const defaultDeps = async (): Promise<ConfigCheckDeps> => {
  const { authorizationService } = await import('../authorization/defaultAuthorizationService');
  return { enforce: c => authorizationService.enforce(c) };
};

/** Every check a system-settings change needs, in order (each is audited). */
async function checkAll(checks: ((d: ConfigCheckDeps) => Promise<{ allowed: boolean }>)[], capabilities: string[], deps?: ConfigCheckDeps): Promise<boolean> {
  const d = deps ?? await defaultDeps();
  for (let i = 0; i < checks.length; i++) {
    if (!(await permitConfigChange(checks[i](d), capabilities[i]))) return false;
  }
  return true;
}

/** Whether the signed-in person may apply this change to the system settings. */
export async function permitSystemConfigPatch(patch: Record<string, unknown>, deps?: ConfigCheckDeps): Promise<boolean> {
  const checks: ((d: ConfigCheckDeps) => Promise<{ allowed: boolean }>)[] = [];
  const caps: string[] = [];
  if ('voiceEnabled' in patch) { checks.push(d => d.enforce('config:voice:manage')); caps.push('config:voice:manage'); }
  if ('approvedFonts' in patch) { checks.push(d => d.enforce('config:report-appearance:manage')); caps.push('config:report-appearance:manage'); }
  if ('showPeerAveragesToPathologists' in patch || 'facilityTimezone' in patch) {
    checks.push(d => d.enforce('config:contribution-settings:manage')); caps.push('config:contribution-settings:manage');
  }
  return checkAll(checks, caps, deps);
}

/** Whether the signed-in person may apply this change to the enterprise settings. */
export async function permitEnterpriseConfigPatch(patch: { features?: Record<string, unknown> }, deps?: ConfigCheckDeps): Promise<boolean> {
  const checks: ((d: ConfigCheckDeps) => Promise<{ allowed: boolean }>)[] = [];
  const caps: string[] = [];
  if (patch.features && 'abnormalDetectionEnabled' in patch.features) {
    checks.push(d => d.enforce('config:abnormal-triggers:manage')); caps.push('config:abnormal-triggers:manage');
  }
  return checkAll(checks, caps, deps);
}
