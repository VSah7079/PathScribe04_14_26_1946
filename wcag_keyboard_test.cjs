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

  // Test 1: can we reach the avatar via keyboard and activate it with Enter?
  let found = false;
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => document.activeElement?.className || document.activeElement?.tagName);
    if (typeof active === 'string' && active.includes('ps-nav-user-info')) { found = true; break; }
  }
  console.log('Avatar reachable via Tab:', found);
  if (found) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    const modalVisible = await page.locator('.ps-modal-dark').count();
    console.log('Modal opened via Enter key:', modalVisible > 0);
    await page.keyboard.press('Escape');
  }

  await browser.close();
})();
