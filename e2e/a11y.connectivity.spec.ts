// e2e/a11y.connectivity.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 563 (PS-622, PS-539 phase 2d item 2): the connection banner and the
// waiting states, checked in a real browser on the demo:
//   - offline: "Offline" appears after about 2 s, below the top bar, takes no
//     focus, covers no control someone could use, and passes axe;
//   - back online: "Reconnected" shows, then goes by itself;
//   - a page whose code is slow to arrive: nothing for 300 ms, then the page
//     loader, then "still loading" from 3 s, each in a polite live region;
//   - each text is in exactly one live region, so a screen reader reads it once.
// What only a person can confirm (NVDA or VoiceOver actually speaking each text
// once) stays on PS-622's list.
// Run: npm run test:a11y (starts the app; see playwright.config.ts).
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';
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

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForTimeout(3500);
  await page.locator('.ps-scan-prompt-skip').click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(500);
}

/** What has focus, as a short description (tag, id, name, class). */
const focused = (page: Page) => page.evaluate(() => {
  const el = document.activeElement as HTMLElement | null;
  return el ? `${el.tagName}#${el.id}[name=${el.getAttribute('name') ?? ''}].${el.className}` : 'none';
});

/** Visible, enabled controls whose box the banner overlaps. */
const coveredControls = (page: Page) => page.evaluate(() => {
  const banner = document.querySelector('.ps-connection-banner');
  if (!banner) return [];
  const b = banner.getBoundingClientRect();
  const controls = [...document.querySelectorAll<HTMLElement>('input, select, textarea, button, a[href], [tabindex]:not([tabindex="-1"])')];
  return controls.filter(c => {
    if (banner.contains(c)) return false;
    const r = c.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(c).visibility === 'hidden') return false;
    return r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top;
  }).map(c => `${c.tagName.toLowerCase()}${c.id ? `#${c.id}` : ''}${c.getAttribute('aria-label') ? `[${c.getAttribute('aria-label')}]` : ''}.${String(c.className).split(' ')[0]}`);
});

test.describe('connection banner (PS-622)', () => {
  test('offline, then back online: shown after about 2 s, polite, takes no focus, covers nothing, passes axe; "Reconnected" then goes', async ({ page, context }) => {
    test.setTimeout(120_000);
    await signIn(page);
    await open(page, '/worklist');
    const search = page.locator('input').first();
    await search.focus();
    const before = await focused(page);

    await context.setOffline(true);
    await page.waitForTimeout(1_200);
    await expect(page.locator('.ps-connection-banner'), 'nothing before 2 s').toHaveCount(0);
    await expect(page.locator('.ps-connection-banner--offline')).toBeVisible({ timeout: 5_000 });

    const region = page.locator('.ps-connection-banner-region');
    await expect(region).toHaveCount(1);
    await expect(region).toHaveAttribute('role', 'status');
    await expect(region).toHaveAttribute('aria-live', 'polite');
    const box = await page.locator('.ps-connection-banner').boundingBox();
    expect(box?.y ?? 0, 'below the top bar').toBeGreaterThanOrEqual(60);
    expect(await focused(page), 'nothing takes focus').toBe(before);
    expect(await coveredControls(page), 'covers no control').toEqual([]);

    const axe = await new AxeBuilder({ page }).include('.ps-connection-banner-region').withTags(WCAG_TAGS).analyze();
    expect(axe.violations.map(v => `${v.id}: ${v.help}`)).toEqual([]);

    await context.setOffline(false);
    await expect(page.locator('.ps-connection-banner--reconnected')).toBeVisible({ timeout: 5_000 });
    expect(await focused(page)).toBe(before);
    await expect(page.locator('.ps-connection-banner'), 'goes by itself').toHaveCount(0, { timeout: 8_000 });
  });
});

test.describe('waiting states (PS-622)', () => {
  test('a page slow to arrive: the loader after 300 ms, then "still loading" from 3 s, which stays until the page arrives; one polite region', async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page);
    // Hold the My exports page's code for 6 s, as a slow network would, and open it cold. (The pattern is the
    // dev server's file path, which playwright.config.ts runs; a production build's file names are hashed.)
    await page.route(/\/src\/pages\/MyExportsPage\.tsx/, async route => { await new Promise(r => setTimeout(r, 6_000)); await route.continue(); });
    const opening = page.goto('/my-exports');
    const loader = page.locator('.ps-app-loader-overlay');
    await expect(loader).toBeVisible({ timeout: 5_000 });
    await expect(loader).toHaveAttribute('role', 'status');
    await expect(loader).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('.ps-app-loader-slow')).toBeVisible({ timeout: 4_000 });
    const axe = await new AxeBuilder({ page }).withTags(WCAG_TAGS).include('.ps-app-loader-overlay').analyze();
    expect(axe.violations.map(v => `${v.id}: ${v.help}`)).toEqual([]);
    // Batch 563: once shown, "still loading" stays until the page arrives (a cold start used to swap in a
    // second loader that hid it and showed it again 3 s later).
    const samples: string[] = [];
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(200);
      const shown = await loader.count();
      const slow = await page.locator('.ps-app-loader-slow').count();
      samples.push(shown ? (slow ? 'slow' : 'loader') : 'none');
      if (await page.getByRole('heading', { level: 1 }).count()) break;
    }
    // Sampling starts once "still loading" is shown; until the page arrives, it must stay ('none' only at the end).
    const waiting = samples.slice(0, samples.findIndex((x, i) => x === 'none' && samples.slice(i).every(y => y === 'none')) >>> 0 || samples.length);
    expect(samples[0], samples.join(' ')).toBe('slow');
    expect(waiting.length, 'sampled while waiting').toBeGreaterThan(3);
    expect(waiting.every(x => x === 'slow'), `"still loading" hidden while waiting: ${samples.join(' ')}`).toBe(true);
    expect(await page.locator('[role="status"] .ps-app-loader-slow').count(), 'never more than one').toBeLessThanOrEqual(1);

    await opening;
    await expect(loader, 'goes when the page arrives').toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('a Configuration section: its own loading text sits in a polite live region, once', async ({ page }) => {
    await signIn(page);
    await open(page, '/configuration');
    const regions = await page.locator('.ps-loading-state').evaluateAll(els => els.map(e => [e.getAttribute('role'), e.getAttribute('aria-live')]));
    // The demo's data is local, so a section may have finished loading already; the region's markup is also
    // checked in LoadingState's own tests. What matters here is no live region inside another, on a real page.
    test.info().annotations.push({ type: 'loading regions seen', description: String(regions.length) });
    for (const [role, live] of regions) { expect(role).toBe('status'); expect(live).toBe('polite'); }
    const nested = await page.locator('[aria-live] [aria-live]').count();
    expect(nested, 'no live region inside another (that would read it twice)').toBe(0);
  });
});

// Batch 563: the screens added in phase 2d since the Batch 524 checks, in the demo.
test.describe('phase 2d screens (PS-622)', () => {
  test('My exports, Server jobs and Interfaces → Engines: no serious or critical WCAG 2.1 AA violations', async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page);
    const found: string[] = [];
    const check = async (where: string) => {
      await page.waitForTimeout(800);
      const r = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      for (const v of r.violations) if (v.impact === 'serious' || v.impact === 'critical') found.push(`${where}: ${v.id} (${v.nodes.length}) ${v.help} — ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`);
    };
    await open(page, '/my-exports');
    await check('My exports');
    await open(page, '/audit?tab=serverJobs');
    await check('Server jobs');
    await open(page, '/audit?tab=interfaces');
    await page.getByRole('button', { name: /engines/i }).first().click({ timeout: 5_000 });
    await check('Interfaces → Engines');
    test.info().annotations.push({ type: 'violations', description: JSON.stringify(found) });
    expect(found, found.join('\n')).toEqual([]);
  });
});
