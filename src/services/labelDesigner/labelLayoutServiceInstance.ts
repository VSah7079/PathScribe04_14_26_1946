// src/services/labelDesigner/labelLayoutServiceInstance.ts
// Batch 616: the app's label layouts, exported from `@/services` as `labelLayoutService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpLabelLayoutService } from './httpLabelLayoutService';
import { mockLabelLayoutService } from './mockLabelLayoutService';
import type { ILabelLayoutService } from './ILabelLayoutService';

export const labelLayoutService: ILabelLayoutService = chooseService<ILabelLayoutService>('labels', mockLabelLayoutService, createHttpLabelLayoutService);
