// src/services/cytology/molecularQcRunRecordServiceInstance.ts
// Batch 616 (PS-499): the app's molecularQcRunRecord service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpMolecularQcRunRecordService } from './httpMolecularQcRunRecordService';
import { mockMolecularQcRunRecordService } from './mockMolecularQcRunRecordService';
import type { IMolecularQcRunRecordService } from './IMolecularQcRunRecordService';

export const molecularQcRunRecordService: IMolecularQcRunRecordService = chooseService<IMolecularQcRunRecordService>('cytology', mockMolecularQcRunRecordService, createHttpMolecularQcRunRecordService);
