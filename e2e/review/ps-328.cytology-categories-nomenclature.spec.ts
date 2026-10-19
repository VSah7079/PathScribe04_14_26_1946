// e2e/review/ps-328.cytology-categories-nomenclature.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-328 — "Cytology Categories admin screen: remove or clarify the unused
// PALGA CISOE-A dictionary entry option": the review test plan, run against the
// demo (Vite dev server, localStorage data) as Pete Nimmo.
//
// Expected (ticket): an admin can no longer add categories under PALGA
// CISOE-A. The Dutch CISOE-A screen never reads this dictionary, so the entry
// option was a trap; the facility-level choice of CISOE-A as a site's reporting
// system (Cytology Nomenclature System) is unchanged.
//
// Automated here (each review step is a test.step):
//   1. Sign in as Pete; Configuration → Cytology → Interpretation and
//      Recommendations (the Cytology Categories dictionary,
//      src/components/Config/System/CytologyCategoriesSection.tsx, which the
//      Cytology tab lists as section id cytology_categories).
//   2. Open the "Nomenclature System" selector.
//   3. It offers exactly Bethesda System, BSCC / RCPath (UK, Scotland,
//      Ireland), München III (Germany) and SFCC (France), in that order;
//      "PALGA CISOE-A (Netherlands)" is not among them.
//   4. SFCC chosen: the banner explains it uses Bethesda's own categories, and
//      + Add Category, Edit and Deactivate are hidden (the reference pattern
//      for a system without entries of its own).
//   5. Configuration → Cytology → Cytology Nomenclature System: the Enterprise
//      Default selector and the facility-override selector still offer
//      "PALGA CISOE-A (Netherlands)".
//   7. Already automated by vitest, run on Oct 15, 2026 before this spec was
//      written: src/components/Config/System/CytologyCategoriesSection.test.tsx
//      — 1 file, 2 tests, all passed.
//
// Needs a person: step 6 (note only on the ticket: nothing to do). Nothing
// else in the plan is left to a person.
//
// Texts are the English values of cytologyCategoriesSection.*,
// cytologyNomenclatureSettingsSection.*, cytologyQcSettingsSection.* and
// a11y.fields.* in src/i18n/locales/en.json; selectors are the app's own
// .ps-* classes and aria-labels.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5308 npx playwright test --project=chromium \
//        e2e/review/ps-328.cytology-categories-nomenclature.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';
import { signIn, openScreen } from './helpers';

// cytologyCategoriesSection.*
const DICTIONARY_TITLE = 'Interpretation and Recommendations';
const SELECTOR_LABEL = 'Nomenclature System';
const BETHESDA = 'Bethesda System';
const BSCC_RCPATH = 'BSCC / RCPath (UK, Scotland, Ireland)';
const MUNCHEN = 'München III (Germany)';
const SFCC = 'SFCC (France)';
const PALGA = 'PALGA CISOE-A (Netherlands)';
const ADD_CATEGORY = '+ Add Category';
const SFCC_BANNER = "SFCC uses Bethesda's own categories with French text substituted — not a separate system. Switch to Bethesda to add, edit, or translate an entry.";
// cytologyNomenclatureSettingsSection.*, cytologyQcSettingsSection.*, a11y.fields.*
const SETTINGS_TITLE = 'Cytology Nomenclature System';
const ENTERPRISE_DEFAULT = 'Enterprise Default';
const ADD_OVERRIDE = '+ Add Override';
const FACILITY_SYSTEM = 'Nomenclature system';

const optionTexts = (select: ReturnType<Page['locator']>) =>
  select.locator('option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).textContent?.trim() ?? ''));

test.describe('PS-328 Cytology Categories: no PALGA CISOE-A dictionary entry option', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('Steps 1–5: the dictionary offers four systems (no CISOE-A); SFCC is read-only; the facility setting still offers CISOE-A', async ({ page }) => {
    test.setTimeout(120_000);
    const selector = page.getByLabel(SELECTOR_LABEL, { exact: true });

    await test.step('1. Sign in as Pete; Configuration → Cytology → Interpretation and Recommendations', async () => {
      await openScreen(page, '/configuration?tab=cytology&section=cytology_categories', 'Configuration');
      await expect(page.locator('.ps-cytcat-title'), 'the Cytology Categories dictionary').toHaveText(DICTIONARY_TITLE);
      await expect(page.locator('.ps-confsys-nav-btn--active'), 'its sidebar entry is the active one').toContainText(DICTIONARY_TITLE);
    });

    await test.step('2. Open the nomenclature-system selector', async () => {
      await expect(selector, 'the "Nomenclature System" selector').toBeVisible();
      await expect(selector).toHaveClass(/ps-cytcat-nomenclature-select/);
      await expect(selector, 'defaults to Bethesda').toHaveValue('bethesda');
      await selector.click();
      await page.waitForTimeout(300);
      await page.keyboard.press('Escape');
    });

    await test.step('3. Bethesda System, BSCC / RCPath, München III and SFCC (France) only; no PALGA CISOE-A', async () => {
      const texts = await optionTexts(selector);
      expect(texts, 'exactly the four systems, in order').toEqual([BETHESDA, BSCC_RCPATH, MUNCHEN, SFCC]);
      expect(texts, 'PALGA CISOE-A is not offered').not.toContain(PALGA);
      await expect(selector.locator('option[value="palga_cisoea"]'), 'no palga_cisoea option value either').toHaveCount(0);
    });

    await test.step('4. SFCC chosen: the note explains it uses Bethesda\'s categories; Add / Edit / Deactivate are hidden', async () => {
      // Bethesda first: the actions are there, so their absence under SFCC means something.
      await expect(page.getByRole('button', { name: ADD_CATEGORY, exact: true }), 'Bethesda: + Add Category shown').toBeVisible();
      await expect(page.locator('.ps-cytcat-row').first(), 'Bethesda: the demo has entries').toBeVisible({ timeout: 15_000 });
      await expect(page.locator('.ps-cytcat-btn-row-edit').first(), 'Bethesda: Edit shown').toBeVisible();
      await expect(page.locator('.ps-cytcat-btn-row-secondary').first(), 'Bethesda: Deactivate shown').toBeVisible();
      await expect(page.locator('.ps-cytcat-sfcc-banner'), 'Bethesda: no SFCC banner').toHaveCount(0);

      await selector.selectOption('sfcc');
      await expect(selector).toHaveValue('sfcc');
      await expect(page.locator('.ps-cytcat-sfcc-banner'), 'the SFCC note').toBeVisible();
      await expect(page.locator('.ps-cytcat-sfcc-banner')).toHaveText(SFCC_BANNER);
      await expect(page.locator('.ps-cytcat-row').first(), 'SFCC: Bethesda\'s entries are listed (derived view)').toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole('button', { name: ADD_CATEGORY, exact: true }), 'SFCC: + Add Category hidden').toHaveCount(0);
      await expect(page.locator('.ps-cytcat-btn-row-edit'), 'SFCC: Edit hidden').toHaveCount(0);
      await expect(page.locator('.ps-cytcat-btn-row-secondary'), 'SFCC: Deactivate hidden').toHaveCount(0);
    });

    await test.step('5. Configuration → Cytology → Cytology Nomenclature System: CISOE-A is still offered for the enterprise and a facility', async () => {
      await openScreen(page, '/configuration?tab=cytology&section=cytology_nomenclature', 'Configuration');
      await expect(page.locator('.ps-conf-section-title')).toHaveText(SETTINGS_TITLE);
      const enterprise = page.getByLabel(ENTERPRISE_DEFAULT, { exact: true });
      await expect(enterprise).toBeVisible({ timeout: 15_000 });
      expect(await optionTexts(enterprise), 'Enterprise Default offers PALGA CISOE-A').toContain(PALGA);
      await expect(enterprise.locator('option[value="palga_cisoea"]')).toHaveCount(1);
      // A facility override: the same list, CISOE-A included.
      await page.getByRole('button', { name: ADD_OVERRIDE, exact: true }).click();
      const facilitySystem = page.getByLabel(FACILITY_SYSTEM, { exact: true });
      await expect(facilitySystem, 'the facility override\'s system selector').toBeVisible();
      expect(await optionTexts(facilitySystem), 'a facility can be set to PALGA CISOE-A').toContain(PALGA);
      await facilitySystem.selectOption('palga_cisoea');
      await expect(facilitySystem).toHaveValue('palga_cisoea');
      // Not saved: the demo keeps its facilities as they were.
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(facilitySystem).toHaveCount(0);
    });
  });
});
