// e2e/review/ps-60.sso-login.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-60 — "SSO login: real OAuth implementation still needed". The review test
// plan, run against the demo (Vite dev server, localStorage data) as Pete
// Nimmo. Batch 585.
//
//   1. Sign-in page: with no provider set up, Google and Microsoft show "Soon"
//      and do nothing.                                                automated
//   2. Wrong password and unknown e-mail are refused with the same message
//      (no hint which one was wrong).                                 automated
//      A correct sign-in needs the demo password: PS_DEMO_PASSWORD (steps 3–5).
//   3. Deep link while signed out → sign in → back on that page.   needs PS_DEMO_PASSWORD
//      (written, but not yet run: the password is not available in the batch's workspace)
//   4–5. Sign Out on an open case: empty, wrong password and someone else's
//      username are refused; the right one signs it, and the Audit Log shows it.
//                                          needs a person with the demo password (not in this spec;
//                                          the signature check itself is covered by unit tests)
//   6. Configuration → Staff → Pete Nimmo → "Linked sign-in accounts" panel.
//                                                                     automated
//   7. Real Microsoft/Okta sign-in, the signing popup and the server-side
//      token check.                                          needs a person (phase 2e)
//
// Step 3 is skipped (reported as skipped) unless PS_DEMO_PASSWORD is set
// for the run; the password is never stored in the repository.
//
// Texts are the English values of login.* in src/i18n/locales/en.json;
// selectors are the sign-in page's own ids and .ps-login-* classes.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5311 npx playwright test --project=chromium \
//        e2e/review/ps-60.sso-login.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect } from '@playwright/test';
import { signIn, openStaffEditor, signInWithPassword, sessionProfile } from './helpers';

const DEMO_PASSWORD = process.env.PS_DEMO_PASSWORD ?? '';
const PETE_EMAIL = 'demo@pathscribe.ai';

test.describe('PS-60: sign-in page and single sign-on', () => {
  test('Step 1: Google and Microsoft show "Soon", are disabled and do nothing', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#login-email')).toBeVisible({ timeout: 60_000 }); // first page of a cold dev server
    const buttons = page.locator('.ps-login-social');
    await expect(buttons, 'two provider buttons').toHaveCount(2);
    for (const name of ['Google', 'Microsoft']) {
      const b = buttons.filter({ hasText: name });
      await expect(b, `${name} button`).toBeVisible();
      await expect(b, `${name} disabled`).toBeDisabled();
      await expect(b, `${name} says Soon`).toContainText('Soon');
    }
    // A forced click goes nowhere: still on the sign-in page, nothing stored.
    await buttons.first().click({ force: true, timeout: 2000 }).catch(() => {});
    await expect(page).toHaveURL(/\/login/);
    expect(await sessionProfile(page)).toBeNull();
  });

  test('Step 2: a wrong password and an unknown e-mail are refused with the same message', async ({ page }) => {
    const wrongPw = await signInWithPassword(page, PETE_EMAIL, 'Not-The-Right-One-0000');
    expect(wrongPw.outcome, 'wrong password refused').toBe('refused');
    const unknown = await signInWithPassword(page, 'nobody.at.all@example.org', 'Not-The-Right-One-0000');
    expect(unknown.outcome, 'unknown e-mail refused').toBe('refused');
    if (wrongPw.outcome === 'refused' && unknown.outcome === 'refused') {
      expect(wrongPw.error.length, 'a message is shown').toBeGreaterThan(0);
      expect(unknown.error, 'same message for both').toBe(wrongPw.error);
    }
    expect(await sessionProfile(page), 'no session started').toBeNull();
  });

  test('Step 3: a deep link while signed out lands back on that page after sign-in', async ({ page }) => {
    test.skip(!DEMO_PASSWORD, 'PS_DEMO_PASSWORD is not set');
    await page.goto('/worklist');
    await expect(page.locator('#login-email'), 'sent to the sign-in page').toBeVisible({ timeout: 20_000 });
    await page.locator('#login-email').fill(PETE_EMAIL);
    await page.locator('#login-password').fill(DEMO_PASSWORD);
    await page.locator('.ps-login-submit').click();
    const here = page.getByRole('button', { name: 'Sign In Here', exact: true });
    await here.click({ timeout: 4000 }).catch(() => {});
    await expect(page.locator('.ps-login-page')).toHaveCount(0, { timeout: 30_000 });
    await expect(page, 'back on the page asked for').toHaveURL(/\/worklist/);
  });

  test('Step 6: Configuration → Staff → Pete Nimmo shows the "Linked sign-in accounts" panel', async ({ page }) => {
    await signIn(page);
    const editor = await openStaffEditor(page, 'Pete Nimmo');
    await expect(editor.getByText('Linked sign-in accounts').first()).toBeVisible({ timeout: 10_000 });
    // Empty in the demo build: no account to unlink.
    await expect(editor.getByRole('button', { name: /^Unlink/ }), 'nothing to unlink in the demo').toHaveCount(0);
  });
});
