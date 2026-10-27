// Batch 652: the report footer barcode must print solid black (scannable), whatever the watermark's colour.
// The PDF renderer is covered in functions/test_main.py; this covers the browser-print path's CSS.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

describe.each([
  ['the report page print window', 'pages/SynopticReportPage/SynopticReportPage.tsx'],
  ['the report preview stylesheet', 'pathscribe.css'],
])('%s', (_name, file) => {
  const css = read(file);
  const rules = css.split('\n').filter(l => l.includes('.rp-doc-reference-barcode svg')).join('\n');

  it('forces the footer barcode to full opacity, no filter, exact print colour', () => {
    expect(rules).toMatch(/opacity:\s*1/);
    expect(rules).toMatch(/filter:\s*none/);
    expect(rules).toMatch(/print-color-adjust:\s*exact/);
  });

  it('forces the bars to solid black', () => {
    expect(rules).toMatch(/svg path\s*\{[^}]*stroke:\s*#000\s*!important/);
  });
});

describe('the watermark never shares the barcode\'s colour', () => {
  it('the print window draws the watermark as its own element, not as a style on the footer', () => {
    const page = read('pages/SynopticReportPage/SynopticReportPage.tsx');
    expect(page).toMatch(/\.rp-print-watermark\s*\{[^}]*rgba\(/);
    expect(page).not.toMatch(/\.rp-doc-reference[^{]*\{[^}]*rgba\(/);
  });
});
