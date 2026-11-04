// Batch 460 (PS-245): moving and resizing label fields inside the label.
import { describe, it, expect } from 'vitest';
import { clampFieldToLabel, moveFieldTo, resizeFieldFromHandle, applyInspectorEdit, fieldsOutOfBounds, isFieldInsideLabel, MIN_FIELD_MM, pxToMm, mmToPx } from './labelFieldGeometry';
import type { LabelLayoutField } from './ILabelLayoutService';

const label = { widthMm: 50, heightMm: 25 };
const f = (o: Partial<LabelLayoutField> = {}): LabelLayoutField => ({ id: 'f', fieldKey: 'k', xMm: 10, yMm: 5, widthMm: 20, heightMm: 6, fontSizeMm: 2.6, ...o });

describe('labelFieldGeometry', () => {
  it('keeps a moved field inside the label at every edge', () => {
    expect(moveFieldTo(f(), 45, 22, label)).toMatchObject({ xMm: 30, yMm: 19 });
    expect(moveFieldTo(f(), -5, -1, label)).toMatchObject({ xMm: 0, yMm: 0 });
    expect(moveFieldTo(f(), 12.34, 3.21, label)).toMatchObject({ xMm: 12.3, yMm: 3.2 });
  });
  it('a resize keeps the opposite edge and stops at the label edge', () => {
    expect(resizeFieldFromHandle(f(), 'se', 100, 100, label)).toMatchObject({ xMm: 10, yMm: 5, widthMm: 40, heightMm: 20 });
    expect(resizeFieldFromHandle(f(), 'nw', -100, -100, label)).toMatchObject({ xMm: 0, yMm: 0, widthMm: 30, heightMm: 11 });
    expect(resizeFieldFromHandle(f(), 'e', 5, 99, label)).toMatchObject({ xMm: 10, widthMm: 25, heightMm: 6 });
    expect(resizeFieldFromHandle(f(), 'n', 0, 2, label)).toMatchObject({ yMm: 7, heightMm: 4 });
  });
  it('never shrinks a field below the minimum (and the far edge stays put)', () => {
    expect(resizeFieldFromHandle(f(), 'w', 100, 0, label)).toMatchObject({ xMm: 30 - MIN_FIELD_MM, widthMm: MIN_FIELD_MM });
    expect(resizeFieldFromHandle(f(), 's', 0, -100, label)).toMatchObject({ yMm: 5, heightMm: MIN_FIELD_MM });
  });
  it('inspector numbers are kept inside the label; a blank number does not break the field', () => {
    expect(applyInspectorEdit(f(), { widthMm: 80 }, label)).toMatchObject({ xMm: 10, widthMm: 40 });
    expect(applyInspectorEdit(f(), { xMm: 45 }, label)).toMatchObject({ xMm: 30, widthMm: 20 });
    expect(applyInspectorEdit(f(), { xMm: Number.NaN }, label).xMm).toBe(0);
    expect(applyInspectorEdit(f(), { fontSizeMm: 30 }, label).fontSizeMm).toBe(6);
  });
  it('a field larger than the label is shrunk to it', () => {
    expect(clampFieldToLabel(f({ widthMm: 200, heightMm: 90 }), label)).toMatchObject({ xMm: 0, yMm: 0, widthMm: 50, heightMm: 25 });
  });
  it('finds fields that cross the edge', () => {
    expect(fieldsOutOfBounds([f(), f({ id: 'g', xMm: 40 }), f({ id: 'h', yMm: -1 })], label)).toEqual(['g', 'h']);
    expect(isFieldInsideLabel(f({ xMm: 30 }), label)).toBe(true);
    expect(mmToPx(pxToMm(37))).toBe(37);
  });
});
