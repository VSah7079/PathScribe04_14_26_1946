const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;

const TOP_TABS = [
  ['actions', 'Action Registry'],
  ['ai', 'AI Behavior'],
  ['macros', 'Macros'],
  ['templates', 'Report Templates'],
  ['staff', 'Staff'],
  ['protocols', 'Synoptic Library'],
  // 'system' handled separately below, per sub-section
  ['integrations', 'Integrations'],
  ['tat', 'TAT Configuration'],
  ['validation', 'Validation Studies'],
  ['voice', 'Voice'],
];

const SYSTEM_SECTIONS = [
  ['fonts', 'Approved Fonts'],
  ['case_routing', 'Case Routing'],
  ['container_types', 'Container Types'],
  ['retention', 'Data Retention'],
  ['delegation_types', 'Delegation Types'],
  ['flags', 'Flags'],
  ['participation_types', 'Participation Types'],
  ['protocols', 'Protocol Dictionary'],
  ['deficiencies', 'Specimen Deficiencies'],
  ['stains', 'Stain Dictionary'],
  ['session_security', 'Session Security'],
  ['contribution_settings', 'Contribution Dashboard'],
  ['external_resources', 'External Resources'],
  ['rvu_code_map', 'RVU Code Map'],
  ['clients', 'Client Dictionary'],
  ['governing_bodies', 'Governing Bodies'],
  ['specimen_categories', 'Specimen Categories'],
  ['subspecialties', 'Subspecialties'],
  ['grossing_route_overrides', 'Grossing Route Overrides'],
  ['physicians', 'Physicians'],
  ['routing_rules', 'Routing Rules'],
  ['specimens', 'Specimen Dictionary'],
];

async function auditCurrentPage(page, name) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const total = results.violations.reduce((s, v) => s + v.nodes.length, 0);
  const bySeverity = {};
  for (const v of results.violations) {
    bySeverity[v.impact] = (bySeverity[v.impact] || 0) + v.nodes.length;
  }
  console.log(`${name.padEnd(35)} ${results.violations.length} rule types, ${total} elements  ${total > 0 ? JSON.stringify(bySeverity) : ''}`);
  if (total > 0) {
    for (const v of results.violations) {
      console.log(`    [${v.impact}] ${v.id} (${v.nodes.length}x): ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`);
    }
  }
  return { name, violations: results.violations, total };
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'pete.nimmo@pathscribe.ai');
  await page.fill('input[type="password"]', 'xyxRnJrIu64nsi0KqPn-');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  const allResults = [];

  for (const [id, label] of TOP_TABS) {
    await page.goto(`http://localhost:5173/configuration?tab=${id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    allResults.push(await auditCurrentPage(page, `[Top] ${label}`));
  }

  for (const [id, label] of SYSTEM_SECTIONS) {
    await page.goto(`http://localhost:5173/configuration?tab=system&section=${id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    allResults.push(await auditCurrentPage(page, `[System] ${label}`));
  }

  await browser.close();

  console.log('\n=== SUMMARY ===');
  const withIssues = allResults.filter(r => r.total > 0);
  console.log(`${withIssues.length} of ${allResults.length} views have violations`);
  for (const r of withIssues) {
    console.log(`  ${r.name}: ${r.total} elements`);
  }
})();
