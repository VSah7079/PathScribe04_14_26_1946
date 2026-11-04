// e2e/review/ps-269.i18n-sweep.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-269 — "i18n Completion — Full Sweep of Remaining ~220+ Pages/Components".
// The review test plan, run against the demo as Pete Nimmo. Batch 585.
//
//   1. Choose Korean in the top bar's Language switcher.            automated
//   2. Home, the Worklist and a case report: all screen text is Korean.
//                                                                   automated (see "How"); the case page's
//                                                                   dialogs are covered by the unit guards
//   3. French: the MRN label reads "IPP" everywhere; percentage points read
//      "point(s) de pourcentage".                                   IPP automated; wording by unit test
//   4. Korean physician names: full name + 님 or 선생님, family name first.
//                                                                   unit tests (not on a screen reachable without data)
//   5. Scan Stations and the Validation Studies printed report in another language.  needs a person
//   6. Stored text stays English by design; Korean clinical wording still needs
//      native review (PS-480 / PS-348).                             needs a person
//   7. `npx vitest run src/i18n/uiText.guard.test.ts src/pages/SynopticReportPage/reportPageText.guard.test.ts src/i18n/localeParity.test.ts`
//      (run in the batch's vitest run).
//
// How: no English screen text. The test reads the screen's own labels (buttons,
// column headings, headings, tabs, field labels) and fails on any whose text is
// exactly an English sentence-or-phrase from en.json (two or more words) while
// the language under test has a different value for it. Names, numbers and
// stored data are never in en.json's values, so they are not mistaken for chrome.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5315 npx playwright test --project=chromium \
//        e2e/review/ps-269.i18n-sweep.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { signIn, openScreen } from './helpers';

type Json = { [k: string]: Json | string };
function flatten(o: Json, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v; else flatten(v, key, out);
  }
  return out;
}
const load = (lang: string) => flatten(JSON.parse(readFileSync(`src/i18n/locales/${lang}.json`, 'utf8')) as Json);
const EN = load('en');

/** English phrases (2+ words, letters and spaces only) that the other language words differently. */
function englishOnlyPhrases(lang: string): Set<string> {
  const other = load(lang);
  const set = new Set<string>();
  for (const [k, v] of Object.entries(EN)) {
    if (!/^[A-Za-z][A-Za-z' /&-]+$/.test(v) || v.trim().split(/\s+/).length < 2) continue;
    if (other[k] !== undefined && other[k] !== v) set.add(v.trim());
  }
  return set;
}

async function openWorklist(page: Page) {
  await page.goto('/worklist');
  await expect(page.getByText('S26-4408', { exact: true }).first(), 'the Worklist lists cases').toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(500);
}

async function chooseLanguage(page: Page, label: string) {
  await page.locator('.ps-lang-switcher-btn').click();
  await page.locator('.ps-lang-switcher-menu-item').filter({ hasText: label }).click();
  await page.waitForTimeout(1500);
}

/** The text of the screen's own labels. */
async function chromeTexts(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const els = document.querySelectorAll('button, th, h1, h2, h3, h4, label, [role="tab"], [role="columnheader"], a');
    return Array.from(els).map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  });
}

async function expectNoEnglish(page: Page, lang: string, where: string) {
  const english = englishOnlyPhrases(lang);
  expect(english.size, 'the comparison list is not empty').toBeGreaterThan(100);
  const leaks = [...new Set((await chromeTexts(page)).filter((t) => english.has(t)))];
  expect(leaks, `English labels left on ${where} in ${lang}`).toEqual([]);
}

test.describe('PS-269: no English screen text in another language', () => {
  test('Steps 1–2: Korean on Home, the Worklist and a case report', async ({ page }) => {
    await signIn(page);
    await openScreen(page, '/', /./);
    await chooseLanguage(page, '한국어');
    await expect(page.locator('.ps-lang-switcher-btn'), 'the top bar shows KO').toHaveText(/KO/);
    await expectNoEnglish(page, 'ko', 'Home');
    await openWorklist(page);
    await expectNoEnglish(page, 'ko', 'the Worklist');
    // A case report: header, side panels and bottom buttons.
    await page.getByText('S26-4408', { exact: true }).first().click({ timeout: 20_000 });
    await expect(page.locator('.ps-syn-specimen-row').first()).toBeVisible({ timeout: 25_000 });
    await page.waitForTimeout(1000);
    await expectNoEnglish(page, 'ko', 'the case report');
  });

  test('Step 3: French — the MRN label reads "IPP" on the Worklist and a case', async ({ page }) => {
    await signIn(page);
    await openScreen(page, '/', /./);
    await chooseLanguage(page, 'Français (France)');
    await openWorklist(page);
    const headers = (await chromeTexts(page)).join(' | ');
    expect(headers, 'Worklist shows IPP').toMatch(/\bIPP\b/);
    expect(headers, 'Worklist no longer shows MRN').not.toMatch(/\bMRN\b/);
    await expectNoEnglish(page, 'fr', 'the Worklist');
    await page.getByText('S26-4408', { exact: true }).first().click({ timeout: 20_000 });
    await expect(page.locator('.ps-syn-specimen-row').first()).toBeVisible({ timeout: 25_000 });
    const onCase = (await chromeTexts(page)).join(' | ');
    expect(onCase, 'the case page does not show MRN').not.toMatch(/\bMRN\b/);
  });
});
