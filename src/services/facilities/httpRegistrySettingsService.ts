// src/services/facilities/httpRegistrySettingsService.ts
// Batch 616 (PS-484): the API server's versions of IRegistrySettingsService and
// IFacilityRegistryOverrideService (contract: STAFF_ADMIN_API.md §5). Choosing a
// facility's screening registry needs config:screening-registry:manage; the
// server checks it and audits the change.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import { notFoundAsNull } from '../apiServer/notFoundAsNull';
import type { FacilityRegistryOverride, IFacilityRegistryOverrideService } from './IFacilityRegistryOverrideService';
import type { IRegistrySettingsService, RegistrySettingsConfig } from './IRegistrySettingsService';
const BASE_REGISTRY_SETTINGS = '/api/facilities/registry-settings';
const routeRegistrySettings = (method: string): string => methodPath(BASE_REGISTRY_SETTINGS, method);

export const createHttpRegistrySettingsService = (client: ApiHttpClient): IRegistrySettingsService =>
  buildHttpService<IRegistrySettingsService>(client, {
    get: result('GET', () => routeRegistrySettings('get')),
    update: result('POST', () => routeRegistrySettings('update'), { body: (p: Partial<RegistrySettingsConfig>) => p }),
    reset: result('POST', () => routeRegistrySettings('reset')),
  });

type ArgsFacilityRegistryOverride<K extends keyof IFacilityRegistryOverrideService> = Parameters<IFacilityRegistryOverrideService[K]>;
const BASE_FACILITY_REGISTRY_OVERRIDE = '/api/facilities/facility-registry-override';
const routeFacilityRegistryOverride = (method: string): string => methodPath(BASE_FACILITY_REGISTRY_OVERRIDE, method);

export const createHttpFacilityRegistryOverrideService = (client: ApiHttpClient): IFacilityRegistryOverrideService => {
  const routes = buildHttpService<IFacilityRegistryOverrideService>(client, {
    getForFacility: result('GET', (facilityId: ArgsFacilityRegistryOverride<'getForFacility'>[0]) => `${routeFacilityRegistryOverride('getForFacility')}${queryString({ facilityId })}`),
    create: result('POST', () => routeFacilityRegistryOverride('create'), { body: (facilityId: string, o: RegistrySettingsConfig) => ({ facilityId, overrides: o }) }),
    update: result('POST', () => routeFacilityRegistryOverride('update'), { body: (facilityId: string, c: Partial<RegistrySettingsConfig>) => ({ facilityId, changes: c }) }),
    remove: result('POST', () => routeFacilityRegistryOverride('remove'), { body: (facilityId: ArgsFacilityRegistryOverride<'remove'>[0]) => ({ facilityId }) }),
  });
  // No override is a successful "none", as in the mock.
  return { ...routes, getForFacility: (facilityId: string) => notFoundAsNull<FacilityRegistryOverride>(routes.getForFacility(facilityId)) };
};
