const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;

async function auditPage(page, name) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const bySeverity = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  console.log(`\n=== ${name} ===`);
  console.log(`Total violations (rule types): ${results.violations.length}, total affected elements: ${results.violations.reduce((s,v)=>s+v.nodes.length,0)}`);
  for (const v of results.violations) {
    bySeverity[v.impact] = (bySeverity[v.impact] || 0) + v.nodes.length;
  }
  console.log(`By severity:`, bySeverity);
  const sorted = [...results.violations].sort((a,b) => ({critical:0,serious:1,moderate:2,minor:3}[a.impact] - {critical:0,serious:1,moderate:2,minor:3}[b.impact]));
  for (const v of sorted) {
    console.log(`\n  [${v.impact}] ${v.id} - ${v.help} (${v.nodes.length}x)`);
    for (const node of v.nodes.slice(0, 6)) {
      console.log(`    - ${node.target.join(' ')}`);
      console.log(`      ${node.html.slice(0, 140).replace(/\n/g, ' ')}`);
      if (node.failureSummary) console.log(`      ${node.failureSummary.split('\n')[0]}`);
    }
    if (v.nodes.length > 6) console.log(`    ... and ${v.nodes.length - 6} more`);
  }
  return { name, violations: results.violations, bySeverity };
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // Login page - unauthenticated
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  const loginResult = await auditPage(page, 'Login Page');

  // Log in with real credentials
  await page.fill('input[type="email"]', 'pete.nimmo@pathscribe.ai');
  await page.fill('input[type="password"]', 'xyxRnJrIu64nsi0KqPn-');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  // Home page
  const homeResult = await auditPage(page, 'Home Page (post-login)');

  // Worklist
  await page.goto('http://localhost:5173/worklist', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const worklistResult = await auditPage(page, 'Worklist');

  // Search
  await page.goto('http://localhost:5173/search', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const searchResult = await auditPage(page, 'Search');

  // Accession
  await page.goto('http://localhost:5173/accession', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const accessionResult = await auditPage(page, 'Accession');

  // Configuration
  await page.goto('http://localhost:5173/configuration', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const configResult = await auditPage(page, 'Configuration (default view)');

  // Audit Log
  await page.goto('http://localhost:5173/audit', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const auditLogResult = await auditPage(page, 'Audit Log');

  // Intraop Queue
  await page.goto('http://localhost:5173/intraop-queue', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const intraopResult = await auditPage(page, 'Intraop Queue');

  // Messages drawer - click via the distinctive message-icon SVG path,
  // since the button itself has no aria-label or title to target by
  try {
    await page.click('svg path[d^="M21 15a2 2 0 0 1-2 2H7l-4 4V5"]', { timeout: 3000 });
  } catch (e) {
    console.log('WARNING: could not click messages trigger:', e.message);
  }
  await page.waitForTimeout(1000);
  const drawerOpen = await page.locator('.ps-msg-drawer').count();
  console.log(`Messages drawer element count on page: ${drawerOpen} (0 means it did not open)`);
  const messagesResult = await auditPage(page, 'Messages Drawer (Intraop Queue nav)');

  await browser.close();

  const all = [loginResult, homeResult, worklistResult, searchResult, accessionResult, configResult, auditLogResult, intraopResult, messagesResult];
  console.log('\n\n=== OVERALL SUMMARY ===');
  for (const r of all) {
    const total = r.violations.reduce((s,v)=>s+v.nodes.length,0);
    console.log(`${r.name}: ${r.violations.length} rule types, ${total} affected elements`);
  }
})();
