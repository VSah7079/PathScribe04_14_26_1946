const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'pete.nimmo@pathscribe.ai');
  await page.fill('input[type="password"]', 'xyxRnJrIu64nsi0KqPn-');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  await page.goto('http://localhost:5173/configuration?tab=system', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  // Click "Approved Fonts" in the sidebar
  await page.click('text=Approved Fonts');
  await page.waitForTimeout(500);

  const results = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();
  const v = results.violations.find(v => v.id === 'color-contrast');
  if (v) {
    console.log(`Found ${v.nodes.length} color-contrast violations on this section:`);
    for (const node of v.nodes) {
      console.log(' -', node.target.join(' '), JSON.stringify(node.any[0].data));
    }
  } else {
    console.log('axe found none (expected, given the opacity compounding blind spot)');
  }

  await page.screenshot({ path: '/home/claude/pathscribe/fonts_section_before.png', fullPage: false });
  await browser.close();
})();
