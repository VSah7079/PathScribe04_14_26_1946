// e2e/review/helpers.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 581 (Pete, Oct 15, 2026: "Rather than manual testing for the review,
// can I use Playwright?"): the review tests. Each spec in this folder follows
// one Jira ticket's "review test plan steps" against the demo, so a pass is
// that review done (the steps a person must still do are named in the spec's
// header and on the ticket). Shared sign-in and screen helpers, the same as
// the accessibility specs use.
// ─────────────────────────────────────────────────────────────────────────────
import { expect, type Locator, type Page } from '@playwright/test';

export const DEMO_USERS = {
  pete: { id: 'PATH-001', name: 'Pete Nimmo', role: 'superadmin' },
} as const;

/** Signs in as a demo user by setting the session, as the accessibility specs do; clears demo data first. */
export async function signIn(page: Page, user: { id: string; name: string; role: string } = DEMO_USERS.pete) {
  await page.goto('/');
  await page.evaluate((u) => {
    localStorage.clear();
    localStorage.setItem('pathscribe-user', JSON.stringify(u));
    localStorage.setItem('pathscribe_scan_station_prompted', '1');
  }, user);
}

/** Starts a session as a demo user the same way, but keeps the demo data already in the browser (a switch mid-flow). */
export async function startSession(page: Page, user: { id: string; name: string; role: string } = DEMO_USERS.pete) {
  await page.goto('/login');
  await page.evaluate((u) => {
    localStorage.setItem('pathscribe-user', JSON.stringify(u));
    localStorage.setItem('pathscribe_scan_station_prompted', '1');
  }, user);
}

/** Opens a screen and waits for its heading; skips the scan-station prompt if it shows. */
export async function openScreen(page: Page, path: string, heading: string | RegExp) {
  await page.goto(path);
  await expect(page.locator('h1, h2').filter({ hasText: heading }).first()).toBeVisible({ timeout: 20_000 });
  await page.locator('.ps-scan-prompt-skip').click({ timeout: 1000 }).catch(() => {});
  await page.waitForTimeout(500);
}

/** Opens a case report from the worklist by its accession. */
export async function openCase(page: Page, accession: string) {
  await page.goto('/worklist');
  await page.getByText(accession, { exact: true }).first().click({ timeout: 20_000 });
  await expect(page.locator('.ps-syn-specimen-row').first()).toBeVisible({ timeout: 25_000 });
  await page.waitForTimeout(800);
}

// ─── Sign-in page and staff passwords (PS-363 to PS-368) ─────────────────────
// Texts are the English values of login.* and staffTab.signInPassword.* in
// src/i18n/locales/en.json; selectors are the app's own ids and .ps-* classes
// (pages/LoginPage.tsx, components/Config/Staff/StaffSignInPassword.tsx).

/** The browser-storage keys the demo keeps staff data under (services/mockStorage.ts prefix + the service's key). */
export const DEMO_KEYS = {
  session: 'pathscribe-user',
  staffPasswords: 'pathscribe_mock_staff_passwords',
  users: 'pathscribe_mock_pathscribe_users',
  roles: 'pathscribe_mock_pathscribe_roles',
} as const;

export type PasswordSignInOutcome =
  | { outcome: 'signedIn' }
  | { outcome: 'changeRequired' }
  | { outcome: 'refused'; error: string };

/**
 * Signs in through the real sign-in page (/login) with an email and password.
 * Resolves once the app has either started the session, shown the
 * change-password form ("Your administrator set a temporary password…"), or
 * shown an error. A "signed in elsewhere" prompt is answered with Sign In Here.
 */
export async function signInWithPassword(page: Page, email: string, password: string): Promise<PasswordSignInOutcome> {
  await page.goto('/login');
  await expect(page.locator('#login-email')).toBeVisible({ timeout: 20_000 });
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.locator('.ps-login-submit').click();
  const conflict = page.getByRole('button', { name: 'Sign In Here', exact: true });
  const changeIntro = page.locator('.ps-login-change-intro');
  const error = page.locator('.ps-login-error[role="alert"]');
  const signedIn = page.locator('.ps-login-page');
  await expect.poll(async () => (
    await conflict.count() ? 'conflict'
      : await changeIntro.count() ? 'change'
        : await error.count() ? 'error'
          : await signedIn.count() === 0 ? 'in' : 'waiting'
  ), { timeout: 30_000, message: 'the sign-in page answers' }).not.toBe('waiting');
  if (await conflict.count()) {
    await conflict.click();
    await expect(signedIn, 'signed in after Sign In Here').toHaveCount(0, { timeout: 20_000 });
  }
  if (await changeIntro.count()) return { outcome: 'changeRequired' };
  if (await error.count()) return { outcome: 'refused', error: (await error.textContent())?.trim() ?? '' };
  await page.locator('.ps-scan-prompt-skip').click({ timeout: 1500 }).catch(() => {});
  return { outcome: 'signedIn' };
}

/** The signed-in profile the app stored (services/auth/sessionProfile.ts), or null. */
export async function sessionProfile(page: Page): Promise<{ id: string; name: string; role: string; email?: string } | null> {
  return page.evaluate((key) => {
    try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; }
  }, DEMO_KEYS.session);
}

/** Signs out with the app's own Sign Out button (from Home when the current screen hides the bar). */
export async function signOut(page: Page) {
  const button = page.getByRole('button', { name: 'Sign Out', exact: true });
  if (!(await button.isVisible().catch(() => false))) {
    await page.goto('/');
    await page.locator('.ps-scan-prompt-skip').click({ timeout: 1500 }).catch(() => {});
  }
  await button.click({ timeout: 15_000 });
  await expect(page.locator('.ps-login-page'), 'back at the sign-in page').toBeVisible({ timeout: 20_000 });
  expect(await sessionProfile(page), 'no session left').toBeNull();
}

/** Configuration → Staff (members or the Role Dictionary). */
export async function openStaffScreen(page: Page, section: 'members' | 'roles' = 'members') {
  await openScreen(page, `/configuration?tab=staff&section=${section}`, 'Configuration');
  await expect(page.locator('.ps-st-tab--active')).toBeVisible({ timeout: 20_000 });
}

/** Opens a staff member's editor from Configuration → Staff by their name; returns the editor. */
export async function openStaffEditor(page: Page, name: string): Promise<Locator> {
  await openStaffScreen(page, 'members');
  await page.locator('.ps-st-search').fill(name);
  const row = page.locator('.ps-st-tr').filter({ hasText: name }).first();
  await expect(row, `a staff row for ${name}`).toBeVisible({ timeout: 15_000 });
  await row.locator('.ps-st-edit-btn').click();
  const editor = page.locator('.ps-conf-modal').filter({ has: page.locator('.ps-st-modal-header') });
  await expect(editor).toBeVisible({ timeout: 10_000 });
  return editor;
}

/** The "Sign-in password" panel inside an open staff editor. */
export const passwordPanel = (editor: Locator) => editor.locator('.ps-st-linked').filter({ hasText: 'Sign-in password' });

/**
 * Staff → edit <name> → Sign-in password → Set/Reset password. Fills both
 * fields (confirm defaults to the password), sets the "must change" box and
 * saves. Returns the message shown under the form ("Password saved." or the
 * refusal), leaving the editor open.
 */
export async function setStaffPassword(page: Page, name: string, password: string, opts: { mustChange: boolean; confirm?: string } = { mustChange: false }): Promise<{ editor: Locator; message: string }> {
  const editor = await openStaffEditor(page, name);
  const panel = passwordPanel(editor);
  await panel.getByRole('button', { name: /^(Set password|Reset password)$/ }).click();
  const form = panel.locator('.ps-st-password-form');
  await expect(form).toBeVisible();
  await form.locator('input[id^="pw-new-"]').fill(password);
  await form.locator('input[id^="pw-confirm-"]').fill(opts.confirm ?? password);
  const mustChange = form.locator('input[type="checkbox"]');
  if (await mustChange.isChecked() !== opts.mustChange) await mustChange.click();
  await form.getByRole('button', { name: 'Save password', exact: true }).click();
  const message = panel.locator('[role="status"]');
  await expect(message).toBeVisible({ timeout: 20_000 });
  return { editor, message: (await message.textContent())?.trim() ?? '' };
}

/** Staff → edit <name> → Remove password (confirmed). Returns the message shown. */
export async function removeStaffPassword(page: Page, name: string): Promise<{ editor: Locator; message: string }> {
  const editor = await openStaffEditor(page, name);
  const panel = passwordPanel(editor);
  await panel.getByRole('button', { name: 'Remove password', exact: true }).click();
  const confirm = page.locator('.ps-overlay--confirm').filter({ hasText: 'Remove this password?' });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Remove password', exact: true }).click();
  const message = panel.locator('[role="status"]');
  await expect(message).toBeVisible({ timeout: 10_000 });
  return { editor, message: (await message.textContent())?.trim() ?? '' };
}

/**
 * Clicks a control that may sit outside the viewport (the staff editor is taller
 * than the window and its backdrop scrolls): a real click first, then the
 * click event itself.
 */
export async function clickEvenOffscreen(target: Locator) {
  // A real click only (review fix): a synthetic click would also "work" on a control a person couldn't reach.
  // That is how this found the Staff editor's × hidden above the window (fixed in Batch 581, .ps-conf-backdrop).
  await target.scrollIntoViewIfNeeded().catch(() => {});
  await target.click({ timeout: 10_000 });
}

/** Closes an open staff editor without saving the form. */
export async function closeStaffEditor(editor: Locator) {
  await clickEvenOffscreen(editor.locator('.ps-st-modal-close'));
  await expect(editor).toHaveCount(0);
}

/** Removes demo data keys this spec changed, so later specs start clean (the seeds come back on next load). */
export async function clearDemoKeys(page: Page, keys: readonly string[]) {
  await page.evaluate((ks) => { for (const k of ks) localStorage.removeItem(k); }, keys);
}
