const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;

const VIEWS = [
  ['top', 'actions', 'Action Registry'],
  ['top', 'macros', 'Macros'],
  ['top', 'templates', 'Report Templates'],
  ['top', 'staff', 'Staff'],
  ['top', 'protocols', 'Synoptic Library'],
  ['top', 'integrations', 'Integrations'],
  ['top', 'tat', 'TAT Configuration'],
  ['top', 'validation', 'Validation Studies'],
  ['top', 'voice', 'Voice'],
  ['system', 'case_routing', 'Case Routing'],
  ['system', 'retention', 'Data Retention'],
  ['system', 'delegation_types', 'Delegation Types'],
  ['system', 'participation_types', 'Participation Types'],
  ['system', 'deficiencies', 'Specimen Deficiencies'],
  ['system', 'session_security', 'Session Security'],
  ['system', 'contribution_settings', 'Contribution Dashboard'],
  ['system', 'external_resources', 'External Resources'],
  ['system', 'clients', 'Client Dictionary'],
  ['system', 'governing_bodies', 'Governing Bodies'],
  ['system', 'subspecialties', 'Subspecialties'],
  ['system', 'routing_rules', 'Routing Rules'],
];

async function auditContrast(page, name) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();
  const v = results.violations.find(v => v.id === 'color-contrast');
  if (!v) return [];
  const rows = [];
  for (const node of v.nodes) {
    const data = node.any?.[0]?.data || {};
    rows.push({
      view: name,
      selector: node.target.join(' '),
      fg: data.fgColor, bg: data.bgColor, ratio: data.contrastRatio, required: data.expectedContrastRatio,
    });
  }
  return rows;
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

  const allRows = [];
  for (const [kind, id, label] of VIEWS) {
    const url = kind === 'top'
      ? `http://localhost:5173/configuration?tab=${id}`
      : `http://localhost:5173/configuration?tab=system&section=${id}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    allRows.push(...await auditContrast(page, label));
  }

  await browser.close();

  console.log(`Total contrast violation instances: ${allRows.length}`);
  console.log('\n=== DEDUPED BY COLOR PAIR ===');
  const groups = {};
  for (const r of allRows) {
    const key = `${r.fg} on ${r.bg}`;
    if (!groups[key]) groups[key] = { count: 0, ratio: r.ratio, required: r.required, views: new Set(), selectors: new Set() };
    groups[key].count++;
    groups[key].views.add(r.view);
    const cls = (r.selector.match(/\.([\w-]+)/) || [])[1];
    if (cls) groups[key].selectors.add(cls);
  }
  const sorted = Object.entries(groups).sort((a,b) => b[1].count - a[1].count);
  for (const [pair, info] of sorted) {
    console.log(`${pair}  |  ${info.ratio}:1 (need ${info.required})  |  ${info.count}x  |  views: ${[...info.views].join(', ')}`);
    console.log(`    classes: ${[...info.selectors].join(', ') || '(no class - inline/generic selector)'}`);
  }
})();
