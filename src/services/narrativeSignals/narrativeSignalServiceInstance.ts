// src/services/narrativeSignals/narrativeSignalServiceInstance.ts
// Batch 616: the app's narrative edit signals service, exported from `@/services` as `narrativeSignalService`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpNarrativeSignalService } from './httpNarrativeSignalService';
import { mockNarrativeSignalService } from './mockNarrativeSignalService';
import type { INarrativeSignalService } from './INarrativeSignalService';

export const narrativeSignalService: INarrativeSignalService = chooseService<INarrativeSignalService>('narrative-signals', mockNarrativeSignalService, createHttpNarrativeSignalService);
