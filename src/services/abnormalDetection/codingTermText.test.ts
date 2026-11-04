import { describe, it, expect } from 'vitest';
import { codingTermText } from './codingTermText';

describe('codingTermText (Batch 652)', () => {
  it('puts TEST- terms in the demonstration group and real terms in the other', () => {
    const r = codingTermText([
      { system: 'TEST-SNOMED', code: 'TEST-SNOMED-000001', display: 'a' },
      { system: 'SNOMED-CT', code: '100', display: 'b' },
    ]);
    expect(r.demo).toBe('TEST-SNOMED-000001 (a)');
    expect(r.real).toBe('100 (b)');
  });
  it('is empty for no terms', () => {
    expect(codingTermText(undefined)).toEqual({ demo: '', real: '' });
  });
});
