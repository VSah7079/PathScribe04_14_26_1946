// e2e/review/ps-475.load-size-languages.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-475 — "Load size, Stage 1: load one language, lazy-load templates, fix the
// code splitting". The review test plan. Batch 585. Run against the Vite dev
// server, which serves each locale file as its own request, so "which language
// files were fetched" can be read from the network.
//
//   1. `npm run build` reports the first-load size (under 3 MB).   CLI: run in the
//      batch's build check (the build itself fails over the budget)
//   2–3. Sign in; start-up fetched only the English language file (no other
//      language, no user guides, no PDF library).                   automated (languages, guides)
//   4. About menu loads the guides then; a case loads only its template. needs a person (built app)
//   5. Switch to German, Korean, French (Belgium), Dutch (Belgium): each language
//      file downloads once and no raw keys appear.                   automated
//   6. Repeat on a hospital network.                                 needs a person
//
// Known (ticket): the breadcrumb keeps the old language until you navigate.
//
// Texts are the English values of language.* in src/i18n/locales/en.json;
// selectors are the language switcher's own .ps-lang-switcher-* classes.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5314 npx playwright test --project=chromium \
//        e2e/review/ps-475.load-size-languages.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';
import { signIn, openScreen } from './helpers';

const LANG_FILE = /\/i18n\/locales\/([A-Za-z-]+)\.json/;

/** Records every locale file the page asks for, in order. */
function watchLocaleRequests(page: Page): string[] {
  const seen: string[] = [];
  page.on('request', (r) => {
    const m = LANG_FILE.exec(r.url());
    if (m) seen.push(m[1]);
  });
  return seen;
}

async function chooseLanguage(page: Page, label: string) {
  await page.locator('.ps-lang-switcher-btn').click();
  await page.locator('.ps-lang-switcher-menu-item').filter({ hasText: label }).click();
  await page.waitForTimeout(1500);
}

/** Visible lines that look like an untranslated key (area.sub.key). */
async function rawKeys(page: Page): Promise<string[]> {
  const text = await page.evaluate(() => document.body.innerText);
  return text.split('\n').map((l) => l.trim()).filter((l) => /^[a-z][A-Za-z0-9]+(\.[A-Za-z0-9_]+){2,}$/.test(l));
}

test.describe('PS-475: one language at a time', () => {
  test('Steps 2–3: sign-in and Home fetch only the English language file', async ({ page }) => {
    const files = watchLocaleRequests(page);
    const guides: string[] = [];
    page.on('request', (r) => { if (/\/help\/.*\.pdf/i.test(r.url())) guides.push(r.url()); });
    await signIn(page);
    await openScreen(page, '/', /./);
    expect([...new Set(files)], 'only en.json was fetched at start-up').toEqual(['en']);
    expect(guides, 'no user guide downloaded at start-up').toEqual([]);
  });

  test('Step 5: German, Korean, French (Belgium) and Dutch (Belgium) each download once, with no raw keys', async ({ page }) => {
    await signIn(page);
    await openScreen(page, '/', /./);
    const files = watchLocaleRequests(page);
    for (const [label, code, base] of [
      ['Deutsch', 'de', 'de'], ['한국어', 'ko', 'ko'], ['Français (Belgique)', 'fr-BE', 'fr'], ['Nederlands (België)', 'nl-BE', 'nl'],
    ] as const) {
      await chooseLanguage(page, label);
      expect(files, `${code} was requested`).toContain(code);
      if (base !== code) expect(files, `${base} (the fallback for ${code}) was requested`).toContain(base);
      expect(await rawKeys(page), `no raw keys shown in ${label}`).toEqual([]);
    }
    for (const code of ['de', 'ko', 'fr-BE', 'nl-BE']) {
      expect(files.filter((f) => f === code).length, `${code} downloaded once`).toBe(1);
    }
    // Back to German: already loaded, so no second download.
    await chooseLanguage(page, 'Deutsch');
    expect(files.filter((f) => f === 'de').length, 'de not fetched again').toBe(1);
  });
});
