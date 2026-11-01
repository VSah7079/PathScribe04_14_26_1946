// src/services/styleRules/touchLayout.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 735 (Station Touch Specification, acceptance 5): automated checks so later batches don't undo the touch
// work on the station screens (Grossing, Embedding, Microtome, Slide Distribution, Add-On Order Builder, Batch
// Management). The measurements themselves are taken by the re-audit; these hold the rules that produce them.
//
// If this fails: a station screen lost its touch layout, its shared scan field, a window lost its dialog role, a
// drag-only reorder came back, or the touch layout's sizes were lowered. See docs/product/STATION_TOUCH.md.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');

/** The station screens' page folders (touch spec §1). */
const STATION_DIRS = [
  'pages/GrossingWorkspacePage', 'pages/GrossingScreenPage', 'pages/EmbeddingStationPage', 'pages/MicrotomyWorkstationPage',
  'pages/SlideDistributionStationPage', 'pages/AddOnOrderPage', 'pages/BatchManagement',
];
/** The routes that show them. */
const STATION_ROUTE_PAGES = [
  'GrossingWorkspacePage', 'GrossingScreenPage', 'EmbeddingStationPage', 'MicrotomyWorkstationPage',
  'SlideDistributionStationPage', 'AddOnOrderPage', 'BatchManagementPage',
];
/** The pages whose scan field is the shared one (T1). */
const SCAN_PAGES = [
  'pages/GrossingWorkspacePage/GrossingWorkspacePage.tsx', 'pages/EmbeddingStationPage/EmbeddingStationPage.tsx',
  'pages/MicrotomyWorkstationPage/MicrotomyWorkstationPage.tsx', 'pages/SlideDistributionStationPage/SlideDistributionStationPage.tsx',
  'pages/AddOnOrderPage/AddOnOrderPage.tsx', 'pages/BatchManagement/BatchManagementPage.tsx',
];

function tsx(dir: string): string[] {
  return readdirSync(join(SRC, dir)).flatMap(name => {
    const rel = `${dir}/${name}`;
    if (statSync(join(SRC, rel)).isDirectory()) return tsx(rel);
    return name.endsWith('.tsx') && !name.includes('.test.') ? [rel] : [];
  });
}

describe('station screens stay touch-ready (touch spec, Batch 735)', () => {
  it('every station route is wrapped in the touch layout', () => {
    const app = read('SignedInApp.tsx');
    for (const page of STATION_ROUTE_PAGES) expect(app, page).toMatch(new RegExp(`<TouchLayoutScope><${page} />`));
  });

  it('the touch layout keeps 44 px targets, 48 px primary actions, 8 px gaps and 16 px field text', () => {
    const css = read('components/Touch/touchLayout.css');
    const rule = (selectorStart: string) => css.slice(css.indexOf(selectorStart), css.indexOf('}', css.indexOf(selectorStart)));
    const targets = rule('.ps-touch :is(button, [role="button"]');
    expect(targets).toMatch(/min-height:\s*44px/);
    expect(targets).toMatch(/min-width:\s*44px/);
    expect(targets).toMatch(/margin:\s*4px/);
    const fields = rule('.ps-touch :is(input:not');
    expect(fields).toMatch(/font-size:\s*16px/);
    expect(fields).toMatch(/min-height:\s*44px/);
    expect(rule('.ps-touch :is(button[class*="primary"]')).toMatch(/min-height:\s*48px/);
    expect(rule('.ps-touch label:has(> input[type="checkbox"])')).toMatch(/min-height:\s*44px/);
  });

  it('the header keeps 44 px buttons and 16 px search text', () => {
    const css = read('components/Touch/touchChrome.css');
    expect(css).toMatch(/\.ps-navbar-station-btn[^{]*\{\s*min-height:\s*44px;\s*min-width:\s*44px;/);
    expect(css).toMatch(/\.ps-search-input--compact \{ font-size: 16px; min-height: 44px; \}/);
    expect(read('components/NavBar/NavBar.tsx')).toContain("import '../Touch/touchChrome.css';");
  });

  it('every station scan field is the shared one (no on-screen keyboard, focus kept)', () => {
    for (const page of SCAN_PAGES) {
      const src = read(page);
      expect(src, page).toContain('<StationScanField');
      expect(src, page).not.toMatch(/scanPlaceholder'\)[^\n]*\n?[^\n]*<\/form>/);
    }
    const field = read('components/Workstation/StationScanField.tsx');
    expect(field).toContain('inputMode={scanFieldInputMode(typing)}');
    expect(field).toContain('useScanFieldFocus(');
  });

  it('every window on a station screen is a dialog', () => {
    const bad: string[] = [];
    for (const dir of STATION_DIRS) for (const f of tsx(dir)) {
      const lines = read(f).split('\n');
      lines.forEach((l, i) => {
        if (/<div className="ps-overlay/.test(l) && !/aria-modal="true"/.test(lines[i + 1] ?? '')) bad.push(`${f}:${i + 2}`);
      });
    }
    expect(bad).toEqual([]);
  });

  it('nothing is drag-only: a draggable list also has Move up and Move down', () => {
    const bad: string[] = [];
    for (const dir of STATION_DIRS) for (const f of tsx(dir)) {
      const src = read(f);
      if (/draggable=/.test(src) && !/moveIdBy\(/.test(src)) bad.push(f);
    }
    expect(bad).toEqual([]);
  });

  it('required reasons on the station windows offer tap-to-pick reasons', () => {
    for (const f of [
      'pages/MicrotomyWorkstationPage/components/BlockExhaustedControl.tsx', 'pages/BatchManagement/BatchReasonModal.tsx',
      'pages/AddOnOrderPage/components/OrderTrackingDashboard.tsx', 'pages/AddOnOrderPage/components/ExhaustedBlockChoices.tsx',
    ]) expect(read(f), f).toContain('<QuickReasonPicks');
  });
});
