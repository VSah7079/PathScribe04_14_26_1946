// src/services/digitalPathology/httpSlidePreviewService.ts
// Batch 750: the API server's version of ISlidePreviewService (HTTP_SERVICES_PATTERN.md). The slide identifier carries
// the accession, so it travels in the body, never the URL. Contract: docs/architecture/SLIDE_IMAGES.md.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, result } from '../apiServer/httpServiceKit';
import type { ISlidePreviewService } from './ISlidePreviewService';

const BASE = '/api/digital-pathology/slide-previews';

export function createHttpSlidePreviewService(client: ApiHttpClient): ISlidePreviewService {
  return buildHttpService<ISlidePreviewService>(client, {
    getForSlide: result('POST', () => methodPath(BASE, 'getForSlide'), { body: (slideDisplayId: string) => ({ slideDisplayId }) }),
  });
}
