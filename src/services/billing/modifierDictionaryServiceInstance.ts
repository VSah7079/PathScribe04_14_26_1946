// src/services/billing/modifierDictionaryServiceInstance.ts
// Batch 616 (PS-498): the app's modifierDictionary service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpModifierDictionaryService } from './httpModifierDictionaryService';
import { mockModifierDictionaryService } from './mockModifierDictionaryService';
import type { IModifierDictionaryService } from './IModifierDictionaryService';

export const modifierDictionaryService: IModifierDictionaryService = chooseService<IModifierDictionaryService>('billing', mockModifierDictionaryService, createHttpModifierDictionaryService);
