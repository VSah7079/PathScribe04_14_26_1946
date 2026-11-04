// e2e/a11y.routes.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 564: every top-level screen of the signed-in app, opened in a real
// browser on the demo data, checked with axe-core for serious or critical
// WCAG 2.1 AA violations (the Batch 524 checks covered the Worklist,
// Accession, Search, a case report and Configuration; this covers the rest).
// Screens that need an id use the demo's own (case S26-4408; its old accession address now stays on the
// grossing view, Batch 564). The developer
// screens (/dev/..., /mock-emr) are left out: they aren't in a production build.
// Run: npm run test:a11y (starts the app; see playwright.config.ts).
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// `heading`: text the screen's own h1/h2 shows (English, the demo's language), so a redirect, an access-denied
// screen or an error page fails the check instead of being scanned in the screen's place. The WSI viewer has no
// heading; it is checked for not being denied.
export const SCREENS: { name: string; path: string; heading?: string }[] = [
  { name: 'Home', path: '/', heading: 'Welcome back' },
  { name: 'Add-on orders', path: '/add-on-orders', heading: 'Add-On Order Builder' },
  { name: 'Audit log', path: '/audit', heading: 'System Logs' },
  { name: 'Audit log: interfaces', path: '/audit?tab=interfaces', heading: 'System Logs' },
  { name: 'Audit log: financial', path: '/audit?tab=financial', heading: 'System Logs' },
  { name: 'Batch management', path: '/batch-management', heading: 'Batch Management' },
  { name: 'Disposal queue', path: '/batch-management/disposal', heading: 'Disposal Queue' },
  { name: 'Disposal report', path: '/batch-management/disposal-report', heading: 'Waste Tracking Report' },
  { name: 'Engraver monitor', path: '/batch-management/engraver-monitor', heading: 'Engraver Monitor' },
  { name: 'Equipment log', path: '/batch-management/equipment-log', heading: 'Equipment log' },
  { name: 'Label reprint', path: '/batch-management/label-reprint', heading: 'Label reprint' },
  { name: 'Pending load', path: '/batch-management/pending-load', heading: 'Pending Batch Load' },
  { name: 'WSI scan batches', path: '/batch-management/wsi-scan', heading: 'Slide scanning' },
  { name: 'Bench contributions', path: '/bench-contributions', heading: 'Bench Contributions' },
  { name: 'Grossing', path: '/case/S26-4408/grossing', heading: 'Grossing' },
  { name: 'Contribution', path: '/contribution', heading: 'Contribution Dashboard' },
  { name: 'Cytology QC queue', path: '/cytology-qc-queue', heading: 'Cytology QC Peer Review Queue' },
  { name: 'Cytology worklist', path: '/cytology-worklist', heading: 'Cytology Worklist' },
  { name: 'Facility Ops', path: '/facility-ops-dashboard', heading: 'Bind This Display' },
  { name: 'Intraop queue', path: '/intraop-queue', heading: 'Intraoperative Entries' },
  { name: 'Margin exception review', path: '/margin-exception-review', heading: 'Margin Exception Review' },
  { name: 'Migration jobs', path: '/migration-jobs', heading: 'Historical Data Migration Jobs' },
  { name: 'Molecular workcenter', path: '/molecular', heading: 'Molecular Workspace' },
  { name: 'Molecular control rules', path: '/molecular-control-rules', heading: 'Assay Control Rules' },
  { name: 'Molecular order queue', path: '/molecular-order-queue', heading: 'Molecular Order Queue' },
  { name: 'Molecular racks', path: '/molecular-rack', heading: 'Extraction Racks' },
  { name: 'My exports', path: '/my-exports', heading: 'My exports' },
  { name: 'OR suite dashboard', path: '/or-suite-dashboard', heading: 'Bind this display' },
  { name: 'Pathology workspace', path: '/pathology-workspace', heading: 'Pathology Workspace' },
  { name: 'Quality assurance', path: '/quality-assurance', heading: 'Quality Assurance' },
  { name: 'Quality & compliance', path: '/quality-compliance', heading: 'Quality & Compliance' },
  { name: 'Registry exceptions', path: '/registry-exceptions', heading: 'Registry Exceptions' },
  { name: 'Surgical QA worklist', path: '/surgical-qa-worklist', heading: 'Surgical Post-Sign-Out QA' },
  { name: 'Tumor board', path: '/tumor-board', heading: 'Tumor Board' },
  { name: 'Embedding', path: '/workstations/embedding', heading: 'Embedding Station' },
  { name: 'Microtomy', path: '/workstations/microtomy', heading: 'Microtomy Workstation' },
  { name: 'Slide distribution', path: '/workstations/slide-distribution', heading: 'Slide Distribution Station' },
  { name: 'WSI viewer', path: '/wsi-viewer' },
];

async function signIn(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('pathscribe-user', JSON.stringify({ id: 'PATH-001', name: 'Pete Nimmo', role: 'superadmin' }));
    localStorage.setItem('pathscribe_scan_station_prompted', '1');
  });
}

test.describe('every screen (Batch 564)', () => {
  for (const s of SCREENS) {
    test(`${s.name}: no serious or critical WCAG 2.1 AA violations`, async ({ page }) => {
      await signIn(page);
      await page.goto(s.path);
      if (s.heading) await expect(page.locator('h1, h2').filter({ hasText: s.heading }).first(), 'the screen itself opened').toBeVisible({ timeout: 15_000 });
      else await page.waitForTimeout(3_500);
      await page.locator('.ps-scan-prompt-skip').click({ timeout: 1000 }).catch(() => {});
      await expect(page.locator('.ps-screen-denied, .ps-case-unavailable'), 'not refused or unavailable').toHaveCount(0);
      await page.waitForTimeout(800); // late content (lists filling in) before axe looks
      const r = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      const found = r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
        .map(v => ({ id: v.id, count: v.nodes.length, help: v.help, targets: v.nodes.slice(0, 6).map(n => `${n.target.join(' ')} :: ${(n.any[0]?.message ?? '').slice(0, 140)}`) }));
      test.info().annotations.push({ type: 'violations', description: JSON.stringify(found) });
      expect(found, JSON.stringify(found, null, 2)).toEqual([]);
    });
  }
});
