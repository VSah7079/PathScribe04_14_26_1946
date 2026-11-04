import { describe, it, expect } from 'vitest';
import { checkIcdO3Entry, simulatedIcdoSearch, simulatedIcd11Search, isSimulatedResult } from './simulatedCodeLookup';

describe('simulated code lookup', () => {
  it('finds ICD-O and ICD-11 samples, labelled simulated', () => {
    const a = simulatedIcdoSearch('breast');
    expect(a.some(r => r.code === 'C50.9')).toBe(true);
    expect(a.every(isSimulatedResult)).toBe(true);
    expect(simulatedIcd11Search('2C6')[0].code).toBe('2C60');
    expect(simulatedIcdoSearch('')).toEqual([]);
  });
  it('accepts valid morphology with a behaviour digit', () => {
    expect(checkIcdO3Entry('8500/3')).toMatchObject({ ok: true, kind: 'morphology', behaviour: 'Malignant, primary site' });
    expect(checkIcdO3Entry(' 8500/2 ')).toMatchObject({ ok: true });
  });
  it('rejects a behaviour digit that is not 0, 1, 2, 3, 6 or 9', () => {
    expect(checkIcdO3Entry('8500/4')).toEqual({ ok: false, reason: 'behaviour' });
    expect(checkIcdO3Entry('8500/7')).toEqual({ ok: false, reason: 'behaviour' });
  });
  it('accepts topography and rejects malformed input', () => {
    expect(checkIcdO3Entry('c50.9')).toMatchObject({ ok: true, kind: 'topography', code: 'C50.9' });
    expect(checkIcdO3Entry('C99')).toEqual({ ok: false, reason: 'format' });
    expect(checkIcdO3Entry('85003')).toEqual({ ok: false, reason: 'format' });
    expect(checkIcdO3Entry('')).toEqual({ ok: false, reason: 'empty' });
  });
});
