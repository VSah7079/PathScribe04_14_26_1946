// src/services/codes/codeServiceInstance.ts
// Batch 617 (PS-514): the app's codeService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCodeService } from './httpCodeService';
import { mockCodeService } from './mockCodeService';
import type { ICodeService } from './ICodeService';

export const codeService: ICodeService = chooseService<ICodeService>('codes', mockCodeService, createHttpCodeService);
