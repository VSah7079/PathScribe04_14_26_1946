// e2e/review/ps-279.print-queue-dashboard.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-279 — "Print Queue Management Dashboard & Batch Operations". Review test
// plan, run against the demo (Vite dev server, localStorage data) as Pete:
//
//   1. Sign in as Pete; go to Audit Log → Interface Log → Print Queue (Print
//      Queue Dashboard).                                             automated
//   2. Use the status filter (Queued, On hold, Failed, Printed, Cancelled) and
//      check jobs show Case, Report type, Destination, Paper / Duplex (Tray 1 —
//      Letterhead / Tray 2 — Plain).                                 automated
//   3. Hold a queued job, then Release it: it returns to the status it had
//      before.                                                       automated
//      (Also a failed job: held, released, Failed again.)
//   4. Tick several jobs and apply Hold or Cancel in bulk; try to hold a
//      printed or cancelled job: it is refused.                      automated
//      (A printed or cancelled job's own Hold button is disabled; ticked with a
//      queued job and held in bulk, only the queued one is held. The screen
//      shows no message about the refused ones: noted in the review report.)
//   5. Retry a failed job, and Redirect a network job to another printer
//      (Redirect & Retry).                                           automated
//      (Retry: a failed interface-engine job; the engine's receiver, which is
//      localhost:8080 in the demo and not running here, is answered by a
//      Playwright route with HTTP 200, so the job prints. Redirect & Retry: a
//      failed network-printer job to the address 10.27.9.9; from a browser a
//      network print can't be sent, so it fails again with "Network printing
//      needs the PathScribe site agent…", which is the expected answer here.)
//   6. Set a window start/end, choose Group by Client account or Delivery
//      route and press Run Batch Now: a message reports groups created and jobs
//      tagged (windows are in UTC; this is admin-run, not a timer).  automated
//   7. Actually printing to a network printer needs the PathScribe site agent
//      and a printer on site.                                   needs a person
//
// Expected (ticket): each job action works, is refused where not allowed, and
// is recorded; batch grouping tags the right jobs. "Recorded" is checked in
// Audit Log → Audit Log (the events "Print job held", "Print job hold
// released", "Print job cancelled", "Print job re-queued", "Print job
// redirected", "Print job completed").
//
// Demo data: the demo has NO print jobs (print_queue_v1 is empty until a
// report is released to a facility that prints), so each test writes nine
// jobs straight into the print queue service's own store
// (pathscribe_mock_print_queue_v1), one or more per status: 4 Queued (network
// / QZ Tray / interface engine / one queued 06:30 UTC, outside the batch
// window), 2 Failed (interface engine, network), 1 On hold, 1 Printed, 1
// Cancelled. Each test starts from that same seed.
//
// Texts are the English values of printQueueDashboard.* and auditLog.* in
// src/i18n/locales/en.json; selectors are the screen's own .ps-conf-* classes.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5305 npx playwright test --project=chromium \
//        e2e/review/ps-279.print-queue-dashboard.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Locator, type Page } from '@playwright/test';
import { DEMO_USERS } from './helpers';

/**
 * Signs in as a demo user with fresh demo data, like helpers.signIn, but from the
 * sign-in page once it has rendered: helpers.signIn's page.goto('/') is redirected
 * to /login while it writes, which can throw "Execution context was destroyed".
 */
async function signInFresh(page: Page, user: { id: string; name: string; role: string } = DEMO_USERS.pete) {
  await page.goto('/login');
  await expect(page.locator('#login-email'), 'the sign-in page').toBeVisible({ timeout: 90_000 });
  await page.evaluate((u) => {
    localStorage.clear();
    localStorage.setItem('pathscribe-user', JSON.stringify(u));
    localStorage.setItem('pathscribe_scan_station_prompted', '1');
  }, user);
}

const T = {
  logsTitle: 'System Logs',                                   // auditLog.page.title
  interfacesTab: '🔌 Interface Log',                           // auditLog.tabs.interfaces
  auditTab: '📋 Audit Log',                                    // auditLog.tabs.audit
  printQueueSub: 'Print Queue',                               // auditLog.interfacesTab.subTabPrintQueue
  title: 'Print Queue Dashboard',                             // printQueueDashboard.title
  statusFilter: 'Filter by status',                           // a11y.filters.status (aria-label of the filter)
  columns: ['', 'Case', 'Report type', 'Delivery mode', 'Status', 'Paper / Duplex', 'Destination', 'Batch', 'Queued at', 'Actions'], // printQueueDashboard.column.*
  status: { ALL: 'All statuses', QUEUED: 'Queued', PRINTING: 'Printing', FAILED: 'Failed', HOLD: 'On hold', PRINTED: 'Printed', CANCELLED: 'Cancelled' }, // printQueueDashboard.status.*
  tray1Duplex: 'Tray 1 — Letterhead / Duplex',                // paperSource.TRAY_1_LETTERHEAD / duplexMode.DUPLEX
  tray2Simplex: 'Tray 2 — Plain / Simplex',                   // paperSource.TRAY_2_PLAIN / duplexMode.SIMPLEX
  noJobs: 'No print jobs match this filter.',                 // printQueueDashboard.noJobs
  hold: 'Hold', release: 'Release', retry: 'Retry', redirect: 'Redirect', cancel: 'Cancel', // printQueueDashboard.action.*
  selected: (n: number) => `${n} job(s) selected`,            // printQueueDashboard.bulk.selectedCount
  redirectConfirm: 'Redirect & Retry',                        // printQueueDashboard.redirect.confirm
  needsSiteAgent: 'Network printing needs the PathScribe site agent. It can\'t be sent from a browser.', // printQueueDashboard.failure.needsSiteAgent
  kindNetwork: 'Printer address (sent directly)',             // printDestination.kinds.network
  address: 'Address', name: 'Name',                           // printDestination.address / .name
  groupBy: 'Group by', windowStart: 'Window start', windowEnd: 'Window end', // printQueueDashboard.batch.*
  byClient: 'Client account', byRoute: 'Delivery route',
  runBatch: 'Run Batch Now',
  batchResult: (g: number, t: number, s: number) => `${g} batch group(s) created, ${t} job(s) tagged, ${s} job(s) skipped.`, // batch.resultMessage
  auditSearch: 'Search event, detail, case ID…',              // auditLog.auditTab.searchPlaceholder
  auditRegion: 'Audit log entries, scrollable table',         // auditLog.auditTab.scrollAria
};

const NET_DEFAULT = { protocol: 'RAW_9100', ipAddress: '192.168.14.10', displayName: 'Pathology Lab Default Printer (RAW/9100)' };
const REDIRECT_TO = { address: '10.27.9.9', name: 'E2E-279 Redirect Printer' };

/** Nine jobs, written into the print queue service's store (mockStorage prefix + print_queue_v1). */
async function seedJobs(page: Page) {
  await page.evaluate((net) => {
    const base = { priority: 'Routine', retryCount: 0, maxRetriesExceeded: false, pdfBase64: 'JVBERi0xLjQKJSVFT0YK', performingFacilityId: 'c-fenwick-general', source: 'SURGPATH' };
    const jobs = [
      { ...base, id: 'job-q1', caseId: 'S26-9101', reportType: 'FINAL', mode: 'DIRECT_NETWORK_PRINT', status: 'QUEUED', queuedAt: '2026-10-15T10:00:00.000Z', paperSource: 'TRAY_1_LETTERHEAD', duplexMode: 'DUPLEX', resolvedDestination: net, orderingFacilityId: 'c-fenwick-womens', pointOfCare: 'Ward 3' },
      { ...base, id: 'job-q2', caseId: 'S26-9102', reportType: 'PRELIMINARY', mode: 'NATIVE_QZ_TRAY', printerName: 'Histology Front Desk', status: 'QUEUED', queuedAt: '2026-10-15T11:00:00.000Z', paperSource: 'TRAY_2_PLAIN', duplexMode: 'SIMPLEX', orderingFacilityId: 'c-fenwick-womens', pointOfCare: 'Theatre 2' },
      { ...base, id: 'job-q3', caseId: 'S26-9103', reportType: 'FINAL', mode: 'INTERFACE_ENGINE_HANDOFF', status: 'QUEUED', queuedAt: '2026-10-15T12:00:00.000Z', paperSource: 'TRAY_1_LETTERHEAD', duplexMode: 'DUPLEX', orderingFacilityId: 'c-fenwick-womens', pointOfCare: 'Ward 3' },
      { ...base, id: 'job-q4', caseId: 'S26-9105', reportType: 'CORRECTED', mode: 'DIRECT_NETWORK_PRINT', status: 'QUEUED', queuedAt: '2026-10-15T06:30:00.000Z', paperSource: 'TRAY_1_LETTERHEAD', duplexMode: 'DUPLEX', resolvedDestination: net, orderingFacilityId: 'c-fenwick-general', pointOfCare: 'Pathology Lab' },
      { ...base, id: 'job-f1', caseId: 'S26-9104', reportType: 'FINAL', mode: 'INTERFACE_ENGINE_HANDOFF', status: 'FAILED', queuedAt: '2026-10-15T09:00:00.000Z', errorCode: 'PRINTER_UNREACHABLE', errorMessage: 'Interface Engine hand-off failed.', paperSource: 'TRAY_1_LETTERHEAD', duplexMode: 'DUPLEX' },
      { ...base, id: 'job-f2', caseId: 'S26-9107', reportType: 'ADDENDUM', mode: 'DIRECT_NETWORK_PRINT', status: 'FAILED', queuedAt: '2026-10-15T09:30:00.000Z', errorCode: 'PRINTER_UNREACHABLE', errorMessage: 'The printer did not answer on 192.168.14.10:9100.', paperSource: 'TRAY_1_LETTERHEAD', duplexMode: 'DUPLEX', resolvedDestination: net },
      { ...base, id: 'job-h1', caseId: 'S26-9108', reportType: 'FINAL', mode: 'DIRECT_NETWORK_PRINT', status: 'HOLD', statusBeforeHold: 'QUEUED', heldBy: 'PATH-001', heldAt: '2026-10-15T09:45:00.000Z', holdReason: 'Awaiting letterhead restock', queuedAt: '2026-10-15T09:40:00.000Z', paperSource: 'TRAY_1_LETTERHEAD', duplexMode: 'DUPLEX', resolvedDestination: net },
      { ...base, id: 'job-p1', caseId: 'S26-9106', reportType: 'FINAL', mode: 'NATIVE_QZ_TRAY', printerName: 'Histology Front Desk', status: 'PRINTED', queuedAt: '2026-10-15T08:00:00.000Z', paperSource: 'TRAY_2_PLAIN', duplexMode: 'SIMPLEX' },
      { ...base, id: 'job-c1', caseId: 'S26-9109', reportType: 'PRELIMINARY', mode: 'DIRECT_NETWORK_PRINT', status: 'CANCELLED', cancelledBy: 'PATH-001', cancelledAt: '2026-10-15T08:30:00.000Z', queuedAt: '2026-10-15T08:20:00.000Z', paperSource: 'TRAY_2_PLAIN', duplexMode: 'SIMPLEX', resolvedDestination: net },
    ];
    localStorage.setItem('pathscribe_mock_print_queue_v1', JSON.stringify(jobs));
  }, NET_DEFAULT);
}

async function openPrintQueue(page: Page) {
  await page.goto('/audit?tab=interfaces');
  await expect(page.getByRole('button', { name: T.printQueueSub, exact: true })).toBeVisible({ timeout: 90_000 });
  await page.getByRole('button', { name: T.printQueueSub, exact: true }).click();
  await expect(page.locator('h2.ps-conf-section-title')).toHaveText(T.title);
  await expect(jobRow(page, 'S26-9101'), 'the seeded jobs are listed').toBeVisible({ timeout: 20_000 });
}

const table = (page: Page) => page.locator('.ps-conf-section .ps-conf-table');
const jobRow = (page: Page, caseId: string) => table(page).locator('tbody tr').filter({ has: page.locator('td[data-phi="accession"]', { hasText: new RegExp(`^${caseId}$`) }) });
const cell = (row: Locator, i: number) => row.locator('td').nth(i);
const statusOf = (page: Page, caseId: string) => cell(jobRow(page, caseId), 4);
const caseIds = (page: Page) => table(page).locator('tbody td[data-phi="accession"]').allTextContents();
const tick = (page: Page, caseId: string) => jobRow(page, caseId).locator('input[type="checkbox"]').check();
const bulkBar = (page: Page) => page.locator('.ps-qa-tab-toolbar--center');

/**
 * Audit Log → Audit Log, searched for "Print job": [event, case, detail, user] per row.
 * Opened afresh: the screen reads the log when it opens, so events from this visit
 * show once it is reopened.
 */
async function printAuditEvents(page: Page): Promise<string[][]> {
  await page.goto('/audit');
  await expect(page.getByRole('button', { name: T.auditTab })).toBeVisible({ timeout: 90_000 });
  await page.getByRole('button', { name: T.auditTab }).click();
  await page.getByPlaceholder(T.auditSearch, { exact: true }).fill('Print job');
  const rows = page.getByRole('region', { name: T.auditRegion }).locator('.ps-auditlog-row--audit');
  await expect(rows.first()).toBeVisible({ timeout: 20_000 });
  return rows.evaluateAll(divs => divs.map(row => [
    (row.querySelector('.ps-auditlog-cell-event')?.childNodes[0]?.textContent ?? '').trim(),
    (row.querySelector('.ps-auditlog-case-link')?.textContent ?? '').trim(),
    (row.querySelector('.ps-auditlog-cell-detail')?.textContent ?? '').trim(),
    (row.querySelector('.ps-auditlog-cell-user')?.textContent ?? '').trim(),
  ]));
}

test.describe('PS-279 Print Queue Dashboard: filters, hold/release, bulk, retry, redirect, batch', () => {
  test.beforeEach(async ({ page }) => {
    // The interface engine's receiver (demo default http://localhost:8080/) isn't running here: answer it.
    await page.route('http://localhost:8080/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
    await signInFresh(page);
    await seedJobs(page);
  });

  test('Steps 1–2: the dashboard, its status filter and the job columns', async ({ page }) => {
    test.setTimeout(240_000);
    await test.step('1. Audit Log → Interface Log → Print Queue (Print Queue Dashboard)', async () => {
      await openPrintQueue(page);
      await expect(page.locator('.ps-auditlog-tabswitch-btn--active').filter({ hasText: T.printQueueSub })).toHaveCount(1);
      expect((await table(page).locator('thead th').allTextContents()).map(s => s.trim()), 'the columns').toEqual(T.columns);
      expect((await caseIds(page)).length, 'all nine seeded jobs').toBe(9);
    });

    await test.step('2. Each status filter, and Case / Report type / Destination / Paper / Duplex', async () => {
      const filter = page.getByLabel(T.statusFilter, { exact: true });
      const expected: Array<[string, string[]]> = [
        [T.status.QUEUED, ['S26-9101', 'S26-9102', 'S26-9103', 'S26-9105']],
        [T.status.HOLD, ['S26-9108']],
        [T.status.FAILED, ['S26-9104', 'S26-9107']],
        [T.status.PRINTED, ['S26-9106']],
        [T.status.CANCELLED, ['S26-9109']],
      ];
      for (const [label, ids] of expected) {
        await filter.selectOption({ label });
        await expect.poll(() => caseIds(page), { message: `filter "${label}"` }).toEqual(ids);
        for (const id of ids) await expect(statusOf(page, id), `${id} is ${label}`).toContainText(label);
      }
      await filter.selectOption({ label: T.status.PRINTING });
      await expect(table(page).locator('.ps-conf-empty-row'), 'no job is printing').toHaveText(T.noJobs);
      await filter.selectOption({ label: T.status.ALL });
      await expect.poll(async () => (await caseIds(page)).length).toBe(9);
      // Case, Report type, Delivery mode, Paper / Duplex, Destination for two jobs.
      const q1 = jobRow(page, 'S26-9101');
      expect((await q1.locator('td').allTextContents()).slice(1, 8).map(s => s.trim())).toEqual(
        ['S26-9101', 'FINAL', 'DIRECT_NETWORK_PRINT', T.status.QUEUED, T.tray1Duplex, NET_DEFAULT.displayName, '—']);
      const q2 = jobRow(page, 'S26-9102');
      expect((await q2.locator('td').allTextContents()).slice(1, 8).map(s => s.trim())).toEqual(
        ['S26-9102', 'PRELIMINARY', 'NATIVE_QZ_TRAY', T.status.QUEUED, T.tray2Simplex, '—', '—']);
      await expect(cell(jobRow(page, 'S26-9104'), 4), 'a failed job shows why').toHaveText(`${T.status.FAILED}Interface Engine hand-off failed.`);
      await expect(cell(jobRow(page, 'S26-9108'), 4), 'a held job shows its reason').toHaveText(`${T.status.HOLD}Awaiting letterhead restock`);
    });
  });

  test('Steps 3–4: hold/release restores the status; bulk hold and cancel; printed and cancelled jobs can\'t be held', async ({ page }) => {
    test.setTimeout(240_000);
    await openPrintQueue(page);

    await test.step('3. Hold a queued job, then Release it: Queued again (and a failed job: Failed again)', async () => {
      const q1 = jobRow(page, 'S26-9101');
      await q1.getByRole('button', { name: T.hold, exact: true }).click();
      await expect(statusOf(page, 'S26-9101')).toHaveText(T.status.HOLD);
      await expect(q1.getByRole('button', { name: T.hold, exact: true }), 'a held job can\'t be held again').toBeDisabled();
      await q1.getByRole('button', { name: T.release, exact: true }).click();
      await expect(statusOf(page, 'S26-9101'), 'back to the status it had').toHaveText(T.status.QUEUED);
      const f1 = jobRow(page, 'S26-9104');
      await f1.getByRole('button', { name: T.hold, exact: true }).click();
      await expect(statusOf(page, 'S26-9104')).toHaveText(T.status.HOLD);
      await f1.getByRole('button', { name: T.release, exact: true }).click();
      await expect(statusOf(page, 'S26-9104'), 'a failed job returns to Failed').toContainText(T.status.FAILED);
    });

    await test.step('4a. Tick several jobs: bulk Hold, then bulk Cancel', async () => {
      await tick(page, 'S26-9102');
      await tick(page, 'S26-9103');
      await expect(bulkBar(page).locator('.ps-conf-hint')).toHaveText(T.selected(2));
      await bulkBar(page).getByRole('button', { name: T.hold, exact: true }).click();
      await expect(statusOf(page, 'S26-9102')).toHaveText(T.status.HOLD);
      await expect(statusOf(page, 'S26-9103')).toHaveText(T.status.HOLD);
      await expect(bulkBar(page), 'the selection clears after a bulk action').toHaveCount(0);
      await tick(page, 'S26-9102');
      await tick(page, 'S26-9103');
      await bulkBar(page).getByRole('button', { name: T.cancel, exact: true }).click();
      await expect(statusOf(page, 'S26-9102')).toHaveText(T.status.CANCELLED);
      await expect(statusOf(page, 'S26-9103')).toHaveText(T.status.CANCELLED);
    });

    await test.step('4b. A printed or cancelled job can\'t be held: its Hold is disabled, and a bulk Hold leaves it as it is', async () => {
      await expect(jobRow(page, 'S26-9106').getByRole('button', { name: T.hold, exact: true }), 'printed: Hold disabled').toBeDisabled();
      await expect(jobRow(page, 'S26-9109').getByRole('button', { name: T.hold, exact: true }), 'cancelled: Hold disabled').toBeDisabled();
      await tick(page, 'S26-9106');
      await tick(page, 'S26-9109');
      await tick(page, 'S26-9105');
      await expect(bulkBar(page).locator('.ps-conf-hint')).toHaveText(T.selected(3));
      await bulkBar(page).getByRole('button', { name: T.hold, exact: true }).click();
      await expect(statusOf(page, 'S26-9105'), 'the queued job is held').toHaveText(T.status.HOLD);
      await expect(statusOf(page, 'S26-9106'), 'the printed job is refused').toHaveText(T.status.PRINTED);
      await expect(statusOf(page, 'S26-9109'), 'the cancelled job is refused').toHaveText(T.status.CANCELLED);
    });

    await test.step('Recorded: the Audit Log lists each hold, release and cancel (and nothing for the refused holds)', async () => {
      const events = await printAuditEvents(page);
      const pairs = events.map(([event, caseId]) => [event, caseId]).sort((a, b) => (a[0] + a[1]).localeCompare(b[0] + b[1]));
      expect(pairs).toEqual([
        ['Print job cancelled', 'S26-9102'], ['Print job cancelled', 'S26-9103'],
        ['Print job held', 'S26-9101'], ['Print job held', 'S26-9102'], ['Print job held', 'S26-9103'], ['Print job held', 'S26-9104'], ['Print job held', 'S26-9105'],
        ['Print job hold released', 'S26-9101'], ['Print job hold released', 'S26-9104'],
      ]);
    });
  });

  test('Step 5: Retry a failed job; Redirect & Retry a network job to another printer', async ({ page }) => {
    test.setTimeout(240_000);
    await openPrintQueue(page);

    await test.step('5a. Retry the failed interface-engine job: it is re-sent and prints', async () => {
      const engineCall = page.waitForRequest(r => r.url().startsWith('http://localhost:8080/') && r.method() === 'POST');
      await jobRow(page, 'S26-9104').getByRole('button', { name: T.retry, exact: true }).click();
      await engineCall;
      await expect(statusOf(page, 'S26-9104'), 'printed after the retry').toHaveText(T.status.PRINTED, { timeout: 30_000 });
    });

    await test.step('5b. Redirect the failed network job to 10.27.9.9 (Redirect & Retry)', async () => {
      const f2 = jobRow(page, 'S26-9107');
      await expect(cell(f2, 6)).toHaveText(NET_DEFAULT.displayName);
      await f2.getByRole('button', { name: T.redirect, exact: true }).click();
      const form = page.locator('.ps-print-redirect');
      await expect(form).toBeVisible();
      await form.locator('.ps-print-dest select').first().selectOption({ label: T.kindNetwork });
      await form.getByLabel(T.address, { exact: true }).fill(REDIRECT_TO.address);
      await form.getByLabel(T.name, { exact: true }).fill(REDIRECT_TO.name);
      await form.getByRole('button', { name: T.redirectConfirm, exact: true }).click();
      await expect(form, 'the form closes once redirected').toHaveCount(0, { timeout: 30_000 });
      await expect(cell(f2, 6), 'the job now goes to the new printer').toHaveText(REDIRECT_TO.name);
      // Sent again: from a browser a network print needs the site agent (step 7 needs a person).
      await expect(statusOf(page, 'S26-9107')).toHaveText(`${T.status.FAILED}${T.needsSiteAgent}`);
    });

    await test.step('Recorded: re-queue, completion and redirect are in the Audit Log', async () => {
      const events = await printAuditEvents(page);
      const pairs = events.map(([event, caseId]) => [event, caseId]);
      for (const p of [['Print job re-queued', 'S26-9104'], ['Print job completed', 'S26-9104'], ['Print job redirected', 'S26-9107'], ['Print job re-queued', 'S26-9107'], ['Print job failed', 'S26-9107']]) {
        expect(pairs, `${p[0]} for ${p[1]}`).toContainEqual(p);
      }
      const redirected = events.find(([event]) => event === 'Print job redirected');
      expect(redirected?.[2], 'the redirect names the new printer').toContain(REDIRECT_TO.address);
    });
  });

  test('Step 6: Run Batch Now groups the queued, non-interfaced jobs in the UTC window by client account, then by delivery route', async ({ page }) => {
    test.setTimeout(240_000);
    await openPrintQueue(page);

    await test.step('6a. 08:00–17:00 UTC, Group by Client account → Run Batch Now', async () => {
      await page.getByLabel(T.windowStart, { exact: true }).fill('08:00');
      await page.getByLabel(T.windowEnd, { exact: true }).fill('17:00');
      await page.getByLabel(T.groupBy, { exact: true }).selectOption({ label: T.byClient });
      await page.getByRole('button', { name: T.runBatch, exact: true }).click();
      // In the window and batchable: S26-9101 (network) and S26-9102 (QZ Tray), both Fenwick Women's.
      // Skipped: S26-9103 (interface engine) and S26-9105 (queued 06:30 UTC).
      await expect(page.locator('.ps-conf-hint--success')).toHaveText(T.batchResult(1, 2, 2));
      await expect(cell(jobRow(page, 'S26-9101'), 7)).toHaveText(/^batch-clientAccount-c-fenwick-womens-/);
      await expect(cell(jobRow(page, 'S26-9102'), 7)).toHaveText(await cell(jobRow(page, 'S26-9101'), 7).textContent() ?? '');
      for (const id of ['S26-9103', 'S26-9105', 'S26-9104', 'S26-9108']) await expect(cell(jobRow(page, id), 7), `${id} not batched`).toHaveText('—');
    });

    await test.step('6b. Fresh queue, Group by Delivery route → Run Batch Now', async () => {
      await signInFresh(page);
      await seedJobs(page);
      await openPrintQueue(page);
      await page.getByLabel(T.groupBy, { exact: true }).selectOption({ label: T.byRoute });
      await page.getByRole('button', { name: T.runBatch, exact: true }).click();
      // S26-9101 is from Ward 3, S26-9102 from Theatre 2: two groups.
      await expect(page.locator('.ps-conf-hint--success')).toHaveText(T.batchResult(2, 2, 2));
      await expect(cell(jobRow(page, 'S26-9101'), 7)).toHaveText(/^batch-deliveryRoute-Ward 3-/);
      await expect(cell(jobRow(page, 'S26-9102'), 7)).toHaveText(/^batch-deliveryRoute-Theatre 2-/);
      await expect(cell(jobRow(page, 'S26-9103'), 7)).toHaveText('—');
    });
  });
});
