// src/services/printerProfiles/printerProfileServiceInstance.ts
// Batch 616: the app's printer profiles, exported from `@/services` as `printerProfileService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpPrinterProfileService } from './httpPrinterProfileService';
import { mockPrinterProfileService } from './mockPrinterProfileService';
import type { IPrinterProfileService } from './IPrinterProfileService';

export const printerProfileService: IPrinterProfileService = chooseService<IPrinterProfileService>('printers', mockPrinterProfileService, createHttpPrinterProfileService);
