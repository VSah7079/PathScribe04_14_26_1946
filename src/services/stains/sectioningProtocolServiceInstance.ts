// src/services/stains/sectioningProtocolServiceInstance.ts
// Batch 617 (PS-514): the app's sectioningProtocol service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpSectioningProtocolService } from './httpSectioningProtocolService';
import { mockSectioningProtocolService } from './mockSectioningProtocolService';
import type { ISectioningProtocolService } from './IStainService';

export const sectioningProtocolService: ISectioningProtocolService = chooseService<ISectioningProtocolService>('stains', mockSectioningProtocolService, createHttpSectioningProtocolService);
