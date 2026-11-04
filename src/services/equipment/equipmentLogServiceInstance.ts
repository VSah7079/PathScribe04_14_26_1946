// src/services/equipment/equipmentLogServiceInstance.ts
// Batch 617 (PS-514): the app's equipmentLog service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpEquipmentLogService } from './httpEquipmentLogService';
import { mockEquipmentLogService } from './mockEquipmentLogService';
import type { IEquipmentLogService } from './IEquipmentLogService';

export const equipmentLogService: IEquipmentLogService = chooseService<IEquipmentLogService>('equipment', mockEquipmentLogService, createHttpEquipmentLogService);
