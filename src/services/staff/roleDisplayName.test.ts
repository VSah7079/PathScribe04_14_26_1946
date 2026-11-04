import { describe, it, expect } from 'vitest';
import { roleDisplayName } from './roleDisplayName';

describe('roleDisplayName (Batch 658)', () => {
  it('tidies a stored role name and keeps one the laboratory already capitalised', () => {
    expect(roleDisplayName('pathologist')).toBe('Pathologist');
    expect(roleDisplayName('pathology-assistant')).toBe('Pathology Assistant');
    expect(roleDisplayName('Lab Director')).toBe('Lab Director');
    expect(roleDisplayName('PA')).toBe('PA');
  });
  it('empty or missing gives an empty string', () => {
    expect(roleDisplayName(undefined)).toBe('');
    expect(roleDisplayName('  ')).toBe('');
  });
});
