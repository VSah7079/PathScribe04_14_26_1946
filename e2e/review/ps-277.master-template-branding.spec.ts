// e2e/review/ps-277.master-template-branding.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-277 — "Master Template Engine: modular headers/footers, conditional
// branding, page-break control, typography governance". The review test plan,
// run against the demo as Pete Nimmo. Batch 586.
//
//   1. Configuration → System → Facility Configuration → edit a Performing Lab facility (the ticket says Metro General; the fields show only for one) →
//      General: set Laboratory Director Name, CLIA / ISO Accreditation Number,
//      a Header Logo URL, tick "Force addenda onto a dedicated page"; save.   automated
//   2. Configuration → System → Departments: edit a department and see the
//      "Report Branding Override (optional)" fields.                          automated
//   3–5. Print the cytology case PDF: page 1 header (logo, director, CLIA),
//      later pages' short header with Page X of Y, addenda on a new page,
//      headings never alone at the bottom.     needs a person: the report
//      renderer (render_report) is not deployed yet (dev note, Oct 16), and
//      the check is visual review of the PDF.
//   6. Known gaps (informational): only the cytology PDF uses this (the surgical
//      PDF is server-side, PS-333); no separate technical-component branding.
//
// The values are checked as saved in the stored facility record, and again by
// reopening the editor.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5323 npx playwright test --project=chromium \
//        e2e/review/ps-277.master-template-branding.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';
import { signIn, openScreen } from './helpers';

// The ticket says Metro General; the branding fields only show for a facility with the Performing Lab
// role, which Metro General Hospital does not have in the demo. Fenwick General Hospital does.
const LAB = 'Fenwick General Hospital';
const T = {
  edit: 'Edit',                                   // facilityTable edit button
  director: 'Laboratory Director Name',           // facilityEditorModal.general.directorName
  clia: 'CLIA / ISO Accreditation Number',        // facilityEditorModal.general.cliaIsoNumber
  logo: 'Header Logo URL',                        // facilityEditorModal.general.headerLogoUrl
  addendum: 'Force addenda onto a dedicated page', // ...forceAddendumOnDedicatedPageCheckbox
  save: 'Save Changes',
  branding: 'Report Branding Override (optional)', // departmentsSection.modal.brandingSectionTitle
};
const editor = (page: Page) => page.locator('.ps-overlay--facility-editor');

async function openLabEditor(page: Page) {
  await openScreen(page, '/configuration?tab=system&section=clients', 'Facility Configuration');
  await expect(page.locator('.fct-table')).toBeVisible({ timeout: 15_000 });
  await page.locator('.fct-search-input').fill(LAB);
  const row = page.locator('.fct-table tbody tr').filter({ hasText: LAB }).first();
  await expect(row, `${LAB} is listed`).toBeVisible();
  await row.locator('.fct-action-btn--edit').filter({ hasText: T.edit }).click();
  await expect(editor(page)).toBeVisible();
}

test.describe('PS-277: report branding settings', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('Step 1: director, CLIA / ISO number, header logo and "addenda on their own page" save and reopen', async ({ page }) => {
    test.setTimeout(180_000);
    await openLabEditor(page);
    const ed = editor(page);
    await ed.getByLabel(T.director, { exact: true }).fill('Dr. Review Director');
    await ed.getByLabel(T.clia, { exact: true }).fill('03D1234567');
    await ed.getByLabel(T.logo, { exact: true }).fill('https://example.org/logo.png');
    const box = ed.getByLabel(T.addendum, { exact: true });
    if (!(await box.isChecked())) await box.check();
    await ed.getByRole('button', { name: T.save, exact: true }).click();
    await expect(ed, 'the editor closes after saving').toHaveCount(0, { timeout: 15_000 });

    await openLabEditor(page);
    const again = editor(page);
    await expect(again.getByLabel(T.director, { exact: true })).toHaveValue('Dr. Review Director');
    await expect(again.getByLabel(T.clia, { exact: true })).toHaveValue('03D1234567');
    await expect(again.getByLabel(T.logo, { exact: true })).toHaveValue('https://example.org/logo.png');
    await expect(again.getByLabel(T.addendum, { exact: true })).toBeChecked();
  });

  test('Step 2: a department has the "Report Branding Override (optional)" fields', async ({ page }) => {
    await openScreen(page, '/configuration?tab=system&section=departments', 'Configuration');
    const edit = page.getByRole('button', { name: 'Edit', exact: true }).first();
    await expect(edit, 'a department to edit').toBeVisible({ timeout: 20_000 });
    await edit.click();
    await expect(page.getByText(T.branding, { exact: true }), 'the branding section').toBeVisible({ timeout: 10_000 });
    for (const label of [T.director, T.clia, T.logo]) await expect(page.getByLabel(label, { exact: true }), label).toBeVisible();
  });
});
