// e2e/review/ps-87.assist-lis-ingestion.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-87 — "Assist mode: real inbound data from the external LIS at Gross
// Complete and Microscopic/Diagnosis Complete, to trigger AI synoptic report
// generation for review". Review test plan, run against the demo (Vite dev
// server, localStorage data, the demo LIS poll adapter) as Pete Nimmo:
//
//   1. Sign in as Pete and open Configuration → System → Integrations → Assist
//      LIS Ingestion.                                                automated
//   2. Under LIS status mapping, check each LIS status (e.g. GROSSED,
//      DX_COMPLETE) is mapped to Gross Complete or Microscopic/Diagnosis
//      Complete; save.                                               automated
//      (Save is only enabled once something changed, so the test adds a fifth
//      status, GROSS_DONE → Gross Complete, saves, and checks it after a
//      reload.)
//   3. Click Poll now: the Latest poll table lists each demo case with its
//      milestone and result (e.g. AI draft prepared, Status not mapped).
//                                                                    automated
//   4. Under Test an inbound message, click Load example (HL7 v2) and Send to
//      staging queue: the Staging queue shows it Handled.            automated
//   5. Open the drafted Assist case: the report shows as AI Drafted, with
//      unverified fields offering Confirm / Override; anything a person typed
//      is kept.                                                 needs a person
//      (the draft's content needs the AI service, which isn't reachable here)
//   6. If a queue entry shows Failed, click Retry failed and check the
//      Activity log records the retry.                               automated
//      (The demo never produces a failed entry, so this test puts one in the
//      staging queue's own store first, as a failed attempt leaves it: state
//      Failed, 1 attempt, an error. See "Demo data" below.)
//   7. The real LIS feed, the inbound endpoint and the timed schedule need the
//      API server (phase 2e).                                   needs a person
//
// Expected (ticket): mapped LIS milestones produce AI draft reports for
// review; unmapped statuses and signed-out cases are skipped; every run is
// logged. (The demo feed has no signed-out case, so "signed-out cases are
// skipped" isn't exercised here; it is in runAssistPollCycle.test.ts.)
//
// The AI service: the worker asks the AI (through the app's /api/ai/ proxy)
// to pick templates and fill fields. There is no internet here, so the test
// answers every /api/ai/ call itself with 503 (AI service unreachable). With
// the AI unreachable the demo still reports "AI draft prepared", with "New
// drafts: 0 · Fields suggested: 0 · Template changes to review: 0": the test
// asserts that exactly, and the review report flags it (a result that says a
// draft was prepared when the AI produced nothing).
//
// Demo data (services/lisIngestion/adapters/mockPollAdapter.ts): the poll
// returns MPA26-1006-POOL "RECEIVED" (not mapped), MFT26-8809-POOL "GROSSED"
// (Gross Complete) and S26-4417-BX-001 "MICRO_COMPLETE" (Microscopic/Diagnosis
// Complete). The HL7 v2 example is an ORU^R01 for S26-4416-BX-001 "GROSSED".
// Step 6's seeded event is MFT26-8809-POOL "GROSSED", Failed after 1 attempt.
//
// Texts are the English values of assistLisPolling.* and systemTab.* in
// src/i18n/locales/en.json; selectors are the screen's own .ps-conf-* classes.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5305 npx playwright test --project=chromium \
//        e2e/review/ps-87.assist-lis-ingestion.spec.ts --reporter=list
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
  configuration: 'Configuration',
  group: 'Integrations',                                     // systemTab.groups.integrations
  title: 'Assist LIS Ingestion',                             // assistLisPolling.title / systemTab.sections.assistLisPolling
  crosswalkTitle: 'LIS status mapping',                      // assistLisPolling.crosswalk.title
  lisStatus: 'LIS status',                                   // assistLisPolling.crosswalk.lisStatus
  milestone: 'Milestone',                                    // assistLisPolling.crosswalk.milestone
  addStatus: '+ Add status',                                 // assistLisPolling.crosswalk.add
  save: 'Save',                                              // assistLisPolling.save
  saved: 'Saved',                                            // assistLisPolling.saved
  gross: 'Gross Complete',                                   // assistLisPolling.milestone.gross_complete
  micro: 'Microscopic/Diagnosis Complete',                   // assistLisPolling.milestone.micro_diagnosis_complete
  pollNow: 'Poll now',                                       // assistLisPolling.activity.pollNow
  latestTitle: 'Latest poll',                                // assistLisPolling.latest.title
  draftPrepared: 'AI draft prepared',                        // assistLisPolling.outcome.draft_prepared
  notMapped: 'Status not mapped',                            // assistLisPolling.outcome.no_milestone
  draftResultNothing: 'New drafts: 0 · Fields suggested: 0 · Template changes to review: 0', // assistLisPolling.latest.draftResult
  format: 'Message format',                                  // assistLisPolling.push.format
  loadExample: 'Load example',                               // assistLisPolling.push.loadExample
  message: 'Inbound message',                                // assistLisPolling.push.messageLabel
  send: 'Send to staging queue',                             // assistLisPolling.push.send
  pushResult: 'Staged: 1 · Handled now: 1',                  // assistLisPolling.push.result
  queueTitle: 'Staging queue',                               // assistLisPolling.queue.title
  retryFailed: 'Retry failed',                               // assistLisPolling.queue.retryFailed
  handled: 'Handled',                                        // assistLisPolling.queue.state.processed
  failed: 'Failed',                                          // assistLisPolling.queue.state.failed
  counts: (p: number, f: number, h: number) => `Waiting: ${p} · Failed: ${f} · Handled: ${h}`, // assistLisPolling.queue.counts
  activityTitle: 'Activity',                                 // assistLisPolling.activity.title
  sourcePoll: 'Poll',                                        // assistLisPolling.source.poll
  sourceHl7: 'HL7 v2 message',                               // assistLisPolling.source.hl7v2
  triggerManual: 'Poll now',                                 // assistLisPolling.trigger.manual
  triggerPush: 'Inbound message',                            // assistLisPolling.trigger.push
  triggerRetry: 'Retry',                                     // assistLisPolling.trigger.retry
  noRuns: 'No polls yet.',                                   // assistLisPolling.activity.noRuns
};

/** The demo's default crosswalk (assistMilestoneRules.ts DEFAULT_ASSIST_POLLING_SETTINGS). */
const DEFAULT_CROSSWALK = [
  ['GROSS_COMPLETE', T.gross], ['GROSSED', T.gross], ['MICRO_COMPLETE', T.micro], ['DX_COMPLETE', T.micro],
];
const QUEUE_KEY = 'pathscribe_mock_pathscribe_lis_staging_queue'; // mockStorage prefix + LIS_STAGING_QUEUE_STORAGE_KEY
const SEED_ERROR = 'The case changed while the draft was being built (review-test seed).';

/** A card on the screen, by its title. */
const card = (page: Page, title: string) => page.locator('.ps-conf-card').filter({ has: page.locator('.ps-conf-card-title', { hasText: new RegExp(`^${title}$`) }) });

/** The cell texts of a table's body rows. */
const rowsOf = (table: Locator) => table.locator('tbody tr').evaluateAll(trs => trs.map(tr => Array.from(tr.querySelectorAll('td')).map(td => (td.textContent ?? '').trim())));

async function openAssistLis(page: Page) {
  await page.goto('/configuration?tab=system&section=assist_lis_polling');
  await expect(page.locator('h1, h2').filter({ hasText: T.configuration }).first()).toBeVisible({ timeout: 90_000 });
  await expect(page.locator('h2.ps-conf-section-title')).toHaveText(T.title, { timeout: 30_000 });
}

/** The crosswalk table's rows as [LIS status, milestone label]. */
const crosswalk = (page: Page) => card(page, 'Polling').locator('tbody tr').evaluateAll(trs => trs.map(tr => {
  const input = tr.querySelector('input') as HTMLInputElement | null;
  const select = tr.querySelector('select') as HTMLSelectElement | null;
  return [input?.value ?? '', select ? select.options[select.selectedIndex].text : ''];
}));

test.describe('PS-87 Assist LIS ingestion: mapping, Poll now, inbound message, retry', () => {
  test.beforeEach(async ({ page }) => {
    // No internet: every AI call the worker makes is answered as "AI service unreachable".
    await page.route('**/api/ai/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"AI service unreachable (review test)"}' }));
    await signInFresh(page);
  });

  test('Steps 1–4: the status mapping saves; Poll now and an HL7 v2 message go through the staging queue', async ({ page }) => {
    test.setTimeout(300_000);

    await test.step('1. Configuration → System → Integrations → Assist LIS Ingestion', async () => {
      await openAssistLis(page);
      await expect(page.locator('.ps-sub-tab-btn.active'), 'the Integrations group').toHaveText(T.group);
      await expect(page.locator('.ps-confsys-nav-btn--active'), 'the selected section').toContainText(T.title);
      await expect(card(page, T.activityTitle).locator('.ps-conf-empty-row'), 'nothing polled yet').toHaveText(T.noRuns);
    });

    await test.step('2. LIS status mapping: GROSSED and DX_COMPLETE (and the rest) are mapped; add one and save', async () => {
      await expect(card(page, 'Polling').getByText(T.crosswalkTitle, { exact: true })).toBeVisible();
      expect(await crosswalk(page), 'each LIS status maps to a milestone').toEqual(DEFAULT_CROSSWALK);
      const save = card(page, 'Polling').getByRole('button', { name: T.save, exact: true });
      await expect(save, 'nothing to save yet').toBeDisabled();
      await card(page, 'Polling').getByRole('button', { name: T.addStatus, exact: true }).click();
      const newRow = card(page, 'Polling').locator('tbody tr').nth(4);
      await newRow.getByLabel(T.lisStatus, { exact: true }).fill('GROSS_DONE');
      await expect(newRow.getByLabel(T.milestone, { exact: true }).locator('option:checked')).toHaveText(T.gross);
      await save.click();
      await expect(card(page, 'Polling').getByText(T.saved, { exact: true }), 'saved').toBeVisible();
      await expect(save, 'nothing left to save').toBeDisabled();
      await openAssistLis(page);
      expect(await crosswalk(page), 'the new mapping is kept after a reload').toEqual([...DEFAULT_CROSSWALK, ['GROSS_DONE', T.gross]]);
    });

    await test.step('3. Poll now: the Latest poll table lists each demo case with its milestone and result', async () => {
      const activity = card(page, T.activityTitle);
      await activity.getByRole('button', { name: T.pollNow, exact: true }).click();
      await expect(activity.getByText(T.latestTitle, { exact: true })).toBeVisible({ timeout: 60_000 });
      const latest = activity.locator('table').nth(1);
      expect(await rowsOf(latest), 'accession, LIS status, milestone, result, details').toEqual([
        ['MPA26-1006-POOL', 'RECEIVED', '—', T.notMapped, '—'],
        ['MFT26-8809-POOL', 'GROSSED', T.gross, T.draftPrepared, T.draftResultNothing],
        ['S26-4417-BX-001', 'MICRO_COMPLETE', T.micro, T.draftPrepared, T.draftResultNothing],
      ]);
      // The run is logged: from LIS 3, new in queue 3, AI drafts 2, text only 0, skipped 1, failed 0.
      const runs = await rowsOf(activity.locator('table').first());
      expect(runs.map(r => r.slice(1)), 'one logged run').toEqual([[T.triggerManual, '3', '3', '2', '0', '1', '0']]);
      const queue = card(page, T.queueTitle);
      await expect(queue.locator('.ps-conf-hint')).toHaveText(T.counts(0, 0, 3));
    });

    await test.step('4. Load example (HL7 v2) → Send to staging queue: the Staging queue shows it Handled', async () => {
      const push = card(page, 'Test an inbound message');
      await expect(push.getByLabel(T.format, { exact: true }).locator('option:checked')).toHaveText(T.sourceHl7);
      await push.getByRole('button', { name: T.loadExample, exact: true }).click();
      await expect(push.getByLabel(T.message, { exact: true })).toHaveValue(/^MSH\|\^~\\&\|DEMO_LIS\|.*ORU\^R01/);
      await push.getByRole('button', { name: T.send, exact: true }).click();
      await expect(push.locator('.ps-conf-hint--success'), 'staged and handled').toHaveText(T.pushResult, { timeout: 60_000 });
      const queue = card(page, T.queueTitle);
      await expect(queue.locator('.ps-conf-hint')).toHaveText(T.counts(0, 0, 4));
      const top = (await rowsOf(queue.locator('table')))[0];
      expect(top.slice(1), 'source, accession, LIS status, state, result, attempts').toEqual([T.sourceHl7, 'S26-4416-BX-001', 'GROSSED', T.handled, T.draftPrepared, '1']);
      const runs = await rowsOf(card(page, T.activityTitle).locator('table').first());
      expect(runs.map(r => r.slice(1)), 'the inbound message is logged as its own run').toEqual([
        [T.triggerPush, '0', '1', '1', '0', '0', '0'],
        [T.triggerManual, '3', '3', '2', '0', '1', '0'],
      ]);
    });
  });

  test('Step 6: a Failed queue entry → Retry failed → handled, and the Activity log records the retry', async ({ page }) => {
    test.setTimeout(300_000);

    await test.step('6a. A failed entry in the staging queue (seeded: the demo never produces one)', async () => {
      await page.evaluate(({ key, error }) => {
        localStorage.setItem(key, JSON.stringify([{
          id: 'lis-evt-review-failed-1', source: 'poll', accession: 'MFT26-8809-POOL', lisStatus: 'GROSSED',
          updatedAt: '2026-09-24T14:05:00.000Z',
          grossText: 'Right hemicolectomy specimen, 32 cm, received fresh. Obstructing tumour in caecum, 5.8 cm. Tumour perforates the serosal surface at one point.',
          receivedAt: '2026-10-15T09:00:00.000Z', fingerprint: 'poll|MFT26-8809-POOL|GROSSED|2026-09-24T14:05:00.000Z',
          state: 'failed', attempts: 1, outcome: 'failed', error, processedAt: '2026-10-15T09:00:05.000Z',
        }]));
      }, { key: QUEUE_KEY, error: SEED_ERROR });
      await openAssistLis(page);
      const queue = card(page, T.queueTitle);
      await expect(queue.locator('.ps-conf-hint')).toHaveText(T.counts(0, 1, 0));
      const rows = await rowsOf(queue.locator('table'));
      expect(rows.map(r => r.slice(1)), 'the entry shows Failed with its error').toEqual([[T.sourcePoll, 'MFT26-8809-POOL', 'GROSSED', T.failed, SEED_ERROR, '1']]);
      await expect(card(page, T.activityTitle).locator('.ps-conf-empty-row')).toHaveText(T.noRuns);
    });

    await test.step('6b. Retry failed: the entry is handled and the Activity log records a Retry run', async () => {
      const queue = card(page, T.queueTitle);
      const retry = queue.getByRole('button', { name: T.retryFailed, exact: true });
      await expect(retry).toBeEnabled();
      await retry.click();
      await expect(queue.locator('.ps-conf-hint'), 'nothing failed any more').toHaveText(T.counts(0, 0, 1), { timeout: 60_000 });
      const rows = await rowsOf(queue.locator('table'));
      expect(rows.map(r => r.slice(1)), 'handled on the retry (attempts restart at 1)').toEqual([[T.sourcePoll, 'MFT26-8809-POOL', 'GROSSED', T.handled, T.draftPrepared, '1']]);
      await expect(retry, 'nothing left to retry').toBeDisabled();
      const runs = await rowsOf(card(page, T.activityTitle).locator('table').first());
      expect(runs.map(r => r.slice(1)), 'the retry is logged: trigger Retry, 1 AI draft').toEqual([[T.triggerRetry, '0', '0', '1', '0', '0', '0']]);
    });
  });
});
