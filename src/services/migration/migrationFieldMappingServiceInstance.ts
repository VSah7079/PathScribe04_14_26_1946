// src/services/migration/migrationFieldMappingServiceInstance.ts
// Batch 617 (PS-514): the app's migrationFieldMapping service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpMigrationFieldMappingService } from './httpMigrationFieldMappingService';
import { mockMigrationFieldMappingService } from './mockMigrationFieldMappingService';
import type { IMigrationFieldMappingService } from './IMigrationFieldMappingService';

export const migrationFieldMappingService: IMigrationFieldMappingService = chooseService<IMigrationFieldMappingService>('migration', mockMigrationFieldMappingService, createHttpMigrationFieldMappingService);
