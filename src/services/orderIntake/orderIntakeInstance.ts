// src/services/orderIntake/orderIntakeInstance.ts
// Batch 616 (PS-505): the app's incoming-order intake (exported from `@/services`). Mock in the demo; the API server's with an address.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpOrderIntakeService } from './httpOrderIntakeService';
import { mockOrderIntakeService } from './mockOrderIntakeService';
import type { IOrderIntakeService } from './IOrderIntakeService';

export const orderIntakeService: IOrderIntakeService = chooseService<IOrderIntakeService>('order intake', mockOrderIntakeService, createHttpOrderIntakeService);
