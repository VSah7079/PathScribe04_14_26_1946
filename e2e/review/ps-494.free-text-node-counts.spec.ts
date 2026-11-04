// e2e/review/ps-494.free-text-node-counts.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-494: "Node counts entered as free text in CAP templates are checked".
// Review test plan, against the demo (Vite dev server, localStorage data) as
// Pete Nimmo:
//   1. Sign in as Pete; open a breast invasive case (S26-4408, Generic Template
//      — Breast Invasive, from the worklist) and go to the lymph node
//      questions (the Regional Nodes section).                      automated
//   2. Type "abc" in nodes examined (Total Number Examined): an inline hint
//      appears and Save draft (💾 Save Draft) and sign-out (🔒 Finalize) are
//      stopped, each with its own message.                          automated
//   3. Enter "cannot be determined", "at least 3" or 12: each is accepted (no
//      hint; Save Draft → "Draft saved"); at sign-out the count check passes
//      and Finalize stops only at the next check (the demo case still has
//      required questions unanswered).                              automated
//   4. Enter positive 5 with examined 3: blocked as "can't exceed" (inline and
//      at Save Draft and Finalize); on Breast, total examined 4 below positive A + B + C
//      (2 + 2 + 1 = 5) is blocked (inline, at Save Draft and at Finalize). automated
//   5. Open the Synoptic Editor (Configuration → Synoptic Library → Active
//      Protocols → Generic Template — Breast Invasive → New Version, as a
//      published protocol is edited) on a text question:
//      "Node count (free text)" is on for Total Number Examined with its
//      "Can't be below the sum of" A, B, C, and can be switched on for
//      Regional Node Comment with its "Can't exceed" limit.          automated
//   6. Note: server-side check (India team) and pathologist review of accepted
//      phrases are tracked on PS-531.     needs a person (outside this review)
// Expected: Free-text node counts are checked like numeric ones, and allowed
// CAP phrases are accepted.
// Demo data: S26-4408's breast synoptic starts with Category A = 2 and Total
// Number Examined = 22 (Categories B and C and the subset empty).
// Selectors: English texts from src/i18n/locales/en.json (synopticChecks.*,
// useOrchestratorDraft.toast.*, synopticEditor.field.count.*) and the
// screens' own .ps-syn-* / .ps-syned-* / .ps-save-toast-* classes.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5303 npx playwright test --project=chromium \
//        e2e/review/ps-494.free-text-node-counts.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';
import { signIn } from './helpers';

// en.json texts the screens render.
const T = {
  section: 'Regional Nodes',                      // the template's section title (data)
  total: 'Total Number Examined',                 // template field labels (data, breast_invasive.json)
  catA: 'Number Positive (Category A)',
  catB: 'Number Positive (Category B)',
  catC: 'Number Positive (Category C)',
  comment: 'Regional Node Comment',
  saveDraft: '💾 Save Draft',                     // the report page's footer button
  finalize: '🔒 Finalize',                        // sign-out
  draftSaved: 'Draft saved',                      // useOrchestratorDraft.toast.draftSaved
  // synopticChecks.notCountHint / fieldNotCount / saveBlocked / signOutBlocked
  notCountHint: (v: string) => `Enter a whole number, “cannot be determined” or “at least N” (${v} isn’t one).`,
  fieldNotCount: (field: string, v: string) => `${field} must be a whole number of 0 or more, “cannot be determined” or “at least N” (${v} entered).`,
  saveBlocked: (problem: string) => `The draft wasn’t saved. ${problem}`,
  signOutBlocked: (problem: string) => `Sign-out stopped. ${problem}`,
  // synopticChecks.fieldExceedsHint / fieldExceeds / belowSumHint / fieldBelowSum
  exceedsHint: (v: number, limit: number) => `${v} is more than the ${limit} it can’t exceed.`,
  fieldExceeds: (field: string, v: number, limit: string, limitValue: number) => `${field} (${v}) can’t exceed ${limit} (${limitValue}).`,
  belowSumHint: (v: number, sum: number) => `${v} is less than the counts it covers (${sum}).`,
  fieldBelowSum: (field: string, v: number, parts: string, sum: number) => `${field} (${v}) can’t be less than ${parts} (${sum}).`,
  // The next sign-out check after the counts, on this demo case (its other required questions are unanswered).
  requiredIncomplete: '2 specimens need attention before finalizing — starting with Specimen A: This specimen\'s synoptic template has required fields that are still incomplete.',
  // Synoptic Editor (synopticEditor.field.count.*, synopticEditor.common.expand)
  libraryTab: 'Synoptic Library',
  template: 'Generic Template — Breast Invasive',
  newVersion: /New Version$/,                     // activeProtocolsSection.newVersionButton (after "🔁 ")
  nodeCount: 'Node count (free text)',
  notMoreThan: 'Can’t exceed',
  atLeastSumOf: 'Can’t be below the sum of',
  noLimit: 'No limit',
  nodeCountHint: 'Accepts a whole number of 0 or more, “cannot be determined” or “at least N”. Anything else stops save and sign-out.',
  expand: 'Expand',
};
const CASE = 'S26-4408';

const field = (page: Page, label: string) => page.locator('.ps-syn-panel').getByLabel(label, { exact: true });
const fieldRow = (page: Page, label: string) => page.locator('.ps-syn-panel .ps-syn-field-row').filter({ has: page.getByLabel(label, { exact: true }) });
const rowAlerts = (page: Page, label: string) => fieldRow(page, label).locator('[role="alert"]');
// The toast element stays in the page while hidden; the shown one carries ps-save-toast--visible.
const toast = (page: Page) => page.locator('.ps-save-toast--visible .ps-save-toast-text');

/** Snapshot of browser storage after sign-in, put back at the end so the saved drafts don't leak into other specs. */
const snapshotStorage = (page: Page) => page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
const restoreStorage = (page: Page, snap: string) => page.evaluate((s) => {
  localStorage.clear();
  for (const [k, v] of JSON.parse(s) as Array<[string, string]>) localStorage.setItem(k, v);
}, snap);

/** No outside network: pages outside this server, and the dev server's AI and terminology pass-throughs to the internet, are refused. */
async function blockOutsideNetwork(page: Page) {
  await page.route(url => !['localhost', '127.0.0.1'].includes(url.hostname) || /^\/api\/(ai|terminology)\//.test(url.pathname), route => route.abort());
}

/** Worklist → S26-4408 → the breast synoptic's Regional Nodes section. */
async function openNodeQuestions(page: Page) {
  await page.goto('/worklist');
  await page.getByText(CASE, { exact: true }).first().click({ timeout: 120_000 }); // a cold dev server compiles the worklist first
  await expect(page.locator('.ps-syn-specimen-row').first(), 'the case report is open').toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.ps-syn-panel'), 'the breast invasive synoptic').toContainText(T.template);
  await showNodeSection(page);
}

/** The breast synoptic (picked in the left Specimens & Reports list) at its Regional Nodes section. Finalize moves
 *  the page to the first thing still to do (Specimen A's microscopic description on this case), so this is
 *  used again after each Finalize. */
async function showNodeSection(page: Page) {
  await page.locator('.ps-syn-instance-row').filter({ hasText: T.template }).first().click();
  await expect(page.locator('.ps-syn-instance-row.active')).toContainText(T.template);
  await page.locator('.ps-syn-panel button.ps-syn-section-tab').filter({ hasText: new RegExp(`^${T.section}`) }).click();
  await expect(field(page, T.total), 'the nodes-examined question').toBeVisible();
}

/** Closes the current toast so the next one is known to be new. */
async function dismissToast(page: Page) {
  await page.locator('.ps-save-toast--visible .ps-save-toast-close').click();
  await expect(toast(page)).toHaveCount(0);
}

/** Clicks a footer action and returns once its toast shows. */
async function act(page: Page, button: string) {
  await expect(toast(page), 'no toast left over').toHaveCount(0);
  await page.getByRole('button', { name: button, exact: true }).click();
  await expect(toast(page)).toHaveCount(1, { timeout: 30_000 });
}

test.describe('PS-494 Free-text node counts are checked', () => {
  let snap = '';
  test.beforeEach(async ({ page }) => {
    await blockOutsideNetwork(page);
    await signIn(page);
    snap = await snapshotStorage(page);
  });
  test.afterEach(async ({ page }) => { await restoreStorage(page, snap).catch(() => {}); });

  test('Steps 1–4: "abc" is refused, CAP phrases are accepted, positive > examined and total < A + B + C are blocked', async ({ page }) => {
    test.setTimeout(480_000);

    await test.step('1. Sign in as Pete; open a breast invasive case and go to the lymph node questions', async () => {
      await openNodeQuestions(page);
      await expect(field(page, T.total), 'demo: 22 examined').toHaveValue('22');
      await expect(field(page, T.catA), 'demo: 2 positive (A)').toHaveValue('2');
    });

    await test.step('2. "abc" in nodes examined: an inline hint, and Save draft and sign-out are stopped', async () => {
      await field(page, T.total).fill('abc');
      await expect(rowAlerts(page, T.total), 'the inline hint').toHaveText(T.notCountHint('abc'));
      await expect(field(page, T.total)).toHaveAttribute('aria-invalid', 'true');
      await act(page, T.saveDraft);
      await expect(toast(page), 'Save draft stopped').toHaveText(T.saveBlocked(T.fieldNotCount(T.total, 'abc')));
      await dismissToast(page);
      await act(page, T.finalize);
      await expect(toast(page), 'sign-out stopped').toHaveText(T.signOutBlocked(T.fieldNotCount(T.total, 'abc')));
      await dismissToast(page);
    });

    await test.step('3. "cannot be determined", "at least 3" and 12 are each accepted', async () => {
      for (const value of ['cannot be determined', 'at least 3', '12']) {
        await field(page, T.total).fill(value);
        await expect(rowAlerts(page, T.total), `no hint for "${value}"`).toHaveCount(0);
        await expect(field(page, T.total)).not.toHaveAttribute('aria-invalid', 'true');
        await act(page, T.saveDraft);
        await expect(toast(page), `"${value}" saves`).toHaveText(T.draftSaved);
        await dismissToast(page);
        // Sign-out: the count check passes; Finalize stops at the next check (unanswered required questions).
        await act(page, T.finalize);
        await expect(toast(page), `"${value}" passes the sign-out count check`).toHaveText(T.requiredIncomplete);
        await dismissToast(page);
        await showNodeSection(page);
      }
    });

    await test.step('4a. Positive 5 with examined 3: blocked as "can\'t exceed"', async () => {
      await field(page, T.total).fill('3');
      await field(page, T.catA).fill('5');
      await expect(rowAlerts(page, T.catA), 'Category A').toHaveText(T.exceedsHint(5, 3));
      await expect(rowAlerts(page, T.total), 'and the total').toHaveText(T.belowSumHint(3, 5));
      await act(page, T.saveDraft);
      await expect(toast(page)).toHaveText(T.saveBlocked(T.fieldExceeds(T.catA, 5, T.total, 3)));
      await dismissToast(page);
      await act(page, T.finalize);
      await expect(toast(page)).toHaveText(T.signOutBlocked(T.fieldExceeds(T.catA, 5, T.total, 3)));
      await dismissToast(page);
    });

    await test.step('4b. Breast: total examined 4 below positive A + B + C (2 + 2 + 1) is blocked', async () => {
      await field(page, T.catA).fill('2');
      await field(page, T.catB).fill('2');
      await field(page, T.catC).fill('1');
      await field(page, T.total).fill('4');
      for (const label of [T.catA, T.catB, T.catC]) await expect(rowAlerts(page, label), `${label}: within the total`).toHaveCount(0);
      await expect(rowAlerts(page, T.total), 'the total').toHaveText(T.belowSumHint(4, 5));
      const problem = T.fieldBelowSum(T.total, 4, `${T.catA} + ${T.catB} + ${T.catC}`, 5);
      await act(page, T.saveDraft);
      await expect(toast(page)).toHaveText(T.saveBlocked(problem));
      await dismissToast(page);
      await act(page, T.finalize);
      await expect(toast(page)).toHaveText(T.signOutBlocked(problem));
      await dismissToast(page);
      // 5 examined covers them: accepted.
      await field(page, T.total).fill('5');
      await expect(rowAlerts(page, T.total)).toHaveCount(0);
      await act(page, T.saveDraft);
      await expect(toast(page)).toHaveText(T.draftSaved);
      await dismissToast(page);
    });
  });

  test('Step 5: the Synoptic Editor offers "Node count (free text)" on a text question, with its limits', async ({ page }) => {
    test.setTimeout(240_000);
    const editorField = (label: string) => page.locator('.ps-mb-8').filter({ has: page.locator('.ps-syned-field-header') })
      .filter({ has: page.locator(`input.ps-syned-field-label-input[value="${label}"]`) });

    await test.step('5a. Configuration → Synoptic Library → Active Protocols → Generic Template — Breast Invasive → New Version (the editor)', async () => {
      await page.goto('/configuration');
      await page.locator('.ps-cfgpage-tab-btn').filter({ hasText: T.libraryTab }).click({ timeout: 60_000 });
      // A published protocol is edited as a new version (protocolLifecycle: no Open Editor once published).
      const card = page.locator('.ps-activeprotocols-card').filter({ has: page.getByText(T.template, { exact: true }) });
      await card.locator('.ps-activeprotocols-row').click({ timeout: 30_000 });
      await card.getByRole('button', { name: T.newVersion }).click();
      await expect(page).toHaveURL(/\/template-editor\/breast_invasive\?mode=newVersion/, { timeout: 30_000 });
      await expect(editorField(T.total), 'the Total Number Examined question').toHaveCount(1, { timeout: 60_000 });
    });

    await test.step('5b. Total Number Examined is a node count that can\'t be below A + B + C', async () => {
      const f = editorField(T.total);
      await f.locator('.ps-syned-field-header').getByTitle(T.expand, { exact: true }).click();
      const toggle = f.getByLabel(T.nodeCount, { exact: true });
      await expect(toggle).toBeChecked();
      await expect(f.getByLabel(T.notMoreThan, { exact: true }), 'no "can\'t exceed" limit').toHaveValue('');
      const sum = f.getByRole('group', { name: T.atLeastSumOf, exact: true });
      for (const label of [T.catA, T.catB, T.catC]) await expect(sum.getByLabel(label, { exact: true }), `${label} counted`).toBeChecked();
      await expect(f.getByText(T.nodeCountHint, { exact: true })).toBeVisible();
    });

    await test.step('5c. Regional Node Comment (a text question): switch "Node count (free text)" on and set its limit', async () => {
      const f = editorField(T.comment);
      await f.locator('.ps-syned-field-header').getByTitle(T.expand, { exact: true }).click();
      const toggle = f.getByLabel(T.nodeCount, { exact: true });
      await expect(toggle).not.toBeChecked();
      await expect(f.getByLabel(T.notMoreThan, { exact: true }), 'no limits while off').toHaveCount(0);
      await toggle.click();
      await expect(toggle).toBeChecked();
      const limit = f.getByLabel(T.notMoreThan, { exact: true });
      await expect(limit).toHaveValue('');
      await expect(limit.locator('option').first()).toHaveText(T.noLimit);
      await limit.selectOption({ label: T.total });
      await expect(limit.locator('option:checked')).toHaveText(T.total);
      await expect(f.getByRole('group', { name: T.atLeastSumOf, exact: true })).toBeVisible();
      await expect(f.getByText(T.nodeCountHint, { exact: true })).toBeVisible();
      // Off again drops the limit.
      await toggle.click();
      await expect(toggle).not.toBeChecked();
      await expect(f.getByLabel(T.notMoreThan, { exact: true })).toHaveCount(0);
    });
  });
});
