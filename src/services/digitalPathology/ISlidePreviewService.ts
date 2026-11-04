// src/services/digitalPathology/ISlidePreviewService.ts
// Batch 750: previews (thumbnails) the interface delivers for slides, kept as received: PathScribe shows them unchanged
// and never creates, crops, enhances or analyses an image (slideImages.ts). A slide with no delivered preview uses the
// thumbnail address template instead.
import type { ServiceResult } from '../types';
import type { SlidePreview } from './slideImages';

export interface ISlidePreviewService {
  /** The slide's delivered preview, or null. */
  getForSlide(slideDisplayId: string): Promise<ServiceResult<SlidePreview | null>>;
}
