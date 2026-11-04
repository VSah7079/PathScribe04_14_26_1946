// e2e/review/ps-478.strict-type-fixes.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-478 — "Type safety: strictNullChecks folder by folder; bring the 17
// excluded files under type-checking": the review test plan's on-screen
// steps (the fixes strict type-checking found), run against the demo (Vite
// dev server, localStorage data) as Pete Nimmo.
//
// Expected (ticket): type-check clean in strict mode; the listed fixes behave
// as described; guard test passes.
//
//   1. `npm run type-check`: no errors — CLI, outside this spec.
//   2. Configuration → Cytology → Cytology QC Random Selection Rates: a part
//      override shows e.g. "10% (inherited)", never "undefined%".   automated
//      The screen's "+ Add Override" always saves both rates, so the demo has
//      no part override and none can be made on screen: the test stores one
//      facility override with only the Negative rate (Fenwick General
//      Hospital, 25%) and one staff override with only the Non-Negative rate
//      (Pete Nimmo, 30%), as an older record or the API could hold them.
//      Expected rows: "Neg 25% · Non-Neg 10% (inherited)" (the enterprise
//      default is 10%) and "Neg inherited · Non-Neg 30%" (a staff row shows
//      no inherited number: it depends on the facility).
//   3. Edit a specimen on an S26 (LIS) case and save: it shows as pending
//      sync to the LIS.                                              automated
//      The badge reads "Not in LIS" (sidebar.lisStatus.pendingSync), not
//      "pending sync"; the stored specimen has lisSyncState 'pending_sync'.
//   4. Print a cassette or container label for a case with no MRN: it prints
//      without crashing and with no 'undefined' in the text.        automated
//      No demo case lacks an MRN, so the test removes S26-4408's MRN from the
//      stored case first. S26-4408 has no blocks, so it is the container
//      label (Manage Reprints → specimen A → Print Spec). No label printer is
//      configured in the demo, so the label goes to the browser's print
//      window; window.print is stubbed and the window's DOM is read.
//      FAILS (app bug, reported): the label reads "Patient undefined
//      undefined" — buildRequisitionLabelData uses patient.givenNames /
//      familyNames, which the demo LIS cases don't carry (they have
//      firstName / lastName only).
//   5. `npx vitest run src/services/typeSafety/strictTsconfig.guard.test.ts`
//      — CLI, outside this spec.
//
// Texts are the English values of cytologyQcSettingsSection.*,
// sidebar.lisStatus.*, specimenEditModal.* and manageReprintsModal.* in
// src/i18n/locales/en.json; selectors are the app's own .ps-* classes.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5304 npx playwright test --project=chromium \
//        e2e/review/ps-478.strict-type-fixes.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';
import { signIn } from './helpers';

const T = {
  qcTitle: 'Cytology QC Random Selection Rates',           // cytologyQcSettingsSection.title
  facilityRow: 'Neg 25% · Non-Neg 10% (inherited)',        // rateSummaryParts with rate.own / rate.inheritedValue
  staffRow: 'Neg inherited · Non-Neg 30%',                 // rateSummaryParts with rate.inherited / rate.own
  pendingSync: 'Not in LIS',                               // sidebar.lisStatus.pendingSync
  editTitle: 'Edit specimen details',                      // sidebar.specimenRow.editDetails (✏️ title)
  description: 'Description',                              // specimenEditModal.fields.description
  saveChanges: 'Save Changes',                             // specimenEditModal.footer.saveChanges
  manageReprints: 'Manage Reprints',                       // bottom action bar
  printSpec: /Print Spec \(1\)/,                           // manageReprintsModal.footer.printSpec
};

const CASE = 'S26-4408';
const SPECIMEN_A = 'Right breast mastectomy';
const CASES_KEY = 'pathscribe_mock_cases';
const FACILITY_QC_KEY = 'pathscribe_mock_facilityCytologyQcOverrides';
const STAFF_QC_KEY = 'pathscribe_mock_staffCytologyQcOverrides';
const LAB = { id: 'c-fenwick-general', name: 'Fenwick General Hospital' };
const PETE = { id: 'PATH-001', name: 'Pete Nimmo' };

/** Opens the case from the worklist. Long timeouts: the dev server compiles each screen on first use. */
async function openDemoCase(page: Page) {
  await page.goto('/worklist');
  await page.getByText(CASE, { exact: true }).first().click({ timeout: 120_000 });
  await expect(page.locator('.ps-syn-specimen-row').first()).toBeVisible({ timeout: 120_000 });
}

/** Removes the MRN from the stored demo case, then reloads so the app reads it (the case service keeps a copy in memory). */
async function removeStoredMrn(page: Page) {
  await page.goto('/worklist');
  await expect(page.getByText(CASE, { exact: true }).first()).toBeVisible({ timeout: 120_000 });
  await page.evaluate(({ key, id }) => {
    const cases = JSON.parse(localStorage.getItem(key) ?? '[]');
    delete cases.find((x: { id: string }) => x.id === id).patient.mrn;
    localStorage.setItem(key, JSON.stringify(cases));
  }, { key: CASES_KEY, id: CASE });
  await page.reload();
}

test.describe('PS-478 fixes found by strict type-checking', () => {
  test.beforeEach(async ({ page }) => {
    // No call leaves the machine: anything not served by the local dev server is refused, and the AI
    // service (vite's /api/ai proxy, which would call out) is answered here.
    await page.route(u => u.hostname !== 'localhost', r => r.abort());
    await page.route('**/api/ai/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: '{}' }], candidates: [] }) }));
    await signIn(page);
  });

  test('Step 2: a part QC override shows "NN% (inherited)" for the rate it does not set, never "undefined%"', async ({ page }) => {
    test.setTimeout(240_000);
    await test.step('2. Configuration → Cytology → Cytology QC Random Selection Rates: part overrides show inherited rates', async () => {
      const at = new Date().toISOString();
      await page.evaluate(({ fKey, sKey, lab, pete, at }) => {
        localStorage.setItem(fKey, JSON.stringify([{ id: 'fqc-e2e-478', facilityId: lab, overrides: { negativeRandomSelectionRatePercent: 25 }, createdAt: at, updatedAt: at }]));
        localStorage.setItem(sKey, JSON.stringify([{ id: 'sqc-e2e-478', staffUserId: pete, overrides: { nonNegativeRandomSelectionRatePercent: 30 }, createdAt: at, updatedAt: at }]));
      }, { fKey: FACILITY_QC_KEY, sKey: STAFF_QC_KEY, lab: LAB.id, pete: PETE.id, at });
      await page.goto('/configuration?tab=cytology&section=cytology_qc_settings');
      await expect(page.locator('h1.ps-cytqc__title')).toHaveText(T.qcTitle, { timeout: 120_000 });
      const rows = page.locator('.ps-cytqc__row');
      await expect(rows, 'one facility row and one staff row').toHaveCount(2);
      const facilityRow = rows.filter({ hasText: LAB.name });
      await expect(facilityRow.locator('.ps-cytqc__row-summary')).toHaveText(T.facilityRow);
      const staffRow = rows.filter({ hasText: PETE.name });
      await expect(staffRow.locator('.ps-cytqc__row-summary')).toHaveText(T.staffRow);
      await expect(page.locator('.ps-cytqc__page'), 'no "undefined" anywhere on the screen').not.toContainText('undefined');
      // Clean up: remove both overrides with the screen's own Remove buttons.
      await facilityRow.getByRole('button', { name: 'Remove', exact: true }).click();
      await staffRow.getByRole('button', { name: 'Remove', exact: true }).click();
      await expect(rows).toHaveCount(0);
    });
  });

  test('Step 3: editing a specimen on an LIS (S26) case and saving marks it as not yet in the LIS', async ({ page }) => {
    test.setTimeout(240_000);
    await test.step('3. S26-4408 → ✏️ specimen A → change the description → Save Changes → "Not in LIS"', async () => {
      await openDemoCase(page);
      const row = page.locator('.ps-syn-specimen-row').filter({ hasText: SPECIMEN_A });
      await expect(row.locator('.ps-sp-lis-badge'), 'no badge before the edit').toHaveCount(0);
      await row.locator('.ps-specimen-edit-btn').click();
      const modal = page.locator('.ps-specedit-shell');
      await expect(modal).toBeVisible();
      const description = modal.getByLabel(T.description, { exact: true });
      await expect(description).toHaveValue(SPECIMEN_A);
      await description.fill(`${SPECIMEN_A} (E2E-478)`);
      await modal.getByRole('button', { name: T.saveChanges, exact: true }).click();
      await expect(modal).toHaveCount(0);
      const edited = page.locator('.ps-syn-specimen-row').filter({ hasText: `${SPECIMEN_A} (E2E-478)` });
      await expect(edited.locator('.ps-sp-lis-badge'), 'the pending-sync badge').toHaveText(T.pendingSync);
      await expect.poll(() => page.evaluate(({ key, id }) => {
        const c = JSON.parse(localStorage.getItem(key) ?? '[]').find((x: { id: string }) => x.id === id);
        return c?.specimens?.[0]?.lisSyncState;
      }, { key: CASES_KEY, id: CASE }), { message: 'stored as pending_sync' }).toBe('pending_sync');
    });
  });

  test('Step 4: a container label for a case with no MRN prints with no "undefined" in it', async ({ page, context }) => {
    test.setTimeout(240_000);
    // No printer: the browser's print call is stubbed in every window this test opens (the label opens its own).
    await context.addInitScript(() => {
      const w = window as unknown as { __e2ePrints: number; print: () => void };
      w.__e2ePrints = 0;
      w.print = () => { w.__e2ePrints += 1; };
    });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));

    await test.step('4. S26-4408 without an MRN → Manage Reprints → specimen A → Print Spec: the label prints, no "undefined"', async () => {
      await removeStoredMrn(page);
      await openDemoCase(page);
      expect(await page.evaluate(({ key, id }) => {
        const c = JSON.parse(localStorage.getItem(key) ?? '[]').find((x: { id: string }) => x.id === id);
        return c?.patient?.mrn ?? null;
      }, { key: CASES_KEY, id: CASE }), 'the case has no MRN').toBeNull();
      await page.getByRole('button', { name: new RegExp(T.manageReprints) }).click();
      await page.locator('.ps-reprint-card').filter({ hasText: SPECIMEN_A }).first().click();
      const printSpec = page.getByRole('button', { name: T.printSpec });
      await expect(printSpec).toBeEnabled();
      const [label] = await Promise.all([context.waitForEvent('page'), printSpec.click()]);
      await expect(label.locator('body'), 'the label shows the specimen').toContainText(`A — ${SPECIMEN_A}`, { timeout: 30_000 });
      await expect.poll(() => label.evaluate(() => (window as unknown as { __e2ePrints: number }).__e2ePrints), { message: 'handed to print' }).toBe(1);
      const text = await label.locator('body').innerText();
      expect(text, 'no MRN line for a case without one').not.toContain('100008');
      expect(text, 'no "undefined" on the label').not.toContain('undefined');
      await label.close();
      expect(errors, 'no crash').toEqual([]);
    });
  });
});
