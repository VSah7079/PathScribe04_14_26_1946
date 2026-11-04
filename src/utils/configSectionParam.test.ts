import { describe, it, expect } from 'vitest';
import { pickConfigSection } from './configSectionParam';

describe('pickConfigSection (Batch 449)', () => {
  const ids = ['templates', 'parts', 'routing'] as const;
  it('opens the inner tab the address names', () => {
    expect(pickConfigSection('?tab=templates&section=routing', ids)).toBe('routing');
  });
  it('falls back to the first for a missing or unknown section', () => {
    expect(pickConfigSection('?tab=templates', ids)).toBe('templates');
    expect(pickConfigSection('?tab=templates&section=nope', ids)).toBe('templates');
  });
});
