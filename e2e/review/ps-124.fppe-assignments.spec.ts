// e2e/review/ps-124.fppe-assignments.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-124 — "Migrate FppeAssignmentsSection.tsx's admin list view off the legacy
// FppeAssignment system, then retire it": the review test plan, run against the
// demo (Vite dev server, localStorage data).
//
// Review steps (each is a test.step below):
//   1. automated — Sign in as Pete and open Configuration → Staff → Credentialing
//      Review → FPPE Assignments.
//   2. automated — The seeded assignments show: Oliver Pemberton (active, GI),
//      Paul Carter (completed by case count), Michelle Nimmo (graduated early).
//   3. automated — New FPPE Assignment, create one; it appears in the list
//      straight away.
//   4. automated — Graduate Now on an active assignment; it moves to the
//      completed list.
//   5. automated — Quality Assurance → FPPE tracking and Audit Log → FPPE log
//      show the same assignments.
//   6. automated — A test role with only "Manage FPPE assignments" (not
//      cytotech competency); signed in as it, step 3 is allowed.
//
// Expected (ticket): the list, create and graduate all use one system;
// FPPE-only managers are no longer silently refused; no type-definition editing
// on this screen (stays in QA Configuration Center).
//
// Needs a person: none.
//
// Where the demo differs from the steps as written:
//   • Step 5: the Quality Assurance tile is "📜 Credentialing Review" (Operations
//     pillar), not "FPPE tracking"; the Audit Log has no "FPPE log": it is
//     Audit Log → ✓ Quality Assurance, group "Credentialing Review".
//   • Step 6: the ticket says "Role Dictionary" and "sign in as it" without
//     saying how. The test adds a role "E2E FPPE Manager" from + Add Role with
//     Config Access ticked and two capabilities: "Manage FPPE assignments" and
//     "Open Configuration" (screen:configuration:open). The second is needed
//     because the Configuration route itself is gated on it (ScreenGate
//     screen="configuration"); with "Manage FPPE assignments" alone the person
//     can't reach the screen at all. Thomas Van Nguyen (seeded, no demo
//     sign-in) is given only that role and a staff password the test sets, signs
//     in on the real sign-in page, and creates an assignment. Clean-up removes
//     the password and resets the role/staff/assignment demo keys.
//   • Step 4 graduates Oliver Pemberton (the only seeded active assignment).
//
// The staff-editor and password steps use local copies of the helpers'
// openStaffEditor / setStaffPassword / removeStaffPassword that wait up to 60 s
// for the Configuration page (helpers.openScreen allows 20 s, which a busy
// machine outlasted). No external call is needed by any step; the app's
// background Firestore and Gemini-proxy requests fail offline and are left alone.
//
// Texts are the English values of fppeAssignmentsSection.*,
// qualityAssurance.tiles.*, auditLog.*, roleDictionary.*, capabilities.items.*
// and configViewOnly.* in src/i18n/locales/en.json; selectors are the app's own
// .ps-* classes and ids (components/Config/System/FppeAssignmentsSection.tsx,
// components/QualityAssurance/FppeTrackingTab.tsx, pages/AuditLogPage.tsx,
// components/Config/Staff/RoleDictionary.tsx, RoleCapabilitiesTab.tsx).
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5302 npx playwright test --project=chromium \
//        e2e/review/ps-124.fppe-assignments.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Locator, type Page } from '@playwright/test';
import {
  signIn, startSession, passwordPanel,
  closeStaffEditor, clickEvenOffscreen, signInWithPassword, signOut, sessionProfile, clearDemoKeys, DEMO_KEYS,
} from './helpers';

/** Opens a page and waits for its heading (a cold first load under a busy machine can outlast helpers.openScreen's 20 s). */
async function openPage(page: Page, path: string, heading: string) {
  await page.goto(path);
  await expect(page.locator('h1, h2').filter({ hasText: heading }).first()).toBeVisible({ timeout: 60_000 });
}

const T = {
  title: 'FPPE Assignments',                               // fppeAssignmentsSection.title
  newButton: '+ New FPPE Assignment',                      // "+ " + fppeAssignmentsSection.newAssignmentButton
  create: 'Create Assignment',                             // fppeAssignmentsSection.form.createButton
  graduate: 'Graduate Now',                                // fppeAssignmentsSection.table.graduateButton
  active: (n: number) => `Active (${n})`,                  // fppeAssignmentsSection.banners.active
  completed: (n: number) => `Completed (${n})`,            // fppeAssignmentsSection.banners.completed
  reasonCaseCount: 'Case count reached',                   // fppeAssignmentsSection.form.endConditionCaseCount
  reasonGraduated: 'Graduated early',                      // fppeAssignmentsSection.table.completedReason.graduatedEarly
  credentialingTab: 'Credentialing Review',                // staffTab.tabs.credentialing
  qaTile: '📜 Credentialing Review',                       // qualityAssurance.tiles.credentialingReview
  auditQualityTab: '✓ Quality Assurance',                  // auditLog.tabs.quality
  auditGroup: 'Credentialing Review',                      // auditLog.groupLabels.fppe
  statusActive: 'Active',                                  // auditLog.statusLabels.active
  statusCompleted: 'Completed',                            // auditLog.statusLabels.completed
  capFppe: 'Manage FPPE assignments',                      // capabilities.items.configFppeManage.label
  capCytotech: 'Manage cytotechnologist competency',       // capabilities.items.configCytotechCompetencyManage.label
  capOpenConfig: 'Open Configuration',                     // capabilities.items.screenConfigurationOpen.label
  groupConfigQuality: 'Configuration: results, reporting and quality', // capabilities.groups.configQuality
  groupScreens: 'Screens: what each role can open',        // capabilities.groups.screens
  addRole: '+ Add Role',                                   // roleDictionary.list.addRoleButton
  addRoleSave: 'Add Role',                                 // roleDictionary.modal.addRole
  configAccess: 'Config Access',                           // roleDictionary.modal.configAccess
};

// People (src/services/users/mockUserService.ts).
const THOMAS = { name: 'Thomas Van Nguyen', id: '7', email: 'tnguyen@hospital.org' }; // Pathologist; no demo sign-in
const PW_THOMAS = 'Heron-Basalt-Juniper-4471';
const ROLE = 'E2E FPPE Manager';
// Seeded assignments (src/services/quality/mockQaSupervisionAssignmentService.ts).
const SEED = { oliver: 'Oliver Pemberton', paul: 'Paul Carter', michelle: 'Michelle Nimmo', proctor: 'Pete Nimmo' };

const SUPERVISION_KEY = 'pathscribe_mock_qa_supervision_assignments';
const CLEAN_KEYS = [DEMO_KEYS.staffPasswords, DEMO_KEYS.users, DEMO_KEYS.roles, SUPERVISION_KEY];

/** The FPPE Assignments section (its own header, form and two tables). */
const fppeSection = (page: Page) => page.locator('div').filter({ has: page.locator('h2.ps-defic-page-title', { hasText: T.title }) }).last();
/** A table under a banner ("Active (n)" / "Completed (n)"): the .ps-conf-table-wrap following it. */
const tableAfter = (page: Page, banner: RegExp) =>
  page.locator('.ps-defic-review-banner').filter({ hasText: banner }).locator('xpath=following-sibling::div[contains(@class,"ps-conf-table-wrap")][1]');
const activeTable = (page: Page) => tableAfter(page, /^Active \(\d+\)$/);
const completedTable = (page: Page) => tableAfter(page, /^Completed \(\d+\)$/);
const rowOf = (table: Locator, name: string) => table.locator('tbody tr').filter({ has: table.page().locator('td', { hasText: new RegExp(`^${name}$`) }) });

async function openFppeAssignments(page: Page) {
  await openPage(page, '/configuration?tab=staff&section=credentialing', 'Configuration');
  await expect(page.locator('.ps-st-tab--active')).toHaveText(T.credentialingTab);
  await expect(page.locator('h2.ps-defic-page-title', { hasText: T.title })).toBeVisible({ timeout: 20_000 });
}

/** Opens the form, fills it and clicks Create Assignment. */
async function createAssignment(page: Page, who: { provisional: string; proctor: string; caseCount: string }) {
  await page.getByRole('button', { name: T.newButton, exact: true }).click();
  await page.locator('#fppe-provisional').selectOption({ label: who.provisional });
  await page.locator('#fppe-proctor').selectOption({ label: who.proctor });
  const facility = page.locator('#fppe-facility');
  const labs = await facility.locator('option').evaluateAll(os => os.map(o => ({ v: (o as HTMLOptionElement).value, l: o.textContent ?? '' })).filter(o => o.v));
  expect(labs[0], 'the demo has a performing lab to pick').toBeDefined();
  await facility.selectOption(labs[0].v);
  await page.locator('#fppe-end-condition').selectOption('case_count');
  await page.getByLabel('Case count threshold', { exact: true }).fill(who.caseCount);
  const create = page.getByRole('button', { name: T.create, exact: true });
  await expect(create).toBeEnabled();
  await create.click();
  return labs[0].l;
}

/**
 * The helpers' openStaffEditor / setStaffPassword / removeStaffPassword, with the
 * page load waited for up to 60 s (openPage) instead of helpers.openScreen's 20 s:
 * on a busy machine the Configuration page's reload can take longer.
 */
async function openStaffEditor(page: Page, name: string): Promise<Locator> {
  await openPage(page, '/configuration?tab=staff&section=members', 'Configuration');
  await expect(page.locator('.ps-st-tab--active')).toBeVisible({ timeout: 20_000 });
  await page.locator('.ps-st-search').fill(name);
  const row = page.locator('.ps-st-tr').filter({ hasText: name }).first();
  await expect(row, `a staff row for ${name}`).toBeVisible({ timeout: 15_000 });
  await row.locator('.ps-st-edit-btn').click();
  const editor = page.locator('.ps-conf-modal').filter({ has: page.locator('.ps-st-modal-header') });
  await expect(editor).toBeVisible({ timeout: 10_000 });
  return editor;
}
async function setStaffPassword(page: Page, name: string, password: string): Promise<{ editor: Locator; message: string }> {
  const editor = await openStaffEditor(page, name);
  const panel = passwordPanel(editor);
  await panel.getByRole('button', { name: /^(Set password|Reset password)$/ }).click();
  const form = panel.locator('.ps-st-password-form');
  await expect(form).toBeVisible();
  await form.locator('input[id^="pw-new-"]').fill(password);
  await form.locator('input[id^="pw-confirm-"]').fill(password);
  const mustChange = form.locator('input[type="checkbox"]');
  await mustChange.uncheck(); // "must choose a new one at next sign-in": off, so the sign-in below goes straight in
  await expect(mustChange).not.toBeChecked();
  await form.getByRole('button', { name: 'Save password', exact: true }).click();
  const message = panel.locator('[role="status"]');
  await expect(message).toBeVisible({ timeout: 20_000 });
  return { editor, message: (await message.textContent())?.trim() ?? '' };
}
async function removeStaffPassword(page: Page, name: string): Promise<{ editor: Locator; message: string }> {
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

/** Changes a staff member's roles in their editor: removes `remove`, adds `add`, saves (as in ps-363-368). */
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
test.describe('PS-124: FPPE Assignments read and write the QA supervision system only', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });
  test.afterEach(async ({ page }) => { await clearDemoKeys(page, CLEAN_KEYS); });

  test('Steps 1–5: seeded list; create appears at once; Graduate Now moves it; QA tracking and the Audit Log show the same', async ({ page }) => {
    test.setTimeout(240_000);
    let lab = '';

    await test.step('1. Sign in as Pete and open Configuration → Staff → Credentialing Review → FPPE Assignments', async () => {
      await openFppeAssignments(page);
      await expect(fppeSection(page).locator('.ps-config-viewonly-note'), 'Pete can change it (not view only)').toHaveCount(0);
      // Instance-only: no activity-type definition editing on this screen (stays in QA Configuration Center).
      await expect(fppeSection(page).getByRole('button', { name: /activity type|duplicate/i })).toHaveCount(0);
    });

    await test.step('2. Seeded: Oliver Pemberton (active, GI), Paul Carter (completed by case count), Michelle Nimmo (graduated early)', async () => {
      await expect(page.locator('.ps-defic-review-banner').filter({ hasText: /^Active/ }).first()).toHaveText(T.active(1));
      await expect(page.locator('.ps-defic-review-banner').filter({ hasText: /^Completed/ }).first()).toHaveText(T.completed(2));
      const oliver = rowOf(activeTable(page), SEED.oliver);
      await expect(oliver).toHaveCount(1);
      await expect(oliver.locator('td').nth(1)).toHaveText(SEED.proctor);
      await expect(oliver.locator('td').nth(3), 'scope GI').toHaveText('Gastrointestinal');
      await expect(oliver.locator('td').nth(4)).toHaveText('12 / 20 cases');
      const paul = rowOf(completedTable(page), SEED.paul);
      await expect(paul.locator('td').nth(3), 'cases reviewed').toHaveText('20');
      await expect(paul.locator('td').nth(5)).toHaveText(T.reasonCaseCount);
      const michelle = rowOf(completedTable(page), SEED.michelle);
      await expect(michelle.locator('td').nth(3)).toHaveText('14');
      await expect(michelle.locator('td').nth(5)).toHaveText(T.reasonGraduated);
    });

    await test.step('3. New FPPE Assignment: Kevin Park proctored by Aisha Patel; it appears in the active list straight away', async () => {
      lab = await createAssignment(page, { provisional: 'Kevin Park', proctor: 'Aisha Patel', caseCount: '15' });
      const row = rowOf(activeTable(page), 'Kevin Park');
      await expect(row, 'listed without a reload').toHaveCount(1);
      await expect(row.locator('td').nth(1)).toHaveText('Aisha Patel');
      await expect(row.locator('td').nth(2)).toHaveText(lab);
      await expect(row.locator('td').nth(4)).toHaveText('0 / 15 cases');
      await expect(page.locator('.ps-defic-review-banner').filter({ hasText: /^Active/ }).first()).toHaveText(T.active(2));
      await expect(page.locator('.ps-config-refusal'), 'no refusal').toHaveCount(0);
      // Written to the QA supervision store (the only store left).
      const stored = await page.evaluate((k) => (JSON.parse(localStorage.getItem(k) ?? '[]') as { superviseeUserName: string; activityTypeId: string }[])
        .filter(a => a.superviseeUserName === 'Kevin Park').map(a => a.activityTypeId), SUPERVISION_KEY);
      expect(stored).toEqual(['qa-activity-fppe-credentialing']);
      // And still there after a reload.
      await openFppeAssignments(page);
      await expect(rowOf(activeTable(page), 'Kevin Park')).toHaveCount(1);
    });

    await test.step('4. Graduate Now on Oliver Pemberton: he moves to the completed list as "Graduated early"', async () => {
      await rowOf(activeTable(page), SEED.oliver).getByRole('button', { name: T.graduate, exact: true }).click();
      await expect(rowOf(activeTable(page), SEED.oliver)).toHaveCount(0);
      const done = rowOf(completedTable(page), SEED.oliver);
      await expect(done).toHaveCount(1);
      await expect(done.locator('td').nth(3)).toHaveText('12');
      await expect(done.locator('td').nth(5)).toHaveText(T.reasonGraduated);
      await expect(page.locator('.ps-defic-review-banner').filter({ hasText: /^Active/ }).first()).toHaveText(T.active(1));
      await expect(page.locator('.ps-defic-review-banner').filter({ hasText: /^Completed/ }).first()).toHaveText(T.completed(3));
    });

    await test.step('5a. Quality Assurance → Credentialing Review shows the same assignments', async () => {
      await openPage(page, '/quality-assurance', 'Quality Assurance');
      await page.locator('.ps-wl-filter-tile').filter({ hasText: T.qaTile }).click();
      const tiles = page.locator('.ps-qa-summary-tiles .ps-qa-tile');
      await expect(tiles.nth(0).locator('.ps-qa-tile-value'), 'active').toHaveText('1', { timeout: 20_000 });
      await expect(tiles.nth(1).locator('.ps-qa-tile-value'), 'completed').toHaveText('3');
      await expect(rowOf(activeTable(page), 'Kevin Park')).toHaveCount(1);
      await expect(rowOf(activeTable(page), 'Kevin Park').locator('td').nth(1)).toHaveText('Aisha Patel');
      for (const name of [SEED.oliver, SEED.paul, SEED.michelle]) await expect(rowOf(completedTable(page), name), name).toHaveCount(1);
      await expect(rowOf(completedTable(page), SEED.oliver).locator('td').nth(4)).toHaveText(T.reasonGraduated);
    });

    await test.step('5b. Audit Log → Quality Assurance → Credentialing Review shows the same four, with their status', async () => {
      await openPage(page, '/audit?tab=quality', 'System Logs');
      await page.getByRole('combobox', { name: 'Filter by group' }).selectOption({ label: T.auditGroup });
      const rows = page.locator('.ps-auditlog-row--quality');
      await expect(rows).toHaveCount(4);
      const rowFor = (name: string) => rows.filter({ has: page.locator('.ps-auditlog-cell-detail', { hasText: new RegExp(`^${name} \\(`) }) });
      const status = (name: string) => rowFor(name).locator('.ps-auditlog-status-badge');
      const detail = (name: string) => rowFor(name).locator('.ps-auditlog-cell-detail');
      await expect(status('Kevin Park')).toHaveText(T.statusActive);
      await expect(detail('Kevin Park')).toHaveText('Kevin Park (proctor: Aisha Patel) — 0 cases reviewed');
      await expect(status(SEED.oliver)).toHaveText(T.statusCompleted);
      await expect(detail(SEED.oliver)).toHaveText(`${SEED.oliver} (proctor: ${SEED.proctor}) — 12 cases reviewed`);
      await expect(status(SEED.paul)).toHaveText(T.statusCompleted);
      await expect(status(SEED.michelle)).toHaveText(T.statusCompleted);
    });
  });

  test('Step 6: a role with only "Manage FPPE assignments" (no cytotech competency) can create an assignment', async ({ page }) => {
    test.setTimeout(300_000);

    await test.step('6a. As Pete: Role Dictionary → + Add Role "E2E FPPE Manager", Config Access, only Manage FPPE assignments (+ Open Configuration)', async () => {
      // openPage, not helpers.openStaffScreen: the first (cold) load of a new browser context can outlast its 20 s.
      await openPage(page, '/configuration?tab=staff&section=roles', 'Configuration');
      await expect(page.locator('.ps-st-tab--active')).toHaveText('Role Dictionary');
      await page.getByRole('button', { name: T.addRole, exact: true }).click();
      const modal = page.locator('.fm-modal--config');
      await expect(modal).toBeVisible();
      await modal.getByPlaceholder('Role name').fill(ROLE);
      await modal.locator('.ps-rd-access-label').filter({ hasText: T.configAccess }).locator('input[type="checkbox"]').check();
      await modal.locator('.ps-rd-cat-item').filter({ hasText: T.groupConfigQuality }).click();
      const fppe = modal.locator('.ps-rd-action-item[data-capability="config:fppe:manage"]');
      await expect(fppe).toContainText(T.capFppe);
      await fppe.click();
      await expect(fppe).toHaveClass(/ps-rd-action-item--granted/);
      await expect(modal.locator('.ps-rd-action-item[data-capability="config:cytotech-competency:manage"]'), 'cytotech competency not granted')
        .toHaveClass(/ps-rd-action-item--default/);
      await modal.locator('.ps-rd-cat-item').filter({ hasText: T.groupScreens }).click();
      const openConfig = modal.locator('.ps-rd-action-item[data-capability="screen:configuration:open"]');
      await expect(openConfig).toContainText(T.capOpenConfig);
      await openConfig.click();
      await expect(openConfig).toHaveClass(/ps-rd-action-item--granted/);
      await modal.getByRole('button', { name: T.addRoleSave, exact: true }).click();
      await expect(modal).toHaveCount(0, { timeout: 15_000 });
      await expect(page.locator('.ps-rd-tr').filter({ hasText: ROLE })).toHaveCount(1);
      // Exactly those two capabilities were stored.
      const caps = await page.evaluate(([k, name]) => (JSON.parse(localStorage.getItem(k) ?? '[]') as { name: string; capabilities?: string[] }[])
        .find(r => r.name === name)?.capabilities ?? null, [DEMO_KEYS.roles, ROLE] as const);
      expect([...(caps ?? [])].sort()).toEqual(['config:fppe:manage', 'screen:configuration:open']);
    });

    await test.step('6b. Thomas Van Nguyen (no demo sign-in) gets only that role, and a staff password', async () => {
      await setStaffRoles(page, THOMAS.name, { remove: ['Pathologist'], add: [ROLE] });
      const { editor, message } = await setStaffPassword(page, THOMAS.name, PW_THOMAS);
      expect(message).toBe('Password saved.');
      await closeStaffEditor(editor);
    });

    await test.step('6c. Signed in as Thomas: FPPE Assignments is editable, cytotech competency is view only', async () => {
      await signOut(page);
      expect(await signInWithPassword(page, THOMAS.email, PW_THOMAS)).toEqual({ outcome: 'signedIn' });
      const profile = await sessionProfile(page);
      expect(profile?.id).toBe(THOMAS.id);
      expect(profile?.role, 'configuration access only').toBe('admin');
      await openFppeAssignments(page);
      const notes = page.locator('.ps-config-viewonly-note');
      await expect(notes, 'one section is view only: cytotech competency').toHaveCount(1);
      await expect(notes.first()).toContainText(T.capCytotech);
      await expect(fppeSection(page).locator('.ps-config-viewonly-note'), 'FPPE is not view only').toHaveCount(0);
    });

    await test.step('6d. Repeat step 3 as Thomas: the new assignment is created and listed; nothing is refused', async () => {
      const lab = await createAssignment(page, { provisional: 'Kevin Park', proctor: 'Aisha Patel', caseCount: '15' });
      const row = rowOf(activeTable(page), 'Kevin Park');
      await expect(row, 'created and listed').toHaveCount(1);
      await expect(row.locator('td').nth(2)).toHaveText(lab);
      await expect(page.locator('.ps-config-refusal'), 'no refusal banner').toHaveCount(0);
      const stored = await page.evaluate((k) => (JSON.parse(localStorage.getItem(k) ?? '[]') as { superviseeUserName: string }[])
        .filter(a => a.superviseeUserName === 'Kevin Park').length, SUPERVISION_KEY);
      expect(stored, 'saved in the QA supervision store').toBe(1);
      // Graduate works for the FPPE-only role too.
      await row.getByRole('button', { name: T.graduate, exact: true }).click();
      await expect(rowOf(completedTable(page), 'Kevin Park')).toHaveCount(1);
      await expect(page.locator('.ps-config-refusal')).toHaveCount(0);
    });

    await test.step('Clean up: back as Pete, remove Thomas\'s password; role, staff and assignment keys are reset', async () => {
      await signOut(page);
      await startSession(page);
      const { editor, message } = await removeStaffPassword(page, THOMAS.name);
      expect(message).toBe('Password removed.');
      await closeStaffEditor(editor);
      await clearDemoKeys(page, CLEAN_KEYS);
    });
  });
});
