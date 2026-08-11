const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'pete.nimmo@pathscribe.ai');
  await page.fill('input[type="password"]', 'xyxRnJrIu64nsi0KqPn-');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  await page.goto('http://localhost:5173/intraop-queue', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  try { await page.click('svg path[d^="M21 15a2 2 0 0 1-2 2H7l-4 4V5"]', { timeout: 3000 }); } catch {}
  await page.waitForTimeout(1000);

  let found = false;
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => ({
      cls: document.activeElement?.className || '',
      label: document.activeElement?.getAttribute('aria-label') || '',
    }));
    if (typeof info.cls === 'string' && info.cls.includes('ps-msg-row') && !info.cls.includes('ps-msg-row-')) {
      found = true;
      console.log('Focused row aria-label:', info.label);
      break;
    }
  }
  console.log('Message row reachable via Tab:', found);
  if (found) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    const threadVisible = await page.locator('.ps-msg-content .ps-msg-thread-header, .ps-thread-body').count();
    console.log('Message opened via Enter key:', threadVisible > 0);
  }

  await browser.close();
})();
