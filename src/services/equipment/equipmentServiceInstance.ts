// src/services/equipment/equipmentServiceInstance.ts
// Batch 617 (PS-514): the app's equipment service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpEquipmentService } from './httpEquipmentService';
import { mockEquipmentService } from './mockEquipmentService';
import type { IEquipmentService } from './IEquipmentService';

export const equipmentService: IEquipmentService = chooseService<IEquipmentService>('equipment', mockEquipmentService, createHttpEquipmentService);
