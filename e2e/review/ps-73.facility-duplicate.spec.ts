// e2e/review/ps-73.facility-duplicate.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-73 — "Extend Duplicate-and-edit + uniqueness validation pattern to remaining
// config dictionaries". The review test plan, run against the demo as Pete
// Nimmo. Batch 587. This spec covers the Facility Dictionary steps only.
//
//   1. Facility Dictionary: Duplicate a facility. The form opens as an add, named
//      "<name> (Copy)" (the ticket says "Copy of …"; the app's copy-name text in
//      English is "{{name}} (Copy)"), assigning authority, CLIA/ISO, director
//      blank; the Locations tab is not shown.                            automated
//   2. An assigning authority already used by another facility is refused inline;
//      a unique one adds a NEW facility and the source is unchanged.     automated
//   3. Editing an existing facility and saving without changing its assigning
//      authority gives no collision error.                               automated
//   4–5. Stain Dictionary duplicate; Crosswalk collision.   not in this spec (batch 588)
//   6–7. Duplicate offered / not offered on the listed dictionaries.
//                                          covered by duplicatePolicy.guard.test.ts; screens not in this spec
//   8–9. Synoptic protocol duplicate; French / Korean copy names.   not in this spec (batch 588)
//
// Texts: facilityEditorModal.* and common.* in en.json.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5334 npx playwright test --project=chromium \
//        e2e/review/ps-73.facility-duplicate.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';
import { signIn, openScreen } from './helpers';

const SOURCE = 'Fenwick General Hospital';
const COPY = `${SOURCE} (Copy)`;
const editor = (page: Page) => page.locator('.ps-overlay--facility-editor');
const field = (page: Page, label: string) => editor(page).getByLabel(label, { exact: true });

async function openList(page: Page) {
  await openScreen(page, '/configuration?tab=system&section=clients', 'Facility Configuration');
  await expect(page.locator('.fct-table')).toBeVisible({ timeout: 15_000 });
}
const row = (page: Page, name: string) => page.locator('.fct-table tbody tr').filter({ hasText: name });
async function search(page: Page, text: string) { await page.locator('.fct-search-input').fill(text); }

test('Steps 1–3: Duplicate a facility; a used assigning authority is refused; a unique one adds a new facility; editing is not a collision', async ({ page }) => {
  test.setTimeout(240_000);
  await signIn(page);
  await openList(page);

  // The source's assigning authority.
  await search(page, SOURCE);
  await row(page, SOURCE).first().locator('.fct-action-btn--edit').click();
  await expect(editor(page)).toBeVisible();
  const usedAuthority = await field(page, 'Assigning Authority *').inputValue();
  expect(usedAuthority.length, 'the source has an assigning authority').toBeGreaterThan(0);

  // Step 3 (first, while the editor is open): save with no change → no collision error, window closes.
  await editor(page).getByRole('button', { name: 'Save Changes', exact: true }).click();
  await expect(editor(page), 'saved without a collision error').toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByText(/is already used by/)).toHaveCount(0);

  // Step 1: Duplicate.
  await search(page, SOURCE);
  await row(page, SOURCE).first().locator('.fct-action-btn--duplicate').click();
  await expect(editor(page)).toBeVisible();
  await expect(field(page, 'Facility Name *'), 'named as a copy').toHaveValue(COPY);
  await expect(field(page, 'Assigning Authority *'), 'assigning authority blank').toHaveValue('');
  await expect(editor(page).locator('.ps-fem-tab').filter({ hasText: 'Locations' }), 'no Locations tab on a new copy').toHaveCount(0);

  // Step 2: the used authority is refused inline; a unique one adds a new facility.
  await field(page, 'Assigning Authority *').fill(usedAuthority);
  await editor(page).getByRole('button', { name: /^(Save Changes|Add Facility|Save)$/ }).click();
  await expect(editor(page).getByText(new RegExp(`Assigning Authority "${usedAuthority}" is already used by`)), 'inline collision error').toBeVisible({ timeout: 10_000 });
  await field(page, 'Assigning Authority *').fill('REVIEW73');
  await editor(page).getByLabel(/^Email/).first().fill('review73@example.org'); // a copy starts with the contact fields blank, and email is required
  await editor(page).getByRole('button', { name: /^(Save Changes|Add Facility|Save)$/ }).click();
  await expect(editor(page), 'saved as a new facility').toHaveCount(0, { timeout: 15_000 });

  await search(page, SOURCE);
  await expect(row(page, COPY), 'the copy is listed').toHaveCount(1, { timeout: 10_000 });
  await expect(row(page, SOURCE).filter({ hasNotText: '(Copy)' }), 'the source is still there, once').toHaveCount(1);
  await row(page, SOURCE).filter({ hasNotText: '(Copy)' }).first().locator('.fct-action-btn--edit').click();
  await expect(field(page, 'Assigning Authority *'), 'the source is unchanged').toHaveValue(usedAuthority);
});
