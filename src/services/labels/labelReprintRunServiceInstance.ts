// src/services/labels/labelReprintRunServiceInstance.ts
// Batch 617 (PS-514): the app's labelReprintRun service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpLabelReprintRunService } from './httpLabelReprintRunService';
import { mockLabelReprintRunService } from './mockLabelReprintRunService';
import type { ILabelReprintRunService } from './ILabelReprintRunService';

export const labelReprintRunService: ILabelReprintRunService = chooseService<ILabelReprintRunService>('labels', mockLabelReprintRunService, createHttpLabelReprintRunService);
