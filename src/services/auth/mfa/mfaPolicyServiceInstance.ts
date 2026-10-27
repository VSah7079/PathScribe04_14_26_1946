// src/services/auth/mfa/mfaPolicyServiceInstance.ts
// Batch 675 (access-14): the app's mfaPolicyService. The mock in the demo; the API server's with an address.
import { chooseService } from '../../apiServer/serviceSelection';
import { createHttpMfaPolicyService } from './httpMfaPolicyService';
import type { IMfaPolicyService } from './IMfaPolicyService';
import { mockMfaPolicyService } from './mockMfaPolicyService';

export const mfaPolicyService: IMfaPolicyService = chooseService<IMfaPolicyService>('auth', mockMfaPolicyService, createHttpMfaPolicyService);
