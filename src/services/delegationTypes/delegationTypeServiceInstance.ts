// src/services/delegationTypes/delegationTypeServiceInstance.ts
// Batch 617 (PS-514): the app's delegationTypeService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpDelegationTypeService } from './httpDelegationTypeService';
import { mockDelegationTypeService } from './mockDelegationTypeService';
import type { IDelegationTypeService } from './IDelegationTypeService';

export const delegationTypeService: IDelegationTypeService = chooseService<IDelegationTypeService>('delegationTypes', mockDelegationTypeService, createHttpDelegationTypeService);
