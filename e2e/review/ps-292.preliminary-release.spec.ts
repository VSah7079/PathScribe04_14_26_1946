// e2e/review/ps-292.preliminary-release.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-292 — "Cross-specialty dynamic report template engine (Preliminary / PAD /
// FAD / Final)". The review test plan, run against the demo as Pete Nimmo.
// Batch 585.
//
// Case used: O26-0001 (the demo's one native, not-yet-final surgical case; the other demo cases are LIS
// "Assist" cases, which never show the button). S26-4623 is an Assist case too, so the "closed case has
// no button" check passes for that reason as well as for being closed.
//   1. A case that is not yet final shows "Release as Preliminary"; a closed
//      case (S26-4623) does not.                                    automated
//   2. Click it: a clear result, and the case does not become final. automated
//   3. Configuration → System → Administration & Compliance → Delivery
//      Configuration Rules → + Add Rule (report type + a channel), save.  automated
//   4. Test Delivery Resolution: pick matching values, Resolve: shows the
//      resolved action and the matched rule.                        automated
//   5. Autopsy A26-4661: sign the PAD; the Interface Log → Outbound Dispatches
//      shows a preliminary result.            not in this spec (needs the autopsy sign-out flow;
//                                              carried to the next batch)
//   6. Whether the Autopsy PAD/FAD/Preliminary template part is still open.
//                                                  needs the product owner (scope decision)
//
// Selectors: the delivery rules screen's own .ps-rr-* classes, the modal's
// aria-labelled selects (deliveryRulesSection.* in en.json).
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5316 npx playwright test --project=chromium \
//        e2e/review/ps-292.preliminary-release.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';
import { signIn, openScreen } from './helpers';

/** Opens a case from the header search (the orchestrator case is not on the Worklist). */
async function openFromSearch(page: Page, accession: string) {
  await page.goto('/');
  await page.locator('.ps-scan-prompt-skip').click({ timeout: 1500 }).catch(() => {});
  const bar = page.getByLabel('Search or scan case number', { exact: true });
  await bar.fill(accession);
  await bar.press('Enter');
  // One exact match opens the case straight away; several matches list in a window first.
  const row = page.locator('.ps-casebar-modal .ps-casebar-dropdown__row').filter({ hasText: accession }).first();
  await row.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.waitForTimeout(1500);
}

const T = {
  release: 'Release as Preliminary',            // bottomActionBar.release.preliminaryLabel
  addRule: '+ Add Rule',                         // deliveryRulesSection.addRuleButton
  saveRule: 'Add Rule',                          // deliveryRulesSection.modal.addRuleButton
  resolve: 'Resolve',                            // deliveryRulesSection.testPanel.resolveButton
  reportType: 'Report Type',                     // deliveryRulesSection.fields.reportType (aria-label)
};
const releaseButton = (page: Page) => page.getByRole('button', { name: new RegExp(T.release) });

test.describe('PS-292: preliminary release and delivery rules', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('Step 1: the button shows on an open case and not on a closed one', async ({ page }) => {
    await openFromSearch(page, 'O26-0001');
    await expect(releaseButton(page), 'open case shows Release as Preliminary').toBeVisible({ timeout: 15_000 });
    await openFromSearch(page, 'S26-4623');
    await expect(releaseButton(page), 'closed case does not').toHaveCount(0);
  });

  test('Step 2: Release as Preliminary gives a result and the case is not finalised', async ({ page }) => {
    await openFromSearch(page, 'O26-0001');
    const url = page.url();
    await releaseButton(page).click();
    await page.waitForTimeout(2000);
    // A message appears (a toast, or "nothing to release yet"), and the button is still there: not final.
    await expect(page.locator('[role="status"], [role="alert"], .ps-toast').filter({ hasText: /./ }).first(), 'a clear result is shown').toBeVisible({ timeout: 10_000 });
    expect(page.url(), 'still on the case').toBe(url);
    await expect(releaseButton(page), 'the case did not become final').toBeVisible();
  });

  test('Steps 3–4: add a delivery rule, then Resolve shows the action and the matched rule', async ({ page }) => {
    await openScreen(page, '/configuration?tab=system&section=delivery_rules', 'Configuration');
    await expect(page.getByText('Delivery Configuration Rules').first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: T.addRule, exact: true }).click();
    const modal = page.locator('.ps-modal-dark');
    await expect(modal).toBeVisible();
    // A report type (the first real option) and a note so the rule can be found afterwards.
    const reportType = modal.getByLabel(T.reportType, { exact: true });
    const typeValue = await reportType.locator('option').nth(1).getAttribute('value');
    await reportType.selectOption(typeValue ?? { index: 1 });
    // At least one channel on: the first channel select, first non-"off" option.
    const channel = modal.locator('select[id^="dr-channel-"]').first();
    const onValue = await channel.locator('option:not([value="off"])').first().getAttribute('value');
    await channel.selectOption(onValue ?? { index: 1 });
    await modal.getByLabel('Note', { exact: true }).fill('PS-292 review rule'); // deliveryRulesSection.modal.noteLabel
    await modal.getByRole('button', { name: T.saveRule, exact: true }).click();
    await expect(modal, 'the window closes after saving').toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('table tbody tr').filter({ hasText: 'PS-292 review rule' }), 'the new rule is listed').toHaveCount(1, { timeout: 10_000 });

    // Test Delivery Resolution with the same report type.
    const panel = page.locator('.ps-rr-test');
    await expect(panel).toBeVisible();
    await panel.getByLabel(T.reportType, { exact: true }).selectOption(typeValue ?? { index: 1 });
    await panel.getByRole('button', { name: T.resolve, exact: true }).click();
    await expect(panel.locator('.ps-rr-test-result-value'), 'a resolved action is shown').toBeVisible({ timeout: 10_000 });
    await expect(panel.locator('.ps-rr-test-result-matched'), 'the matched rule is named').toBeVisible();
  });
});
