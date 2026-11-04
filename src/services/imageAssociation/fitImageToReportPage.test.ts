// Batch 609 (PS-44): how large an attached image prints, and the resolution that gives.
import { describe, it, expect } from 'vitest';
import { fitImageToReportPage, REPORT_IMAGE_PAGE } from './fitImageToReportPage';

describe('fitImageToReportPage', () => {
  it('shrinks a large photograph to the page width and keeps its proportions', () => {
    const f = fitImageToReportPage(4000, 3000);
    expect(f.widthPt).toBeCloseTo(512);
    expect(f.heightPt).toBeCloseTo(384);
    expect(f.dpi).toBeGreaterThan(500);
    expect(f.meetsMinimum).toBe(true);
  });
  it('shrinks a tall image to the page height', () => {
    const f = fitImageToReportPage(1000, 4000);
    expect(f.heightPt).toBeCloseTo(REPORT_IMAGE_PAGE.heightPt - 2 * REPORT_IMAGE_PAGE.marginPt);
    expect(f.widthPt).toBeCloseTo(173);
  });
  it('never enlarges a small image, so a small one prints at its pixel size (72 DPI)', () => {
    const f = fitImageToReportPage(300, 200);
    expect(f.widthPt).toBe(300);
    expect(f.dpi).toBeCloseTo(72);
    expect(f.meetsMinimum).toBe(false);
  });
  it('is under 300 DPI when 7.1 inches of page holds fewer than about 2133 pixels', () => {
    expect(fitImageToReportPage(2100, 1500).meetsMinimum).toBe(false);
    expect(fitImageToReportPage(2200, 1500).meetsMinimum).toBe(true);
  });
});
