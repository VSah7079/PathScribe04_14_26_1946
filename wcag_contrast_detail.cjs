const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;

async function auditContrast(page, name) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2aa']).include('body').analyze();
  const violation = results.violations.find(v => v.id === 'color-contrast');
  console.log(`\n=== ${name} ===`);
  if (!violation) { console.log('No color-contrast violations.'); return []; }
  const rows = [];
  for (const node of violation.nodes) {
    const data = node.any?.[0]?.data || {};
    rows.push({
      selector: node.target.join(' '),
      html: node.html.slice(0, 100).replace(/\n/g,' '),
      actual: data.contrastRatio ?? '?',
      required: data.expectedContrastRatio ?? '?',
      fg: data.fgColor ?? '?',
      bg: data.bgColor ?? '?',
    });
  }
  for (const r of rows) {
    console.log(`  ${r.selector}`);
    console.log(`    fg=${r.fg} bg=${r.bg} actual=${r.actual}:1 required=${r.required}:1`);
    console.log(`    ${r.html}`);
  }
  return rows;
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  const allRows = [];

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  allRows.push(...await auditContrast(page, 'Login Page'));

  await page.fill('input[type="email"]', 'pete.nimmo@pathscribe.ai');
  await page.fill('input[type="password"]', 'xyxRnJrIu64nsi0KqPn-');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  await page.goto('http://localhost:5173/intraop-queue', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  allRows.push(...await auditContrast(page, 'Intraop Queue'));

  try { await page.click('svg path[d^="M21 15a2 2 0 0 1-2 2H7l-4 4V5"]', { timeout: 3000 }); } catch {}
  await page.waitForTimeout(1000);
  allRows.push(...await auditContrast(page, 'Messages Drawer'));

  await page.goto('http://localhost:5173/search', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  allRows.push(...await auditContrast(page, 'Search'));

  await page.goto('http://localhost:5173/accession', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  allRows.push(...await auditContrast(page, 'Accession'));

  await browser.close();

  console.log('\n\n=== DEDUPED BY COLOR PAIR ===');
  const groups = {};
  for (const r of allRows) {
    const key = `${r.fg} on ${r.bg}`;
    if (!groups[key]) groups[key] = { count: 0, actual: r.actual, required: r.required, examples: new Set() };
    groups[key].count++;
    const cls = (r.selector.match(/\.([\w-]+)/) || [])[1];
    if (cls) groups[key].examples.add(cls);
  }
  const sortedGroups = Object.entries(groups).sort((a,b) => b[1].count - a[1].count);
  for (const [pair, info] of sortedGroups) {
    console.log(`${pair}  |  ${info.actual}:1 (need ${info.required}:1)  |  ${info.count}x  |  classes: ${[...info.examples].join(', ')}`);
  }
})();
