// e2e/review/ps-472.error-boundaries.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-472: "Error boundaries and crash handling: a render error never blanks
// the app". Review test plan, against the demo on the Vite dev server (a
// development build, where the ?ps-crash-test= switch works) as Pete Nimmo:
//   1. Sign in as Pete Nimmo on a development or validation build and open a
//      case report (S26-4408, Davis, Carol, MRN 100008, from the worklist). automated
//   2. Add ?ps-crash-test=route to the address: 'Something went wrong on this
//      screen' shows with Try again, Back to worklist and a support reference
//      (ERR-XXXX-XXXX); the nav bar still works, and Back to worklist works.
//      The case report page draws its own nav bar (its route hides AppShell's),
//      so the nav bar is checked there and on a crashed Worklist (?ps-crash-
//      test=route on /worklist), where the logo takes you Home.   automated
//   3. Try ?ps-crash-test=panel:organ-map and panel:synoptic (the organ map
//      opened first with its toggle): only that panel shows 'This panel
//      stopped working'; the rest of the report works (the specimen list, the
//      other panel, the case header).                               automated
//   4. Try ?ps-crash-test=app: the whole-app screen shows and does not claim
//      the rest of the app is running (no nav bar, no "still running"). automated
//   5. Check no patient name, MRN or accession (nor the case's address token)
//      appears on the recovery screens, and the wording warns unsaved changes
//      may be lost (route and app screens).                         automated
//   6. Open Audit Log → ⚠️ Error Log: each crash is listed once (by its
//      support reference and boundary), scrubbed of patient details.  automated
//   7. Switch language (Deutsch, with the nav bar's language menu) and repeat
//      one crash (route, and a panel): the recovery screen is translated. automated
// Expected: Every injected crash is contained, recoverable and logged without
// patient identifiers.
// Found when this spec was written (Oct 15, 2026; left failing, reported):
//   • Step 2: on the case report a route crash leaves no nav bar. The report
//     page draws its own NavBar inside the route (AppShell hideNav for
//     /case/:id/synoptic, /grossing, /report), so the route boundary removes
//     it with the page; only the recovery screen's buttons lead out. (Soft
//     check; on the Worklist the nav bar survives and works.)
//   • Step 6: the route and panel:synoptic crashes are logged twice on the dev
//     build: the CLIENT_RENDER_ERROR entry with the screen's reference plus a
//     CLIENT_UNCAUGHT_ERROR entry with another reference (source "browser
//     /case/:id/synoptic"); organ-map and app crashes are logged once.
//   • Step 6 (timing): the Error Log entry is written a moment after the
//     recovery screen shows; leaving at once (e.g. a reload) can lose it, so
//     the spec waits for each entry before the next crash.
// Not covered here (and not a review step): a production build ignoring the
// switch; the window.onerror / unhandledrejection handlers on their own
// (covered by the vitest suites in src/services/errorReporting/).
// Note: the panel recovery boxes carry no unsaved-changes wording (only the
// route and app screens do); the ticket's step 5 names "the recovery
// screens", so this spec checks the wording on those two and reports the
// panel wording rather than failing on it.
// Selectors: English (and German) texts from src/i18n/locales/{en,de}.json
// (errorBoundary.*, auditLog.tabs.errors, language.*) and the screen's own
// .ps-error-boundary* / .ps-auditlog-* classes.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5303 npx playwright test --project=chromium \
//        e2e/review/ps-472.error-boundaries.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Locator, type Page } from '@playwright/test';
import { signIn, clearDemoKeys } from './helpers';

// en.json texts the screens render.
const T = {
  title: 'Something went wrong on this screen',              // errorBoundary.title
  body: 'PathScribe hit an unexpected error and stopped showing this screen. The rest of the app is still running.', // errorBoundary.body
  stillRunning: 'The rest of the app is still running.',      // the claim errorBoundary.body makes (and appBody must not)
  appBody: 'PathScribe hit an unexpected error and had to stop. Try again, or go back to the worklist to start afresh.', // errorBoundary.appBody
  unsavedMaybeLost: 'Work you had already saved is safe. Changes on this screen that were not saved yet may have been lost.', // errorBoundary.unsavedMaybeLost
  panelTitle: 'This panel stopped working',                   // errorBoundary.panel.title
  panelBody: 'An unexpected error stopped this panel. The rest of the page still works.', // errorBoundary.panel.body
  tryAgain: 'Try again',                                      // errorBoundary.tryAgain
  backToWorklist: 'Back to worklist',                         // errorBoundary.backToWorklist
  referencePrefix: 'Reference for support: ',                 // errorBoundary.reference ("… {{reference}}")
  errorLogTab: '⚠️ Error Log',                                 // auditLog.tabs.errors
  language: 'Language',                                       // language.label (the switcher's name)
  deutsch: 'Deutsch',                                         // language.de
  english: 'English',                                         // language.en
};
// de.json: the same screens in German.
const DE = {
  title: 'Auf diesem Bildschirm ist ein Fehler aufgetreten',  // errorBoundary.title
  body: 'PathScribe ist auf einen unerwarteten Fehler gestoßen und zeigt diesen Bildschirm nicht mehr an. Der Rest der Anwendung läuft weiter.', // errorBoundary.body
  unsavedMaybeLost: 'Bereits gespeicherte Arbeit ist sicher. Noch nicht gespeicherte Änderungen auf diesem Bildschirm sind möglicherweise verloren.', // errorBoundary.unsavedMaybeLost
  panelTitle: 'Dieser Bereich funktioniert nicht mehr',       // errorBoundary.panel.title
  panelBody: 'Ein unerwarteter Fehler hat diesen Bereich angehalten. Der Rest der Seite funktioniert weiter.', // errorBoundary.panel.body
  tryAgain: 'Erneut versuchen',                               // errorBoundary.tryAgain
  backToWorklist: 'Zurück zur Arbeitsliste',                  // errorBoundary.backToWorklist
  referencePrefix: 'Referenz für den Support: ',              // errorBoundary.reference
  language: 'Sprache',                                        // language.label
};

// The demo case (mock case data) and the patient identifiers it shows on the report page.
const CASE = { accession: 'S26-4408', patientName: 'Davis, Carol', surname: 'Davis', given: 'Carol', mrn: '100008', dob: '07/03/1965' };
// newErrorReference(): ERR- and two groups of four from an alphabet without I, O, 0 and 1.
const REFERENCE = /^ERR-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
const ERROR_LOGS_KEY = 'pathscribe_mock_pathscribe_error_logs'; // mockStorage prefix + mockAuditService's error log key

const boundary = (page: Page, scope: 'app' | 'route' | 'panel') => page.locator(`.ps-error-boundary--${scope}[role="alert"]`);
const navBar = (page: Page) => page.locator('nav.ps-nav');
const specimenRows = (page: Page) => page.locator('.ps-syn-specimen-row');

/** No outside network: pages outside this server, and the dev server's AI and terminology pass-throughs to the internet, are refused. */
async function blockOutsideNetwork(page: Page) {
  await page.route(url => !['localhost', '127.0.0.1'].includes(url.hostname) || /^\/api\/(ai|terminology)\//.test(url.pathname), route => route.abort());
}

/** Worklist → the demo case's report page (opened from the worklist, which grants this tab access); returns its address. */
async function openDemoCase(page: Page): Promise<string> {
  await page.goto('/worklist');
  await page.getByText(CASE.accession, { exact: true }).first().click({ timeout: 120_000 }); // a cold dev server compiles the worklist first
  await expect(specimenRows(page).first(), 'the case report is open').toBeVisible({ timeout: 60_000 });
  await expect(page).toHaveURL(/\/case\/[^/?]+\/synoptic$/);
  return page.url();
}

/** The same report page with a crash-test switch (a full page load, as a person editing the address would do). */
async function crash(page: Page, caseUrl: string, which: string) {
  await page.goto(`${caseUrl}?ps-crash-test=${encodeURIComponent(which)}`);
}

/** The support reference a recovery screen shows ("Reference for support: ERR-…"). */
async function referenceOn(box: Locator, prefix = T.referencePrefix): Promise<string> {
  const line = box.locator('.ps-error-boundary-reference');
  await expect(line, 'a support reference').toHaveCount(1);
  const text = (await line.textContent())?.trim() ?? '';
  expect(text.startsWith(prefix), `"${text}" starts with "${prefix}"`).toBe(true);
  const reference = text.slice(prefix.length);
  expect(reference, 'the reference is ERR-XXXX-XXXX').toMatch(REFERENCE);
  return reference;
}

/** No patient identifier, nor the case's address token, anywhere in the recovery DOM (text and attributes). */
async function expectNoPatientIdentifiers(box: Locator, caseUrl: string) {
  const token = new URL(caseUrl).pathname.split('/')[2];
  const html = await box.evaluate(el => el.outerHTML);
  for (const id of [CASE.patientName, CASE.surname, CASE.given, CASE.mrn, CASE.accession, CASE.dob, token]) {
    expect(html, `no "${id}" in the recovery screen`).not.toContain(id);
  }
  await expect(box.locator('[data-phi]'), 'nothing tagged as patient data').toHaveCount(0);
}

/** Opens the organ map panel on the report (the toggle remembers it, so it is open after a reload). */
async function openOrganMap(page: Page) {
  const toggle = page.locator('.ps-organmap-toggle');
  await expect(toggle, 'the organ map button is on this case').toBeVisible();
  await expect(toggle, 'closed on fresh demo data').toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.ps-organmap-panel'), 'the organ map panel').toBeVisible();
}

/** The nav bar's language menu → a language. */
async function switchLanguage(page: Page, current: string, to: string) {
  await page.getByRole('button', { name: current, exact: true }).click();
  await page.getByRole('listbox').getByRole('option', { name: new RegExp(`^${to}$`) }).click();
}

type ErrorLogEntry = { message: string; source: string; code: string; caseId: string | null };
const storedErrorLogs = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]') as ErrorLogEntry[], ERROR_LOGS_KEY);

test.describe('PS-472 Error boundaries and crash handling', () => {
  test.beforeEach(async ({ page }) => {
    await blockOutsideNetwork(page);
    await signIn(page);
  });
  test.afterEach(async ({ page }) => {
    // No crash entries left for the next spec (the language is put back by step 7d; signIn clears the rest).
    await clearDemoKeys(page, [ERROR_LOGS_KEY]).catch(() => {});
  });

  test('Steps 1, 2 and 5: a route crash shows the recovery screen; the nav bar and Back to worklist work', async ({ page }) => {
    test.setTimeout(240_000);
    let caseUrl = '';
    const screen = boundary(page, 'route');

    await test.step('1. Sign in as Pete Nimmo on a development build and open a case report', async () => {
      caseUrl = await openDemoCase(page);
      await expect(page.locator('[data-phi="name"]').first(), 'the report shows the patient').toHaveText(CASE.patientName);
    });

    await test.step('2. ?ps-crash-test=route: "Something went wrong on this screen", Try again, Back to worklist, ERR-XXXX-XXXX; the nav bar still works', async () => {
      await crash(page, caseUrl, 'route');
      await expect(screen, 'the route recovery screen').toBeVisible({ timeout: 60_000 });
      await expect(screen.getByRole('heading', { level: 1 })).toHaveText(T.title);
      await expect(screen.getByText(T.body, { exact: true })).toBeVisible();
      await expect(screen.getByRole('button', { name: T.tryAgain, exact: true })).toBeVisible();
      await expect(screen.getByRole('button', { name: T.backToWorklist, exact: true })).toBeVisible();
      await referenceOn(screen);
      await expect(specimenRows(page), 'the crashed report is not shown').toHaveCount(0);
      // The nav bar survives the crash. The report page draws its own nav bar (its route hides AppShell's), so
      // check it here (soft, so the rest of the step runs), then on a page that uses AppShell's nav bar.
      await expect.soft(navBar(page), 'the nav bar is still there on the crashed case report').toBeVisible();
      await page.goto('/worklist?ps-crash-test=route');
      await expect(screen, 'the worklist route recovery screen').toBeVisible({ timeout: 60_000 });
      await expect(navBar(page), 'the nav bar is still there on the crashed worklist').toBeVisible();
      await navBar(page).locator('img.ps-nav-logo').click();
      await expect(page).toHaveURL(/\/$/);
      await expect(screen, 'the recovery screen clears on leaving').toHaveCount(0);
      await expect(page.locator('h1, h2').first(), 'Home works').toBeVisible();
      // Back to worklist from the case report's recovery screen.
      await crash(page, caseUrl, 'route');
      await expect(screen).toBeVisible({ timeout: 60_000 });
      await screen.getByRole('button', { name: T.backToWorklist, exact: true }).click();
      await expect(page).toHaveURL(/\/worklist$/, { timeout: 60_000 });
      await expect(page.getByText(CASE.accession, { exact: true }).first(), 'back on a working worklist').toBeVisible({ timeout: 60_000 });
      await expect(screen).toHaveCount(0);
    });

    await test.step('5. No patient name, MRN or accession on the route recovery screen; it warns unsaved changes may be lost', async () => {
      await crash(page, caseUrl, 'route');
      await expect(screen).toBeVisible({ timeout: 60_000 });
      await expect(screen.getByText(T.unsavedMaybeLost, { exact: true }), 'the unsaved-changes warning').toBeVisible();
      await expectNoPatientIdentifiers(screen, caseUrl);
    });
  });

  test('Steps 3 and 5: an organ map or synoptic panel crash stops only that panel', async ({ page }) => {
    test.setTimeout(240_000);
    let caseUrl = '';
    const panelBox = boundary(page, 'panel');

    await test.step('1. Open the case report with the organ map panel showing', async () => {
      caseUrl = await openDemoCase(page);
      await openOrganMap(page);
      await expect(page.locator('.ps-syn-panel'), 'the synoptic panel').toBeVisible();
    });

    await test.step('3a. ?ps-crash-test=panel:organ-map: only the map shows "This panel stopped working"; the report works', async () => {
      await crash(page, caseUrl, 'panel:organ-map');
      await expect(panelBox, 'one panel recovery box').toHaveCount(1, { timeout: 60_000 });
      await expect(panelBox.locator('.ps-error-boundary-title')).toHaveText(T.panelTitle);
      await expect(panelBox.getByText(T.panelBody, { exact: true })).toBeVisible();
      await expect(panelBox.getByRole('button', { name: T.tryAgain, exact: true })).toBeVisible();
      await referenceOn(panelBox);
      await expect(page.locator('.ps-organmap-panel'), 'the map itself is gone').toHaveCount(0);
      await expect(page.locator('.ps-error-boundary--route, .ps-error-boundary--app'), 'no screen-wide recovery').toHaveCount(0);
      await expect(page.locator('.ps-syn-panel'), 'the synoptic panel still works').toBeVisible();
      await expect(specimenRows(page), 'the specimen list').toHaveCount(2);
      await expect(page.locator('[data-phi="accession"]').filter({ hasText: CASE.accession }).first(), 'the case header').toBeVisible();
      await expect(navBar(page)).toBeVisible();
      await expectNoPatientIdentifiers(panelBox, caseUrl);
    });

    await test.step('3b. ?ps-crash-test=panel:synoptic: only the synoptic panel stops; the map and the rest work', async () => {
      await crash(page, caseUrl, 'panel:synoptic');
      await expect(panelBox, 'one panel recovery box').toHaveCount(1, { timeout: 60_000 });
      await expect(panelBox.locator('.ps-error-boundary-title')).toHaveText(T.panelTitle);
      await referenceOn(panelBox);
      await expect(page.locator('.ps-syn-panel'), 'the synoptic panel itself is gone').toHaveCount(0);
      await expect(page.locator('.ps-error-boundary--route, .ps-error-boundary--app'), 'no screen-wide recovery').toHaveCount(0);
      await expect(page.locator('.ps-organmap-panel'), 'the organ map still works').toBeVisible();
      await expect(specimenRows(page), 'the specimen list').toHaveCount(2);
      await expect(page.locator('[data-phi="accession"]').filter({ hasText: CASE.accession }).first(), 'the case header').toBeVisible();
      await expectNoPatientIdentifiers(panelBox, caseUrl);
    });
  });

  test('Steps 4 and 5: an app crash shows the whole-app screen without claiming the app is still running', async ({ page }) => {
    test.setTimeout(240_000);
    let caseUrl = '';
    const screen = boundary(page, 'app');

    await test.step('1. Open the case report', async () => {
      caseUrl = await openDemoCase(page);
    });

    await test.step('4. ?ps-crash-test=app: the whole-app screen, which does not claim the rest of the app is running', async () => {
      await crash(page, caseUrl, 'app');
      await expect(screen, 'the app recovery screen').toBeVisible({ timeout: 60_000 });
      await expect(screen.getByRole('heading', { level: 1 })).toHaveText(T.title);
      await expect(screen.getByText(T.appBody, { exact: true })).toBeVisible();
      await expect(screen, 'no "still running" claim').not.toContainText(T.stillRunning);
      await expect(navBar(page), 'no nav bar: the whole app stopped').toHaveCount(0);
      await expect(screen.getByRole('button', { name: T.tryAgain, exact: true })).toBeVisible();
      await expect(screen.getByRole('button', { name: T.backToWorklist, exact: true })).toBeVisible();
      await referenceOn(screen);
    });

    await test.step('5. No patient identifiers on the app recovery screen; it warns unsaved changes may be lost; Back to worklist recovers', async () => {
      await expect(screen.getByText(T.unsavedMaybeLost, { exact: true })).toBeVisible();
      await expectNoPatientIdentifiers(screen, caseUrl);
      await screen.getByRole('button', { name: T.backToWorklist, exact: true }).click();
      await expect(page).toHaveURL(/\/worklist$/, { timeout: 60_000 });
      await expect(page.getByText(CASE.accession, { exact: true }).first(), 'the app runs again').toBeVisible({ timeout: 60_000 });
      await expect(navBar(page)).toBeVisible();
    });
  });

  test('Step 6: Audit Log → Error Log lists each crash once, without patient details', async ({ page }) => {
    test.setTimeout(300_000);
    const crashes: Array<{ which: string; boundaryName: string; reference: string }> = [];
    let caseUrl = '';

    await test.step('6a. Crash the route, the organ map, the synoptic panel and the app, noting each reference', async () => {
      caseUrl = await openDemoCase(page);
      await openOrganMap(page);
      for (const which of ['route', 'panel:organ-map', 'panel:synoptic', 'app']) {
        await crash(page, caseUrl, which);
        const box = page.locator('.ps-error-boundary[role="alert"]');
        await expect(box, `the ${which} recovery`).toHaveCount(1, { timeout: 60_000 });
        const reference = await referenceOn(box);
        crashes.push({ which, boundaryName: which, reference });
        // The Error Log entry is written a moment after the screen shows; wait for it before the next page load.
        await expect.poll(async () => (await storedErrorLogs(page)).filter(e => e.message.includes(reference)).length,
          { timeout: 30_000, message: `the ${which} crash (${reference}) reaches the Error Log` }).toBe(1);
      }
      expect(new Set(crashes.map(c => c.reference)).size, 'four different references').toBe(4);
    });

    await test.step('6b. Open Audit Log → ⚠️ Error Log: each crash is listed once, scrubbed of patient details', async () => {
      await page.goto('/audit');
      await page.locator('.ps-auditlog-tabswitch-btn').filter({ hasText: T.errorLogTab }).click();
      await expect(page.locator('.ps-auditlog-tabswitch-btn--active')).toContainText(T.errorLogTab);
      const rows = page.locator('.ps-auditlog-row--error');
      for (const c of crashes) {
        const row = rows.filter({ hasText: c.reference });
        await expect(row, `${c.which} (${c.reference}) is listed once`).toHaveCount(1, { timeout: 30_000 });
        await expect(row.locator('.ps-auditlog-cell-code')).toContainText('CLIENT_RENDER_ERROR');
        await expect(row.locator('.ps-auditlog-cell-detail')).toHaveText(`[${c.reference}] CrashTestError: Crash test requested for ${c.which}`);
        await expect(row.locator('.ps-auditlog-cell-user'), 'the boundary and the scrubbed address').toHaveText(`browser:${c.boundaryName} /case/:id/synoptic`);
      }
      // One crash, one entry: nothing else was logged for these four crashes (no second, "uncaught" copy).
      const stored = (await storedErrorLogs(page)).filter(e => e.message.includes('CrashTestError'));
      const extra = stored.filter(e => !crashes.some(c => e.message.includes(c.reference))).map(e => `${e.code} ${e.message} (${e.source})`);
      expect.soft(extra, 'no second Error Log entry for any crash').toEqual([]);
      const crashRows = rows.filter({ hasText: 'CrashTestError' });
      await expect.soft(crashRows, 'exactly one Error Log entry per crash').toHaveCount(crashes.length);
      // Scrubbed: no patient identifier, nor the case's address token, in any stored crash entry.
      const token = new URL(caseUrl).pathname.split('/')[2];
      const all = JSON.stringify(stored);
      for (const id of [CASE.patientName, CASE.surname, CASE.mrn, CASE.accession, token]) {
        expect(all, `no "${id}" in the logged crashes`).not.toContain(id);
      }
      expect(stored.every(e => e.caseId === null), 'no case linked to a crash entry').toBe(true);
    });
  });

  test('Step 7: after switching to German the recovery screens are translated', async ({ page }) => {
    test.setTimeout(240_000);
    let caseUrl = '';

    await test.step('7a. Switch the language to Deutsch with the nav bar\'s language menu', async () => {
      caseUrl = await openDemoCase(page);
      await switchLanguage(page, T.language, T.deutsch);
      await expect(page.getByRole('button', { name: DE.language, exact: true }), 'the app is in German').toBeVisible();
    });

    await test.step('7b. Repeat the route crash: the recovery screen is in German', async () => {
      await crash(page, caseUrl, 'route');
      const screen = boundary(page, 'route');
      await expect(screen).toBeVisible({ timeout: 60_000 });
      await expect(screen.getByRole('heading', { level: 1 })).toHaveText(DE.title);
      await expect(screen.getByText(DE.body, { exact: true })).toBeVisible();
      await expect(screen.getByText(DE.unsavedMaybeLost, { exact: true })).toBeVisible();
      await expect(screen.getByRole('button', { name: DE.tryAgain, exact: true })).toBeVisible();
      await expect(screen.getByRole('button', { name: DE.backToWorklist, exact: true })).toBeVisible();
      await referenceOn(screen, DE.referencePrefix);
      await expect(screen, 'no English left').not.toContainText(T.title);
    });

    await test.step('7c. And a panel crash: the panel box is in German', async () => {
      await crash(page, caseUrl, 'panel:synoptic');
      const box = boundary(page, 'panel');
      await expect(box).toHaveCount(1, { timeout: 60_000 });
      await expect(box.locator('.ps-error-boundary-title')).toHaveText(DE.panelTitle);
      await expect(box.getByText(DE.panelBody, { exact: true })).toBeVisible();
      await expect(box.getByRole('button', { name: DE.tryAgain, exact: true })).toBeVisible();
      await referenceOn(box, DE.referencePrefix);
    });

    await test.step('7d. Switch back to English', async () => {
      await page.goto('/worklist');
      await switchLanguage(page, DE.language, T.english);
      await expect(page.getByRole('button', { name: T.language, exact: true })).toBeVisible();
    });
  });
});
