// @vitest-environment happy-dom
// src/utils/selectAutoWidth.test.ts — Batch 580 (PS-62): dropdowns keep the width of their widest option.
import { describe, it, expect } from 'vitest';
import { selectAutoWidthPx, isStyledSelect, installSelectAutoWidth, SELECT_ICON_ALLOWANCE_PX } from './selectAutoWidth';

const box = { paddingLeft: 10, paddingRight: 12, borderLeft: 1, borderRight: 1 };

describe('selectAutoWidthPx', () => {
  it('is the widest option plus padding, border and the arrow, rounded up', () => {
    expect(selectAutoWidthPx([40, 120.2, 80], box)).toBe(Math.ceil(120.2 + 24 + SELECT_ICON_ALLOWANCE_PX));
  });
  it('a dropdown with no options gets no width of its own', () => {
    expect(selectAutoWidthPx([], box)).toBeNull();
  });
});

describe('isStyledSelect', () => {
  it('single-choice dropdowns only; multi-selects and list boxes keep the native look', () => {
    expect(isStyledSelect({ multiple: false, size: 0 })).toBe(true);
    expect(isStyledSelect({ multiple: false, size: 1 })).toBe(true);
    expect(isStyledSelect({ multiple: true, size: 0 })).toBe(false);
    expect(isStyledSelect({ multiple: false, size: 5 })).toBe(false);
  });
});

describe('installSelectAutoWidth', () => {
  it('does nothing where the styled list is not drawn (Firefox, Safari, this test DOM)', () => {
    document.body.innerHTML = '<select><option>Short</option><option>A much longer option</option></select>';
    const stop = installSelectAutoWidth(document);
    expect((document.querySelector('select') as HTMLSelectElement).style.getPropertyValue('--ps-select-auto-width')).toBe('');
    stop();
  });
});

import { transformedLabel, withLetterSpacing } from './selectAutoWidth';
describe('measuring as shown', () => {
  it('applies the dropdown\'s text-transform', () => {
    expect(transformedLabel('Stat priority', 'uppercase')).toBe('STAT PRIORITY');
    expect(transformedLabel('Stat Priority', 'lowercase')).toBe('stat priority');
    expect(transformedLabel('stat priority', 'capitalize')).toBe('Stat Priority');
    expect(transformedLabel('Stat', 'none')).toBe('Stat');
  });
  it('adds letter spacing per character, which the canvas leaves out', () => {
    expect(withLetterSpacing(50, 'STAT', 0.5)).toBe(52);
    expect(withLetterSpacing(50, 'STAT', 0)).toBe(50);
  });
});
