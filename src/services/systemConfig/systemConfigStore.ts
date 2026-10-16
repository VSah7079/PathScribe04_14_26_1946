// src/services/systemConfig/systemConfigStore.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 431: where the lab-wide system, enterprise and hospital settings are
// kept (SystemConfigContext reads and saves them through here).
//
// Mock phase: browser storage under the same keys as before, so nothing set
// so far is lost. Production (PS-345): GET/PUT of the system, enterprise and
// hospital configuration on the API server, so every workstation in a lab
// sees the same settings. This file is the only place that changes then.
// Who may change which field is checked before saving
// (systemConfigChangeChecks.ts); the server makes the same checks.
// ─────────────────────────────────────────────────────────────────────────────

// v2: UK accession + NHS Number formats became enabled by default, so a v1
// config saved earlier doesn't keep the old US-only identifier formats.
import { dataStorage } from '../browserData/dataStorage';
const VERSION = 'v2';

export const SYSTEM_CONFIG_STORE_KEYS = {
  system:     `pathscribe_system_config_${VERSION}`,
  enterprise: `pathscribe_enterprise_config_${VERSION}`,
  hospital:   `pathscribe_hospital_config_${VERSION}`,
} as const;

export type SystemConfigScope = keyof typeof SYSTEM_CONFIG_STORE_KEYS;

/** The saved settings for a scope, laid over the defaults. */
export function readStoredConfig<T extends object>(scope: SystemConfigScope, defaults: T): T {
  try {
    const raw = dataStorage.getItem(SYSTEM_CONFIG_STORE_KEYS[scope]);
    return raw ? { ...defaults, ...JSON.parse(raw) as Partial<T> } : { ...defaults };
  } catch { return { ...defaults }; }
}

/** Saves the settings for a scope. */
export function saveStoredConfig<T>(scope: SystemConfigScope, value: T): void {
  try { dataStorage.setItem(SYSTEM_CONFIG_STORE_KEYS[scope], JSON.stringify(value)); } catch { /* storage unavailable */ }
}
