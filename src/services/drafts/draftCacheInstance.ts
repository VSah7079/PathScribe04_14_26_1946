// src/services/drafts/draftCacheInstance.ts
// Batch 616 (PS-505): the app's draft store (exported from `@/services`). Mock in the demo; the API server's with an address.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpDraftCacheService } from './httpDraftCacheService';
import { mockDraftCacheService } from './mockDraftCacheService';
import type { IDraftCacheService } from './IDraftCacheService';

export const draftCacheService: IDraftCacheService = chooseService<IDraftCacheService>('drafts', mockDraftCacheService, createHttpDraftCacheService);
