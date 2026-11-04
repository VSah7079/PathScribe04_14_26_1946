// e2e/review/ps-283.restricted-printing-flag.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-283 — "Document Watermarking, Revision Indicators & Secure Identification".
// The review test plan, run against the demo as Pete Nimmo. Batch 586.
//
//   1–3. Print an unsigned case: the diagonal "PRELIMINARY — SUBJECT TO CHANGE"
//      watermark on every page, the footer barcode and "Document {accession} ·
//      record version {n}", the revision banner on an amended case.
//                  needs a person: page layout of a printed / PDF page, a real
//                  barcode scan; the PDF renderer (render_report) is not
//                  deployed yet (dev note, Oct 16)
//   4. The footer barcode in Search opens the same case.      not in this spec
//   5. Configuration → System → Flags: "Confidential — Restricted Printing"
//      (f37) has "Restricts printing" on.                     automated
//      (apply it to a case: not in this spec)
//   6. A user without the restricted-case permission cannot print that case; a
//      pathologist can.                                       not in this spec
//   7. Print Queue hold / cancel / redirect / retry are refused without the
//      matching permissions.     covered by the capability unit tests and the
//                                PS-279 spec (as Pete); a limited user is not in this spec
//
// Selectors: the flags table row and the switch labelled "Restricts printing"
// (flagConfigPage.modal.restrictsPrintingLabel in en.json).
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5324 npx playwright test --project=chromium \
//        e2e/review/ps-283.restricted-printing-flag.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect } from '@playwright/test';
import { signIn, openScreen } from './helpers';

const FLAG = 'Confidential — Restricted Printing';   // the demo flag f37
const RESTRICTS = 'Restricts printing';              // flagConfigPage.modal.restrictsPrintingLabel

test.describe('PS-283: restricted-printing flag', () => {
  test('Step 5: "Confidential — Restricted Printing" restricts printing; an ordinary flag does not', async ({ page }) => {
    test.setTimeout(150_000);
    await signIn(page);
    await openScreen(page, '/configuration?tab=system&section=flags', 'Configuration');
    await page.getByPlaceholder('Search flags...').fill(FLAG);   // flagConfigPage.searchPlaceholder
    const row = page.locator('tr').filter({ hasText: FLAG }).first();
    await expect(row, 'the flag is listed').toBeVisible({ timeout: 20_000 });
    await row.getByRole('button', { name: 'Edit', exact: true }).click();
    const toggle = page.getByRole('switch', { name: RESTRICTS });
    await expect(toggle, 'Restricts printing is on').toHaveAttribute('aria-checked', 'true', { timeout: 10_000 });

    // Contrast: a flag that is not about printing leaves it off.
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /Cancel|Close/ }).first().click({ timeout: 2000 }).catch(() => {});
    await page.getByPlaceholder('Search flags...').fill('Second Opinion Requested');
    const other = page.locator('tr').filter({ hasText: 'Second Opinion Requested' }).first();
    await expect(other).toBeVisible({ timeout: 10_000 });
    await other.getByRole('button', { name: 'Edit', exact: true }).click();
    const otherToggle = page.getByRole('switch', { name: RESTRICTS });
    await expect(otherToggle).toHaveAttribute('aria-checked', 'false', { timeout: 10_000 });
  });
});
