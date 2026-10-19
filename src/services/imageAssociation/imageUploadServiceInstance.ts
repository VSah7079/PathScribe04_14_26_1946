// src/services/imageAssociation/imageUploadServiceInstance.ts
// Batch 616: the app's image upload, exported from `@/services` as `imageUploadService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpImageUploadService } from './httpImageUploadService';
import { mockImageUploadService } from './mockImageUploadService';
import type { IImageUploadService } from './IImageUploadService';

export const imageUploadService: IImageUploadService = chooseService<IImageUploadService>('images', mockImageUploadService, createHttpImageUploadService);
