// e2e/review/ps-341.country-signing-rules.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-341 — "Jurisdiction-bound signing authority: country-keyed profiles +
// country-scoped regional roles". The review test plan, run against the demo as
// Pete Nimmo. Batch 587.
//
//   1–2. Configuration → System → Clinical Lookups → Country Signing Rules; pick
//      the United Kingdom: each participation type card has a local title, the
//      three signing flags and the regulatory basis (e.g. RCPath).      automated
//   3. Change a value without a reason and save: refused; add a reason and save:
//      saved, with who / when / why shown.                               automated
//   4–5. Participation Types → Edit: "Inherited from … jurisdiction default";
//      Override default for this facility with a justification; Revert.
//                                                        not in this spec (batch 588)
//   6. Case Team on a US case does not offer BMS / Advanced Practitioner BMS; on UK
//      case MFT26-8802 it does.                           not in this spec (batch 588)
//   7. A hospital admin (not superadmin) sees Country Signing Rules read-only.
//                                          not in this spec (needs a limited demo user)
//
// "United Kingdom" is "England and Wales" (GB_EW) in the country list.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5333 npx playwright test --project=chromium \
//        e2e/review/ps-341.country-signing-rules.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect } from '@playwright/test';
import { signIn, openScreen } from './helpers';

test('Steps 1–3: UK cards show title, flags and regulatory basis; a change needs a reason and is recorded', async ({ page }) => {
  test.setTimeout(180_000);
  await signIn(page);
  await openScreen(page, '/configuration?tab=system&section=country_signing_rules', 'Configuration');
  const country = page.locator('#ps-csr-country');
  await expect(country).toBeVisible({ timeout: 20_000 });
  await country.selectOption('GB_EW');

  const cards = page.locator('.ps-csr-card');
  await expect(cards.first(), 'participation type cards').toBeVisible({ timeout: 15_000 });
  expect(await cards.count(), 'several types').toBeGreaterThan(2);
  const first = cards.first();
  await expect(first.locator('input[id^="ps-csr-title"], .ps-csr-grid input').first(), 'a local title field').toBeVisible();
  for (const flag of ['Can finalise / sign out', 'Requires countersign', 'Can view whole case']) {
    await expect(first.getByText(flag, { exact: true }), flag).toBeVisible();
  }
  const notes = await cards.locator('.ps-csr-note').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
  expect(notes.some((n) => /RCPath/i.test(n)), `a UK card cites RCPath (notes: ${notes.join(' | ').slice(0, 200)})`).toBe(true);

  // Step 3: change a flag, save without a reason → refused; with a reason → saved.
  const select = first.locator('select').first();
  const current = await select.inputValue();
  const other = await select.locator('option').evaluateAll((os, cur) => (os as HTMLOptionElement[]).map((o) => o.value).find((v) => v !== cur) ?? '', current);
  await select.selectOption(other);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('Enter a reason for the change.'), 'refused without a reason').toBeVisible({ timeout: 10_000 });
  await page.locator('#ps-csr-reason').fill('PS-341 review: checking the audit trail');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.locator('.ps-conf-hint--success'), 'saved').toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('PS-341 review: checking the audit trail').first(), 'who / when / why is shown').toBeVisible();
  await expect(page.getByText('Pete Nimmo').first()).toBeVisible();

  // Put it back (another reasoned change), so the demo's stored rules end as they started.
  await first.locator('select').first().selectOption(current);
  await page.locator('#ps-csr-reason').fill('PS-341 review: restoring');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.locator('.ps-conf-hint--success')).toBeVisible({ timeout: 15_000 });
});
