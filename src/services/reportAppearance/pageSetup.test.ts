// @vitest-environment happy-dom
//
// src/services/reportAppearance/pageSetup.test.ts
// Batch 431: the lab's page size and margins (lab-wide, permission-checked).
import { describe, it, expect, beforeEach, vi } from 'vitest';

const enforce = vi.fn(async (_capability: string) => ({ allowed: true }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce: (c: string) => enforce(c) } }));

import { getLabPageSetup, saveLabPageSetup, normalisePageSetup, DEFAULT_PAGE_SETUP } from './pageSetup';

describe('lab page setup', () => {
  beforeEach(() => { localStorage.clear(); enforce.mockResolvedValue({ allowed: true }); });

  it('defaults to A4 with the standard margins', () => {
    expect(getLabPageSetup()).toEqual(DEFAULT_PAGE_SETUP);
  });

  it('carries over what the preview remembered before, once, then clears the old values', () => {
    localStorage.setItem('ps_preview_page_size', 'letter');
    localStorage.setItem('ps_preview_margins', JSON.stringify({ top: 30, right: 15, bottom: 30, left: 15 }));
    expect(getLabPageSetup()).toEqual({ pageSizeId: 'letter', margins: { top: 30, right: 15, bottom: 30, left: 15 } });
    expect(localStorage.getItem('ps_preview_page_size')).toBeNull();
    expect(getLabPageSetup().pageSizeId).toBe('letter');
  });

  it('saving needs config:report-appearance:manage', async () => {
    enforce.mockResolvedValue({ allowed: false });
    expect(await saveLabPageSetup({ pageSizeId: 'legal', margins: DEFAULT_PAGE_SETUP.margins })).toBe(false);
    expect(getLabPageSetup().pageSizeId).toBe('a4');
    expect(enforce).toHaveBeenCalledWith('config:report-appearance:manage');

    enforce.mockResolvedValue({ allowed: true });
    expect(await saveLabPageSetup({ pageSizeId: 'legal', margins: DEFAULT_PAGE_SETUP.margins })).toBe(true);
    expect(getLabPageSetup().pageSizeId).toBe('legal');
  });

  it('keeps sizes known and margins within 5–50 mm', () => {
    expect(normalisePageSetup({ pageSizeId: 'napkin', margins: { top: 1, right: 99, bottom: 20, left: NaN } as never }))
      .toEqual({ pageSizeId: 'a4', margins: { top: 5, right: 50, bottom: 20, left: 20 } });
  });
});


import { renderPageSetup } from './pageSetup';
describe('renderPageSetup (Batch 606, PS-36)', () => {
  it('gives the renderer the page size in millimetres and the margins', () => {
    expect(renderPageSetup({ pageSizeId: 'letter', margins: { top: 10, right: 11, bottom: 12, left: 13 } })).toEqual({
      pageSizeId: 'letter', widthMm: 216, heightMm: 279, margins: { top: 10, right: 11, bottom: 12, left: 13 },
    });
  });
  it('an unknown size falls back to A4', () => {
    expect(renderPageSetup({ pageSizeId: 'nope', margins: { top: 25, right: 20, bottom: 25, left: 20 } }).widthMm).toBe(210);
  });
});
