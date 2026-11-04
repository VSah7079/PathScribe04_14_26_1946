// src/services/migration/migrationRecordResultServiceInstance.ts
// Batch 617 (PS-514): the app's migrationRecordResult service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpMigrationRecordResultService } from './httpMigrationRecordResultService';
import { mockMigrationRecordResultService } from './mockMigrationRecordResultService';
import type { IMigrationRecordResultService } from './IMigrationRecordResultService';

export const migrationRecordResultService: IMigrationRecordResultService = chooseService<IMigrationRecordResultService>('migration', mockMigrationRecordResultService, createHttpMigrationRecordResultService);
