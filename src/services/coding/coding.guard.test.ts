// Batch 594: the coding module stays pure data and rules: no browser storage, no UI, no mock or Firebase imports,
// and no reading of the clock (today's date is passed in). The mock* files are the browser adapters (Batch 595) and the *Instance.ts file that chooses between the mock and the API server's version (Batch 617) is the same kind of adapter; both are exempt.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
describe('services/coding stays pure', () => {
  for (const f of readdirSync(DIR).filter(n => n.endsWith('.ts') && !n.endsWith('.test.ts') && !n.startsWith('mock') && !n.endsWith('Instance.ts'))) {
    it(f, () => {
      const text = readFileSync(resolve(DIR, f), 'utf8');
      expect(text).not.toMatch(/localStorage|sessionStorage|from ['"]react['"]|firebase|\/mock[A-Z]/);
      expect(text).not.toMatch(/\bnew Date\(\)|Date\.now\(/);
    });
  }
});
