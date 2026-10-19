// e2e/review/ps-476.pubmed-keyless.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-476 — "Remove the PubMed (NCBI) key from the browser bundle". The review
// test plan, run against the demo (Vite dev server, localStorage data) as Pete
// Nimmo.
//
// Expected (ticket): no provider key is in the browser bundle and PubMed still
// works (at the keyless 3 requests per second).
//
//   1. Sign in as Pete and check the PubMed ticker ("From PubMed") still shows
//      articles and opens a listing.                                automated
//      No internet here: the test answers NCBI itself. E-utilities requests
//      (eutils.ncbi.nlm.nih.gov esearch/esummary) get a one-article fixture and
//      the listing page (pubmed.ncbi.nlm.nih.gov/<PMID>/) a small HTML page.
//      Also checked: no request the ticker makes carries an api_key.
//   2. QA: `npm run build`, then search dist for key patterns (api_key, NCBI,
//      VITE_): no provider key appears.          CLI, not part of this spec
//   3. .env.example no longer lists VITE_NCBI_API_KEY.  CLI, not part of this spec
//   4. `npx vitest run src/services/security/envExposure.guard.test.ts`.
//                                                CLI, not part of this spec
//      Steps 2–4 were run once by hand on Oct 15, 2026 when this spec was
//      written (not asserted here):
//        2. `vite build` to a scratch folder: no VITE_*KEY/SECRET/TOKEN name,
//           no key-shaped literal; "api_key" appears once, as the LIS
//           authentication-type option value; "NCBI" only in UI text.
//        3. .env.example has no VITE_NCBI_API_KEY ("The PubMed research feed
//           needs no key").
//        4. envExposure.guard.test.ts: 1 file, 8 tests, all passed.
//
// Needs a person: whether the live NCBI service answers keyless requests from
// the hospital's network (rate limit 3 requests/second per IP), and the
// first-launch "window placement" permission prompt Chrome shows before the
// listing window opens on a second screen. Headless Chromium leaves that
// prompt (getScreenDetails) unanswered, so this test starts with the listing
// window's remembered position already saved (a returning user), which skips
// the prompt; the click and the window.open are real.
//
// No internet: the app's AI calls through the Vite dev proxy (/api/ai/…, e.g. the
// top bar's voice-model check on every screen) are answered by the test.
//
// Texts are the English values of pubMedTicker.* in src/i18n/locales/en.json;
// selectors are the ticker's own .ps-litfeed-* classes.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5301 npx playwright test --project=chromium \
//        e2e/review/ps-476.pubmed-keyless.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { DEMO_USERS } from './helpers';

const T = {
  badge: 'From PubMed',                                         // pubMedTicker.badge (shown upper-case by CSS)
  openAria: (title: string) => `Open the PubMed listing for "${title}" in a companion window`, // pubMedTicker.openAriaLabel
};

// The fixture NCBI answers with. The title carries PubMed-style inline markup and a trailing period,
// which the ticker strips (pubmedResearchFeedService.toPlainText).
const PMID = '39000001';
const FIXTURE = {
  rawTitle: 'Fixture <i>study</i> of review tests.',
  title: 'Fixture study of review tests',
  source: 'J Fixture Pathol',
  pubdate: '2026 Oct',
};
const LISTING_URL = `https://pubmed.ncbi.nlm.nih.gov/${PMID}/`;
const LISTING_HEADING = 'Fixture PubMed listing';

// useCompanionWindow's remembered position for the ticker's window (a workstation setting).
const LISTING_WINDOW_GEOMETRY_KEY = 'ps-companion-window-geometry-PathScribePubMedRef';

const LOAD = 90_000;

/**
 * helpers.signIn, but from the sign-in page: helpers.signIn opens "/" and writes storage while the app is
 * still redirecting to /login, which can destroy the page context mid-write (seen on a loaded machine).
 */
async function signInAsPete(page: Page) {
  await page.goto('/login');
  await expect(page.locator('#login-email'), 'the sign-in page').toBeVisible({ timeout: LOAD });
  await page.evaluate((u) => {
    localStorage.clear();
    localStorage.setItem('pathscribe-user', JSON.stringify(u));
    localStorage.setItem('pathscribe_scan_station_prompted', '1');
  }, DEMO_USERS.pete);
}

/**
 * No internet in a review test: the app's AI calls go to the Vite dev proxy (/api/ai/…), which forwards them to
 * the provider. The top bar's voice-model check makes one on every screen (Gemini, "gemini-2.0-flash-lite").
 * Answer them here with a minimal successful reply in each provider's shape.
 */
async function answerAiProxy(context: BrowserContext) {
  await context.route(/\/api\/ai\//, route => {
    const url = route.request().url();
    if (url.includes('/gemini/')) return route.fulfill({ json: { candidates: [{ content: { role: 'model', parts: [{ text: 'ok' }] } }], models: [] } });
    if (url.includes('/anthropic/')) return route.fulfill({ json: { content: [{ type: 'text', text: 'ok' }] } });
    return route.fulfill({ json: { choices: [{ message: { content: 'ok' } }] } });
  });
}

test.describe('PS-476 PubMed ticker works without an NCBI key', () => {
  test.beforeEach(async ({ context }) => { await answerAiProxy(context); });

  test('Step 1: the "From PubMed" ticker shows an article and opens its listing; no request carries a key', async ({ page, context }) => {
    test.setTimeout(240_000);
    const ncbi: URL[] = [];
    await context.route('https://eutils.ncbi.nlm.nih.gov/**', async route => {
      const url = new URL(route.request().url());
      ncbi.push(url);
      if (url.pathname.endsWith('/esearch.fcgi')) return route.fulfill({ json: { esearchresult: { count: '1', idlist: [PMID] } } });
      if (url.pathname.endsWith('/esummary.fcgi')) {
        return route.fulfill({ json: { result: { uids: [PMID], [PMID]: { uid: PMID, title: FIXTURE.rawTitle, source: FIXTURE.source, pubdate: FIXTURE.pubdate } } } });
      }
      return route.fulfill({ status: 404, body: '' });
    });
    const listingRequests: string[] = [];
    await context.route('https://pubmed.ncbi.nlm.nih.gov/**', route => {
      listingRequests.push(route.request().url());
      return route.fulfill({ contentType: 'text/html', body: `<!doctype html><title>${LISTING_HEADING}</title><h1>${LISTING_HEADING}</h1>` });
    });

    const ticker = page.locator('.ps-litfeed');
    const link = ticker.locator('a.ps-litfeed-link');

    await test.step('1a. Sign in as Pete: Home shows the "From PubMed" ticker with the latest article', async () => {
      await signInAsPete(page);
      await page.evaluate(([k, v]) => localStorage.setItem(k, v), [LISTING_WINDOW_GEOMETRY_KEY, JSON.stringify({ left: 80, top: 60, width: 900, height: 800 })]);
      await page.goto('/');
      await expect(link, 'the ticker lists an article').toBeVisible({ timeout: LOAD });
      await expect(ticker.locator('.ps-litfeed-badge')).toHaveText(T.badge);
      await expect(link.locator('.ps-litfeed-title'), 'the article title, as plain text').toHaveText(FIXTURE.title);
      await expect(link.locator('.ps-litfeed-meta')).toHaveText(`${FIXTURE.source} · ${FIXTURE.pubdate}`);
      await expect(link).toHaveAttribute('href', LISTING_URL);
      await expect(link).toHaveAttribute('aria-label', T.openAria(FIXTURE.title));
    });

    await test.step('1b. The ticker asked NCBI without a key: every E-utilities request has no api_key', async () => {
      const endpoints = ncbi.map(u => u.pathname.split('/').pop());
      expect(endpoints, 'a search').toContain('esearch.fcgi');
      expect(endpoints, 'and a summary of the article found').toContain('esummary.fcgi');
      for (const u of ncbi) {
        expect(u.searchParams.has('api_key'), `no api_key on ${u.pathname}`).toBe(false);
        expect(u.searchParams.get('tool'), 'identifies itself to NCBI as PathScribe').toBe('PathScribe');
      }
      expect(ncbi.filter(u => u.pathname.endsWith('/esummary.fcgi')).every(u => u.searchParams.get('id') === PMID), 'the summary asked for the PMID the search returned').toBe(true);
    });

    await test.step('1c. Clicking the article opens its PubMed listing in the companion window', async () => {
      const popupPromise = page.waitForEvent('popup', { timeout: LOAD });
      await link.click({ timeout: LOAD });
      const listing = await popupPromise;
      await expect(listing, 'the listing for the article').toHaveURL(LISTING_URL, { timeout: 30_000 });
      await expect(listing.locator('h1')).toHaveText(LISTING_HEADING);
      expect(listingRequests, 'the listing came from the PubMed site').toContain(LISTING_URL);
      expect(new URL(listing.url()).searchParams.has('api_key'), 'no key on the listing URL').toBe(false);
      await listing.close();
    });
  });
});
