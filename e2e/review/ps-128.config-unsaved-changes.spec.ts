// e2e/review/ps-128.config-unsaved-changes.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-128 — "Config Page does not honor dirty flag checks": the review test plan,
// run against the demo (Vite dev server, localStorage data) as Pete Nimmo.
//
// Expected (ticket): any way out of Configuration with unsaved edits asks
// first; with no edits nothing changes.
//
// Automated here (each review step is a test.step):
//   1. Macros: edit a macro, click another Configuration tab → asked.
//   2. "Discard unsaved changes?": Cancel keeps Macros and the edit; Discard
//      changes moves on.
//   3. System → Cassette Colors → + Add Color: typing "Xyz" keeps all three
//      letters (Batch 438 regression: the first keystroke used to be lost).
//   4. With that dialog open: the PathScribe logo asks (Cancel stays); Escape and
//      a click outside the dialog ask with "Keep editing" / "Discard changes".
//   5. Cytology → Nomenclature changed, then another section → asked; the logo
//      and a Configuration tab ask too.
//   6. Sign Out with unsaved changes → "Unsaved Data"; closing or reloading the
//      tab → the browser's own beforeunload warning.
//   7. Nothing changed: tabs, sections, the logo, a reload and Sign Out all go
//      through with no warning; typing in the Configuration search box and a
//      filter never makes the page dirty.
//   8. Already automated by vitest, run on Oct 15, 2026 before this spec was
//      written: src/pages/__tests__/ConfigurationPage.test.tsx and
//      src/services/configDirty/configDirtyRegistry.test.ts — 2 files,
//      26 tests, all passed.
//
// Needs a person: the look of the browser's own leave warning (Playwright only
// sees the dialog's type), and the voice commands "next tab" / "previous tab"
// with unsaved changes (the Web Speech API is not driven here).
//
// Texts are the English values of configuration.dirtyGuard.*,
// logoutWarningModal.* and common.* in src/i18n/locales/en.json; selectors are
// the app's own .ps-* classes.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5304 npx playwright test --project=chromium \
//        e2e/review/ps-128.config-unsaved-changes.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';
import { signIn, openScreen } from './helpers';

// configuration.dirtyGuard.*
const GUARD_TITLE = 'Discard unsaved changes?';
const LEAVE_MESSAGE = 'Configuration has unsaved changes. Leaving now will discard them.';
const DIALOG_MESSAGE = 'This window has unsaved changes. Closing it now will discard them.';
const DISCARD = 'Discard changes';
const KEEP_EDITING = 'Keep editing';
// logoutWarningModal.*
const LOGOUT_TITLE = 'Unsaved Data';
const RETURN_TO_PAGE = 'Return to Page';

/** The PS-128 confirmation (ConfirmModal, shown over any editor dialog). */
const guard = (page: Page) => page.locator('.ps-overlay--confirm').filter({ hasText: GUARD_TITLE });
const guardButton = (page: Page, label: string) => guard(page).getByRole('button', { name: label, exact: true });
const configTab = (page: Page, label: string) => page.locator('.ps-cfgpage-tab-btn').filter({ hasText: label });
const activeTab = (page: Page) => page.locator('.ps-cfgpage-tab-btn--active');
const sectionButton = (page: Page, label: string) => page.locator('.ps-confsys-nav-btn').filter({ hasText: label });
const logo = (page: Page) => page.locator('img.ps-nav-logo');
const signOut = (page: Page) => page.getByRole('button', { name: 'Sign Out', exact: true });

async function openConfiguration(page: Page, query: string) {
  await openScreen(page, `/configuration?${query}`, 'Configuration');
}

/** Macros: select the first demo macro and change its name (unsaved). */
async function editAMacro(page: Page) {
  await openConfiguration(page, 'tab=macros');
  const item = page.locator('.ps-macro-list-item').first();
  await expect(item, 'the demo has macros').toBeVisible({ timeout: 15_000 });
  await item.click();
  const name = page.getByLabel('Macro Name');
  await expect(name).toBeVisible();
  const original = await name.inputValue();
  await name.fill(`${original} E2E-128`);
  return { name, edited: `${original} E2E-128` };
}

/** System → Cassette Colors → + Add Color, with "Xyz" typed in the name. */
async function openCassetteColorDialogWithEdit(page: Page) {
  await openConfiguration(page, 'tab=system&section=cassette_colors');
  await page.getByRole('button', { name: '+ Add Color', exact: true }).click();
  const dialog = page.locator('.ps-ms-overlay').filter({ hasText: 'Add Cassette Color' });
  await expect(dialog).toBeVisible();
  const nameField = dialog.getByLabel('Display Name');
  await nameField.click();
  await nameField.pressSequentially('Xyz', { delay: 60 });
  return { dialog, nameField };
}

/** Cytology → Nomenclature: pick a different enterprise default (unsaved). */
async function changeNomenclature(page: Page) {
  await openConfiguration(page, 'tab=cytology&section=cytology_nomenclature');
  const select = page.getByLabel('Enterprise Default');
  await expect(select).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(500); // the saved value loads into the draft
  const current = await select.inputValue();
  const values = await select.locator('option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value));
  const other = values.find(v => v !== current)!;
  await select.selectOption(other);
  await expect(page.getByText('Unsaved change', { exact: true })).toBeVisible();
  return { select, other };
}

/** What the browser's own leave warning does when the tab is reloaded. */
async function reloadAndCatchLeaveWarning(page: Page): Promise<string | null> {
  let seen: string | null = null;
  const onDialog = (d: import('@playwright/test').Dialog) => { seen = d.type(); void d.dismiss(); };
  page.on('dialog', onDialog);
  // With a beforeunload handler the reload blocks on the dialog; dismissing it keeps the page.
  await Promise.race([
    page.reload({ waitUntil: 'commit' }).catch(() => {}),
    page.waitForTimeout(3000),
  ]);
  await page.waitForTimeout(500);
  page.off('dialog', onDialog);
  return seen;
}

test.describe('PS-128 Configuration honours unsaved changes', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('Steps 1–2: an edited macro asks before another tab; Cancel keeps it, Discard moves on', async ({ page }) => {
    test.setTimeout(120_000);
    let edited = '';
    let name = page.locator('never');
    await test.step('1. Sign in as Pete Nimmo, open Configuration → Macros, change a macro, click another tab', async () => {
      ({ name, edited } = await editAMacro(page));
      await configTab(page, 'System').click();
      await expect(guard(page), 'the "Discard unsaved changes?" box').toBeVisible();
      await expect(guard(page)).toContainText(LEAVE_MESSAGE);
    });
    await test.step('2. Cancel keeps Macros with the edit intact; Discard changes moves on', async () => {
      await guardButton(page, 'Cancel').click();
      await expect(guard(page)).toHaveCount(0);
      await expect(activeTab(page), 'still on Macros').toHaveText('Macros');
      await expect(name, 'the edit is intact').toHaveValue(edited);
      await configTab(page, 'System').click();
      await expect(guard(page)).toBeVisible();
      await guardButton(page, DISCARD).click();
      await expect(guard(page)).toHaveCount(0);
      await expect(activeTab(page), 'moved on to System').toHaveText('System');
      await expect(page).toHaveURL(/tab=system/);
    });
  });

  test('Steps 3–4: typing in the Add Color dialog keeps every letter; leaving or closing it asks', async ({ page }) => {
    test.setTimeout(120_000);
    let dialog = page.locator('never');
    let nameField = page.locator('never');
    await test.step('3. System → Cassette Colors → + Add Color, type "Xyz": all three letters kept', async () => {
      ({ dialog, nameField } = await openCassetteColorDialogWithEdit(page));
      await expect(nameField, 'no keystroke lost').toHaveValue('Xyz');
    });
    await test.step('4a. With the dialog open, click the PathScribe logo: the warning appears', async () => {
      // The nav bar stays above the dialog's backdrop, so the logo is clickable with the dialog open.
      await logo(page).click();
      await expect(guard(page), 'asked before leaving').toBeVisible();
      await expect(guard(page)).toContainText(LEAVE_MESSAGE);
      // Not leaving: the dialog and its text stay.
      await guardButton(page, 'Cancel').click();
      await expect(guard(page)).toHaveCount(0);
      await expect(dialog, 'the dialog is still open').toBeVisible();
      await expect(nameField).toHaveValue('Xyz');
      await expect(page).toHaveURL(/configuration/);
    });
    await test.step('4b. Escape: "Keep editing" / "Discard changes"; Keep editing keeps the dialog', async () => {
      await nameField.focus();
      await page.keyboard.press('Escape');
      await expect(guard(page)).toBeVisible();
      await expect(guard(page)).toContainText(DIALOG_MESSAGE);
      await expect(guardButton(page, KEEP_EDITING)).toBeVisible();
      await expect(guardButton(page, DISCARD)).toBeVisible();
      await guardButton(page, KEEP_EDITING).click();
      await expect(guard(page)).toHaveCount(0);
      await expect(dialog).toBeVisible();
      await expect(nameField).toHaveValue('Xyz');
    });
    await test.step('4c. Click outside the dialog: the same choice; Discard changes closes it', async () => {
      await dialog.click({ position: { x: 8, y: 300 } }); // the backdrop: left edge, below the nav bar, away from the dialog's box
      await expect(guard(page)).toBeVisible();
      await expect(guard(page)).toContainText(DIALOG_MESSAGE);
      await expect(guardButton(page, KEEP_EDITING)).toBeVisible();
      await guardButton(page, DISCARD).click();
      await expect(guard(page)).toHaveCount(0);
      // Batch 583: Discard now closes the dialog (it used to leave it open, so the test pressed its own Cancel).
      await expect(dialog, 'Discard changes closes the dialog').toHaveCount(0);
      // Nothing unsaved any more: a tab switch goes straight through.
      await configTab(page, 'Macros').click();
      await expect(guard(page)).toHaveCount(0);
      await expect(activeTab(page)).toHaveText('Macros');
    });
  });

  test('Step 5: a changed Cytology setting asks before another section, the logo, or another tab', async ({ page }) => {
    test.setTimeout(120_000);
    let select = page.locator('never');
    let other = '';
    await test.step('5. Cytology → Nomenclature changed, then another section: warned', async () => {
      ({ select, other } = await changeNomenclature(page));
      await sectionButton(page, 'Interpretation and Recommendations').first().click();
      await expect(guard(page)).toBeVisible();
      await expect(guard(page)).toContainText(LEAVE_MESSAGE);
      await guardButton(page, 'Cancel').click();
      await expect(guard(page)).toHaveCount(0);
      await expect(select, 'the change is kept').toHaveValue(other);
    });
    await test.step('5b. The logo asks too (and Cancel stays)', async () => {
      await logo(page).click();
      await expect(guard(page)).toBeVisible();
      await expect(guard(page)).toContainText(LEAVE_MESSAGE);
      await guardButton(page, 'Cancel').click();
      await expect(guard(page)).toHaveCount(0);
      await expect(page).toHaveURL(/configuration\?tab=cytology/);
      await expect(select).toHaveValue(other);
    });
    await test.step('5c. Another Configuration tab asks; Discard changes moves on', async () => {
      await configTab(page, 'Staff').click();
      await expect(guard(page)).toBeVisible();
      await guardButton(page, DISCARD).click();
      await expect(activeTab(page)).toHaveText('Staff');
    });
  });

  test('Step 6: Sign Out shows "Unsaved Data"; closing or reloading the tab gets the browser\'s warning', async ({ page, context }) => {
    test.setTimeout(120_000);
    await test.step('6a. With an unsaved dialog open, click Sign Out: the "Unsaved Data" warning', async () => {
      const { dialog, nameField } = await openCassetteColorDialogWithEdit(page);
      await signOut(page).click();
      const logoutWarning = page.locator('.ps-modal-dark--logout-warning');
      await expect(logoutWarning, 'the "Unsaved Data" warning').toBeVisible();
      await expect(logoutWarning).toContainText(LOGOUT_TITLE);
      await logoutWarning.getByRole('button', { name: new RegExp(RETURN_TO_PAGE) }).click();
      await expect(logoutWarning).toHaveCount(0);
      await expect(dialog, 'still on the page, dialog open').toBeVisible();
      await expect(nameField).toHaveValue('Xyz');
      await expect(page).toHaveURL(/configuration/);
    });
    await test.step('6b. With an unsaved inline change, Sign Out: "Unsaved Data"; Return to Page keeps it', async () => {
      await changeNomenclature(page);
      await signOut(page).click();
      const logoutWarning = page.locator('.ps-modal-dark--logout-warning');
      await expect(logoutWarning).toBeVisible();
      await expect(logoutWarning).toContainText(LOGOUT_TITLE);
      await logoutWarning.getByRole('button', { name: new RegExp(RETURN_TO_PAGE) }).click();
      await expect(logoutWarning).toHaveCount(0);
      await expect(page).toHaveURL(/configuration/);
    });
    await test.step('6c. Reloading the tab: the browser\'s own leave warning (beforeunload)', async () => {
      const seen = await reloadAndCatchLeaveWarning(page);
      expect(seen, 'the browser asked').toBe('beforeunload');
      await expect(page.getByText('Unsaved change', { exact: true }), 'dismissed: still here with the change').toBeVisible();
    });
    await test.step('6d. Closing the tab: the browser\'s own leave warning (beforeunload)', async () => {
      const other = await context.newPage();
      await changeNomenclature(other);
      let seen: string | null = null;
      other.on('dialog', d => { seen = d.type(); void d.accept(); });
      await other.close({ runBeforeUnload: true });
      await expect.poll(() => seen, { message: 'the browser asked before closing' }).toBe('beforeunload');
    });
  });

  test('Step 7: with nothing changed every exit is silent, and filters or search boxes never ask', async ({ page }) => {
    test.setTimeout(120_000);
    await test.step('7a. Macros: a macro selected but untouched; typing in the search box and a filter; tabs switch silently', async () => {
      await openConfiguration(page, 'tab=macros');
      await page.locator('.ps-macro-list-item').first().click();
      await expect(page.getByLabel('Macro Name')).toBeVisible();
      const search = page.locator('.ps-config-search__input');
      await search.click();
      await search.pressSequentially('cassette', { delay: 30 });
      await page.keyboard.press('Escape');
      // Macros has no facility filter (the earlier draft looked for one and silently skipped it); the filter
      // case is the Cassette Colors lab filter in 7b, and the Configuration search box above.
      await configTab(page, 'System').click();
      await expect(guard(page), 'no warning').toHaveCount(0);
      await expect(activeTab(page)).toHaveText('System');
    });
    await test.step('7b. Cassette Colors: Add Color opened and cancelled untouched; a lab filter changed; sections switch silently', async () => {
      await openConfiguration(page, 'tab=system&section=cassette_colors');
      await page.getByRole('button', { name: '+ Add Color', exact: true }).click();
      const dialog = page.locator('.ps-ms-overlay').filter({ hasText: 'Add Cassette Color' });
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(guard(page), 'Escape on an untouched dialog asks nothing').toHaveCount(0);
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      const labFilter = page.getByLabel('Filter by laboratory');
      await expect(labFilter, 'the lab filter is on screen').toBeVisible();
      await labFilter.selectOption('Global');
      await sectionButton(page, 'Cassette Routing Rules').first().click();
      await expect(guard(page)).toHaveCount(0);
      await expect(sectionButton(page, 'Cassette Routing Rules').first()).toHaveClass(/ps-confsys-nav-btn--active/);
    });
    await test.step('7c. Cytology: a section switch, then the logo, with no warning', async () => {
      await openConfiguration(page, 'tab=cytology&section=cytology_nomenclature');
      await expect(page.getByLabel('Enterprise Default')).toBeVisible({ timeout: 15_000 });
      await sectionButton(page, 'Interpretation and Recommendations').first().click();
      await expect(guard(page)).toHaveCount(0);
      await logo(page).click();
      await expect(guard(page)).toHaveCount(0);
      await expect(page, 'went Home').toHaveURL(/\/$/);
    });
    await test.step('7d. A reload with nothing changed: no browser warning', async () => {
      await openConfiguration(page, 'tab=macros');
      const seen = await reloadAndCatchLeaveWarning(page);
      expect(seen, 'no beforeunload dialog').toBeNull();
    });
    await test.step('7e. Sign Out with nothing changed: straight to the sign-in page', async () => {
      await openConfiguration(page, 'tab=macros');
      await signOut(page).click();
      await expect(page.locator('.ps-modal-dark--logout-warning')).toHaveCount(0);
      await expect(page.locator('.ps-login-page'), 'signed out').toBeVisible({ timeout: 15_000 });
    });
  });
});
