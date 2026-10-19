import { describe, expect, it } from 'vitest';
import { addEntry, fromCaseCoding, toCaseCoding } from './caseCodingAdapter';
import { sameCode, type CodedEntry } from './codedEntry';
import { activeSystems, defaultCodePolicy, entriesOutsidePolicy, missingRequiredSystems, requiredSystems, roleOn, type CodeSystemPolicy } from './codeSystemPolicy';

const e = (system: string, code: string, extra: Partial<CodedEntry> = {}): CodedEntry => ({ system, code, source: 'typed', ...extra });

describe('caseCodingAdapter', () => {
  it('reads the older fields as legacy entries', () => {
    const out = fromCaseCoding({ icd10: ['C50.9'], icd11: ['2C60'], icdO: ['8500/3'], snomed: ['254837009'] });
    expect(out).toHaveLength(4);
    expect(out.every(x => x.source === 'legacy')).toBe(true);
    expect(out.find(x => x.system === 'ICD11')?.code).toBe('2C60');
  });
  it('reads nothing from no coding, and skips blank codes', () => {
    expect(fromCaseCoding(undefined)).toEqual([]);
    expect(fromCaseCoding({ icd10: ['  ', 'D05.1'] })).toHaveLength(1);
  });
  it('writes entries back to the older fields and round-trips', () => {
    const original = { icd10: ['C50.9', 'D05.1'], icd11: ['2C60'], cpt: ['88305'] };
    const { coding, unrepresented } = toCaseCoding(fromCaseCoding(original));
    expect(coding).toEqual(original);
    expect(unrepresented).toEqual([]);
  });
  it('keeps a system the older fields cannot hold, instead of dropping it', () => {
    const { coding, unrepresented } = toCaseCoding([e('ICD12', 'ZZ99'), e('OPCS4', 'B27.1'), e('ICD10', 'C50.9')]);
    expect(coding).toEqual({ icd10: ['C50.9'] });
    expect(unrepresented.map(x => x.system)).toEqual(['ICD12', 'OPCS4']);
  });
  it('keeps an ICD-11 cluster as one value', () => {
    const { coding } = toCaseCoding([e('ICD11', '2C25.Y&XH0P4')]);
    expect(coding.icd11).toEqual(['2C25.Y&XH0P4']);
  });
});

describe('sameCode and addEntry', () => {
  it('treats the same code in a different system or release as different', () => {
    expect(sameCode(e('ICD10', 'C50.9'), e('ICD10', ' C50.9 '))).toBe(true);
    expect(sameCode(e('ICD10', 'C50.9'), e('ICD11', 'C50.9'))).toBe(false);
    expect(sameCode(e('ICD10', 'C50.9', { release: '2025' }), e('ICD10', 'C50.9', { release: '2026' }))).toBe(false);
  });
  it('does not add a duplicate and keeps the first entry source', () => {
    const first = e('ICD10', 'C50.9', { source: 'ai', ai: { model: 'm', confidence: 0.9 } });
    const out = addEntry([first], e('ICD10', 'C50.9', { source: 'typed' }));
    expect(out).toHaveLength(1);
    expect(out[0].source).toBe('ai');
  });
});

describe('codeSystemPolicy', () => {
  const transition: CodeSystemPolicy = { rules: [
    { system: 'ICD10', role: 'required' },
    { system: 'ICD11', role: 'off' },
    { system: 'ICD11', role: 'optional', from: '2027-01-01' },
    { system: 'ICD11', role: 'required', from: '2028-07-01' },
  ] };
  it('moves ICD-11 from off to optional to required by date, with no code change', () => {
    expect(roleOn(transition, 'ICD11', '2026-10-16')).toBe('off');
    expect(roleOn(transition, 'ICD11', '2027-03-01')).toBe('optional');
    expect(roleOn(transition, 'ICD11', '2028-07-01')).toBe('required');
    expect(requiredSystems(transition, '2028-08-01')).toEqual(['ICD10', 'ICD11']);
  });
  it('lists only the systems that are not off', () => {
    expect(activeSystems(transition, '2026-10-16')).toEqual(['ICD10']);
    expect(activeSystems(transition, '2027-03-01')).toEqual(['ICD10', 'ICD11']);
  });
  it('names a required system with no code, and ignores blank codes', () => {
    expect(missingRequiredSystems([e('ICD10', 'C50.9')], transition, '2028-08-01')).toEqual(['ICD11']);
    expect(missingRequiredSystems([e('ICD10', 'C50.9'), e('ICD11', ' ')], transition, '2028-08-01')).toEqual(['ICD11']);
    expect(missingRequiredSystems([e('ICD10', 'C50.9'), e('ICD11', '2C60')], transition, '2028-08-01')).toEqual([]);
  });
  it('flags a code in a system that is off', () => {
    expect(entriesOutsidePolicy([e('ICD11', '2C60'), e('ICD10', 'C50.9')], transition, '2026-10-16').map(x => x.system)).toEqual(['ICD11']);
  });
  it('accepts a system nobody has heard of yet, through data only', () => {
    const future: CodeSystemPolicy = { rules: [{ system: 'ICD12', role: 'required', from: '2040-01-01' }] };
    expect(roleOn(future, 'ICD12', '2039-12-31')).toBe('off');
    expect(missingRequiredSystems([], future, '2040-01-01')).toEqual(['ICD12']);
    expect(toCaseCoding([e('ICD12', 'AB1')]).unrepresented).toHaveLength(1);
  });
  it('the default policy asks for nothing and keeps ICD-11 off, as today', () => {
    const d = defaultCodePolicy('US');
    expect(requiredSystems(d, '2026-10-16')).toEqual([]);
    expect(roleOn(d, 'ICD11', '2026-10-16')).toBe('off');
    expect(roleOn(d, 'ICD10', '2026-10-16')).toBe('optional');
  });
});
