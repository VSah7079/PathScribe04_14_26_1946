// e2e/review/ps-147.discordance-patterns.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-147 — "Intra-Departmental Discordance Pattern Detection — Administrative/
// Peer Review CAPA Trigger": the review test plan, run against the demo (Vite
// dev server, localStorage data).
//
// Review steps (each is a test.step below):
//   1. automated — Sign in as Dr. Rachel Okafor (Lab Director) and open
//      Configuration → System → Discordance Trend Policy.
//   2. automated — Defaults (3-month window, 20 minimum reviews, 3 majors or
//      10%, major = high, decision request); minimum reviews 0 is refused on
//      save, 30 saves.
//   3. automated — Quality Assurance → CAPA Engine → Discordance Patterns: the
//      tile shows its count as soon as the page opens.
//   4. automated — Sarah Chen at Desert Valley: '3 major of 20 reviewed (15%)'.
//   5. automated — Start review, then Conclude with CAPA without a note
//      (refused: 'Add a note.'), then with a note (saves); the Audit Log has all
//      three steps.
//   6. automated — As a pathologist (Dr. Sarah Johnson): no Discordance Patterns
//      tile.
//   7. needs a person — a note, not a check: evaluating after each new QA record
//      and notifying the Lab Director need the API server (PS-358); department
//      policies were not built (Pete's call).
//
// Expected (ticket): thresholds are set per site, patterns show for both
// pathologist and specimen type, nothing opens a CAPA by itself, and only the
// Lab Director can see and decide them.
//
// Sign-in: Rachel Okafor and Sarah Johnson are started with helpers.signIn /
// startSession and their demo account records (no password typed).
//
// Where the demo differs from the steps as written:
//   • Step 4 (REAL GAP, the first test fails on it): the demo data has no
//     discordance pattern at all. No seeded QA record names a reviewed
//     pathologist (services/quality/mockQaActivityRecordService.ts has no
//     `reviewedPathologist` anywhere), so on fresh demo data the tile shows 0
//     and the tab says "No discordance patterns."; Sarah Chen's '3 major of 20
//     reviewed (15%)' (the Batch 442 Jira comment) came from records made by
//     hand in that session. The first test checks the step as written against
//     the demo and fails at step 4.
//   • So steps 3–5 are also run on a review history the test writes into the
//     demo's QA-record store before opening the page: 20 pre-sign-out peer
//     reviews of Sarah Chen (staff id 1) on case S26-5001-CYT-001 (performed at
//     Desert Valley Medical Center; specimen type sp-cyto-pap), 3 of them
//     discordant with severity high, recorded in the last 30 days. That gives
//     a pathologist pattern and a specimen-type pattern (both 3 of 20, 15%), so
//     the tile shows 2 on load.
//   • Step 2 vs step 4 (as the plan's note says): minimum reviews 30 saved at
//     the organisation level would stop a 20-review pattern, so the step-2 test
//     runs on its own and resets the policy; the pattern tests use the default.
//     The test also checks that with 30 the 20-review pattern is not raised.
//   • Step 5 "all three steps" in the Audit Log are QA_TREND_RECOMMENDED,
//     QA_TREND_DECIDED (under-review) and QA_TREND_DECIDED (capa-opened).
//   • Step 6: Sarah Chen has no demo sign-in; Dr. Sarah Johnson is used. A
//     pathologist can't open Quality Assurance at all ("You don't have access
//     to this screen"), so there is no CAPA Engine and no tile; the test also
//     checks the trend service refuses her session (NOT_PERMITTED).
//
// Texts are the English values of qaTrendPolicySection.* and
// qualityAssurance.qaTrends.* / qualityAssurance.tiles.* / qualityAssurance.pillars.*
// in src/i18n/locales/en.json; selectors are the app's own ids and .ps-*
// classes (components/Config/System/QaTrendPolicySection.tsx,
// components/QualityAssurance/QaTrendReviewsTab.tsx, pages/QualityAssurancePage.tsx).
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5302 npx playwright test --project=chromium \
//        e2e/review/ps-147.discordance-patterns.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';
import { signIn, startSession, clearDemoKeys } from './helpers';

const T = {
  policyTitle: 'Discordance Trend Policy',                          // qaTrendPolicySection.title
  save: 'Save policy',                                              // qaTrendPolicySection.save
  saved: '✓ Saved',                                                 // "✓ " + qaTrendPolicySection.saved
  sampleOutOfRange: 'The minimum reviews must be a whole number of at least 1.', // …problems.sampleOutOfRange
  actionReview: 'Ask the Lab Director for a decision',              // …actions.review-task
  tile: 'Discordance Patterns',                                     // qualityAssurance.tiles.trendReviews
  capaPillar: 'CAPA Engine',                                        // qualityAssurance.pillars.capa
  empty: 'No discordance patterns.',                                // qualityAssurance.qaTrends.empty
  kindPathologist: 'Pathologist',                                   // …qaTrends.kinds.pathologist
  kindSpecimen: 'Specimen type',                                    // …qaTrends.kinds.specimen-type
  numbers: '3 major of 20 reviewed (15%)',                          // …qaTrends.numbers
  triggerBoth: 'Count and rate thresholds reached',                 // …qaTrends.triggers.both
  statusRecommended: 'Needs decision',                              // …qaTrends.status.recommended
  statusUnderReview: 'Under review',                                // …qaTrends.status.under-review
  statusCapa: 'CAPA',                                               // …qaTrends.status.capa-opened
  startReview: 'Start review',                                      // …qaTrends.startReview / confirm.start-review
  openCapa: 'Conclude with CAPA',                                   // …qaTrends.openCapa / confirm.open-capa
  titleStart: 'Start a review',                                     // …qaTrends.titles.start-review
  titleCapa: 'Conclude the review with a CAPA',                     // …qaTrends.titles.open-capa
  noteRequired: 'Add a note.',                                      // …qaTrends.errors.noteRequired
  showClosed: 'Show concluded',                                     // …qaTrends.showClosed
  desertValley: 'Desert Valley Medical Center',
  noAccess: "You don't have access to this screen",                 // screenAccess.denied.title                     // facility c-ent-dvmc (data)
};

// Demo accounts (src/services/auth/demo/demoAccounts.ts; staff in mockUserService.ts).
const RACHEL = { id: 'LD-001', name: 'Dr. Rachel Okafor', role: 'admin' };        // Lab Director
const SARAH_J = { id: 'PATH-SJ-001', name: 'Dr. Sarah Johnson', role: 'pathologist' };
const SARAH_CHEN = { userId: '1', userName: 'Sarah Chen' };
const CASE_ID = 'S26-5001-CYT-001';                                                // Desert Valley; specimen sp-cyto-pap
const CAPA_NOTE = 'Three high-severity misses on GYN cases; focused review of her Pap reads and a 30-day re-audit.';

const KEYS = {
  policy: 'pathscribe_mock_pathscribe_qa_trend_policy',
  trends: 'pathscribe_mock_pathscribe_qa_trend_recommendations',
  records: 'pathscribe_mock_qa_activity_records',
};

const field = (page: Page, f: string) => page.locator(`#org-${f}`);
const tile = (page: Page) => page.locator('.ps-wl-filter-tile').filter({ hasText: T.tile });
const trendRows = (page: Page) => page.locator('.ps-capa-rec > .ps-conf-table-wrap .ps-conf-table tbody tr');
const trendRow = (page: Page, kind: string, subject: string) =>
  trendRows(page).filter({ has: page.locator('td:nth-child(2)', { hasText: new RegExp(`^${kind}$`) }) })
    .filter({ has: page.locator('td:nth-child(3)', { hasText: new RegExp(`^${subject}$`) }) });
const decisionDialog = (page: Page) => page.locator('.ps-ms-overlay .ps-ms-modal');

/** Opens a page and waits for its heading (the first cold load of a lazy screen can take longer than helpers.openScreen allows). */
async function openPage(page: Page, path: string, heading: string) {
  await page.goto(path);
  await expect(page.locator('h1, h2').filter({ hasText: heading }).first()).toBeVisible({ timeout: 60_000 });
}
async function openPolicy(page: Page) {
  await openPage(page, '/configuration?tab=system&section=qa_trend_policy', 'Configuration');
  await expect(page.locator('h2.ps-rbuf-title', { hasText: T.policyTitle })).toBeVisible({ timeout: 20_000 });
}
async function openCapaEngine(page: Page) {
  await openPage(page, '/quality-assurance?pillar=capa', 'Quality Assurance');
  await expect(page.locator('.ps-auditlog-tabswitch-btn--active')).toHaveText(T.capaPillar);
}

/**
 * Test fixture (see header): 20 pre-sign-out peer reviews of Sarah Chen on a
 * Desert Valley case, 3 discordant / high, written into the demo QA-record
 * store next to its seeded records, before the QA page evaluates patterns.
 */
async function writeSarahChenReviewHistory(page: Page) {
  await page.goto('/');
  const written = await page.evaluate(async ({ caseId, reviewed, key }) => {
    const { mockQaActivityRecordService } = await import(/* @vite-ignore */ String('/src/services/quality/mockQaActivityRecordService.ts'));
    const { caseRouter } = await import(/* @vite-ignore */ String('/src/services/cases/CaseRouter.ts'));
    const seeds = await mockQaActivityRecordService.getAll();
    const c = await caseRouter.getAll(undefined, { includeOrchestration: true });
    const theCase = (c.ok ? c.data : []).find((x: { id: string }) => x.id === caseId) as { specimens: { id: string }[] } | undefined;
    if (!seeds.ok || !theCase) return 0;
    const now = Date.now();
    const reviews = Array.from({ length: 20 }, (_, i) => ({
      id: `e2e-ps147-review-${i + 1}`,
      activityTypeId: 'qa-activity-pre-signout-peer-review',
      caseId, specimenId: theCase.specimens[0].id, caseType: 'Pap smear', subspecialtyId: 'cyto',
      fieldValues: {},
      outcome: i < 3 ? 'discordant' : 'concordant',
      ...(i < 3 ? { severity: 'high' } : {}),
      recordedAt: new Date(now - (i + 1) * 86_400_000).toISOString(),
      recordedBy: { userId: 'PATH-001', userName: 'Pete Nimmo' },
      reviewedPathologist: reviewed,
      postSignOut: false,
    }));
    localStorage.setItem(key, JSON.stringify([...seeds.data, ...reviews]));
    return reviews.length;
  }, { caseId: CASE_ID, reviewed: SARAH_CHEN, key: KEYS.records });
  expect(written, 'the review history was written').toBe(20);
}

test.describe('PS-147: discordance trend policy and Discordance Patterns', () => {
  test.afterEach(async ({ page }) => { await clearDemoKeys(page, [KEYS.policy, KEYS.trends, KEYS.records]); });

  test('Steps 1–2: as the Lab Director, the policy defaults; minimum reviews 0 refused, 30 saves (and then stops a 20-review pattern)', async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page, RACHEL);

    await test.step('1. Sign in as Dr. Rachel Okafor (Lab Director); Configuration → System → Discordance Trend Policy', async () => {
      await openPolicy(page);
      await expect(page.locator('.ps-config-viewonly-note'), 'she can change it').toHaveCount(0);
    });

    await test.step('2a. Defaults: 3-month window, 20 minimum reviews, 3 majors or 10%, major = high, decision request', async () => {
      await expect(field(page, 'rollingWindowMonths')).toHaveValue('3');
      await expect(field(page, 'minSampleSize')).toHaveValue('20');
      await expect(field(page, 'countThreshold')).toHaveValue('3');
      await expect(field(page, 'rateThresholdPercent')).toHaveValue('10');
      const org = page.locator('.ps-conf-card').first();
      const sev = (s: string) => org.locator('.ps-conf-form-row--3 label').filter({ hasText: new RegExp(`^\\s*${s}$`) }).locator('input');
      await expect(sev('high')).toBeChecked();
      await expect(sev('medium')).not.toBeChecked();
      await expect(sev('low')).not.toBeChecked();
      await expect(page.locator('#org-action')).toHaveValue('review-task');
      await expect(page.locator('#org-action option:checked')).toHaveText(T.actionReview);
      const watch = org.locator('> div > .ps-conf-toggle-label-row input[type="checkbox"]');
      await expect(watch).toHaveCount(2);
      await expect(watch.nth(0), 'watch pathologists').toBeChecked();
      await expect(watch.nth(1), 'watch specimen types').toBeChecked();
    });

    await test.step('2b. Minimum reviews 0, Save policy: refused with the reason; nothing stored', async () => {
      await field(page, 'minSampleSize').fill('0');
      await page.getByRole('button', { name: T.save, exact: true }).click();
      await expect(page.locator('.ps-field-still-required[role="alert"]')).toHaveText(T.sampleOutOfRange);
      expect(await page.evaluate((k) => localStorage.getItem(k), KEYS.policy), 'not saved').toBeNull();
    });

    await test.step('2c. Minimum reviews 30, Save policy: saved, kept after a reload, audited', async () => {
      await field(page, 'minSampleSize').fill('30');
      await page.getByRole('button', { name: T.save, exact: true }).click();
      await expect(page.locator('.ps-concordance__saved')).toHaveText(T.saved);
      await openPolicy(page);
      await expect(field(page, 'minSampleSize')).toHaveValue('30');
      await openPage(page, '/audit?search=QA_TREND_POLICY_CHANGED', 'System Logs');
      await expect(page.locator('.ps-auditlog-row--audit').filter({ hasText: 'QA_TREND_POLICY_CHANGED' })).toHaveCount(1);
    });

    await test.step('2d. With 30, a 20-review history raises no pattern (the threshold is the site\'s)', async () => {
      await writeSarahChenReviewHistory(page);
      await openCapaEngine(page);
      await expect(tile(page).locator('.ps-wl-filter-tile__count')).toHaveText('0', { timeout: 20_000 });
      await tile(page).click();
      await expect(page.locator('.ps-capa-rec > .ps-conf-empty')).toHaveText(T.empty);
    });
  });

  test('Steps 3–4 on the demo data as given: the tile count on load; Sarah Chen at Desert Valley, 3 major of 20', async ({ page }) => {
    test.fail(true, 'Known gap, decided by Pete (Batch 589): the demo now has 5 peer review discordances (3 minor, 2 major, 3 pathologists, no pattern). The ticket text expects a pattern tile and 3 major of 20 for Sarah Chen, which needs 20 reviews of one pathologist; this test passes only if that demo data is added.');
    test.setTimeout(120_000);
    await signIn(page, RACHEL);
    await test.step('3. Quality Assurance → CAPA Engine: the Discordance Patterns tile shows its count on load', async () => {
      await openCapaEngine(page);
      await expect(tile(page).locator('.ps-wl-filter-tile__count'), 'a count, before the tab is opened').toHaveText(/^\d+$/, { timeout: 20_000 });
    });
    await test.step("4. Sarah Chen at Desert Valley: '3 major of 20 reviewed (15%)'", async () => {
      await tile(page).click();
      const row = trendRow(page, T.kindPathologist, SARAH_CHEN.userName);
      await expect(row, 'Sarah Chen\'s pattern in the demo data').toHaveCount(1);
      await expect(row.locator('td').nth(3)).toHaveText(T.desertValley);
      await expect(row.locator('td').nth(4).locator('> div').first()).toHaveText(T.numbers);
    });
  });

  test('Steps 3–6 on a written review history: tile count on load, both patterns, decide with a CAPA, audit; a pathologist sees no tile', async ({ page }) => {
    test.setTimeout(240_000);
    await signIn(page, RACHEL);
    await writeSarahChenReviewHistory(page);

    await test.step('3. Quality Assurance → CAPA Engine: the Discordance Patterns tile shows 2 as soon as the page opens', async () => {
      await openCapaEngine(page);
      await expect(tile(page).locator('.ps-wl-filter-tile__count')).toHaveText('2', { timeout: 20_000 });
      await expect(tile(page), 'its tab is not open yet').toHaveAttribute('aria-pressed', 'false');
    });

    await test.step("4. Sarah Chen at Desert Valley: '3 major of 20 reviewed (15%)'; the specimen type too", async () => {
      await tile(page).click();
      await expect(trendRows(page)).toHaveCount(2, { timeout: 20_000 });
      const chen = trendRow(page, T.kindPathologist, SARAH_CHEN.userName);
      await expect(chen.locator('td').nth(0)).toHaveText(T.statusRecommended);
      await expect(chen.locator('td').nth(3)).toHaveText(T.desertValley);
      await expect(chen.locator('td').nth(4).locator('> div').nth(0)).toHaveText(T.numbers);
      await expect(chen.locator('td').nth(4).locator('> div').nth(1)).toHaveText(T.triggerBoth);
      const specimen = trendRows(page).filter({ has: page.locator('td:nth-child(2)', { hasText: new RegExp(`^${T.kindSpecimen}$`) }) });
      await expect(specimen).toHaveCount(1);
      await expect(specimen.locator('td').nth(3)).toHaveText(T.desertValley);
      await expect(specimen.locator('td').nth(4).locator('> div').nth(0)).toHaveText(T.numbers);
      // Nothing opened a CAPA by itself.
      const stored = await page.evaluate((k) => (JSON.parse(localStorage.getItem(k) ?? '[]') as { status: string }[]).map(r => r.status), KEYS.trends);
      expect(stored).toEqual(['recommended', 'recommended']);
    });

    await test.step('5a. Start review (note optional): Sarah Chen\'s pattern is under review', async () => {
      await trendRow(page, T.kindPathologist, SARAH_CHEN.userName).getByRole('button', { name: T.startReview, exact: true }).click();
      const d = decisionDialog(page);
      await expect(d.locator('.ps-ms-header')).toHaveText(T.titleStart);
      await d.getByRole('button', { name: T.startReview, exact: true }).click();
      await expect(d).toHaveCount(0);
      await expect(trendRow(page, T.kindPathologist, SARAH_CHEN.userName).locator('td').nth(0)).toHaveText(T.statusUnderReview);
    });

    await test.step("5b. Conclude with CAPA without a note: refused with 'Add a note.', the dialog stays", async () => {
      await trendRow(page, T.kindPathologist, SARAH_CHEN.userName).getByRole('button', { name: T.openCapa, exact: true }).click();
      const d = decisionDialog(page);
      await expect(d.locator('.ps-ms-header')).toHaveText(T.titleCapa);
      await d.getByRole('button', { name: T.openCapa, exact: true }).click();
      await expect(d.locator('.ps-conf-error-text')).toHaveText(T.noteRequired);
      await expect(d).toBeVisible();
      await expect(trendRow(page, T.kindPathologist, SARAH_CHEN.userName).locator('td').nth(0)).toHaveText(T.statusUnderReview);
    });

    await test.step('5c. With a note it saves: the pattern is concluded with a CAPA, decided by Rachel Okafor', async () => {
      const d = decisionDialog(page);
      await d.locator('#qa-trend-note').fill(CAPA_NOTE);
      await d.getByRole('button', { name: T.openCapa, exact: true }).click();
      await expect(d).toHaveCount(0);
      await expect(trendRow(page, T.kindPathologist, SARAH_CHEN.userName), 'gone from the open list').toHaveCount(0);
      await expect(tile(page).locator('.ps-wl-filter-tile__count'), 'one left to decide').toHaveText('1');
      await page.locator('.ps-capa-rec__intro label').filter({ hasText: T.showClosed }).locator('input').check();
      const done = trendRow(page, T.kindPathologist, SARAH_CHEN.userName);
      await expect(done.locator('td').nth(0)).toHaveText(T.statusCapa);
      await expect(done.locator('td').nth(6)).toContainText(RACHEL.name);
      await expect(done.locator('td').nth(6)).toContainText(CAPA_NOTE);
    });

    await test.step('5d. Audit Log: recommended, review started, concluded with a CAPA', async () => {
      await openPage(page, '/audit?search=Sarah Chen', 'System Logs');
      const rows = page.locator('.ps-auditlog-row--audit');
      const recommended = rows.filter({ has: page.locator('.ps-auditlog-cell-event', { hasText: 'QA_TREND_RECOMMENDED' }) });
      await expect(recommended).toHaveCount(1);
      await expect(recommended.locator('.ps-auditlog-cell-detail')).toContainText(`Discordance pattern (pathologist): ${SARAH_CHEN.userName}, 3 major of 20 reviewed (15%)`);
      const decided = rows.filter({ has: page.locator('.ps-auditlog-cell-event', { hasText: 'QA_TREND_DECIDED' }) }).locator('.ps-auditlog-cell-detail');
      await expect(decided).toHaveCount(2);
      await expect(decided.filter({ hasText: `Discordance pattern (pathologist) for ${SARAH_CHEN.userName}: under-review.` })).toHaveCount(1);
      await expect(decided.filter({ hasText: `Discordance pattern (pathologist) for ${SARAH_CHEN.userName}: capa-opened — ${CAPA_NOTE.replace(/\.$/, '')}.` })).toHaveCount(1);
    });

    await test.step('6. As a pathologist (Dr. Sarah Johnson): no Discordance Patterns tile (Quality Assurance is closed to her)', async () => {
      await startSession(page, SARAH_J);
      await page.goto('/quality-assurance?pillar=capa');
      await expect(page.getByRole('heading', { level: 1, name: T.noAccess }), 'the screen is refused').toBeVisible({ timeout: 60_000 });
      await expect(tile(page)).toHaveCount(0);
      // Her session can't read the patterns either (the service refuses).
      const listed = await page.evaluate(async () => {
        const { qaTrendService } = await import(/* @vite-ignore */ String('/src/services/quality/qaTrendServiceLive.ts'));
        const r = await qaTrendService.list();
        return r.ok ? 'listed' : r.error;
      });
      expect(listed).toBe('NOT_PERMITTED');
    });
  });
});
