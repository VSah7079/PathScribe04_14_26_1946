// src/services/reportAppearance/previewPage.test.ts
// Batch 612: the preview page of a points template is the paper's real width and side margins.
import { describe, it, expect } from 'vitest';
import { previewPageVars } from './previewPage';

describe('previewPageVars', () => {
  it('uses the lab\'s paper width and side margins in millimetres', () => {
    expect(previewPageVars({ widthMm: 210, margins: { top: 25, right: 20, bottom: 25, left: 30 } }))
      .toEqual({ '--rp-page-w': '210mm', '--rp-pad-l': '30mm', '--rp-pad-r': '20mm' });
  });
  it('a side margin under half an inch is drawn at half an inch, as it prints', () => {
    const vars = previewPageVars({ widthMm: 216, margins: { top: 5, right: 5, bottom: 5, left: 8 } });
    expect(vars['--rp-pad-l']).toBe('12.7mm');
    expect(vars['--rp-pad-r']).toBe('12.7mm');
  });
});
