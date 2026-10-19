// e2e/review/ps-89.code-import.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-89 — "Generic Code Engine: shared, effective-dated code lifecycle model +
// CSV mapping wizard". The review test plan, run against the demo as Pete
// Nimmo. Batch 587.
//
//   1. A small CSV: a code column, an effective-date column, 3 rows, one with a
//      bad date.                                       the test writes it itself
//   2. Configuration → System → Code Import (Bulk): choose the CSV, coding standard
//      CPT, a batch note.                                                 automated
//   3. The suggested column matches (billing code, CPT and effective date are
//      required); Check file lists the bad-date row with its reason and Import
//      stays disabled.                                                    automated
//   4. Skip the refused rows and Import: one job pending approval appears in
//      Import history.                                                    automated
//   5–6. Pending Billing Rule Approvals: locked for the uploader; a second person
//      (Michelle Nimmo) approves; Roll back needs a reason.
//                                                        not in this spec (batch 588)
//   7. Audit Log entries for upload, approve, rollback.  not in this spec (batch 588)
//
// Texts: codeImportSection.* in en.json.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5335 npx playwright test --project=chromium \
//        e2e/review/ps-89.code-import.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { signIn, openScreen } from './helpers';

test('Steps 1–4: a CSV with one bad date is checked, the bad row explained, and the rest imported as one pending job', async ({ page }) => {
  test.setTimeout(180_000);
  const dir = mkdtempSync(join(tmpdir(), 'ps89-'));
  const file = join(dir, 'review-codes.csv');
  writeFileSync(file, ['Code,Description,Effective Date', '88381,Review code A,2027-01-01', '88382,Review code B,2027-01-01', '88383,Review code C,not-a-date', ''].join('\n'));
  try {
    await signIn(page);
    await openScreen(page, '/configuration?tab=system&section=code_import', 'Configuration');
    await page.locator('input[type="file"]').setInputFiles(file);
    await expect(page.getByText('review-codes.csv: 3 rows'), 'the file is read').toBeVisible({ timeout: 15_000 });
    await page.getByLabel('Coding standard', { exact: true }).selectOption('CPT');
    await page.getByLabel('Batch note', { exact: true }).fill('PS-89 review batch');
    // The file has no Level column, so say which level every row is.
    await page.getByLabel('Level when not in file', { exact: true }).selectOption({ label: 'Specimen — primary diagnostic work' });

    const check = page.getByRole('button', { name: 'Check file', exact: true });
    await expect(check, 'billing code, CPT and effective date are matched from the column names').toBeEnabled({ timeout: 10_000 });
    await check.click();

    await expect(page.getByText('1 row can’t be imported:'), 'the bad row is listed').toBeVisible({ timeout: 15_000 });
    await expect(page.locator('table').filter({ hasText: '88383' }).first(), 'with its billing code and a reason').toBeVisible();
    const importButton = page.getByRole('button', { name: /^Import \d+ codes? for approval$/ });
    await expect(importButton, 'Import stays disabled until the refused row is skipped').toBeDisabled();

    await page.getByLabel('Skip these rows and import the rest').check();
    await expect(importButton).toBeEnabled();
    await importButton.click();
    await expect(page.getByText(/Import .+ saved: 2 codes are waiting for approval\./), 'saved as one job').toBeVisible({ timeout: 15_000 });
    const history = page.locator('tr').filter({ hasText: 'review-codes.csv' });
    await expect(history, 'one job in Import history').toHaveCount(1);
    await expect(history).toContainText('Pending approval');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
