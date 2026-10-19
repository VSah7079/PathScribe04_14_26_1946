// src/utils/labelStyleVars.test.ts
// Batch 612: label sizes are drawn in CSS points when the style (or its template) is in points.
import { describe, it, expect } from 'vitest';
import { labelStyleVars } from './labelStyleVars';

describe('labelStyleVars size', () => {
  it('a style in points is drawn in points, so the screen is the paper size', () => {
    expect(labelStyleVars({ fontSize: 10, units: 'pt' }, 'rp-body')).toMatchObject({ '--rp-body-size': '10pt' });
  });
  it('a style saved before points stays in pixels', () => {
    expect(labelStyleVars({ fontSize: 10 }, 'rp-body')).toMatchObject({ '--rp-body-size': '10px' });
    expect(labelStyleVars({ fontSize: 10, units: 'legacy_px' }, 'x', 'pt')).toMatchObject({ '--x-size': '10px' });
  });
  it('a style with no units takes its template\'s', () => {
    expect(labelStyleVars({ fontSize: 9 }, 'x', 'pt')).toMatchObject({ '--x-size': '9pt' });
  });
  it('a size under 8 pt is drawn at the 8 pt it will print at; no size sets nothing', () => {
    expect(labelStyleVars({ fontSize: 6, units: 'pt' }, 'x')).toMatchObject({ '--x-size': '8pt' });
    expect(labelStyleVars({ weight: 'bold' }, 'x')).not.toHaveProperty('--x-size');
  });
});
