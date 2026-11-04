// src/services/messages/messageServiceInstance.ts
// Batch 616: the app's internal messages service, exported from `@/services` as `messageService`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpMessageService } from './httpMessageService';
import { mockMessageService } from './mockMessageService';
import type { IMessageService } from './IMessageService';

export const messageService: IMessageService = chooseService<IMessageService>('messages', mockMessageService, createHttpMessageService);
