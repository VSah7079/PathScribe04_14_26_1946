// src/services/migration/migrationJobServiceInstance.ts
// Batch 617 (PS-514): the app's migrationJob service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpMigrationJobService } from './httpMigrationJobService';
import { mockMigrationJobService } from './mockMigrationJobService';
import type { IMigrationJobService } from './IMigrationJobService';

export const migrationJobService: IMigrationJobService = chooseService<IMigrationJobService>('migration', mockMigrationJobService, createHttpMigrationJobService);
