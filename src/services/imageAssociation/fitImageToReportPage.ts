// src/services/imageAssociation/fitImageToReportPage.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 609 (PS-44): how large an attached image prints on its page in the
// report (an image page after the report's own pages), and the resolution that
// gives. One function, used by the embed step that draws the page and by the
// Attach images screen that warns before anything is attached, so the warning
// and the print can't disagree.
//
// The image is never enlarged (scale at most 1: one pixel is one point, which is
// 72 DPI) and never re-compressed; it is shrunk to fit inside the page's drawing
// area (512 x 692 pt on a US Letter sized page, 50 pt from each edge).
// ─────────────────────────────────────────────────────────────────────────────

import { checkEmbeddedImageResolution, MIN_REQUIRED_DPI } from '@/services/documentRendering/checkEmbeddedImageResolution';

export const REPORT_IMAGE_PAGE = { widthPt: 612, heightPt: 792, marginPt: 50 } as const;
const MAX_WIDTH_PT = REPORT_IMAGE_PAGE.widthPt - 2 * REPORT_IMAGE_PAGE.marginPt;   // 512
const MAX_HEIGHT_PT = REPORT_IMAGE_PAGE.heightPt - 2 * REPORT_IMAGE_PAGE.marginPt; // 692

export interface FittedImage { widthPt: number; heightPt: number; dpi: number; meetsMinimum: boolean; }

/** The printed size of an image of this many pixels, and the resolution at that size. */
export function fitImageToReportPage(widthPx: number, heightPx: number): FittedImage {
  const scale = Math.min(MAX_WIDTH_PT / widthPx, MAX_HEIGHT_PT / heightPx, 1);
  const widthPt = widthPx * scale;
  const { dpi, meetsMinimum } = checkEmbeddedImageResolution(widthPx, widthPt);
  return { widthPt, heightPt: heightPx * scale, dpi, meetsMinimum };
}

export { MIN_REQUIRED_DPI };
