// src/services/digitalPathology/slidePreviewServiceInstance.ts
// Batch 750: exported from `@/services` as `slidePreviewService`. The mock in the demo; the API server's version when a
// server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpSlidePreviewService } from './httpSlidePreviewService';
import { mockSlidePreviewService } from './mockSlidePreviewService';
import type { ISlidePreviewService } from './ISlidePreviewService';

export const slidePreviewService: ISlidePreviewService = chooseService<ISlidePreviewService>('dp', mockSlidePreviewService, createHttpSlidePreviewService);
