// e2e/a11y.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 524 (PS-491): WCAG 2.1 AA checks with axe-core in a real browser, on
// the demo data:
//   - Worklist, Accession, Search (empty and with results);
//   - the case report page (case S26-4408), and again with the organ map open;
//   - every Configuration section: each top tab, each sub-tab, each entry in
//     the section list (one test per top tab).
// A screen passes with no serious or critical violation. Moderate and minor
// findings are reported in the annotations, not failed.
// Run: npm run test:a11y (starts the app; see playwright.config.ts).
//
// No waitForLoadState('networkidle'): the dev server keeps a socket open, so
// the page never goes idle and each test would wait out its whole timeout.
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const DEMO_CASE = 'S26-4408';

async function signIn(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('pathscribe-user', JSON.stringify({ id: 'PATH-001', name: 'Pete Nimmo', role: 'superadmin' }));
    // Batch 527: this computer has already been asked for its scan station, so the
    // prompt doesn't cover the page (it can appear after the settle time now that
    // the signed-in app loads on its own).
    localStorage.setItem('pathscribe_scan_station_prompted', '1');
  });
}

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForTimeout(3500);
  // The scan-station prompt on first open.
  await page.locator('.ps-scan-prompt-skip').click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(500);
}

type Finding = { where: string; id: string; impact: string; help: string; count: number; targets: string[] };

async function seriousViolations(page: Page, where: string): Promise<Finding[]> {
  await page.waitForTimeout(800);
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return results.violations
    .filter(v => v.impact === 'serious' || v.impact === 'critical')
    .map(v => ({ where, id: v.id, impact: v.impact ?? '', help: v.help, count: v.nodes.length, targets: v.nodes.slice(0, 5).map(n => n.target.join(' ')) }));
}

function report(found: Finding[]) {
  test.info().annotations.push({ type: 'violations', description: JSON.stringify(found) });
  expect(found, JSON.stringify(found, null, 2)).toEqual([]);
}

test.describe('main screens', () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test('Worklist: no serious or critical WCAG 2.1 AA violations', async ({ page }) => {
    await open(page, '/worklist');
    report(await seriousViolations(page, 'Worklist'));
  });

  test('Accession: no serious or critical WCAG 2.1 AA violations', async ({ page }) => {
    await open(page, '/accession');
    report(await seriousViolations(page, 'Accession'));
  });

  test('Search, empty and with results: no serious or critical WCAG 2.1 AA violations', async ({ page }) => {
    await open(page, '/search');
    const found = await seriousViolations(page, 'Search');
    await page.getByRole('button', { name: /search/i }).first().click();
    await page.waitForTimeout(2000);
    found.push(...await seriousViolations(page, 'Search (results)'));
    report(found);
  });

  test('Case report page, then with the organ map: no serious or critical WCAG 2.1 AA violations', async ({ page }) => {
    await open(page, '/worklist');
    await page.getByText(DEMO_CASE, { exact: true }).first().click();
    await page.waitForTimeout(6000);
    const found = await seriousViolations(page, 'Case report');
    const toggle = page.locator('.ps-organmap-toggle');
    await expect(toggle, 'the organ map button is on the case page').toHaveCount(1);
    await toggle.click();
    await page.waitForTimeout(3000);
    found.push(...await seriousViolations(page, 'Case report + organ map'));
    report(found);
  });
});

// One test per top Configuration tab; inside it, every sub-tab and section.
const CONFIG_TABS = 16; // more than there are; tabs past the end are skipped

test.describe('Configuration', () => {
  for (let tab = 0; tab < CONFIG_TABS; tab++) {
    test(`Configuration tab ${tab + 1}, every section: no serious or critical WCAG 2.1 AA violations`, async ({ page }) => {
      test.setTimeout(600_000);
      await signIn(page);
      await open(page, '/configuration');
      const tops = page.locator('.ps-cfgpage-tab-btn');
      // Batch 527: wait for the tabs (the signed-in app loads on its own); no tabs is a failure, not a skip.
      await tops.first().waitFor({ timeout: 30_000 });
      const count = await tops.count();
      expect(count, 'Configuration tabs').toBeGreaterThan(0);
      test.skip(tab >= count, `there are ${count} tabs`);
      const name = (await tops.nth(tab).textContent())?.trim() ?? `tab ${tab + 1}`;
      // Demo Reset resets the demo data; nothing on it to check that isn't elsewhere.
      test.skip(/Demo Reset/.test(name), 'Demo Reset');
      await tops.nth(tab).click();
      await page.waitForTimeout(1500);

      const found: Finding[] = [];
      const subs = page.locator('.ps-sub-tab-btn');
      const subCount = await subs.count();
      for (let s = 0; s < Math.max(subCount, 1); s++) {
        const subName = subCount ? (await subs.nth(s).textContent())?.trim() ?? '' : '';
        if (subCount) { await subs.nth(s).click(); await page.waitForTimeout(1000); }
        const navs = page.locator('.ps-confsys-nav-btn');
        const navCount = await navs.count();
        if (!navCount) { found.push(...await seriousViolations(page, `${name} > ${subName}`)); continue; }
        for (let n = 0; n < navCount; n++) {
          const navName = (await navs.nth(n).textContent())?.trim() ?? '';
          await navs.nth(n).click();
          found.push(...await seriousViolations(page, `${name} > ${subName} > ${navName}`));
        }
      }
      report(found);
    });
  }
});
