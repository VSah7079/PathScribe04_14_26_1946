// e2e/review/ps-78.messages-drawer-css.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-78 — "Possible large dead-CSS finding in ps-msg-* (~61 of 136 classes)":
// Batch 319 removed 130 unused message-drawer rules. The review test plan, run
// against the demo (Vite dev server, localStorage data) as Pete Nimmo.
//
// Expected (ticket): the Messages drawer looks exactly as before in list,
// thread and compose views, with no missing styling.
//
//   1. Sign in as Pete and open Messages from the top bar.          automated
//   2. Look at the message list: rows, unread/urgent badges, checkboxes and
//      the search box.                                              automated
//   3. Open a message thread and read it; then start a new message (compose)
//      and use the person search.                                   automated
//   4. On a narrow window (phone width), check the Messages sidebar still lays
//      out properly.                                                automated
//   5. Optional: read docs/ARCHIVE.md, section "PS-78".   needs a person
//      (reading a document; nothing to run)
//
// How "no missing styling" is checked: in each view (list, edit mode, thread,
// compose, person search) every class the drawer renders from the families
// the drawer uses (ps-msg-*, ps-thread-*, ps-compose-*, ps-user-*) must be
// matched by at least one rule in the page's loaded stylesheets. The only
// exceptions are the two ARCHIVE.md names as never having had a rule:
// ps-msg-row-meta (a layout wrapper) and ps-msg-search-input (a focus hook).
// Key elements are also checked for real, non-default computed styles.
//
// Needs a person: "looks exactly as before" is a visual judgement against the
// pre-Batch-319 drawer, and there is no stored screenshot of it (ARCHIVE.md
// records the computed-style before/after comparison made at the time).
//
// Demo values (services/messages/mockMessageService.ts seeds, Pete's inbox):
// 16 messages, 2 unread, 1 urgent (Lab Manager, "Urgent: Morphology Review");
// the search box matches sender or body, so "case" lists 5.
//
// No internet: the app's AI calls through the Vite dev proxy (/api/ai/…, e.g. the
// top bar's voice-model check on every screen) are answered by the test.
//
// Texts are the English values of navBar.*, appShell.drawer.*,
// appShell.messageList.*, appShell.compose.* and appShell.userSearch.* in
// src/i18n/locales/en.json; selectors are the drawer's own .ps-msg-* /
// .ps-compose-* / .ps-user-search-* classes.
//
// Run: PLAYWRIGHT_CHROMIUM=… A11Y_PORT=5301 npx playwright test --project=chromium \
//        e2e/review/ps-78.messages-drawer-css.spec.ts --reporter=list
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page, type Locator, type BrowserContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { DEMO_USERS } from './helpers';

const T = {
  messagesButton: 'Messages, 2 unread',          // navBar.messagesUnread (count 2)
  title: 'Messages',                             // appShell.drawer.titleMessages
  edit: 'Edit',                                  // appShell.drawer.editButton
  done: 'Done',                                  // appShell.drawer.doneButton
  urgentPill: 'Urgent',                          // appShell.messageList.urgentPill
  urgentBadge: 'Urgent',                         // appShell.drawer.urgentBadge
  readAll: 'Read All',                           // appShell.messageList.readAllButton
  searchPlaceholder: 'Search',                   // appShell.messageList.searchPlaceholder
  composeTitle: 'New Message',                   // appShell.drawer.composeTitle
  composeButton: 'New internal message',         // appShell.messageList.composeTitle (button title)
  toPlaceholder: 'Type a name…',                 // appShell.compose.toPlaceholder
  browseUsers: 'Browse all internal users',      // appShell.compose.browseUsersTitle
  userSearchTitle: 'Find a recipient',           // appShell.userSearch.title
  userSearchPlaceholder: 'Search by name or department…', // appShell.userSearch.searchPlaceholder
  addOne: 'Add 1 recipient',                     // appShell.userSearch.addButton_one
  back: 'Back to message list',                  // appShell.drawer.backAriaLabel
};

const INBOX_COUNT = 16;
const UNREAD_COUNT = 2;
const URGENT = { sender: 'Lab Manager', subject: 'Urgent: Morphology Review', firstLine: 'Please review the secondary morphology for this case immediately.' };
const SEARCH = { text: 'case', count: 5 };
const RECIPIENT = 'Dr. Sarah Li Chen';      // the demo directory's match for "Sar"
const BROWSE_QUERY = 'Okafor';
const BROWSE_PICK = 'Dr. James Emeka Okafor';

/** Classes with no CSS rule of their own, by design (docs/ARCHIVE.md, PS-78 "Still in the file"). */
const NO_RULE_BY_DESIGN = ['ps-msg-row-meta', 'ps-msg-search-input'];

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

/** Every drawer-family class on screen that no loaded stylesheet rule mentions. */
async function classesWithoutRules(page: Page): Promise<{ seen: number; missing: string[] }> {
  return page.evaluate(() => {
    const selectors: string[] = [];
    const walk = (rules: CSSRuleList) => {
      for (const r of Array.from(rules)) {
        if ((r as CSSStyleRule).selectorText) selectors.push((r as CSSStyleRule).selectorText);
        if ((r as CSSGroupingRule).cssRules) walk((r as CSSGroupingRule).cssRules);
      }
    };
    for (const sheet of Array.from(document.styleSheets)) { try { walk(sheet.cssRules); } catch { /* cross-origin sheet */ } }
    const all = selectors.join('\n');
    const classes = new Set<string>();
    document.querySelectorAll('.ps-msg-drawer, .ps-msg-drawer *, .ps-user-search-modal, .ps-user-search-modal *')
      .forEach(el => el.classList.forEach(c => { if (/^ps-(msg|thread|compose|user)-/.test(c)) classes.add(c); }));
    const missing = [...classes].filter(c => !new RegExp(`\\.${c.replace(/-/g, '\\-')}(?![\\w-])`).test(all));
    return { seen: classes.size, missing: missing.sort() };
  });
}

async function expectAllStyled(page: Page, view: string) {
  const { seen, missing } = await classesWithoutRules(page);
  expect(seen, `${view}: drawer classes found on screen`).toBeGreaterThan(10);
  expect(missing.filter(c => !NO_RULE_BY_DESIGN.includes(c)), `${view}: classes on screen with no CSS rule`).toEqual([]);
}

const css = (l: Locator, prop: string) => l.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);
const TRANSPARENT = /^(rgba\(0, 0, 0, 0\)|transparent)$/;

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

test.describe('PS-78 Messages drawer keeps its styling after the dead ps-msg-* rules were removed', () => {
  test.beforeEach(async ({ context }) => { await answerAiProxy(context); });

  test('Steps 1–4: list, badges, edit checkboxes, search, thread, compose, person search and phone width', async ({ page }) => {
    test.setTimeout(300_000);
    const drawer = page.locator('.ps-msg-drawer');
    const rows = drawer.locator('.ps-msg-row');

    await test.step('1. Sign in as Pete and open Messages from the top bar', async () => {
      await signInAsPete(page);
      await page.goto('/');
      const button = page.getByRole('button', { name: T.messagesButton, exact: true });
      await expect(button, 'the top-bar Messages button shows 2 unread').toBeVisible({ timeout: LOAD });
      await button.click({ timeout: LOAD });
      await expect(drawer, 'the Messages drawer opens').toBeVisible();
      await expect(drawer.locator('h2.ps-msg-title')).toHaveText(T.title);
      await expect(rows, 'the demo inbox').toHaveCount(INBOX_COUNT, { timeout: 20_000 });
      expect(await css(drawer, 'position'), 'the drawer is a fixed panel').toBe('fixed');
      expect(await css(drawer, 'background-color'), 'the drawer has its own background').not.toMatch(TRANSPARENT);
    });

    await test.step('2. Message list: rows, unread and urgent badges, checkboxes and the search box', async () => {
      await expect(drawer.locator('.ps-unread-bubble'), 'the unread count by the title').toHaveText(String(UNREAD_COUNT));
      await expect(drawer.locator('.ps-msg-row.unread'), 'unread rows').toHaveCount(UNREAD_COUNT);
      await expect(drawer.locator('.ps-msg-unread-dot'), 'one unread dot per unread row').toHaveCount(UNREAD_COUNT);
      const pill = drawer.locator('.ps-msg-urgent-pill');
      await expect(pill, 'one urgent pill').toHaveCount(1);
      await expect(pill).toHaveText(T.urgentPill);
      await expect(rows.first().locator('.ps-msg-row-sender'), 'the urgent message sorts first').toHaveText(URGENT.sender);
      await expect(rows.first().locator('.ps-msg-row-subject')).toHaveText(URGENT.subject);
      expect(await css(rows.first(), 'display'), 'a row lays out as flex').toBe('flex');
      expect(await css(pill, 'background-color'), 'the urgent pill is coloured').not.toMatch(TRANSPARENT);
      expect(await css(drawer.locator('.ps-msg-unread-dot').first(), 'background-color'), 'the unread dot is coloured').not.toMatch(TRANSPARENT);
      expect(await css(rows.first().locator('.ps-msg-avatar'), 'border-radius'), 'avatars are round').not.toBe('0px');
      await expectAllStyled(page, 'message list');

      // Edit mode: a checkbox per row; ticking one marks it.
      await drawer.getByRole('button', { name: T.edit, exact: true }).click();
      await expect(drawer.locator('.ps-msg-row-checkbox'), 'a checkbox on every row').toHaveCount(INBOX_COUNT);
      await rows.nth(1).click();
      await expect(drawer.locator('.ps-msg-row-checkbox.checked'), 'the ticked row').toHaveCount(1);
      await expect(rows.nth(1).locator('.ps-msg-row-checkbox')).toHaveClass(/\bchecked\b/);
      const box = rows.nth(1).locator('.ps-msg-row-checkbox');
      expect(await css(box, 'background-color'), 'a ticked box is filled').not.toMatch(TRANSPARENT);
      await expect(drawer.getByRole('button', { name: T.readAll, exact: true }), 'the edit footer').toBeVisible();
      await expectAllStyled(page, 'edit mode');
      await drawer.getByRole('button', { name: T.done, exact: true }).click();
      await expect(drawer.locator('.ps-msg-row-checkbox')).toHaveCount(0);

      // Search box (sender or body).
      const search = drawer.locator('.ps-msg-search-input');
      await expect(search).toHaveAttribute('placeholder', T.searchPlaceholder);
      await search.fill(SEARCH.text);
      await expect(rows, `"${SEARCH.text}" matches ${SEARCH.count} messages`).toHaveCount(SEARCH.count);
      await search.fill('');
      await expect(rows).toHaveCount(INBOX_COUNT);
    });

    await test.step('3. Open a thread and read it; compose a new message and use the person search', async () => {
      await rows.first().locator('.ps-msg-row-sender').click();
      await expect(drawer, 'the drawer switches to the detail layout').toHaveClass(/ps-msg-drawer--detail-active/);
      await expect(drawer.locator('.ps-msg-thread-name')).toHaveText(URGENT.sender);
      await expect(drawer.locator('.ps-msg-urgent-badge')).toHaveText(T.urgentBadge);
      await expect(drawer.locator('.ps-msg-thread-subject')).toHaveText(URGENT.subject);
      await expect(drawer.locator('.ps-msg-thread'), 'the thread body').toContainText(URGENT.firstLine);
      await expect(rows.first(), 'the open message is marked selected in the list').toHaveClass(/\bselected\b/);
      await expectAllStyled(page, 'thread');

      await drawer.locator('.ps-msg-compose-icon-btn').click();
      await expect(drawer.locator('.ps-msg-compose-title')).toHaveText(T.composeTitle);
      const compose = drawer.locator('.ps-compose-panel');
      await expect(compose).toBeVisible();
      const to = compose.locator('.ps-compose-to-input');
      await expect(to).toHaveAttribute('placeholder', T.toPlaceholder);
      await to.pressSequentially('Sar', { delay: 40 });
      const suggestion = compose.locator('.ps-compose-dropdown-item');
      await expect(suggestion.locator('.ps-compose-dropdown-name'), 'the To: suggestions').toHaveText([RECIPIENT]);
      await expect(suggestion.first(), 'the first suggestion is highlighted').toHaveClass(/\bhighlighted\b/);
      await expectAllStyled(page, 'compose with suggestions');
      await suggestion.first().click();
      await expect(compose.locator('.ps-compose-chip'), 'the recipient chip').toHaveText([`${RECIPIENT}×`]);

      // The person search ("Browse all internal users").
      await compose.getByTitle(T.browseUsers, { exact: true }).click();
      const people = page.locator('.ps-user-search-modal');
      await expect(people).toBeVisible();
      await expect(people.locator('.ps-user-search-title')).toHaveText(T.userSearchTitle);
      const q = people.locator('.ps-user-search-input');
      await expect(q).toHaveAttribute('placeholder', T.userSearchPlaceholder);
      await q.fill(BROWSE_QUERY);
      const item = people.locator('.ps-user-search-item');
      await expect(item.locator('.ps-user-search-name')).toHaveText([BROWSE_PICK]);
      await item.first().click();
      await expect(item.first()).toHaveClass(/ps-user-search-item--selected/);
      await expect(people.locator('.ps-user-search-chip'), 'the picked person').toHaveCount(1);
      expect(await css(people, 'background-color'), 'the person search panel has its own background').not.toMatch(TRANSPARENT);
      await expectAllStyled(page, 'person search');
      await people.getByRole('button', { name: T.addOne, exact: true }).click();
      await expect(people).toHaveCount(0);
      await expect(compose.locator('.ps-compose-chip'), 'both recipients').toHaveText([`${RECIPIENT}×`, `${BROWSE_PICK}×`]);
      await expectAllStyled(page, 'compose with recipients');
    });

    await test.step('4. Phone width (375 px): the sidebar fills the drawer, nothing scrolls sideways, and the detail view takes over', async () => {
      await page.setViewportSize({ width: 375, height: 800 });
      const overflow = () => page.evaluate(() => ({
        page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        drawer: (() => { const d = document.querySelector('.ps-msg-drawer')!; return d.scrollWidth - d.clientWidth; })(),
      }));
      // Compose is open: the list is hidden behind the detail view, the back button shows.
      const back = drawer.getByRole('button', { name: T.back, exact: true });
      await expect(back, 'the phone back button').toBeVisible();
      await expect(drawer.locator('.ps-msg-sidebar'), 'the list is hidden while a detail view is open').toBeHidden();
      expect(await overflow(), 'no sideways scroll with compose open').toEqual({ page: 0, drawer: 0 });

      await back.click();
      const sidebar = drawer.locator('.ps-msg-sidebar');
      await expect(sidebar, 'back to the list').toBeVisible();
      await expect.poll(async () => Math.round((await sidebar.boundingBox())?.width ?? 0), { message: 'the sidebar is the full phone width' }).toBe(375);
      await expect(rows).toHaveCount(INBOX_COUNT);
      expect(await overflow(), 'no sideways scroll on the list').toEqual({ page: 0, drawer: 0 });
      await expectAllStyled(page, 'phone list');

      // Accessibility of the drawer at phone width (serious and critical findings).
      const r = await new AxeBuilder({ page }).include('.ps-msg-drawer').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const found = r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
        .map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' | ')}`);
      expect(found, 'axe: no serious or critical findings in the drawer').toEqual([]);
    });
  });
});
