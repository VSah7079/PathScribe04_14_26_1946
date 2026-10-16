// e2e/a11y.states.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 565: the screens' other states, which the Batch 564 sweep (default state
// only) didn't reach: filter tiles clicked (each tile's colour on its tint), the
// cytology worklist's tiles and organ-site pills, a batch opened in Batch
// Management, and the Quality Assurance dashboard's charts. Each must have no
// serious or critical WCAG 2.1 AA violation.
// Run: npm run test:a11y (starts the app; see playwright.config.ts).
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function signIn(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('pathscribe-user', JSON.stringify({ id: 'PATH-001', name: 'Pete Nimmo', role: 'superadmin' }));
    localStorage.setItem('pathscribe_scan_station_prompted', '1');
  });
}

async function openScreen(page: Page, path: string, heading: string) {
  await page.goto(path);
  await expect(page.locator('h1, h2').filter({ hasText: heading }).first()).toBeVisible({ timeout: 15_000 });
  await page.locator('.ps-scan-prompt-skip').click({ timeout: 1000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function serious(page: Page, where: string): Promise<string[]> {
  await page.waitForTimeout(500);
  const r = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  // Text on translucent or blurred surfaces (the tiles) can't always be measured: axe calls it "incomplete".
  // Reported, so a reader of the results sees how much it couldn't judge; not failed.
  const unsure = r.incomplete.filter(v => v.id === 'color-contrast').reduce((n, v) => n + v.nodes.length, 0);
  if (unsure) test.info().annotations.push({ type: 'contrast not measurable', description: `${where}: ${unsure}` });
  return r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
    .flatMap(v => v.nodes.slice(0, 4).map(n => `${where}: ${v.id} ${n.target.join(' ')} :: ${(n.any[0]?.message ?? '').slice(0, 120)}`));
}

/** Clicks each item in turn (up to `max`), confirms it became the selected one (aria-pressed), and checks the page. */
async function eachClicked(page: Page, items: Locator, where: string, max = 14): Promise<string[]> {
  const found: string[] = [];
  const n = Math.min(await items.count(), max);
  expect(n, `${where}: something to click`).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const item = items.nth(i);
    // A tile already on may toggle off when clicked; one that was off must show as selected after one click.
    const wasOn = await item.getAttribute('aria-pressed') === 'true';
    await item.click();
    if (wasOn && await item.getAttribute('aria-pressed') === 'false') { await item.click(); }
    await expect(item, `${where} #${i + 1} shows as selected`).toHaveAttribute('aria-pressed', 'true');
    found.push(...await serious(page, `${where} #${i + 1}`));
  }
  return found;
}

const report = (found: string[]) => {
  test.info().annotations.push({ type: 'violations', description: JSON.stringify(found) });
  expect(found, found.join('\n')).toEqual([]);
};

test.describe('screen states (Batch 565)', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('Worklist: each filter tile active', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/worklist');
    await page.locator('.ps-wl-filter-tile').first().waitFor({ timeout: 15_000 });
    await page.locator('.ps-scan-prompt-skip').click({ timeout: 1000 }).catch(() => {});
    const found = await eachClicked(page, page.locator('.ps-wl-filter-tile'), 'Worklist tile');
    // A case row selected (the case id's colour on the selected row).
    await page.locator('.ps-wl-filter-tile[aria-pressed="true"]').first().click().catch(() => {});
    const row = page.locator('.wl-case-id-inline, .wl-case-id').first();
    if (await row.count()) { await row.click(); found.push(...await serious(page, 'Worklist row selected')); }
    report(found);
  });

  test('Quality Assurance: each filter tile active, and the charts', async ({ page }) => {
    test.setTimeout(180_000);
    await openScreen(page, '/quality-assurance', 'Quality Assurance');
    report(await eachClicked(page, page.locator('.ps-wl-filter-tile'), 'QA tile'));
  });

  test('Cytology worklist: each tile and organ-site pill', async ({ page }) => {
    test.setTimeout(180_000);
    await openScreen(page, '/cytology-worklist', 'Cytology Worklist');
    const found = await eachClicked(page, page.locator('.ps-cytoworklist-tile'), 'Cytology tile');
    const pills = page.locator('.ps-cytoworklist-pill');
    for (let i = 0; i < Math.min(await pills.count(), 8); i++) {
      await pills.nth(i).click();
      found.push(...await serious(page, `Cytology pill #${i + 1}`));
    }
    report(found);
  });

  test('Batch Management: a batch opened', async ({ page }) => {
    test.setTimeout(120_000);
    await openScreen(page, '/batch-management', 'Batch Management');
    expect(await page.locator('.ps-batch-row').count(), 'the demo has batches').toBeGreaterThan(0);
    await page.locator('.ps-batch-row').first().click();
    await page.waitForTimeout(1000);
    report(await serious(page, 'Batch detail'));
  });
});

// Batch 566: the tiles that switch a whole view say which one is on (aria-pressed), and the cytology worklist's
// rows, which hold buttons of their own, aren't buttons themselves (axe nested-interactive).
test.describe('screen states (Batch 566)', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('Worklist: the LIS / Outreach / queue tiles say which is on', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/worklist');
    await page.locator('.ps-wl-mode-tile').first().waitFor({ timeout: 15_000 });
    await page.locator('.ps-scan-prompt-skip').click({ timeout: 1000 }).catch(() => {});
    const tiles = page.locator('.ps-wl-mode-tile');
    const n = await tiles.count();
    expect(n, 'mode tiles').toBeGreaterThan(1);
    const found: string[] = [];
    for (let i = 0; i < n; i++) {
      await tiles.nth(i).click();
      await expect(tiles.nth(i), `mode tile #${i + 1} on`).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.ps-wl-mode-tile[aria-pressed="true"]'), 'only one on').toHaveCount(1);
      found.push(...await serious(page, `Mode tile #${i + 1}`));
    }
    report(found);
  });

  test('Batch Management: each stage tile says whether it is on', async ({ page }) => {
    test.setTimeout(180_000);
    await openScreen(page, '/batch-management', 'Batch Management');
    const found = await eachClicked(page, page.locator('.ps-batch-stage-tiles .ps-wl-filter-tile--hued'), 'Stage tile');
    await expect(page.locator('.ps-batch-stage-tiles [aria-pressed="true"]'), 'only one stage on').toHaveCount(1);
    report(found);
  });

  test('Cytology worklist: no row is a button holding buttons; a row title opens the case from the keyboard', async ({ page }) => {
    test.setTimeout(180_000);
    await openScreen(page, '/cytology-worklist', 'Cytology Worklist');
    const tiles = page.locator('.ps-cytoworklist-tile');
    expect(await tiles.count(), 'cytology tiles').toBeGreaterThan(0);
    const found: string[] = [];
    let openerTile = -1;
    for (let i = 0; i < Math.min(await tiles.count(), 14); i++) {
      await tiles.nth(i).click();
      await page.waitForTimeout(300);
      const r = await new AxeBuilder({ page }).withTags(WCAG_TAGS).withRules(['nested-interactive']).analyze();
      for (const v of r.violations) found.push(`Cytology tile #${i + 1}: ${v.id} ${v.nodes.map(x => x.target.join(' ')).slice(0, 3).join(' | ')}`);
      if (openerTile < 0 && await page.locator('.ps-cytoworklist-row-open').count()) openerTile = i;
    }
    expect(found, found.join('\n')).toEqual([]);
    expect(openerTile, 'a tab in the demo lists a row whose title opens the case').toBeGreaterThanOrEqual(0);
    {
      await tiles.nth(openerTile).click();
      const opener = page.locator('.ps-cytoworklist-row-open').first();
      await opener.focus();
      await page.keyboard.press('Enter');
      // The case opens on its own address (/cytology-worklist/<case id>).
      await expect(page, 'Enter on the title opens the case').toHaveURL(/\/cytology-worklist\/[^/?#]+/, { timeout: 15_000 });
    }
  });
});

// Batch 567: controls inside controls (axe nested-interactive), in the inbox and on the case report.
test.describe('no control inside another (Batch 567)', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('Inbox: no message row is a button holding buttons; the sender opens the message from the keyboard', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/worklist');
    await page.locator('.ps-wl-filter-tile').first().waitFor({ timeout: 15_000 });
    await page.locator('.ps-scan-prompt-skip').click({ timeout: 1000 }).catch(() => {});
    await page.evaluate(() => window.dispatchEvent(new Event('PATHSCRIBE_OPEN_MESSAGES')));
    const rows = page.locator('.ps-msg-row');
    await expect(rows.first(), 'the demo inbox has messages').toBeVisible({ timeout: 10_000 });
    const r = await new AxeBuilder({ page }).include('.ps-msg-sidebar').withTags(WCAG_TAGS).analyze();
    const found = r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
      .map(v => `Inbox: ${v.id} ${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' | ')}`);
    expect(await rows.first().getAttribute('role'), 'a row is not a button').toBeNull();
    const sender = rows.first().locator('.ps-msg-row-sender');
    await sender.focus();
    await page.keyboard.press('Enter');
    await expect(rows.first(), 'Enter on the sender opens the message').toHaveClass(/\bselected\b/, { timeout: 5_000 });
    report(found);
  });

  test('Case report: no control inside another', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/worklist');
    await page.getByText('S26-4408', { exact: true }).first().click({ timeout: 15_000 });
    await page.waitForTimeout(6000);
    await expect(page.locator('.ps-syn-specimen-row').first(), 'the case report is open').toBeVisible({ timeout: 10_000 });
    const r = await new AxeBuilder({ page }).withTags(WCAG_TAGS).withRules(['nested-interactive']).analyze();
    report(r.violations.map(v => `Case report: ${v.id} ${v.nodes.map(n => n.target.join(' ')).slice(0, 4).join(' | ')}`));
  });
});

// Batch 568: the last places with a control inside another, and the Worklist's view tiles' colours.
test.describe('no control inside another (Batch 568)', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('Contribution: no control inside another; the teaching tile, when shown, opens from its title', async ({ page }) => {
    test.setTimeout(120_000);
    await openScreen(page, '/contribution', 'Contribution Dashboard');
    const r = await new AxeBuilder({ page }).withTags(WCAG_TAGS).withRules(['nested-interactive']).analyze();
    const found = r.violations.map(v => `Contribution: ${v.id} ${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' | ')}`);
    // The teaching tile shows only for someone with teaching records; the demo's superadmin has none, so the
    // keyboard step runs only when it is there (ContributionDashboardPage.teachingTile.test.tsx covers the tile).
    const title = page.locator('button.ps-contrib-tile-title');
    const shown = await title.count();
    test.info().annotations.push({ type: 'teaching tile shown', description: String(shown > 0) });
    if (shown) {
      expect(await page.locator('.ps-contrib-tile-clickable').first().getAttribute('role'), 'the tile is not a button').toBeNull();
      await title.focus();
      await page.keyboard.press('Enter');
      await expect(page, 'Enter on the title opens Quality Assurance').toHaveURL(/quality-assurance/, { timeout: 10_000 });
    }
    report(found);
  });

  test('Worklist: the LIS and Outreach tiles keep their on/off look (colours now from the stylesheet)', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/worklist');
    await page.locator('.ps-wl-mode-tile--lis').waitFor({ timeout: 15_000 });
    await page.locator('.ps-scan-prompt-skip').click({ timeout: 1000 }).catch(() => {});
    // The tiles fade between states (0.15 s), so each colour is read once it settles.
    const border = (sel: string) => page.locator(sel).evaluate(el => getComputedStyle(el).borderTopColor);
    await page.locator('.ps-wl-mode-tile--outreach').click();
    await expect.poll(() => border('.ps-wl-mode-tile--outreach'), { message: 'Outreach on: amber border' }).toBe('rgb(245, 158, 11)');
    await page.locator('.ps-wl-mode-tile--lis').click();
    await expect.poll(() => border('.ps-wl-mode-tile--lis'), { message: 'LIS on: light border' }).toBe('rgba(255, 255, 255, 0.5)');
    await expect.poll(() => border('.ps-wl-mode-tile--outreach'), { message: 'Outreach off: faint amber' }).toBe('rgba(245, 158, 11, 0.18)');
    report(await serious(page, 'Worklist mode tiles'));
  });
});

// Batch 569: focus after a keyboard delete in the inbox.
test.describe('focus after a delete (Batch 569)', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('Inbox: deleting a message from the keyboard moves focus to the next message', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/worklist');
    await page.locator('.ps-wl-filter-tile').first().waitFor({ timeout: 15_000 });
    await page.locator('.ps-scan-prompt-skip').click({ timeout: 1000 }).catch(() => {});
    await page.evaluate(() => window.dispatchEvent(new Event('PATHSCRIBE_OPEN_MESSAGES')));
    const rows = page.locator('.ps-msg-row');
    await expect(rows.nth(1), 'the demo inbox has at least two messages').toBeVisible({ timeout: 10_000 });
    const secondSender = (await rows.nth(1).locator('.ps-msg-row-sender').getAttribute('data-msg-open'))!;
    await rows.first().locator('.ps-msg-row-sender').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus'), 'Tab reaches the row\'s Delete button').toHaveClass(/ps-msg-row-delete-icon-btn/);
    await page.keyboard.press('Enter');
    await expect(page.locator(':focus'), 'focus is on the next message').toHaveAttribute('data-msg-open', secondSender, { timeout: 5_000 });
  });
});

// Batch 570: saved-search chips (name and × are separate buttons; focus after a keyboard delete).
test.describe('saved-search chips (Batch 570)', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('Search: a chip is not a button around its ×; deleting from the keyboard moves focus to the next chip, then to "Save search"', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/search');
    await page.locator('.ps-searchpage-save-new-btn').waitFor({ timeout: 15_000 });
    await page.locator('.ps-scan-prompt-skip').click({ timeout: 1000 }).catch(() => {});
    // Start with no saved searches (any seeded for this user are removed with the mouse first).
    while (await page.locator('.ps-searchpage-saved-chip-remove').count()) {
      await page.locator('.ps-searchpage-saved-chip-remove').first().click();
      await page.waitForTimeout(200);
    }
    for (const name of ['E2E one', 'E2E two']) {
      await page.locator('.ps-searchpage-save-new-btn').click();
      await page.locator('.ps-searchpage-save-input').fill(name);
      await page.locator('.ps-searchpage-save-input').press('Enter');
      await expect(page.locator('[data-saved-open]').filter({ hasText: name })).toHaveCount(1, { timeout: 5_000 });
    }
    const r = await new AxeBuilder({ page }).include('.ps-search-saved-chips').withTags(WCAG_TAGS).analyze();
    const found = r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
      .map(v => `Saved chips: ${v.id} ${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' | ')}`);
    const del = (name: string) => page.getByRole('button', { name: new RegExp(`${name}$`) }).filter({ hasText: '×' });
    await del('E2E one').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(':focus'), 'focus on the next chip').toHaveText('E2E two', { timeout: 5_000 });
    await del('E2E two').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(':focus'), 'focus on "Save search"').toHaveClass(/ps-searchpage-save-new-btn/, { timeout: 5_000 });
    report(found);
  });
});

// Batch 572: an open case report hears of another tab's save; today's screening hours and their sign-off.
test.describe('case updates and screening hours (Batch 572)', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('Case report: another tab saving the case shows "Someone else saved this case", politely, with Show their changes and Later', async ({ page, context }) => {
    test.setTimeout(120_000);
    await page.goto('/worklist');
    await page.getByText('S26-4408', { exact: true }).first().click({ timeout: 15_000 });
    await expect(page.locator('.ps-syn-specimen-row').first()).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1500);
    await expect(page.locator('.ps-case-updated-banner'), 'nothing before another save').toHaveCount(0);
    const focusedBefore = await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80));
    // Another tab of the same browser saves the case: the demo's stand-in for the hub's caseReport event.
    const other = await context.newPage();
    await other.goto('/');
    await other.evaluate(() => {
      const key = 'pathscribe_mock_cases';
      const cases = JSON.parse(localStorage.getItem(key) ?? '[]');
      const c = cases.find((x: { id: string }) => x.id === 'S26-4408');
      c.version = (c.version ?? 0) + 1;
      localStorage.setItem(key, JSON.stringify(cases));
    });
    const banner = page.locator('.ps-case-updated-banner');
    await expect(banner, 'the notice appears').toBeVisible({ timeout: 10_000 });
    // Only the message is the polite live region (the buttons aren't re-announced).
    await expect(banner.locator('.ps-case-updated-text')).toHaveAttribute('aria-live', 'polite');
    await expect(banner.locator('[aria-live] button')).toHaveCount(0);
    expect(await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80)), 'takes no focus').toBe(focusedBefore);
    const r = await new AxeBuilder({ page }).include('.ps-case-updated-banner').withTags(WCAG_TAGS).analyze();
    const found = r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `Case updated banner: ${v.id}`);
    await banner.getByRole('button').nth(1).click();
    await expect(banner, 'Later hides it').toHaveCount(0);
    // Batch 575: another save; "Show their changes" takes it up in place: no reload (the page keeps its marker).
    await page.evaluate(() => { (window as unknown as { __ps575?: boolean }).__ps575 = true; });
    await other.evaluate(() => {
      const key = 'pathscribe_mock_cases';
      const cases = JSON.parse(localStorage.getItem(key) ?? '[]');
      const c = cases.find((x: { id: string }) => x.id === 'S26-4408');
      c.version = (c.version ?? 0) + 1;
      // Their change: a specimen's description, shown in the specimen list.
      if (c.specimens?.[0]) c.specimens[0].description = 'E2E-575 their description';
      localStorage.setItem(key, JSON.stringify(cases));
    });
    await expect(banner, 'the next save is announced too').toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('E2E-575 their description'), 'not shown before Show').toHaveCount(0);
    await banner.getByRole('button').first().click();
    await expect(banner, 'shown in place: the notice goes').toHaveCount(0, { timeout: 10_000 });
    expect(await page.evaluate(() => (window as unknown as { __ps575?: boolean }).__ps575), 'no reload').toBe(true);
    await expect(page.getByText('E2E-575 their description').first(), 'their change is shown').toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(2000);
    await expect(page.locator('.ps-case-updated-banner'), 'and does not come back for the version taken up').toHaveCount(0);
    await other.close();
    report(found);
  });

  test('Cytology worklist: today\'s screening hours; one click signs them off', async ({ page }) => {
    test.setTimeout(120_000);
    await openScreen(page, '/cytology-worklist', 'Cytology Worklist');
    const panel = page.locator('.ps-cyto-hours');
    // Nothing screened today: no panel (nobody is asked to confirm 0.0 h).
    await expect(panel, 'no panel at 0.0 h').toHaveCount(0);
    // Two hours screened just now (the demo's ledger stands in for the server's recorded hours).
    await page.evaluate(() => {
      localStorage.setItem('pathscribe_mock_cytology_workload_ledger_v1', JSON.stringify([{
        id: 'e2e-1', userId: 'PATH-001', caseId: 'S26-4408', specimenId: 'sp1', reviewRecordId: 'r1',
        reviewMode: 'primary_manual', scuWeight: 1, activeDurationSeconds: 7200, completedAt: new Date().toISOString(),
      }]));
    });
    await openScreen(page, '/cytology-worklist', 'Cytology Worklist');
    await expect(panel, 'the panel shows once hours are recorded').toBeVisible({ timeout: 10_000 });
    // Batch 574: the workload counter, once a slide counts (the seeded review weighs 1).
    await expect(page.locator('.ps-cyto-workload'), 'the workload counter').toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.ps-cyto-workload-figures li')).not.toHaveCount(0);
    await panel.getByRole('button').first().click();
    await expect(panel.locator('.ps-cyto-hours-signed'), 'signed off').toBeVisible({ timeout: 5_000 });
    report(await serious(page, 'Cytology worklist with screening hours'));
  });
});

// Batch 573: who else has the case open. In the demo, another window of the same browser (the same user).
test.describe('who else has the case open (Batch 573)', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('Case report: a second window shows "You, in another window" in each; it goes when the other closes; axe clean', async ({ page, context }) => {
    test.setTimeout(120_000);
    const openCase = async (p: typeof page) => {
      await p.goto('/worklist');
      await p.getByText('S26-4408', { exact: true }).first().click({ timeout: 15_000 });
      await expect(p.locator('.ps-syn-specimen-row').first()).toBeVisible({ timeout: 20_000 });
    };
    await openCase(page);
    await page.waitForTimeout(1500); // time for anyone already there to answer
    await expect(page.locator('.ps-case-presence-chip'), 'nobody else yet').toHaveCount(0);
    const other = await context.newPage();
    await openCase(other);
    const strip = page.locator('.ps-case-presence');
    await expect(strip.locator('.ps-case-presence-chip'), 'the other window shows').toHaveCount(1, { timeout: 10_000 });
    await expect(other.locator('.ps-case-presence-chip'), 'and this one in the other').toHaveCount(1, { timeout: 10_000 });
    // Announced once, politely; the list itself is not a live region.
    await expect(page.locator('.ps-case-presence [role="status"]')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('.ps-case-presence [role="status"]')).not.toHaveText('');
    await expect(page.locator('.ps-case-presence-list[aria-live]')).toHaveCount(0);
    // Batch 576: changing a field in the other window's report shows it as editing here.
    const field = other.locator('.ps-syn-panel select:not([disabled])').first();
    expect(await field.count(), 'a field in the report').toBeGreaterThan(0);
    const values = await field.locator('option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value).filter(Boolean));
    const current = await field.inputValue();
    await field.selectOption(values.find(v => v !== current) ?? values[0]);
    await expect(strip.locator('.ps-case-presence-chip--editing'), 'shown as editing').toHaveCount(1, { timeout: 15_000 });
    const r = await new AxeBuilder({ page }).include('.ps-case-presence').withTags(WCAG_TAGS).analyze();
    const found = r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `Presence strip: ${v.id}`);
    // It has unsaved changes now: accept the browser's "leave this page?" so it really closes.
    other.on('dialog', d => { void d.accept(); });
    await other.close({ runBeforeUnload: true }); // a real close, so the page says goodbye (pagehide)
    await expect(page.locator('.ps-case-presence-chip'), 'gone when the other window closes').toHaveCount(0, { timeout: 10_000 });
    report(found);
  });
});

// Batch 577: the presence chips sit in the tab bar's row (the page doesn't move); the Edit Conflict dialog's
// "Use their version" shows the saved case in place, without a reload.
test.describe('case report follow-ups (Batch 577)', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });
  const openCase = async (p: Page) => {
    await p.goto('/worklist');
    await p.getByText('S26-4408', { exact: true }).first().click({ timeout: 15_000 });
    await expect(p.locator('.ps-syn-specimen-row').first()).toBeVisible({ timeout: 20_000 });
  };

  test('Case report: another window appearing in "who else has it open" does not move the page', async ({ page, context }) => {
    test.setTimeout(120_000);
    await openCase(page);
    await page.waitForTimeout(1500);
    const top = async () => (await page.locator('.ps-syn-tab-content').boundingBox())?.y;
    const before = await top();
    const other = await context.newPage();
    await openCase(other);
    await expect(page.locator('.ps-syn-tabbar .ps-case-presence-chip'), 'in the tab bar row').toHaveCount(1, { timeout: 10_000 });
    await expect(page.locator('.ps-syn-tabbar .ps-case-presence-chip'), 'and in view').toBeVisible();
    expect(await top(), 'the tab content stays where it was').toBe(before);
    const r = await new AxeBuilder({ page }).include('.ps-syn-tabbar').withTags(WCAG_TAGS).analyze();
    const found = r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `Tab bar with presence: ${v.id}`);
    await other.close({ runBeforeUnload: true });
    report(found);
  });

  test('Edit Conflict: "Use their version" shows their saved case in place, discarding unsaved changes, with no reload', async ({ page, context }) => {
    test.setTimeout(150_000);
    await openCase(page);
    await page.waitForTimeout(1500);
    // An unsaved change in the synoptic report.
    const field = page.locator('.ps-syn-panel select:not([disabled])').first();
    expect(await field.count(), 'a field in the report').toBeGreaterThan(0);
    const values = await field.locator('option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value).filter(Boolean));
    const current = await field.inputValue();
    const chosen = values.find(v => v !== current) ?? values[0];
    await field.selectOption(chosen);
    // Someone else saves the same part (the synoptic reports) and a specimen description meanwhile.
    const other = await context.newPage();
    await other.goto('/');
    await other.evaluate(() => {
      const key = 'pathscribe_mock_cases';
      const cases = JSON.parse(localStorage.getItem(key) ?? '[]');
      const c = cases.find((x: { id: string }) => x.id === 'S26-4408');
      c.version = (c.version ?? 0) + 1;
      // Every answer of every report, so their save overlaps the field changed here (a clean merge would
      // open the merge review instead of the Edit Conflict dialog).
      for (const r of c.synopticReports ?? []) for (const k of Object.keys(r.answers ?? {})) r.answers[k] = 'E2E-577';
      if (c.specimens?.[0]) c.specimens[0].description = 'E2E-577 their description';
      localStorage.setItem(key, JSON.stringify(cases));
    });
    await other.close();
    await page.evaluate(() => { (window as unknown as { __ps577?: boolean }).__ps577 = true; });
    await page.getByRole('button', { name: 'Save Draft' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Someone else changed this case', exact: true });
    await expect(dialog, 'the save stops at the Edit Conflict dialog').toBeVisible({ timeout: 10_000 });
    const r = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(WCAG_TAGS).analyze();
    const found = r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `Edit Conflict dialog: ${v.id}`);
    await dialog.getByRole('button', { name: 'Use their version' }).click();
    await expect(dialog, 'the dialog closes').toHaveCount(0, { timeout: 10_000 });
    expect(await page.evaluate(() => (window as unknown as { __ps577?: boolean }).__ps577), 'no reload').toBe(true);
    await expect(page.getByText('E2E-577 their description').first(), 'their change is shown').toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.ps-case-updated-banner'), 'nothing left to announce').toHaveCount(0);
    // The form itself shows their answers, not the discarded change (Batch 577 review).
    await expect.poll(async () => page.locator('.ps-syn-panel select:not([disabled])').first().inputValue(), { timeout: 10_000, message: 'the discarded change is gone from the form' }).not.toBe(chosen);
    report(found);
  });
});

// Batch 579: the template review screen's guide and question comments. Batch 580: the styled dropdown list.
test.describe('template review and dropdowns (Batches 579 and 580)', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('Template review: the reviewer guide is open while in review; a question comment is added, dark and labelled; Reset is away from Approve; axe clean', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/template-review/autopsy_gross_examination');
    await expect(page.locator('.ps-tmplr-header')).toBeVisible({ timeout: 20_000 });
    const guide = page.locator('details.ps-tmplr-guide');
    await expect(guide, 'the guide is open while in review').toHaveAttribute('open', '');
    const box = page.locator('.ps-inlinecomment-input').first();
    await expect(box, 'labelled with its question').toHaveAttribute('aria-label', /Comment on/);
    const bg = await box.evaluate(e => getComputedStyle(e).backgroundColor);
    expect(bg, 'not white').not.toMatch(/rgb\(25[0-5], 25[0-5], 25[0-5]\)/);
    await box.fill('E2E-579 check the unit');
    await page.locator('.ps-inlinecomment-add-btn').first().click();
    await expect(page.getByText('E2E-579 check the unit')).toBeVisible();
    // Reset is the last control in the row, not beside Approve.
    const last = await page.locator('.ps-tmplr-transition-row > *').last().getAttribute('class');
    expect(last).toContain('ps-tmplr-reset-btn');
    // Folding the guide is remembered.
    await guide.locator('summary').click();
    await page.reload();
    await expect(page.locator('.ps-tmplr-header')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('details.ps-tmplr-guide'), 'stays folded').not.toHaveAttribute('open', '');
    report(await serious(page, 'Template review'));
  });

  test('Dropdowns: where the styled list is drawn, each keeps the width of its widest option; the list opens styled; axe clean', async ({ page }) => {
    test.setTimeout(120_000);
    await openScreen(page, '/accession', 'Accession');
    const supported = await page.evaluate(() => CSS.supports('appearance', 'base-select'));
    test.skip(!supported, 'this browser draws its own list (Firefox, Safari): nothing changes there');
    const sel = page.locator('select:visible').first();
    await expect(sel).toHaveCSS('appearance', 'base-select');
    const styled = await page.evaluate(() => [...document.querySelectorAll('select')].filter(s => (s as HTMLElement).offsetParent).map(s => s.getBoundingClientRect().width));
    await page.addStyleTag({ content: 'select, select::picker(select) { appearance: auto !important; min-inline-size: auto !important; }' });
    const native = await page.evaluate(() => [...document.querySelectorAll('select')].filter(s => (s as HTMLElement).offsetParent).map(s => s.getBoundingClientRect().width));
    expect(styled.length, 'dropdowns on the page').toBeGreaterThan(0);
    // The same width as the browser's own dropdown, within a few pixels either way (never narrower, never past its own width).
    styled.forEach((w, i) => expect(Math.abs(w - native[i]), `dropdown ${i + 1}: ${w}px vs the browser's ${native[i]}px`).toBeLessThanOrEqual(3));
    await page.reload();
    await expect(page.locator('h1, h2').filter({ hasText: 'Accession' }).first()).toBeVisible({ timeout: 15_000 });
    await page.locator('.ps-scan-prompt-skip').click({ timeout: 1000 }).catch(() => {});
    await page.locator('select:visible').first().click();
    const open = await page.evaluate(() => !!document.querySelector('select:open'));
    expect(open, 'the list opens').toBe(true);
    const found = await serious(page, 'Accession with an open dropdown');
    await page.keyboard.press('Escape');
    report(found);
  });
});

// Batch 574: yesterday's screening hours (a night shift's first part) can be signed off beside today's.
test.describe('yesterday\'s screening hours (Batch 574)', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('Cytology worklist: yesterday\'s unsigned hours show above today\'s; confirming them removes the panel; axe clean', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await page.evaluate(() => {
      const now = Date.now();
      const entry = (id: string, at: number, seconds: number) => ({ id, userId: 'PATH-001', caseId: 'S26-4408', specimenId: 'sp1', reviewRecordId: id, reviewMode: 'primary_manual', scuWeight: 1, activeDurationSeconds: seconds, completedAt: new Date(at).toISOString() });
      localStorage.setItem('pathscribe_mock_cytology_workload_ledger_v1', JSON.stringify([entry('y1', now - 24 * 3600 * 1000, 7200), entry('t1', now, 3600)]));
    });
    await openScreen(page, '/cytology-worklist', 'Cytology Worklist');
    const yesterday = page.locator('.ps-cyto-hours--yesterday');
    await expect(yesterday, 'yesterday is offered').toBeVisible({ timeout: 10_000 });
    report(await serious(page, 'Cytology worklist with yesterday\'s hours'));
    await yesterday.getByRole('button').first().click();
    await expect(yesterday, 'signed off: no longer offered').toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('.ps-cyto-hours'), 'today\'s still there').toHaveCount(1);
  });
});

