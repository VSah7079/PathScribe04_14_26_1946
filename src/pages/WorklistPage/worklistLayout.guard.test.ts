// src/pages/WorklistPage/worklistLayout.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 416 (Pete: "too much dead space in the worklist"). The Worklist table
// fills the space below the tiles by CSS layout, and the page fills the area
// under the nav bar. Two earlier mistakes this guards against:
//   • the page was sized to the whole window (100vh), so its bottom 105 px sat
//     below the window, clipped by the app's outlet;
//   • the table's height was measured in script (useFillViewportHeight), and on
//     this fixed-height page the measurement never re-ran, so it stuck at its
//     400 px starting value and left empty space under the rows.
// (Checked in a browser at 1920×945: table bottom 12 px above the window edge.)
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = resolve(__dirname, '../..');
const css = readFileSync(resolve(src, 'pathscribe.css'), 'utf8');
const page = readFileSync(resolve(__dirname, 'WorklistPage.tsx'), 'utf8');

const rule = (selector: string) => {
  const m = css.match(new RegExp(`(^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`));
  return m?.[2] ?? '';
};

describe('Worklist layout fills the screen (Batch 416)', () => {
  it('the page fills the area under the nav bar, not the whole window', () => {
    const r = rule('.ps-wl-page');
    expect(r).toMatch(/height:\s*100%/);
    expect(r).not.toMatch(/100vh|--app-height/);
  });

  it('the table wrapper grows into the space left below the tiles', () => {
    expect(rule('.ps-table-scroll-wrap--fill')).toMatch(/flex:\s*1/);
    expect(rule('.ps-table-scroll-wrap--fill > .wl-container')).toMatch(/flex:\s*1/);
    expect(page).toContain('ps-table-scroll-wrap--fill');
  });

  it('the table is not given a measured pixel height', () => {
    expect(page).not.toContain('useFillViewportHeight');
    expect(page).not.toMatch(/tableHeight=/);
  });
});
