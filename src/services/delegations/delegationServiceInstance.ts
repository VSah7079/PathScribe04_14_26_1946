// src/services/delegations/delegationServiceInstance.ts
// Batch 617 (PS-514): the app's delegation service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpDelegationService } from './httpDelegationService';
import { mockDelegationService } from './mockDelegationService';
import type { IDelegationService } from './IDelegationService';

export const delegationService: IDelegationService = chooseService<IDelegationService>('delegations', mockDelegationService, createHttpDelegationService);
