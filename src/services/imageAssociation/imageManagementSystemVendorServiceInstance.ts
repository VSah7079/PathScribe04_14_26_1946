// src/services/imageAssociation/imageManagementSystemVendorServiceInstance.ts
// Batch 616: the app's image management system vendors, exported from `@/services` as `imageManagementSystemVendorService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpImageManagementSystemVendorService } from './httpImageManagementSystemVendorService';
import { mockImageManagementSystemVendorService } from './mockImageManagementSystemVendorService';
import type { IImageManagementSystemVendorService } from './IImageManagementSystemVendorService';

export const imageManagementSystemVendorService: IImageManagementSystemVendorService = chooseService<IImageManagementSystemVendorService>('images', mockImageManagementSystemVendorService, createHttpImageManagementSystemVendorService);
