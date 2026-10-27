// src/services/reportRelease/heldReleaseServiceInstance.ts
// Batch 672 (wiring step 3): the app's heldReleaseService. The mock in the demo; the API server's with an address.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpHeldReleaseService } from './httpHeldReleaseService';
import { mockHeldReleaseService } from './mockHeldReleaseService';
import type { IHeldReleaseService } from './IHeldReleaseService';

export const heldReleaseService: IHeldReleaseService = chooseService<IHeldReleaseService>('reportRelease', mockHeldReleaseService, createHttpHeldReleaseService);
