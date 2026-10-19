// playwright.config.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 524 (PS-491): browser tests (npm run test:a11y). The accessibility
// checks open the main screens in a real Chromium with the demo data and run
// axe-core on each (e2e/a11y.spec.ts). The app is started here (vite).
//
// Chromium: Playwright's own, or the one named in PLAYWRIGHT_CHROMIUM (CI
// images that ship a browser). On a developer machine run
// `npx playwright install chromium` once.
//
// Batch 581 (Pete, Oct 15, 2026: Firefox is a supported browser, "part of the
// big 3"; and the review tests, e2e/review/): two projects. `chromium` runs
// every spec. `firefox` exists only when asked for (`--project=firefox`,
// PLAYWRIGHT_FIREFOX=1 or CI) and runs the same specs in Firefox: `npm run test:e2e:firefox` (after `npx
// playwright install firefox` once; it is not fetched in the sandboxed
// workspace, which allows no browser downloads). CI runs both.
// ─────────────────────────────────────────────────────────────────────────────
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.A11Y_PORT ?? 5179);
const executablePath = process.env.PLAYWRIGHT_CHROMIUM || undefined;
// Read from the command line rather than set by `VAR=x` in package.json scripts, which Windows' shell can't run.
const argv = process.argv.join(' ');
const wantsFirefox = /--project[= ]firefox/.test(argv) || !!process.env.PLAYWRIGHT_FIREFOX || !!process.env.CI;
const jsonOut = process.env.PLAYWRIGHT_JSON
  ?? (/--project[= ]firefox/.test(argv) ? 'e2e-results/firefox.json' : /e2e[\\/]review/.test(argv) ? 'e2e-results/review.json' : 'e2e-results/a11y.json');

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: jsonOut }], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: executablePath ? { executablePath } : {} },
    },
    // Firefox only when asked for (`--project=firefox`, PLAYWRIGHT_FIREFOX=1, or CI), so a bare
    // `npx playwright test` stays the Chromium run and never fails where Firefox isn't installed.
    ...(wantsFirefox ? [{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }] : []),
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
