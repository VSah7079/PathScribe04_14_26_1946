// src/services/digitalPathology/wsiViewerVendorServiceInstance.ts
// Batch 616: the app's whole-slide viewer vendors, exported from `@/services` as `wsiViewerVendorService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpWsiViewerVendorService } from './httpWsiViewerVendorService';
import { mockWsiViewerVendorService } from './mockWsiViewerVendorService';
import type { IWsiViewerVendorService } from './IWsiViewerVendorService';

export const wsiViewerVendorService: IWsiViewerVendorService = chooseService<IWsiViewerVendorService>('dp', mockWsiViewerVendorService, createHttpWsiViewerVendorService);
