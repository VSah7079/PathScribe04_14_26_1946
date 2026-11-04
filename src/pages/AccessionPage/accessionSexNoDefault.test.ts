// Batch 661 (Pete, Oct 23, 2026): a new patient never defaults to a sex. The Accession form starts blank,
// resets blank, imports blank when an order has no sex, and Sex is a locked required field.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const text = readFileSync(resolve(__dirname, 'AccessionPage.tsx'), 'utf8');

describe('Accession never defaults sex', () => {
  it('starts, resets and imports blank', () => {
    expect(text).toMatch(/useState<'M' \| 'F' \| 'I' \| 'U' \| ''>\(''\)/);
    expect(text).toContain("setSex('')");
    expect(text).toContain("setSex(order.patient.sex ?? '')");
    expect(text).not.toMatch(/setSex\('[MFU]'\)/);
  });
  it('offers an unselected choice first', () => {
    expect(text).toMatch(/<option value="">\{t\('accessionPage\.demographics\.sexUnselected'\)\}<\/option>/);
  });
});
