import { describe, it, expect } from 'vitest';
import { exampleProfile, normalizeFieldList, seedProfiles, validateProfile, EXAMPLE_PROFILE_ID } from './epathProfile';

// Batch 620 (part E, PS-800): the state profile shape and its validation.
const good = { state: 'AZ', requiredFields: ['PID-3'], optionalFields: ['PV1-2'], transport: 'sftp' as const, validationRules: ['finalReportOnly' as const], extensions: [], facilityBasis: 'reading' as const };

describe('the shipped example', () => {
  it('is the only seed, marked example, with no real state', () => {
    const seed = seedProfiles('t');
    expect(seed).toHaveLength(1);
    expect(seed[0]).toMatchObject({ id: EXAMPLE_PROFILE_ID, example: true, state: 'XX' });
    expect(validateProfile(exampleProfile('t'))).toEqual([]);
  });
  it('defaults to the technical-component facility and never names a real state in its text', () => {
    expect(exampleProfile('t').facilityBasis).toBe('technicalComponent');
    expect(exampleProfile('t').name).toBe('');
  });
});

describe('validateProfile', () => {
  it('accepts a good profile', () => expect(validateProfile(good)).toEqual([]));
  it.each([['az'], ['A'], ['AZZ'], ['XX']])('refuses the state %s (XX is for the example only)', state => {
    expect(validateProfile({ ...good, state })).toContain('stateInvalid');
  });
  it('refuses a field that is not SEG-n, and MSH fields', () => {
    expect(validateProfile({ ...good, requiredFields: ['PID3'] })).toContain('fieldInvalid');
    expect(validateProfile({ ...good, optionalFields: ['MSH-5'] })).toContain('fieldInvalid');
  });
  it('refuses a field that is both required and optional', () => {
    expect(validateProfile({ ...good, optionalFields: ['PID-3'] })).toContain('fieldOverlap');
  });
  it('refuses an unknown transport, check, or basis', () => {
    expect(validateProfile({ ...good, transport: 'fax' as never })).toContain('transportInvalid');
    expect(validateProfile({ ...good, validationRules: ['nope' as never] })).toContain('ruleInvalid');
    expect(validateProfile({ ...good, facilityBasis: 'x' as never })).toContain('facilityBasisInvalid');
  });
  it('a fixed extension needs its value; an extension needs a real field', () => {
    expect(validateProfile({ ...good, extensions: [{ field: 'OBR-4', mode: 'fixed' }] })).toContain('fixedValueRequired');
    expect(validateProfile({ ...good, extensions: [{ field: 'OBR', mode: 'required' }] })).toContain('extensionInvalid');
    expect(validateProfile({ ...good, extensions: [{ field: 'OBR-4', mode: 'fixed', value: 'V' }] })).toEqual([]);
  });
});

describe('normalizeFieldList', () => {
  it('upper-cases, trims, de-duplicates and drops empties', () => {
    expect(normalizeFieldList([' pid-3', 'PID-3', '', 'obr-4'])).toEqual(['PID-3', 'OBR-4']);
  });
});
