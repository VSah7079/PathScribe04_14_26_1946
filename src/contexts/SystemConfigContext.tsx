/**
 * SystemConfigContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * React context, provider, and hook for PathScribe system-level configuration.
 *
 * Three layers of config, loaded independently:
 *
 *   1. SystemConfig        — local system settings (LIS toggles, voice, etc.)
 *                            Loaded from the system config store, edited in Config UI.
 *
 *   2. EnterpriseConfig    — top-level org settings (feature flags for the
 *                            whole network). Will be Firestore-backed in prod.
 *
 *   3. HospitalConfig      — per-hospital overrides. Hospital-level features
 *                            take precedence over enterprise-level defaults.
 *                            Will be Firestore-backed in prod.
 *
 * Feature resolution:
 *   Use isFeatureEnabled('reportingPlusEnabled') rather than reading
 *   enterprise/hospital config directly. The helper applies the override
 *   hierarchy: hospital → enterprise → false.
 *
 * Usage:
 *   const { config, updateConfig, enterpriseConfig, hospitalConfig,
 *           isFeatureEnabled } = useSystemConfig();
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';

import { SystemConfig, DEFAULT_SYSTEM_CONFIG } from '../types/systemConfig';
import type { EnterpriseConfig, EnterpriseFeatures } from '@app-types/config/EnterpriseConfig';
import type { HospitalConfig } from '@app-types/config/HospitalConfig';
import { permitSystemConfigPatch, permitEnterpriseConfigPatch } from '../services/systemConfig/systemConfigChangeChecks';
import { readStoredConfig, saveStoredConfig } from '../services/systemConfig/systemConfigStore';
import { appEnv } from '@/services/runtimeConfig/runtimeEnv';

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_ENTERPRISE_FEATURES: EnterpriseFeatures = {
  reportingPlusEnabled: false,
  abnormalDetectionEnabled: true,
};

const DEFAULT_ENTERPRISE_CONFIG: EnterpriseConfig = {
  id:       'ENT-DEFAULT',
  name:     'PathScribe Enterprise',
  features: DEFAULT_ENTERPRISE_FEATURES,
};

const DEFAULT_HOSPITAL_CONFIG: HospitalConfig = {
  id:           'HOSP-001',
  name:         'Default Hospital',
  enterpriseId: 'ENT-DEFAULT',
  features:     { reportingPlusEnabled: true },
};

// ─── Persistence helpers ──────────────────────────────────────────────────────

// Batch 431: kept through services/systemConfig/systemConfigStore.ts (the
// one place that changes when the API server holds these, PS-345).

function loadSystemConfig(): SystemConfig {
  const merged = readStoredConfig('system', DEFAULT_SYSTEM_CONFIG);
  const envVoice = appEnv().VITE_VOICE_ENABLED;
  if (envVoice === 'false') merged.voiceEnabled = false;
  return merged;
}

// ─── Context shape ────────────────────────────────────────────────────────────

interface SystemConfigContextValue {
  // ── System config ───────────────────────────────────────────────────────
  config:        SystemConfig;
  /** Batch 428: resolves false (and changes nothing) when the person lacks the field's capability. */
  updateConfig:  (patch: Partial<SystemConfig>) => Promise<boolean>;
  resetConfig:   () => void;

  // ── Enterprise + Hospital config ────────────────────────────────────────
  enterpriseConfig:        EnterpriseConfig;
  hospitalConfig:          HospitalConfig;
  updateEnterpriseConfig:  (patch: Partial<EnterpriseConfig>) => Promise<boolean>;
  updateHospitalConfig:    (patch: Partial<HospitalConfig>)    => void;

  /**
   * Resolves a feature flag through the override hierarchy:
   *   hospital.features → enterprise.features → false
   *
   * Example:
   *   const reportingPlus = isFeatureEnabled('reportingPlusEnabled');
   */
  isFeatureEnabled: (feature: keyof EnterpriseFeatures) => boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SystemConfigContext = createContext<SystemConfigContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const SystemConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const [config,           setConfig]           = useState<SystemConfig>(loadSystemConfig);
  const [enterpriseConfig, setEnterpriseConfig] = useState<EnterpriseConfig>(() => readStoredConfig('enterprise', DEFAULT_ENTERPRISE_CONFIG));
  const [hospitalConfig,   setHospitalConfig]   = useState<HospitalConfig>(()   => readStoredConfig('hospital', DEFAULT_HOSPITAL_CONFIG));

  // Persist all three configs whenever they change
  useEffect(() => { saveStoredConfig('system',     config);           }, [config]);
  useEffect(() => { saveStoredConfig('enterprise', enterpriseConfig); }, [enterpriseConfig]);
  useEffect(() => { saveStoredConfig('hospital',   hospitalConfig);   }, [hospitalConfig]);

  const updateConfig = useCallback(async (patch: Partial<SystemConfig>) => {
    if (!(await permitSystemConfigPatch(patch as Record<string, unknown>))) return false;
    setConfig(prev => ({ ...prev, ...patch }));
    return true;
  }, []);

  const resetConfig = useCallback(() => {
    setConfig({ ...DEFAULT_SYSTEM_CONFIG });
  }, []);

  const updateEnterpriseConfig = useCallback(async (patch: Partial<EnterpriseConfig>) => {
    if (!(await permitEnterpriseConfigPatch(patch as unknown as { features?: Record<string, unknown> }))) return false;
    setEnterpriseConfig(prev => ({ ...prev, ...patch }));
    return true;
  }, []);

  const updateHospitalConfig = useCallback((patch: Partial<HospitalConfig>) => {
    setHospitalConfig(prev => ({ ...prev, ...patch }));
  }, []);

  // Hospital overrides enterprise — if hospital explicitly sets a feature,
  // that value wins regardless of the enterprise default.
  const isFeatureEnabled = useCallback((feature: keyof EnterpriseFeatures): boolean => {
    // Batch 511: a hospital may override any enterprise feature, including ones its type doesn't list yet.
    const hospitalVal  = (hospitalConfig.features as Partial<Record<keyof EnterpriseFeatures, boolean>>)[feature];
    const enterpriseVal = enterpriseConfig.features[feature];
    // Hospital value takes precedence; fall back to enterprise; default false
    return hospitalVal ?? enterpriseVal ?? false;
  }, [hospitalConfig, enterpriseConfig]);

  return (
    <SystemConfigContext.Provider value={{
      config, updateConfig, resetConfig,
      enterpriseConfig, hospitalConfig,
      updateEnterpriseConfig, updateHospitalConfig,
      isFeatureEnabled,
    }}>
      {children}
    </SystemConfigContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useSystemConfig = (): SystemConfigContextValue => {
  const ctx = useContext(SystemConfigContext);
  if (!ctx) throw new Error(
    'useSystemConfig must be used within a <SystemConfigProvider>. ' +
    'Add <SystemConfigProvider> to your app root in main.tsx or App.tsx.'
  );
  return ctx;
};
