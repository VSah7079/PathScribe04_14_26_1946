// Batch 640: the recall wording a lab administrator can write, and the per-country windows.
import { describe, it, expect } from 'vitest';
import { fillRecallWording, recallWordingProblem, resolveRecallWording, withRecallWording } from './recallWording';
import { DEFAULT_RECALL_WINDOWS, resolveRecallWindowsFor } from './recallWindows';

describe('recall wording', () => {
  const cfg = { AU: { clinician_lbc: { en: ' Custom {{type}} text ', fr: '' } } } as const;
  it('uses the saved text for the country, kind and language (trimmed), else the built-in text', () => {
    expect(resolveRecallWording(cfg, 'AU', 'clinician_lbc', 'en')).toBe('Custom {{type}} text');
    expect(resolveRecallWording(cfg, 'AU', 'clinician_lbc', 'en-AU')).toBe('Custom {{type}} text');
    expect(resolveRecallWording(cfg, 'AU', 'clinician_lbc', 'fr')).toBeUndefined();
    expect(resolveRecallWording(cfg, 'NZ', 'clinician_lbc', 'en')).toBeUndefined();
    expect(resolveRecallWording(undefined, 'AU', 'repeat_collection', 'en')).toBeUndefined();
  });
  it('fills {{type}} and {{next}} and leaves other text alone', () => {
    expect(fillRecallWording('HPV {{type}}; then {{ next }}; {{other}}', { type: 'type 16/18', next: 'colposcopy referral' })).toBe('HPV type 16/18; then colposcopy referral; {{other}}');
  });
  it('flags text that is too long or uses an unknown placeholder; empty is fine; repeat wording takes no placeholders', () => {
    expect(recallWordingProblem('', 'clinician_lbc')).toBeNull();
    expect(recallWordingProblem('x'.repeat(1001), 'clinician_lbc')).toBe('too-long');
    expect(recallWordingProblem('{{name}}', 'clinician_lbc')).toBe('unknown-placeholder');
    expect(recallWordingProblem('{{type}}', 'clinician_lbc')).toBeNull();
    expect(recallWordingProblem('{{type}}', 'repeat_collection')).toBe('unknown-placeholder');
  });
  it('an edit sets the text; emptying it removes the override and tidies empty branches', () => {
    const a = withRecallWording({}, 'NZ', 'repeat_collection', 'de', 'Neuer Text ');
    expect(a).toEqual({ NZ: { repeat_collection: { de: 'Neuer Text ' } } });
    expect(withRecallWording(a, 'NZ', 'repeat_collection', 'de', '  ')).toEqual({});
    expect(withRecallWording(a, 'NZ', 'repeat_collection', 'en', 'x')).toEqual({ NZ: { repeat_collection: { de: 'Neuer Text ', en: 'x' } } });
  });
});

describe('recall windows per country (Batch 640)', () => {
  it('a country\'s own window wins, then the shared one saved before Batch 640, then the default', () => {
    const shared = { urgent: { min: 1, max: 3 } };
    const byJ = { NZ: { urgent: { min: 2, max: 6 } } };
    expect(resolveRecallWindowsFor('NZ', byJ, shared).urgent).toEqual({ min: 2, max: 6 });
    expect(resolveRecallWindowsFor('AU', byJ, shared).urgent).toEqual({ min: 1, max: 3 });
    expect(resolveRecallWindowsFor('AU', undefined, undefined)).toEqual(DEFAULT_RECALL_WINDOWS);
    expect(resolveRecallWindowsFor('NZ', { NZ: { repeatNZ: { min: 4, max: 8 } } }, undefined).repeatNZ).toEqual({ min: 4, max: 8 });
  });
});
