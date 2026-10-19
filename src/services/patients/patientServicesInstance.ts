// src/services/patients/patientServicesInstance.ts
// Batch 616 (PS-503): the patient index and the patient ADT queue as the app uses them (exported from `@/services`).
// Mock in the demo; the API server's with an address.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpPatientIndexService } from './httpPatientIndexService';
import { createHttpOutboundPatientAdtQueueService } from './httpOutboundPatientAdtQueueService';
import { mockPatientIndexService } from './mockPatientIndexService';
import { mockOutboundPatientAdtQueueService } from './mockOutboundPatientAdtQueueService';
import type { IPatientIndexService } from './IPatientIndexService';
import type { IOutboundPatientAdtQueueService } from './IOutboundPatientAdtQueueService';

export const patientIndexService: IPatientIndexService = chooseService<IPatientIndexService>('patients', mockPatientIndexService, createHttpPatientIndexService);
export const outboundPatientAdtQueueService: IOutboundPatientAdtQueueService = chooseService<IOutboundPatientAdtQueueService>('patients', mockOutboundPatientAdtQueueService, createHttpOutboundPatientAdtQueueService);
