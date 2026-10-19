// src/services/billing/placeOfServiceCodeServiceInstance.ts
// Batch 616 (PS-498): the app's placeOfServiceCode service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpPlaceOfServiceCodeService } from './httpPlaceOfServiceCodeService';
import { mockPlaceOfServiceCodeService } from './mockPlaceOfServiceCodeService';
import type { IPlaceOfServiceCodeService } from './IPlaceOfServiceCodeService';

export const placeOfServiceCodeService: IPlaceOfServiceCodeService = chooseService<IPlaceOfServiceCodeService>('billing', mockPlaceOfServiceCodeService, createHttpPlaceOfServiceCodeService);
