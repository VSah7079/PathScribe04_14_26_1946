// src/services/marginExtraction/marginDistanceExtraction.test.ts
import { describe, it, expect } from 'vitest';
import {
  extractMarginDistanceMm,
  isMarginDistanceTextField,
  unitForMarginDistanceField,
} from './marginDistanceExtraction';

describe('extractMarginDistanceMm', () => {
  it('reads a plain mm value', () => {
    const r = extractMarginDistanceMm('2mm');
    expect(r).toMatchObject({ valueMm: 2, approx: 'exact', confident: true });
  });

  it('reads a spaced mm value', () => {
    const r = extractMarginDistanceMm('2 mm');
    expect(r).toMatchObject({ valueMm: 2, approx: 'exact', confident: true });
  });

  it('reads a decimal mm value', () => {
    const r = extractMarginDistanceMm('0.5mm');
    expect(r).toMatchObject({ valueMm: 0.5, confident: true });
  });

  it('converts cm to mm', () => {
    const r = extractMarginDistanceMm('0.5 cm');
    expect(r).toMatchObject({ valueMm: 5, confident: true });
  });

  it('converts spelled-out centimeters to mm', () => {
    const r = extractMarginDistanceMm('1.2 centimeters');
    expect(r).toMatchObject({ valueMm: 12, confident: true });
  });

  it('reads a less-than prefix', () => {
    const r = extractMarginDistanceMm('<1mm');
    expect(r).toMatchObject({ valueMm: 1, approx: 'lessThan', confident: true });
  });

  it('reads a greater-than-or-equal prefix', () => {
    const r = extractMarginDistanceMm('>=5 mm');
    expect(r).toMatchObject({ valueMm: 5, approx: 'greaterThan', confident: true });
  });

  it('tolerates filler words around the number', () => {
    const r = extractMarginDistanceMm('margin: approximately 2 mm from the inked surface');
    expect(r).toMatchObject({ valueMm: 2, confident: true });
  });

  it('reads a bare number using the field unit (mm default)', () => {
    const r = extractMarginDistanceMm('2');
    expect(r).toMatchObject({ valueMm: 2, approx: 'exact', confident: true });
  });

  it('reads a bare number using an explicit cm field unit', () => {
    const r = extractMarginDistanceMm('0.5', { fieldUnit: 'cm' });
    expect(r).toMatchObject({ valueMm: 5, confident: true });
  });

  it('reads a bare less-than number', () => {
    const r = extractMarginDistanceMm('<1');
    expect(r).toMatchObject({ valueMm: 1, approx: 'lessThan', confident: true });
  });

  it('flags empty text', () => {
    const r = extractMarginDistanceMm('');
    expect(r).toMatchObject({ valueMm: null, confident: false, reason: 'empty' });
  });

  it('flags whitespace-only text as empty', () => {
    const r = extractMarginDistanceMm('   ');
    expect(r).toMatchObject({ confident: false, reason: 'empty' });
  });

  it('flags undefined/null text as empty', () => {
    expect(extractMarginDistanceMm(undefined)).toMatchObject({ confident: false, reason: 'empty' });
    expect(extractMarginDistanceMm(null)).toMatchObject({ confident: false, reason: 'empty' });
  });

  it('flags purely qualitative text with no numeric token', () => {
    const r = extractMarginDistanceMm('cannot be assessed');
    expect(r).toMatchObject({ valueMm: null, confident: false, reason: 'noNumericToken' });
  });

  it('flags a number embedded in unrelated prose as surrounding text', () => {
    const r = extractMarginDistanceMm('2 of 14 blocks showed invasion within 1mm of the serosa, extensive necrosis noted');
    expect(r).toMatchObject({ valueMm: null, confident: false, reason: 'surroundingText' });
  });

  it('flags a number with no unit embedded in prose as a no-numeric-token case when it does not match the bare-number pattern', () => {
    const r = extractMarginDistanceMm('tumor involves 2 of 5 margins');
    expect(r.confident).toBe(false);
  });
});

describe('isMarginDistanceTextField', () => {
  it('matches a free-text field ending in _mm', () => {
    expect(isMarginDistanceTextField({ id: 'distance_to_crm_mm', type: 'text' })).toBe(true);
  });

  it('matches a free-text field ending in _cm', () => {
    expect(isMarginDistanceTextField({ id: 'distance_to_closest_margin_cm', type: 'text' })).toBe(true);
  });

  it('is case-insensitive on the suffix', () => {
    expect(isMarginDistanceTextField({ id: 'distance_to_crm_MM', type: 'text' })).toBe(true);
  });

  it('rejects a numeric-typed field even with a matching id suffix', () => {
    expect(isMarginDistanceTextField({ id: 'psmap_rec_crmMm', type: 'numeric' })).toBe(false);
  });

  it('rejects a text field whose id does not end in _mm/_cm', () => {
    expect(isMarginDistanceTextField({ id: 'margin_status', type: 'text' })).toBe(false);
  });
});

describe('unitForMarginDistanceField', () => {
  it('reads cm from a _cm suffix', () => {
    expect(unitForMarginDistanceField('distance_to_closest_margin_cm')).toBe('cm');
  });

  it('defaults to mm otherwise', () => {
    expect(unitForMarginDistanceField('distance_to_crm_mm')).toBe('mm');
  });
});
