// playwright.config.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 524 (PS-491): browser tests (npm run test:a11y). The accessibility
// checks open the main screens in a real Chromium with the demo data and run
// axe-core on each (e2e/a11y.spec.ts). The app is started here (vite).
//
// Chromium: Playwright's own, or the one named in PLAYWRIGHT_CHROMIUM (CI
// images that ship a browser). On a developer machine run
// `npx playwright install chromium` once.
// ─────────────────────────────────────────────────────────────────────────────
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.A11Y_PORT ?? 5179);
const executablePath = process.env.PLAYWRIGHT_CHROMIUM || undefined;

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'e2e-results/a11y.json' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 900 },
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
