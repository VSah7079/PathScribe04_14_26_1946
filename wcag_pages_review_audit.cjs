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

  const results = [];

  // Login page - unauthenticated (LoginPage.tsx - reviewed)
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  results.push(await auditPage(page, 'Login Page'));

  // Log in with real credentials
  await page.fill('input[type="email"]', 'pete.nimmo@pathscribe.ai');
  await page.fill('input[type="password"]', 'xyxRnJrIu64nsi0KqPn-');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  // Home page (has NavBar.tsx - tooltip fix applied)
  results.push(await auditPage(page, 'Home Page (post-login, NavBar)'));

  // Accession (AccessionPage.tsx - reviewed)
  await page.goto('http://localhost:5173/accession', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  results.push(await auditPage(page, 'Accession Page'));

  // Configuration (ConfigurationPage.tsx - reviewed)
  await page.goto('http://localhost:5173/configuration', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  results.push(await auditPage(page, 'Configuration Page'));

  // Deficiencies / Quality Assurance (DeficienciesPage.tsx - reviewed)
  await page.goto('http://localhost:5173/deficiencies', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  results.push(await auditPage(page, 'Deficiencies (Quality Assurance) Page'));

  // Full Report - full variant (FullReportPage.tsx - reviewed)
  await page.goto('http://localhost:5173/report/S23-9981', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  results.push(await auditPage(page, 'Full Report Page (full variant, S23-9981)'));

  // Full Report - pool variant (FullReportPage.tsx, isPool branch + PoolClaimModal)
  await page.goto('http://localhost:5173/report/MFT26-8807-POOL', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  results.push(await auditPage(page, 'Full Report Page (pool variant, MFT26-8807-POOL)'));

  // Mock EMR (MockEMRPage.tsx - reviewed, rewritten to named classes)
  await page.goto('http://localhost:5173/mock-emr?patientId=100004', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  results.push(await auditPage(page, 'Mock EMR Page'));

  // Messages drawer via NavBar - now has both aria-label and title
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  try {
    await page.click('button[aria-label*="Messages"]', { timeout: 3000 });
  } catch (e) {
    console.log('WARNING: could not click messages trigger:', e.message);
  }
  await page.waitForTimeout(1000);
  const drawerOpen = await page.locator('.ps-msg-drawer').count();
  console.log(`Messages drawer element count on page: ${drawerOpen} (0 means it did not open)`);
  results.push(await auditPage(page, 'Messages Drawer (via NavBar)'));

  await browser.close();

  console.log('\n\n=== OVERALL SUMMARY ===');
  for (const r of results) {
    const total = r.violations.reduce((s,v)=>s+v.nodes.length,0);
    console.log(`${r.name}: ${r.violations.length} rule types, ${total} affected elements`);
  }
})();
