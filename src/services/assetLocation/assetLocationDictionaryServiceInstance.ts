// src/services/assetLocation/assetLocationDictionaryServiceInstance.ts
// Batch 617 (PS-514): the app's assetLocationDictionaryService, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpAssetLocationDictionaryService } from './httpAssetLocationDictionaryService';
import { mockAssetLocationDictionaryService } from './mockAssetLocationDictionaryService';
import type { IAssetLocationDictionaryService } from './IAssetLocationDictionaryService';

export const assetLocationDictionaryService: IAssetLocationDictionaryService = chooseService<IAssetLocationDictionaryService>('assetLocation', mockAssetLocationDictionaryService, createHttpAssetLocationDictionaryService);
