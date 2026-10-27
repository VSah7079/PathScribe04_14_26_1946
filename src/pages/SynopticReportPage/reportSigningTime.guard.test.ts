// Batch 661: the surgical report request carries the signing time (finalizedAt) as `signedAt`, so the renderer
// stamps a signed report with its signing date and a re-render of the same report is the same file.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('surgical report request', () => {
  it('sends signedAt from the case finalizedAt, and only when the case has one', () => {
    const text = readFileSync(resolve(__dirname, 'SynopticReportPage.tsx'), 'utf8');
    expect(text).toContain('...(caseData.finalizedAt ? { signedAt: caseData.finalizedAt } : {}),');
  });
});
