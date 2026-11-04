// src/services/stains/stainOrderMacroServiceInstance.ts
// Batch 616: the app's stain order macros service, exported from `@/services` as `stainOrderMacroService`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpStainOrderMacroService } from './httpStainOrderMacroService';
import { mockStainOrderMacroService } from './mockStainOrderMacroService';
import type { IStainOrderMacroService } from './IStainService';

export const stainOrderMacroService: IStainOrderMacroService = chooseService<IStainOrderMacroService>('stain-order-macros', mockStainOrderMacroService, createHttpStainOrderMacroService);
