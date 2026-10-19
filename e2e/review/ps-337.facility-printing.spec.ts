// e2e/review/ps-337.facility-printing.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-337 — "no admin UI to author rules across Delivery Rules, Print Routing
// and Print Queue": the delivered part is the Facility editor's Printing tab
// (Batch 517). The review test plan, run against the demo (Vite dev server,
// localStorage data) as Pete Nimmo.
//
// Expected (ticket): an admin can set a facility's printing and paper
// handling on screen; invalid settings are refused and saved values persist.
//
// Automated here (each review step is a test.step):
//   1. Sign in as Pete Nimmo, Configuration → System → Facility Configuration,
//      Edit a performing lab (Fenwick General Hospital).
//   2. Printing tab: Report printing (Print released reports, Delivery, Paper
//      size), the default network printer (protocol, address, port, display
//      name) and "Paper handling for this client's reports" (Paper tray,
//      Sides) are on the screen.
//   3. Printing on with QZ Tray and no printer name: refused with "Enter the
//      printer name, or turn printing off." (the message is shown as an alert
//      and "Save printing settings" is disabled; nothing is saved).
//   4. A printer address with characters outside letters, digits, dots,
//      hyphens and colons, then port 70000: each refused with its own message.
//   5. Paper tray = Tray 2 (plain), Sides = Single-sided (with a valid QZ Tray
//      printer), Save printing settings → "Printing settings saved."; close
//      the editor, reopen: the values are kept.
//   6. General tab: change the phone and Save Changes; reopen the Printing
//      tab: the printing settings are unchanged, and the facility record in
//      localStorage (pathscribe_mock_pathscribe_facilities) still carries
//      them.
//
// Needs a person: the ticket's third acceptance checkbox, that a released
// report actually comes out of the named printer / tray with the chosen
// sides (a real QZ Tray install and a printer; the demo prints nothing).
//
// Texts are the English values of facilityPrintingTab.*,
// facilityEditorModal.*, facilityTable.* and printDestination.* in
// src/i18n/locales/en.json; selectors are the app's own .ps-* / .fct-* /
// .cem-* classes and the tab's field ids (fpt-*).
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5309 npx playwright test --project=chromium \
//        e2e/review/ps-337.facility-printing.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';
import { signIn, openScreen } from './helpers';

const LAB = 'Fenwick General Hospital'; // seed c-fenwick-general, roles: ['performing_lab']
const LAB_ID = 'c-fenwick-general';
const FACILITIES_KEY = 'pathscribe_mock_pathscribe_facilities'; // mockStorage PREFIX + 'pathscribe_facilities'

// facilityPrintingTab.*
const PRINTING_TITLE = 'Report printing';
const PRINT_RELEASED = 'Print released reports';
const DELIVERY = 'Delivery';
const PAPER_SIZE = 'Paper size';
const PRINTER_NAME = 'Printer name';
const DEST_ADDRESS = 'Printer address (IP or host name)';
const DEST_PORT = 'Port';
const DEST_PROTOCOL = 'Protocol';
const DEST_NAME = 'Display name';
const PRESENTATION_TITLE = 'Paper handling for this client’s reports';
const PAPER_TRAY = 'Paper tray';
const SIDES = 'Sides';
const TRAY_2 = 'Tray 2 (plain)';
const SINGLE_SIDED = 'Single-sided';
const SAVE_PRINTING = 'Save printing settings';
const SAVED_PRINTING = 'Printing settings saved.';
const MSG_PRINTER_NAME = 'Enter the printer name, or turn printing off.';
const MSG_ADDRESS_INVALID = 'The printer address can contain only letters, digits, dots, hyphens and colons.';
const MSG_PORT = 'The port must be a whole number from 1 to 65535.';
// facilityEditorModal.* / facilityTable.*
const EDIT = 'Edit';
const TAB_PRINTING = 'Printing';
const TAB_GENERAL = 'General';
const SAVE_CHANGES = 'Save Changes';
const PHONE = 'Phone';
const FACILITY_NAME = 'Facility Name *';

const editor = (page: Page) => page.locator('.ps-overlay--facility-editor');
const tab = (page: Page, label: string) => editor(page).locator('.ps-fem-tab').filter({ hasText: label });
const problem = (page: Page) => editor(page).locator('.ps-facility-print-problem[role="alert"]');
const savePrinting = (page: Page) => editor(page).getByRole('button', { name: SAVE_PRINTING, exact: true });

async function openFacilityConfiguration(page: Page) {
  await openScreen(page, '/configuration?tab=system&section=clients', 'Facility Configuration');
  await expect(page.locator('.fct-table'), 'the facility table').toBeVisible({ timeout: 15_000 });
}

/** Opens the lab's editor from the table (the search box narrows the list to it). */
async function editLab(page: Page) {
  const search = page.locator('.fct-search-input');
  await search.fill(LAB);
  const row = page.locator('.fct-table tbody tr').filter({ hasText: LAB }).first();
  await expect(row, `${LAB} is listed`).toBeVisible();
  await row.locator('.fct-action-btn--edit').filter({ hasText: EDIT }).click();
  await expect(editor(page), 'the facility editor').toBeVisible();
  // The title reads "Edit Facility"; the General tab's name field says which one.
  await expect(editor(page).getByLabel(FACILITY_NAME, { exact: true })).toHaveValue(LAB);
}

async function openPrintingTab(page: Page) {
  await tab(page, TAB_PRINTING).click();
  await expect(editor(page).getByText(PRESENTATION_TITLE, { exact: true })).toBeVisible();
  await page.waitForTimeout(400); // the tab re-reads the stored settings on open
}

async function closeEditor(page: Page) {
  await editor(page).locator('.ps-modal-close').click();
  await expect(editor(page)).toHaveCount(0);
}

/** The stored facility record, as the demo's facility service keeps it. */
const storedLab = (page: Page) => page.evaluate(({ key, id }) => {
  const all = JSON.parse(localStorage.getItem(key) ?? '[]') as Array<Record<string, unknown>>;
  return all.find(f => f.id === id) ?? null;
}, { key: FACILITIES_KEY, id: LAB_ID });

test.describe('PS-337 Facility Configuration → Printing tab', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('Steps 1–6: the printing controls are on the screen, bad settings are refused, saved values persist through a General save', async ({ page }) => {
    test.setTimeout(180_000);

    await test.step('1. Sign in as Pete Nimmo, Configuration → System → Facility Configuration, edit a performing lab', async () => {
      await openFacilityConfiguration(page);
      await editLab(page);
    });

    await test.step('2. Printing tab: report printing, the default network printer and paper handling controls are present', async () => {
      await openPrintingTab(page);
      const ed = editor(page);
      await expect(ed.getByText(PRINTING_TITLE, { exact: true }), 'Report printing section').toBeVisible();
      const enabled = ed.getByLabel(PRINT_RELEASED);
      await expect(enabled, 'Print released reports').toBeVisible();
      // Delivery and Paper size show once printing is configured (the toggle has been touched).
      await enabled.check();
      await expect(ed.getByLabel(DELIVERY, { exact: true }), 'Delivery').toBeVisible();
      await expect(ed.getByLabel(PAPER_SIZE, { exact: true }), 'Paper size').toBeVisible();
      await expect(ed.getByLabel(PRINTER_NAME, { exact: true }), 'Printer name (QZ Tray)').toBeVisible();
      // The default network printer: Delivery = Network printer (direct), Printer = a printer address.
      await ed.getByLabel(DELIVERY, { exact: true }).selectOption('DIRECT_NETWORK_PRINT');
      await ed.locator('#fpt-dest-kind').selectOption('network');
      await expect(ed.getByLabel(DEST_PROTOCOL, { exact: true }), 'Protocol').toBeVisible();
      await expect(ed.getByLabel(DEST_ADDRESS, { exact: true }), 'Printer address').toBeVisible();
      await expect(ed.getByLabel(DEST_PORT, { exact: true }), 'Port').toBeVisible();
      await expect(ed.getByLabel(DEST_NAME, { exact: true }), 'Display name').toBeVisible();
      // Paper handling for this client's reports.
      await expect(ed.getByText(PRESENTATION_TITLE, { exact: true }), 'Paper handling section').toBeVisible();
      await expect(ed.getByLabel(PAPER_TRAY, { exact: true }), 'Paper tray').toBeVisible();
      await expect(ed.getByLabel(SIDES, { exact: true }), 'Sides').toBeVisible();
      await expect(ed.getByLabel(PAPER_TRAY, { exact: true }).locator('option', { hasText: TRAY_2 })).toHaveCount(1);
      await expect(ed.getByLabel(SIDES, { exact: true }).locator('option', { hasText: SINGLE_SIDED })).toHaveCount(1);
      await expect(savePrinting(page), 'Save printing settings').toBeVisible();
    });

    await test.step('3. Printing on with QZ Tray and no printer name: refused with "Enter the printer name, or turn printing off."', async () => {
      const ed = editor(page);
      await ed.getByLabel(DELIVERY, { exact: true }).selectOption('NATIVE_QZ_TRAY');
      await expect(ed.getByLabel(PRINT_RELEASED)).toBeChecked();
      await expect(ed.getByLabel(PRINTER_NAME, { exact: true })).toHaveValue('');
      await expect(problem(page), 'the refusal').toHaveText(MSG_PRINTER_NAME);
      await expect(savePrinting(page), 'Save is held back').toBeDisabled();
      await expect(savePrinting(page)).toHaveAttribute('title', MSG_PRINTER_NAME);
      // A click on the held-back button saves nothing.
      await savePrinting(page).click({ force: true }).catch(() => {});
      await page.waitForTimeout(400);
      await expect(ed.getByText(SAVED_PRINTING, { exact: true }), 'nothing saved').toHaveCount(0);
      expect((await storedLab(page))?.printDeliveryConfig, 'the record has no printing yet').toBeUndefined();
    });

    await test.step('4. A bad printer address, then port 70000: each refused with its own message', async () => {
      const ed = editor(page);
      await ed.getByLabel(DELIVERY, { exact: true }).selectOption('DIRECT_NETWORK_PRINT');
      await ed.locator('#fpt-dest-kind').selectOption('network');
      await ed.getByLabel(DEST_ADDRESS, { exact: true }).fill('print server/one');
      await expect(problem(page), 'bad address refused').toHaveText(MSG_ADDRESS_INVALID);
      await expect(savePrinting(page)).toBeDisabled();
      await ed.getByLabel(DEST_ADDRESS, { exact: true }).fill('10.20.30.40');
      await expect(problem(page), 'a good address clears it').toHaveCount(0);
      await ed.getByLabel(DEST_PORT, { exact: true }).fill('70000');
      await expect(problem(page), 'port 70000 refused').toHaveText(MSG_PORT);
      await expect(savePrinting(page)).toBeDisabled();
      await ed.getByLabel(DEST_PORT, { exact: true }).fill('9100');
      await expect(problem(page), 'a good port clears it').toHaveCount(0);
      await expect(savePrinting(page)).toBeEnabled();
    });

    await test.step('5. Paper tray = Tray 2 (plain), Sides = Single-sided; save, close and reopen: kept', async () => {
      const ed = editor(page);
      // A complete, valid QZ Tray setup so the delivery settings save alongside the paper handling.
      await ed.getByLabel(DELIVERY, { exact: true }).selectOption('NATIVE_QZ_TRAY');
      await ed.getByLabel(PRINTER_NAME, { exact: true }).fill('E2E-337 Histology Printer');
      await ed.getByLabel(PAPER_SIZE, { exact: true }).selectOption('A4');
      await ed.getByLabel(PAPER_TRAY, { exact: true }).selectOption({ label: TRAY_2 });
      await ed.getByLabel(SIDES, { exact: true }).selectOption({ label: SINGLE_SIDED });
      await expect(problem(page)).toHaveCount(0);
      await savePrinting(page).click();
      await expect(ed.locator('.ps-facility-print-saved'), 'saved').toHaveText(SAVED_PRINTING);
      await closeEditor(page);
      await editLab(page);
      await openPrintingTab(page);
      await expect(ed.getByLabel(PRINT_RELEASED), 'printing still on').toBeChecked();
      await expect(ed.getByLabel(DELIVERY, { exact: true })).toHaveValue('NATIVE_QZ_TRAY');
      await expect(ed.getByLabel(PRINTER_NAME, { exact: true })).toHaveValue('E2E-337 Histology Printer');
      await expect(ed.getByLabel(PAPER_SIZE, { exact: true })).toHaveValue('A4');
      await expect(ed.getByLabel(PAPER_TRAY, { exact: true }), 'Tray 2 kept').toHaveValue('TRAY_2_PLAIN');
      await expect(ed.getByLabel(SIDES, { exact: true }), 'Single-sided kept').toHaveValue('SIMPLEX');
    });

    await test.step('6. General tab: change the phone and Save Changes; the printing settings are not overwritten', async () => {
      const ed = editor(page);
      await tab(page, TAB_GENERAL).click();
      const phone = ed.getByLabel(PHONE, { exact: true });
      await expect(phone).toBeVisible();
      await phone.fill('+44 191 555 0337');
      await ed.getByRole('button', { name: SAVE_CHANGES, exact: true }).click();
      await expect(editor(page), 'the editor closes after the save').toHaveCount(0, { timeout: 10_000 });
      // The General save went through.
      const after = await storedLab(page);
      expect(after?.phone, 'the phone was saved').toBe('+44 191 555 0337');
      // And left printing alone.
      expect(after?.printDeliveryConfig, 'printing settings still on the record').toMatchObject({ enabled: true, mode: 'NATIVE_QZ_TRAY', printerName: 'E2E-337 Histology Printer', paperSize: 'A4' });
      expect(after?.printPresentationPreference, 'paper handling still on the record').toEqual({ paperSource: 'TRAY_2_PLAIN', duplexMode: 'SIMPLEX' });
      // On screen too, after a reload of the section.
      await openFacilityConfiguration(page);
      await editLab(page);
      await openPrintingTab(page);
      await expect(ed.getByLabel(PRINT_RELEASED)).toBeChecked();
      await expect(ed.getByLabel(PRINTER_NAME, { exact: true })).toHaveValue('E2E-337 Histology Printer');
      await expect(ed.getByLabel(PAPER_TRAY, { exact: true })).toHaveValue('TRAY_2_PLAIN');
      await expect(ed.getByLabel(SIDES, { exact: true })).toHaveValue('SIMPLEX');
      await closeEditor(page);
    });
  });
});
