// e2e/review/ps-55.qz-tray-label-printing.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-55 — "Wire QZ Tray print bridge into existing print actions (unblocked —
// QZ Tray integration already built)". Review test plan, run against the demo
// (Vite dev server, localStorage data) as Pete Nimmo, in a browser with NO QZ
// Tray running (nothing listens on QZ Tray's local ports).
//
//   1. Sign in as Pete Nimmo (superadmin) and open Configuration → System →
//      Workstation & Hardware → Printer Profiles.                    automated
//   2. Open the demo Zebra ZT411 profile and check its bridge/connection type
//      is QZ Tray (it used to be the OS print dialog).                automated
//   3. Open a surgical case with blocks, go to the Material tab, and print or
//      reprint a cassette label for a block.                          automated
//      (S26-4404, Material tab → Manage Reprints → Specimen A → block A1 →
//      Print Blk (1), the ManageReprintsModal reprint path the ticket names.)
//   4. Do the same from the Matrix block editor (Reprint Cassette Label) and
//      from the block/stain editor's container label action.          automated
//      (Matrix: S26-4404's Biopsy Array M1. Container label: the decant D1 of
//      S26-5005-CYT-001, the only demo case with decants on a block/stain
//      editor, "🖨️ Print Container Label".)
//   5. Real label output with QZ Tray installed and a real Zebra printer, and
//      the silent-printing certificate.                          needs a person
//      (needs QZ Tray on the workstation, a ZT411 and a signing certificate;
//      nothing here can print).
//
// Expected (ticket): no print action shows the old "Printer bridge … has no
// working print route" refusal; each one is sent to QZ Tray (or reports that
// QZ Tray can't be reached when it isn't installed).
//
// What "sent to QZ Tray" means here: the qz-tray library opens a WebSocket to
// QZ Tray on the workstation (first wss://localhost:8181). The test records the
// browser's WebSocket attempts (nothing answers; no network beyond localhost)
// and expects, per action: an attempt to reach QZ Tray, and the bridge's own
// "not running" message (qzTrayBridge.ts NOT_RUNNING_MESSAGE, held in code,
// not en.json) in the warning toast.
//
// Setup the steps assume but don't list (the demo defaults would stop every
// print before QZ Tray): Print Settings → GS1 GTIN is empty in the demo, and an
// empty GTIN refuses every cassette label ("No GS1 GTIN configured…"), so the
// test enters a test GTIN; Container Label Printer Profile is unset by default
// (container labels then go straight to the browser print dialog), so the test
// points it at the ZT411; and the workstation needs a print-capable scan
// station, so the NavBar station picker is set to Grossing Station 1 (the
// seeded station that prints through the ZT411). All of it is browser demo
// data; the next sign-in clears it.
//
// Texts are the English values of printerProfilesSection.*,
// printSettingsSection.*, manageReprintsModal.*, matrixBlockEditorModal.*,
// blockStainEditorModal.*, useSpecimenBlockManagement.* and printLabels.* in
// src/i18n/locales/en.json; selectors are the screens' own .ps-* classes.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5305 npx playwright test --project=chromium \
//        e2e/review/ps-55.qz-tray-label-printing.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';
import { DEMO_USERS } from './helpers';

/**
 * Signs in as a demo user with fresh demo data, like helpers.signIn, but from the
 * sign-in page once it has rendered: helpers.signIn's page.goto('/') is redirected
 * to /login while it writes, which can throw "Execution context was destroyed".
 */
async function signInFresh(page: Page, user: { id: string; name: string; role: string } = DEMO_USERS.pete) {
  await page.goto('/login');
  await expect(page.locator('#login-email'), 'the sign-in page').toBeVisible({ timeout: 90_000 });
  await page.evaluate((u) => {
    localStorage.clear();
    localStorage.setItem('pathscribe-user', JSON.stringify(u));
    localStorage.setItem('pathscribe_scan_station_prompted', '1');
  }, user);
}

const T = {
  configuration: 'Configuration',
  printerProfiles: 'Printer Profiles',                         // printerProfilesSection.title
  edit: 'Edit',                                                // common.edit
  editTitle: 'Edit — ZEBRA-192.168.12.85',                     // printerProfilesSection.modal.editTitle
  bridgeType: 'Bridge Type',                                   // printerProfilesSection.modal.bridgeTypeField
  qzTray: 'QZ Tray (vendor-agnostic — real, working integration built)', // printerProfilesSection.bridgeLabels.qz_tray
  osDialog: 'OS Print Dialog (browser\'s own print queue)',     // printerProfilesSection.bridgeLabels.os_print_dialog
  gtin: 'GS1 GTIN (Cassette / Slide Labels)',                  // printSettingsSection.gs1Gtin.title
  containerPrinter: 'Container Label Printer Profile',         // printSettingsSection.containerPrinterProfile.title
  materialTab: '🧱 Material',                                   // synoptic tab: emoji + materialBtn
  manageReprints: /Manage Reprints/,                           // manageReprintsModal.label
  printBlk1: '🖨️ Print Blk (1)',                               // manageReprintsModal.footer.printBlk
  reprintCassetteLabel: '🖨️ Reprint Cassette Label',           // matrixBlockEditorModal.header.reprintCassette
  printContainerLabel: '🖨️ Print Container Label',             // blockStainEditorModal.printContainerLabelButton
  printingCassette: (id: string) => `Printing cassette ${id}…`, // useSpecimenBlockManagement.toast.printingCassette
  printedFailedPrefix: 'Printed cassette label failed: ',      // useSpecimenBlockManagement.toast.printedLabelFailed (kind = cassette)
  noRoute: 'has no working print route',                       // printLabels.bridgeNotImplemented
  station: 'Grossing Station 1',                               // seeded scan station (supportsPrinting → printer-zt411-example)
};
// qzTrayBridge.ts NOT_RUNNING_MESSAGE (+ " (<the WebSocket error>)").
const QZ_NOT_RUNNING = 'QZ Tray does not appear to be running on this workstation. Start QZ Tray (or install it — qz.io) and try again.';
const QZ_FAILED_TOAST = new RegExp(`^${escapeRe(T.printedFailedPrefix + QZ_NOT_RUNNING)} \\(.+\\)$`);
// qz-tray tries the secure port 8181 first on an https page and the plain ports (8182…) first on the
// plain-http dev server this spec runs against.
const isQzFirstPort = (url: string) => url === 'wss://localhost:8181/' || url === 'ws://localhost:8182/';
// Shown when a label meant for the QZ Tray printer falls back to the browser print window (PS-55, Batch 589).
const LABEL_PRINTER_NOT_CONNECTED = 'The label printer is not connected, so this label went to the browser print window. Check that QZ Tray is running on this computer.';
const QZ_PORTS = /^wss?:\/\/localhost:(8181|8182|8282|8283|8383|8384|8484|8485)\//;

const ZT411_ID = 'printer-zt411-example';
const TEST_GTIN = '00850000000000';                            // the field's own placeholder example
const SURGICAL_CASE = 'S26-4404';
const DECANT_CASE = 'S26-5005-CYT-001';

const softExpect = expect.configure({ soft: true });

function escapeRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** Every toast text shown on the page (toasts replace each other, so a collector keeps the history). */
const toastHistory = (page: Page) => page.evaluate(() => (window as unknown as { __psToasts?: string[] }).__psToasts ?? []);

/** Starts the per-test recorders: toast texts, WebSocket attempts to QZ Tray's ports, popups. */
async function startRecorders(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __psToasts: string[] };
    w.__psToasts = [];
    const watch = () => new MutationObserver(() => {
      document.querySelectorAll('.ps-save-toast-text').forEach(el => {
        const text = el.textContent ?? '';
        if (text && w.__psToasts[w.__psToasts.length - 1] !== text) w.__psToasts.push(text);
      });
    }).observe(document.body, { subtree: true, childList: true, characterData: true });
    if (document.body) watch(); else document.addEventListener('DOMContentLoaded', watch);
  });
  const qzAttempts: string[] = [];
  const popups: string[] = [];
  page.on('websocket', ws => { if (QZ_PORTS.test(ws.url())) qzAttempts.push(ws.url()); });
  page.on('popup', p => { popups.push(p.url()); void p.close(); });
  // The report page asks the AI service for suggestions; no internet here, so it is answered as unreachable.
  await page.route('**/api/ai/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"AI service unreachable (review test)"}' }));
  return { qzAttempts, popups };
}

async function openConfig(page: Page, query: string, sectionHeading: string | RegExp) {
  await page.goto(`/configuration?${query}`);
  await expect(page.locator('h1, h2').filter({ hasText: T.configuration }).first()).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText(sectionHeading).first()).toBeVisible({ timeout: 20_000 });
}

/** Print Settings: a test GTIN and the ZT411 for container labels; NavBar station = Grossing Station 1. Reloads to prove they were saved. */
async function configureLabelPrinting(page: Page) {
  await openConfig(page, 'tab=system&section=print_settings', T.gtin);
  await page.getByLabel(T.gtin, { exact: true }).fill(TEST_GTIN);
  await page.getByLabel(T.containerPrinter, { exact: true }).selectOption(ZT411_ID);
  await page.locator('.ps-navbar-station-btn').click();
  await page.locator('.ps-navbar-station-menu-item').filter({ hasText: T.station }).click();
  await expect(page.locator('.ps-navbar-station-btn')).toContainText(T.station);
  // Print Settings save on change, asynchronously: wait for both to reach the print settings store before reloading.
  await expect.poll(() => page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('pathscribe_mock_printSettings') ?? '{}');
    return [s.gs1Gtin, s.containerLabelPrinterProfileId];
  }), { message: 'print settings saved', timeout: 30_000 }).toEqual([TEST_GTIN, ZT411_ID]);
  // Saved on change: still there after a reload.
  await openConfig(page, 'tab=system&section=print_settings', T.gtin);
  await expect(page.getByLabel(T.gtin, { exact: true }), 'GTIN saved').toHaveValue(TEST_GTIN);
  await expect(page.getByLabel(T.containerPrinter, { exact: true }), 'container labels → ZT411').toHaveValue(ZT411_ID);
}

async function openMaterialTab(page: Page, caseId: string) {
  await page.goto(`/case/${caseId}/synoptic`);
  const tab = page.getByRole('button', { name: T.materialTab, exact: true });
  await expect(tab).toBeVisible({ timeout: 90_000 });
  await tab.click();
  await expect(page.locator('.ps-material-tree-panel'), 'the Material tab').toBeVisible({ timeout: 20_000 });
}

/** The action's outcome: QZ Tray was tried, and the toast reports it can't be reached; never the "no working print route" refusal. */
async function expectSentToQzTray(page: Page, rec: { qzAttempts: string[] }, failedToast: RegExp | string) {
  await softExpect.poll(() => rec.qzAttempts.some(isQzFirstPort), { message: 'the print tries to reach QZ Tray on this workstation', timeout: 15_000 }).toBe(true);
  await softExpect.poll(() => toastHistory(page), { message: 'a toast reports that QZ Tray can\'t be reached', timeout: 15_000 })
    .toContainEqual(expect.stringMatching(failedToast));
  const toasts = await toastHistory(page);
  expect(toasts.filter(t => t.includes(T.noRoute)), 'never the old "has no working print route" refusal').toEqual([]);
}

test.describe('PS-55 QZ Tray is the print route for cassette, matrix and container labels', () => {
  let rec: { qzAttempts: string[]; popups: string[] };
  test.beforeEach(async ({ page }) => {
    rec = await startRecorders(page);
    await signInFresh(page);
  });

  test('Steps 1–2: the demo ZT411 printer profile uses the QZ Tray bridge', async ({ page }) => {
    await test.step('1. Sign in as Pete Nimmo; Configuration → System → Workstation & Hardware → Printer Profiles', async () => {
      await openConfig(page, 'tab=system&section=printer_profiles', T.printerProfiles);
      await expect(page.locator('.ps-confsys-nav-btn--active'), 'Printer Profiles is the selected section').toContainText(T.printerProfiles);
    });

    await test.step('2. Open the demo Zebra ZT411 profile: Bridge Type is QZ Tray, not the OS print dialog', async () => {
      const row = page.locator('tr').filter({ hasText: 'ZEBRA-192.168.12.85' });
      await expect(row, 'one ZT411 row').toHaveCount(1);
      await expect(row, 'the list shows the QZ Tray bridge').toContainText(T.qzTray);
      await row.getByRole('button', { name: T.edit, exact: true }).click();
      const modal = page.locator('.ps-ms-modal');
      await expect(modal.locator('.ps-ms-header')).toHaveText(T.editTitle);
      const bridge = modal.getByLabel(T.bridgeType, { exact: true });
      await expect(bridge, 'bridge = qz_tray').toHaveValue('qz_tray');
      await expect(bridge.locator('option:checked')).toHaveText(T.qzTray);
      await expect(bridge.locator('option:checked')).not.toHaveText(T.osDialog);
      await modal.locator('.ps-ms-close-btn').click();
      await expect(modal).toHaveCount(0);
    });
  });

  test('Step 3: Material tab → Manage Reprints → cassette A1 is sent to QZ Tray', async ({ page }) => {
    test.setTimeout(300_000);
    await configureLabelPrinting(page);

    await test.step('3. S26-4404, Material tab, reprint the cassette label for block A1', async () => {
      await openMaterialTab(page, SURGICAL_CASE);
      await page.getByRole('button', { name: T.manageReprints }).click();
      const modal = page.locator('.ps-reprint-modal');
      await expect(modal).toBeVisible();
      await modal.locator('.ps-reprint-card').filter({ hasText: 'Specimen A' }).locator('input[type="checkbox"]').check();
      await modal.locator('.ps-reprint-card').filter({ hasText: `${SURGICAL_CASE}-A1` }).locator('input[type="checkbox"]').check();
      await modal.getByRole('button', { name: T.printBlk1, exact: true }).click();
      await expect.poll(() => toastHistory(page), { message: 'the print starts' }).toContain(T.printingCassette(`${SURGICAL_CASE}-A1`));
      await expectSentToQzTray(page, rec, QZ_FAILED_TOAST);
    });
  });

  test('Step 4a: Matrix block editor → Reprint Cassette Label is sent to QZ Tray', async ({ page }) => {
    test.setTimeout(300_000);
    await configureLabelPrinting(page);

    await test.step('4a. S26-4404 Biopsy Array M1 → Reprint Cassette Label', async () => {
      await openMaterialTab(page, SURGICAL_CASE);
      await page.locator('.ps-material-tree-matrix-link').first().click();
      const modal = page.locator('.ps-matrixblock-modal');
      await expect(modal.locator('.ps-matrixblock-title')).toHaveText('Biopsy Array M1');
      await modal.getByRole('button', { name: T.reprintCassetteLabel, exact: true }).click();
      await expect.poll(() => toastHistory(page), { message: 'the print starts' }).toContain(T.printingCassette(`${SURGICAL_CASE}-M1`));
      await expectSentToQzTray(page, rec, QZ_FAILED_TOAST);
    });
  });

  test('Step 4b: block/stain editor → Print Container Label (decant) is sent to QZ Tray', async ({ page }) => {
    test.setTimeout(300_000);
    await configureLabelPrinting(page);

    await test.step('4b. S26-5005-CYT-001 decant D1 → Print Container Label', async () => {
      await openMaterialTab(page, DECANT_CASE);
      await page.locator('.ps-material-tree-decant-id').filter({ hasText: `${DECANT_CASE}-AD1` }).click();
      const card = page.locator('.ps-protocol-track-card').filter({ has: page.locator('.ps-protocol-track-name', { hasText: /^AD1 — / }) });
      await expect(card, 'the D1 decant card').toHaveCount(1);
      await card.getByRole('button', { name: T.printContainerLabel, exact: true }).click();
      // The decant label tries QZ Tray first; when it can't be reached the label goes to the browser's
      // print window and a toast says the label printer is not connected (Batch 589).
      await expectSentToQzTray(page, rec, new RegExp(escapeRe(LABEL_PRINTER_NOT_CONNECTED)));
    });
  });
});
