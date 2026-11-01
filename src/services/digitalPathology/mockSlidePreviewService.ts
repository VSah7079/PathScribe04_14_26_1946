// src/services/digitalPathology/mockSlidePreviewService.ts
// Batch 750: the demo keeps delivered previews in browser storage. None is seeded: the demo's previews come from the
// thumbnail address template (docs/product/SLIDE_IMAGE_DEMO.md). Receiving them from the interface is Planned
// (docs/architecture/SLIDE_IMAGES.md).
import { storageGet } from '../mockStorage';
import type { ISlidePreviewService } from './ISlidePreviewService';
import type { SlidePreview } from './slideImages';

const STORAGE_KEY = 'slide_previews';

export const mockSlidePreviewService: ISlidePreviewService = {
  async getForSlide(slideDisplayId) {
    const all = storageGet<SlidePreview[]>(STORAGE_KEY, []);
    return { ok: true, data: all.find(p => p.slideDisplayId === slideDisplayId.trim()) ?? null };
  },
};
