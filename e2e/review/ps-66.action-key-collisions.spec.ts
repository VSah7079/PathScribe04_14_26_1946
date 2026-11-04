// e2e/review/ps-66.action-key-collisions.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-66 — "10 action-key collisions between systemActions.ts and
// mockActionRegistryService.ts, some may be duplicate action definitions".
// The review test plan, run against the demo (Vite dev server, localStorage
// data) as Pete Nimmo.
//
// Expected (ticket): every listed action is present and works, no two actions
// clash, and the automated collision test passes.
//
//   1. Sign in as Pete Nimmo and open Configuration → Action Registry.
//                                                                   automated
//   2. Find the synoptic actions Confirm Field, Next Unanswered, Next Required
//      and Enter Addendum, and the grossing actions Next Block, Previous Block,
//      Mark Grossed and Confirm Triage.                             automated
//   3. Each still lists its shortcut/voice trigger, and Skip Field, Full View
//      and Tabbed View are still there as separate actions.         automated
//      (Each row's shortcut and voice triggers are checked exactly, and no two
//      Synoptic actions share a shortcut.)
//   4. Open a case with a synoptic report and use the Next Unanswered and
//      Confirm Field shortcuts; they act as before.                 automated
//      (S26-4408: Ctrl+Alt+U moves to and focuses the next unanswered field;
//      Ctrl+Alt+Shift+A on a field with an AI suggestion should confirm it.)
//   5. `npx vitest run src/services/actionRegistry/mockActionRegistryService.test.ts`
//      — automated by vitest, run on Oct 15, 2026 before this spec was
//      written: 1 file, 8 tests, all passed.
//   6. The 16 older duplicate keys inside systemActions.ts need a follow-up
//      ticket — a note, not a review step (nothing to test).
//
// Where the demo differs from the ticket's wording (checked against the app):
//   - The registry labels are "Next Unanswered Field", "Next Required Field"
//     and "Mark Block Grossed" (not "Next Unanswered", "Next Required",
//     "Mark Grossed").
//   - The four grossing actions sit in the registry's Synoptic category (the
//     Grossing category holds other actions), so all eleven are under the
//     Synoptic filter.
//   - internalKeys are not shown anywhere on screen (the CSV export has id,
//     label, category, shortcut and triggers only), so "no two actions clash"
//     is checked on screen as distinct rows with distinct shortcuts; the key
//     collision itself is step 5's vitest.
//
// Nothing on this ticket needs a person.
//
// No internet: the app's AI calls through the Vite dev proxy (/api/ai/…, e.g. the
// top bar's voice-model check on every screen) are answered by the test.
//
// Texts are the English values of configuration.tabs.*, actionsTab.* and
// rightSynopticPanel.fieldRow.* in src/i18n/locales/en.json; selectors are the
// app's own .ps-actionstab-* and .ps-syn-* classes.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5301 npx playwright test --project=chromium \
//        e2e/review/ps-66.action-key-collisions.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { DEMO_USERS } from './helpers';

const T = {
  configuration: 'Configuration',              // configuration.title
  actionsTab: 'Action Registry',               // configuration.tabs.actions
  registryTitle: 'System Action Registry',     // actionsTab.header.title
  synopticFilter: 'Synoptic',                  // the SYNOPTIC category, title-cased by the tab
  aiConfirmed: '✓ AI Confirmed',               // rightSynopticPanel.fieldRow.confirmedBadge
  confirmButton: '✓ Confirm',                  // rightSynopticPanel.fieldRow.confirmButton
};

/** The demo registry's rows (services/actionRegistry/mockActionRegistryService.ts), as the screen shows them. */
const ACTIONS: { label: string; role: string; shortcut: string; triggers: string[] }[] = [
  { label: 'Confirm Field',         role: 'All Staff',   shortcut: 'Ctrl+Alt+Shift+A', triggers: ['confirm field', 'accept field', 'approve field', 'confirm answer', 'accept answer'] },
  { label: 'Next Unanswered Field', role: 'All Staff',   shortcut: 'Ctrl+Alt+U',       triggers: ['next unanswered', 'go to next unanswered', 'next empty field', 'next blank'] },
  { label: 'Next Required Field',   role: 'All Staff',   shortcut: 'Ctrl+Alt+Shift+R', triggers: ['next required', 'go to next required', 'next required field', 'show required'] },
  { label: 'Enter Addendum',        role: 'Pathologist', shortcut: 'Alt+Shift+D',      triggers: ['enter addendum', 'start addendum', 'dictate addendum'] },
  { label: 'Next Block',            role: 'All Staff',   shortcut: 'Alt+.',            triggers: ['next block', 'go to next block'] },
  { label: 'Previous Block',        role: 'All Staff',   shortcut: 'Alt+,',            triggers: ['previous block', 'go to previous block', 'prior block'] },
  { label: 'Mark Block Grossed',    role: 'All Staff',   shortcut: 'Alt+G',            triggers: ['mark grossed', 'block grossed', 'block complete', 'grossing complete'] },
  { label: 'Confirm Triage',        role: 'All Staff',   shortcut: 'Alt+Shift+T',      triggers: ['confirm triage', 'triage complete', 'triage confirmed'] },
];
const SEPARATE: typeof ACTIONS = [
  { label: 'Skip Field',  role: 'All Staff', shortcut: 'Ctrl+Alt+Q', triggers: ['skip field', 'skip this field', 'move on', 'leave blank'] },
  { label: 'Full View',   role: 'All Staff', shortcut: 'Alt+V',      triggers: ['full view', 'show full view', 'expand view', 'all sections'] },
  { label: 'Tabbed View', role: 'All Staff', shortcut: 'Ctrl+Alt+T', triggers: ['tabbed view', 'show tabbed view', 'tab view', 'collapse view'] },
];

// S26-4408's synoptic report (demo seed): the first two unanswered fields Ctrl+Alt+U reaches from a fresh open.
const CASE = 'S26-4408';
const FIRST_UNANSWERED = 'Focality';
const SECOND_UNANSWERED = 'Secondary Finding (in-situ component)';

// The shared openScreen/openCase helpers give a screen 20 s; on a loaded machine the first Vite compile of a
// screen takes longer, so this spec waits on the screen's own content with a longer limit instead.
const LOAD = 90_000;

/**
 * helpers.signIn, but from the sign-in page: helpers.signIn opens "/" and writes storage while the app is
 * still redirecting to /login, which can destroy the page context mid-write (seen on a loaded machine).
 */
async function signInAsPete(page: Page) {
  await page.goto('/login');
  await expect(page.locator('#login-email'), 'the sign-in page').toBeVisible({ timeout: LOAD });
  await page.evaluate((u) => {
    localStorage.clear();
    localStorage.setItem('pathscribe-user', JSON.stringify(u));
    localStorage.setItem('pathscribe_scan_station_prompted', '1');
  }, DEMO_USERS.pete);
}

/** Opens S26-4408's synoptic report from the worklist and waits for its fields. */
async function openSynopticCase(page: Page, accession: string) {
  await page.goto('/worklist');
  const link = page.getByText(accession, { exact: true }).first();
  await expect(link, `${accession} on the worklist`).toBeVisible({ timeout: LOAD });
  await link.click();
  await expect(page.locator('.ps-syn-field-row').first(), 'the synoptic fields are on screen').toBeVisible({ timeout: LOAD });
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const registryRow = (page: Page, label: string) => page.locator('.ps-actionstab-row')
  .filter({ has: page.locator('.ps-actionstab-label-row', { hasText: new RegExp(`^${escapeRe(label)}$`) }) });

async function expectRegistryRow(page: Page, a: typeof ACTIONS[number]) {
  const row = registryRow(page, a.label);
  await expect(row, `exactly one "${a.label}" row`).toHaveCount(1);
  await expect(row, `"${a.label}" is active (no Disabled badge)`).not.toHaveClass(/ps-actionstab-row--inactive/);
  await expect(row.locator('.ps-actionstab-role'), `"${a.label}" role`).toHaveText(a.role);
  await expect(row.locator('.ps-actionstab-shortcut-code'), `"${a.label}" shortcut`).toHaveText(a.shortcut);
  await expect(row.locator('.ps-actionstab-trigger-pill'), `"${a.label}" voice triggers`).toHaveText(a.triggers);
}

/**
 * No internet in a review test: the app's AI calls go to the Vite dev proxy (/api/ai/…), which forwards them to
 * the provider. The top bar's voice-model check makes one on every screen (Gemini, "gemini-2.0-flash-lite").
 * Answer them here with a minimal successful reply in each provider's shape.
 */
async function answerAiProxy(context: BrowserContext) {
  await context.route(/\/api\/ai\//, route => {
    const url = route.request().url();
    if (url.includes('/gemini/')) return route.fulfill({ json: { candidates: [{ content: { role: 'model', parts: [{ text: 'ok' }] } }], models: [] } });
    if (url.includes('/anthropic/')) return route.fulfill({ json: { content: [{ type: 'text', text: 'ok' }] } });
    return route.fulfill({ json: { choices: [{ message: { content: 'ok' } }] } });
  });
}

test.describe('PS-66 Action Registry: merged actions are listed once and their shortcuts still work', () => {
  test.beforeEach(async ({ context }) => { await answerAiProxy(context); });

  test('Steps 1–3: the eight named actions and Skip Field / Full View / Tabbed View in the Action Registry', async ({ page }) => {
    test.setTimeout(180_000);

    await test.step('1. Sign in as Pete Nimmo and open Configuration → Action Registry', async () => {
      await signInAsPete(page);
      await page.goto('/configuration?tab=actions');
      await expect(page.locator('h1, h2').filter({ hasText: T.configuration }).first()).toBeVisible({ timeout: LOAD });
      await expect(page.locator('.ps-cfgpage-tab-btn--active'), 'the Action Registry tab is on').toHaveText(T.actionsTab);
      await expect(page.locator('h3.ps-actionstab-title')).toContainText(T.registryTitle);
      await expect(page.locator('.ps-actionstab-row').first(), 'the registry lists actions').toBeVisible({ timeout: LOAD });
    });

    await test.step('2. Find Confirm Field, Next Unanswered, Next Required, Enter Addendum, Next Block, Previous Block, Mark Grossed and Confirm Triage', async () => {
      await page.locator('.ps-conf-category-btn').filter({ hasText: new RegExp(`^${T.synopticFilter}$`) }).click();
      await expect(page.locator('.ps-conf-category-btn.active')).toHaveText(T.synopticFilter);
      await expect(page.locator('.ps-actionstab-category-cell'), 'only the Synoptic category is listed').toHaveText([T.synopticFilter]);
      for (const a of ACTIONS) await expect(registryRow(page, a.label), `"${a.label}" is listed under Synoptic`).toHaveCount(1);
    });

    await test.step('3. Each lists its shortcut and voice triggers; Skip Field, Full View and Tabbed View are separate actions; no two Synoptic actions share a shortcut', async () => {
      for (const a of [...ACTIONS, ...SEPARATE]) await expectRegistryRow(page, a);

      // Eleven distinct rows with eleven distinct shortcuts.
      const shortcuts = [...ACTIONS, ...SEPARATE].map(a => a.shortcut);
      expect(new Set(shortcuts).size, 'the eleven actions have eleven different shortcuts').toBe(shortcuts.length);

      // No clash anywhere in the Synoptic category: every shortcut belongs to one action only.
      const all = (await page.locator('.ps-actionstab-row .ps-actionstab-shortcut-code').allTextContents()).map(s => s.trim()).filter(Boolean);
      const dupes = all.filter((s, i) => all.indexOf(s) !== i);
      expect(dupes, 'no shortcut is used by two Synoptic actions').toEqual([]);
    });
  });

  test('Step 4: on a synoptic case, Next Unanswered (Ctrl+Alt+U) and Confirm Field (Ctrl+Alt+Shift+A) act', async ({ page }) => {
    test.setTimeout(240_000);
    const executed: string[] = [];
    // The registry logs each action it runs ("[VoiceRegistry] Executing: <id> -> <key>"); kept to tell
    // "the shortcut was not recognised" apart from "it was recognised but nothing happened".
    page.on('console', m => { const r = /\[VoiceRegistry\] Executing: (\S+)/.exec(m.text()); if (r) executed.push(r[1]); });
    const activeLabel = page.locator('.ps-syn-field-label--active');
    const focusedFieldLabel = page.locator('.ps-syn-field-row:has(:focus) .ps-syn-field-label');

    await test.step(`4a. Open ${CASE}'s synoptic report`, async () => {
      await signInAsPete(page);
      await openSynopticCase(page, CASE);
    });

    await test.step('4b. Ctrl+Alt+U moves to, highlights and focuses the next unanswered field; again moves to the one after', async () => {
      await page.keyboard.press('Control+Alt+U');
      await expect(activeLabel, 'the first unanswered field is the active one').toHaveText(FIRST_UNANSWERED, { timeout: 15_000 });
      await expect(focusedFieldLabel, 'and its input has the focus').toHaveText(FIRST_UNANSWERED);
      await page.keyboard.press('Control+Alt+U');
      await expect(activeLabel, 'the next unanswered field').toHaveText(SECOND_UNANSWERED, { timeout: 15_000 });
      await expect(focusedFieldLabel).toHaveText(SECOND_UNANSWERED);
      expect(executed.filter(id => id === 'NEXT_UNANSWERED'), 'each press ran Next Unanswered once').toHaveLength(2);
    });

    await test.step('4c. Ctrl+Alt+Shift+A on the active field with an AI suggestion confirms it', async () => {
      const candidate = page.locator('.ps-syn-field-row').filter({ has: page.locator('.ps-syn-confirm-btn') }).first();
      await expect(candidate, 'a field with an unconfirmed AI suggestion is on screen').toBeVisible();
      const label = (await candidate.locator('.ps-syn-field-label').textContent())?.trim() ?? '';
      // Pinned by its label: once confirmed it no longer matches "has a Confirm button".
      const row = page.locator('.ps-syn-field-row').filter({ has: page.locator('.ps-syn-field-label').getByText(label, { exact: true }) });
      await expect(row).toHaveCount(1);
      await row.locator('.ps-syn-field-label').click();
      await expect(activeLabel, 'that field is the active one').toHaveText(label);
      await expect(row.locator('.ps-syn-badge'), 'its AI suggestion is not confirmed yet').not.toHaveText(T.aiConfirmed);
      await page.keyboard.press('Control+Alt+Shift+A');
      await expect.poll(() => executed.includes('CONFIRM_FIELD'), { message: 'the shortcut ran Confirm Field' }).toBe(true);
      await expect(row.locator('.ps-syn-badge'), `"${label}" shows ${T.aiConfirmed}`).toHaveText(T.aiConfirmed, { timeout: 10_000 });
      await expect(row.getByRole('button', { name: T.confirmButton, exact: true }), 'its Confirm button is gone').toHaveCount(0);
    });
  });
});
