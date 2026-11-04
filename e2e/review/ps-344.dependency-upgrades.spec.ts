// e2e/review/ps-344.dependency-upgrades.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-344 — "Review and fix npm dependency security vulnerabilities (54: 8
// high, 46 moderate)": the review test plan's browser steps after the TipTap,
// React Router 7 and Node 24 upgrades, run against the demo (Vite dev server,
// localStorage data) as Pete Nimmo.
//
// Expected (ticket): no high/critical audit findings; the editor and
// navigation work as before on React Router 7 and Node 24.
//
//   1. On Node 24: `npm install`, then `npm audit`: 0 high, 0 critical, only
//      2 moderate (uuid under firebase-admin) — CLI, outside this spec.
//   2. `npm run type-check` and `npm test`: both clean — CLI, outside this
//      spec.
//   3. Open a case report (S26-4408) and type in a narrative field (specimen
//      A's Microscopic Description): spell check underlines, offers
//      replacements, Add to dictionary and the language switch work.
//                                                                   automated
//      "tumour" is flagged as the other spelling convention under the
//      facility default (English (United States)) and not under English
//      (United Kingdom); "nuclaer" is misspelled and replaced from the menu
//      with "nuclear"; "Add to my dictionary" clears the flag on "tumour".
//   4. Bold, insert a table and toggle formatting marks; typing stays smooth.
//      automated: Bold wraps the selection in <strong>, Insert Table (2 × 3)
//      adds a table with a header row, the ¶ button turns formatting marks on
//      and off, and text typed afterwards lands complete.
//      needs a person: "smooth" (no perceptible lag) is a judgement by feel.
//   5. Worklist → a case → Configuration (?tab=macros) → Audit Log (/audit,
//      titled "System Logs" on screen), then the
//      browser Back button through each: every page loads, with no console
//      errors and no uncaught page errors.                         automated
//      FAILS (app bug, reported): every page loads and Back works, but the
//      System Logs screen logs dozens of React "Encountered two children with
//      the same key" console errors: the demo audit service gives entries the
//      id 'al-' + Date.now() (services/auditlog/mockAuditService.ts), so
//      entries written in the same millisecond share an id.
//   6. An unknown address in the browser bar: you are sent to sign-in, then
//      (after signing in) the Home page.                           automated
//      Signing in uses a password this test sets for Sarah Johnson on the
//      Staff screen and removes afterwards (no demo password is used).
//      Signed in or not, the unknown address lands on /login and the sign-in
//      form; a signed-in session is not taken straight to Home.
//
// Texts are the English values of spellCheck.*, pathScribeEditor.toolbar.*,
// microscopicEntryPanel.* and login.* in src/i18n/locales/en.json; selectors
// are the app's own .ps-* / .pse-* classes.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5304 npx playwright test --project=chromium \
//        e2e/review/ps-344.dependency-upgrades.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';
import { signIn, startSession, passwordPanel, closeStaffEditor, signOut, DEMO_USERS } from './helpers';

const T = {
  addMicroscopic: '+ Add Microscopic Description',       // sidebar (microscopic entry)
  addPersonal: 'Add to my dictionary',                   // spellCheck.menu.addPersonal
  ukEnglish: 'English (United Kingdom)',                 // spellCheck.locales.en-GB
  useDefault: 'Default',                                 // spellCheck.language.useDefault
  regionalHint: 'Other spelling convention (this report uses English (United States))', // spellCheck.menu.regionalHint
  bold: 'Bold (Ctrl+B)',                                 // pathScribeEditor.toolbar.bold
  insertTable: 'Insert Table',                           // pathScribeEditor.toolbar.insertTable
  formattingMarks: 'Show/Hide Formatting Marks (¶)',     // pathScribeEditor.toolbar.toggleFormattingMarks
  configuration: 'Configuration',
  auditTitle: 'System Logs',                             // auditLog.page.title (the Audit Log screen, /audit)
  passwordSaved: 'Password saved.',                      // staffTab.signInPassword.saved
  passwordRemoved: 'Password removed.',                  // staffTab.signInPassword.removed
};

const CASE = 'S26-4408';
const SARAH = { name: 'Sarah Johnson', email: 'sarah.johnson@demo.pathscribe.ai' };
const SARAH_PW = 'Heron-Basalt-Juniper-4471'; // set by this test, removed afterwards

/** Collects console errors and uncaught errors for the page. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m: ConsoleMessage) => { if (m.type() === 'error') errors.push(`console.error: ${m.text().slice(0, 300)}`); });
  page.on('pageerror', e => errors.push(`pageerror: ${e.message.slice(0, 300)}`));
  return errors;
}

/**
 * Staff → edit <name>, as helpers.openStaffEditor does but with a long first-load wait (the shared
 * helper allows 20 s; the dev server compiles this screen slowly on a loaded machine).
 */
async function openStaffEditor(page: Page, name: string) {
  await page.goto('/configuration?tab=staff&section=members');
  await expect(page.locator('.ps-st-tab--active')).toBeVisible({ timeout: 120_000 });
  await page.locator('.ps-st-search').fill(name);
  const row = page.locator('.ps-st-tr').filter({ hasText: name }).first();
  await expect(row).toBeVisible({ timeout: 30_000 });
  await row.locator('.ps-st-edit-btn').click();
  const editor = page.locator('.ps-conf-modal').filter({ has: page.locator('.ps-st-modal-header') });
  await expect(editor).toBeVisible();
  return editor;
}

/** Staff → <name> → Sign-in password → Set password (no change required); returns the editor and its message. */
async function setStaffPassword(page: Page, name: string, password: string) {
  const editor = await openStaffEditor(page, name);
  const panel = passwordPanel(editor);
  await panel.getByRole('button', { name: /^(Set password|Reset password)$/ }).click();
  const form = panel.locator('.ps-st-password-form');
  await form.locator('input[id^="pw-new-"]').fill(password);
  await form.locator('input[id^="pw-confirm-"]').fill(password);
  const mustChange = form.locator('input[type="checkbox"]');
  if (await mustChange.isChecked()) await mustChange.click();
  await form.getByRole('button', { name: 'Save password', exact: true }).click();
  const message = panel.locator('[role="status"]');
  await expect(message).toBeVisible({ timeout: 20_000 });
  return { editor, message: (await message.textContent())?.trim() ?? '' };
}

/** Staff → <name> → Remove password (confirmed); returns the editor and its message. */
async function removeStaffPassword(page: Page, name: string) {
  const editor = await openStaffEditor(page, name);
  const panel = passwordPanel(editor);
  await panel.getByRole('button', { name: 'Remove password', exact: true }).click();
  const confirm = page.locator('.ps-overlay--confirm').filter({ hasText: 'Remove this password?' });
  await confirm.getByRole('button', { name: 'Remove password', exact: true }).click();
  const message = panel.locator('[role="status"]');
  await expect(message).toBeVisible({ timeout: 20_000 });
  return { editor, message: (await message.textContent())?.trim() ?? '' };
}

async function openDemoCase(page: Page) {
  await page.goto('/worklist');
  await page.getByText(CASE, { exact: true }).first().click({ timeout: 120_000 });
  await expect(page.locator('.ps-syn-specimen-row').first()).toBeVisible({ timeout: 120_000 });
}

test.describe('PS-344 editor and navigation after the dependency upgrades', () => {
  test.beforeEach(async ({ page }) => {
    // No call leaves the machine: anything not served by the local dev server is refused, and the AI
    // service (vite's /api/ai proxy, which would call out) is answered here.
    await page.route(u => u.hostname !== 'localhost', r => r.abort());
    await page.route('**/api/ai/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: '{}' }], candidates: [] }) }));
    await signIn(page);
  });

  test('Steps 3–4: spell check (underline, replacements, add to dictionary, language) and bold / table / formatting marks in a narrative field', async ({ page }) => {
    test.setTimeout(300_000);
    const panel = page.locator('.ps-micro-entry');
    const editor = panel.locator('.ProseMirror');
    const flagged = (word: string) => editor.locator('.ps-spell', { hasText: new RegExp(`^${word}$`) });

    await test.step('3. Type in a narrative field: spell check underlines, offers replacements, Add to dictionary and the language switch work', async () => {
      await openDemoCase(page);
      await page.getByText(T.addMicroscopic).first().click();
      await expect(editor).toBeVisible();
      await editor.click();
      await page.keyboard.type('The tumour shows nuclaer pleomorphism. ');
      // Underlines: a misspelling and the other spelling convention.
      await expect(flagged('nuclaer'), 'misspelling underlined').toHaveClass(/ps-spell--misspelled/, { timeout: 30_000 });
      await expect(flagged('tumour'), 'other convention underlined').toHaveClass(/ps-spell--regionalVariant/);
      // Replacements: right-click → the menu offers "nuclear"; choosing it replaces the word.
      await flagged('nuclaer').click({ button: 'right' });
      const menu = page.locator('.ps-spellmenu[role="menu"]');
      await expect(menu).toBeVisible();
      await menu.getByRole('menuitem', { name: 'nuclear', exact: true }).click();
      await expect(menu).toHaveCount(0);
      await expect(editor).toContainText('The tumour shows nuclear pleomorphism.');
      await expect(flagged('nuclear'), 'no underline after the replacement').toHaveCount(0);
      // Language switch: English (United Kingdom) accepts "tumour"; back to the default flags it again.
      const language = panel.locator('.ps-spelllang__select');
      await language.selectOption({ label: T.ukEnglish });
      await expect(panel.locator('.ps-spelllang__source')).toContainText(T.ukEnglish);
      await expect(flagged('tumour'), 'accepted in UK English').toHaveCount(0, { timeout: 30_000 });
      await language.selectOption({ label: T.useDefault });
      await expect(flagged('tumour'), 'flagged again under the facility default').toHaveCount(1, { timeout: 30_000 });
      // Add to my dictionary: the flag goes.
      await flagged('tumour').click({ button: 'right' });
      await expect(menu).toBeVisible();
      await expect(menu).toContainText(T.regionalHint);
      await menu.getByRole('menuitem', { name: T.addPersonal, exact: true }).click();
      await expect(flagged('tumour'), 'added to my dictionary').toHaveCount(0, { timeout: 30_000 });
    });

    await test.step('4. Bold, insert a table and toggle formatting marks; typing afterwards lands complete', async () => {
      // Bold: type a word, select it with the keyboard (Shift+←), press Bold.
      await editor.press('End');
      await page.keyboard.type('Grade2');
      for (let i = 0; i < 'Grade2'.length; i++) await page.keyboard.press('Shift+ArrowLeft');
      await panel.getByTitle(T.bold, { exact: true }).click();
      await expect(editor.locator('strong'), 'bold applied').toHaveText('Grade2');
      // Insert Table: the size picker, 2 rows × 3 columns.
      await editor.press('End');
      await panel.getByTitle(T.insertTable, { exact: true }).click();
      const picker = panel.locator('.pse-inserttable-panel');
      await expect(picker).toBeVisible();
      await picker.locator('.pse-inserttable-cell').nth(1 * 10 + 2).click(); // row 2, column 3 (10 columns per row)
      const table = editor.locator('table');
      await expect(table, 'a table is inserted').toHaveCount(1);
      await expect(table.locator('tr')).toHaveCount(2);
      await expect(table.locator('tr').first().locator('th')).toHaveCount(3);
      // Formatting marks on, then off.
      const wrap = panel.locator('.pse-editor-wrap');
      await panel.getByTitle(T.formattingMarks, { exact: true }).click();
      await expect(wrap).toHaveClass(/pse-editor-wrap--marks/);
      await panel.getByTitle(T.formattingMarks, { exact: true }).click();
      await expect(wrap).not.toHaveClass(/pse-editor-wrap--marks/);
      // Typing afterwards: every character lands, in the table's first cell.
      const sentence = 'Margins clear by 4 mm; no lymphovascular invasion seen.';
      await table.locator('th').first().click();
      await page.keyboard.type(sentence);
      await expect(table.locator('th').first()).toHaveText(sentence);
    });
  });

  test('Step 5: Worklist → case → Configuration (?tab=) → Audit Log and Back through each, with no console errors', async ({ page }) => {
    test.setTimeout(300_000);
    const errors = watchErrors(page);
    const worklistReady = () => expect(page.getByText(CASE, { exact: true }).first()).toBeVisible({ timeout: 120_000 });
    const caseReady = () => expect(page.locator('.ps-syn-specimen-row').first()).toBeVisible({ timeout: 120_000 });
    const configReady = () => expect(page.locator('.ps-cfgpage-tab-btn--active')).toHaveText('Macros', { timeout: 120_000 });
    const auditReady = () => expect(page.locator('h1.ps-auditlog-title')).toHaveText(T.auditTitle, { timeout: 120_000 });

    await test.step('5. Navigate forward through four screens, then Back through each', async () => {
      await page.goto('/worklist');
      await worklistReady();
      await page.getByText(CASE, { exact: true }).first().click();
      await caseReady();
      // The case address carries the case's support reference, not its accession.
      await expect(page).toHaveURL(/\/case\/[^/]+\/synoptic/);
      const caseUrl = page.url();
      await page.goto('/configuration?tab=macros');
      await configReady();
      await page.goto('/audit');
      await auditReady();
      await page.goBack();
      await expect(page).toHaveURL(/\/configuration\?tab=macros/);
      await configReady();
      await page.goBack();
      await expect(page).toHaveURL(caseUrl);
      await caseReady();
      await page.goBack();
      await expect(page).toHaveURL(/\/worklist/);
      await worklistReady();
      expect(errors, 'no console errors or uncaught errors on any page').toEqual([]);
    });
  });

  test('Step 6: an unknown address goes to sign-in, then to Home after signing in', async ({ page }) => {
    test.setTimeout(300_000);
    await test.step('6. Sign out, type an unknown address: the sign-in page; sign in: the Home page', async () => {
      // A password for Sarah Johnson, set on the Staff screen (removed at the end).
      const { editor, message } = await setStaffPassword(page, SARAH.name, SARAH_PW);
      expect(message).toBe(T.passwordSaved);
      await closeStaffEditor(editor);
      await signOut(page);
      await page.goto('/no-such-page-e2e-344');
      await expect(page, 'sent to sign-in').toHaveURL(/\/login$/, { timeout: 120_000 });
      await expect(page.locator('#login-email')).toBeVisible();
      await page.locator('#login-email').fill(SARAH.email);
      await page.locator('#login-password').fill(SARAH_PW);
      await page.locator('.ps-login-submit').click();
      await expect(page, 'then Home').toHaveURL(/\/$/, { timeout: 60_000 });
      await expect(page.locator('.ps-home-main')).toBeVisible({ timeout: 60_000 });
      await expect(page.locator('.ps-home-title')).toContainText(SARAH.name.split(' ')[0]);
    });

    await test.step('Clean up: remove the password again (as Pete Nimmo, keeping the demo data)', async () => {
      await startSession(page, DEMO_USERS.pete);
      const { editor, message } = await removeStaffPassword(page, SARAH.name);
      expect(message).toBe(T.passwordRemoved);
      await closeStaffEditor(editor);
    });
  });
});
