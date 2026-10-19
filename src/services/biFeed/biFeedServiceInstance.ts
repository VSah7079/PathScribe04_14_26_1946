// src/services/biFeed/biFeedServiceInstance.ts
// Batch 617 (PS-514): the app's biFeedService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpBiFeedService } from './httpBiFeedService';
import { mockBiFeedService } from './biFeedServices';
import type { BiFeedService } from './biFeedService';

export const biFeedService: BiFeedService = chooseService<BiFeedService>('biFeed', mockBiFeedService, createHttpBiFeedService);
