// src/services/requisitions/requisitionServiceInstance.ts
// Batch 762: the app's requisition service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpRequisitionService } from './httpRequisitionService';
import { mockRequisitionService } from './mockRequisitionService';
import type { IRequisitionService } from './IRequisitionService';

export const requisitionService: IRequisitionService = chooseService<IRequisitionService>('requisitions', mockRequisitionService, createHttpRequisitionService);
