// e2e/review/ps-363-368.staff-password.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// Staff passwords (Batch 448 / 456): the review test plans of six tickets, run
// against the demo (Vite dev server, localStorage data). One describe per
// ticket; each review step is a test.step.
//
//   PS-363  Staff password: policy (12–128 characters, not blank, not the
//           email, confirmation matches) and Staff screen state
//   PS-364  Staff password: stored only as a hash, never in the audit trail
//   PS-365  Staff password: setting or resetting requires
//           config:staff-password:manage
//   PS-366  Staff password: signs in; replaces the built-in demo password;
//           removal restores it; wrong password refused
//   PS-367  Staff password: forced change at sign-in
//   PS-368  Staff password: app access follows the person's staff roles
//
// Automated here: every step of every ticket, with these exceptions:
//   • The built-in demo password is not written anywhere in the repository:
//     src/services/auth/demo/demoAccounts.ts holds only PBKDF2 hashes (PS-60),
//     and docs/product/DEMO_GUIDE.md says "The password is not written here;
//     ask Pete." The steps that type it (PS-366 steps 3 and 4: the built-in
//     password refused while a staff password is set, and working again after
//     removal; PS-368 step 4: Grace Liu signing in with it) run only when the
//     PS_DEMO_PASSWORD environment variable is set for the run, and are
//     reported as skipped otherwise. Without it, PS-368 step 4 still checks
//     Grace's access and her untouched password state with a session started
//     the way the accessibility specs do (helpers.signIn), and PS-363 step 5
//     uses that same way to sign in as Rachel Okafor (Lab Director: no
//     config:staff-password:manage).
//   • Already automated by vitest, run on Oct 15, 2026 before this spec was
//     written, all passed:
//       src/services/staffPasswords/staffPasswordRules.test.ts        3 tests
//       src/services/staffPasswords/mockStaffPasswordService.test.ts  8 tests
//       src/services/auth/authSession.test.ts                        31 tests
//     (PS-363 step 6, PS-364 step 3, PS-365 step 3, PS-366 step 5, PS-367
//     step 5, PS-368 step 5).
//
// Needs a person: none, beyond supplying PS_DEMO_PASSWORD for the three
// sub-steps above.
//
// Where the demo differs from the steps as written:
//   • PS-363 step 5 / PS-365 step 2: the Set password button is not hidden or
//     refused with a message for someone without the capability; it stays
//     visible, greyed out (aria-disabled, .ps-cap-btn--denied) with a tooltip
//     naming the capability, and a click does nothing (CapabilityButton,
//     PS-355). The service refuses too ("Not saved: your roles don't include
//     managing staff passwords."), which the vitest file covers.
//   • PS-365 step 2: the test role is a Duplicate of Admin with "Manage staff
//     sign-in passwords" unticked, assigned as the only role of Thomas Nguyen
//     (a seeded staff member with no demo sign-in), who is given a staff
//     password to sign in with.
//   • PS-368 step 1: no seeded staff member outside the demo sign-in list has
//     Pathologist + Admin (those who do — Bronwyn Prior, Rossana Babakhani,
//     Michelle Nimmo, Amber Fehrs-Battey — all have demo accounts), so the test
//     adds Admin to Aisha Patel (Pathologist) through the Staff screen.
//   • PS-368 step 3: no seeded staff record has only Physician, and Physician
//     can't be assigned from the Staff screen (it is a directory-only role,
//     left out of the role picker), so Lisa Hoffman is given QA Reviewer only.
//   • Clean-up: each describe removes the passwords it set and the staff and
//     role records it changed (the demo keys, not Demo Reset).
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5306 npx playwright test --project=chromium \
//        e2e/review/ps-363-368.staff-password.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';
import {
  signIn, startSession, openScreen, signInWithPassword, signOut, sessionProfile, openStaffEditor, openStaffScreen,
  passwordPanel, setStaffPassword, removeStaffPassword, closeStaffEditor, clickEvenOffscreen, clearDemoKeys, DEMO_KEYS,
} from './helpers';

/** The built-in demo password (not in the repository; see the header). */
const DEMO_PASSWORD = process.env.PS_DEMO_PASSWORD ?? '';

// People (src/services/users/mockUserService.ts; demo sign-ins in src/services/auth/demo/demoAccounts.ts).
const SARAH = { name: 'Sarah Johnson', id: 'PATH-SJ-001', email: 'sarah.johnson@demo.pathscribe.ai' };
const MARIA = { name: 'Maria Lopez', id: 'ACC-001', email: 'maria.lopez@demo.pathscribe.ai' };
const AISHA = { name: 'Aisha Priya Patel', id: '6', email: 'apatel@hospital.org' };          // Pathologist; no demo sign-in
const LISA = { name: 'Lisa Hoffman', id: '8', email: 'lhoffman@hospital.org' };        // Resident; no demo sign-in
const THOMAS = { name: 'Thomas Van Nguyen', id: '7', email: 'tnguyen@hospital.org' };      // Pathologist; no demo sign-in
const RACHEL = { id: 'LD-001', name: 'Dr. Rachel Okafor', role: 'admin' };             // Lab Director demo account
const GRACE = { id: 'QA-001', name: 'Grace Liu', role: 'pathologist', email: 'grace.liu@demo.pathscribe.ai' };

// Passwords: 12+ characters, not common, not patterned, no PathScribe/email words (passwordScreening.ts).
const PW = {
  sarah: 'Orchid-Lantern-Quartz-7731',
  sarah2: 'Velvet-Harbor-Maple-9042',
  maria: 'Temporary-Granite-Fjord-5518',
  mariaOwn: 'Juniper-Compass-Tundra-8826',
  aisha: 'Saffron-Meridian-Kestrel-3194',
  lisa: 'Cobalt-Willow-Prairie-6407',
  thomas: 'Amber-Tidal-Monsoon-2265',
  wrong: 'Not-The-Right-One-0000',
};

// staffTab.signInPassword.* (en.json)
const T = {
  blank: 'Enter a password.',
  tooShort: 'Use at least 12 characters.',
  tooLong: 'That password is too long (128 characters at most).',
  sameAsEmail: "The password can't be the person's email address.",
  mismatch: "The two passwords don't match.",
  saved: 'Password saved.',
  removed: 'Password removed.',
  stateOwn: /^Password set .+\.$/,
  stateOwnMustChange: /^Password set .+; they'll choose a new one at their next sign-in\.$/,
  stateBuiltIn: 'Uses the built-in demo password. Set one here to replace it.',
  stateNone: "No password: this person can't sign in with a password until one is set.",
};
// login.* (en.json)
const LOGIN = {
  invalid: 'Incorrect email or password. Please try again.',
  changeIntro: 'Your administrator set a temporary password. Choose your own to continue.',
};

const CLEAN_KEYS = [DEMO_KEYS.staffPasswords, DEMO_KEYS.users, DEMO_KEYS.roles];

/** Signed in as this person: not on the sign-in page, and the stored session names them. */
async function expectSignedInAs(page: Page, id: string) {
  await expect(page.locator('.ps-login-page')).toHaveCount(0);
  expect((await sessionProfile(page))?.id, 'the session is theirs').toBe(id);
}

/** Changes a staff member's roles in their editor: removes `remove`, adds `add`, saves. */
async function setStaffRoles(page: Page, name: string, change: { remove?: string[]; add?: string[] }) {
  const editor = await openStaffEditor(page, name);
  for (const r of change.remove ?? []) {
    await clickEvenOffscreen(editor.locator('.ps-st-role-chip').filter({ hasText: r }).locator('.ps-st-role-chip-x'));
    await expect(editor.locator('.ps-st-role-chip').filter({ hasText: r })).toHaveCount(0);
  }
  for (const r of change.add ?? []) {
    await clickEvenOffscreen(editor.locator('.ps-dropdown-trigger').first());
    await clickEvenOffscreen(editor.locator('.ps-dropdown-option').filter({ hasText: r }).first());
    await expect(editor.locator('.ps-st-role-chip').filter({ hasText: r })).toHaveCount(1);
  }
  await clickEvenOffscreen(editor.getByRole('button', { name: 'Save Changes', exact: true }));
  await expect(editor, 'saved and closed').toHaveCount(0, { timeout: 15_000 });
}

// ═════════════════════════════════════════════════════════════════════════════

test.describe('PS-363: policy (12–128 characters, not blank, not the email, confirmation matches) and Staff screen state', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });
  test.afterEach(async ({ page }) => { await clearDemoKeys(page, CLEAN_KEYS); });

  test('Steps 1–4: refusals with their messages; a saved password shows its state; a demo account without one shows the built-in state', async ({ page }) => {
    test.setTimeout(240_000);
    const refused = async (password: string, expected: string | RegExp, confirm?: string) => {
      const { editor, message } = await setStaffPassword(page, SARAH.name, password, { mustChange: false, confirm });
      expect(message).toMatch(expected);
      await expect(passwordPanel(editor).locator('.ps-st-error')).toBeVisible();
      await closeStaffEditor(editor);
    };

    await test.step('1. As Pete: Configuration → Staff → Sarah Johnson → Set password', async () => {
      const editor = await openStaffEditor(page, SARAH.name);
      const panel = passwordPanel(editor);
      await expect(panel.locator('.ps-st-cred-desc').first(), 'a demo account with no staff password').toHaveText(T.stateBuiltIn);
      await panel.getByRole('button', { name: 'Set password', exact: true }).click();
      await expect(panel.locator('.ps-st-password-form')).toBeVisible();
      await closeStaffEditor(editor);
    });

    await test.step('2a. Blank: refused', async () => { await refused('', T.blank); });
    await test.step('2b. 11 characters: refused', async () => { await refused('Kestrel-Fjo', T.tooShort); });
    await test.step('2c. Over 128 characters: refused', async () => {
      await refused(`Lantern-${'x'.repeat(125)}`, T.tooLong);
    });
    await test.step("2d. The person's own email: refused", async () => { await refused(SARAH.email, T.sameAsEmail); });
    await test.step('3. A valid password with a different confirmation: "The two passwords don\'t match."', async () => {
      await refused(PW.sarah, T.mismatch, PW.sarah2);
    });

    await test.step('4a. A valid password saves; the Staff screen shows "Password set <date>"', async () => {
      const { editor, message } = await setStaffPassword(page, SARAH.name, PW.sarah, { mustChange: false });
      expect(message).toBe(T.saved);
      await expect(passwordPanel(editor).locator('.ps-st-cred-desc').first()).toHaveText(T.stateOwn);
      await closeStaffEditor(editor);
      // And again after a reload: the state comes from the stored record, not the form.
      const again = await openStaffEditor(page, SARAH.name);
      await expect(passwordPanel(again).locator('.ps-st-cred-desc').first()).toHaveText(T.stateOwn);
      await closeStaffEditor(again);
    });
    await test.step('4b. With "must choose a new one" ticked, the state says so', async () => {
      const { editor, message } = await setStaffPassword(page, SARAH.name, PW.sarah2, { mustChange: true });
      expect(message).toBe(T.saved);
      await expect(passwordPanel(editor).locator('.ps-st-cred-desc').first()).toHaveText(T.stateOwnMustChange);
      await closeStaffEditor(editor);
    });
    await test.step('4c. A demo account without a staff password: "Uses the built-in demo password"', async () => {
      const editor = await openStaffEditor(page, MARIA.name);
      await expect(passwordPanel(editor).locator('.ps-st-cred-desc').first()).toHaveText(T.stateBuiltIn);
      await closeStaffEditor(editor);
    });
    await test.step('4d. Someone with no demo sign-in and no staff password: "No password"', async () => {
      const editor = await openStaffEditor(page, AISHA.name);
      await expect(passwordPanel(editor).locator('.ps-st-cred-desc').first()).toHaveText(T.stateNone);
      await closeStaffEditor(editor);
    });
    await test.step('Clean up: remove the password set for Sarah Johnson', async () => {
      const { editor, message } = await removeStaffPassword(page, SARAH.name);
      expect(message).toBe(T.removed);
      await closeStaffEditor(editor);
    });
  });

  test('Step 5: without config:staff-password:manage (Rachel Okafor, Lab Director) the Set password action is refused', async ({ page }) => {
    test.setTimeout(120_000);
    await test.step('5. As Rachel Okafor: Configuration → Staff → Sarah Johnson: Set password is greyed out and does nothing', async () => {
      await startSession(page, RACHEL);
      const editor = await openStaffEditor(page, SARAH.name);
      const panel = passwordPanel(editor);
      const button = panel.getByRole('button', { name: 'Set password', exact: true });
      await expect(button).toBeVisible();
      await expect(button, 'greyed out').toHaveAttribute('aria-disabled', 'true');
      await expect(button).toHaveClass(/ps-cap-btn--denied/);
      await expect(button, 'the tooltip names the capability').toHaveAttribute('title', /Manage staff sign-in passwords/);
      await button.click({ force: true });
      await expect(panel.locator('.ps-st-password-form'), 'no form opens').toHaveCount(0);
      await closeStaffEditor(editor);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
test.describe('PS-364: stored only as a hash, never in the audit trail', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });
  test.afterEach(async ({ page }) => { await clearDemoKeys(page, CLEAN_KEYS); });

  test('Steps 1–2: the audit entry records the change without the password; browser storage holds a salted hash, no plaintext', async ({ page }) => {
    test.setTimeout(180_000);
    await test.step('1. As Pete, set a staff password for Sarah Johnson', async () => {
      const { editor, message } = await setStaffPassword(page, SARAH.name, PW.sarah, { mustChange: false });
      expect(message).toBe(T.saved);
      await closeStaffEditor(editor);
    });

    await test.step('2a. Audit Log: the STAFF_PASSWORD_SET entry names the staff record and shows no password', async () => {
      await openScreen(page, '/audit?search=STAFF_PASSWORD_SET', 'System Logs');
      const row = page.locator('.ps-auditlog-row--audit').filter({ hasText: 'STAFF_PASSWORD_SET' }).first();
      await expect(row, 'the password change is in the log').toBeVisible({ timeout: 15_000 });
      await expect(row).toContainText(`staff record ${SARAH.id}`);
      await expect(row).toContainText('Pete Nimmo');
      await expect(row).not.toContainText(PW.sarah);
      // Nowhere in the log at all, not just the row.
      await expect(page.locator('.ps-auditlog-table--audit')).not.toContainText(PW.sarah);
    });

    await test.step('2b. The stored audit records hold no plaintext either', async () => {
      const inAudit = await page.evaluate((pw) => (localStorage.getItem('pathscribe_mock_pathscribe_audit_logs') ?? '').includes(pw), PW.sarah);
      expect(inAudit, 'the audit store').toBe(false);
    });

    await test.step('2c. No localStorage key holds the plaintext; the record is a salted PBKDF2 hash', async () => {
      const found = await page.evaluate((pw) => {
        const hits: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)!;
          const v = localStorage.getItem(k) ?? '';
          if (v.includes(pw) || k.includes(pw)) hits.push(k);
        }
        return hits;
      }, PW.sarah);
      expect(found, 'keys holding the plaintext').toEqual([]);
      const record = await page.evaluate(([key, id]) => {
        const all = JSON.parse(localStorage.getItem(key) ?? '[]') as { staffId: string; password: { iterations: number; salt: string; hash: string }; mustChange: boolean; setAt: string; setBy: string }[];
        return all.find(r => r.staffId === id) ?? null;
      }, [DEMO_KEYS.staffPasswords, SARAH.id] as const);
      expect(record, 'a record for Sarah').not.toBeNull();
      expect(Object.keys(record!.password).sort()).toEqual(['hash', 'iterations', 'salt']);
      expect(record!.password.iterations).toBe(600_000);
      expect(Buffer.from(record!.password.salt, 'base64').length, 'a 16-byte salt').toBe(16);
      expect(Buffer.from(record!.password.hash, 'base64').length, 'a 32-byte hash').toBe(32);
      expect(record!.password.hash).not.toContain(PW.sarah);
      expect(record!.setBy).toBe('PATH-001');
      expect(record!.mustChange).toBe(false);
    });

    await test.step('2d. Setting it again gives a different salt and hash (a fresh salt each time)', async () => {
      const before = await page.evaluate(([key, id]) => (JSON.parse(localStorage.getItem(key) ?? '[]') as { staffId: string; password: { salt: string; hash: string } }[]).find(r => r.staffId === id)!.password, [DEMO_KEYS.staffPasswords, SARAH.id] as const);
      const { editor, message } = await setStaffPassword(page, SARAH.name, PW.sarah, { mustChange: false });
      expect(message).toBe(T.saved);
      await closeStaffEditor(editor);
      const after = await page.evaluate(([key, id]) => (JSON.parse(localStorage.getItem(key) ?? '[]') as { staffId: string; password: { salt: string; hash: string } }[]).find(r => r.staffId === id)!.password, [DEMO_KEYS.staffPasswords, SARAH.id] as const);
      expect(after.salt).not.toBe(before.salt);
      expect(after.hash).not.toBe(before.hash);
    });

    await test.step('Clean up: remove the password; the removal is audited without a password too', async () => {
      const { editor, message } = await removeStaffPassword(page, SARAH.name);
      expect(message).toBe(T.removed);
      await closeStaffEditor(editor);
      await openScreen(page, '/audit?search=STAFF_PASSWORD_CLEARED', 'System Logs');
      const row = page.locator('.ps-auditlog-row--audit').filter({ hasText: 'STAFF_PASSWORD_CLEARED' }).first();
      await expect(row).toBeVisible({ timeout: 15_000 });
      await expect(row).toContainText(`staff record ${SARAH.id}`);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
test.describe('PS-365: setting or resetting requires config:staff-password:manage', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });
  test.afterEach(async ({ page }) => { await clearDemoKeys(page, CLEAN_KEYS); });

  test('Steps 1–2: Pete can set and reset; a role without "Manage staff sign-in passwords" is refused', async ({ page }) => {
    test.setTimeout(300_000);
    const ROLE = 'E2E No-Password Admin';

    await test.step('1. As Pete: Set password, then Reset password, both work', async () => {
      const first = await setStaffPassword(page, SARAH.name, PW.sarah, { mustChange: false });
      expect(first.message).toBe(T.saved);
      await closeStaffEditor(first.editor);
      const editor = await openStaffEditor(page, SARAH.name);
      await expect(passwordPanel(editor).getByRole('button', { name: 'Reset password', exact: true }), 'once set, the action is Reset password').toBeVisible();
      await closeStaffEditor(editor);
      const second = await setStaffPassword(page, SARAH.name, PW.sarah2, { mustChange: false });
      expect(second.message).toBe(T.saved);
      await closeStaffEditor(second.editor);
    });

    await test.step('2a. Role Dictionary: Duplicate Admin, untick "Manage staff sign-in passwords", Add Role', async () => {
      await openStaffScreen(page, 'roles');
      await page.locator('.ps-rd-tr').filter({ has: page.locator('.ps-rd-role-badge', { hasText: /^Admin$/ }) }).getByRole('button', { name: 'Duplicate', exact: true }).click();
      const modal = page.locator('.fm-modal--config');
      await expect(modal).toBeVisible();
      await modal.getByPlaceholder('Role name').fill(ROLE);
      await modal.locator('.ps-rd-cat-item').filter({ hasText: 'Administration' }).click();
      const item = modal.locator('.ps-rd-action-item[data-capability="config:staff-password:manage"]');
      await expect(item).toHaveClass(/ps-rd-action-item--granted/);
      await item.click();
      await expect(item, 'unticked').toHaveClass(/ps-rd-action-item--default/);
      await expect(modal.locator('.ps-rd-action-item[data-capability="config:staff:edit"]'), 'editing staff is kept').toHaveClass(/ps-rd-action-item--granted/);
      await modal.getByRole('button', { name: 'Add Role', exact: true }).click();
      await expect(modal).toHaveCount(0, { timeout: 15_000 });
      await expect(page.locator('.ps-rd-tr').filter({ hasText: ROLE })).toHaveCount(1);
    });

    await test.step('2b. Thomas Nguyen (no demo sign-in) gets only that role, and a password to sign in with', async () => {
      await setStaffRoles(page, THOMAS.name, { remove: ['Pathologist'], add: [ROLE] });
      const { editor, message } = await setStaffPassword(page, THOMAS.name, PW.thomas, { mustChange: false });
      expect(message).toBe(T.saved);
      await closeStaffEditor(editor);
    });

    await test.step('2c. Signed in as Thomas: Set password and Reset password are refused (greyed out, no form)', async () => {
      await signOut(page);
      expect(await signInWithPassword(page, THOMAS.email, PW.thomas)).toEqual({ outcome: 'signedIn' });
      await expectSignedInAs(page, THOMAS.id);
      expect((await sessionProfile(page))?.role, 'configuration access only').toBe('admin');
      // Someone with a staff password set: the action is Reset password.
      const sarah = await openStaffEditor(page, SARAH.name);
      const reset = passwordPanel(sarah).getByRole('button', { name: 'Reset password', exact: true });
      await expect(reset).toHaveAttribute('aria-disabled', 'true');
      await expect(reset).toHaveClass(/ps-cap-btn--denied/);
      await reset.click({ force: true });
      await expect(passwordPanel(sarah).locator('.ps-st-password-form')).toHaveCount(0);
      const remove = passwordPanel(sarah).getByRole('button', { name: 'Remove password', exact: true });
      await expect(remove, 'removing is refused too').toHaveAttribute('aria-disabled', 'true');
      await closeStaffEditor(sarah);
      // Someone without: Set password.
      const maria = await openStaffEditor(page, MARIA.name);
      const set = passwordPanel(maria).getByRole('button', { name: 'Set password', exact: true });
      await expect(set).toHaveAttribute('aria-disabled', 'true');
      await set.click({ force: true });
      await expect(passwordPanel(maria).locator('.ps-st-password-form')).toHaveCount(0);
      await closeStaffEditor(maria);
    });

    await test.step('Clean up: back as Pete, remove the passwords; the role and staff changes are reset with the demo keys', async () => {
      await signOut(page);
      await startSession(page);
      for (const who of [SARAH.name, THOMAS.name]) {
        const { editor, message } = await removeStaffPassword(page, who);
        expect(message).toBe(T.removed);
        await closeStaffEditor(editor);
      }
      await clearDemoKeys(page, CLEAN_KEYS);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
test.describe('PS-366: signs in; replaces the built-in demo password; removal restores it; wrong password refused', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });
  test.afterEach(async ({ page }) => { await clearDemoKeys(page, CLEAN_KEYS); });

  test('Steps 1–4 (without typing the built-in password): a set password signs Sarah in; a wrong one is refused; removal restores the built-in state', async ({ page }) => {
    test.setTimeout(240_000);
    await test.step('1. As Pete: Staff → Sarah Johnson → Sign-in password → Set password, "Must choose" unticked, Save password', async () => {
      const { editor, message } = await setStaffPassword(page, SARAH.name, PW.sarah, { mustChange: false });
      expect(message).toBe(T.saved);
      await expect(passwordPanel(editor).locator('.ps-st-cred-desc').first()).toHaveText(T.stateOwn);
      await closeStaffEditor(editor);
    });
    await test.step('2. Sign out; sign in as Sarah with the new password: her own worklist opens', async () => {
      await signOut(page);
      expect(await signInWithPassword(page, SARAH.email, PW.sarah)).toEqual({ outcome: 'signedIn' });
      await expectSignedInAs(page, SARAH.id);
      const profile = await sessionProfile(page);
      expect(profile?.name).toBe('Dr. Sarah Johnson');
      expect(profile?.role).toBe('pathologist');
      await page.goto('/worklist');
      await expect(page.locator('.ps-wl-filter-tile').first(), 'the worklist').toBeVisible({ timeout: 20_000 });
      expect((await sessionProfile(page))?.id, 'still her session on the worklist').toBe(SARAH.id);
    });
    await test.step('3. Sign out; a wrong password is refused', async () => {
      await signOut(page);
      expect(await signInWithPassword(page, SARAH.email, PW.wrong)).toEqual({ outcome: 'refused', error: LOGIN.invalid });
      expect(await sessionProfile(page), 'no session').toBeNull();
    });
    await test.step('4. As Pete, Remove password for Sarah: the Staff screen says the built-in demo password applies again', async () => {
      await startSession(page);
      const { editor, message } = await removeStaffPassword(page, SARAH.name);
      expect(message).toBe(T.removed);
      await expect(passwordPanel(editor).locator('.ps-st-cred-desc').first()).toHaveText(T.stateBuiltIn);
      await closeStaffEditor(editor);
      // The record is gone, so her staff password no longer signs her in.
      await signOut(page);
      expect(await signInWithPassword(page, SARAH.email, PW.sarah)).toEqual({ outcome: 'refused', error: LOGIN.invalid });
    });
  });

  test('Steps 3–4 with the built-in demo password (PS_DEMO_PASSWORD): refused while a staff password is set; works again after removal', async ({ page }) => {
    test.skip(!DEMO_PASSWORD, 'PS_DEMO_PASSWORD is not set: the built-in demo password is not in the repository (ask Pete)');
    test.setTimeout(240_000);
    await test.step('Control: with no staff password set, the built-in password signs Sarah in', async () => {
      await signOut(page);
      expect(await signInWithPassword(page, SARAH.email, DEMO_PASSWORD)).toEqual({ outcome: 'signedIn' });
      await expectSignedInAs(page, SARAH.id);
      await signOut(page);
    });
    await test.step('1. As Pete, set a staff password for Sarah', async () => {
      await startSession(page);
      const { editor, message } = await setStaffPassword(page, SARAH.name, PW.sarah, { mustChange: false });
      expect(message).toBe(T.saved);
      await closeStaffEditor(editor);
      await signOut(page);
    });
    await test.step('3. Her built-in demo password is refused', async () => {
      expect(await signInWithPassword(page, SARAH.email, DEMO_PASSWORD)).toEqual({ outcome: 'refused', error: LOGIN.invalid });
      expect(await sessionProfile(page)).toBeNull();
    });
    await test.step('4. As Pete, Remove password; the built-in demo password works again', async () => {
      await startSession(page);
      const { editor, message } = await removeStaffPassword(page, SARAH.name);
      expect(message).toBe(T.removed);
      await closeStaffEditor(editor);
      await signOut(page);
      expect(await signInWithPassword(page, SARAH.email, DEMO_PASSWORD)).toEqual({ outcome: 'signedIn' });
      await expectSignedInAs(page, SARAH.id);
      await signOut(page);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
test.describe('PS-367: forced change at sign-in', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });
  test.afterEach(async ({ page }) => { await clearDemoKeys(page, CLEAN_KEYS); });

  test('Steps 1–4, 6: a temporary password starts no session; the person chooses their own and is signed in; the next sign-in is direct', async ({ page }) => {
    test.setTimeout(240_000);
    await test.step('1. As Pete: Staff → Maria Lopez (ACC-001) → Set password, "Must choose a new password at next sign-in" ticked, Save', async () => {
      const { editor, message } = await setStaffPassword(page, MARIA.name, PW.maria, { mustChange: true });
      expect(message).toBe(T.saved);
      await expect(passwordPanel(editor).locator('.ps-st-cred-desc').first()).toHaveText(T.stateOwnMustChange);
      await closeStaffEditor(editor);
    });
    await test.step('2. Sign out; sign in as Maria with the temporary password: no session; the change-password form with its message', async () => {
      await signOut(page);
      expect(await signInWithPassword(page, MARIA.email, PW.maria)).toEqual({ outcome: 'changeRequired' });
      await expect(page.locator('.ps-login-change-intro')).toHaveText(LOGIN.changeIntro);
      expect(await sessionProfile(page), 'no session started').toBeNull();
      await expect(page.locator('.ps-login-page'), 'still on the sign-in page').toBeVisible();
    });
    await test.step('3. Enter and confirm a new password (12+), Save and sign in: signed in', async () => {
      await page.locator('#login-new-password').fill(PW.mariaOwn);
      await page.locator('#login-confirm-password').fill(PW.mariaOwn);
      await page.getByRole('button', { name: 'Save and sign in', exact: true }).click();
      await expect(page.locator('.ps-login-page')).toHaveCount(0, { timeout: 30_000 });
      await page.locator('.ps-scan-prompt-skip').click({ timeout: 1500 }).catch(() => {});
      await expectSignedInAs(page, MARIA.id);
      expect((await sessionProfile(page))?.name).toBe('Maria Lopez');
    });
    await test.step('4. Sign out and in again with the new password: no change-password screen', async () => {
      await signOut(page);
      expect(await signInWithPassword(page, MARIA.email, PW.mariaOwn)).toEqual({ outcome: 'signedIn' });
      await expectSignedInAs(page, MARIA.id);
      // The temporary one is no longer hers.
      await signOut(page);
      expect(await signInWithPassword(page, MARIA.email, PW.maria)).toEqual({ outcome: 'refused', error: LOGIN.invalid });
    });
    await test.step('4b. The Staff screen now shows the password as set, with no change pending; the change is audited without a password', async () => {
      await startSession(page);
      const editor = await openStaffEditor(page, MARIA.name);
      await expect(passwordPanel(editor).locator('.ps-st-cred-desc').first()).toHaveText(T.stateOwn);
      await closeStaffEditor(editor);
      await openScreen(page, '/audit?search=STAFF_PASSWORD_CHANGED', 'System Logs');
      const row = page.locator('.ps-auditlog-row--audit').filter({ hasText: 'STAFF_PASSWORD_CHANGED' }).first();
      await expect(row).toBeVisible({ timeout: 15_000 });
      await expect(row).toContainText(`Staff record ${MARIA.id} chose a new sign-in password at sign-in.`);
      await expect(page.locator('.ps-auditlog-table--audit')).not.toContainText(PW.mariaOwn);
      await expect(page.locator('.ps-auditlog-table--audit')).not.toContainText(PW.maria);
    });
    await test.step('6. Clean up: remove the password (not Demo Reset)', async () => {
      const { editor, message } = await removeStaffPassword(page, MARIA.name);
      expect(message).toBe(T.removed);
      await expect(passwordPanel(editor).locator('.ps-st-cred-desc').first()).toHaveText(T.stateBuiltIn);
      await closeStaffEditor(editor);
      const left = await page.evaluate((key) => (JSON.parse(localStorage.getItem(key) ?? '[]') as { staffId: string }[]).filter(r => r.staffId === 'ACC-001').length, DEMO_KEYS.staffPasswords);
      expect(left, 'no record left for ACC-001').toBe(0);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
test.describe("PS-368: app access follows the person's staff roles", () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });
  test.afterEach(async ({ page }) => { await clearDemoKeys(page, CLEAN_KEYS); });

  test('Steps 1–3: Pathologist + Admin signs in as pathologist-admin; QA Reviewer only is refused', async ({ page }) => {
    test.setTimeout(300_000);
    await test.step('1. As Pete: Aisha Patel (Pathologist, no demo sign-in) is given Admin as well through the Staff screen', async () => {
      await setStaffRoles(page, AISHA.name, { add: ['Admin'] });
      const editor = await openStaffEditor(page, AISHA.name);
      await expect(editor.locator('.ps-st-role-chip').filter({ hasText: 'Pathologist' })).toHaveCount(1);
      await expect(editor.locator('.ps-st-role-chip').filter({ hasText: 'Admin' })).toHaveCount(1);
      await closeStaffEditor(editor);
    });
    await test.step('2. Set a password for her, sign out, sign in with her email: pathologist-admin access; worklist and Configuration reachable', async () => {
      const { editor, message } = await setStaffPassword(page, AISHA.name, PW.aisha, { mustChange: false });
      expect(message).toBe(T.saved);
      await closeStaffEditor(editor);
      await signOut(page);
      expect(await signInWithPassword(page, AISHA.email, PW.aisha)).toEqual({ outcome: 'signedIn' });
      await expectSignedInAs(page, AISHA.id);
      const profile = await sessionProfile(page);
      expect(profile?.role).toBe('pathologist-admin');
      expect(profile?.name).toBe('Aisha Patel'); // first + last, as authSession builds it
      await page.goto('/worklist');
      await expect(page.locator('.ps-wl-filter-tile').first(), 'the worklist').toBeVisible({ timeout: 20_000 });
      await openScreen(page, '/configuration?tab=staff', 'Configuration');
      await expect(page.locator('.ps-st-tab--active'), 'Configuration → Staff opens').toBeVisible({ timeout: 20_000 });
      await signOut(page);
    });
    await test.step('3. Lisa Hoffman is given QA Reviewer only (no case or configuration access); with a password set, her sign-in is refused', async () => {
      await startSession(page);
      // Control (review fix): the same password signs her in while she is a Resident, so the refusal below can
      // only come from the role change, not from a broken password save or sign-in.
      const { editor, message } = await setStaffPassword(page, LISA.name, PW.lisa, { mustChange: false });
      expect(message).toBe(T.saved);
      await closeStaffEditor(editor);
      await signOut(page);
      expect((await signInWithPassword(page, LISA.email, PW.lisa)).outcome, 'as a Resident, her password signs her in').toBe('signedIn');
      await signOut(page);
      await startSession(page);
      await setStaffRoles(page, LISA.name, { remove: ['Resident'], add: ['QA Reviewer'] });
      await signOut(page);
      expect(await signInWithPassword(page, LISA.email, PW.lisa)).toEqual({ outcome: 'refused', error: LOGIN.invalid });
      expect(await sessionProfile(page), 'no session').toBeNull();
    });
    await test.step('Clean up: remove both passwords; the role changes are reset with the demo keys', async () => {
      await startSession(page);
      for (const who of [AISHA.name, LISA.name]) {
        const { editor, message } = await removeStaffPassword(page, who);
        expect(message).toBe(T.removed);
        await closeStaffEditor(editor);
      }
      await clearDemoKeys(page, CLEAN_KEYS);
    });
  });

  test('Step 4 (without the built-in password): Grace Liu\'s demo access and password state are untouched', async ({ page }) => {
    test.setTimeout(120_000);
    await test.step('4. Grace Liu (QA Reviewer, built-in account): still "Uses the built-in demo password"; her Quality Assurance screen opens', async () => {
      const editor = await openStaffEditor(page, 'Grace Liu');
      await expect(passwordPanel(editor).locator('.ps-st-cred-desc').first()).toHaveText(T.stateBuiltIn);
      await closeStaffEditor(editor);
      await startSession(page, GRACE);
      await openScreen(page, '/quality-assurance', 'Quality Assurance');
      expect((await sessionProfile(page))?.id).toBe(GRACE.id);
    });
  });

  test('Step 4 with the built-in demo password (PS_DEMO_PASSWORD): Grace Liu signs in as before', async ({ page }) => {
    test.skip(!DEMO_PASSWORD, 'PS_DEMO_PASSWORD is not set: the built-in demo password is not in the repository (ask Pete)');
    test.setTimeout(120_000);
    await test.step('4. Sign in as Grace Liu with the built-in password: her demo access unchanged', async () => {
      await signOut(page);
      expect(await signInWithPassword(page, GRACE.email, DEMO_PASSWORD)).toEqual({ outcome: 'signedIn' });
      await expectSignedInAs(page, GRACE.id);
      const profile = await sessionProfile(page);
      expect(profile?.name).toBe('Grace Liu');
      expect(profile?.role).toBe('pathologist');
      await openScreen(page, '/quality-assurance', 'Quality Assurance');
      await signOut(page);
    });
  });
});
