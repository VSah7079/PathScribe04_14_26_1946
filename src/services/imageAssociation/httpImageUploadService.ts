// src/services/imageAssociation/httpImageUploadService.ts
// Batch 616: the API server's version of IImageUploadService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/DIGITAL_PATHOLOGY_API.md.
// Every method of the interface has a route. No patient text goes in a URL; names, ids and
// free text travel in the body. The server decides permission; a refusal comes back as a code.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, result } from '../apiServer/httpServiceKit';
import type { IImageUploadService } from './IImageUploadService';

type P<K extends keyof IImageUploadService, N extends number> = Parameters<IImageUploadService[K]>[N];

const BASE = '/api/image-association/image-upload';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpImageUploadService(client: ApiHttpClient): IImageUploadService {
  const routes = buildHttpService<IImageUploadService>(client, {
    upload: result('POST', () => route('upload'), { body: (imageData: P<'upload', 0>, imageType: P<'upload', 1>) => ({ imageData, imageType }) }),
  });
  return routes;
}
