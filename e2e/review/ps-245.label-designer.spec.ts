// e2e/review/ps-245.label-designer.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-245: "Label Designer — drag-and-drop, admin-configurable field layout
// across label types (mirroring the Report Template Builder)". Review test
// plan, against the demo (Vite dev server, localStorage data) as Pete Nimmo:
//   1. Sign in as Pete and open Configuration → System → Workstation &
//      Hardware → Label Designer.                                    automated
//   2. Pick a Label Type (Requisition Label) and Scope (Fenwick General
//      Hospital (override)); drag a field from Available Fields onto the
//      label. A real HTML5 drag (locator.dragTo): Patient Name lands where it
//      is dropped (X 10 mm, Y 20 mm within one 0.4 px rounding step), and MRN
//      dropped on the label's bottom-right corner is held inside it
//      (X 81.6, Y 146.4 exactly: 101.6 × 152.4 mm label, 20 × 6 mm field). automated
//   3. Select the field and drag a corner handle: the opposite edge stays put
//      and the field cannot go past the label edge or below 2 mm. Real mouse
//      drags (page.mouse) on the se, nw, e and n handles from X 10 / Y 20 /
//      W 20 / H 6: se +40 px,+8 px → W 30, H 8 (X, Y unchanged); nw +200 px
//      → X 38, W 2 (right edge stays at 40, minimum 2 mm); e +1000 px → W
//      63.6 (right edge at the label's 101.6); n −1000 px → Y 0, H 28 (bottom
//      stays at 28).                                                 automated
//   4. Type an X or Width value in the Inspector that would push it off the
//      label and press Enter: it is held inside the label (W 20 then X 95 →
//      X 81.6; Width 50 → W 20; Y 500 → Y 124.4).                     automated
//   5. Click Save Layout ("Facility override saved."), then Export ZPL and
//      check ZPL text appears under Exported ZPL (exact ^FO positions for the
//      two fields at 203 dpi). Also: the override is kept after a reload, and
//      the Enterprise Default scope is not changed by it.             automated
//   6. If an older layout has a field past the edge: the test seeds one (the
//      demo has none) as the Enterprise Default requisition layout; it is
//      outlined (ps-designer-field--outside) with the warning, Save is
//      refused with the out-of-bounds message and nothing is stored, and Fit
//      to label fixes it (X 90 / W 30 → X 71.6 / W 30), after which it saves. automated
//   7. Note: a saved layout does not yet drive real printer output (possible
//      follow-up ticket).                       needs a person (a decision, not a test)
// Expected: layouts can be designed and saved per enterprise/facility in mm,
// with no field allowed off the label.
// Found when this spec was written (Oct 15, 2026; left failing as soft checks,
// reported):
//   • Step 4: a typed Width the label can't take (50 with 20 mm left) is held
//     at 20 on the label, but the Inspector keeps showing 50 (MmInput only
//     re-syncs when the stored value changes, and a clamp to the same value
//     doesn't change it).
//   • Steps 3–4: the canvas is drawn 0.5 mm smaller than the label: with
//     the app-wide box-sizing: border-box, .ps-designer-canvas's 1 px border
//     sits inside its --canvas-w/-h, so a field at the label's edge (e.g. X
//     81.6 + W 20 = 101.6 mm) is drawn 1 px over the border and 1 px outside
//     the canvas. Drops are also measured from the border's outer edge (1 px,
//     0.25 mm, off).
// Not automated: whether the exported ZPL prints and scans correctly on a real
// label (Labelary or a printer) — needs a person.
// Selectors: English texts from src/i18n/locales/en.json (labelDesignerPage.*,
// systemTab.*) and the screen's own ids and .ps-designer-* classes
// (pages/LabelDesignerPage/LabelDesignerPage.tsx).
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5303 npx playwright test --project=chromium \
//        e2e/review/ps-245.label-designer.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Locator, type Page } from '@playwright/test';
import { signIn, clearDemoKeys } from './helpers';

// en.json texts the screen renders.
const T = {
  configuration: 'Configuration',
  group: 'Workstation & Hardware',               // systemTab.groups.workstationHardware
  section: 'Label Designer',                     // systemTab.sections.labelDesigner / labelDesignerPage.title
  availableFields: 'Available Fields',           // labelDesignerPage.availableFieldsHeading
  inspector: 'Inspector',                        // labelDesignerPage.inspectorHeading
  enterpriseDefault: 'Enterprise Default',       // labelDesignerPage.enterpriseDefaultOption
  x: 'X (mm)',                                   // labelDesignerPage.field.x
  y: 'Y (mm)',                                   // labelDesignerPage.field.y
  width: 'Width (mm)',                           // labelDesignerPage.field.width
  height: 'Height (mm)',                         // labelDesignerPage.field.height
  saveLayout: 'Save Layout',                     // labelDesignerPage.saveLayoutButton
  exportZpl: 'Export ZPL',                       // labelDesignerPage.exportZplButton (shown after "📤 ")
  exportedZpl: 'Exported ZPL',                   // labelDesignerPage.exportedZplHeading
  zplOutput: 'ZPL output',                       // a11y.fields.zplOutput (the textarea's name)
  fitToLabel: 'Fit to label',                    // labelDesignerPage.fitToLabelButton
  facilitySaved: 'Facility override saved.',     // labelDesignerPage.saveMessages.facilityOverrideSaved
  enterpriseSaved: 'Enterprise default saved.',  // labelDesignerPage.saveMessages.enterpriseDefaultSaved
  outOfBoundsSave: 'Not saved: a field goes past the edge of the label. Use “Fit to label”, or move or resize it.', // labelDesignerPage.saveMessages.outOfBounds
  outOfBoundsOne: '1 field goes past the edge of the label and would print off it.', // labelDesignerPage.outOfBoundsWarning_one
  canvasCaption: '101.6mm × 152.4mm — live preview using sample data', // labelDesignerPage.canvasCaption
};

// Requisition label: 4" × 6" (LABEL_TYPE_DEFAULT_SIZE_MM.requisition); a new field is 20 × 6 mm, font 2.6 mm.
const LABEL_W = 101.6;
const LABEL_H = 152.4;
const PX_PER_MM = 4; // services/labelDesigner/labelFieldGeometry.ts
const FACILITY_ID = 'c-fenwick-general';
const FACILITY_OPTION = 'Fenwick General Hospital (override)';
const LAYOUTS_KEY = 'pathscribe_mock_label_designer_layouts'; // mockStorage prefix + mockLabelLayoutService STORE_KEY
const REQUISITION_FIELDS = ['Accession Number', 'Patient Name', 'Date of Birth', 'MRN', 'Requesting Provider', 'Submitting Facility', 'Accession Barcode'];

// A taller window so the whole 152.4 mm (610 px) canvas and the palette are on screen together for the drags.
test.use({ viewport: { width: 1440, height: 1400 } });

const canvas = (page: Page) => page.locator('.ps-designer-canvas');
const fieldBox = (page: Page, sample: string) => canvas(page).locator('.ps-designer-field').filter({ hasText: sample });
const inspector = (page: Page) => page.locator('.ps-panel-box').filter({ has: page.locator('h3', { hasText: T.inspector }) });
const mm = (page: Page, label: string) => inspector(page).getByLabel(label, { exact: true });

/** Configuration → System → Workstation & Hardware → Label Designer, by clicking through. */
async function openLabelDesigner(page: Page) {
  await page.goto('/configuration?tab=system');
  await expect(page.locator('h1, h2').filter({ hasText: T.configuration }).first()).toBeVisible({ timeout: 30_000 });
  await page.locator('.ps-sub-tab-btn').filter({ hasText: T.group }).click();
  await expect(page.locator('.ps-sub-tab-btn.active')).toHaveText(T.group);
  await page.locator('.ps-confsys-nav-btn').filter({ hasText: T.section }).click();
  await expect(page.locator('.ps-confsys-nav-btn--active')).toContainText(T.section);
  await expect(page.locator('h1.ps-page-title'), 'the Label Designer heading').toHaveText(T.section);
  await expect(canvas(page), 'the label canvas').toBeVisible({ timeout: 15_000 });
}

/** The field's position and size as the Inspector shows them (mm). */
async function inspectorValues(page: Page) {
  return {
    x: Number(await mm(page, T.x).inputValue()),
    y: Number(await mm(page, T.y).inputValue()),
    w: Number(await mm(page, T.width).inputValue()),
    h: Number(await mm(page, T.height).inputValue()),
  };
}

/** Types a number into an Inspector box and presses Enter. */
async function typeMm(page: Page, label: string, value: number) {
  const box = mm(page, label);
  await box.fill(String(value));
  await box.press('Enter');
}

/** A real mouse drag of a resize handle on the selected field by (dx, dy) screen pixels. */
async function dragHandle(page: Page, field: Locator, handle: string, dx: number, dy: number) {
  const h = field.locator(`.ps-designer-handle[data-handle="${handle}"]`);
  await expect(h, `the ${handle} handle`).toBeVisible();
  const b = (await h.boundingBox())!;
  const sx = b.x + b.width / 2;
  const sy = b.y + b.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + dx / 2, sy + dy / 2, { steps: 4 });
  await page.mouse.move(sx + dx, sy + dy, { steps: 4 });
  await page.mouse.up();
}

/** The field box on the canvas, in mm from the canvas's top-left. */
async function onCanvasMm(page: Page, field: Locator) {
  const c = (await canvas(page).boundingBox())!;
  const f = (await field.boundingBox())!;
  return { left: (f.x - c.x) / PX_PER_MM, right: (f.x + f.width - c.x) / PX_PER_MM, width: f.width / PX_PER_MM, canvasWidth: c.width / PX_PER_MM };
}

/** The field as drawn on the canvas, in mm from the label's top-left (inside the canvas border). */
async function drawnMm(page: Page, field: Locator) {
  const c = await canvas(page).evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.left + el.clientLeft, y: r.top + el.clientTop }; });
  const f = (await field.boundingBox())!;
  const r = (px: number) => Math.round((px / PX_PER_MM) * 10) / 10;
  return { x: r(f.x - c.x), y: r(f.y - c.y), w: r(f.width), h: r(f.height) };
}

/** Watches (does not send) the drop events the canvas receives, to read where the browser put them. */
async function recordDrops(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __e2eDrops?: Array<{ dx: number; dy: number }> };
    w.__e2eDrops = [];
    document.querySelector('.ps-designer-canvas')!.addEventListener('drop', (e) => {
      const el = e.currentTarget as HTMLElement;
      const r = el.getBoundingClientRect();
      const d = e as DragEvent;
      // Measured from inside the border, where field positions start (PS-245, Batch 589).
      w.__e2eDrops!.push({ dx: d.clientX - r.left - el.clientLeft, dy: d.clientY - r.top - el.clientTop });
    }, true);
  });
}
const lastDrop = (page: Page) => page.evaluate(() => (window as unknown as { __e2eDrops: Array<{ dx: number; dy: number }> }).__e2eDrops.at(-1)!);

/** No outside network: pages outside this server, and the dev server's AI and terminology pass-throughs to the internet, are refused. */
async function blockOutsideNetwork(page: Page) {
  await page.route(url => !['localhost', '127.0.0.1'].includes(url.hostname) || /^\/api\/(ai|terminology)\//.test(url.pathname), route => route.abort());
}

const storedLayouts = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]') as Array<Record<string, unknown> & { fields: Array<Record<string, unknown>> }>, LAYOUTS_KEY);

test.describe('PS-245 Label Designer', () => {
  test.beforeEach(async ({ page }) => { await blockOutsideNetwork(page); await signIn(page); });
  test.afterEach(async ({ page }) => { await clearDemoKeys(page, [LAYOUTS_KEY]); });

  test('Steps 1–5: drag fields onto a facility override, resize and type within the label, save and export ZPL', async ({ page }) => {
    test.setTimeout(180_000);
    const patient = fieldBox(page, 'Maria Garcia'); // SAMPLE_VALUES.patientName
    const mrn = fieldBox(page, 'AUTO-0031');        // SAMPLE_VALUES.mrn

    await test.step('1. Sign in as Pete and open Configuration → System → Workstation & Hardware → Label Designer', async () => {
      await openLabelDesigner(page);
    });

    await test.step('2. Pick Label Type and Scope; drag a field from Available Fields onto the label', async () => {
      await page.locator('#ld-label-type').selectOption('requisition');
      await expect(page.locator('#ld-label-type option:checked')).toHaveText('Requisition Label');
      await page.locator('#ld-facility').selectOption({ label: FACILITY_OPTION });
      await expect(page.locator('#ld-facility')).toHaveValue(FACILITY_ID);
      await expect(page.locator('.ps-canvas-caption'), 'a 4" × 6" label').toHaveText(T.canvasCaption);
      await expect(canvas(page).locator('.ps-designer-field'), 'no layout yet for this facility').toHaveCount(0);
      await expect(page.locator('.ps-palette-item'), 'the requisition fields are offered').toHaveText(REQUISITION_FIELDS);

      // Patient Name dropped 40 px right and 80 px down (10 mm, 20 mm). The browser delivers the drop on a
      // whole screen pixel and the canvas edge is not on one, so the exact expected mm come from the drop
      // event the canvas really received (watched, not sent, by recordDrops).
      await recordDrops(page);
      await page.locator('.ps-palette-item').filter({ hasText: 'Patient Name' }).dragTo(canvas(page), { targetPosition: { x: 40, y: 80 } });
      await expect(patient, 'Patient Name is on the label').toHaveCount(1);
      await expect(page.locator('.ps-palette-item').filter({ hasText: 'Patient Name' }), 'no longer offered').toHaveCount(0);
      const drop = await lastDrop(page);
      const toMm = (px: number) => Math.round((px / PX_PER_MM) * 10) / 10;
      expect(Math.abs(drop.dx - 40), 'the drop reached the canvas about 40 px in').toBeLessThanOrEqual(1);
      expect(Math.abs(drop.dy - 80), 'and about 80 px down').toBeLessThanOrEqual(1);
      expect(await inspectorValues(page), 'placed where it was dropped, 20 × 6 mm').toEqual({ x: toMm(drop.dx), y: toMm(drop.dy), w: 20, h: 6 });

      // MRN dropped on the label's bottom-right corner: held inside the label.
      const c = (await canvas(page).boundingBox())!;
      await page.locator('.ps-palette-item').filter({ hasText: 'MRN' }).dragTo(canvas(page), { targetPosition: { x: c.width - 2, y: c.height - 2 } });
      await expect(mrn).toHaveCount(1);
      expect(await inspectorValues(page), 'MRN held inside the bottom-right corner').toEqual({ x: LABEL_W - 20, y: Math.round((LABEL_H - 6) * 10) / 10, w: 20, h: 6 });
    });

    await test.step('3. Select the field and drag a corner handle: the opposite edge stays, no edge leaves the label, nothing below 2 mm', async () => {
      await patient.click();
      await expect(patient).toHaveClass(/ps-designer-field--selected/);
      await expect(patient.locator('.ps-designer-handle'), 'eight resize handles').toHaveCount(8);
      // A known start: X 10, Y 20, W 20, H 6.
      await typeMm(page, T.x, 10);
      await typeMm(page, T.y, 20);
      await typeMm(page, T.width, 20);
      await typeMm(page, T.height, 6);
      await expect.poll(() => inspectorValues(page)).toEqual({ x: 10, y: 20, w: 20, h: 6 });

      // se corner +40 px, +8 px → 10 mm wider, 2 mm taller; top-left stays.
      await dragHandle(page, patient, 'se', 40, 8);
      await expect.poll(() => inspectorValues(page), { message: 'se: X/Y stay, W 30, H 8' }).toEqual({ x: 10, y: 20, w: 30, h: 8 });

      // nw corner +200 px right: the left edge stops 2 mm short of the right edge (40 mm), which stays put.
      await dragHandle(page, patient, 'nw', 200, 0);
      await expect.poll(() => inspectorValues(page), { message: 'nw: right edge stays at 40, width stops at 2 mm' }).toEqual({ x: 38, y: 20, w: 2, h: 8 });

      // e edge +1000 px: the right edge stops at the label's edge; the left edge stays.
      await dragHandle(page, patient, 'e', 1000, 0);
      await expect.poll(() => inspectorValues(page), { message: 'e: right edge held at 101.6' }).toEqual({ x: 38, y: 20, w: 63.6, h: 8 });
      const box = await onCanvasMm(page, patient);
      // On screen the field must end at the label's edge, not past the drawn canvas (soft, so the later steps still run).
      expect.soft(box.right, 'on screen, the field ends at the canvas edge').toBeLessThanOrEqual(box.canvasWidth + 0.01);

      // n edge −1000 px: the top stops at the label's top; the bottom (28 mm) stays.
      await dragHandle(page, patient, 'n', 0, -1000);
      await expect.poll(() => inspectorValues(page), { message: 'n: top held at 0, bottom stays at 28' }).toEqual({ x: 38, y: 0, w: 63.6, h: 28 });
    });

    await test.step('4. Type an X or Width that would push it off the label and press Enter: held inside', async () => {
      await typeMm(page, T.width, 20);
      await expect.poll(() => inspectorValues(page)).toEqual({ x: 38, y: 0, w: 20, h: 28 });
      await typeMm(page, T.x, 95);
      await expect.poll(() => inspectorValues(page), { message: 'X 95 held at 101.6 − 20' }).toEqual({ x: 81.6, y: 0, w: 20, h: 28 });
      await expect.poll(() => drawnMm(page, patient), { message: 'drawn at X 81.6' }).toEqual({ x: 81.6, y: 0, w: 20, h: 28 });
      await typeMm(page, T.width, 50);
      // The field itself is held at the 20 mm left before the edge...
      await expect.poll(() => drawnMm(page, patient), { message: 'Width 50: the field stays 20 mm wide' }).toEqual({ x: 81.6, y: 0, w: 20, h: 28 });
      // ...and the Inspector should say so, not keep showing the refused 50 (soft, so the rest runs).
      await expect.soft(mm(page, T.width), 'the Inspector shows the width actually applied').toHaveValue('20');
      await typeMm(page, T.y, 500);
      await expect.poll(() => drawnMm(page, patient), { message: 'Y 500 held at 152.4 − 28' }).toEqual({ x: 81.6, y: 124.4, w: 20, h: 28 });
      await expect(mm(page, T.y), 'the Inspector shows Y 124.4').toHaveValue('124.4');
      const box = await onCanvasMm(page, patient);
      expect.soft(box.right, 'on screen, inside the canvas').toBeLessThanOrEqual(box.canvasWidth + 0.01);
      await expect(page.locator('.ps-designer-bounds-warning'), 'no out-of-bounds warning').toHaveCount(0);
    });

    await test.step('5. Save Layout, then Export ZPL: ZPL text appears under Exported ZPL', async () => {
      await page.getByRole('button', { name: T.saveLayout, exact: true }).click();
      await expect(page.locator('.ps-designer-footer-row .ps-helper-text')).toHaveText(T.facilitySaved);
      const stored = await storedLayouts(page);
      expect(stored, 'one layout stored').toHaveLength(1);
      expect(stored[0]).toMatchObject({ labelType: 'requisition', facilityId: FACILITY_ID, widthMm: LABEL_W, heightMm: LABEL_H });
      expect(stored[0].fields.map(f => [f.fieldKey, f.xMm, f.yMm, f.widthMm, f.heightMm]), 'saved in mm').toEqual([
        ['patientName', 81.6, 124.4, 20, 28],
        ['mrn', 81.6, 146.4, 20, 6],
      ]);

      await page.getByRole('button', { name: new RegExp(`${T.exportZpl}$`) }).click();
      const panel = page.locator('.ps-panel-box').filter({ has: page.locator('h3', { hasText: T.exportedZpl }) });
      await expect(panel, 'the Exported ZPL panel').toBeVisible();
      // 203 dpi: 81.6 mm → 652 dots, 124.4 → 994, 146.4 → 1170; 2.6 mm font → 21 dots.
      await expect(panel.getByRole('textbox', { name: T.zplOutput })).toHaveValue([
        '^XA', '^CI28',
        '^FO652,994^A0N,21,21^FDMaria Garcia^FS',
        '^FO652,1170^A0N,21,21^FDAUTO-0031^FS',
        '^XZ',
      ].join('\n'));

      // Kept per facility: back after a reload; the Enterprise Default is untouched.
      await openLabelDesigner(page);
      await page.locator('#ld-facility').selectOption({ label: FACILITY_OPTION });
      await expect(canvas(page).locator('.ps-designer-field'), 'the override reloads').toHaveCount(2);
      await patient.click();
      await expect.poll(() => inspectorValues(page)).toEqual({ x: 81.6, y: 124.4, w: 20, h: 28 });
      await page.locator('#ld-facility').selectOption({ label: T.enterpriseDefault });
      await expect(canvas(page).locator('.ps-designer-field'), 'the Enterprise Default has no fields').toHaveCount(0);
    });
  });

  test('Step 6: an older layout with a field past the edge is outlined, refused on save, and fixed by Fit to label', async ({ page }) => {
    test.setTimeout(120_000);
    const accession = fieldBox(page, 'DVMC26-0001'); // SAMPLE_VALUES.fullAccession
    const seeded = {
      id: 'layout-e2e-245', labelType: 'requisition', widthMm: LABEL_W, heightMm: LABEL_H, updatedAt: '2026-09-01T00:00:00.000Z',
      fields: [{ id: 'field-e2e-245', fieldKey: 'fullAccession', xMm: 90, yMm: 10, widthMm: 30, heightMm: 6, fontSizeMm: 2.6 }],
    };

    await test.step('6a. Seed an Enterprise Default requisition layout with a field 18.4 mm past the right edge (the demo has none)', async () => {
      await page.evaluate(({ key, layout }) => localStorage.setItem(key, JSON.stringify([layout])), { key: LAYOUTS_KEY, layout: seeded });
      await openLabelDesigner(page);
      await expect(page.locator('#ld-facility')).toHaveValue('');
      await expect(accession, 'the seeded field loads').toHaveCount(1);
    });

    await test.step('6b. It is outlined with a warning', async () => {
      await expect(accession).toHaveClass(/ps-designer-field--outside/);
      await expect(page.locator('.ps-designer-bounds-warning[role="alert"]')).toContainText(T.outOfBoundsOne);
    });

    await test.step('6c. Save is refused and nothing is stored', async () => {
      await page.getByRole('button', { name: T.saveLayout, exact: true }).click();
      await expect(page.locator('.ps-designer-footer-row .ps-helper-text')).toHaveText(T.outOfBoundsSave);
      expect(await storedLayouts(page), 'the stored layout is unchanged').toEqual([seeded]);
    });

    await test.step('6d. Fit to label fixes it, and then it saves', async () => {
      await page.locator('.ps-designer-bounds-warning').getByRole('button', { name: T.fitToLabel, exact: true }).click();
      await expect(page.locator('.ps-designer-bounds-warning'), 'the warning goes').toHaveCount(0);
      await expect(accession).not.toHaveClass(/ps-designer-field--outside/);
      await accession.click();
      await expect.poll(() => inspectorValues(page), { message: 'moved in to X 71.6, size kept' }).toEqual({ x: 71.6, y: 10, w: 30, h: 6 });
      await page.getByRole('button', { name: T.saveLayout, exact: true }).click();
      await expect(page.locator('.ps-designer-footer-row .ps-helper-text')).toHaveText(T.enterpriseSaved);
      const stored = await storedLayouts(page);
      expect(stored).toHaveLength(1);
      expect(stored[0].fields[0], 'the fitted field is stored').toMatchObject({ fieldKey: 'fullAccession', xMm: 71.6, yMm: 10, widthMm: 30, heightMm: 6 });
    });
  });
});
