import { describe, it, expect } from 'vitest';
import { crashTestRequested } from './crashTest';

describe('crashTestRequested (Batch 502)', () => {
  it('only the named boundary, and only when enabled', () => {
    expect(crashTestRequested('?ps-crash-test=panel:organ-map', 'panel:organ-map', true)).toBe(true);
    expect(crashTestRequested('?ps-crash-test=panel:organ-map', 'route', true)).toBe(false);
    expect(crashTestRequested('?ps-crash-test=route', 'route', false)).toBe(false);
    expect(crashTestRequested('', 'route', true)).toBe(false);
  });
});
