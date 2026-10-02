// src/services/screeningRegistry/mockScreeningRegistryConfigService.ts
// Batch 414: stored per registry. The permission to change it is checked in
// saveScreeningRegistrySettings.ts, the one path the settings screen uses.
import type { IScreeningRegistryConfigService, ScreeningRegistryConfig } from './IScreeningRegistryConfigService';
import { screeningRegistryDefinition, type ScreeningRegistryId } from './screeningRegistryDefinitions';
import { storageGet, storageSet } from '../mockStorage';

const STORAGE_KEY = 'screeningRegistryConfigs';
const load = () => storageGet<Record<string, ScreeningRegistryConfig>>(STORAGE_KEY, {});

export function defaultScreeningRegistryConfig(registryId: ScreeningRegistryId): ScreeningRegistryConfig {
  return { registryId, requireMappedCodes: screeningRegistryDefinition(registryId)?.resultCoding === 'mappingTable', codeMappings: [] };
}

export const mockScreeningRegistryConfigService: IScreeningRegistryConfigService = {
  async get(registryId) {
    return { ok: true, data: load()[registryId] ?? defaultScreeningRegistryConfig(registryId) };
  },
  async save(config) {
    storageSet(STORAGE_KEY, { ...load(), [config.registryId]: config });
    return { ok: true, data: config };
  },
};
