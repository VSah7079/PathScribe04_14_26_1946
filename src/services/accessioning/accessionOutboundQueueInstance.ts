// src/services/accessioning/accessionOutboundQueueInstance.ts
// Batch 616 (PS-505): the app's accession outbound queue (exported from `@/services`). Mock in the demo; the API server's with an address.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpAccessionOutboundQueueService } from './httpAccessionOutboundQueueService';
import { mockAccessionOutboundQueueService } from './mockAccessionOutboundQueueService';
import type { IAccessionOutboundQueueService } from './IAccessionOutboundQueueService';

export const accessionOutboundQueueService: IAccessionOutboundQueueService = chooseService<IAccessionOutboundQueueService>('accession queue', mockAccessionOutboundQueueService, createHttpAccessionOutboundQueueService);
