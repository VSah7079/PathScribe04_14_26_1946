// src/services/supportReferences/supportReferenceServiceInstance.ts
// Batch 617 (PS-514): the app's supportReference service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpSupportReferenceService } from './httpSupportReferenceService';
import { mockSupportReferenceService } from './mockSupportReferenceService';
import type { ISupportReferenceService } from './ISupportReferenceService';

export const supportReferenceService: ISupportReferenceService = chooseService<ISupportReferenceService>('supportReferences', mockSupportReferenceService, createHttpSupportReferenceService);
