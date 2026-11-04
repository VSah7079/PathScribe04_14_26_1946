// src/services/macros/macroServiceInstance.ts
// Batch 616: the app's text macros service, exported from `@/services` as `macroService`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpMacroService } from './httpMacroService';
import { mockMacroService } from './mockMacroService';
import type { IMacroService } from './IMacroService';

export const macroService: IMacroService = chooseService<IMacroService>('macros', mockMacroService, createHttpMacroService);
