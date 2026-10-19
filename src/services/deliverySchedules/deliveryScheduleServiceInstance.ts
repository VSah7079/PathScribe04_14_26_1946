// src/services/deliverySchedules/deliveryScheduleServiceInstance.ts
// Batch 619 (PS-800): the app's delivery schedules, exported from `@/services` as `deliveryScheduleService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpDeliveryScheduleService } from './httpDeliveryScheduleService';
import { mockDeliveryScheduleService } from './mockDeliveryScheduleService';
import type { IDeliveryScheduleService } from './IDeliveryScheduleService';

export const deliveryScheduleService: IDeliveryScheduleService = chooseService<IDeliveryScheduleService>('deliverySchedule', mockDeliveryScheduleService, createHttpDeliveryScheduleService);
