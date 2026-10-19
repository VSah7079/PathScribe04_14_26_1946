// e2e/review/ps-477.deployment-baseline-reset.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-477 — "Deployment baseline to zero: screens reach services only through
// @/services". The review test plan, run against the demo (Vite dev server,
// localStorage data) as Pete Nimmo.
//
// Expected (ticket): no visible change in behaviour, the deployment baseline
// is empty, and Full Reset restores a clean baseline.
//
//   1. Sign in as Pete Nimmo and walk the main screens: Worklist, a case
//      report, Search, Configuration (several System sections), Audit Log.
//                                                                   automated
//   2. Everything loads and behaves as before (one expected change: the
//      worklist's collapsed pools reset once).
//      automated: each screen shows its content, with no uncaught error and no
//      console error on the way.
//      needs a person: "as before" against the pre-Batch-506 app, and the
//      one-time reset of collapsed pools (it happens once in a browser that
//      had the old key; every test here starts from fresh demo data).
//      Found when this spec was written (Oct 15, 2026), left failing: the
//      Audit Log logs React "two children with the same key" warnings, because
//      services/auditlog/mockAuditService.ts gives each entry the id
//      'al-' + Date.now(), so two entries written in the same millisecond
//      share an id.
//   3. Set a saved filter, page size and editor theme, then run
//      Configuration → ⟳ Demo Reset → Full reset.                  automated
//      Saved filter = Tumor Board / MDT's "Case status" filter; page size =
//      Search's "Per page"; editor theme = the comment editor's light/dark
//      switch (Add Case Comment on S26-4408). The scan station is set through
//      the top bar's 📍 menu; the OR terminal, display profile, foot-pedal
//      binding and two guide-window positions are written to browser storage
//      as a configured workstation would have them (each needs hardware or
//      its own set-up screen).
//   4. After the reset those display preferences are back to default; scan
//      station, OR terminal, display profile and foot-pedal settings are
//      cleared; guide-window positions are kept.                    automated
//      (on screen and in localStorage)
//   5. `npx vitest run src/services/demoReset` and the full `npm test`.
//      src/services/demoReset was run by hand on Oct 15, 2026 when this spec
//      was written: 7 files, 59 tests, all passed. The full suite was not run
//      by this review (not part of this spec).
//
// No internet: the app's AI calls through the Vite dev proxy (/api/ai/…, e.g. the
// top bar's voice-model check on every screen) are answered by the test.
//
// Texts are the English values of configuration.*, demoResetTab.*,
// tumorBoard.filters.*, searchPage.pager.*, pathScribeEditor.toolbar.*,
// sidebar.caseComment.*, commentModalShell.*, navBarScanStation.* and
// auditLog.page.* in src/i18n/locales/en.json; selectors are the screens' own
// .ps-* classes.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5301 npx playwright test --project=chromium \
//        e2e/review/ps-477.deployment-baseline-reset.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { DEMO_USERS } from './helpers';

const T = {
  configuration: 'Configuration',                  // configuration.title
  demoTab: '⟳ Demo Reset',                         // configuration.tabs.demo
  resetTitle: 'Demo & Test Data Reset',            // demoResetTab.title
  fullReset: 'Full reset',                         // demoResetTab.fullCard.resetBtn / confirmBtn
  confirmTitle: 'Reset everything?',               // demoResetTab.fullCard.confirmTitle
  resetDone: 'Full reset complete',                // demoResetTab.done.fullResetComplete
  auditTitle: 'System Logs',                       // auditLog.page.title
  tumorBoardTitle: 'Tumor Board / MDT',            // tumorBoard.pageTitle
  caseStatus: 'Case status',                       // tumorBoard.filters.status
  allStatuses: 'All statuses',                     // tumorBoard.filters.allStatuses
  pendingPresentation: 'Pending Presentation',     // the default status (services/tumorBoard/tumorBoardWorkspaceFilters.ts)
  perPage: 'Per page',                             // searchPage.pager.perPage
  addCaseComment: 'Add Case Comment',              // sidebar.caseComment.add
  toLight: 'Switch to light mode',                 // pathScribeEditor.toolbar.switchToLightMode (shown while dark)
  toDark: 'Switch to dark mode',                   // pathScribeEditor.toolbar.switchToDarkMode (shown while light)
  closeComment: 'Close',                           // commentModalShell.close
  noStation: 'No station',                         // navBarScanStation.noStation
};

const CASE = 'S26-4408';
const STATION = 'Grossing Station 1';              // seed station-gross-1 (services/scanStations/mockScanStationService.ts)
// label = systemTab.sections.* (the section list); heading = the section's own title.
const SYSTEM_SECTIONS: { id: string; label: string; heading: string }[] = [
  { id: 'scan_stations', label: 'Scan Stations', heading: 'Scan Stations' },
  { id: 'or_suite_terminals', label: 'OR Suite Terminals', heading: 'OR Suite Terminals' },
  { id: 'display_profiles', label: 'Display Profiles (Facility Ops Dashboards)', heading: 'Display Profiles (Facility Ops Dashboards)' },
  { id: 'departments', label: 'Departments', heading: 'Department Dictionary' },   // departmentsSection.title
  { id: 'cassette_colors', label: 'Cassette Colors', heading: 'Cassette Colors' },
];

// Browser-storage keys (utils/uiPreferences.ts adds ps_ui_; workstation keys are used as named).
const KEY = {
  pageSize: 'ps_ui_searchPage.pageSize',
  tumorBoardFilters: 'ps_ui_tumorBoardWorkspace.filters',
  editorTheme: 'ps_ui_editorTheme',
  scanStation: 'pathscribe_current_scan_station_id',   // hooks/useCurrentScanStation.ts
  orTerminal: 'pathscribe_current_or_terminal_id',     // hooks/useCurrentOrTerminal.ts
  displayProfile: 'pathscribe_current_display_profile_id', // hooks/useCurrentDisplayProfile.ts
  footPedal: 'pathscribe_footpedal_bindings',          // hooks/useFootPedal.ts
};
const WORKSTATION_SEEDS: Record<string, string> = {
  [KEY.orTerminal]: 'or-terminal-e2e-477',
  [KEY.displayProfile]: 'display-profile-e2e-477',
  [KEY.footPedal]: JSON.stringify({ pedal2_nextField: { kind: 'keyboard', code: 'F9', label: 'F9' } }),
};
// Guide (companion) window positions, kept by the reset (hooks/useCompanionWindow.ts).
const GUIDE_WINDOWS: Record<string, string> = {
  'ps-companion-window-geometry-PathScribePubMedRef': JSON.stringify({ left: 80, top: 60, width: 900, height: 800 }),
  'ps-companion-window-geometry-PathScribeEmrSidecar': JSON.stringify({ left: 1500, top: 40, width: 700, height: 900 }),
};

const LOAD = 90_000;

/**
 * helpers.signIn, but from the sign-in page: helpers.signIn opens "/" and writes storage while the app is
 * still redirecting to /login, which can destroy the page context mid-write (seen on a loaded machine).
 * `fresh: false` keeps the demo data (helpers.startSession).
 */
async function signInAsPete(page: Page, { fresh }: { fresh: boolean } = { fresh: true }) {
  await go(page, '/login');
  await expect(page.locator('#login-email'), 'the sign-in page').toBeVisible({ timeout: LOAD });
  await page.evaluate(([u, clear]) => {
    if (clear) localStorage.clear();
    localStorage.setItem('pathscribe-user', JSON.stringify(u));
    localStorage.setItem('pathscribe_scan_station_prompted', '1');
  }, [DEMO_USERS.pete, fresh] as const);
}

/**
 * page.goto, once more if the page's own navigation interrupted it (net::ERR_ABORTED: the case report
 * replaces its URL while it settles). The second attempt must succeed.
 */
async function go(page: Page, path: string) {
  try { await page.goto(path); } catch (e) {
    if (!/ERR_ABORTED|frame was detached/.test(String(e))) throw e;
    await page.goto(path);
  }
}

const stored = (page: Page, keys: string[]) => page.evaluate(ks => Object.fromEntries(ks.map(k => [k, localStorage.getItem(k)])), keys);

/** Search: run the default search and return the "Per page" select. */
async function searchWithResults(page: Page) {
  await go(page, '/search');
  const submit = page.locator('.ps-search-btn-submit');
  await expect(submit, 'the Search screen').toBeVisible({ timeout: LOAD });
  await submit.click();
  const perPage = page.locator('.ps-searchpage-pagesize').getByLabel(T.perPage);
  await expect(perPage, 'results, with the "Per page" choice').toBeVisible({ timeout: LOAD });
  return perPage;
}

/** Tumor Board / MDT: its "Case status" filter. */
async function tumorBoardStatusFilter(page: Page) {
  await go(page, '/tumor-board');
  await expect(page.locator('h1').filter({ hasText: T.tumorBoardTitle }), 'the Tumor Board / MDT screen').toBeVisible({ timeout: LOAD });
  return page.locator('.ps-conf-select').filter({ has: page.locator('option', { hasText: T.allStatuses }) }).first();
}

/** S26-4408 → Add Case Comment: the comment editor's light/dark switch. */
async function commentEditorThemeSwitch(page: Page) {
  await openCaseReport(page);
  await page.locator('.ps-syn-comment-btn').filter({ hasText: T.addCaseComment }).click();
  const toggle = page.getByRole('button', { name: new RegExp(`^(${T.toLight}|${T.toDark})$`) });
  await expect(toggle, 'the editor\'s theme switch').toBeVisible({ timeout: LOAD });
  return toggle;
}

async function openCaseReport(page: Page, { fromWorklistOnScreen = false } = {}) {
  if (!fromWorklistOnScreen) await go(page, '/worklist');
  const link = page.getByText(CASE, { exact: true }).first();
  await expect(link, `${CASE} on the worklist`).toBeVisible({ timeout: LOAD });
  await link.click();
  await expect(page.locator('.ps-syn-field-row').first(), 'the case report\'s synoptic fields').toBeVisible({ timeout: LOAD });
  await expect(page, 'the case report\'s address').toHaveURL(/\/case\/[^/]+\/synoptic/);
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

test.describe('PS-477 Screens unchanged after the deployment baseline went to zero; Full Reset restores a clean baseline', () => {
  test.beforeEach(async ({ context }) => { await answerAiProxy(context); });

  test('Steps 1–2: Worklist, a case report, Search, Configuration System sections and the Audit Log load with no errors', async ({ page }) => {
    test.setTimeout(420_000);
    const problems: string[] = [];
    page.on('pageerror', e => problems.push(`uncaught error on ${new URL(page.url()).pathname}: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console error on ${new URL(page.url()).pathname}: ${m.text().slice(0, 300)}`); });

    await test.step('1a. Sign in as Pete Nimmo; the Worklist lists the demo cases', async () => {
      await signInAsPete(page);
      await go(page, '/worklist');
      await expect(page.getByText(CASE, { exact: true }).first(), `${CASE} on the worklist`).toBeVisible({ timeout: LOAD });
    });

    await test.step(`1b. A case report (${CASE}) opens with its specimens and synoptic fields`, async () => {
      await openCaseReport(page, { fromWorklistOnScreen: true });
      await expect(page.locator('.ps-syn-specimen-row').first(), 'its specimens').toBeVisible();
    });

    await test.step('1c. Search runs and lists results', async () => {
      await searchWithResults(page);
      await expect(page.locator('.ps-searchpage-pager-status'), 'a page of results').toHaveText(/^Page 1 of \d+$/);
    });

    await test.step('1d. Configuration → System: several sections open', async () => {
      for (const s of SYSTEM_SECTIONS) {
        await go(page, `/configuration?tab=system&section=${s.id}`);
        await expect(page.locator('.ps-confsys-nav-btn--active'), `${s.label} is the selected section`).toContainText(s.label, { timeout: LOAD });
        await expect(page.locator('h1, h2, h3').filter({ hasText: s.heading }).first(), `${s.label} shows its heading`).toBeVisible({ timeout: LOAD });
      }
    });

    await test.step('1e. Audit Log (System Logs) opens', async () => {
      await go(page, '/audit');
      await expect(page.locator('h1.ps-auditlog-title')).toHaveText(T.auditTitle, { timeout: LOAD });
    });

    await test.step('2. Nothing failed on the way: no uncaught error, no console error', async () => {
      expect(problems, 'errors while walking the screens').toEqual([]);
    });
  });

  test('Steps 3–4: Full Reset clears the display preferences and workstation settings, keeps guide-window positions', async ({ page }) => {
    test.setTimeout(540_000);

    await test.step('3a. Sign in; choose a scan station from the top bar', async () => {
      await signInAsPete(page);
      await go(page, '/');
      const stationBtn = page.locator('.ps-navbar-station-btn');
      await expect(stationBtn, 'no station to start with').toContainText(T.noStation, { timeout: LOAD });
      await stationBtn.click();
      await page.locator('.ps-navbar-station-menu-item').filter({ hasText: STATION }).click();
      await expect(stationBtn, 'the station is shown in the top bar').toContainText(STATION);
      expect((await stored(page, [KEY.scanStation]))[KEY.scanStation], 'stored for this workstation').toBe('station-gross-1');
      // Workstation settings with no screen here, and two guide-window positions (see the header).
      await page.evaluate(entries => { for (const [k, v] of entries) localStorage.setItem(k, v); }, Object.entries({ ...WORKSTATION_SEEDS, ...GUIDE_WINDOWS }));
    });

    await test.step('3b. Set a saved filter: Tumor Board / MDT → Case status = All statuses', async () => {
      const status = await tumorBoardStatusFilter(page);
      await expect(status, 'the default status filter').toHaveValue(T.pendingPresentation);
      await status.selectOption('all');
      await expect(status).toHaveValue('all');
      await page.reload();
      await expect(await tumorBoardStatusFilter(page), 'remembered after a reload').toHaveValue('all', { timeout: LOAD });
      expect(JSON.parse((await stored(page, [KEY.tumorBoardFilters]))[KEY.tumorBoardFilters] ?? '{}').status).toBe('all');
    });

    await test.step('3c. Set a page size: Search → Per page = 50', async () => {
      const perPage = await searchWithResults(page);
      await expect(perPage, 'the default page size').toHaveValue('25');
      await perPage.selectOption('50');
      await expect(perPage).toHaveValue('50');
      await expect(await searchWithResults(page), 'remembered on the next search').toHaveValue('50');
      expect((await stored(page, [KEY.pageSize]))[KEY.pageSize]).toBe('50');
    });

    await test.step('3d. Set an editor theme: the comment editor switched from dark to light', async () => {
      const toggle = await commentEditorThemeSwitch(page);
      await expect(toggle, 'the editor starts dark').toHaveAttribute('title', T.toLight);
      await toggle.click();
      await expect(toggle, 'now light').toHaveAttribute('title', T.toDark);
      expect((await stored(page, [KEY.editorTheme]))[KEY.editorTheme]).toBe('"light"');
      await page.locator('.ps-cmnt-save-btn').filter({ hasText: T.closeComment }).click();
    });

    const allKeys = [...Object.values(KEY), ...Object.keys(GUIDE_WINDOWS)];
    let before: Record<string, string | null> = {};

    await test.step('3e. Configuration → ⟳ Demo Reset → Full reset, confirmed', async () => {
      before = await stored(page, allKeys);
      for (const k of allKeys) expect(before[k], `${k} is set before the reset`).not.toBeNull();
      await go(page, '/configuration?tab=demo');
      await expect(page.locator('.ps-cfgpage-tab-btn--active')).toHaveText(T.demoTab, { timeout: LOAD });
      await expect(page.locator('h2.ps-demoreset__title').first()).toHaveText(T.resetTitle, { timeout: LOAD });
      await page.locator('.ps-demoreset__btn-danger-outline').filter({ hasText: T.fullReset }).click();
      const dialog = page.getByRole('dialog', { name: T.confirmTitle });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: T.fullReset, exact: true }).click();
      await expect(page.locator('.ps-reset-success__title')).toContainText(T.resetDone, { timeout: LOAD });
      const cleared = (await page.locator('.ps-demoreset__cleared-list > div').allTextContents()).map(s => s.replace(/^✓\s*/, '').trim());
      for (const k of Object.values(KEY)) expect(cleared, `the reset lists ${k} as cleared`).toContain(k);
      for (const k of Object.keys(GUIDE_WINDOWS)) expect(cleared, `the reset leaves ${k}`).not.toContain(k);
    });

    await test.step('4a. In browser storage: preferences and workstation settings gone, guide-window positions kept', async () => {
      const after = await stored(page, allKeys);
      for (const k of Object.values(KEY)) expect(after[k], `${k} cleared`).toBeNull();
      for (const k of Object.keys(GUIDE_WINDOWS)) expect(after[k], `${k} kept unchanged`).toBe(before[k]);
    });

    await test.step('4b. On screen: no scan station, Per page 25, Case status Pending Presentation, the editor dark again', async () => {
      // The reset signs everyone out and sends the page to the worklist; sign back in keeping the reset data.
      // Wait for the app's own redirect to settle on the sign-in page before signing back in, so the
      // countdown's navigation can't land in the middle of ours.
      await expect(page, 'the reset leaves the tab').not.toHaveURL(/tab=demo/, { timeout: 30_000 });
      await expect(page.locator('#login-email'), 'the reset signed the session out: back at the sign-in page').toBeVisible({ timeout: LOAD });
      await signInAsPete(page, { fresh: false });
      await go(page, '/');
      await expect(page.locator('.ps-navbar-station-btn'), 'no scan station').toContainText(T.noStation, { timeout: LOAD });
      await expect(await searchWithResults(page), 'Per page back to 25').toHaveValue('25');
      await expect(await tumorBoardStatusFilter(page), 'Case status back to Pending Presentation').toHaveValue(T.pendingPresentation, { timeout: LOAD });
      const toggle = await commentEditorThemeSwitch(page);
      await expect(toggle, 'the comment editor is dark again').toHaveAttribute('title', T.toLight);
      await page.locator('.ps-cmnt-save-btn').filter({ hasText: T.closeComment }).click();
      const after = await stored(page, Object.keys(GUIDE_WINDOWS));
      for (const k of Object.keys(GUIDE_WINDOWS)) expect(after[k], `${k} still kept`).toBe(before[k]);
    });

    await test.step('Clean up: remove the guide-window positions this test wrote', async () => {
      await page.evaluate(ks => { for (const k of ks) localStorage.removeItem(k); }, Object.keys(GUIDE_WINDOWS));
      expect(Object.values(await stored(page, Object.keys(GUIDE_WINDOWS))).every(v => v === null)).toBe(true);
    });
  });
});
