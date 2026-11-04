// src/services/cytology/cytologySignOutRecordServiceInstance.ts
// Batch 616 (PS-499): the app's cytologySignOutRecord service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCytologySignOutRecordService } from './httpCytologySignOutRecordService';
import { mockCytologySignOutRecordService } from './mockCytologySignOutRecordService';
import type { ICytologySignOutRecordService } from './ICytologySignOutRecordService';

export const cytologySignOutRecordService: ICytologySignOutRecordService = chooseService<ICytologySignOutRecordService>('cytology', mockCytologySignOutRecordService, createHttpCytologySignOutRecordService);
