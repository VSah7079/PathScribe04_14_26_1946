// src/services/consultAccess/consultTokenServiceInstance.ts
// Batch 617 (PS-514): the app's consultTokenService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpConsultTokenService } from './httpConsultTokenService';
import { mockConsultTokenService } from './mockConsultTokenService';
import type { IConsultTokenService } from './IConsultTokenService';

export const consultTokenService: IConsultTokenService = chooseService<IConsultTokenService>('consultAccess', mockConsultTokenService, createHttpConsultTokenService);
