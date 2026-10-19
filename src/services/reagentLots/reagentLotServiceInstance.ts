// src/services/reagentLots/reagentLotServiceInstance.ts
// Batch 616: the app's reagent lots, exported from `@/services` as `reagentLotService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpReagentLotService } from './httpReagentLotService';
import { mockReagentLotService } from './mockReagentLotService';
import type { IReagentLotService } from './IReagentLotService';

export const reagentLotService: IReagentLotService = chooseService<IReagentLotService>('reagents', mockReagentLotService, createHttpReagentLotService);
