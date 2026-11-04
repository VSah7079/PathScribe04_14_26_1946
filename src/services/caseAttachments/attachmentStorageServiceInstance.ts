// src/services/caseAttachments/attachmentStorageServiceInstance.ts
// Batch 742: the app's attachment storage adapter, exported from `@/services`.
// The demo's in-memory stand-in without an API server; the API server's adapter calls when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpAttachmentStorageService } from './httpAttachmentStorageService';
import { mockAttachmentStorageService } from './mockAttachmentStorageService';
import type { IAttachmentStorageService } from './IAttachmentStorageService';

export const attachmentStorageService: IAttachmentStorageService = chooseService<IAttachmentStorageService>('attachmentStorage', mockAttachmentStorageService, createHttpAttachmentStorageService);
