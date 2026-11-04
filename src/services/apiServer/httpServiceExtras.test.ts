import { describe, expect, it } from 'vitest';
import { notOffered } from './httpServiceExtras';

describe('httpServiceExtras', () => {
  it('answers a fixed code for a demo-only method', async () => {
    expect(await notOffered()).toEqual({ ok: false, error: 'NOT_SUPPORTED' });
  });
});
