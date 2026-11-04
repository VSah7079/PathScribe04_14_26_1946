// src/services/imageAssociation/grossImagingVendorServiceInstance.ts
// Batch 616: the app's gross imaging vendors, exported from `@/services` as `grossImagingVendorService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpGrossImagingVendorService } from './httpGrossImagingVendorService';
import { mockGrossImagingVendorService } from './mockGrossImagingVendorService';
import type { IGrossImagingVendorService } from './IGrossImagingVendorService';

export const grossImagingVendorService: IGrossImagingVendorService = chooseService<IGrossImagingVendorService>('images', mockGrossImagingVendorService, createHttpGrossImagingVendorService);
