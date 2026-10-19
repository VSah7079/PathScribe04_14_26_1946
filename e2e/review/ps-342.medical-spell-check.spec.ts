// e2e/review/ps-342.medical-spell-check.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-342 — "Multi-Jurisdiction Medical Spell Checking & Lexicon Infrastructure".
// The review test plan, run against the demo as Pete Nimmo. Batch 586.
//
//   1. Open a case; in the report editor header set Spelling to English (UK).    automated
//   2. Type "haematology tumour specimin": "specimin" gets the misspelling
//      underline; "color" gets the other-convention underline.                  automated
//   3. Clinical codes (a SNOMED id, a LOINC code 12345-6, pT2N1, Gleason 3+4=7)
//      are not flagged.                                                         automated
//   4. Right-click "specimin": "specimen" is the first suggestion; the menu also
//      offers "Add to my dictionary" and (as admin) the facility dictionary.    automated
//   5. Switch to US English: "tumour" and "haematology" are flagged as the other
//      convention; Default goes back to the facility's language.                automated
//   6. A plain text box (Case Hold, Amendment) and Staff → Spelling language.   not in this spec
//   7. Real SNOMED/LOINC national dictionaries (licences, PS-343) and German /
//      Korean term review.                                                      needs a person
//   "Typing stays smooth": a rough check only — the 60 typed characters land
//   within a few seconds.                                                       automated (rough)
//
// Selectors: the editor's .ps-spell marks (--misspelled / --regionalVariant),
// the .ps-spellmenu menu and the .ps-spelllang__select language control, as the
// PS-344 spec uses them. Texts: spellCheck.* in src/i18n/locales/en.json.
// No call leaves the machine: anything not served locally is refused.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5321 npx playwright test --project=chromium \
//        e2e/review/ps-342.medical-spell-check.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect } from '@playwright/test';
import { signIn } from './helpers';

const T = {
  addMicroscopic: '+ Add Microscopic Description',
  ukEnglish: 'English (United Kingdom)',      // spellCheck.locales.en-GB
  usEnglish: 'English (United States)',       // spellCheck.locales.en-US
  useDefault: 'Default',                      // spellCheck.language.useDefault
  addPersonal: 'Add to my dictionary',        // spellCheck.menu.addPersonal
};
const CASE = 'S26-4408';

test.describe('PS-342: medical spell checking', () => {
  test('Steps 1–5: UK English, codes accepted, suggestions and dictionaries, US English and back', async ({ page }) => {
    test.setTimeout(300_000);
    await page.route(u => u.hostname !== 'localhost', r => r.abort());
    await page.route('**/api/ai/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: '{}' }], stop_reason: 'end_turn' }) }));
    await signIn(page);
    await page.goto('/worklist');
    await page.getByText(CASE, { exact: true }).first().click({ timeout: 120_000 });
    await expect(page.locator('.ps-syn-specimen-row').first()).toBeVisible({ timeout: 120_000 });
    await page.getByText(T.addMicroscopic).first().click();
    const panel = page.locator('.ps-micro-entry');
    const editor = panel.locator('.ProseMirror');
    const flagged = (word: string) => editor.locator('.ps-spell', { hasText: new RegExp(`^${word}$`) });
    await expect(editor).toBeVisible();

    await test.step('1. Spelling → English (United Kingdom)', async () => {
      await panel.locator('.ps-spelllang__select').selectOption({ label: T.ukEnglish });
      await expect(panel.locator('.ps-spelllang__source')).toContainText(T.ukEnglish);
    });

    await test.step('2–3. "haematology tumour specimin color" and the clinical codes', async () => {
      await editor.click();
      const text = 'haematology tumour specimin color SNOMED 254837009 LOINC 12345-6 pT2N1 Gleason 3+4=7 ';
      const started = Date.now();
      await page.keyboard.type(text);
      expect(Date.now() - started, 'typing stays smooth: the text lands in a few seconds').toBeLessThan(15_000);
      await expect(flagged('specimin'), 'misspelling underlined').toHaveClass(/ps-spell--misspelled/, { timeout: 30_000 });
      await expect(flagged('color'), 'other convention underlined').toHaveClass(/ps-spell--regionalVariant/, { timeout: 30_000 });
      await expect(flagged('haematology'), 'UK spelling accepted').toHaveCount(0);
      await expect(flagged('tumour'), 'UK spelling accepted').toHaveCount(0);
      for (const code of ['254837009', '12345-6', 'pT2N1', 'Gleason', '3\\+4=7', 'SNOMED', 'LOINC']) {
        await expect(editor.locator('.ps-spell', { hasText: new RegExp(code) }), `${code.replace('\\', '')} not flagged`).toHaveCount(0);
      }
    });

    await test.step('4. Right-click "specimin": "specimen" first; both dictionaries offered', async () => {
      await flagged('specimin').click({ button: 'right' });
      const menu = page.locator('.ps-spellmenu[role="menu"]');
      await expect(menu).toBeVisible();
      await expect(menu.getByRole('menuitem').first(), 'first suggestion').toHaveText('specimen', { timeout: 30_000 });
      await expect(menu.getByRole('menuitem', { name: T.addPersonal, exact: true })).toBeVisible();
      await expect(menu.getByRole('menuitem', { name: /^Add to the .+ dictionary$/ }), 'the facility dictionary (admin)').toBeVisible();
      await page.keyboard.press('Escape');
      await expect(menu).toHaveCount(0);
    });

    await test.step('5. US English flags "tumour" and "haematology"; Default goes back', async () => {
      const language = panel.locator('.ps-spelllang__select');
      await language.selectOption({ label: T.usEnglish });
      await expect(flagged('tumour'), 'tumour flagged in US English').toHaveClass(/ps-spell--regionalVariant/, { timeout: 30_000 });
      await expect(flagged('haematology'), 'haematology flagged in US English').toHaveClass(/ps-spell--regionalVariant/);
      await expect(flagged('color'), 'color accepted in US English').toHaveCount(0);
      await language.selectOption({ label: T.useDefault });
      await expect(panel.locator('.ps-spelllang__source')).toContainText(/facility default|platform default/i);
    });
  });
});
