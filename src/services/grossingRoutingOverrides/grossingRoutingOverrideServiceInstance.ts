// src/services/grossingRoutingOverrides/grossingRoutingOverrideServiceInstance.ts
// Batch 616: the app's grossing routing overrides, exported from `@/services` as `grossingRoutingOverrideService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpGrossingRoutingOverrideService } from './httpGrossingRoutingOverrideService';
import { mockGrossingRoutingOverrideService } from './mockGrossingRoutingOverrideService';
import type { IGrossingRoutingOverrideService } from './IGrossingRoutingOverrideService';

export const grossingRoutingOverrideService: IGrossingRoutingOverrideService = chooseService<IGrossingRoutingOverrideService>('grossing', mockGrossingRoutingOverrideService, createHttpGrossingRoutingOverrideService);
