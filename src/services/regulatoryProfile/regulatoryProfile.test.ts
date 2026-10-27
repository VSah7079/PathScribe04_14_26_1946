import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseRegulatoryProfile, capabilitiesFor, regulatoryProfile, showsConfidence } from './regulatoryProfile';
import { evaluateClinicalMismatch, DEFAULT_CLINICAL_MISMATCH_RULES } from '../clinical/clinicalMismatchRules';

afterEach(() => vi.unstubAllEnvs());

describe('regulatory profile (Batch 679)', () => {
  it('defaults to documentation, also for unset or mistyped values', () => {
    expect(parseRegulatoryProfile(undefined)).toBe('documentation');
    expect(parseRegulatoryProfile('clinical-suport')).toBe('documentation');
    expect(regulatoryProfile()).toBe('documentation');
    expect(showsConfidence()).toBe(false);
  });
  it('clinical_support is recognised in several spellings', () => {
    for (const v of ['clinical_support', 'Clinical-Support', ' clinical support ']) expect(parseRegulatoryProfile(v)).toBe('clinical_support');
  });
  it('the setting switches the capabilities', () => {
    vi.stubEnv('VITE_REGULATORY_PROFILE', 'clinical_support');
    expect(showsConfidence()).toBe(true);
    expect(capabilitiesFor(regulatoryProfile())).toEqual({ showConfidenceScores: true, scoreDrivenActions: true, scoreDrivenSuppression: true });
  });
  it('documentation: a high score never holds sign-out and a low one is still shown as a plain flag', () => {
    for (const confidence of [41, 95]) {
      const o = evaluateClinicalMismatch({ kind: 'unexpected-malignancy', confidence, source: 'ai' }, [], DEFAULT_CLINICAL_MISMATCH_RULES, 'documentation');
      expect(o).toMatchObject({ risk: 'low', display: true, holdsSignOut: false, logToQa: true, action: null });
    }
  });
  it('clinical_support keeps the thresholds and the block (nothing was removed)', () => {
    const hi = evaluateClinicalMismatch({ kind: 'unexpected-malignancy', confidence: 95, source: 'ai' }, [], DEFAULT_CLINICAL_MISMATCH_RULES, 'clinical_support');
    expect(hi.holdsSignOut).toBe(true);
    const lo = evaluateClinicalMismatch({ kind: 'unexpected-malignancy', confidence: 10, source: 'ai' }, [], DEFAULT_CLINICAL_MISMATCH_RULES, 'clinical_support');
    expect(lo.display).toBe(false);
  });
});
