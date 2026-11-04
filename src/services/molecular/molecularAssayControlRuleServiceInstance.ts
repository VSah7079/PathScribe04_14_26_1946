// src/services/molecular/molecularAssayControlRuleServiceInstance.ts
// Batch 616 (PS-500): the app's molecularAssayControlRule service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpMolecularAssayControlRuleService } from './httpMolecularAssayControlRuleService';
import { mockMolecularAssayControlRuleService } from './mockMolecularAssayControlRuleService';
import type { IMolecularAssayControlRuleService } from './IMolecularAssayControlRuleService';

export const molecularAssayControlRuleService: IMolecularAssayControlRuleService = chooseService<IMolecularAssayControlRuleService>('molecular', mockMolecularAssayControlRuleService, createHttpMolecularAssayControlRuleService);
