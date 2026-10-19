// src/services/reportAppearance/fontUnits.test.ts
// Batch 612: font sizes in points (Pete: "7.5 is really too small"), the pixel sizes saved before,
// and what "Convert to points" changes. Mirrors functions/report_layout.py.
import { describe, it, expect } from 'vitest';
import type { LabelConfig } from '../../types/template';
import {
  unitsOf, printedPoints, previewFontSize, printedPointsText, planPointsConversion, applyPointsConversion,
  conversionAuditSummary, MIN_FONT_PT, MIN_LEGACY_FONT_PT, PX_PER_PT,
} from './fontUnits';

const cfg = (over: Partial<LabelConfig>): LabelConfig => ({ position: 'above', ...over });

describe('units of a size', () => {
  it('a style\'s own units win, then the template\'s, then legacy pixels', () => {
    expect(unitsOf(cfg({ units: 'pt' }), 'legacy_px')).toBe('pt');
    expect(unitsOf(cfg({ units: 'legacy_px' }), 'pt')).toBe('legacy_px');
    expect(unitsOf(cfg({}), 'pt')).toBe('pt');
    expect(unitsOf(cfg({}))).toBe('legacy_px');
    expect(unitsOf(undefined)).toBe('legacy_px');
    expect(unitsOf(cfg({ units: 'nonsense' as never }), 'pt')).toBe('pt');
  });
});

describe('what a size prints at', () => {
  it('a size in points prints at the number given, never below 8 pt', () => {
    expect(printedPoints(10, 'pt')).toBe(10);
    expect(printedPoints(11, 'pt')).toBe(11);
    expect(printedPoints(6, 'pt')).toBe(MIN_FONT_PT);
    expect(MIN_FONT_PT).toBe(8);
  });
  it('a legacy pixel size prints as it always did: 0.75 pt a pixel, never below 7 pt', () => {
    expect(printedPoints(10, 'legacy_px')).toBe(7.5);
    expect(printedPoints(16, 'legacy_px')).toBe(12);
    expect(printedPoints(4, 'legacy_px')).toBe(MIN_LEGACY_FONT_PT);
  });
  it('an unusable size has no printed size', () => {
    expect(printedPoints(undefined, 'pt')).toBeNull();
    expect(printedPoints(2, 'pt')).toBeNull();
    expect(printedPoints(100, 'legacy_px')).toBeNull();
    expect(printedPoints(Number.NaN, 'pt')).toBeNull();
    expect(printedPointsText(10, 'legacy_px')).toBe('7.5');
    expect(printedPointsText(undefined, 'pt')).toBeNull();
  });
});

describe('preview size', () => {
  it('a size in points is drawn in CSS points (1 pt = 1.333 px at 96 dpi), so the screen is the paper size', () => {
    expect(previewFontSize(10, 'pt')).toBe('10pt');
    expect(previewFontSize(6, 'pt')).toBe('8pt');
    expect(PX_PER_PT).toBeCloseTo(1.3333, 3);
  });
  it('a legacy size stays in pixels', () => {
    expect(previewFontSize(10, 'legacy_px')).toBe('10px');
    expect(previewFontSize(undefined, 'pt')).toBeUndefined();
    expect(previewFontSize(0, 'legacy_px')).toBeUndefined();
  });
});

describe('Convert to points', () => {
  const legacy = { documentStyle: { header: cfg({ fontSize: 12, weight: 'bold' }), body: cfg({ fontSize: 10 }), footer: cfg({ fontSize: 6 }) } };

  it('lists each size that changes: the number is kept, now in points (at least 8)', () => {
    const plan = planPointsConversion(legacy);
    expect(plan.alreadyPoints).toBe(false);
    expect(plan.changes).toEqual([
      { category: 'header', fromSize: 12, fromPoints: 9, toSize: 12, raisedToFloor: false },
      { category: 'body', fromSize: 10, fromPoints: 7.5, toSize: 10, raisedToFloor: false },
      { category: 'footer', fromSize: 6, fromPoints: 7, toSize: 8, raisedToFloor: true },
    ]);
  });

  it('converting keeps the number, marks every style and the template as points, and changes nothing else', () => {
    const out = applyPointsConversion(legacy);
    expect(out.fontUnits).toBe('pt');
    expect(out.documentStyle.header).toEqual({ position: 'above', fontSize: 12, weight: 'bold', units: 'pt' });
    expect(out.documentStyle.body?.fontSize).toBe(10);
    expect(out.documentStyle.footer?.fontSize).toBe(8);
    expect(legacy.documentStyle.body.units).toBeUndefined();
  });

  it('a style already in points is not listed and is left as it is', () => {
    const mixed = { documentStyle: { body: cfg({ fontSize: 10, units: 'pt' }), footer: cfg({ fontSize: 9 }) } };
    const plan = planPointsConversion(mixed);
    expect(plan.changes.map(c => c.category)).toEqual(['footer']);
    expect(applyPointsConversion(mixed).documentStyle.body?.fontSize).toBe(10);
  });

  it('a template with no styles of its own still converts (its labels are read as points), with nothing listed', () => {
    const plan = planPointsConversion({});
    expect(plan.changes).toEqual([]);
    expect(plan.alreadyPoints).toBe(false);
    expect(applyPointsConversion({}).fontUnits).toBe('pt');
    expect(planPointsConversion({ fontUnits: 'pt' }).alreadyPoints).toBe(true);
  });

  it('a style with no size of its own uses the size it would have shown', () => {
    const plan = planPointsConversion({ documentStyle: { header: cfg({}) } }, { header: 12 });
    expect(plan.changes[0]).toMatchObject({ category: 'header', fromSize: 12, toSize: 12 });
  });

  it('the audit summary names the sizes and never anything else', () => {
    expect(conversionAuditSummary(planPointsConversion(legacy))).toBe('header 12 px (printed 9 pt) -> 12 pt; body 10 px (printed 7.5 pt) -> 10 pt; footer 6 px (printed 7 pt) -> 8 pt');
    expect(conversionAuditSummary({ changes: [], alreadyPoints: false })).toBe('no sizes needed changing');
  });
});
