// src/services/digitalPathology/dpVendorServiceInstance.ts
// Batch 616: the app's digital pathology vendors, exported from `@/services` as `dpVendorService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpDpVendorService } from './httpDpVendorService';
import { mockDpVendorService } from './mockDpVendorService';
import type { IDpVendorService } from './IDpVendorService';

export const dpVendorService: IDpVendorService = chooseService<IDpVendorService>('dp', mockDpVendorService, createHttpDpVendorService);
