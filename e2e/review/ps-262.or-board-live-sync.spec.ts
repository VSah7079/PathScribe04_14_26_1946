// e2e/review/ps-262.or-board-live-sync.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-262 — "OR Suite Live Board — Real-Time Multi-Board Sync (WebSocket/
// SignalR push backend needed)": the review test plan, run against the demo
// (Vite dev server, localStorage data) as Pete Nimmo. Delivered: the browser
// side (SignalR client, status badge, same-computer sync); the server hub is
// still to be built.
//
// Expected (ticket): boards on the same computer update each other in under
// a second today; true multi-device push waits on the server hub.
//
//   1. Open the OR Suite Live Board (/or-suite-dashboard) in two windows,
//      each bound to the same OR Suite Terminal.                    automated
//      Two pages of one browser context: the first binds the terminal
//      (OR-Suite-Theatre2, the first offered), the second opens already
//      bound to it (the binding is a workstation setting).
//   2. The header badge reads "Local updates" (no live-update server in the
//      demo).                                                        automated
//   3. Start demo, then dismiss a case on one window (Dismiss case → PIN →
//      Confirm & dismiss).                                           automated
//      The demo has no OR staff member with a PIN, so the test gives Lisa
//      Hoffman the "Or Staff" role and PIN 4826 on the Staff screen.
//      FAILS (app bug, reported; test "Step 3 as a reviewer would set it
//      up"): that PIN is refused with "This PIN does not belong to OR
//      staff." — the Staff screen stores role NAMES ("Or Staff") and
//      resolveStaffByQuickAuthPin checks the role ID ('or-staff'), so no
//      staff member set up on screen can ever dismiss a case or log a verbal
//      report. To still review the sync (steps 4–5), the second test then
//      adds the role ID 'or-staff' to that stored staff record directly.
//   4. The other window: the row clears within about a second, not after 15
//      seconds.                                                      automated
//      Asserted: the row leaves the second window's page at most 1.5 s after
//      the Confirm & dismiss click lands in the first (both timed in the
//      browser; the dismissing window itself plays a 400 ms exit first); the
//      measured time is attached to the test result.
//   5. The Intraop Queue (/intraop-queue, titled "Intraoperative Entries")
//      in a third window shows the same badge and follows changes without a
//      reload: opened before Start demo, its log count goes from 3 to 7 when
//      the board seeds the demo's four sessions.                    automated
//   6. With the ASP.NET SignalR hub built: the badge reads "Live", and a
//      dropped connection shows "Reconnecting…" then "Live" with no reload.
//      needs a person / server: the hub (phase 2e) does not exist yet.
//   7. `npx vitest run src/services/liveUpdates/liveUpdates.test.ts
//      src/services/liveUpdates/signalRProtocol.integration.test.ts` — CLI,
//      outside this spec.
//
// Texts are the English values of orSuiteDashboard.*, liveUpdates.status.*,
// intraopQueue.page.* and staffTab.modal.* in src/i18n/locales/en.json;
// selectors are the app's own .ps-orboard-* / .ps-intraop-* / .ps-st-*
// classes.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5304 npx playwright test --project=chromium \
//        e2e/review/ps-262.or-board-live-sync.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';
import { signIn } from './helpers';

const T = {
  localUpdates: 'Local updates',                                   // liveUpdates.status.local
  startDemo: 'Start demo',                                         // orSuiteDashboard.startDemo
  dismissCase: 'Dismiss case',                                     // orSuiteDashboard.dismissCase
  enterPin: 'Enter your 4-digit PIN to dismiss this case.',        // orSuiteDashboard.enterPinDismiss
  continue: 'Continue',                                            // orSuiteDashboard.continue
  confirmTitle: 'Confirm dismissal',                               // orSuiteDashboard.confirmDismissalTitle
  readback: 'Verbal result read-back confirmed with the surgical team', // orSuiteDashboard.readbackConfirmedLabel
  confirmAndDismiss: 'Confirm & dismiss',                          // orSuiteDashboard.confirmAndDismiss
  pinInvalidRole: 'This PIN does not belong to OR staff.',         // orSuiteDashboard.pinInvalidRole
  queueTitle: 'Intraoperative Entries',                            // intraopQueue.page.title
  rolePlaceholder: 'Select a role...',                             // staffTab.modal.rolePlaceholder
  orStaffRole: 'Or Staff',                                         // built-in role name (mockRoleService)
  saveChanges: 'Save Changes',                                     // staffTab.modal.saveChanges
};

const NURSE = { name: 'Lisa Hoffman', id: '8' };   // demo staff member given the OR role and a PIN here
const PIN = '4826';
const USERS_KEY = 'pathscribe_mock_pathscribe_users';
const TERMINAL = 'OR-Suite-Theatre2';
const DISMISSABLE = 'O’Neill, Declan';             // the demo's one completed (dismissable) case

/** Staff → edit Lisa Hoffman → add the "Or Staff" role and Quick Auth PIN 4826 → Save Changes. */
async function giveNurseOrRoleAndPin(page: Page) {
  await page.goto('/configuration?tab=staff&section=members');
  await expect(page.locator('.ps-st-tab--active')).toBeVisible({ timeout: 120_000 });
  await page.locator('.ps-st-search').fill(NURSE.name);
  await page.locator('.ps-st-tr').filter({ hasText: NURSE.name }).first().locator('.ps-st-edit-btn').click();
  const editor = page.locator('.ps-conf-modal').filter({ has: page.locator('.ps-st-modal-header') });
  await expect(editor).toBeVisible();
  await editor.locator('.ps-dropdown-trigger').filter({ hasText: T.rolePlaceholder }).click();
  await editor.locator('.ps-dropdown-option').filter({ hasText: new RegExp(`^${T.orStaffRole}$`) }).click();
  await editor.locator('#staff-quick-auth-pin').fill(PIN);
  await editor.getByRole('button', { name: T.saveChanges, exact: true }).click();
  await expect(editor).toHaveCount(0);
  const stored = await page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key) ?? '[]').find((u: { id: string }) => u.id === id), { key: USERS_KEY, id: NURSE.id });
  expect(stored?.quickAuthPin, 'the PIN is saved').toBe(PIN);
  expect(stored?.roles, 'the role is saved (by name)').toContain(T.orStaffRole);
}

/** Opens the board; binds it to the OR-Suite-Theatre2 terminal when the computer has none yet. */
async function openBoard(page: Page, bind: boolean) {
  await page.goto('/or-suite-dashboard');
  if (bind) {
    const select = page.locator('.ps-orboard-setup-select');
    await expect(select.locator('option', { hasText: TERMINAL })).toHaveCount(1, { timeout: 120_000 });
    await select.selectOption({ label: TERMINAL });
  }
  await expect(page.locator('.ps-orboard-header-name')).toHaveText(TERMINAL, { timeout: 120_000 });
}

/** Dismiss case → PIN → Continue; returns the open dismissal window. */
async function dismissWithPin(page: Page, patient: string) {
  const row = page.locator('.ps-orboard-row').filter({ hasText: patient });
  await row.getByRole('button', { name: T.dismissCase, exact: true }).click();
  const modal = page.locator('.ps-orboard-modal');
  await expect(modal).toBeVisible();
  await modal.getByLabel(T.enterPin, { exact: true }).fill(PIN);
  await modal.getByRole('button', { name: T.continue, exact: true }).click();
  return modal;
}

test.describe('PS-262 OR Suite Live Board sync between windows', () => {
  test.beforeEach(async ({ page }) => {
    // No call leaves the machine: anything not served by the local dev server is refused, and the AI
    // service (vite's /api/ai proxy, which would call out) is answered here.
    await page.context().route(u => u.hostname !== 'localhost', r => r.abort());
    await page.context().route('**/api/ai/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: '{}' }], candidates: [] }) }));
    await signIn(page);
  });

  test('Step 3 as a reviewer would set it up: an OR staff member given a PIN on the Staff screen can dismiss a case', async ({ page }) => {
    test.setTimeout(300_000);
    await test.step('3. Staff screen: Lisa Hoffman gets "Or Staff" and PIN 4826; board → Start demo → Dismiss case → PIN → the confirmation', async () => {
      await giveNurseOrRoleAndPin(page);
      await openBoard(page, true);
      await page.getByRole('button', { name: T.startDemo, exact: true }).click();
      const modal = await dismissWithPin(page, DISMISSABLE);
      // The window either moves on to "Confirm dismissal" or shows its refusal; it must be the former.
      await expect.poll(async () => (await modal.locator('.ps-orboard-error').count())
        ? (await modal.locator('.ps-orboard-error').textContent())?.trim()
        : (await modal.locator('.ps-orboard-modal-title').textContent())?.trim(), { message: 'the PIN is accepted', timeout: 15_000 })
        .toBe(T.confirmTitle);
    });
  });

  test('Steps 1–5: two boards on the same terminal update each other within a second; the Intraop Queue follows', async ({ page, context }) => {
    test.setTimeout(300_000);
    let boardB: Page;
    let queue: Page;

    await test.step('Setup: an OR staff member with a PIN (Staff screen, plus the role ID the PIN check needs — see the header)', async () => {
      await giveNurseOrRoleAndPin(page);
      await page.evaluate(({ key, id }) => {
        const users = JSON.parse(localStorage.getItem(key) ?? '[]');
        users.find((u: { id: string }) => u.id === id).roles.push('or-staff');
        localStorage.setItem(key, JSON.stringify(users));
      }, { key: USERS_KEY, id: NURSE.id });
    });

    await test.step('1. The board in two windows, both bound to the same OR Suite Terminal', async () => {
      await openBoard(page, true); // a full load, so the app reads the staff record just stored
      boardB = await context.newPage();
      await openBoard(boardB, false);
    });

    await test.step('2. The header badge reads "Local updates" on both', async () => {
      await expect(page.locator('.ps-orboard-live-badge')).toHaveText(T.localUpdates);
      await expect(boardB.locator('.ps-orboard-live-badge')).toHaveText(T.localUpdates);
    });

    await test.step('5a. A third window: the Intraop Queue shows the same badge and its log before the demo', async () => {
      queue = await context.newPage();
      await queue.goto('/intraop-queue');
      await expect(queue.locator('h1.ps-intraop-page-title')).toHaveText(T.queueTitle, { timeout: 120_000 });
      await expect(queue.locator('.ps-intraop-header-actions .ps-live-badge')).toHaveText(T.localUpdates);
      await expect(queue.locator('.ps-intraop-list > *'), 'the demo log before Start demo').toHaveCount(3);
    });

    await test.step('3. Start demo, then dismiss the completed case on the first window (Dismiss case → PIN → Confirm & dismiss)', async () => {
      await page.getByRole('button', { name: T.startDemo, exact: true }).click();
      await expect(page.locator('.ps-orboard-row'), 'four demo cases').toHaveCount(4);
      await expect(boardB.locator('.ps-orboard-row'), 'the other board shows them too').toHaveCount(4);
      await expect(boardB.locator('.ps-orboard-row').filter({ hasText: DISMISSABLE })).toHaveCount(1);
      const modal = await dismissWithPin(page, DISMISSABLE);
      await expect(modal.locator('.ps-orboard-modal-title'), 'the PIN is accepted').toHaveText(T.confirmTitle);
      await modal.getByLabel(T.readback).check();
    });

    await test.step('4. The other window: the row clears within about a second, not after 15 seconds', async () => {
      // Timed inside the browser (both windows share the computer's clock): the moment the Confirm click
      // lands in the first window, and the moment the row leaves the second window's DOM.
      await page.evaluate(() => {
        document.addEventListener('click', e => {
          if ((e.target as Element).closest('.ps-orboard-confirm-dismiss-btn')) (window as unknown as { __e2eClickAt: number }).__e2eClickAt = Date.now();
        }, true);
      });
      await boardB.evaluate((patient) => {
        const w = window as unknown as { __e2eGoneAt?: number };
        const rowThere = () => Array.from(document.querySelectorAll('.ps-orboard-row')).some(r => r.textContent?.includes(patient));
        new MutationObserver((_, obs) => { if (!rowThere()) { w.__e2eGoneAt = Date.now(); obs.disconnect(); } })
          .observe(document.body, { childList: true, subtree: true });
      }, DISMISSABLE);
      await page.locator('.ps-orboard-modal').getByRole('button', { name: T.confirmAndDismiss, exact: true }).click();
      const rowOnB = boardB.locator('.ps-orboard-row').filter({ hasText: DISMISSABLE });
      await expect(rowOnB, 'gone from the other window').toHaveCount(0, { timeout: 15_000 });
      const clickAt = await page.evaluate(() => (window as unknown as { __e2eClickAt: number }).__e2eClickAt);
      const goneAt = await boardB.evaluate(() => (window as unknown as { __e2eGoneAt: number }).__e2eGoneAt);
      const ms = goneAt - clickAt;
      test.info().annotations.push({ type: 'other window cleared after', description: `${ms} ms` });
      expect(ms, 'cleared within about a second of Confirm & dismiss (well under the 15 s poll)').toBeLessThanOrEqual(1_500);
      await expect(page.locator('.ps-orboard-row').filter({ hasText: DISMISSABLE }), 'and from this window').toHaveCount(0);
      await expect(boardB.locator('.ps-orboard-row')).toHaveCount(3);
    });

    await test.step('5b. The Intraop Queue followed the demo without a reload', async () => {
      await expect(queue.locator('.ps-intraop-list > *'), 'the four demo sessions arrived').toHaveCount(7);
      await expect(queue.locator('.ps-intraop-header-actions .ps-live-badge')).toHaveText(T.localUpdates);
      await queue.close();
      await boardB.close();
    });
  });
});
