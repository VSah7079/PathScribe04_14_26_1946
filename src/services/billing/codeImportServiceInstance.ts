// src/services/billing/codeImportServiceInstance.ts
// Batch 617 (PS-514): the app's codeImportService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCodeImportService } from './httpCodeImportService';
import { mockCodeImportService } from './mockCodeImportService';
import type { ICodeImportService } from './ICodeImportService';

export const codeImportService: ICodeImportService = chooseService<ICodeImportService>('billing', mockCodeImportService, createHttpCodeImportService);
