// Batch 621: the settings rules, the text hash and the cache test for AI extraction of historical reports.
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_HISTORY_EXTRACTION, hashSourceText, isCurrent, normaliseSourceText, resolveHistoryExtraction, summariseAccuracy, validateSetting,
  type HistoryExtraction, type HistoryExtractionSetting,
} from './historyExtraction';

const setting = (facilityId: string | null, enabled: boolean): HistoryExtractionSetting => ({ id: `s-${facilityId}`, facilityId, enabled, updatedAt: '' });
const extraction = (over: Partial<HistoryExtraction> = {}): HistoryExtraction =>
  ({ sourceCaseId: 'S26-1', sourceTextHash: 'h', status: 'extracted', fields: [], extractedAt: '', verification: 'ai-unverified', ...over });

describe('settings: off by default, enterprise with a facility override', () => {
  it('is off when nothing is stored', () => {
    expect(DEFAULT_HISTORY_EXTRACTION.enabled).toBe(false);
    expect(resolveHistoryExtraction([], 'fac-a')).toEqual({ enabled: false, source: 'default' });
  });
  it('follows the enterprise setting, and a facility with its own setting wins either way', () => {
    expect(resolveHistoryExtraction([setting(null, true)], 'fac-a')).toEqual({ enabled: true, source: 'enterprise' });
    expect(resolveHistoryExtraction([setting(null, true), setting('fac-a', false)], 'fac-a')).toEqual({ enabled: false, source: 'facility' });
    expect(resolveHistoryExtraction([setting(null, false), setting('fac-a', true)], 'fac-a')).toEqual({ enabled: true, source: 'facility' });
    expect(resolveHistoryExtraction([setting(null, false), setting('fac-a', true)], 'fac-b')).toEqual({ enabled: false, source: 'enterprise' });
  });
  it('a case with no known facility gets the enterprise setting', () => {
    expect(resolveHistoryExtraction([setting(null, true), setting('fac-a', false)], undefined).enabled).toBe(true);
  });
  it('only a true or false setting is valid', () => {
    expect(validateSetting({ enabled: true })).toEqual([]);
    expect(validateSetting({ enabled: 'yes' as unknown as boolean })).toEqual(['enabledInvalid']);
  });
});

describe('the source text hash', () => {
  const t = { diagnosis: 'Invasive ductal carcinoma, grade 2', microscopic: 'Tumour cells in nests.' };
  it('is stable, fixed length, and ignores spacing alone', () => {
    expect(hashSourceText(t)).toBe(hashSourceText({ diagnosis: '  Invasive ductal   carcinoma, grade 2 ', microscopic: 'Tumour cells\nin nests.' }));
    expect(hashSourceText(t)).toHaveLength(32);
  });
  it('changes when the text changes, and the two parts are not interchangeable', () => {
    expect(hashSourceText(t)).not.toBe(hashSourceText({ ...t, diagnosis: 'Invasive ductal carcinoma, grade 3' }));
    expect(hashSourceText({ diagnosis: 'a', microscopic: 'b' })).not.toBe(hashSourceText({ diagnosis: 'b', microscopic: 'a' }));
    expect(normaliseSourceText(t)).toContain('DIAGNOSIS:');
  });
});

describe('when a stored extraction answers', () => {
  it('only for the same text, and never a failure', () => {
    expect(isCurrent(extraction(), 'h')).toBe(true);
    expect(isCurrent(extraction(), 'other')).toBe(false);
    expect(isCurrent(extraction({ status: 'failed', failure: 'aiError' }), 'h')).toBe(false);
    expect(isCurrent(extraction({ status: 'noTemplate' }), 'h')).toBe(true);
    expect(isCurrent(null, 'h')).toBe(false);
  });
});

describe('accuracy counts', () => {
  it('counts extractions made, fields extracted and flags raised', () => {
    const f = { fieldId: 'a', label: 'A', value: '1', display: '1' };
    const out = summariseAccuracy([extraction({ fields: [f, f] }), extraction({ fields: [f] }), extraction({ status: 'failed', failure: 'aiError' })],
      [{ id: 'x', sourceCaseId: 'S26-1', fieldId: 'a', templateId: 't', sourceTextHash: 'h', flaggedBy: 'u', flaggedAt: '' }]);
    expect(out).toEqual({ extractions: 2, fieldsExtracted: 3, flagged: 1 });
  });
});
