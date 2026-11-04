// src/services/itemEndStates/itemEndStateServiceInstance.ts
// Batch 731: the mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpItemEndStateService } from './httpItemEndStateService';
import { mockItemEndStateService } from './mockItemEndStateService';
import type { IItemEndStateService } from './IItemEndStateService';

export const itemEndStateService: IItemEndStateService = chooseService<IItemEndStateService>('itemEndStates', mockItemEndStateService, createHttpItemEndStateService);
