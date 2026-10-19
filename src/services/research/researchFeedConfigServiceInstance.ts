// src/services/research/researchFeedConfigServiceInstance.ts
// Batch 617 (PS-514): the app's researchFeedConfig service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpResearchFeedConfigService } from './httpResearchFeedConfigService';
import { mockResearchFeedConfigService } from './mockResearchFeedConfigService';
import type { IResearchFeedConfigService } from './IResearchFeedConfigService';

export const researchFeedConfigService: IResearchFeedConfigService = chooseService<IResearchFeedConfigService>('research', mockResearchFeedConfigService, createHttpResearchFeedConfigService);
