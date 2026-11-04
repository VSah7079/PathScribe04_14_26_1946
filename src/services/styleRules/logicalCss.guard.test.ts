// src/services/styleRules/logicalCss.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 615 (PS-293): the stylesheet uses logical properties, so a right-to-left
// language mirrors the layout from <html dir>. A physical left/right property
// would not mirror, and neither would a four-value shorthand whose right and
// left differ (padding: 0 8px 0 0): that is written with -block / -inline.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PHYSICAL = /(?<![\w-])(margin-(?:left|right)|padding-(?:left|right)|border-(?:left|right)(?:-(?:width|color|style))?|border-(?:top|bottom)-(?:left|right)-radius|(?:scroll-margin|scroll-padding)-(?:left|right)|left|right)\s*:|text-align\s*:\s*(?:left|right)\b|float\s*:\s*(?:left|right)\b/;

const parts = (v: string): string[] => v.replace(/\s*!important/, '').trim().match(/(?:[^\s(]+\([^)]*\)|\S+)/g) ?? [];
/** padding / margin with four values whose right and left differ, or a border-radius whose left and right corners differ. */
function asymmetricShorthand(line: string): boolean {
  for (const m of line.matchAll(/(?<![\w-])(padding|margin|border-radius)\s*:\s*([^;}]*)/g)) {
    const p = parts(m[2]);
    if (p.length !== 4) continue;
    if (m[1] === 'border-radius' ? (p[0] !== p[1] || p[3] !== p[2]) : p[1] !== p[3]) return true;
  }
  return false;
}

describe('the stylesheets use logical properties (Batch 615, PS-293)', () => {
  for (const file of ['pathscribe.css', 'index.css']) {
    it(`${file} has no physical left/right property`, () => {
      const offenders = readFileSync(resolve(SRC, file), 'utf8').split('\n')
        .map((line, i) => ({ line: line.replace(/\/\*.*?\*\//g, ''), n: i + 1 }))
        .filter(({ line }) => PHYSICAL.test(line) || asymmetricShorthand(line))
        .map(({ line, n }) => `${file}:${n}: ${line.trim()}`);
      expect(offenders).toEqual([]);
    });
  }

  it('the identifiers and physical layouts stay left to right', () => {
    const css = readFileSync(resolve(SRC, 'pathscribe.css'), 'utf8');
    for (const sel of ['[data-phi="accession"]', '[data-phi="mrn"]', '.ps-organmap-svg', '.ps-designer-canvas', '.mb-plate-grid']) {
      expect(css).toContain(sel);
    }
  });
});
