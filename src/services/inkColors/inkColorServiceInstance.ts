// src/services/inkColors/inkColorServiceInstance.ts
// Batch 616 (PS-507): the app's inkColorService, exported from `@/services`.
// The mock in the demo; the API server's with an address (docs/architecture/HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpInkColorService } from './httpInkColorService';
import { mockInkColorService } from './mockInkColorService';
import type { IInkColorService } from './IInkColorService';

export const inkColorService: IInkColorService = chooseService<IInkColorService>('inkColors', mockInkColorService, createHttpInkColorService);
