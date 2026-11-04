// Batch 609 (#173): per-adoption model overrides.
import { describe, it, expect } from 'vitest';
import {
  effectiveConfidenceThreshold, effectiveMaxTokens, overrideFormFrom, overridesFromForm, validateOverrides,
} from './modelOverrides';
import { applyModelChanges, joinModel } from './modelAdoption';
import { GLOBAL_MODEL_CATALOG } from './modelCatalog';
import type { ModelAdoption } from './IModelService';

describe('validateOverrides', () => {
  it('accepts the two known keys inside their ranges and drops empty sections', () => {
    expect(validateOverrides({ configOverrides: { maxTokens: 400 }, thresholdOverrides: { confidenceThreshold: 80 } }))
      .toEqual({ ok: true, value: { configOverrides: { maxTokens: 400 }, thresholdOverrides: { confidenceThreshold: 80 } } });
    expect(validateOverrides({ configOverrides: {}, thresholdOverrides: undefined })).toEqual({ ok: true, value: {} });
  });
  it('refuses unknown keys, fractions, text and out-of-range values', () => {
    const r = validateOverrides({ configOverrides: { temperature: 1 as number, maxTokens: 10 }, thresholdOverrides: { confidenceThreshold: 101 } });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.issues.map(i => `${i.key}:${i.code}`)).toEqual(['temperature:UNKNOWN_KEY', 'maxTokens:OUT_OF_RANGE', 'confidenceThreshold:OUT_OF_RANGE']);
    expect(validateOverrides({ configOverrides: { maxTokens: 1.5 } }).ok).toBe(false);
    expect(validateOverrides({ configOverrides: { maxTokens: 'x' as unknown as number } }).ok).toBe(false);
    expect(validateOverrides({ thresholdOverrides: { confidenceThreshold: NaN } }).ok).toBe(false);
  });
  it('the boundaries are allowed', () => {
    expect(validateOverrides({ configOverrides: { maxTokens: 50 }, thresholdOverrides: { confidenceThreshold: 0 } }).ok).toBe(true);
    expect(validateOverrides({ configOverrides: { maxTokens: 8000 }, thresholdOverrides: { confidenceThreshold: 100 } }).ok).toBe(true);
  });
});

describe('the form', () => {
  it('round-trips, and blank means no override', () => {
    expect(overrideFormFrom(undefined)).toEqual({ maxTokens: '', confidenceThreshold: '' });
    expect(overridesFromForm({ maxTokens: '', confidenceThreshold: '  ' })).toEqual({});
    const set = overridesFromForm({ maxTokens: '300', confidenceThreshold: '85' });
    expect(set).toEqual({ configOverrides: { maxTokens: 300 }, thresholdOverrides: { confidenceThreshold: 85 } });
    expect(overrideFormFrom(set)).toEqual({ maxTokens: '300', confidenceThreshold: '85' });
  });
  it('text that is not a whole number fails validation instead of being guessed', () => {
    expect(validateOverrides(overridesFromForm({ maxTokens: '12abc', confidenceThreshold: '' })).ok).toBe(false);
    expect(validateOverrides(overridesFromForm({ maxTokens: '', confidenceThreshold: '7.5' })).ok).toBe(false);
  });
});

describe('what the AI path reads', () => {
  it('maxTokens is a ceiling: the lower of the request and the override', () => {
    const model = { configOverrides: { maxTokens: 300 } };
    expect(effectiveMaxTokens(500, model)).toBe(300);
    expect(effectiveMaxTokens(200, model)).toBe(200);
    expect(effectiveMaxTokens(undefined, model)).toBe(300);
    expect(effectiveMaxTokens(500, undefined)).toBe(500);
    expect(effectiveMaxTokens(undefined, {})).toBeUndefined();
  });
  it('the confidence threshold is the model’s own when set, else the organisation’s', () => {
    expect(effectiveConfidenceThreshold(75, { thresholdOverrides: { confidenceThreshold: 90 } })).toBe(90);
    expect(effectiveConfidenceThreshold(75, { thresholdOverrides: { confidenceThreshold: 0 } })).toBe(0);
    expect(effectiveConfidenceThreshold(75, {})).toBe(75);
    expect(effectiveConfidenceThreshold(75, null)).toBe(75);
  });
});

describe('applyModelChanges with overrides', () => {
  const entry = GLOBAL_MODEL_CATALOG[0];
  const adoption: ModelAdoption = {
    organisationId: 'org1', modelId: entry.id, status: 'Active', isDefault: false, accuracy: 90, casesProcessed: 0, notes: '', adoptedAt: '2026-01-01',
  };

  it('stores valid overrides on the adoption and shows them in the joined model', () => {
    const r = applyModelChanges(entry, adoption, { configOverrides: { maxTokens: 400 }, thresholdOverrides: { confidenceThreshold: 82 } });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.configOverrides).toEqual({ maxTokens: 400 });
      expect(joinModel(entry, r.data).thresholdOverrides).toEqual({ confidenceThreshold: 82 });
    }
  });
  it('refuses an invalid override and leaves the adoption alone', () => {
    const r = applyModelChanges(entry, adoption, { configOverrides: { maxTokens: 5 } });
    expect(r).toEqual({ ok: false, error: 'INVALID_OVERRIDE' });
  });
  it('empty sections clear the overrides', () => {
    const withOverrides = { ...adoption, configOverrides: { maxTokens: 400 }, thresholdOverrides: { confidenceThreshold: 80 } };
    const r = applyModelChanges(entry, withOverrides, { configOverrides: {}, thresholdOverrides: {} });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.configOverrides).toBeUndefined();
      expect(r.data.thresholdOverrides).toBeUndefined();
    }
  });
  it('changing one section keeps the other', () => {
    const withOverrides = { ...adoption, configOverrides: { maxTokens: 400 }, thresholdOverrides: { confidenceThreshold: 80 } };
    const r = applyModelChanges(entry, withOverrides, { thresholdOverrides: { confidenceThreshold: 60 } });
    expect(r.ok && r.data.configOverrides).toEqual({ maxTokens: 400 });
    expect(r.ok && r.data.thresholdOverrides).toEqual({ confidenceThreshold: 60 });
  });
  it('platform fields stay read-only', () => {
    expect(applyModelChanges(entry, adoption, { name: 'Other' })).toEqual({ ok: false, error: 'CATALOG_FIELDS_READ_ONLY' });
  });
});
